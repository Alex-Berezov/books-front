import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import {
  contactGeneral,
  governingLawCountry,
  minimumAge,
  operatorCountry,
  operatorLegalName,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'pt',
  metaTitle: 'Termos de Serviço - Bibliaris',
  metaDescription:
    'As regras de uso do Bibliaris: contas, o que é permitido, a quem pertence o conteúdo, comentários, titulares de direitos e lei aplicável.',
  title: 'Termos de Serviço',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'operator',
      heading: '1. Quem presta o serviço',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `O Bibliaris é prestado por ${operatorLegalName}, ${operatorStatusText.pt[operatorStatus].inline} (país: ${countryName(operatorCountry, 'pt')}). Ao usar o site, você aceita estes termos. Se você não os aceitar, por favor não use o site.`,
            },
          ],
        },
      ],
    },
    {
      id: 'service',
      heading: '2. O serviço',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O Bibliaris é uma biblioteca on-line onde você pode ler livros e os seus resumos e ouvir audiolivros. O serviço é gratuito. Podemos adicionar, alterar ou remover funções a qualquer momento.',
            },
          ],
        },
      ],
    },
    {
      id: 'account',
      heading: '3. A sua conta',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Para criar uma conta, você precisa ter pelo menos ${minimumAge} anos.`,
              },
            ],
            [{ kind: 'text', text: 'Informe dados corretos ao se cadastrar.' }],
            [
              {
                kind: 'text',
                text: 'Mantenha a sua senha em segredo; você é responsável pelo que acontece na sua conta.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Você pode pedir a exclusão da sua conta a qualquer momento: veja a ',
              },
              { kind: 'link', text: 'página de exclusão de dados', href: '/deletion' },
              { kind: 'text', text: '.' },
            ],
          ],
        },
      ],
    },
    {
      id: 'use',
      heading: '4. O que é permitido e o que não é',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Você pode usar o site para leitura e escuta pessoais, sem fins comerciais. Não é permitido:',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'baixar conteúdo em massa, fazer raspagem do site ou coletar o seu conteúdo de forma automatizada;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'contornar restrições de acesso, inclusive as restrições por país;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'prejudicar o funcionamento do site, atacá-lo ou enviar código malicioso;',
              },
            ],
            [{ kind: 'text', text: 'publicar comentários que violem a lei.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Podemos limitar ou encerrar uma conta que viole estas regras.',
            },
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: '5. Conteúdo',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Os textos dos livros se baseiam em edições que estão em domínio público. Os resumos, as descrições e o design do site pertencem ao Bibliaris. Você pode citá-los com um link para a página de origem; revendê-los não é permitido.',
            },
          ],
        },
      ],
    },
    {
      id: 'comments',
      heading: '6. Comentários',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Você é responsável pelo que escreve. Podemos ocultar ou excluir comentários que violem estes termos.',
            },
          ],
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Disponibilidade por país',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Um livro pode não estar disponível em alguns países.' }],
        },
      ],
    },
    {
      id: 'rights-holders',
      heading: '8. Titulares de direitos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Se você detém direitos sobre uma obra e acredita que o material do site os afeta, escreva para nós como descrito na página de ',
            },
            { kind: 'link', text: 'Contato', href: '/contact' },
            {
              kind: 'text',
              text: ', no bloco para titulares de direitos. Informe a obra em questão, o link da página onde ela aparece, a comprovação dos seus direitos e os seus dados de contato.',
            },
          ],
        },
      ],
    },
    {
      id: 'liability',
      heading: '9. Ausência de garantias e limitação de responsabilidade',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O site é fornecido no estado em que se encontra, sem garantias. Na medida permitida pela lei do seu país, não respondemos por perdas indiretas decorrentes do uso do site. Nada nestes termos limita direitos que a lei do seu país não permite limitar.',
            },
          ],
        },
      ],
    },
    {
      id: 'law',
      heading: '10. Lei aplicável',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Lei aplicável: ${countryName(governingLawCountry, 'pt')}. Se você é consumidor na União Europeia ou no Reino Unido, mantém a proteção da lei do seu país.`,
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Alterações destes termos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Quando alteramos estes termos, publicamos a nova versão nesta página e atualizamos a data no topo. Se você continuar usando o site depois disso, aceita a nova versão.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Contato',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Dúvidas sobre estes termos: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
