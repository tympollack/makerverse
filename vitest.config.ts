import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15000,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "lib/version/**/*.ts",
        "lib/nfc/**",
        "lib/redis/**",
        "components/ui/ProvenanceBadge.tsx",
        "components/ui/CountdownTimer.tsx",
        "components/admin/HoldEngineMonitor.tsx",
        "components/admin/POSTerminal.tsx",
        "components/admin/VersionReleaseBadge.tsx",
      ],
      exclude: ["**/*.dart", "node_modules", ".next", "dist"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
