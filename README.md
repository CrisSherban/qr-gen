# qr-gen

A fast, private, and 100% self-contained QR code generator designed to run straight from **GitHub Pages** (or any static host) with zero build steps and zero server dependencies.

---

## Features

- **Multi-Format Downloads:**
  - **PNG** — High-resolution lossless raster image (selectable up to 4096×4096 px).
  - **SVG** — Crisp, infinite-scaling vector graphic.
  - **JPEG** — Standard photo format with solid background rendering.
  - **PDF** — Clean, print-ready document centered on an A4 page with caption metadata.
- **Copy to Clipboard:** One-click instant copy of the QR code image directly to your clipboard for quick pasting into Slack, Figma, Word, or emails.
- **Customization Options:**
  - **Error Correction Levels:** Low (7%), Medium (15%), Quartile (25%), High (30%).
  - **Colors:** Foreground and background color pickers with hex input and instant one-click color presets.
  - **Margin / Quiet Zone:** Adjustable module padding (0–6).
  - **Resolution Selector:** Standard (512px), High (1024px), Ultra HD (2048px), and Maximum (4096px).
- **100% Client-Side & Private:** No backend server, no tracking, no cookies, no analytics. Data entered never leaves your browser.
- **Offline Capable:** All dependencies (`vendor/qrcode.min.js`, `vendor/jspdf.umd.min.js`) are self-hosted in this repository.

---


## License

This project is licensed under the **[MIT License](LICENSE)**.

Third-party libraries bundled in `vendor/`:
- **[node-qrcode](https://github.com/soldair/node-qrcode)** (MIT License) — QR code rendering to Canvas & SVG.
- **[jsPDF](https://github.com/parallax/jsPDF)** (MIT License) — Client-side PDF generation.
