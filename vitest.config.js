import { defineConfig, mergeConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import viteConfigFn from './vite.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig((configEnv) => {
  const viteConfig = viteConfigFn(configEnv)

  return mergeConfig(
    viteConfig,
    defineConfig({
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src')
        }
      },
      test: {
        environment: 'happy-dom',
        setupFiles: ['./tests/setup/vitest.setup.js'],
        include: ['tests/unit/**/*.spec.js', 'tests/integration/**/*.spec.js'],
        globals: true,
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html'],
          include: ['src/services/**', 'src/composables/**', 'src/utils/**'],
          thresholds: {
            lines: 60,
            functions: 60,
            branches: 50
          }
        }
      }
    })
  )
})
