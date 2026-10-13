import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'pt',
  metaTitle: 'Política de Privacidade - Bibliaris',
  metaDescription:
    'Leia nossa política de privacidade para entender como coletamos, usamos e protegemos seus dados.',
  title: 'Política de Privacidade',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Informações que Coletamos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Quando você usa nosso serviço, podemos coletar informações pessoais como seu nome, endereço de e-mail e foto de perfil, principalmente quando você se registra ou faz login usando serviços de terceiros como Google ou Facebook.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Como Usamos Suas Informações',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Usamos as informações que coletamos para:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'Fornecer, manter e melhorar nossos serviços;' }],
            [{ kind: 'text', text: 'Personalizar sua experiência de leitura e sua estante;' }],
            [
              {
                kind: 'text',
                text: 'Autenticar sua identidade por e-mail/senha ou por provedores OAuth;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Comunicar-nos com você sobre atualizações, alertas de segurança e avisos relacionados à conta.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Compartilhamento de Dados',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Não vendemos seus dados pessoais. Compartilhamos dados apenas com provedores de autenticação terceirizados (Google, Facebook) para viabilizar fluxos de login seguros.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Exclusão e Retenção de Dados',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Mantemos seus dados enquanto sua conta estiver ativa. Você pode solicitar a exclusão da sua conta e de todos os dados pessoais associados a qualquer momento entrando em contato conosco em ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: ', ou seguindo as Instruções de Exclusão de Dados.' },
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
              text: 'Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato conosco em ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
