import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePageContent } from '@/components/public/home/HomePageContent/HomePageContent';
import type { AuthorListItem } from '@/types/api-schema';

/**
 * 🔴 LEGACY-137. Главная отдавала фото автора в оптимизатор Next без всякой проверки
 * хоста, в отличие от `AuthorCard`. Пока в `remotePatterns` стоял шаблон `**.com`,
 * это было почти незаметно; после его снятия каждое фото с чужого хоста стало бы
 * битой картинкой — оптимизатор на неразрешённом хосте отвечает 400, а компонент
 * серверный, `onError` в него не поставить.
 *
 * Чужой хост приходит не из формы: в карточке автора стоит медиатека
 * (`components/admin/authors/AuthorForm/AuthorForm.tsx:537`, `MediaPicker`), а произвольный
 * адрес попадает в `photoUrl` через импорт JSON — там же, строки 307 и 314, значение берётся
 * из вставленного документа как есть. Реально встречающийся источник — Викисклад.
 */

const labels = {
  heroTitle: '',
  heroText: '',
  browseLibrary: '',
  audiobooks: '',
  topPopular: '',
  browseByCategory: '',
  viewAll: '',
  booksCount: '',
  genres: '',
  curatedCollections: '',
  newReleases: '',
  exploreBookThemes: '',
  classicLiterature: '',
  fantasyAdventure: '',
  authors: 'Авторы',
  whyBibliaris: '',
  aboutBibliaris: '',
  faq: '',
  viewMore: '',
  readLabel: '',
  listenLabel: '',
  newLabel: '',
  coverAltTemplate: '{title}',
  unknownAuthor: '',
};

const author = (photoUrl: string): AuthorListItem =>
  ({
    id: 'author-1',
    slug: 'lev-tolstoy',
    name: 'Лев Толстой',
    birthDate: null,
    deathDate: null,
    photoUrl,
    shortBio: null,
    translations: [{ language: 'ru', slug: 'lev-tolstoy', name: 'Лев Толстой' }],
    booksCount: 5,
    audioCount: 0,
  }) as AuthorListItem;

function renderHome(photoUrl: string) {
  return render(
    <HomePageContent
      lang="ru"
      labels={labels}
      featuredBooks={[]}
      newReleases={[]}
      audiobooks={[]}
      classicBooks={[]}
      fantasyBooks={[]}
      featuredCategories={[]}
      featuredGenres={[]}
      featuredCollections={[]}
      featuredTags={[]}
      featuredAuthors={[author(photoUrl)]}
      collectionSections={[]}
      heroStackBooks={[]}
      audiobooksCount={0}
      faqItems={null}
      whyBibliaris={[]}
      aboutText=""
    />
  );
}

describe('HomePageContent author photo', () => {
  it('sends a photo from our own CDN through the optimizer', () => {
    renderHome('https://media.bibliaris.com/a.jpg');

    const img = screen.getByAltText('Лев Толстой');
    expect(img.getAttribute('src')).toContain('/_next/image');
  });

  it('serves a photo from a foreign host as is, bypassing the optimizer', () => {
    renderHome('https://upload.wikimedia.org/a.jpg');

    const img = screen.getByAltText('Лев Толстой');
    expect(img.getAttribute('src')).toBe('https://upload.wikimedia.org/a.jpg');
    expect(img.getAttribute('src')).not.toContain('/_next/image');
  });
});
