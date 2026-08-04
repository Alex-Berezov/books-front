import { BookOutlined } from '@ant-design/icons';
import { TextWithBold } from '@/components/common/TextWithBold/TextWithBold';
import { PageBackButton } from '@/components/public/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getLocaleTag } from '@/lib/i18n/lang';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

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
    <div
      style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: '0 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#1a1a1a',
        lineHeight: '1.6',
      }}
    >
      <PageBackButton lang={lang} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
        <BookOutlined style={{ fontSize: '24px', color: '#8c5300' }} />
        <span
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            color: '#8c5300',
          }}
        >
          BIBLIARIS
        </span>
      </div>

      <h1 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '700' }}>
        {dict.deletion.title}
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        {dict.common.lastUpdated.replace('{date}', formattedDate)}
      </p>

      <p style={{ marginBottom: '20px' }}>{dict.deletion.intro}</p>

      <p style={{ marginBottom: '24px' }}>{dict.deletion.stepsLead}</p>

      <ol style={{ paddingLeft: '20px', marginBottom: '32px' }}>
        <li style={{ marginBottom: '12px' }}>
          <TextWithBold text={dict.deletion.step1} bold={dict.deletion.step1Path} />
        </li>
        <li style={{ marginBottom: '12px' }}>
          <TextWithBold text={dict.deletion.step2} bold="Bibliaris" />
        </li>
        <li style={{ marginBottom: '12px' }}>
          <TextWithBold text={dict.deletion.step3} bold={dict.deletion.step3Action} />
        </li>
        <li style={{ marginBottom: '12px' }}>
          <TextWithBold text={dict.deletion.step4} bold={SUPPORT_EMAIL} />
        </li>
      </ol>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          {dict.deletion.confirmationTitle}
        </h2>
        <p style={{ marginBottom: '12px' }}>{dict.deletion.confirmationBody}</p>
      </section>
    </div>
  );
}
