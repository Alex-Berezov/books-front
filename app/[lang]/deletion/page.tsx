import type { FC } from 'react';
import { BookOutlined } from '@ant-design/icons';

const DeletionPage: FC = () => {
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
        Data Deletion Instructions
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Last updated: June 11, 2026</p>

      <p style={{ marginBottom: '20px' }}>
        Bibliaris uses Facebook Login for authentication. According to Facebook Platform rules, we
        provide a way for users to request the deletion of their data associated with our
        application.
      </p>

      <p style={{ marginBottom: '24px' }}>
        If you want to delete your activities and data associated with Bibliaris, you can do so by
        following these steps:
      </p>

      <ol style={{ paddingLeft: '20px', marginBottom: '32px' }}>
        <li style={{ marginBottom: '12px' }}>
          Go to your Facebook Profile&apos;s{' '}
          <strong>Settings & Privacy &gt; Settings &gt; Apps and Websites</strong>.
        </li>
        <li style={{ marginBottom: '12px' }}>
          Find and select <strong>Bibliaris</strong>.
        </li>
        <li style={{ marginBottom: '12px' }}>
          Click the <strong>Remove</strong> button.
        </li>
        <li style={{ marginBottom: '12px' }}>
          Alternatively, you can send an email directly to <strong>support@bibliaris.com</strong>{' '}
          with your request. We will process your request and delete all your user profile data
          (email, name, avatar, and customized bookshelf entries) from our database within 24 hours.
        </li>
      </ol>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '600' }}>
          Confirmation of Deletion
        </h2>
        <p style={{ marginBottom: '12px' }}>
          Upon receiving and processing your request, we will send a confirmation email to the
          address associated with your profile confirming that all personal information has been
          permanently removed from our active databases.
        </p>
      </section>
    </div>
  );
};

export default DeletionPage;
