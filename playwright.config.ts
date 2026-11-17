import { defineConfig } from "@playwright/test";

// npm test builds nothing on its own: run npm run build first, then npm test starts the built site on port 3100
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", viewport: { width: 1280, height: 900 } },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
