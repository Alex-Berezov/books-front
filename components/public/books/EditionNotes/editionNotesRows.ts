import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { VersionPreview } from '@/types/api-schema';

export type EditionNotesLabels = {
  firstPublished: string;
  originalLanguage: string;
  originalTitle: string;
  translator: string;
};

export type EditionNotesInput = {
  version: VersionPreview;
  firstPublishedYear?: number | null;
  shownTitle: string;
  lang: SupportedLang;
};

export type EditionNotesRow = { label: string; value: string };

// Админка принимает «язык оригинала» свободным текстом (`e.g. English`). Распознаются код ISO-639
// (двухбуквенный в любом регистре, трёхбуквенный - строчными, как пишут коды) и название языка
// на английском или на одном из языков сайта; нераспознанное значение строки не даёт: чужое слово
// на странице другого языка - брак (`product.md` §1, решение арбитра `F01 | F01-5`).
const ISO_639_1 = /^[a-z]{2}$/i;
const ISO_639_3 = /^[a-z]{3}$/;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
// Трёхбуквенные коды языков, на которых написана классика и у которых нет двухбуквенного.
const HISTORIC_CODES = [
  'ang',
  'chu',
  'enm',
  'fro',
  'frm',
  'gmh',
  'goh',
  'got',
  'grc',
  'non',
  'sga',
];
const NAME_LANGS = ['en', ...SUPPORTED_LANGS];

const displayNames = (lang: string) =>
  new Intl.DisplayNames([lang], { type: 'language', fallback: 'none' });

let nameToCode: Map<string, string> | null = null;

// Обратная карта «название -> код» по всем двухбуквенным кодам и историческим трёхбуквенным.
const getNameToCode = (): Map<string, string> => {
  if (nameToCode) return nameToCode;
  const codes = [...HISTORIC_CODES];
  for (const first of LETTERS) for (const second of LETTERS) codes.push(first + second);
  const map = new Map<string, string>();
  for (const lang of NAME_LANGS) {
    const names = displayNames(lang);
    for (const code of codes) {
      const name = names.of(code);
      if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), code);
    }
  }
  nameToCode = map;
  return map;
};

const languageCodeOf = (value: string): string | null => {
  const trimmed = value.trim();
  if (ISO_639_1.test(trimmed) || ISO_639_3.test(trimmed)) {
    const code = trimmed.toLowerCase();
    return displayNames('en').of(code) ? code : null;
  }
  return getNameToCode().get(trimmed.toLowerCase()) ?? null;
};

/** Название языка на языке страницы или `null`, если значение не распознано. */
export const originalLanguageName = (value: string, lang: SupportedLang): string | null => {
  const code = languageCodeOf(value);
  if (!code) return null;
  return displayNames(lang).of(code) ?? null;
};

/**
 * Строки блока «Об издании» (`product.md` §6.2). Строка есть, только если значение есть: пустой
 * строки, прочерка и «неизвестно» нет. Постоянная строка про общественное достояние сюда не входит.
 */
export const buildEditionNotesRows = (
  { version, firstPublishedYear, shownTitle, lang }: EditionNotesInput,
  labels: EditionNotesLabels
): EditionNotesRow[] => {
  const rows: EditionNotesRow[] = [];

  if (firstPublishedYear) {
    rows.push({ label: labels.firstPublished, value: String(firstPublishedYear) });
  }

  const originalLanguage = version.originalLanguage?.trim();
  const originalLanguageLabel = originalLanguage
    ? originalLanguageName(originalLanguage, lang)
    : null;
  if (originalLanguageLabel) {
    rows.push({ label: labels.originalLanguage, value: originalLanguageLabel });
  }

  const originalTitle = version.originalTitle?.trim();
  if (originalTitle && originalTitle !== shownTitle.trim()) {
    rows.push({ label: labels.originalTitle, value: originalTitle });
  }

  const translators = (version.translators ?? []).map((t) => t.name.trim()).filter(Boolean);
  if (translators.length > 0) {
    rows.push({ label: labels.translator, value: translators.join(', ') });
  }

  return rows;
};
