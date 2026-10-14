/** Название страны на языке страницы по коду ISO 3166-1; неизвестный код возвращается как есть. */
export const countryName = (code: string, lang: string): string =>
  new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
