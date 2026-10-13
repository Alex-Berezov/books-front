import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'ru',
  metaTitle: 'Политика конфиденциальности - Bibliaris',
  metaDescription:
    'Ознакомьтесь с нашей политикой конфиденциальности, чтобы понять, как мы собираем, используем и защищаем ваши данные.',
  title: 'Политика конфиденциальности',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Информация, которую мы собираем',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Когда вы пользуетесь нашим сервисом, мы можем собирать персональные данные, такие как ваше имя, адрес электронной почты и изображение профиля, преимущественно при регистрации или входе через сторонние сервисы, такие как Google или Facebook.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Как мы используем вашу информацию',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Мы используем собираемую информацию, чтобы:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'Предоставлять, поддерживать и улучшать наши сервисы;' }],
            [{ kind: 'text', text: 'Персонализировать ваш опыт чтения и вашу книжную полку;' }],
            [
              {
                kind: 'text',
                text: 'Подтверждать вашу личность через электронную почту/пароль или OAuth-провайдеров;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Информировать вас об обновлениях, предупреждениях безопасности и уведомлениях, связанных с аккаунтом.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Передача данных',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Мы не продаем ваши персональные данные. Мы передаем данные только сторонним провайдерам аутентификации (Google, Facebook) для обеспечения безопасного входа.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Удаление и хранение данных',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Мы храним ваши данные до тех пор, пока ваш аккаунт активен. Вы можете в любой момент запросить удаление вашего аккаунта и всех связанных персональных данных, связавшись с нами по адресу ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: ' или следуя Инструкции по удалению данных.' },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Свяжитесь с нами',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Если у вас есть вопросы об этой Политике конфиденциальности, пожалуйста, свяжитесь с нами по адресу ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
