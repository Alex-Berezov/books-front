import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'fr',
  metaTitle: 'Politique éditoriale - Bibliaris',
  metaDescription:
    'D’où viennent les textes de Bibliaris, qui écrit les résumés et les descriptions, comment sont rédigées les analyses de livres, comment les textes des livres sont préparés et comment les erreurs sont corrigées.',
  title: 'Politique éditoriale',
  updatedAt: '2026-10-19',
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
              text: 'Les résumés et les descriptions des livres, ainsi que les analyses de personnages, de symboles et de citations dans les blocs des pages des livres, sont écrits et révisés par des personnes : la rédaction de Bibliaris. Les analyses de livres sont préparées autrement : voir « Comment sont préparées les analyses de livres » ci-dessous.',
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
      id: 'analysis',
      heading: 'Comment sont préparées les analyses de livres',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les pages d’analyse sont préparées par la Rédaction de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le brouillon de chaque analyse est rédigé à l’aide d’un modèle de langage selon les consignes de la rédaction. Le modèle reçoit des informations sur cette version du livre sur le site, notamment le titre, l’auteur, la langue et la liste des chapitres. La rédaction importe et publie le brouillon.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'L’analyse dans chaque langue est rédigée séparément pour les lecteurs de cette langue, et non traduite d’une autre ; les rubriques peuvent donc varier d’une langue à l’autre.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les consignes exigent que les citations soient reproduites mot pour mot d’après l’édition du livre publiée sur Bibliaris. Le numéro de chapitre à côté d’une citation est celui du chapitre de cette version sur le site ; il renvoie à ce chapitre dans la liseuse seulement si le chapitre existe. Lors de l’import d’une analyse, les numéros de chapitre sont vérifiés automatiquement : si un chapitre n’existe pas dans cette version, la rédaction voit un avertissement.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les consignes interdisent d’inclure des dates, des faits biographiques, des adaptations ou des sources incertains, et demandent de présenter les interprétations comme des interprétations. Lorsque des sources sont indiquées, elles sont citées en bas de la page d’analyse.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Vous pouvez signaler une erreur dans une analyse sur la page ' },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ', comme décrit dans « Corrections ».' },
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
      id: 'authors',
      heading: 'Pages des auteurs',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les informations des pages d’auteurs — dates et lieux de vie, chronologie, influences, prix, adaptations et faits intéressants — proviennent de sources ouvertes. Lorsque des sources sont indiquées, elles sont citées en bas de la page de l’auteur.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Vous pouvez signaler une erreur sur la page d’un auteur sur la page ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ', comme décrit dans « Corrections ».' },
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
