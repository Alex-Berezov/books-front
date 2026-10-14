import 'server-only';
import {
  contactGeneral,
  contactResponseDays,
  operatorLegalNameRu,
  operatorPostalAddressRu,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'legal-notice',
  lang: 'ru',
  metaTitle: 'Сведения об операторе - Bibliaris',
  metaDescription:
    'Кто ведёт Bibliaris: оператор сайта, его почтовый адрес и адрес электронной почты для связи.',
  title: 'Сведения об операторе',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'operator',
      heading: 'Оператор сайта',
      blocks: [
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: `Имя: ${operatorLegalNameRu}` }],
            [{ kind: 'text', text: `Статус: ${operatorStatusText.ru[operatorStatus].label}` }],
            [{ kind: 'text', text: `Почтовый адрес: ${operatorPostalAddressRu}` }],
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Связь',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Электронная почта: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: `. Мы отвечаем в течение ${contactResponseDays} дней.` },
          ],
        },
      ],
    },
    {
      id: 'responsible',
      heading: 'Ответственный за содержание',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `${operatorLegalNameRu}, почтовый адрес указан выше.`,
            },
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
            { kind: 'text', text: 'Как мы обращаемся с персональными данными, описано в ' },
            { kind: 'link', text: 'Политике конфиденциальности', href: '/privacy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
