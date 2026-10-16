import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'en',
  metaTitle: 'Editorial Policy - Bibliaris',
  metaDescription:
    'Where the texts on Bibliaris come from, who writes the summaries and descriptions, how book texts are prepared, and how mistakes are corrected.',
  title: 'Editorial Policy',
  updatedAt: '2026-10-16',
  toc: false,
  sections: [
    {
      id: 'who',
      heading: 'Who writes',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Summaries and descriptions of books, and the analyses of characters, symbols and quotations on book pages, are written and edited by people: the Bibliaris editorial team.',
            },
          ],
        },
      ],
    },
    {
      id: 'sources',
      heading: 'Where the texts of books come from',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The texts of books are published from editions that are in the public domain.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'A book may be unavailable in some countries.' }],
        },
      ],
    },
    {
      id: 'preparation',
      heading: 'How a text is prepared',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The text of an edition is kept as it is. Only typos left by text recognition and typography are corrected. Nothing inside the text of a book is shortened or retold.',
            },
          ],
        },
      ],
    },
    {
      id: 'summaries',
      heading: 'How summaries are written',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'A summary conveys the plot and the ideas of a book. It does not replace the book.',
              },
            ],
            [{ kind: 'text', text: 'A summary may reveal the plot.' }],
            [{ kind: 'text', text: 'A summary is checked against the text of the book.' }],
          ],
        },
      ],
    },
    {
      id: 'translations',
      heading: 'Translations',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If the translator of a book is known, the translator is named on the book page.',
            },
          ],
        },
      ],
    },
    {
      id: 'authors',
      heading: 'Author pages',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The information on author pages — dates and places of life, the timeline, influences, awards, adaptations and interesting facts — is gathered from open sources. When sources are given, they are listed at the bottom of the author page.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'You can report a mistake on an author page on the ' },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ' page, as described under “Corrections”.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Corrections',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'If you notice a mistake in a text, a summary or a description, tell us on the ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            {
              kind: 'text',
              text: ' page. The mistake is corrected; when it is in a summary, the “Updated” date of that summary changes.',
            },
          ],
        },
      ],
    },
  ],
};
