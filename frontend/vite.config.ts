/// <reference types="vitest" />
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";

const gateway = process.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    // In development the browser talks to Vite, which forwards /api to the gateway (no CORS needed).
    proxy: { "/api": { target: gateway, changeOrigin: true } },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
