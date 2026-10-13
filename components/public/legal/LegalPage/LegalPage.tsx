import Link from 'next/link';
import { BookOutlinedIcon } from '@/components/common/icons/BookOutlinedIcon';
import { ConsentChoice } from '@/components/public/legal/ConsentChoice';
import { CookieTable } from '@/components/public/legal/CookieTable';
import { LegalToc } from '@/components/public/legal/LegalToc';
import { PageBackButton } from '@/components/public/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLocaleTag, type SupportedLang } from '@/lib/i18n/lang';
import type { LegalPageProps } from './LegalPage.types';
import type { LegalBlock, LegalInline, LegalWidget } from '@/content/legal/types';
import styles from '@/styles/legal.module.scss';

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
      <a key={index} href={`mailto:${inline.email}`} className={styles.mailto}>
        {inline.text}
      </a>
    );
  }

  return inline.text;
};

// Исчерпывающий выбор: новый вид вставки без ветки здесь не соберётся (`never`), а не покажет чужой блок.
const renderWidget = (widget: LegalWidget, index: number, lang: SupportedLang) => {
  switch (widget) {
    case 'cookie-table':
      return <CookieTable key={index} lang={lang} />;
    case 'consent-choice':
      return <ConsentChoice key={index} />;
    default: {
      const unknownWidget: never = widget;
      throw new Error(`Unknown legal widget: ${String(unknownWidget)}`);
    }
  }
};

const renderBlock = (block: LegalBlock, index: number, lang: SupportedLang) => {
  const inline = (part: LegalInline, partIndex: number) => renderInline(part, partIndex, lang);

  if (block.kind === 'widget') return renderWidget(block.widget, index, lang);

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

export const LegalPage = ({ document }: LegalPageProps) => {
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
          {section.blocks.map((block, index) => renderBlock(block, index, lang))}
        </section>
      ))}
    </div>
  );
};
