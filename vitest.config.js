const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
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
});
