import 'server-only';
import { contactGeneral, contactPrivacy, contactRights } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'contact',
  lang: 'en',
  metaTitle: 'Contact - Bibliaris',
  metaDescription:
    'How to reach Bibliaris: general questions and support, mistakes in a text or summary, a message from a rights holder, and personal data requests.',
  title: 'Contact',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'general',
      heading: 'General questions and support',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions, mistakes on the site and suggestions: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'A mistake in a text or summary',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If you found a mistake in a book text or in a summary, write to ',
            },
            {
              kind: 'mailto',
              text: contactGeneral,
              email: contactGeneral,
              subject: 'A mistake in a book text or summary',
            },
            { kind: 'text', text: '. How we correct mistakes is described in the ' },
            { kind: 'link', text: 'Editorial Policy', href: '/editorial-policy#corrections' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'For rights holders',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If you hold rights to a work and believe that material on the site affects them, write to ',
            },
            { kind: 'mailto', text: contactRights, email: contactRights },
            { kind: 'text', text: '. Please include:' },
          ],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'the work concerned;' }],
            [{ kind: 'text', text: 'a link to the page of the site where it appears;' }],
            [{ kind: 'text', text: 'confirmation of your rights;' }],
            [{ kind: 'text', text: 'your contact details.' }],
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
            {
              kind: 'text',
              text: 'Requests about your personal data (access, correction, deletion): ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. Read the ' },
            { kind: 'link', text: 'Privacy Policy', href: '/privacy' },
            { kind: 'text', text: ' and the ' },
            { kind: 'link', text: 'data deletion page', href: '/deletion' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
