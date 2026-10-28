import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 5173 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { include: ['src/core/**', 'src/sim/**', 'src/data/**', 'src/render/pixel.ts', 'src/render/sprites.ts', 'src/render/font.ts'] },
  },
});
