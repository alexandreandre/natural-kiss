import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Les modules `import "server-only"` doivent rester importables en test.
      "server-only": fileURLToPath(
        new URL("./tests/setup/server-only.stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // Vitest = unitaire + intégration. Les E2E sont pilotés par Playwright.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    setupFiles: ["tests/setup/load-env.ts"],
    testTimeout: 20_000,
  },
});
