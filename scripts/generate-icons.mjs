import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Minimal checkmark icon — Catppuccin green on dark background
const GREEN = "#a6e3a1";

function createIconSvg(size) {
  const pad = Math.round(size * 0.12);
  const r = Math.round(size * 0.22);
  const sw = Math.round(size * 0.08);

  // Checkmark anchor: slightly left-of-center, slightly below center
  const cx = size * 0.46;
  const cy = size * 0.54;
  const s = size * 0.18; // half-extent of the check

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#292942"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <radialGradient id="glow" cx="48%" cy="54%" r="38%">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${size * 0.26}" fill="url(#glow)"/>
  <polyline
    points="${cx - s * 0.9},${cy + s * 0.05} ${cx - s * 0.15},${cy + s * 0.8} ${cx + s * 1.1},${cy - s * 0.75}"
    fill="none" stroke="${GREEN}" stroke-width="${sw}"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function createFaviconSvg(size) {
  const r = Math.round(size * 0.18);
  const sw = Math.round(size * 0.1);
  const cx = size * 0.46;
  const cy = size * 0.54;
  const s = size * 0.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#292942"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <polyline
    points="${cx - s * 0.9},${cy + s * 0.05} ${cx - s * 0.15},${cy + s * 0.8} ${cx + s * 1.1},${cy - s * 0.75}"
    fill="none" stroke="${GREEN}" stroke-width="${sw}"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

mkdirSync(join(publicDir, "icons"), { recursive: true });

// PWA icons
for (const size of [192, 512]) {
  const svg = createIconSvg(size);
  await sharp(Buffer.from(svg)).png().toFile(join(publicDir, "icons", `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Apple touch icon (180×180)
const appleSvg = createIconSvg(180);
await sharp(Buffer.from(appleSvg)).png().toFile(join(publicDir, "icons", "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");

// Favicon (32×32 PNG — modern browsers accept it as .ico)
const favSvg = createFaviconSvg(32);
await sharp(Buffer.from(favSvg)).png().toFile(join(publicDir, "favicon.ico"));
console.log("✓ favicon.ico");

console.log("\nDone!");
