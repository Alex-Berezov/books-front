import 'server-only';
import { contactGeneral, contactPrivacy, contactRights } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'contact',
  lang: 'fr',
  metaTitle: 'Contact - Bibliaris',
  metaDescription:
    'Comment joindre Bibliaris : questions générales et assistance, erreur dans un texte ou un résumé, message d’un titulaire de droits et demandes concernant les données personnelles.',
  title: 'Contact',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'general',
      heading: 'Questions générales et assistance',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions, erreurs sur le site et suggestions : ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Une erreur dans un texte ou un résumé',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si vous avez trouvé une erreur dans le texte d’un livre ou dans un résumé, écrivez à ',
            },
            {
              kind: 'mailto',
              text: contactGeneral,
              email: contactGeneral,
              subject: 'Erreur dans le texte d’un livre ou un résumé',
            },
            {
              kind: 'text',
              text: '. La manière dont nous corrigeons les erreurs est décrite dans la ',
            },
            { kind: 'link', text: 'Politique éditoriale', href: '/editorial-policy#corrections' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'Pour les titulaires de droits',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si vous détenez des droits sur une œuvre et estimez que du contenu du site les concerne, écrivez à ',
            },
            { kind: 'mailto', text: contactRights, email: contactRights },
            { kind: 'text', text: '. Indiquez dans votre message :' },
          ],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'l’œuvre concernée ;' }],
            [{ kind: 'text', text: 'le lien vers la page du site où elle figure ;' }],
            [{ kind: 'text', text: 'la justification de vos droits ;' }],
            [{ kind: 'text', text: 'vos coordonnées.' }],
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Données personnelles',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Demandes concernant vos données personnelles (accès, rectification, suppression) : ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. Lisez la ' },
            { kind: 'link', text: 'Politique de Confidentialité', href: '/privacy' },
            { kind: 'text', text: ' et la page de ' },
            { kind: 'link', text: 'suppression des données', href: '/deletion' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
