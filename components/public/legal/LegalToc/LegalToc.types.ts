import type { LegalSection } from '@/content/legal/types';
import type { SupportedLang } from '@/lib/i18n/lang';

export type LegalTocProps = {
  lang: SupportedLang;
  sections: LegalSection[];
};
