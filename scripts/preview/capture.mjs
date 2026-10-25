// Renders the static UI previews in index.html to docs/screenshots/*.png (used when the app can't be run).
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../docs/screenshots");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
for (const name of ["landing", "dashboard", "habits", "weekly", "assistant", "wellness"]) {
  await page.goto(pathToFileURL(path.join(here, "index.html")).href + "#" + name);
  await page.reload();
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  console.log("wrote", name);
}
await browser.close();
