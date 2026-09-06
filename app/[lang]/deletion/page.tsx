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

  return getPageMetadata(lang, '/deletion', dict.deletion.metaTitle, dict.deletion.metaDescription);
}

export default async function DeletionPage({ params }: Props) {
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

      <h1 className={styles.title}>{dict.deletion.title}</h1>
      <p className={styles.lastUpdated}>
        {dict.common.lastUpdated.replace('{date}', formattedDate)}
      </p>

      <p className={styles.intro}>{dict.deletion.intro}</p>

      <p className={styles.stepsLead}>{dict.deletion.stepsLead}</p>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <TextWithBold text={dict.deletion.step1} bold={dict.deletion.step1Path} />
        </li>
        <li className={styles.step}>
          <TextWithBold text={dict.deletion.step2} bold="Bibliaris" />
        </li>
        <li className={styles.step}>
          <TextWithBold text={dict.deletion.step3} bold={dict.deletion.step3Action} />
        </li>
        <li className={styles.step}>
          <TextWithBold text={dict.deletion.step4} bold={SUPPORT_EMAIL} />
        </li>
      </ol>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{dict.deletion.confirmationTitle}</h2>
        <p className={styles.paragraph}>{dict.deletion.confirmationBody}</p>
      </section>
    </div>
  );
}
