import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'cookies',
  lang: 'pt',
  metaTitle: 'Política de Cookies - Bibliaris',
  metaDescription:
    'Quais cookies e armazenamento do navegador a Bibliaris usa, para quê, por quanto tempo e como mudar a sua escolha sobre a análise.',
  title: 'Política de Cookies',
  updatedAt: '2026-10-13',
  toc: true,
  sections: [
    {
      id: 's1',
      heading: '1. O que são cookies e tecnologias semelhantes',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cookies são pequenos arquivos que um site guarda no seu navegador. Os sites também usam tecnologias semelhantes: o armazenamento local (localStorage) mantém os dados no seu dispositivo até serem apagados, e o armazenamento de sessão (sessionStorage) só até você fechar a aba.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Nesta política, “cookies” refere-se às três.' }],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Quais usamos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'A tabela lista tudo o que a Bibliaris guarda no seu navegador. Ela é gerada a partir da mesma lista que o nosso código usa, por isso nada fica de fora.',
            },
          ],
        },
        { kind: 'widget', widget: 'cookie-table' },
      ],
    },
    {
      id: 's3',
      heading: '3. Cookies essenciais',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Sem eles não funcionam o login, a sessão iniciada, a proteção dos formulários e as suas escolhas guardadas. Não são usados para publicidade nem para análise, por isso não pedimos consentimento para eles.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Cookies de análise',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Usamos o Google Analytics 4. Ele conta quais páginas são visualizadas. O cookie dele guarda um identificador aleatório do seu navegador, e nós vemos apenas estatísticas agregadas, não quem você é. Usamos esses números para entender quais livros são lidos e o que melhorar.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'O Google trata esses dados segundo as suas próprias regras: ' },
            {
              kind: 'external',
              text: 'como o Google usa as informações de sites que usam os seus serviços',
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
              text: 'Nos países do Espaço Econômico Europeu, no Reino Unido e na Suíça, e também quando não conseguimos saber o seu país, o Google Analytics só é carregado depois de você clicar em “Aceitar”. Nos outros países a análise está ativada por padrão, e você pode desativá-la abaixo.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. A sua escolha',
      blocks: [
        { kind: 'widget', widget: 'consent-choice' },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Você também pode apagar os cookies ou bloqueá-los nas configurações do navegador. Se os apagar, o site voltará a pedir a sua escolha onde ela é necessária.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Se o seu navegador envia o sinal Global Privacy Control, tratamos isso como uma recusa: a análise não é carregada em nenhum país, mesmo que você tenha clicado em “Aceitar” antes.',
            },
          ],
        },
      ],
    },
    {
      id: 's6',
      heading: '6. Alterações desta política',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'A data no topo da página mostra quando o conteúdo desta política mudou pela última vez. Se acrescentarmos nova análise ou novas finalidades, voltaremos a perguntar a todos que aceitaram a análise. Uma recusa continua válida.',
            },
          ],
        },
      ],
    },
    {
      id: 's7',
      heading: '7. Contato',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Dúvidas sobre cookies: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '. Como tratamos dados pessoais está descrito na nossa ' },
            { kind: 'link', text: 'Política de Privacidade', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
