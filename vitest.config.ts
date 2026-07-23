import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    fileParallelism: false,
    // .claude/worktrees contém checkouts de outras sessões (cada um com seu
    // próprio tests/) — sem isso o vitest varre e roda os testes deles também.
    exclude: ["**/node_modules/**", ".claude/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
