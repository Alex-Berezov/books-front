import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'en',
  metaTitle: 'Terms of Service - Bibliaris',
  metaDescription:
    'Read our terms of service to understand the rules and guidelines for using our digital library.',
  title: 'Terms of Service',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Agreement to Terms',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'By accessing or using Bibliaris, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use our platform.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Accounts and Registration',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'To use certain features, you must register for an account. You agree to provide accurate information and keep your credentials secure. You are responsible for all activity on your account.',
            },
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Use of Content',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'All books, audiobooks, metadata, images, and other materials on Bibliaris are the intellectual property of Bibliaris or its licensors. You may access this content strictly for personal, non-commercial use.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Termination',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'We reserve the right to suspend or terminate your account or access to the platform at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or our business interests.',
            },
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
              text: 'For any questions regarding these Terms, please reach out to us at ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
