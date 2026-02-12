import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    include: ['tests/integration/api/**/*.spec.js'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false
  }
})
