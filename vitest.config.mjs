import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './test/setup.js',
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    exclude: ['**/*.coffee']
  }
})
