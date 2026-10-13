import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'fr',
  metaTitle: 'Politique de Confidentialité - Bibliaris',
  metaDescription:
    'Lisez notre politique de confidentialité pour comprendre comment nous collectons, utilisons et protégeons vos données.',
  title: 'Politique de Confidentialité',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Informations que nous collectons',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: "Lorsque vous utilisez notre service, nous pouvons collecter des informations personnelles telles que votre nom, votre adresse e-mail et votre photo de profil, principalement lorsque vous vous inscrivez ou vous connectez à l'aide de services tiers comme Google ou Facebook.",
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Comment nous utilisons vos informations',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Nous utilisons les informations que nous collectons pour :' },
          ],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'Fournir, maintenir et améliorer nos services ;' }],
            [
              {
                kind: 'text',
                text: 'Personnaliser votre expérience de lecture et votre bibliothèque ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Authentifier votre identité par e-mail/mot de passe ou via des fournisseurs OAuth ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Communiquer avec vous au sujet des mises à jour, des alertes de sécurité et des avis relatifs à votre compte.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Partage des données',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: "Nous ne vendons pas vos données personnelles. Nous ne partageons les données qu'avec les fournisseurs d'authentification tiers (Google, Facebook) afin de faciliter les processus de connexion sécurisés.",
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Suppression et conservation des données',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Nous conservons vos données aussi longtemps que votre compte est actif. Vous pouvez demander à tout moment la suppression de votre compte et de toutes les données personnelles associées en nous contactant à ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: ', ou en suivant les Instructions de Suppression des Données.' },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Nous contacter',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si vous avez des questions concernant cette Politique de Confidentialité, veuillez nous contacter à ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
