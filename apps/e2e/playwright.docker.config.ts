import { defineConfig } from '@playwright/test'

/**
 * Playwright config cho Docker self-host stack.
 * Dùng trong CI workflow selfhost.yml — kết nối trực tiếp tới stack Docker
 * đang chạy (không spawn webServer).
 *
 * Yêu cầu: stack Docker đã chạy với HTTP_PORT=8080, đã seed user demo
 * (npx prisma db seed) trước khi chạy test.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    headless: true,
    trace: 'off',
    video: 'off',
  },
  // Không có webServer — kết nối tới stack Docker đang chạy
})
