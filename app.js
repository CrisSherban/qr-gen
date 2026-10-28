/**
 * qr-gen - Application Logic
 * 100% Client-Side QR Generation & Multi-Format Export
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
  const presetChips = document.querySelectorAll('.preset-chip');
  const filenamePreview = document.getElementById('filename-preview');

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
    text: 'https://github.com'
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
      const darkColor = colorDarkInput.value;
      const lightColor = colorLightInput.value;
      const errorLevel = errorLevelSelect.value;
      const margin = parseInt(marginSlider.value, 10);

      // Render crisp preview (800px internal canvas width scaled down via CSS)
      await QRCode.toCanvas(qrCanvas, text, {
        width: 800,
        margin: margin,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });

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
   * Render QR code on an offscreen canvas at chosen resolution
   */
  async function createExportCanvas(targetResolution) {
    const text = qrTextInput.value.trim();
    const offscreen = document.createElement('canvas');
    const width = parseInt(targetResolution, 10) || 1024;
    const darkColor = colorDarkInput.value;
    const lightColor = colorLightInput.value;
    const errorLevel = errorLevelSelect.value;
    const margin = parseInt(marginSlider.value, 10);

    await QRCode.toCanvas(offscreen, text, {
      width: width,
      margin: margin,
      errorCorrectionLevel: errorLevel,
      color: {
        dark: darkColor,
        light: lightColor
      }
    });

    return offscreen;
  }

  /**
   * Download PNG
   */
  async function handleDownloadPng() {
    try {
      const resolution = sizeSelect.value;
      const canvas = await createExportCanvas(resolution);
      const filename = `${getBaseFilename()}.png`;

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Failed to create PNG image.', true);
          return;
        }
        downloadBlob(blob, filename);
        showToast(`Downloaded ${filename} (${resolution}×${resolution})`);
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
      const srcCanvas = await createExportCanvas(resolution);
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
   * Download SVG
   */
  async function handleDownloadSvg() {
    try {
      const text = qrTextInput.value.trim();
      const darkColor = colorDarkInput.value;
      const lightColor = colorLightInput.value;
      const errorLevel = errorLevelSelect.value;
      const margin = parseInt(marginSlider.value, 10);

      const svgString = await QRCode.toString(text, {
        type: 'svg',
        margin: margin,
        errorCorrectionLevel: errorLevel,
        color: {
          dark: darkColor,
          light: lightColor
        }
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const filename = `${getBaseFilename()}.svg`;
      downloadBlob(blob, filename);
      showToast(`Downloaded vector ${filename}`);
    } catch (err) {
      console.error(err);
      showToast('Error generating SVG download.', true);
    }
  }

  /**
   * Download PDF (Centered on A4 with clean header & link metadata)
   */
  async function handleDownloadPdf() {
    try {
      const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPdfLib) {
        showToast('PDF generator library not loaded.', true);
        return;
      }

      // Generate high-resolution source for print (1400px)
      const canvas = await createExportCanvas(1400);
      const imgData = canvas.toDataURL('image/png');
      const text = qrTextInput.value.trim();

      // Standard A4 portrait: 210mm x 297mm
      const doc = new jsPdfLib({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const qrSizeMm = 120; // 120mm square QR code
      const xPos = (pageWidth - qrSizeMm) / 2;
      const yPos = 65;

      // Header title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text('QR Code', pageWidth / 2, 42, { align: 'center' });

      // Embed QR image
      doc.addImage(imgData, 'PNG', xPos, yPos, qrSizeMm, qrSizeMm);

      // Subtitle / link content beneath QR code
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);

      // Wrap text within 160mm printable width
      const wrappedLines = doc.splitTextToSize(text, 160);
      // Limit to 4 lines if text is very long
      const displayLines = wrappedLines.slice(0, 4);
      if (wrappedLines.length > 4) {
        displayLines.push('... [truncated]');
      }

      const textY = yPos + qrSizeMm + 14;
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
      const canvas = await createExportCanvas(1024);
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
