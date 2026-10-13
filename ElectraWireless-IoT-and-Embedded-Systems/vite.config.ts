import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { lanBridge } from "./vite-lan-bridge";

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    viteTsconfigPaths(),
    lanBridge(), // lets the browser find & control TVs during `npm run dev`
  ],
  server: {
    allowedHosts: true, // allow the ngrok link to open the app
  },
});