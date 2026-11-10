import { defineConfig } from 'vitest/config'
import pkg from './package.json'

export default defineConfig({
  resolve: { alias: { '@': '/src' } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
