import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'en',
  metaTitle: 'Editorial Policy - Bibliaris',
  metaDescription:
    'Where the texts on Bibliaris come from, who prepares the summaries and writes the descriptions, how book analyses are prepared, how book texts are prepared, and how mistakes are corrected.',
  title: 'Editorial Policy',
  updatedAt: '2026-11-03',
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
              text: 'Descriptions of books are written and edited by people: the Bibliaris editorial team.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The editorial team prepares the summaries and the analyses of characters, symbols and quotations in the blocks on book pages: it wrote some of these texts itself, and prepares others with the help of language models, following its own instructions. A summary is written only from the text of the book. Since November 2026, summaries that a model writes directly on the site are checked against the book by a second model from a different developer, which marks doubtful passages. The editorial team reads every text and publishes it itself; quotations are given verbatim from the edition of the text on the site. More about book analyses: “How book analyses are prepared” below.',
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
            [{ kind: 'text', text: 'A summary is written only from the text of the book.' }],
          ],
        },
      ],
    },
    {
      id: 'analysis',
      heading: 'How book analyses are prepared',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Analysis pages are prepared by the Bibliaris Editorial Team.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'A draft of each analysis is produced with a language model following the editorial team’s instructions. The model receives information about this version of the book on the site, including its title, author, language and list of chapters. The editorial team uploads and publishes the draft.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The analysis in each language is written separately for readers of that language rather than translated from another, so the sections may differ between languages.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The instructions require quotations to be given word for word from the edition of the book published on Bibliaris. The chapter number next to a quotation is the number of the chapter in this version on the site; it links to that chapter in the reader only if the chapter exists. When an analysis is uploaded, chapter numbers are checked automatically: if a chapter does not exist in this version, the editorial team sees a warning.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'The instructions forbid including dates, biographical facts, adaptations or sources that are not certain, and require interpretations to be presented as interpretations. When sources are given, they are listed at the bottom of the analysis page.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'You can report a mistake in an analysis on the ' },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ' page, as described under “Corrections”.' },
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
