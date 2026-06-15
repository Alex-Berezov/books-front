import { BookOutlined } from '@ant-design/icons';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  return getPageMetadata(
    lang,
    '/privacy',
    'Privacy Policy - Bibliaris',
    'Read our privacy policy to understand how we collect, use, and protect your data.'
  );
}

export default async function PrivacyPage() {
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

      <h1 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '700' }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Last updated: June 11, 2026</p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          1. Information We Collect
        </h2>
        <p style={{ marginBottom: '12px' }}>
          When you use our service, we may collect personal information such as your name, email
          address, and profile picture, primarily when you register or log in using third-party
          services like Google or Facebook.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          2. How We Use Your Information
        </h2>
        <p style={{ marginBottom: '12px' }}>We use the information we collect to:</p>
        <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
          <li>Provide, maintain, and improve our services;</li>
          <li>Personalize your reading experience and bookshelf;</li>
          <li>Authenticate your identity via email/password or OAuth providers;</li>
          <li>
            Communicate with you regarding updates, security alerts, and account-related notices.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          3. Data Sharing
        </h2>
        <p style={{ marginBottom: '12px' }}>
          We do not sell your personal data. We only share data with third-party authentication
          providers (Google, Facebook) to facilitate secure sign-in flows.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          4. Data Deletion and Retention
        </h2>
        <p style={{ marginBottom: '12px' }}>
          We retain your data for as long as your account is active. You can request deletion of
          your account and all associated personal data at any time by contacting us at{' '}
          <strong>support@bibliaris.com</strong>, or by following the Data Deletion Instructions.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>5. Contact Us</h2>
        <p style={{ marginBottom: '12px' }}>
          If you have any questions about this Privacy Policy, please contact us at{' '}
          <strong>support@bibliaris.com</strong>.
        </p>
      </section>
    </div>
  );
}
