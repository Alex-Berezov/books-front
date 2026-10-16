import Link from 'next/link';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorInfluenceRef, PublicAuthorInfluences } from '@/types/api-schema';
import styles from './AuthorInfluences.module.scss';

interface AuthorInfluencesProps {
  lang: SupportedLang;
  influences: PublicAuthorInfluences | null | undefined;
}

const named = (list: PublicAuthorInfluenceRef[] | undefined) =>
  (list ?? []).filter((ref) => ref.name.trim() !== '');

/**
 * Влияния (`product.md` F02, §11): две колонки — «кто повлиял на автора» и «на кого повлиял».
 * Автор сайта — ссылкой на языке страницы, иначе имя текстом. Пустая колонка не выводится,
 * обе пустые — блока нет. Подписи колонок без имени и без рода (решение арбитра 16.10.2026,
 * `F02 | F02-4`, Р6).
 */
export function AuthorInfluences({ lang, influences }: AuthorInfluencesProps) {
  const columns = [
    { key: 'by', label: 'author.influencedBy', refs: named(influences?.influencedBy) },
    { key: 'on', label: 'author.influenced', refs: named(influences?.influenced) },
  ].filter((column) => column.refs.length > 0);
  if (columns.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-influences-title">
      <h2 id="author-influences-title" className={styles.title}>
        {t('author.influences')}
      </h2>
      <div className={styles.columns}>
        {columns.map((column) => (
          <div key={column.key} className={styles.column}>
            <h3 className={styles.columnTitle}>{t(column.label)}</h3>
            <ul className={styles.list}>
              {column.refs.map((ref, index) => (
                <li key={`${ref.name}-${index}`}>
                  {ref.author ? (
                    <Link href={`/${lang}/author/${ref.author.slug}`}>{ref.author.name}</Link>
                  ) : (
                    ref.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
