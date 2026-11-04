import type { TabType } from './BookVersionTabs.types';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Параметр адреса страницы версии, открывающий вкладку сразу (F06-5b: «Open the Summary tab»
 * из запуска перевода). Собирает адрес `versionTabHref`, разбирает `useBookVersionLogic`.
 */
export const VERSION_TAB_PARAM = 'tab';

/** Вкладки, которые открываются по адресу; прочие значения параметра — Overview. */
export const LINKABLE_VERSION_TABS: readonly TabType[] = ['summary'];

export const versionTabHref = (lang: SupportedLang, versionId: string, tab: TabType): string =>
  `/admin/${lang}/books/versions/${versionId}?${VERSION_TAB_PARAM}=${tab}`;
