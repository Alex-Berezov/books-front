import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'about',
  lang: 'en',
  metaTitle: 'About Bibliaris',
  metaDescription:
    'Bibliaris is a free online library of classic literature in the public domain: read, listen, and find summaries of books in five languages.',
  title: 'About Bibliaris',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'what',
      heading: 'What Bibliaris is',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris is a free online library of classic literature in the public domain. You can read books online, listen to them, and find short summaries and descriptions of books in five languages: English, Spanish, French, Portuguese and Russian.',
            },
          ],
        },
      ],
    },
    {
      id: 'readers',
      heading: 'What we do for readers',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'A catalog of books that you can browse by genre, category, collection and tag.',
              },
            ],
            [{ kind: 'text', text: 'Reading books online, with no account needed.' }],
            [{ kind: 'text', text: 'Audiobooks, where a book has an audio version.' }],
            [{ kind: 'text', text: 'Short summaries and descriptions of books.' }],
            [{ kind: 'text', text: 'Pages of authors with their books.' }],
            [{ kind: 'text', text: 'A bookshelf for readers who sign in.' }],
          ],
        },
      ],
    },
    {
      id: 'who',
      heading: 'Who makes the site',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris is made by the Bibliaris editorial team: a small team of editors who select books, prepare texts for publication, and write summaries and descriptions.',
            },
          ],
        },
      ],
    },
    {
      id: 'how',
      heading: 'How we work',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Summaries and descriptions of books are written and edited by people.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Texts of books follow editions that are in the public domain.',
              },
            ],
            [{ kind: 'text', text: 'A mistake is corrected after a reader reports it.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'The details are in our ' },
            { kind: 'link', text: 'Editorial Policy', href: '/editorial-policy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact us',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Questions, mistakes on the site and suggestions are welcome: see the ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ' page.' },
          ],
        },
      ],
    },
  ],
};
