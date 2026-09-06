import { BookOutlined } from '@ant-design/icons';
import { TextWithBold } from '@/components/common/TextWithBold/TextWithBold';
import { PageBackButton } from '@/components/public/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLocaleTag } from '@/lib/i18n/lang';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import styles from '@/styles/legal.module.scss';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

const SUPPORT_EMAIL = 'support@bibliaris.com';
const LAST_UPDATED_DATE = '2026-06-11';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const dict = getDictionary(lang);

  return getPageMetadata(lang, '/terms', dict.terms.metaTitle, dict.terms.metaDescription);
}

export default async function TermsPage({ params }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const dict = getDictionary(lang);

  const formattedDate = new Intl.DateTimeFormat(getLocaleTag(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${LAST_UPDATED_DATE}T00:00:00Z`));

  return (
    <div className={styles.page}>
      <PageBackButton lang={lang} />

      <div className={styles.logo}>
        <BookOutlined className={styles.logoIcon} />
        <span className={styles.logoText}>BIBLIARIS</span>
      </div>

      <h1 className={styles.title}>{dict.terms.title}</h1>
      <p className={styles.lastUpdated}>
        {dict.common.lastUpdated.replace('{date}', formattedDate)}
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.terms.s1.title}</h2>
        <p className={styles.paragraph}>{dict.terms.s1.body}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.terms.s2.title}</h2>
        <p className={styles.paragraph}>{dict.terms.s2.body}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.terms.s3.title}</h2>
        <p className={styles.paragraph}>{dict.terms.s3.body}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.terms.s4.title}</h2>
        <p className={styles.paragraph}>{dict.terms.s4.body}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.terms.s5.title}</h2>
        <p className={styles.paragraph}>
          <TextWithBold text={dict.terms.s5.body} bold={SUPPORT_EMAIL} />
        </p>
      </section>
    </div>
  );
}
