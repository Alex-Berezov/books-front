import type { FC } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { PageBackButton } from '@/components/public/navigation';
import { FaqBlock } from '@/components/public/taxonomy-overview/FaqBlock';
import { OverviewHero } from '@/components/public/taxonomy-overview/OverviewHero';
import { SeoDescription } from '@/components/public/taxonomy-overview/SeoDescription';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AuthorLetter, AuthorListItem, PageResponse } from '@/types/api-schema';
import { AuthorCard } from './AuthorCard';
import { authorsBasePath, authorsHref, type AuthorsQuery } from './authors-href';
import { pluralize } from './authors-plural';
import { AuthorsAlphabet } from './AuthorsAlphabet';
import styles from './AuthorsHub.module.scss';
import { AuthorsPager } from './AuthorsPager';
import { AuthorsToolbar } from './AuthorsToolbar';

export interface AuthorsHubProps {
  lang: SupportedLang;
  page: PageResponse | null;
  authors: AuthorListItem[];
  meta: { page: number; totalPages: number; total: number };
  letters: AuthorLetter[];
  query: AuthorsQuery;
}

/**
 * Хаб авторов целиком — серверный компонент.
 *
 * 🔴 Сетка обязана быть в HTML ответа сервера, а не появляться после гидратации.
 * Четыре обзорные страницы таксономий уже проходили этот путь: они тянули
 * термины React Query внутри `'use client'`, и в серверном HTML не было ни одной
 * ссылки на термин при том, что все они лежали в карте сайта (правило 7.6,
 * 25 находок). Клиентский здесь только `AuthorsToolbar`.
 */
export const AuthorsHub: FC<AuthorsHubProps> = ({ lang, page, authors, meta, letters, query }) => {
  const t = createTranslator(lang);

  const hubTitle = page?.h1 || page?.title || t('authors.title');

  /**
   * 🔴 Буква попадает в H1, а редакторский блок остаётся хабу.
   *
   * Буквенных адресов около тридцати на язык, и все они индексируемые. Отдавая
   * им H1 «Авторы», тот же подзаголовок, тот же SEO-текст и тот же граф
   * `FAQPage`, мы разослали бы один и тот же контент на полторы сотни страниц —
   * дубль содержимого, причём с дублем разметки FAQ вдобавок. Сегодня записи
   * `authors-hub` в базе ещё нет, и расходятся только заголовки вкладки; заведёт
   * её редактор — разъедется всё сразу.
   */
  const isLetterPage = query.letter !== null;
  const h1 = isLetterPage ? `${hubTitle} — ${query.letter}` : hubTitle;
  const shortDescription = isLetterPage ? null : page?.shortDescription || t('authors.subtitle');
  const description = isLetterPage ? '' : page?.content || '';
  const faq = isLetterPage ? null : page?.faq || null;

  const breadcrumbItems = [
    { label: t('breadcrumb.home'), href: `/${lang}` },
    ...(query.letter
      ? [
          { label: t('breadcrumb.authors'), href: `/${lang}/authors` },
          { label: query.letter.toUpperCase() },
        ]
      : [{ label: t('breadcrumb.authors') }]),
  ];

  const authorsLabel = pluralize(meta.total, lang, {
    one: t('authors.authorsCountOne'),
    few: t('authors.authorsCountFew'),
    many: t('authors.authorsCountMany'),
  });

  const cardLabels = {
    books: {
      one: t('authors.booksCountOne'),
      few: t('authors.booksCountFew'),
      many: t('authors.booksCountMany'),
    },
    audio: {
      one: t('authors.audioCountOne'),
      few: t('authors.audioCountFew'),
      many: t('authors.audioCountMany'),
    },
    audioBadge: t('authors.audioBadge'),
    bornPrefix: t('authors.bornPrefix'),
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs items={breadcrumbItems} />

        <PageBackButton lang={lang} />

        <OverviewHero h1={h1} shortDescription={shortDescription} />

        {/*
          Один счётчик — авторов, из `meta.total`. Счётчиков книг и аудиокниг
          нет намеренно: суммарных агрегатов бэкенд не отдаёт, а складывать их
          по видимой странице значило бы показать сумму двадцати четырёх
          карточек под видом суммы по библиотеке.
        */}
        <p className={styles.counters}>
          {meta.total} {authorsLabel}
        </p>

        <AuthorsToolbar
          basePath={authorsBasePath(lang, query.letter)}
          labels={{
            searchLabel: t('authors.searchLabel'),
            searchPlaceholder: t('authors.searchPlaceholder'),
            sortLabel: t('authors.sortLabel'),
            sortByName: t('authors.sortByName'),
            sortByBooks: t('authors.sortByBooks'),
          }}
          search={query.search}
          sort={query.sort}
        />

        <AuthorsAlphabet
          activeLetter={query.letter}
          labels={{ all: t('authors.allLetters'), alphabetLabel: t('authors.alphabetLabel') }}
          lang={lang}
          letters={letters}
        />

        {authors.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{t('authors.emptyTitle')}</p>
            <p className={styles.emptyHint}>{t('authors.emptyHint')}</p>
            <Link className={styles.emptyAction} href={`/${lang}/authors`}>
              {t('authors.emptyAction')}
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {authors.map((author) => (
              <AuthorCard author={author} key={author.id} labels={cardLabels} lang={lang} />
            ))}
          </div>
        )}

        <AuthorsPager
          buildHref={(next) => authorsHref(lang, { ...query, page: next })}
          labels={{
            showMore: t('authors.showMore'),
            pagination: t('authors.pagination'),
            pageLabel: t('authors.pageLabel'),
          }}
          page={meta.page}
          totalPages={meta.totalPages}
        />

        {description && <SeoDescription description={description} />}

        {faq && faq.length > 0 && <FaqBlock items={faq} />}
      </div>
    </div>
  );
};
