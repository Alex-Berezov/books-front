import type { SupportedLang } from './lang';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';

export const dictionaries = { en, es, fr, pt, ru };

export type Dictionary = typeof en;

export const getDictionary = (lang: SupportedLang): Dictionary => {
  return dictionaries[lang] || dictionaries.en;
};
