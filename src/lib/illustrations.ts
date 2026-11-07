/**
 * Original illustrations (AI-generated, antique engraving style), added with `npm run illustration`.
 * Files: src/assets/illustrations/<collection>/<id>.webp, and home.webp for the home page.
 * An entry without a file simply has no illustration.
 */
import type { ImageMetadata } from "astro";

const files = import.meta.glob<{ default: ImageMetadata }>("../assets/illustrations/**/*.webp", { eager: true });

const byKey = new Map(
  Object.entries(files).map(([file, mod]) => [
    file.replace("../assets/illustrations/", "").replace(/\.webp$/, ""),
    mod.default,
  ]),
);

export const illustration = (key: string): ImageMetadata | undefined => byKey.get(key);

export const entryIllustration = (e: { collection: string; id: string }) => illustration(`${e.collection}/${e.id}`);
