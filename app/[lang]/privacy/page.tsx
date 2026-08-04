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

  return getPageMetadata(lang, '/privacy', dict.privacy.metaTitle, dict.privacy.metaDescription);
}

export default async function PrivacyPage({ params }: Props) {
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
        {dict.privacy.title}
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        {dict.common.lastUpdated.replace('{date}', formattedDate)}
      </p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          {dict.privacy.s1.title}
        </h2>
        <p style={{ marginBottom: '12px' }}>{dict.privacy.s1.body}</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          {dict.privacy.s2.title}
        </h2>
        <p style={{ marginBottom: '12px' }}>{dict.privacy.s2.lead}</p>
        <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          <li>{dict.privacy.s2.item1}</li>
          <li>{dict.privacy.s2.item2}</li>
          <li>{dict.privacy.s2.item3}</li>
          <li>{dict.privacy.s2.item4}</li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          {dict.privacy.s3.title}
        </h2>
        <p style={{ marginBottom: '12px' }}>{dict.privacy.s3.body}</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          {dict.privacy.s4.title}
        </h2>
        <p style={{ marginBottom: '12px' }}>
          <TextWithBold text={dict.privacy.s4.body} bold={SUPPORT_EMAIL} />
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          {dict.privacy.s5.title}
        </h2>
        <p style={{ marginBottom: '12px' }}>
          <TextWithBold text={dict.privacy.s5.body} bold={SUPPORT_EMAIL} />
        </p>
      </section>
    </div>
  );
}
