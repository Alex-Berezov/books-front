import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    globals: true,
    // 🔴 Порог здесь лечил симптом, а не причину (`LEGACY-105`). Сорок секунд —
    // это в восемь раз выше умолчания vitest: таймауты ловили и раньше, и каждый
    // раз поднимали порог. Порог делает голодание реже, но не отличает вытесненный
    // тест от зависшего, а красный прогон без единой правки кода читается как
    // «сломали тест» — следующий агент идёт чинить исправный файл.
    //
    // 06.09.2026 причину сняли: 55 тестов без DOM переведены в окружение `node`
    // докблоком `// @vitest-environment node`, и стоимость окружения под нагрузкой
    // (`--maxWorkers=4`) упала со 168.99 с до 116.36 с. После этого порог снижен
    // до 15 секунд — чтобы вытеснение снова было видно. Поднимать его в ответ
    // на красноту нельзя: это возврат к тому, из-за чего заведена запись.
    // Медленный тест чинится причиной, а не порогом.
    testTimeout: 15000,
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
