import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'pt',
  metaTitle: 'Política editorial - Bibliaris',
  metaDescription:
    'De onde vêm os textos do Bibliaris, quem prepara os resumos e escreve as descrições, como são elaboradas as análises de livros, como os textos dos livros são preparados e como os erros são corrigidos.',
  title: 'Política editorial',
  updatedAt: '2026-11-03',
  toc: false,
  sections: [
    {
      id: 'who',
      heading: 'Quem escreve',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'As descrições dos livros são escritas e editadas por pessoas: a redação do Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'A redação prepara os resumos e as análises de personagens, símbolos e citações nos blocos das páginas dos livros: parte desses textos a própria redação escreveu, e parte ela prepara com a ajuda de modelos de linguagem, seguindo as suas instruções. O resumo é escrito somente a partir do texto do livro. Desde novembro de 2026, os resumos que um modelo escreve diretamente no site são conferidos com o livro por um segundo modelo, de outro desenvolvedor, que assinala os trechos duvidosos. A redação lê cada texto e o publica ela mesma; as citações são reproduzidas literalmente conforme o texto da edição no site. Mais sobre as análises de livros: “Como são preparadas as análises de livros” abaixo.',
            },
          ],
        },
      ],
    },
    {
      id: 'sources',
      heading: 'De onde vêm os textos dos livros',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Os textos dos livros são publicados a partir de edições que estão em domínio público.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Um livro pode não estar disponível em alguns países.' }],
        },
      ],
    },
    {
      id: 'preparation',
      heading: 'Como um texto é preparado',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O texto de uma edição é mantido como está. Só são corrigidos erros do reconhecimento de texto e a tipografia. Dentro do texto de um livro nada é encurtado nem resumido.',
            },
          ],
        },
      ],
    },
    {
      id: 'summaries',
      heading: 'Como os resumos são escritos',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Um resumo transmite o enredo e as ideias de um livro. Ele não substitui o livro.',
              },
            ],
            [{ kind: 'text', text: 'Um resumo pode revelar o enredo.' }],
            [{ kind: 'text', text: 'O resumo é escrito somente a partir do texto do livro.' }],
          ],
        },
      ],
    },
    {
      id: 'analysis',
      heading: 'Como são preparadas as análises de livros',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'As páginas de análise são preparadas pela Redação do Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O rascunho de cada análise é elaborado com um modelo de linguagem seguindo as instruções da redação. O modelo recebe informações sobre esta versão do livro no site, entre elas o título, o autor, o idioma e a lista de capítulos. A redação importa e publica o rascunho.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'A análise em cada idioma é escrita separadamente para os leitores desse idioma, e não traduzida de outro; por isso as seções podem variar de um idioma para outro.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'As instruções exigem que as citações sejam reproduzidas literalmente a partir da edição do livro publicada no Bibliaris. O número do capítulo ao lado de uma citação é o número do capítulo desta versão no site; ele leva a esse capítulo no leitor apenas se o capítulo existir. Ao carregar a análise, os números dos capítulos são verificados automaticamente: se um capítulo não existir nesta versão, a redação vê um aviso.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'As instruções proíbem incluir datas, fatos biográficos, adaptações ou fontes sobre os quais não haja certeza, e exigem apresentar as interpretações como interpretações. Quando as fontes são indicadas, elas estão listadas no final da página da análise.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Você pode avisar sobre um erro em uma análise na página ' },
            { kind: 'link', text: 'Contato', href: '/contact' },
            { kind: 'text', text: ', como descrito em “Correções”.' },
          ],
        },
      ],
    },
    {
      id: 'translations',
      heading: 'Traduções',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Se o tradutor de um livro for conhecido, ele é indicado na página do livro.',
            },
          ],
        },
      ],
    },
    {
      id: 'authors',
      heading: 'Páginas de autores',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'As informações das páginas de autores — datas e locais de vida, cronologia, influências, prêmios, adaptações e curiosidades — são reunidas de fontes abertas. Quando as fontes são indicadas, elas estão listadas no final da página do autor.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Você pode avisar sobre um erro na página de um autor na página ',
            },
            { kind: 'link', text: 'Contato', href: '/contact' },
            { kind: 'text', text: ', como descrito em “Correções”.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Correções',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Se você notar um erro em um texto, um resumo ou uma descrição, avise-nos na página de ',
            },
            { kind: 'link', text: 'Contato', href: '/contact' },
            {
              kind: 'text',
              text: '. O erro é corrigido; se estava em um resumo, a data “Atualizado” desse resumo muda.',
            },
          ],
        },
      ],
    },
  ],
};
