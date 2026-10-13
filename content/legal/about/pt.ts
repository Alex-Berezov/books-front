import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'about',
  lang: 'pt',
  metaTitle: 'Sobre o Bibliaris',
  metaDescription:
    'O Bibliaris é uma biblioteca online gratuita de literatura clássica em domínio público: leia, ouça e encontre resumos de livros em cinco idiomas.',
  title: 'Sobre o Bibliaris',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'what',
      heading: 'O que é o Bibliaris',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O Bibliaris é uma biblioteca online gratuita de literatura clássica em domínio público. Aqui você pode ler livros online, ouvi-los e encontrar resumos curtos e descrições de livros em cinco idiomas: inglês, espanhol, francês, português e russo.',
            },
          ],
        },
      ],
    },
    {
      id: 'readers',
      heading: 'O que fazemos pelos leitores',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Um catálogo de livros que você pode explorar por gênero, categoria, coleção e etiqueta.',
              },
            ],
            [{ kind: 'text', text: 'Leitura de livros online, sem precisar de conta.' }],
            [{ kind: 'text', text: 'Audiolivros, quando o livro tem versão em áudio.' }],
            [{ kind: 'text', text: 'Resumos curtos e descrições de livros.' }],
            [{ kind: 'text', text: 'Páginas de autores com os seus livros.' }],
            [{ kind: 'text', text: 'Uma estante para os leitores que entram na conta.' }],
          ],
        },
      ],
    },
    {
      id: 'who',
      heading: 'Quem faz o site',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'O site é feito pela redação do Bibliaris: uma pequena equipe de editores que seleciona os livros, prepara os textos para publicação e escreve os resumos e as descrições.',
            },
          ],
        },
      ],
    },
    {
      id: 'how',
      heading: 'Como trabalhamos',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Os resumos e as descrições dos livros são escritos e editados por pessoas.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Os textos dos livros seguem edições que estão em domínio público.',
              },
            ],
            [{ kind: 'text', text: 'Um erro é corrigido depois que um leitor nos avisa.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Os detalhes estão na nossa ' },
            { kind: 'link', text: 'Política editorial', href: '/editorial-policy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Fale conosco',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Perguntas, erros no site e sugestões: veja a página de ' },
            { kind: 'link', text: 'Contato', href: '/contact' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
