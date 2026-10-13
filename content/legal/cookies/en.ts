import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'cookies',
  lang: 'en',
  metaTitle: 'Cookie Policy - Bibliaris',
  metaDescription:
    'Which cookies and browser storage Bibliaris uses, why, for how long, and how to change your choice about analytics.',
  title: 'Cookie Policy',
  updatedAt: '2026-10-13',
  toc: true,
  sections: [
    {
      id: 's1',
      heading: '1. What cookies and similar technologies are',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cookies are small files a website stores in your browser. Sites also use similar technologies: local storage (localStorage) keeps data on your device until it is cleared, and session storage (sessionStorage) keeps it only until you close the tab.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'In this policy, “cookies” means all three.' }],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Which ones we use',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The table lists everything Bibliaris stores in your browser. It is built from the same list our code uses, so nothing is missing from it.',
            },
          ],
        },
        { kind: 'widget', widget: 'cookie-table' },
      ],
    },
    {
      id: 's3',
      heading: '3. Essential cookies',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Without them, signing in, staying signed in, form protection and your saved choices do not work. They are not used for advertising or analytics, so we do not ask for consent to them.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Analytics cookies',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'We use Google Analytics 4. It counts which pages are viewed. Its cookie stores a random identifier of your browser, and we see only summary statistics, not who you are. We use these numbers to understand which books people read and what to improve.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Google processes this data under its own rules: ' },
            {
              kind: 'external',
              text: 'how Google uses information from sites that use its services',
              href: 'https://policies.google.com/technologies/partner-sites',
            },
            { kind: 'text', text: '.' },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'In the countries of the European Economic Area, in the United Kingdom and in Switzerland, as well as when we cannot tell your country, Google Analytics loads only after you click “Accept”. Elsewhere analytics is on by default, and you can turn it off below.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Your choice',
      blocks: [
        { kind: 'widget', widget: 'consent-choice' },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'You can also delete cookies or block them in your browser settings. If you delete them, the site will ask for your choice again where it is required.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If your browser sends the Global Privacy Control signal, we treat it as a refusal: analytics does not load in any country, even if you clicked “Accept” before.',
            },
          ],
        },
      ],
    },
    {
      id: 's6',
      heading: '6. Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The date at the top of the page shows when the meaning of this policy last changed. If we add new analytics or new purposes, we will ask again everyone who accepted analytics. A refusal stays in force.',
            },
          ],
        },
      ],
    },
    {
      id: 's7',
      heading: '7. Contacts',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions about cookies: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '. How we handle personal data is described in our ' },
            { kind: 'link', text: 'Privacy Policy', href: '/privacy' },
            { kind: 'text', text: '.' },
            { kind: 'text', text: ' Other ways to reach us are on the ' },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ' page.' },
          ],
        },
      ],
    },
  ],
};
