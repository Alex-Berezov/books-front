import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    globals: true,
    // 20 секунд хватало тесту в одиночку и не хватало ему же под нагрузкой:
    // 09.08.2026 `sign-in.test.tsx` рендерился 5.9 с соло и 23.5 с в полном
    // прогоне, то есть падал по таймауту, не будучи сломанным. Выглядит это как
    // регрессия в чужом файле — тот же класс, что LEGACY-079 на бэкенде.
    // Сорока секунд хватает под нагрузкой и по-прежнему ловит зависание.
    testTimeout: 40000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'e2e/**',
      // Рабочие копии агентских сессий лежат внутри репозитория. Без этого исключения весь набор
      // прогоняется дважды, а половина результатов относится к чужой незакоммиченной ветке.
      '.claude/worktrees/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/*.d.ts',
        '**/*.config.{js,ts,mjs}',
        '**/types/**',
        '**/*.module.scss',
        '**/*.json',
        '__tests__/**',
        'scripts/**',
        'setupTests.ts',
        '**/index.ts',
        '**/*.types.ts',
      ],
      thresholds: {
        lines: 45,
        functions: 25,
        branches: 45,
        statements: 45,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
