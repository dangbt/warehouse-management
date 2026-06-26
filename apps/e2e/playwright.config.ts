import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  // Chạy tuần tự 1 worker: tránh nhiều browser context cùng đập vào vite dev lúc
  // compile lạnh (gây flaky các test đầu, vd login). Compile lạnh chỉ 1 lần.
  workers: 1,
  fullyParallel: false,
  // Tắt trace để tránh lỗi ENOENT .stacks khi run bị ngắt (artifact noise, không phải lỗi test)
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'off',
    video: 'off',
  },
  webServer: [
    {
      // API tự đọc apps/api/.env (DATABASE_URL). KHÔNG hardcode DB ở đây để tránh trỏ nhầm localhost.
      // Cho phép override JWT_SECRET/CORS qua env shell nếu cần.
      command: 'cd ../api && node dist/src/main.js',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30000,
      env: {
        ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
        JWT_SECRET: process.env.JWT_SECRET ?? 'wms-super-secret-key-2026',
        CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:5173',
      },
    },
    {
      command: 'cd ../web && npx vite --port 5173',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
})
