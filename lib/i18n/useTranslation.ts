import { usePathname } from 'next/navigation';
import { getDictionary } from './dictionaries';
import { getLangFromPath } from './lang';

export const useTranslation = () => {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname || '');
  const dict = getDictionary(lang);

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = dict;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (variables) {
      let str = value;
      Object.entries(variables).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
      return str;
    }

    return value;
  };

  return { t, lang, dict };
};
