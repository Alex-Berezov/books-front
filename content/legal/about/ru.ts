import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'about',
  lang: 'ru',
  metaTitle: 'О Bibliaris',
  metaDescription:
    'Bibliaris — бесплатная онлайн-библиотека классической литературы в общественном достоянии: читайте, слушайте и находите краткие пересказы книг на пяти языках.',
  title: 'О Bibliaris',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'what',
      heading: 'Что такое Bibliaris',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris — бесплатная онлайн-библиотека классической литературы в общественном достоянии. Здесь можно читать книги онлайн, слушать их и находить краткие пересказы и описания книг на пяти языках: английском, испанском, французском, португальском и русском.',
            },
          ],
        },
      ],
    },
    {
      id: 'readers',
      heading: 'Что мы делаем для читателя',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Каталог книг с разделами по жанрам, категориям, коллекциям и тегам.',
              },
            ],
            [{ kind: 'text', text: 'Чтение книг онлайн, аккаунт для этого не нужен.' }],
            [{ kind: 'text', text: 'Аудиокниги, если у книги есть аудиоверсия.' }],
            [{ kind: 'text', text: 'Краткие пересказы и описания книг.' }],
            [{ kind: 'text', text: 'Страницы авторов с их книгами.' }],
            [{ kind: 'text', text: 'Книжная полка для читателей, которые вошли в аккаунт.' }],
          ],
        },
      ],
    },
    {
      id: 'who',
      heading: 'Кто делает сайт',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Сайт делает Редакция Bibliaris — небольшая команда редакторов: они отбирают книги, готовят тексты к публикации, пишут пересказы и описания.',
            },
          ],
        },
      ],
    },
    {
      id: 'how',
      heading: 'Как мы работаем',
      blocks: [
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'Пересказы и описания книг пишут и редактируют люди.' }],
            [
              {
                kind: 'text',
                text: 'Тексты книг публикуются по изданиям, находящимся в общественном достоянии.',
              },
            ],
            [{ kind: 'text', text: 'Ошибка исправляется после сообщения читателя.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Подробности — в нашей ' },
            { kind: 'link', text: 'Редакционной политике', href: '/editorial-policy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Связаться с нами',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Вопросы, ошибки на сайте и предложения — на странице ' },
            { kind: 'link', text: 'Контакты', href: '/contact' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
