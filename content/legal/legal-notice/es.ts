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
  lang: 'es',
  metaTitle: 'Aviso legal - Bibliaris',
  metaDescription:
    'Quién gestiona Bibliaris: el responsable del sitio, su dirección postal y el correo de contacto.',
  title: 'Aviso legal',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'operator',
      heading: 'Responsable del sitio',
      blocks: [
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: `Nombre: ${operatorLegalName}` }],
            [{ kind: 'text', text: `Condición: ${operatorStatusText.es[operatorStatus].label}` }],
            [{ kind: 'text', text: `Dirección postal: ${operatorPostalAddress}` }],
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contacto',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Correo electrónico: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: `. Respondemos en un plazo de ${contactResponseDays} días.` },
          ],
        },
      ],
    },
    {
      id: 'responsible',
      heading: 'Responsable del contenido',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `${operatorLegalName}, en la dirección postal indicada arriba.`,
            },
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Datos personales',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Cómo tratamos los datos personales se explica en la ' },
            { kind: 'link', text: 'Política de Privacidad', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
