import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas para que el build funcione dentro del WebView de Capacitor.
  base: "./",
  build: { outDir: "dist", target: "es2020" },
  test: { environment: "node" },
} as never);
