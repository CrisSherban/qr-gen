# qr-gen

A fast, private, and lightweight QR code generator designed to run straight from **GitHub Pages** (or any static web host) with zero build steps and zero server dependencies.

---

## Features

- **Text & Caption Support:**
  - Add custom text labels (e.g. `"SCAN ME"`, `"VISIT LINK"`, `"WI-FI"`, `"MENU"`).
  - Flexible positioning: **Below QR code**, **Above QR code**, or **Center badge**.
  - Integrated across all download formats (PNG, SVG, JPEG, and PDF).
- **Multi-Format Downloads:**
  - **PNG** — Lossless raster image (selectable resolution up to 4096×4096 px).
  - **SVG** — Scalable vector graphic without pixelation.
  - **JPEG** — Standard image with solid background rendering.
  - **PDF** — Print-ready document centered on an A4 page with metadata.
- **Copy to Clipboard:** One-click instant copy of the QR code image directly to your system clipboard.
- **Customization Controls:**
  - **Error Correction Levels:** Low (7%), Medium (15%), Quartile (25%), High (30%).
  - **Colors:** Foreground and background color pickers with hex text inputs and one-click presets.
  - **Margin / Quiet Zone:** Adjustable module padding (0–6).
  - **Resolution Selector:** Standard (512px), High (1024px), Ultra HD (2048px), and Maximum (4096px).
- **100% Client-Side & Private:** No backend server, no tracking, no cookies, no analytics. Data entered never leaves your browser.
- **Zero Local Dependencies:** Third-party libraries (`qrcode` and `jspdf`) are loaded on-the-fly directly from CDN (cdnjs).

---

## How to Deploy to GitHub Pages

1. **Push this repository to GitHub:**
   ```bash
   git add .
   git commit -m "Initial qr-gen release"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - On GitHub, go to your repository's **Settings** &rarr; **Pages**.
   - Under **Build and deployment**:
     - **Source**: Select `Deploy from a branch`.
     - **Branch**: Select `main` and folder `/ (root)`.
   - Click **Save**.

3. GitHub Pages will serve the app live (e.g. `https://<username>.github.io/qr-gen/`).

---

## How to Test Locally

Since the project is pure static HTML/CSS/JS, you can run it locally with any simple HTTP server:

```bash
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## License

This project is licensed under the **[MIT License](LICENSE)**.

Open-source libraries loaded on the spot via CDN:
- **[node-qrcode](https://github.com/soldair/node-qrcode)** (MIT License) — QR code generation and SVG rendering.
- **[jsPDF](https://github.com/parallax/jsPDF)** (MIT License) — Client-side PDF document generation.
