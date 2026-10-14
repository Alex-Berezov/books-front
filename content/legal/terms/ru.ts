import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import {
  contactGeneral,
  governingLawCountry,
  minimumAge,
  operatorCountry,
  operatorLegalNameRu,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'ru',
  metaTitle: 'Условия использования - Bibliaris',
  metaDescription:
    'Правила пользования Bibliaris: аккаунт, что можно и что нельзя, кому принадлежат материалы, комментарии, правообладатели и применимое право.',
  title: 'Условия использования',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'operator',
      heading: '1. Кто предоставляет сервис',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Сервис Bibliaris предоставляет ${operatorLegalNameRu}, ${operatorStatusText.ru[operatorStatus].inline} (${countryName(operatorCountry, 'ru')}). Пользуясь сайтом, вы принимаете эти условия. Если вы с ними не согласны, пожалуйста, не пользуйтесь сайтом.`,
            },
          ],
        },
      ],
    },
    {
      id: 'service',
      heading: '2. Сервис',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris — онлайн-библиотека, где можно читать книги и их пересказы и слушать аудиокниги. Сервис бесплатный. Мы можем в любой момент добавлять, менять или убирать возможности сайта.',
            },
          ],
        },
      ],
    },
    {
      id: 'account',
      heading: '3. Ваш аккаунт',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Чтобы создать аккаунт, вам должно быть не меньше ${minimumAge} лет.`,
              },
            ],
            [{ kind: 'text', text: 'При регистрации указывайте достоверные данные.' }],
            [
              {
                kind: 'text',
                text: 'Не сообщайте никому свой пароль: вы отвечаете за всё, что происходит в вашем аккаунте.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Вы можете в любой момент попросить нас удалить аккаунт — см. ',
              },
              { kind: 'link', text: 'страницу удаления данных', href: '/deletion' },
              { kind: 'text', text: '.' },
            ],
          ],
        },
      ],
    },
    {
      id: 'use',
      heading: '4. Что можно и что нельзя',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Сайтом можно пользоваться для личного некоммерческого чтения и прослушивания. Нельзя:',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'массово скачивать материалы, парсить сайт или автоматически собирать его содержимое;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'обходить ограничения доступа, в том числе ограничения по странам;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'мешать работе сайта, атаковать его или загружать вредоносный код;',
              },
            ],
            [{ kind: 'text', text: 'публиковать комментарии, нарушающие закон.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Аккаунт, нарушающий эти правила, мы можем ограничить или закрыть.',
            },
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: '5. Материалы сайта',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Тексты книг основаны на изданиях, находящихся в общественном достоянии. Пересказы, описания и оформление сайта принадлежат Bibliaris. Их можно цитировать со ссылкой на исходную страницу; перепродавать их нельзя.',
            },
          ],
        },
      ],
    },
    {
      id: 'comments',
      heading: '6. Комментарии',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'За то, что вы пишете, отвечаете вы. Комментарии, нарушающие эти условия, мы можем скрыть или удалить.',
            },
          ],
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Доступность в разных странах',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Книга может быть недоступна в некоторых странах.' }],
        },
      ],
    },
    {
      id: 'rights-holders',
      heading: '8. Правообладателям',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если вы обладаете правами на произведение и считаете, что материал на сайте их затрагивает, напишите нам так, как описано на странице ',
            },
            { kind: 'link', text: 'Контакты', href: '/contact' },
            {
              kind: 'text',
              text: ', в блоке для правообладателей. Укажите произведение, о котором идёт речь, ссылку на страницу, где оно размещено, подтверждение ваших прав и ваши контактные данные.',
            },
          ],
        },
      ],
    },
    {
      id: 'liability',
      heading: '9. Отказ от гарантий и ограничение ответственности',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Сайт предоставляется «как есть», без каких-либо гарантий. В той мере, в какой это допускает право вашей страны, мы не отвечаем за косвенные убытки от пользования сайтом. Ничто в этих условиях не ограничивает права, ограничивать которые право вашей страны не позволяет.',
            },
          ],
        },
      ],
    },
    {
      id: 'law',
      heading: '10. Применимое право',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Применимое право: ${countryName(governingLawCountry, 'ru')}. Если вы потребитель в Европейском союзе или Великобритании, за вами сохраняется защита, которую даёт право вашей страны.`,
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Изменения этих условий',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Когда мы меняем эти условия, мы публикуем новую версию на этой странице и обновляем дату вверху. Если после этого вы продолжаете пользоваться сайтом, вы принимаете новую версию.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Контакты',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Вопросы об этих условиях: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
