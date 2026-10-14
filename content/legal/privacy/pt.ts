import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import { pluralize } from '@/lib/i18n/plural';
import {
  contactPrivacy,
  contactResponseDays,
  minimumAge,
  operatorCountry,
  operatorLegalName,
  retentionAnalyticsMonths,
  retentionBackupsMonths,
  retentionDeletionHours,
  retentionServerLogsDays,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'pt',
  metaTitle: 'Política de Privacidade - Bibliaris',
  metaDescription:
    'Quem administra o Bibliaris, quais dados pessoais o site coleta, para quê, por quanto tempo são mantidos, quem os recebe e como exercer os seus direitos.',
  title: 'Política de Privacidade',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'who',
      heading: '1. Quem somos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `O Bibliaris é administrado por ${operatorLegalName}, ${operatorStatusText.pt[operatorStatus].inline} (país: ${countryName(operatorCountry, 'pt')}). É essa pessoa quem decide como e por que os seus dados pessoais são usados (o controlador dos dados).`,
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Dúvidas sobre os seus dados: ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            {
              kind: 'text',
              text: '. O endereço postal e os demais dados do responsável pelo site estão na página ',
            },
            { kind: 'link', text: 'Aviso legal', href: '/legal-notice' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'data',
      heading: '2. Quais dados coletamos',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'A sua conta, se você criar uma:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'endereço de e-mail, senha (guardada apenas como hash irreversível), nome e apelido, link da foto de perfil, idioma da interface;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'se você entrar com o Google: o identificador da sua conta Google, o endereço de e-mail, o nome e a foto de perfil que o Google nos envia;',
              },
            ],
            [{ kind: 'text', text: 'data do cadastro e do último login.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'O que você faz no site com a sessão iniciada:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'estante, progresso de leitura, avaliações, curtidas e visualizações de livros vinculados à sua conta;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'comentários. Um comentário é público e aparece com o seu nome, apelido e foto de perfil.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Sem conta, o progresso de leitura fica guardado apenas no seu navegador e não é enviado para nós.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Dados técnicos: o seu endereço IP é tratado pelo nosso provedor de hospedagem e pela Cloudflare para entregar o site e protegê-lo contra abusos. O seu país é determinado a partir do endereço IP em cada requisição e não é guardado na sua conta.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Análise: estatísticas de visitas do Google Analytics, apenas onde isso é permitido (veja a seção 10).',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Mensagens: se você nos escrever, inclusive como titular de direitos, guardamos a correspondência e os seus dados de contato pelo tempo necessário para responder e resolver o seu pedido.',
            },
          ],
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Para que usamos os dados e com qual base legal',
      blocks: [
        {
          kind: 'table',
          head: ['Finalidade', 'Base legal', 'Dados'],
          rows: [
            [
              [
                {
                  kind: 'text',
                  text: 'A sua conta e as suas funções: login, estante, progresso de leitura, avaliações, comentários',
                },
              ],
              [{ kind: 'text', text: 'Contrato' }],
              [{ kind: 'text', text: 'Dados da conta e o que você faz no site' }],
            ],
            [
              [{ kind: 'text', text: 'Segurança e proteção contra abusos' }],
              [{ kind: 'text', text: 'Interesse legítimo' }],
              [{ kind: 'text', text: 'Endereço IP, registros do servidor, tentativas de login' }],
            ],
            [
              [
                {
                  kind: 'text',
                  text: 'Determinação do seu país: um livro pode não estar disponível em alguns países',
                },
              ],
              [{ kind: 'text', text: 'Interesse legítimo' }],
              [{ kind: 'text', text: 'Endereço IP (o país não é guardado)' }],
            ],
            [
              [{ kind: 'text', text: 'Estatísticas de visitas (Google Analytics)' }],
              [
                {
                  kind: 'text',
                  text: 'Consentimento no EEE, no Reino Unido e na Suíça, e quando não é possível determinar o seu país; interesse legítimo nos demais casos, com a possibilidade de você recusar',
                },
              ],
              [
                {
                  kind: 'text',
                  text: 'Cookies de análise, páginas visitadas, dados do dispositivo e do navegador',
                },
              ],
            ],
            [
              [{ kind: 'text', text: 'Responder às suas mensagens' }],
              [{ kind: 'text', text: 'Interesse legítimo' }],
              [{ kind: 'text', text: 'Endereço de e-mail e correspondência' }],
            ],
          ],
        },
      ],
    },
    {
      id: 'recipients',
      heading: '4. Quem recebe os dados',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Usamos estes prestadores de serviço, e apenas para estas tarefas:',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Namecheap, Inc. (EUA): hospedagem dos servidores do site e do banco de dados;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Cloudflare: entrega de conteúdo, proteção, detecção do país, armazenamento de capas e áudio;',
              },
            ],
            [{ kind: 'text', text: 'Google: Google Analytics e login com o Google.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Não vendemos os seus dados pessoais.' }],
        },
      ],
    },
    {
      id: 'transfers',
      heading: '5. Transferências para fora do seu país',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Os prestadores acima estão sediados nos Estados Unidos; a Cloudflare também opera por meio de servidores no mundo inteiro. Essas transferências se baseiam em garantias adequadas previstas em lei (artigos 45 e 46 do RGPD); para pedir uma cópia, escreva para ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'retention',
      heading: '6. Por quanto tempo guardamos os dados',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Dados da conta e o que você faz no site: até a exclusão da conta. Após um pedido de exclusão, os dados são removidos do banco de dados em uso em até ${retentionDeletionHours} horas; nas cópias de segurança permanecem por até ${retentionBackupsMonths} meses, depois disso as cópias são sobrescritas.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Permanece um registro técnico de que a conta foi excluída, sem o seu endereço de e-mail nem o seu nome.',
              },
            ],
            [
              {
                kind: 'text',
                text: `Registros do servidor com endereços IP: ${retentionServerLogsDays} dias.`,
              },
            ],
            [
              {
                kind: 'text',
                text: `Dados do Google Analytics sobre cada visitante e suas ações: até ${retentionAnalyticsMonths} ${pluralize(retentionAnalyticsMonths, 'pt', { one: 'mês', few: 'meses', many: 'meses' })} após a sua última visita. As estatísticas agregadas de visitas, sem identificadores, são mantidas por mais tempo.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Correspondência: pelo tempo necessário para responder e resolver o pedido.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '7. Os seus direitos',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Você tem o direito de:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'acessar os seus dados e obter uma cópia deles;' }],
            [{ kind: 'text', text: 'pedir a correção de dados incorretos;' }],
            [
              { kind: 'text', text: 'pedir a exclusão dos seus dados (veja a ' },
              { kind: 'link', text: 'página de exclusão de dados', href: '/deletion' },
              { kind: 'text', text: ');' },
            ],
            [{ kind: 'text', text: 'limitar o uso dos seus dados;' }],
            [{ kind: 'text', text: 'receber os seus dados em formato portável;' }],
            [{ kind: 'text', text: 'opor-se ao uso baseado em interesse legítimo;' }],
            [
              {
                kind: 'text',
                text: 'retirar o consentimento a qualquer momento, por exemplo nas configurações de cookies;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'apresentar reclamação a uma autoridade de proteção de dados.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Para exercer esses direitos, escreva para ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: `. Respondemos em até ${contactResponseDays} dias.` },
          ],
        },
      ],
    },
    {
      id: 'regions',
      heading: '8. Por região',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'EEE, Reino Unido, Suíça: você tem os direitos da seção 7 nos termos do RGPD (GDPR), do UK GDPR ou da FADP suíça (LPD), e pode apresentar reclamação à autoridade de proteção de dados do lugar onde mora ou trabalha.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Estados Unidos, Califórnia (CCPA/CPRA): coletamos as categorias de dados listadas na seção 2: identificadores, dados da conta, atividade no site e dados de análise. Usamos o Google Analytics para medir as visitas. Não vendemos informações pessoais. Respeitamos o sinal Global Privacy Control: com ele, a análise não é carregada. Você tem o direito de saber quais dados temos, de excluí-los e corrigi-los, e de não sofrer discriminação por exercer esses direitos.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Brasil (LGPD): você tem os direitos do art. 18, entre eles confirmação da existência de tratamento, acesso, correção, anonimização, bloqueio ou eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento. Os pedidos vão para o endereço da seção 7.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'children',
      heading: '9. Crianças',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Para criar uma conta, você precisa ter pelo menos ${minimumAge} anos. Não coletamos intencionalmente dados de crianças com menos dessa idade; se você acredita que isso aconteceu, escreva para `,
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: ' e vamos excluí-los.' },
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Usamos cookies essenciais para o login e, onde isso é permitido, cookies do Google Analytics. Quais cookies, por quanto tempo e como mudar a sua escolha está descrito na ',
            },
            { kind: 'link', text: 'Política de Cookies', href: '/cookies' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Segurança',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O site funciona apenas por conexão criptografada (HTTPS). As senhas são guardadas apenas como hash irreversível. O acesso às ferramentas de administração é restrito às funções da equipe.',
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '12. Alterações desta política',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Quando alteramos esta política, publicamos a nova versão nesta página e atualizamos a data no topo.',
            },
          ],
        },
      ],
    },
  ],
};
