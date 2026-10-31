import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
const dir = new URL("../assets/brand/", import.meta.url);
await mkdir(dir, { recursive: true });
const icon = await readFile(new URL("darewaza-icon.svg", dir));
await sharp(icon)
  .png()
  .toFile(new URL("icon.png", dir).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const mark = await readFile(new URL("darewaza-mark.svg", dir), "utf8");
const light = mark.replace('fill="#172D57"', 'fill="#F7F8F3"');
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><g transform="translate(225 205) scale(5.74)">${light.replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`;
await sharp(Buffer.from(foreground))
  .png()
  .toFile(
    new URL("adaptive-icon.png", dir).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  );
await sharp(Buffer.from(light))
  .resize(300, 300)
  .png()
  .toFile(
    new URL("splash-mark.png", dir).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  );
await sharp(icon)
  .resize(64, 64)
  .png()
  .toFile(new URL("favicon.png", dir).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
console.log("Darewaza SVG masters and app icons are ready.");
