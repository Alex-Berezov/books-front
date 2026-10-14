import 'server-only';
import {
  contactGeneral,
  contactResponseDays,
  operatorLegalName,
  operatorPostalAddress,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'legal-notice',
  lang: 'fr',
  metaTitle: 'Mentions légales - Bibliaris',
  metaDescription:
    'Qui édite Bibliaris : l’éditeur du site, son adresse postale et son adresse e-mail de contact.',
  title: 'Mentions légales',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'operator',
      heading: 'Éditeur du site',
      blocks: [
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: `Nom : ${operatorLegalName}` }],
            [{ kind: 'text', text: `Statut : ${operatorStatusText.fr[operatorStatus].label}` }],
            [{ kind: 'text', text: `Adresse postale : ${operatorPostalAddress}` }],
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'E-mail : ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            {
              kind: 'text',
              text: `. Nous répondons dans un délai de ${contactResponseDays} jours.`,
            },
          ],
        },
      ],
    },
    {
      id: 'responsible',
      heading: 'Responsable de la publication',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `${operatorLegalName}, joignable à l’adresse postale indiquée ci-dessus.`,
            },
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
            { kind: 'text', text: 'Le traitement des données personnelles est décrit dans la ' },
            { kind: 'link', text: 'Politique de Confidentialité', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
