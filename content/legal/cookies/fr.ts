import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'cookies',
  lang: 'fr',
  metaTitle: 'Politique relative aux cookies - Bibliaris',
  metaDescription:
    'Quels cookies et quel stockage du navigateur Bibliaris utilise, dans quel but, pour combien de temps et comment modifier votre choix concernant la mesure d’audience.',
  title: 'Politique relative aux cookies',
  updatedAt: '2026-10-13',
  toc: true,
  sections: [
    {
      id: 's1',
      heading: '1. Que sont les cookies et les technologies similaires',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les cookies sont de petits fichiers qu’un site web enregistre dans votre navigateur. Les sites utilisent aussi des technologies similaires : le stockage local (localStorage) conserve les données sur votre appareil jusqu’à leur effacement, et le stockage de session (sessionStorage) seulement jusqu’à la fermeture de l’onglet.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Dans cette politique, « cookies » désigne ces trois technologies.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Ceux que nous utilisons',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le tableau recense tout ce que Bibliaris enregistre dans votre navigateur. Il est construit à partir de la liste qu’utilise notre code : rien n’y manque.',
            },
          ],
        },
        { kind: 'widget', widget: 'cookie-table' },
      ],
    },
    {
      id: 's3',
      heading: '3. Cookies indispensables',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Sans eux, la connexion, le maintien de la connexion, la protection des formulaires et vos choix enregistrés ne fonctionnent pas. Ils ne servent ni à la publicité ni à la mesure d’audience : nous ne demandons donc pas votre consentement pour ces cookies.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Cookies de mesure d’audience',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Nous utilisons Google Analytics 4. Il compte les pages consultées. Son cookie conserve un identifiant aléatoire de votre navigateur, et nous ne voyons que des statistiques globales, pas qui vous êtes. Ces chiffres nous servent à savoir quels livres sont lus et quoi améliorer.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Google traite ces données selon ses propres règles : ' },
            {
              kind: 'external',
              text: 'comment Google utilise les informations des sites qui utilisent ses services',
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
              text: 'Dans les pays de l’Espace économique européen, au Royaume-Uni et en Suisse, ainsi que lorsque nous ne pouvons pas déterminer votre pays, Google Analytics ne se charge qu’après un clic sur « Accepter ». Ailleurs, la mesure d’audience est activée par défaut et vous pouvez la désactiver ci-dessous.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Votre choix',
      blocks: [
        { kind: 'widget', widget: 'consent-choice' },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Vous pouvez aussi supprimer ou bloquer les cookies dans les paramètres de votre navigateur. Si vous les supprimez, le site vous redemandera votre choix là où il est requis.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si votre navigateur envoie le signal Global Privacy Control, nous le traitons comme un refus : la mesure d’audience ne se charge dans aucun pays, même si vous aviez cliqué sur « Accepter ».',
            },
          ],
        },
      ],
    },
    {
      id: 's6',
      heading: '6. Modifications de cette politique',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'La date en haut de la page indique la dernière modification du contenu de cette politique. Si nous ajoutons une nouvelle mesure d’audience ou de nouvelles finalités, nous redemanderons leur choix à tous ceux qui ont accepté la mesure d’audience. Un refus reste valable.',
            },
          ],
        },
      ],
    },
    {
      id: 's7',
      heading: '7. Contact',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions sur les cookies : ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            {
              kind: 'text',
              text: '. Le traitement des données personnelles est décrit dans notre ',
            },
            { kind: 'link', text: 'Politique de Confidentialité', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
