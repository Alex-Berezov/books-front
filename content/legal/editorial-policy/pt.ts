import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'pt',
  metaTitle: 'Política editorial - Bibliaris',
  metaDescription:
    'De onde vêm os textos do Bibliaris, quem escreve os resumos e as descrições, como os textos dos livros são preparados e como os erros são corrigidos.',
  title: 'Política editorial',
  updatedAt: '2026-10-16',
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
              text: 'Os resumos e as descrições dos livros, e as análises de personagens, símbolos e citações nas páginas dos livros, são escritos e editados por pessoas: a redação do Bibliaris.',
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
            [{ kind: 'text', text: 'Um resumo é conferido com o texto do livro.' }],
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
