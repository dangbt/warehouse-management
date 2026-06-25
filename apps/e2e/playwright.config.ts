import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  webServer: [
    {
      command: 'cd ../api && node dist/src/main.js',
      port: 3000,
      reuseExistingServer: true,
      timeout: 10000,
      env: {
        DATABASE_URL: 'postgresql://wms_user:wms_pass123@localhost:5432/warehouse_db',
        JWT_SECRET: 'wms-super-secret-key-2026',
        CORS_ORIGINS: 'http://localhost:4173,http://localhost:5173',
      },
    },
    {
      command: 'cd ../web && npx vite preview --port 4173',
      port: 4173,
      reuseExistingServer: true,
      timeout: 10000,
    },
  ],
})
