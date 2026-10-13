import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'pt',
  metaTitle: 'Termos de Serviço - Bibliaris',
  metaDescription:
    'Leia nossos termos de serviço para entender as regras e diretrizes de uso da nossa biblioteca digital.',
  title: 'Termos de Serviço',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Aceitação dos Termos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Ao acessar ou usar a Bibliaris, você concorda em ficar vinculado a estes Termos de Serviço. Se você não concordar com todos os termos, não poderá acessar nem usar nossa plataforma.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Contas e Registro',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Para usar determinados recursos, você deve registrar uma conta. Você concorda em fornecer informações precisas e manter suas credenciais seguras. Você é responsável por toda a atividade em sua conta.',
            },
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Uso do Conteúdo',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Todos os livros, audiolivros, metadados, imagens e demais materiais na Bibliaris são propriedade intelectual da Bibliaris ou de seus licenciadores. Você pode acessar este conteúdo estritamente para uso pessoal e não comercial.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Rescisão',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Reservamo-nos o direito de suspender ou encerrar sua conta ou seu acesso à plataforma, a nosso exclusivo critério e sem aviso prévio, por conduta que acreditemos violar estes Termos ou ser prejudicial a outros usuários ou aos nossos interesses comerciais.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Fale Conosco',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Para qualquer dúvida sobre estes Termos, entre em contato conosco em ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
