// Captures real screenshots of the running app into docs/screenshots/.
//
//   docker compose up -d --build
//   npm i -D playwright && npx playwright install chromium     (one-off)
//   npm run screenshots
//
// It registers a throw-away demo user through the API, seeds a week of habits,
// then drives the UI. Override APP_URL / API_URL if you use different ports.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const API_URL = process.env.API_URL ?? "http://localhost:8080/api";
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs/screenshots");

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const call = async (route, token, method, body) => {
  const res = await fetch(`${API_URL}${route}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
  return res.json();
};

const email = `demo-${Date.now()}@example.com`;
const { token } = await call("/auth/register", null, "POST", { email, password: "demo-password-123", fullName: "Alex Demo", locale: "en" });

const moods = ["good", "neutral", "great", "good", "low", "good", "great"];
for (let i = 6; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  await call(`/habits/entries/${iso(d)}`, token, "PUT", {
    mood: moods[i],
    waterGlasses: 5 + ((i * 3) % 4),
    sleepHours: 6 + ((i * 5) % 4) / 2 + 0.5,
    activityMinutes: 30 + ((i * 25) % 50),
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });

await page.goto(`${APP_URL}/welcome`);
await shot("landing");

await page.goto(`${APP_URL}/login`);
await page.getByLabel(/email/i).fill(email);
await page.getByLabel(/password/i).fill("demo-password-123");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(`${APP_URL}/`);
await page.waitForLoadState("networkidle");
await shot("dashboard");

await page.getByRole("link", { name: /habits/i }).first().click();
await page.waitForLoadState("networkidle");
await shot("habits");
await page.getByRole("tab", { name: /weekly/i }).click();
await page.waitForLoadState("networkidle");
await shot("weekly");

await page.getByRole("link", { name: /assistant/i }).first().click();
await page.getByLabel(/type a message/i).fill("I've been sleeping badly this week and feel drained by the afternoon.");
await page.keyboard.press("Enter");
await page.waitForTimeout(6000); // let the reply stream in
await shot("assistant");

await page.getByRole("link", { name: /wellness/i }).first().click();
await shot("wellness");

await browser.close();
console.log("Screenshots written to", out);
