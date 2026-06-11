import type { FC } from 'react';
import { BookOutlined } from '@ant-design/icons';

const TermsPage: FC = () => {
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

      <h1 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '700' }}>
        Terms of Service
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Last updated: June 11, 2026</p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          1. Agreement to Terms
        </h2>
        <p style={{ marginBottom: '12px' }}>
          By accessing or using Bibliaris, you agree to be bound by these Terms of Service. If you
          do not agree to all terms, you may not access or use our platform.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          2. Accounts and Registration
        </h2>
        <p style={{ marginBottom: '12px' }}>
          To use certain features, you must register for an account. You agree to provide accurate
          information and keep your credentials secure. You are responsible for all activity on your
          account.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          3. Use of Content
        </h2>
        <p style={{ marginBottom: '12px' }}>
          All books, audiobooks, metadata, images, and other materials on Bibliaris are the
          intellectual property of Bibliaris or its licensors. You may access this content strictly
          for personal, non-commercial use.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          4. Termination
        </h2>
        <p style={{ marginBottom: '12px' }}>
          We reserve the right to suspend or terminate your account or access to the platform at our
          sole discretion, without notice, for conduct that we believe violates these Terms or is
          harmful to other users or our business interests.
        </p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>5. Contact Us</h2>
        <p style={{ marginBottom: '12px' }}>
          For any questions regarding these Terms, please reach out to us at{' '}
          <strong>support@bibliaris.com</strong>.
        </p>
      </section>
    </div>
  );
};

export default TermsPage;
