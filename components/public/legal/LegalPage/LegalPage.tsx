import { Fragment } from 'react';
import Link from 'next/link';
import { BookOutlinedIcon } from '@/components/common/icons/BookOutlinedIcon';
import { CookieTable } from '@/components/public/legal/CookieTable';
import { LegalToc } from '@/components/public/legal/LegalToc';
import { PageBackButton } from '@/components/public/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLocaleTag, type SupportedLang } from '@/lib/i18n/lang';
import type { LegalPageProps } from './LegalPage.types';
import type { LegalBlock, LegalInline, LegalWidget } from '@/content/legal/types';
import styles from '@/styles/legal.module.scss';

// Тема письма кодируется целиком: `&`, `?` и переводы строк в ней не становятся частью адреса.
const buildMailtoHref = (email: string, subject?: string) =>
  subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;

const renderInline = (inline: LegalInline, index: number, lang: SupportedLang) => {
  if (inline.kind === 'link') {
    return (
      <Link key={index} href={`/${lang}${inline.href}`} className={styles.link}>
        {inline.text}
      </Link>
    );
  }

  if (inline.kind === 'external') {
    return (
      <a
        key={index}
        href={inline.href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        {inline.text}
      </a>
    );
  }

  if (inline.kind === 'mailto') {
    return (
      <a key={index} href={buildMailtoHref(inline.email, inline.subject)} className={styles.mailto}>
        {inline.text}
      </a>
    );
  }

  return inline.text;
};

// Исчерпывающий выбор: новый вид вставки без ветки здесь не соберётся (`never`), а не покажет чужой блок.
// Клиентская вставка приходит от страницы: не передана - ошибка, при статической сборке это красный build.
const renderWidget = (
  widget: LegalWidget,
  index: number,
  lang: SupportedLang,
  widgets: LegalPageProps['widgets']
) => {
  switch (widget) {
    case 'cookie-table':
      return <CookieTable key={index} lang={lang} />;
    case 'consent-choice': {
      const node = widgets?.[widget];
      if (!node) throw new Error(`Legal widget "${widget}" is not passed to LegalPage`);
      return <Fragment key={index}>{node}</Fragment>;
    }
    default: {
      const unknownWidget: never = widget;
      throw new Error(`Unknown legal widget: ${String(unknownWidget)}`);
    }
  }
};

const renderBlock = (
  block: LegalBlock,
  index: number,
  lang: SupportedLang,
  widgets: LegalPageProps['widgets']
) => {
  const inline = (part: LegalInline, partIndex: number) => renderInline(part, partIndex, lang);

  if (block.kind === 'widget') return renderWidget(block.widget, index, lang, widgets);

  // Подпись колонки дублируется в `data-label`: на узком экране строка становится карточкой.
  if (block.kind === 'table') {
    return (
      <div key={index} className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {block.head.map((cell, cellIndex) => (
                <th key={cellIndex} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} data-label={block.head[cellIndex]}>
                    {cell.map(inline)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === 'list') {
    return (
      <ul key={index} className={styles.list}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{item.map(inline)}</li>
        ))}
      </ul>
    );
  }

  return (
    <p key={index} className={styles.paragraph}>
      {block.content.map(inline)}
    </p>
  );
};

export const LegalPage = ({ document, widgets }: LegalPageProps) => {
  const { lang } = document;
  const dict = getDictionary(lang);

  const formattedDate = new Intl.DateTimeFormat(getLocaleTag(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${document.updatedAt}T00:00:00Z`));

  return (
    <div className={styles.page}>
      <PageBackButton lang={lang} />

      <div className={styles.logo}>
        <BookOutlinedIcon className={styles.logoIcon} />
        <span className={styles.logoText}>BIBLIARIS</span>
      </div>

      <h1 className={styles.title}>{document.title}</h1>
      <p className={styles.lastUpdated}>
        {dict.common.lastUpdated.replace('{date}', formattedDate)}
      </p>

      {document.toc && <LegalToc lang={lang} sections={document.sections} />}

      {document.sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <h2 id={section.id} className={styles.sectionTitle}>
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => renderBlock(block, index, lang, widgets))}
        </section>
      ))}
    </div>
  );
};
