import { createTranslator } from '@/lib/i18n/translate';
import { isSafeHref } from '@/lib/utils/safe-href';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorPhotoCredit } from '@/types/api-schema';

/**
 * Подпись портрета показывается только при самом портрете: без фото атрибуция ни к чему не
 * относится. Одно правило на шапку и «Источники».
 */
export function shownPhotoCredit(
  photoUrl: string | null | undefined,
  credit: PublicAuthorPhotoCredit | null | undefined
): PublicAuthorPhotoCredit | null {
  return photoUrl ? (credit ?? null) : null;
}

interface AuthorPhotoCreditProps {
  lang: SupportedLang;
  credit: PublicAuthorPhotoCredit;
}

/**
 * Атрибуция портрета «Фото: автор, лицензия, источник» — одна на шапку и «Источники»
 * (`product.md` F02, §4, §16). Обёртку (`figcaption`, пункт списка) задаёт вызывающий.
 * Ссылки — только `http(s)` (`LEGACY-447`), иначе лицензия текстом, источника нет.
 */
export function AuthorPhotoCredit({ lang, credit }: AuthorPhotoCreditProps) {
  const t = createTranslator(lang);
  const licenseHref = isSafeHref(credit.licenseUrl) ? credit.licenseUrl : null;
  const sourceHref = isSafeHref(credit.sourceUrl) ? credit.sourceUrl : null;

  return (
    <>
      {t('author.photoCredit')} {credit.author},{' '}
      {licenseHref ? (
        <a href={licenseHref} target="_blank" rel="noopener noreferrer">
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      {sourceHref && (
        <>
          ,{' '}
          <a href={sourceHref} target="_blank" rel="noopener noreferrer">
            {hostOf(sourceHref)}
          </a>
        </>
      )}
    </>
  );
}

function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}
