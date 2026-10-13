import 'server-only';
import { contactGeneral, contactPrivacy, contactRights } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'contact',
  lang: 'ru',
  metaTitle: 'Контакты - Bibliaris',
  metaDescription:
    'Как связаться с Bibliaris: общие вопросы и поддержка, ошибка в тексте или пересказе, обращение правообладателя и запросы по персональным данным.',
  title: 'Контакты',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'general',
      heading: 'Общие вопросы и поддержка',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Вопросы, ошибки на сайте и предложения: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Ошибка в тексте или пересказе',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если вы нашли ошибку в тексте книги или в пересказе, напишите на ',
            },
            {
              kind: 'mailto',
              text: contactGeneral,
              email: contactGeneral,
              subject: 'Ошибка в тексте книги или пересказе',
            },
            { kind: 'text', text: '. Как мы исправляем ошибки, описано в ' },
            { kind: 'link', text: 'Редакционной политике', href: '/editorial-policy#corrections' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'Правообладателям',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если вы обладаете правами на произведение и считаете, что материал на сайте их затрагивает, напишите на ',
            },
            { kind: 'mailto', text: contactRights, email: contactRights },
            { kind: 'text', text: '. В письме укажите:' },
          ],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'произведение, о котором идёт речь;' }],
            [{ kind: 'text', text: 'ссылку на страницу сайта, где оно размещено;' }],
            [{ kind: 'text', text: 'подтверждение ваших прав;' }],
            [{ kind: 'text', text: 'ваши контактные данные.' }],
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Персональные данные',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Запросы по вашим персональным данным (доступ, исправление, удаление): ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. Прочитайте ' },
            { kind: 'link', text: 'Политику конфиденциальности', href: '/privacy' },
            { kind: 'text', text: ' и страницу ' },
            { kind: 'link', text: 'удаления данных', href: '/deletion' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
