import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'en',
  metaTitle: 'Privacy Policy - Bibliaris',
  metaDescription:
    'Read our privacy policy to understand how we collect, use, and protect your data.',
  title: 'Privacy Policy',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Information We Collect',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'When you use our service, we may collect personal information such as your name, email address, and profile picture, primarily when you register or log in using third-party services like Google or Facebook.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. How We Use Your Information',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'We use the information we collect to:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'Provide, maintain, and improve our services;' }],
            [{ kind: 'text', text: 'Personalize your reading experience and bookshelf;' }],
            [
              {
                kind: 'text',
                text: 'Authenticate your identity via email/password or OAuth providers;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Communicate with you regarding updates, security alerts, and account-related notices.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Data Sharing',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'We do not sell your personal data. We only share data with third-party authentication providers (Google, Facebook) to facilitate secure sign-in flows.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Data Deletion and Retention',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'We retain your data for as long as your account is active. You can request deletion of your account and all associated personal data at any time by contacting us at ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: ', or by following the Data Deletion Instructions.' },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Contact Us',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If you have any questions about this Privacy Policy, please contact us at ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
