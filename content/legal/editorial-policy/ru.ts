import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'ru',
  metaTitle: 'Редакционная политика - Bibliaris',
  metaDescription:
    'Откуда берутся тексты на Bibliaris, кто пишет пересказы и описания, как готовятся тексты книг и как исправляются ошибки.',
  title: 'Редакционная политика',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'who',
      heading: 'Кто пишет',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Пересказы и описания книг, а также разборы персонажей, символов и цитат на страницах книг пишут и редактируют люди — Редакция Bibliaris.',
            },
          ],
        },
      ],
    },
    {
      id: 'sources',
      heading: 'Откуда тексты книг',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Тексты книг публикуются по изданиям, находящимся в общественном достоянии.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Книга может быть недоступна в некоторых странах.' }],
        },
      ],
    },
    {
      id: 'preparation',
      heading: 'Как готовится текст',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Текст издания сохраняется как есть. Правятся только опечатки распознавания и типографика. Внутри текста книги ничего не сокращается и не пересказывается.',
            },
          ],
        },
      ],
    },
    {
      id: 'summaries',
      heading: 'Как пишутся пересказы',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Пересказ передаёт сюжет и идеи книги. Он не заменяет саму книгу.',
              },
            ],
            [{ kind: 'text', text: 'Пересказ может раскрывать сюжет.' }],
            [{ kind: 'text', text: 'Пересказ сверяется с текстом книги.' }],
          ],
        },
      ],
    },
    {
      id: 'translations',
      heading: 'Переводы',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если переводчик книги известен, он указывается на странице книги.',
            },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Исправления',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если вы заметили ошибку в тексте, пересказе или описании, сообщите нам на странице ',
            },
            { kind: 'link', text: 'Контакты', href: '/contact' },
            {
              kind: 'text',
              text: '. Ошибка исправляется; если она была в пересказе, у него меняется дата «Обновлено».',
            },
          ],
        },
      ],
    },
  ],
};
