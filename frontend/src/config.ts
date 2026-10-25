/** Single place to rebrand the app. */
export const APP_NAME = "Vitalis";

/** Same-origin by default; the dev server and nginx both forward /api to the gateway. */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
