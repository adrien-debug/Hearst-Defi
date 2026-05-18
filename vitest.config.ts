import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` is a marker package that throws when imported outside an
      // RSC environment. Under Vitest we want server-only modules to be
      // importable; aliasing to the package's own no-op `empty.js` is exactly
      // what the React `react-server` condition does in production.
      "server-only": path.resolve(
        __dirname,
        "./node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
