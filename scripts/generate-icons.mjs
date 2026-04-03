import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Eisenhower matrix inspired icon - 4 quadrants with a checkmark
// Using Catppuccin-style colors (matching the app's theme)
function createIconSvg(size) {
  const padding = Math.round(size * 0.12);
  const innerSize = size - padding * 2;
  const quadrantGap = Math.round(size * 0.03);
  const quadrantSize = Math.round((innerSize - quadrantGap) / 2);
  const radius = Math.round(size * 0.08);
  const outerRadius = Math.round(size * 0.14);

  // Quadrant positions
  const x1 = padding;
  const y1 = padding;
  const x2 = padding + quadrantSize + quadrantGap;
  const y2 = padding + quadrantSize + quadrantGap;

  // Checkmark in the top-left quadrant (urgent+important)
  const checkCx = x1 + quadrantSize / 2;
  const checkCy = y1 + quadrantSize / 2;
  const cs = quadrantSize * 0.28;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${outerRadius}" fill="#1e1e2e"/>

  <!-- Top-left: Urgent+Important (red/mauve) -->
  <rect x="${x1}" y="${y1}" width="${quadrantSize}" height="${quadrantSize}" rx="${radius}" fill="#cba6f7" opacity="0.9"/>

  <!-- Top-right: Not Urgent+Important (blue) -->
  <rect x="${x2}" y="${y1}" width="${quadrantSize}" height="${quadrantSize}" rx="${radius}" fill="#89b4fa" opacity="0.7"/>

  <!-- Bottom-left: Urgent+Not Important (peach) -->
  <rect x="${x1}" y="${y2}" width="${quadrantSize}" height="${quadrantSize}" rx="${radius}" fill="#fab387" opacity="0.6"/>

  <!-- Bottom-right: Not Urgent+Not Important (surface) -->
  <rect x="${x2}" y="${y2}" width="${quadrantSize}" height="${quadrantSize}" rx="${radius}" fill="#585b70" opacity="0.5"/>

  <!-- Checkmark on top-left quadrant -->
  <polyline points="${checkCx - cs * 0.6},${checkCy} ${checkCx - cs * 0.1},${checkCy + cs * 0.5} ${checkCx + cs * 0.7},${checkCy - cs * 0.5}"
    fill="none" stroke="#1e1e2e" stroke-width="${Math.round(size * 0.04)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const sizes = [192, 512];

mkdirSync(join(publicDir, "icons"), { recursive: true });

for (const size of sizes) {
  const svg = createIconSvg(size);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(publicDir, "icons", `icon-${size}x${size}.png`));
  console.log(`Generated icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon (180x180)
const appleSvg = createIconSvg(180);
await sharp(Buffer.from(appleSvg))
  .png()
  .toFile(join(publicDir, "icons", "apple-touch-icon.png"));
console.log("Generated apple-touch-icon.png");

console.log("All icons generated!");
