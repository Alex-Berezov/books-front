import type { SupportedLang } from './lang';

/**
 * Экран 451 раздела пересказа (F04-3, `product.md` §5а): заголовок и текст. Читает их только
 * middleware (`lib/claim-closures.ts`) - не в `locales/*.json`: словарь целиком уходит в клиентский
 * бандл. `server-only` здесь не ставится: модуль собирается в edge-middleware. Что его не импортирует
 * ни один клиентский файл и что ключей нет в словарях, стережёт `summarySectionClosedStrings.test.ts`.
 *
 * Намеренно без «в вашей стране / в вашем регионе»: блок бывает и по всему миру, поэтому
 * `rightsBlocked.title` («Недоступно в вашем регионе») этот экран не берёт.
 */

type SummarySectionClosedStrings = {
  summarySectionClosedTitle: string;
  summarySectionClosedMessage: string;
};

export const summarySectionClosedStrings: Record<SupportedLang, SummarySectionClosedStrings> = {
  en: {
    summarySectionClosedTitle: 'Section unavailable',
    summarySectionClosedMessage:
      'This section summary is unavailable because of rights restrictions. The book page stays open.',
  },
  es: {
    summarySectionClosedTitle: 'Sección no disponible',
    summarySectionClosedMessage:
      'El resumen de esta sección no está disponible debido a restricciones de derechos. La página del libro sigue abierta.',
  },
  fr: {
    summarySectionClosedTitle: 'Section indisponible',
    summarySectionClosedMessage:
      "Le résumé de cette section n'est pas disponible en raison de restrictions de droits. La page du livre reste accessible.",
  },
  pt: {
    summarySectionClosedTitle: 'Seção indisponível',
    summarySectionClosedMessage:
      'O resumo desta seção não está disponível devido a restrições de direitos. A página do livro continua aberta.',
  },
  ru: {
    summarySectionClosedTitle: 'Раздел недоступен',
    summarySectionClosedMessage:
      'Пересказ этого раздела недоступен из-за ограничений прав. Страница книги остаётся открытой.',
  },
};
