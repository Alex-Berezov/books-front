import { getDefaultLang, isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import type { LegalDocument, LegalPageId } from './types';
import { document as aboutEn } from './about/en';
import { document as aboutEs } from './about/es';
import { document as aboutFr } from './about/fr';
import { document as aboutPt } from './about/pt';
import { document as aboutRu } from './about/ru';
import { document as contactEn } from './contact/en';
import { document as contactEs } from './contact/es';
import { document as contactFr } from './contact/fr';
import { document as contactPt } from './contact/pt';
import { document as contactRu } from './contact/ru';
import { document as cookiesEn } from './cookies/en';
import { document as cookiesEs } from './cookies/es';
import { document as cookiesFr } from './cookies/fr';
import { document as cookiesPt } from './cookies/pt';
import { document as cookiesRu } from './cookies/ru';
import { document as editorialPolicyEn } from './editorial-policy/en';
import { document as editorialPolicyEs } from './editorial-policy/es';
import { document as editorialPolicyFr } from './editorial-policy/fr';
import { document as editorialPolicyPt } from './editorial-policy/pt';
import { document as editorialPolicyRu } from './editorial-policy/ru';
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
  about: { en: aboutEn, es: aboutEs, fr: aboutFr, pt: aboutPt, ru: aboutRu },
  contact: { en: contactEn, es: contactEs, fr: contactFr, pt: contactPt, ru: contactRu },
  'editorial-policy': {
    en: editorialPolicyEn,
    es: editorialPolicyEs,
    fr: editorialPolicyFr,
    pt: editorialPolicyPt,
    ru: editorialPolicyRu,
  },
  cookies: { en: cookiesEn, es: cookiesEs, fr: cookiesFr, pt: cookiesPt, ru: cookiesRu },
};

// Незнакомый язык получает документ языка по умолчанию - так же, как словарь в `getDictionary`.
export const getLegalDocument = (page: LegalPageId, lang: string): LegalDocument =>
  documents[page][isSupportedLang(lang) ? lang : getDefaultLang()];
