import { BookOutlinedIcon } from '@/components/common/icons/BookOutlinedIcon';
import { PageBackButton } from '@/components/public/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLocaleTag } from '@/lib/i18n/lang';
import type { LegalPageProps } from './LegalPage.types';
import type { LegalBlock, LegalInline } from '@/content/legal/types';
import styles from '@/styles/legal.module.scss';

const renderInline = (inline: LegalInline, index: number) => {
  if (inline.kind === 'mailto') {
    return (
      <a key={index} href={`mailto:${inline.email}`} className={styles.mailto}>
        {inline.text}
      </a>
    );
  }

  return inline.text;
};

const renderBlock = (block: LegalBlock, index: number) => {
  if (block.kind === 'list') {
    return (
      <ul key={index} className={styles.list}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{item.map(renderInline)}</li>
        ))}
      </ul>
    );
  }

  return (
    <p key={index} className={styles.paragraph}>
      {block.content.map(renderInline)}
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

      {document.sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <h2 id={section.id} className={styles.sectionTitle}>
            {section.heading}
          </h2>
          {section.blocks.map(renderBlock)}
        </section>
      ))}
    </div>
  );
};
