import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'fr',
  metaTitle: "Conditions d'utilisation - Bibliaris",
  metaDescription:
    "Lisez nos conditions d'utilisation pour comprendre les règles et directives d'utilisation de notre bibliothèque numérique.",
  title: "Conditions d'utilisation",
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Acceptation des conditions',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: "En accédant à Bibliaris ou en l'utilisant, vous acceptez d'être lié par ces Conditions d'utilisation. Si vous n'acceptez pas l'ensemble des conditions, vous ne pouvez pas accéder à notre plateforme ni l'utiliser.",
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Comptes et inscription',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Pour utiliser certaines fonctionnalités, vous devez créer un compte. Vous acceptez de fournir des informations exactes et de garder vos identifiants en sécurité. Vous êtes responsable de toute activité effectuée sur votre compte.',
            },
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Utilisation du contenu',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Tous les livres, livres audio, métadonnées, images et autres contenus présents sur Bibliaris sont la propriété intellectuelle de Bibliaris ou de ses concédants de licence. Vous pouvez accéder à ce contenu strictement pour un usage personnel et non commercial.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Résiliation',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Nous nous réservons le droit de suspendre ou de résilier votre compte ou votre accès à la plateforme, à notre seule discrétion et sans préavis, en cas de comportement que nous estimons contraire à ces Conditions ou préjudiciable aux autres utilisateurs ou à nos intérêts commerciaux.',
            },
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
              text: 'Pour toute question concernant ces Conditions, veuillez nous contacter à ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
