// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

// F03-4: экран читалки при 451 называет нейтральную причину - «ограничения прав», не намекающую,
// гео-блок это или претензия (ADR-012 п.8). Расходились ru/fr/pt («прав» против «авторского
// права»), en/es говорили «copyright»; точка в конце причины не даёт пройти «derechos de autor»
// как «derechos». Экран закрытого анализа снят с `T163`: претензия анализ не закрывает.
const REASON: Record<(typeof SUPPORTED_LANGS)[number], string> = {
  en: 'rights restrictions.',
  es: 'restricciones de derechos.',
  fr: 'restrictions de droits.',
  pt: 'restrições de direitos.',
  ru: 'ограничений прав.',
};

describe('rightsBlocked: нейтральная причина экрана 451', () => {
  it.each(SUPPORTED_LANGS)('%s: причина - ограничения прав', (lang) => {
    const { message } = getDictionary(lang).rightsBlocked;
    expect(message).toContain(REASON[lang]);
  });
});
