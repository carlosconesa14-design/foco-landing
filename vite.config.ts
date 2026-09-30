import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas para que el build funcione dentro del WebView de Capacitor.
  base: "./",
  build: { outDir: "dist", target: "es2020" },
  // En los tests no hay ventas virales para que los resultados sean exactos.
  test: { environment: "node", setupFiles: ["tests/setup.ts"] },
} as never);
