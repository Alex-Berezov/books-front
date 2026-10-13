import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'about',
  lang: 'fr',
  metaTitle: 'À propos de Bibliaris',
  metaDescription:
    'Bibliaris est une bibliothèque en ligne gratuite de littérature classique du domaine public : lisez, écoutez et trouvez des résumés de livres en cinq langues.',
  title: 'À propos de Bibliaris',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'what',
      heading: 'Ce qu’est Bibliaris',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris est une bibliothèque en ligne gratuite de littérature classique du domaine public. Vous pouvez y lire des livres en ligne, les écouter et trouver de courts résumés et des descriptions de livres en cinq langues : anglais, espagnol, français, portugais et russe.',
            },
          ],
        },
      ],
    },
    {
      id: 'readers',
      heading: 'Ce que nous faisons pour les lecteurs',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Un catalogue de livres que vous pouvez parcourir par genre, catégorie, collection et étiquette.',
              },
            ],
            [{ kind: 'text', text: 'La lecture de livres en ligne, sans compte nécessaire.' }],
            [{ kind: 'text', text: 'Des livres audio, lorsqu’un livre existe en version audio.' }],
            [{ kind: 'text', text: 'De courts résumés et des descriptions de livres.' }],
            [{ kind: 'text', text: 'Des pages d’auteurs avec leurs livres.' }],
            [
              {
                kind: 'text',
                text: 'Une étagère personnelle, « Ma Bibliothèque », pour les lecteurs qui se connectent.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'who',
      heading: 'Qui fait le site',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le site est réalisé par la rédaction de Bibliaris : une petite équipe de rédacteurs qui sélectionne les livres, prépare les textes pour la publication et rédige les résumés et les descriptions.',
            },
          ],
        },
      ],
    },
    {
      id: 'how',
      heading: 'Notre façon de travailler',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Les résumés et les descriptions des livres sont écrits et révisés par des personnes.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Les textes des livres suivent des éditions qui sont dans le domaine public.',
              },
            ],
            [{ kind: 'text', text: 'Une erreur est corrigée après le signalement d’un lecteur.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Les détails figurent dans notre ' },
            { kind: 'link', text: 'Politique éditoriale', href: '/editorial-policy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Nous contacter',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Questions, erreurs sur le site et suggestions : consultez la page ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
