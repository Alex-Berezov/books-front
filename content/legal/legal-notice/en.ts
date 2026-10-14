import 'server-only';
import {
  contactGeneral,
  contactResponseDays,
  operatorLegalName,
  operatorPostalAddress,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'legal-notice',
  lang: 'en',
  metaTitle: 'Legal Notice - Bibliaris',
  metaDescription:
    'Who runs Bibliaris: the operator of the site, postal address and contact email.',
  title: 'Legal Notice',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'operator',
      heading: 'Site operator',
      blocks: [
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: `Name: ${operatorLegalName}` }],
            [{ kind: 'text', text: `Status: ${operatorStatusText.en[operatorStatus].label}` }],
            [{ kind: 'text', text: `Postal address: ${operatorPostalAddress}` }],
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Email: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: `. We reply within ${contactResponseDays} days.` },
          ],
        },
      ],
    },
    {
      id: 'responsible',
      heading: 'Responsible for content',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `${operatorLegalName}, at the postal address above.`,
            },
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Personal data',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'How we handle personal data is described in the ' },
            { kind: 'link', text: 'Privacy Policy', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
