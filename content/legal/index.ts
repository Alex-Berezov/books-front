import { getDefaultLang, isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import type { LegalDocument, LegalPageId } from './types';
import { document as cookiesEn } from './cookies/en';
import { document as cookiesEs } from './cookies/es';
import { document as cookiesFr } from './cookies/fr';
import { document as cookiesPt } from './cookies/pt';
import { document as cookiesRu } from './cookies/ru';
import { document as privacyEn } from './privacy/en';
import { document as privacyEs } from './privacy/es';
import { document as privacyFr } from './privacy/fr';
import { document as privacyPt } from './privacy/pt';
import { document as privacyRu } from './privacy/ru';
import { document as termsEn } from './terms/en';
import { document as termsEs } from './terms/es';
import { document as termsFr } from './terms/fr';
import { document as termsPt } from './terms/pt';
import { document as termsRu } from './terms/ru';

const documents: Record<LegalPageId, Record<SupportedLang, LegalDocument>> = {
  privacy: { en: privacyEn, es: privacyEs, fr: privacyFr, pt: privacyPt, ru: privacyRu },
  terms: { en: termsEn, es: termsEs, fr: termsFr, pt: termsPt, ru: termsRu },
  cookies: { en: cookiesEn, es: cookiesEs, fr: cookiesFr, pt: cookiesPt, ru: cookiesRu },
};

// Незнакомый язык получает документ языка по умолчанию - так же, как словарь в `getDictionary`.
export const getLegalDocument = (page: LegalPageId, lang: string): LegalDocument =>
  documents[page][isSupportedLang(lang) ? lang : getDefaultLang()];
