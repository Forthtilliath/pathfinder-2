/**
 * Adds an illustration to the site: npm run illustration -- <image.png> <collection>/<id>
 * e.g. npm run illustration -- ~/Downloads/elfe.png ancestries/elfe  (or "home" for the home page).
 * The image is checked, resized (at most 1600 px wide) and saved as WebP in src/assets/illustrations/.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [input, target] = process.argv.slice(2);
if (!input || !target || !/^(home|(classes|ancestries)\/[a-z0-9-]+)$/.test(target)) {
  console.error("Usage: npm run illustration -- <image> <home | classes/<id> | ancestries/<id>>");
  process.exit(1);
}

const image = sharp(input, { limitInputPixels: 4096 * 4096 });
const { format, width = 0, height = 0 } = await image.metadata();
if (!["png", "jpeg", "webp"].includes(format ?? "")) throw new Error(`unsupported format: ${format}`);
if (width < 512 || height < 512) throw new Error(`image too small: ${width}×${height}`);

const out = path.join("src/assets/illustrations", `${target}.webp`);
await mkdir(path.dirname(out), { recursive: true });
const info = await image
  // Entries show the picture at most 18rem wide (640 px on dense screens): 800 px is enough.
  .resize({ width: target === "home" ? 1600 : 800, withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile(out);
console.log(`${out}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} Ko`);
