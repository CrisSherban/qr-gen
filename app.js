/**
 * qr-gen - Application Logic
 * 100% Client-Side QR Generation & Multi-Format Export with Optional Labeling
 */

(function () {
  'use strict';

  // DOM Elements
  const qrTextInput = document.getElementById('qr-text');
  const charCounter = document.getElementById('char-counter');
  const qrVersionIndicator = document.getElementById('qr-version-indicator');
  const colorDarkInput = document.getElementById('color-dark');
  const colorDarkText = document.getElementById('color-dark-text');
  const colorLightInput = document.getElementById('color-light');
  const colorLightText = document.getElementById('color-light-text');
  const errorLevelSelect = document.getElementById('error-level');
  const marginSlider = document.getElementById('margin-slider');
  const marginVal = document.getElementById('margin-val');
  const sizeSelect = document.getElementById('size-select');
  const presetChips = document.querySelectorAll('.preset-chip:not(.label-chip)');
  const filenamePreview = document.getElementById('filename-preview');

  // Label Elements
  const qrLabelInput = document.getElementById('qr-label');
  const labelPositionSelect = document.getElementById('label-position');
  const labelChips = document.querySelectorAll('.label-chip');

  const btnPaste = document.getElementById('btn-paste');
  const btnClear = document.getElementById('btn-clear');
  const btnReset = document.getElementById('btn-reset-options');

  const qrCanvas = document.getElementById('qr-canvas');
  const emptyState = document.getElementById('empty-state');
  const statusTag = document.getElementById('status-tag');
  const toast = document.getElementById('toast');

  const btnDownloadPng = document.getElementById('btn-download-png');
  const btnDownloadSvg = document.getElementById('btn-download-svg');
  const btnDownloadJpeg = document.getElementById('btn-download-jpeg');
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  const btnCopyImg = document.getElementById('btn-copy-img');

  let toastTimeout = null;
  let debounceTimeout = null;

  // Defaults
  const DEFAULTS = {
    colorDark: '#111827',
    colorLight: '#ffffff',
    errorLevel: 'M',
    margin: 2,
    size: '1024',
    text: 'https://github.com',
    label: '',
    labelPosition: 'below'
  };

  /**
   * Show notification toast
   */
  function showToast(message, isError = false) {
    if (!toast) return;
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' toast-error' : '');
    toast.classList.remove('hidden');

    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  /**
   * Helper to draw a rounded rectangle on a 2D canvas context
   */
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Escape XML string for SVG embedding
   */
  function escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Derive a clean, safe filename based on input
   */
  function getBaseFilename() {
    const text = qrTextInput.value.trim();
    if (!text) return 'qrcode';

    try {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const url = new URL(text);
        const host = url.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9-]/g, '-');
        const path = url.pathname.replace(/[^a-zA-Z0-9-]/g, '-').replace(/^-+|-+$/g, '');
        const combined = path ? `${host}-${path}` : host;
        return `qrcode-${combined}`.slice(0, 40).replace(/-+$/, '');
      }
    } catch (_) {
      // Not a valid URL, treat as text
    }

    const sanitized = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);

    return sanitized ? `qrcode-${sanitized}` : 'qrcode';
  }

  function updateFilenamePreview() {
    const base = getBaseFilename();
    filenamePreview.textContent = `${base}.png`;
  }

  /**
   * Detect text characteristics for user metadata
   */
  function updateMetadata() {
    const text = qrTextInput.value;
    const len = text.length;
    charCounter.textContent = `${len} character${len === 1 ? '' : 's'}`;

    if (len === 0) {
      qrVersionIndicator.textContent = 'Empty';
      return;
    }

    if (text.startsWith('http://') || text.startsWith('https://')) {
      qrVersionIndicator.textContent = 'Link (URL)';
    } else if (text.startsWith('mailto:')) {
      qrVersionIndicator.textContent = 'Email';
    } else if (text.startsWith('tel:')) {
      qrVersionIndicator.textContent = 'Phone number';
    } else if (text.startsWith('WIFI:')) {
      qrVersionIndicator.textContent = 'Wi-Fi config';
    } else {
      qrVersionIndicator.textContent = 'Plain text';
    }
  }

  /**
   * Render complete QR code with optional label to an offscreen canvas
   */
  async function renderQrCanvas(targetResolution) {
    const text = qrTextInput.value.trim();
    if (!text) return null;

    const width = parseInt(targetResolution, 10) || 1024;
    const darkColor = colorDarkInput.value;
    const lightColor = colorLightInput.value;
    const errorLevel = errorLevelSelect.value;
    const margin = parseInt(marginSlider.value, 10);
    const label = qrLabelInput.value.trim();
    const position = labelPositionSelect.value;

    // 1. Render base QR code onto offscreen canvas
    const baseCanvas = document.createElement('canvas');
    await QRCode.toCanvas(baseCanvas, text, {
      width: width,
      margin: margin,
      errorCorrectionLevel: errorLevel,
      color: {
        dark: darkColor,
        light: lightColor
      }
    });

    if (!label) {
      return baseCanvas;
    }

    // 2. Compose with label
    const outCanvas = document.createElement('canvas');
    const ctx = outCanvas.getContext('2d');

    if (position === 'center') {
      outCanvas.width = width;
      outCanvas.height = width;
      ctx.drawImage(baseCanvas, 0, 0);

      const fontSize = Math.max(14, Math.round(width * 0.052));
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textWidth = ctx.measureText(label).width;

      const padX = Math.round(fontSize * 0.7);
      const padY = Math.round(fontSize * 0.38);
      const badgeW = Math.min(width * 0.65, textWidth + padX * 2);
      const badgeH = fontSize + padY * 2;
      const badgeX = (width - badgeW) / 2;
      const badgeY = (width - badgeH) / 2;
      const radius = Math.round(badgeH * 0.28);

      ctx.save();
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, radius);
      ctx.fillStyle = lightColor;
      ctx.fill();
      ctx.lineWidth = Math.max(2, Math.round(width * 0.005));
      ctx.strokeStyle = darkColor;
      ctx.stroke();

      ctx.fillStyle = darkColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, width / 2 + Math.round(fontSize * 0.04), badgeW - padX);
      ctx.restore();

      return outCanvas;
    }

    // Position: 'below' or 'above'
    const fontSize = Math.max(16, Math.round(width * 0.056));
    const labelH = Math.round(fontSize * 1.9);
    const totalH = width + labelH;

    outCanvas.width = width;
    outCanvas.height = totalH;

    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, width, totalH);

    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = darkColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (position === 'below') {
      ctx.drawImage(baseCanvas, 0, 0);
      ctx.fillText(label, width / 2, width + (labelH / 2), width * 0.92);
    } else { // 'above'
      ctx.fillText(label, width / 2, labelH / 2, width * 0.92);
      ctx.drawImage(baseCanvas, 0, labelH);
    }

    return outCanvas;
  }

  /**
   * Generate QR Code on the preview canvas
   */
  async function generateQRCode() {
    const text = qrTextInput.value.trim();
    updateMetadata();
    updateFilenamePreview();

    if (!text) {
      qrCanvas.classList.add('hidden');
      emptyState.classList.remove('hidden');
      statusTag.textContent = 'Idle';
      statusTag.className = 'status-tag';
      setDownloadButtonsState(false);
      return;
    }

    if (typeof QRCode === 'undefined') {
      showToast('QR generator library not loaded.', true);
      return;
    }

    try {
      const label = qrLabelInput.value.trim();
      const position = labelPositionSelect.value;

      // Auto-bump error correction if center badge is selected with low recovery
      if (label && position === 'center' && (errorLevelSelect.value === 'L' || errorLevelSelect.value === 'M')) {
        errorLevelSelect.value = 'H';
        showToast('Switched error correction to High (H) for center badge scannability.');
      }

      const composed = await renderQrCanvas(800);
      qrCanvas.width = composed.width;
      qrCanvas.height = composed.height;

      // Lock aspect-ratio and proportional dimensions to prevent any rectangular stretching
      const aspect = composed.width / composed.height;
      qrCanvas.style.aspectRatio = `${composed.width} / ${composed.height}`;
      if (aspect >= 1) {
        qrCanvas.style.maxWidth = '260px';
        qrCanvas.style.maxHeight = `${Math.round(260 / aspect)}px`;
      } else {
        qrCanvas.style.maxHeight = '260px';
        qrCanvas.style.maxWidth = `${Math.round(260 * aspect)}px`;
      }
      qrCanvas.style.width = '100%';
      qrCanvas.style.height = 'auto';

      const ctx = qrCanvas.getContext('2d');
      ctx.drawImage(composed, 0, 0);

      qrCanvas.classList.remove('hidden');
      emptyState.classList.add('hidden');
      statusTag.textContent = 'Ready';
      statusTag.className = 'status-tag success';
      setDownloadButtonsState(true);
    } catch (err) {
      console.error('QR code generation error:', err);
      statusTag.textContent = 'Error';
      statusTag.className = 'status-tag error';
      showToast(err.message || 'Error generating QR code. Content may be too long.', true);
    }
  }

  function setDownloadButtonsState(enabled) {
    const buttons = [
      btnDownloadPng,
      btnDownloadSvg,
      btnDownloadJpeg,
      btnDownloadPdf,
      btnCopyImg
    ];
    buttons.forEach((btn) => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.45';
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  function scheduleGenerate() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(generateQRCode, 60);
  }

  /**
   * Trigger browser file download
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  /**
   * Download PNG
   */
  async function handleDownloadPng() {
    try {
      const resolution = sizeSelect.value;
      const canvas = await renderQrCanvas(resolution);
      const filename = `${getBaseFilename()}.png`;

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Failed to create PNG image.', true);
          return;
        }
        downloadBlob(blob, filename);
        showToast(`Downloaded ${filename} (${resolution}px)`);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('Error generating PNG download.', true);
    }
  }

  /**
   * Download JPEG
   */
  async function handleDownloadJpeg() {
    try {
      const resolution = sizeSelect.value;
      const srcCanvas = await renderQrCanvas(resolution);
      const filename = `${getBaseFilename()}.jpeg`;

      // Draw onto solid background canvas to prevent alpha transparency turning black in JPEG
      const jpegCanvas = document.createElement('canvas');
      jpegCanvas.width = srcCanvas.width;
      jpegCanvas.height = srcCanvas.height;
      const ctx = jpegCanvas.getContext('2d');
      ctx.fillStyle = colorLightInput.value || '#ffffff';
      ctx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
      ctx.drawImage(srcCanvas, 0, 0);

      jpegCanvas.toBlob(
        (blob) => {
          if (!blob) {
            showToast('Failed to create JPEG image.', true);
            return;
          }
          downloadBlob(blob, filename);
          showToast(`Downloaded ${filename}`);
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      console.error(err);
      showToast('Error generating JPEG download.', true);
    }
  }

  /**
   * Download SVG (including vector label if provided)
   */
  async function handleDownloadSvg() {
    try {
      const text = qrTextInput.value.trim();
      const darkColor = colorDarkInput.value;
      const lightColor = colorLightInput.value;
      const errorLevel = errorLevelSelect.value;
      const margin = parseInt(marginSlider.value, 10);
      const label = qrLabelInput.value.trim();
      const position = labelPositionSelect.value;

      const baseSvg = await QRCode.toString(text, {
        type: 'svg',
        margin: margin,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });

      let finalSvg = baseSvg;

      if (label) {
        const match = baseSvg.match(/viewBox=["']0 0 (\d+) (\d+)["']/);
        const n = match ? parseInt(match[1], 10) : 33;
        const inner = baseSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');

        if (position === 'center') {
          const fontSize = 48;
          const estWidth = Math.min(650, Math.max(160, label.length * 30 + 50));
          const estHeight = 72;
          const badgeX = (1000 - estWidth) / 2;
          const badgeY = (1000 - estHeight) / 2;

          finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <rect width="1000" height="1000" fill="${lightColor}"/>
  <g transform="scale(${1000 / n})">
    ${inner}
  </g>
  <rect x="${badgeX}" y="${badgeY}" width="${estWidth}" height="${estHeight}" rx="16" fill="${lightColor}" stroke="${darkColor}" stroke-width="4"/>
  <text x="500" y="500" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${darkColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>
</svg>`;
        } else {
          // 'below' or 'above'
          const fontSize = 56;
          const labelH = 110;
          const totalH = 1000 + labelH;
          const qrY = (position === 'above') ? labelH : 0;
          const textY = (position === 'above') ? (labelH / 2) : (1000 + labelH / 2);

          finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${totalH}" width="1000" height="${totalH}">
  <rect width="1000" height="${totalH}" fill="${lightColor}"/>
  <g transform="translate(0, ${qrY}) scale(${1000 / n})">
    ${inner}
  </g>
  <text x="500" y="${textY}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${darkColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>
</svg>`;
        }
      }

      const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
      const filename = `${getBaseFilename()}.svg`;
      downloadBlob(blob, filename);
      showToast(`Downloaded vector ${filename}`);
    } catch (err) {
      console.error(err);
      showToast('Error generating SVG download.', true);
    }
  }

  /**
   * Download PDF (Centered on A4 with clean header, QR image & link metadata)
   */
  async function handleDownloadPdf() {
    try {
      const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPdfLib) {
        showToast('PDF generator library not loaded.', true);
        return;
      }

      // Generate high-resolution source for print (1400px)
      const canvas = await renderQrCanvas(1400);
      const imgData = canvas.toDataURL('image/png');
      const text = qrTextInput.value.trim();

      // Standard A4 portrait: 210mm x 297mm
      const doc = new jsPdfLib({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const aspect = canvas.width / canvas.height;
      let qrWidthMm = 120;
      let qrHeightMm = qrWidthMm / aspect;

      // Constrain height if tall so it fits comfortably on A4
      if (qrHeightMm > 135) {
        qrHeightMm = 135;
        qrWidthMm = qrHeightMm * aspect;
      }

      const xPos = (pageWidth - qrWidthMm) / 2;
      const yPos = 52;

      // Header title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text('QR Code', pageWidth / 2, 38, { align: 'center' });

      // Embed QR image
      doc.addImage(imgData, 'PNG', xPos, yPos, qrWidthMm, qrHeightMm);

      // Subtitle / link content beneath QR code
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);

      // Wrap text within 160mm printable width
      const wrappedLines = doc.splitTextToSize(text, 160);
      const displayLines = wrappedLines.slice(0, 4);
      if (wrappedLines.length > 4) {
        displayLines.push('... [truncated]');
      }

      const textY = yPos + qrHeightMm + 14;
      doc.text(displayLines, pageWidth / 2, textY, { align: 'center' });

      // Footer note
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      doc.text(
        `Generated with qr-gen • ${dateStr} • Printable A4`,
        pageWidth / 2,
        280,
        { align: 'center' }
      );

      const filename = `${getBaseFilename()}.pdf`;
      doc.save(filename);
      showToast(`Downloaded printable ${filename}`);
    } catch (err) {
      console.error(err);
      showToast('Error generating PDF document.', true);
    }
  }

  /**
   * Copy image directly to user's system clipboard (PNG)
   */
  async function handleCopyImage() {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      showToast('Clipboard image copying is not supported in this browser.', true);
      return;
    }

    try {
      const canvas = await renderQrCanvas(1024);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Failed to prepare clipboard image.', true);
          return;
        }

        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showToast('QR Code image copied to clipboard!');
        } catch (clipErr) {
          console.warn('Clipboard write failed:', clipErr);
          showToast('Could not copy image. Check browser permissions.', true);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('Error copying image to clipboard.', true);
    }
  }

  /**
   * Handle Paste from clipboard
   */
  async function handlePaste() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      qrTextInput.focus();
      showToast('Clipboard access unavailable. Please use Ctrl/Cmd+V to paste.', true);
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        qrTextInput.value = clipboardText;
        scheduleGenerate();
        showToast('Pasted content from clipboard.');
      } else {
        showToast('Clipboard was empty.');
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      qrTextInput.focus();
      showToast('Clipboard permission denied. Please paste manually.', true);
    }
  }

  /**
   * Reset options to defaults
   */
  function handleReset() {
    colorDarkInput.value = DEFAULTS.colorDark;
    colorDarkText.value = DEFAULTS.colorDark;
    colorLightInput.value = DEFAULTS.colorLight;
    colorLightText.value = DEFAULTS.colorLight;
    errorLevelSelect.value = DEFAULTS.errorLevel;
    marginSlider.value = DEFAULTS.margin;
    marginVal.textContent = DEFAULTS.margin;
    sizeSelect.value = DEFAULTS.size;
    qrLabelInput.value = DEFAULTS.label;
    labelPositionSelect.value = DEFAULTS.labelPosition;

    // Reset preset active state
    presetChips.forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.dark === DEFAULTS.colorDark);
    });

    scheduleGenerate();
    showToast('Settings reset to defaults.');
  }

  /**
   * Setup event listeners
   */
  function initEvents() {
    // Input events
    qrTextInput.addEventListener('input', scheduleGenerate);

    // Label events
    qrLabelInput.addEventListener('input', scheduleGenerate);
    labelPositionSelect.addEventListener('change', scheduleGenerate);

    labelChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        qrLabelInput.value = chip.dataset.label;
        scheduleGenerate();
      });
    });

    // Color inputs sync
    colorDarkInput.addEventListener('input', (e) => {
      colorDarkText.value = e.target.value;
      uncheckPresets();
      scheduleGenerate();
    });

    colorDarkText.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        colorDarkInput.value = val;
        uncheckPresets();
        scheduleGenerate();
      }
    });

    colorLightInput.addEventListener('input', (e) => {
      colorLightText.value = e.target.value;
      uncheckPresets();
      scheduleGenerate();
    });

    colorLightText.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        colorLightInput.value = val;
        uncheckPresets();
        scheduleGenerate();
      }
    });

    // Preset color buttons
    presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const dark = chip.dataset.dark;
        const light = chip.dataset.light;
        colorDarkInput.value = dark;
        colorDarkText.value = dark;
        colorLightInput.value = light;
        colorLightText.value = light;

        presetChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        scheduleGenerate();
      });
    });

    function uncheckPresets() {
      presetChips.forEach((chip) => chip.classList.remove('active'));
    }

    // Margin slider
    marginSlider.addEventListener('input', (e) => {
      marginVal.textContent = e.target.value;
      scheduleGenerate();
    });

    // Error correction & Size
    errorLevelSelect.addEventListener('change', scheduleGenerate);
    sizeSelect.addEventListener('change', scheduleGenerate);

    // Header actions
    btnPaste.addEventListener('click', handlePaste);
    btnClear.addEventListener('click', () => {
      qrTextInput.value = '';
      qrTextInput.focus();
      generateQRCode();
    });
    btnReset.addEventListener('click', handleReset);

    // Download buttons
    btnDownloadPng.addEventListener('click', handleDownloadPng);
    btnDownloadSvg.addEventListener('click', handleDownloadSvg);
    btnDownloadJpeg.addEventListener('click', handleDownloadJpeg);
    btnDownloadPdf.addEventListener('click', handleDownloadPdf);
    btnCopyImg.addEventListener('click', handleCopyImage);
  }

  // Initialize
  initEvents();
  generateQRCode();
})();
