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
  lang: 'pt',
  metaTitle: 'Aviso legal - Bibliaris',
  metaDescription:
    'Quem administra o Bibliaris: o responsável pelo site, o endereço postal e o e-mail de contato.',
  title: 'Aviso legal',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'operator',
      heading: 'Responsável pelo site',
      blocks: [
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: `Nome: ${operatorLegalName}` }],
            [{ kind: 'text', text: `Condição: ${operatorStatusText.pt[operatorStatus].label}` }],
            [{ kind: 'text', text: `Endereço postal: ${operatorPostalAddress}` }],
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contato',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'E-mail: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: `. Respondemos em até ${contactResponseDays} dias.` },
          ],
        },
      ],
    },
    {
      id: 'responsible',
      heading: 'Responsável pelo conteúdo',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `${operatorLegalName}, no endereço postal indicado acima.`,
            },
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Dados pessoais',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Como tratamos os dados pessoais está descrito na ' },
            { kind: 'link', text: 'Política de Privacidade', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
