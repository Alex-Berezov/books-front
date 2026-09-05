/**
 * WP-10.7 (R2-05): скрипт молча делал вид, что сеет книги. `POST /books` отключён фазой 6,
 * ошибка проглатывалась, `bookId` становился `null`, все зависимые вызовы падали в свои
 * `catch` — и скрипт завершался «успешно», не создав ни одной книги.
 *
 * Легального пути в обход клиренса нет: книга создаётся только из утверждённого интейка
 * прав (`POST /admin/rights/intakes/:id/create-book`), а утверждение требует импортированного
 * и проверенного человеком отчёта. Сид-скрипт не может ни выдумать такой отчёт, ни утвердить
 * его за редактора — поэтому он падает громко и объясняет, что делать вместо себя.
 *
 * LEGACY-040: раньше этот отказ обрывал общий сид-скрипт до секции CMS-страниц — теперь
 * таксономии и страницы сеет `seed-taxonomy.ts`, а здесь остаётся только объяснение.
 * Ни сети, ни авторизации ему не нужно: единственный результат скрипта — текст ниже,
 * и он должен печататься даже при неподнятом бэкенде. Версии, главы и привязки книги
 * не заводятся вовсе — за первым же `createBook` они недостижимы.
 */
async function createBook(slug: string): Promise<string> {
  throw new Error(
    [
      `Cannot seed book '${slug}': direct book creation is disabled since phase 6.`,
      'A book can only be created from an approved rights intake:',
      '  1. POST /admin/rights/intakes            — create the intake',
      '  2. PATCH /admin/rights/intakes/:id/status — mark it READY_FOR_AGENT',
      '  3. POST /admin/rights/intakes/:id/review-imports — import the rights report',
      '  4. POST /admin/rights/intakes/:intakeId/reviews/:reviewId/approve — approve the review',
      '  5. POST /admin/rights/intakes/:id/create-book — create the book',
      'Seeding content around the rights clearance is not possible by design.',
    ].join('\n')
  );
}

async function main() {
  try {
    console.log('\n📖 Creating Books...');
    await createBook('1984');

    console.log('\n✨ Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();

// LEGACY-040: скрипт должен быть модулем, чтобы его запуск можно было проверить тестом.
export {};
