import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import {
  contactPrivacy,
  contactResponseDays,
  minimumAge,
  operatorCountry,
  operatorLegalName,
  retentionAnalyticsMaxMonths,
  retentionBackupsMonths,
  retentionDeletionHours,
  retentionServerLogsDays,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'en',
  metaTitle: 'Privacy Policy - Bibliaris',
  metaDescription:
    'Who runs Bibliaris, what personal data the site collects, why, how long it is kept, who receives it and how to use your rights.',
  title: 'Privacy Policy',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'who',
      heading: '1. Who we are',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris is run by ${operatorLegalName}, ${operatorStatusText.en[operatorStatus].inline} (country: ${countryName(operatorCountry, 'en')}). This person decides how and why your personal data is used (the data controller).`,
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions about your data: ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. The postal address and other operator details are on the ' },
            { kind: 'link', text: 'Legal Notice', href: '/legal-notice' },
            { kind: 'text', text: ' page.' },
          ],
        },
      ],
    },
    {
      id: 'data',
      heading: '2. What data we collect',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Your account, if you create one:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'email address, password (stored only as a one-way hash), name and nickname, profile picture link, interface language;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'if you sign in with Google: your Google account identifier, email address, name and profile picture as sent by Google;',
              },
            ],
            [{ kind: 'text', text: 'date of registration and of the last sign-in.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'What you do on the site while signed in:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'bookshelf, reading progress, ratings, likes and book views linked to your account;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'comments. A comment is public and is shown with your name, nickname and profile picture.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Without an account, reading progress is kept only in your browser and is not sent to us.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Technical data: your IP address is processed by our hosting provider and by Cloudflare to deliver the site and protect it from abuse. Your country is determined from the IP address on each request and is not stored in your account.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Analytics: visit statistics from Google Analytics, only where allowed (see section 10).',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Messages: if you write to us, including as a rights holder, we keep the correspondence and your contact details for as long as needed to answer and resolve your request.',
            },
          ],
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Why we use data and on what legal basis',
      blocks: [
        {
          kind: 'table',
          head: ['Purpose', 'Legal basis', 'Data'],
          rows: [
            [
              [
                {
                  kind: 'text',
                  text: 'Your account and its features: sign-in, bookshelf, reading progress, ratings, comments',
                },
              ],
              [{ kind: 'text', text: 'Contract' }],
              [{ kind: 'text', text: 'Account data and what you do on the site' }],
            ],
            [
              [{ kind: 'text', text: 'Security and protection from abuse' }],
              [{ kind: 'text', text: 'Legitimate interest' }],
              [{ kind: 'text', text: 'IP address, server logs, sign-in attempts' }],
            ],
            [
              [
                {
                  kind: 'text',
                  text: 'Determining your country: a book may be unavailable in some countries',
                },
              ],
              [{ kind: 'text', text: 'Legitimate interest' }],
              [{ kind: 'text', text: 'IP address (the country is not stored)' }],
            ],
            [
              [{ kind: 'text', text: 'Visit statistics (Google Analytics)' }],
              [
                {
                  kind: 'text',
                  text: 'Consent in the EEA, the United Kingdom and Switzerland, and when your country cannot be determined; legitimate interest elsewhere, and you can opt out',
                },
              ],
              [
                {
                  kind: 'text',
                  text: 'Analytics cookies, pages visited, device and browser data',
                },
              ],
            ],
            [
              [{ kind: 'text', text: 'Answering your messages' }],
              [{ kind: 'text', text: 'Legitimate interest' }],
              [{ kind: 'text', text: 'Email address and correspondence' }],
            ],
          ],
        },
      ],
    },
    {
      id: 'recipients',
      heading: '4. Who receives data',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'We use these service providers, and only for these tasks:' },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Namecheap, Inc. (USA): hosting of the site servers and the database;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Cloudflare: content delivery, protection, country detection, storage of covers and audio;',
              },
            ],
            [{ kind: 'text', text: 'Google: Google Analytics and sign-in with Google.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'We do not sell your personal data.' }],
        },
      ],
    },
    {
      id: 'transfers',
      heading: '5. Transfers outside your country',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The providers above are based in the United States; Cloudflare also works through servers around the world. These transfers rely on appropriate safeguards provided by law (Articles 45 and 46 GDPR); to request a copy of them, write to ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'retention',
      heading: '6. How long we keep data',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Account data and what you do on the site: until the account is deleted. After a deletion request, the data is removed from the working database within ${retentionDeletionHours} hours; in backups it remains for up to ${retentionBackupsMonths} months, after which the backups are overwritten.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'A technical record that an account was deleted remains, without your email address or name.',
              },
            ],
            [
              {
                kind: 'text',
                text: `Server logs with IP addresses: ${retentionServerLogsDays} days.`,
              },
            ],
            [
              {
                kind: 'text',
                text: `Google Analytics data: no longer than ${retentionAnalyticsMaxMonths} months.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Correspondence: as long as needed to answer and resolve the request.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '7. Your rights',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'You have the right to:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'access your data and get a copy of it;' }],
            [{ kind: 'text', text: 'have inaccurate data corrected;' }],
            [
              { kind: 'text', text: 'have your data deleted (see the ' },
              { kind: 'link', text: 'data deletion page', href: '/deletion' },
              { kind: 'text', text: ');' },
            ],
            [{ kind: 'text', text: 'restrict how your data is used;' }],
            [{ kind: 'text', text: 'receive your data in a portable format;' }],
            [{ kind: 'text', text: 'object to use based on legitimate interest;' }],
            [
              {
                kind: 'text',
                text: 'withdraw consent at any time, for example in the cookie settings;',
              },
            ],
            [{ kind: 'text', text: 'complain to a data protection authority.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'To use these rights, write to ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: `. We reply within ${contactResponseDays} days.` },
          ],
        },
      ],
    },
    {
      id: 'regions',
      heading: '8. By region',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'EEA, United Kingdom, Switzerland: you have the rights in section 7 under the GDPR, the UK GDPR or the Swiss Federal Act on Data Protection (FADP), and you can complain to the data protection authority where you live or work.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'United States, California (CCPA/CPRA): we collect the categories of data listed in section 2: identifiers, account data, activity on the site and analytics data. We use Google Analytics to measure visits. We do not sell personal information. We honour the Global Privacy Control signal: with it, analytics does not load. You have the right to know, delete and correct your data and not to be discriminated against for using these rights.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Brazil (LGPD): you have the rights under Article 18, including confirmation of processing, access, correction, anonymisation, blocking or deletion, portability, information about sharing and withdrawal of consent. Requests go to the address in section 7.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'children',
      heading: '9. Children',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `You must be at least ${minimumAge} to create an account. We do not knowingly collect data of children younger than that; if you believe we have, write to `,
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: ' and we will delete it.' },
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'We use necessary cookies for sign-in and, where allowed, Google Analytics cookies. Which cookies, for how long and how to change your choice is described in the ',
            },
            { kind: 'link', text: 'Cookie Policy', href: '/cookies' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Security',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The site works only over an encrypted connection (HTTPS). Passwords are stored only as a one-way hash. Access to administration tools is limited to staff roles.',
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '12. Changes to this policy',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'When we change this policy, we publish the new version on this page and update the date at the top.',
            },
          ],
        },
      ],
    },
  ],
};
