import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'fr',
  metaTitle: 'Politique éditoriale - Bibliaris',
  metaDescription:
    'D’où viennent les textes de Bibliaris, qui écrit les résumés et les descriptions, comment les textes des livres sont préparés et comment les erreurs sont corrigées.',
  title: 'Politique éditoriale',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'who',
      heading: 'Qui écrit',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les résumés et les descriptions des livres, ainsi que les analyses de personnages, de symboles et de citations sur les pages des livres, sont écrits et révisés par des personnes : la rédaction de Bibliaris.',
            },
          ],
        },
      ],
    },
    {
      id: 'sources',
      heading: 'D’où viennent les textes des livres',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les textes des livres sont publiés d’après des éditions qui sont dans le domaine public.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Un livre peut ne pas être disponible dans certains pays.' },
          ],
        },
      ],
    },
    {
      id: 'preparation',
      heading: 'Comment un texte est préparé',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le texte d’une édition est conservé tel quel. Seules les coquilles de la reconnaissance de texte et la typographie sont corrigées. Rien n’est abrégé ni résumé à l’intérieur du texte d’un livre.',
            },
          ],
        },
      ],
    },
    {
      id: 'summaries',
      heading: 'Comment les résumés sont écrits',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Un résumé rend l’intrigue et les idées d’un livre. Il ne remplace pas le livre.',
              },
            ],
            [{ kind: 'text', text: 'Un résumé peut dévoiler l’intrigue.' }],
            [{ kind: 'text', text: 'Un résumé est vérifié par rapport au texte du livre.' }],
          ],
        },
      ],
    },
    {
      id: 'translations',
      heading: 'Traductions',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si le traducteur d’un livre est connu, il est indiqué sur la page du livre.',
            },
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
              text: 'Si vous remarquez une erreur dans un texte, un résumé ou une description, signalez-la-nous sur la page ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            {
              kind: 'text',
              text: '. L’erreur est corrigée ; si elle se trouvait dans un résumé, la date « Mis à jour » de ce résumé change.',
            },
          ],
        },
      ],
    },
  ],
};
