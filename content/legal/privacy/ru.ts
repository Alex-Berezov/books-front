import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import {
  contactPrivacy,
  contactResponseDays,
  minimumAge,
  operatorCountry,
  operatorLegalNameRu,
  retentionAnalyticsMaxMonths,
  retentionBackupsMonths,
  retentionDeletionHours,
  retentionServerLogsDays,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'ru',
  metaTitle: 'Политика конфиденциальности - Bibliaris',
  metaDescription:
    'Кто ведёт Bibliaris, какие персональные данные собирает сайт, зачем, сколько их хранит, кому передаёт и как воспользоваться своими правами.',
  title: 'Политика конфиденциальности',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'who',
      heading: '1. Кто мы',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris ведёт ${operatorLegalNameRu}, ${operatorStatusText.ru[operatorStatus].inline} (${countryName(operatorCountry, 'ru')}). Именно он решает, зачем и как используются ваши персональные данные, то есть выступает контролёром данных.`,
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Вопросы о ваших данных: ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. Почтовый адрес и другие данные оператора — на странице ' },
            { kind: 'link', text: '«Сведения об операторе»', href: '/legal-notice' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'data',
      heading: '2. Какие данные мы собираем',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Ваш аккаунт, если вы его создали:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'адрес электронной почты, пароль (хранится только в виде необратимого хеша), имя и никнейм, ссылка на изображение профиля, язык интерфейса;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'если вы входите через Google: идентификатор вашего аккаунта Google, адрес почты, имя и изображение профиля в том виде, в каком их передаёт Google;',
              },
            ],
            [{ kind: 'text', text: 'дата регистрации и последнего входа.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Что вы делаете на сайте, когда вошли в аккаунт:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'книжная полка, прогресс чтения, оценки, лайки и просмотры книг, привязанные к вашему аккаунту;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'комментарии. Комментарий виден всем и показывается с вашим именем, никнеймом и изображением профиля.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Без аккаунта прогресс чтения хранится только в вашем браузере и к нам не попадает.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Технические данные: ваш IP-адрес обрабатывают наш хостинг-провайдер и Cloudflare, чтобы доставлять сайт и защищать его от злоупотреблений. Страна определяется по IP-адресу при каждом запросе и в аккаунте не сохраняется.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Аналитика: статистика посещений из Google Analytics — только там, где это разрешено (см. раздел 10).',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Письма: если вы нам пишете, в том числе как правообладатель, мы храним переписку и ваши контактные данные столько, сколько нужно, чтобы ответить и решить ваш вопрос.',
            },
          ],
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Зачем мы используем данные и на каком основании',
      blocks: [
        {
          kind: 'table',
          head: ['Цель', 'Правовое основание', 'Данные'],
          rows: [
            [
              [
                {
                  kind: 'text',
                  text: 'Ваш аккаунт и его возможности: вход, книжная полка, прогресс чтения, оценки, комментарии',
                },
              ],
              [{ kind: 'text', text: 'Исполнение договора' }],
              [{ kind: 'text', text: 'Данные аккаунта и ваши действия на сайте' }],
            ],
            [
              [{ kind: 'text', text: 'Безопасность и защита от злоупотреблений' }],
              [{ kind: 'text', text: 'Законный интерес' }],
              [{ kind: 'text', text: 'IP-адрес, серверные журналы, попытки входа' }],
            ],
            [
              [
                {
                  kind: 'text',
                  text: 'Определение вашей страны: книга может быть недоступна в некоторых странах',
                },
              ],
              [{ kind: 'text', text: 'Законный интерес' }],
              [{ kind: 'text', text: 'IP-адрес (страна не сохраняется)' }],
            ],
            [
              [{ kind: 'text', text: 'Статистика посещений (Google Analytics)' }],
              [
                {
                  kind: 'text',
                  text: 'Согласие — в ЕЭЗ, Великобритании и Швейцарии, а также если вашу страну определить не удалось; в остальных странах — законный интерес, и от аналитики можно отказаться',
                },
              ],
              [
                {
                  kind: 'text',
                  text: 'Аналитические cookie, просмотренные страницы, данные об устройстве и браузере',
                },
              ],
            ],
            [
              [{ kind: 'text', text: 'Ответы на ваши письма' }],
              [{ kind: 'text', text: 'Законный интерес' }],
              [{ kind: 'text', text: 'Адрес электронной почты и переписка' }],
            ],
          ],
        },
      ],
    },
    {
      id: 'recipients',
      heading: '4. Кому передаются данные',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Мы пользуемся услугами этих компаний и только для этих задач:' },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Namecheap, Inc. (США): хостинг серверов сайта и базы данных;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Cloudflare: доставка содержимого, защита, определение страны, хранение обложек и аудио;',
              },
            ],
            [{ kind: 'text', text: 'Google: Google Analytics и вход через Google.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Мы не продаём ваши персональные данные.' }],
        },
      ],
    },
    {
      id: 'transfers',
      heading: '5. Передача данных за пределы вашей страны',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Перечисленные компании находятся в США; Cloudflare к тому же работает через серверы по всему миру. Эта передача опирается на надлежащие гарантии, предусмотренные законом (статьи 45 и 46 GDPR); чтобы запросить их копию, напишите на ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'retention',
      heading: '6. Сколько мы храним данные',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Данные аккаунта и ваши действия на сайте: пока аккаунт не удалён. После запроса на удаление данные убираются из рабочей базы в течение ${retentionDeletionHours} часов; в резервных копиях они остаются до ${retentionBackupsMonths} месяцев, после чего копии перезаписываются.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Остаётся техническая запись о том, что аккаунт был удалён, — без вашего адреса почты и имени.',
              },
            ],
            [
              {
                kind: 'text',
                text: `Серверные журналы с IP-адресами: ${retentionServerLogsDays} дней.`,
              },
            ],
            [
              {
                kind: 'text',
                text: `Данные Google Analytics: не дольше ${retentionAnalyticsMaxMonths} месяцев.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Переписка: столько, сколько нужно, чтобы ответить и решить вопрос.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '7. Ваши права',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Вы вправе:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'узнать, какие ваши данные у нас есть, и получить их копию;' }],
            [{ kind: 'text', text: 'исправить неточные данные;' }],
            [
              { kind: 'text', text: 'потребовать удалить ваши данные (см. ' },
              { kind: 'link', text: 'страницу удаления данных', href: '/deletion' },
              { kind: 'text', text: ');' },
            ],
            [{ kind: 'text', text: 'ограничить использование ваших данных;' }],
            [{ kind: 'text', text: 'получить ваши данные в переносимом формате;' }],
            [
              {
                kind: 'text',
                text: 'возразить против использования данных на основании законного интереса;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'в любой момент отозвать согласие, например в настройках cookie;',
              },
            ],
            [{ kind: 'text', text: 'подать жалобу в орган по защите данных.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Чтобы воспользоваться этими правами, напишите на ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: `. Мы отвечаем в течение ${contactResponseDays} дней.` },
          ],
        },
      ],
    },
    {
      id: 'regions',
      heading: '8. По регионам',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'ЕЭЗ, Великобритания, Швейцария: права из раздела 7 даёт вам GDPR, UK GDPR или швейцарский федеральный закон о защите данных (FADP). Пожаловаться можно в орган по защите данных там, где вы живёте или работаете.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'США, Калифорния (CCPA/CPRA): мы собираем категории данных, перечисленные в разделе 2, — идентификаторы, данные аккаунта, действия на сайте и данные аналитики. Для подсчёта посещений мы используем Google Analytics. Мы не продаём персональную информацию. Мы учитываем сигнал Global Privacy Control: при нём аналитика не загружается. Вы вправе узнать, какие данные у нас есть, удалить и исправить их, и вас не будут ущемлять за то, что вы воспользовались этими правами.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Бразилия (LGPD): у вас есть права по статье 18, в том числе на подтверждение обработки, доступ, исправление, анонимизацию, блокирование или удаление, переносимость, сведения о том, кому передаются данные, и отзыв согласия. Запросы направляйте на адрес из раздела 7.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'children',
      heading: '9. Дети',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Чтобы создать аккаунт, вам должно быть не меньше ${minimumAge} лет. Мы сознательно не собираем данные детей младше этого возраста; если вы считаете, что такие данные у нас оказались, напишите на `,
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: ', и мы их удалим.' },
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookie',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Мы используем обязательные cookie для входа и, там где это разрешено, cookie Google Analytics. Какие именно cookie, на какой срок и как изменить свой выбор, описано в ',
            },
            { kind: 'link', text: 'Политике cookie', href: '/cookies' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Безопасность',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Сайт работает только по зашифрованному соединению (HTTPS). Пароли хранятся только в виде необратимого хеша. Доступ к инструментам администрирования есть только у сотрудников с соответствующими ролями.',
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '12. Изменения этой политики',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Когда мы меняем эту политику, мы публикуем новую версию на этой странице и обновляем дату вверху.',
            },
          ],
        },
      ],
    },
  ],
};
