import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) }

export default defineConfig({
  resolve: { alias },
  test: {
    name: 'unidade',
    environment: 'node',
    include: ['src/tests/unit/**/*.test.ts'],
  },
})
