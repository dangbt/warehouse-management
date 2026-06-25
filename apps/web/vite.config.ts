import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

function removeTestIds(): Plugin {
  return {
    name: 'remove-test-ids',
    apply: 'build',
    transform(code) {
      return { code: code.replace(/\s*"data-testid":\s*[^,}\n]+,?/g, '').replace(/\s*data-testid="[^"]*"/g, '') }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    ...(mode === 'production' ? [removeTestIds()] : []),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}))
