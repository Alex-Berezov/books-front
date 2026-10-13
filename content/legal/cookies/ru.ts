import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'cookies',
  lang: 'ru',
  metaTitle: 'Политика cookie - Bibliaris',
  metaDescription:
    'Какие cookie и хранилища браузера использует Bibliaris, зачем и на какой срок и как изменить выбор насчёт аналитики.',
  title: 'Политика cookie',
  updatedAt: '2026-10-13',
  toc: true,
  sections: [
    {
      id: 's1',
      heading: '1. Что такое cookie и похожие технологии',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cookie — небольшие файлы, которые сайт сохраняет в вашем браузере. Сайты используют и похожие технологии: локальное хранилище (localStorage) держит данные на устройстве, пока их не очистят, а хранилище сессии (sessionStorage) — только до закрытия вкладки.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'В этой политике «cookie» означает все три.' }],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Какие мы используем',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'В таблице — всё, что Bibliaris сохраняет в вашем браузере. Она собирается из того же перечня, по которому работает наш код, поэтому в ней ничего не пропущено.',
            },
          ],
        },
        { kind: 'widget', widget: 'cookie-table' },
      ],
    },
    {
      id: 's3',
      heading: '3. Обязательные cookie',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Без них не работают вход, сохранение входа, защита форм и ваши сохранённые настройки. Для рекламы и аналитики они не используются, поэтому согласия на них мы не спрашиваем.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Аналитические cookie',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Мы используем Google Analytics 4. Он считает, какие страницы просматривают. Его cookie хранит случайный идентификатор вашего браузера, а мы видим только сводную статистику, а не то, кто вы. Эти цифры помогают нам понимать, какие книги читают и что улучшить.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Google обрабатывает эти данные по своим правилам: ' },
            {
              kind: 'external',
              text: 'как Google использует информацию сайтов, которые пользуются его сервисами',
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
              text: 'В странах Европейской экономической зоны, в Великобритании и в Швейцарии, а также если мы не можем определить вашу страну, Google Analytics загружается только после того, как вы нажмёте «Принять». В остальных странах аналитика включена по умолчанию, и её можно выключить ниже.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Ваш выбор',
      blocks: [
        { kind: 'widget', widget: 'consent-choice' },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cookie можно также удалить или запретить в настройках браузера. Если вы их удалите, сайт снова спросит ваш выбор там, где это требуется.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если ваш браузер передаёт сигнал Global Privacy Control, мы считаем его отказом: аналитика не загружается ни в одной стране, даже если раньше вы нажали «Принять».',
            },
          ],
        },
      ],
    },
    {
      id: 's6',
      heading: '6. Изменения политики',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Дата вверху страницы показывает, когда в последний раз менялся смысл этой политики. Если мы добавим новую аналитику или новые цели, мы снова спросим всех, кто принял аналитику. Отказ остаётся в силе.',
            },
          ],
        },
      ],
    },
    {
      id: 's7',
      heading: '7. Контакты',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Вопросы о cookie: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '. Как мы обращаемся с персональными данными, описано в ' },
            { kind: 'link', text: 'Политике конфиденциальности', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
