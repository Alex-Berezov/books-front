import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import {
  contactGeneral,
  governingLawCountry,
  minimumAge,
  operatorCountry,
  operatorLegalName,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'en',
  metaTitle: 'Terms of Service - Bibliaris',
  metaDescription:
    'The rules for using Bibliaris: accounts, what is allowed, who owns the content, comments, rights holders and applicable law.',
  title: 'Terms of Service',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'operator',
      heading: '1. Who provides the service',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris is provided by ${operatorLegalName}, ${operatorStatusText.en[operatorStatus].inline} (country: ${countryName(operatorCountry, 'en')}). By using the site, you accept these terms. If you do not accept them, please do not use the site.`,
            },
          ],
        },
      ],
    },
    {
      id: 'service',
      heading: '2. The service',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris is an online library where you can read books and their summaries and listen to audiobooks. The service is free. We may add, change or remove features at any time.',
            },
          ],
        },
      ],
    },
    {
      id: 'account',
      heading: '3. Your account',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `You must be at least ${minimumAge} years old to create an account.`,
              },
            ],
            [{ kind: 'text', text: 'Give accurate information when you register.' }],
            [
              {
                kind: 'text',
                text: 'Keep your password secret; you are responsible for what happens in your account.',
              },
            ],
            [
              { kind: 'text', text: 'You can ask us to delete your account at any time: see the ' },
              { kind: 'link', text: 'data deletion page', href: '/deletion' },
              { kind: 'text', text: '.' },
            ],
          ],
        },
      ],
    },
    {
      id: 'use',
      heading: '4. What is allowed and what is not',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'You may use the site for personal, non-commercial reading and listening. You may not:',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'download content in bulk, scrape the site or collect its content automatically;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'get around access restrictions, including restrictions by country;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'interfere with the site, attack it or upload malicious code;',
              },
            ],
            [{ kind: 'text', text: 'post comments that break the law.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'We may limit or close an account that breaks these rules.',
            },
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: '5. Content',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Book texts are based on editions in the public domain. Summaries, descriptions and the design of the site belong to Bibliaris. You may quote them with a link to the source page; reselling them is not allowed.',
            },
          ],
        },
      ],
    },
    {
      id: 'comments',
      heading: '6. Comments',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'You are responsible for what you write. We may hide or delete comments that break these terms.',
            },
          ],
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Availability by country',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'A book may be unavailable in some countries.' }],
        },
      ],
    },
    {
      id: 'rights-holders',
      heading: '8. Rights holders',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If you hold rights to a work and believe that material on the site affects them, write to us as described on the ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            {
              kind: 'text',
              text: ' page, in the block for rights holders. Please include the work concerned, a link to the page where it appears, confirmation of your rights and your contact details.',
            },
          ],
        },
      ],
    },
    {
      id: 'liability',
      heading: '9. No warranty and limitation of liability',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The site is provided as it is, without warranties. To the extent allowed by the law of your country, we are not liable for indirect losses from using the site. Nothing in these terms limits rights that the law of your country does not allow to be limited.',
            },
          ],
        },
      ],
    },
    {
      id: 'law',
      heading: '10. Applicable law',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Governing law: ${countryName(governingLawCountry, 'en')}. If you are a consumer in the European Union or the United Kingdom, you keep the protection of the law of your country.`,
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Changes to these terms',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'When we change these terms, we publish the new version on this page and update the date at the top. If you keep using the site after that, you accept the new version.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Contact',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions about these terms: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
