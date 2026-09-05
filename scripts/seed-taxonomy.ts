import { createCategory, createPage, createTag, login, type SeedResult } from './seed-shared';

/**
 * LEGACY-040: до разделения скрипт всегда падал на первой книге, поэтому код возврата
 * ничего не значил, а секция CMS-страниц не отрабатывала вовсе. Теперь это рабочая часть
 * сида, и её код возврата — единственный сигнал: отказ хотя бы одной сущности завершает
 * прогон единицей, иначе «успешно» печаталось бы над шестью строками «Failed to create».
 *
 * Занятый слаг отказом не считается: повторный прогон по уже засеянной базе — норма,
 * бэкенд отвечает на него `400 ... already exists`, и это исход `exists`, а не `failed`.
 */
async function main() {
  try {
    await login();

    const results: SeedResult[] = [];

    // 1. Create Categories
    console.log('\n📚 Creating Categories...');
    const categories = [
      { name: 'Fiction', slug: 'fiction' },
      { name: 'Science', slug: 'science' },
      { name: 'Classics', slug: 'classics' },
    ];
    for (const cat of categories) {
      results.push(await createCategory(cat.name, cat.slug));
    }

    // 2. Create Tags
    console.log('\n🏷️ Creating Tags...');
    const tags = [
      { name: 'Bestseller', slug: 'bestseller' },
      { name: 'New', slug: 'new' },
      { name: 'Must Read', slug: 'must-read' },
    ];
    for (const tag of tags) {
      results.push(await createTag(tag.name, tag.slug));
    }

    // 3. Create CMS Pages
    console.log('\n📄 Creating CMS Pages...');
    results.push(
      await createPage({
        slug: 'about-us',
        title: 'About Us',
        type: 'basic',
        content: '# About Us\n\nWe are the best book app in the world.',
        status: 'published',
      })
    );

    results.push(
      await createPage({
        slug: 'terms-of-service',
        title: 'Terms of Service',
        type: 'basic',
        content: '# Terms of Service\n\nPlease read carefully...',
        status: 'published',
      })
    );

    const created = results.filter((r) => r.outcome === 'created').length;
    const existed = results.filter((r) => r.outcome === 'exists').length;
    const failed = results.filter((r) => r.outcome === 'failed').length;

    console.log(
      `\n📊 Created ${created} of ${results.length} (already present: ${existed}, failed: ${failed})`
    );

    if (failed > 0) {
      console.error(
        `\n❌ Seeding failed: ${failed} of ${results.length} entities could not be created. ` +
          'See the warnings above — the API rejected them for a reason other than "already exists".'
      );
      // `return` не декорация: `process.exit` не прерывает функцию мгновенно, и без него
      // строка про успех печаталась бы следом за отчётом об отказах.
      process.exit(1);
      return;
    }

    console.log('\n✨ Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();

// LEGACY-040: скрипт должен быть модулем, чтобы его запуск можно было проверить тестом.
export {};
