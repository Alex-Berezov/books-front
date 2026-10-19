// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

// F03-4: экран читалки при 451 и экран закрытого анализа называют одну и ту же причину -
// нейтральное «ограничения прав», не намекающее, гео-блок это или претензия (ADR-012 п.8).
// Расходились ru/fr/pt («прав» против «авторского права»), en/es говорили «copyright»; точка в
// конце причины не даёт пройти «derechos de autor» как «derechos».
const REASON: Record<(typeof SUPPORTED_LANGS)[number], string> = {
  en: 'rights restrictions.',
  es: 'restricciones de derechos.',
  fr: 'restrictions de droits.',
  pt: 'restrições de direitos.',
  ru: 'ограничений прав.',
};

describe('rightsBlocked: одна причина на обоих экранах 451', () => {
  it.each(SUPPORTED_LANGS)('%s: причина и вторая фраза совпадают', (lang) => {
    const { message, analysisMessage } = getDictionary(lang).rightsBlocked;
    const tail = (text: string) => text.slice(text.indexOf(REASON[lang]));

    expect(message).toContain(REASON[lang]);
    expect(analysisMessage).toContain(REASON[lang]);
    expect(tail(analysisMessage)).toBe(tail(message));
  });
});
