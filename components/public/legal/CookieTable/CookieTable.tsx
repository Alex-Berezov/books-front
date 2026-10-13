import { COOKIE_INVENTORY } from '@/lib/consent/cookie-inventory';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { CookieTableProps } from './CookieTable.types';
import styles from './CookieTable.module.scss';

/**
 * Таблица cookie на `/cookies` (`product.md` §8 п.2). Строится только из `COOKIE_INVENTORY`:
 * руками строку сюда не дописать, а запись в хранилище мимо перечня ловит его тест-сторож.
 * Подписи ячеек дублируются в `data-label` - на узком экране строки становятся карточками.
 */
export const CookieTable = ({ lang }: CookieTableProps) => {
  const { cookies } = getDictionary(lang);
  const { table, inventory, duration, provider, category } = cookies;
  const label = (map: Record<string, string>, key: string) => map[key] ?? key;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{table.name}</th>
            <th scope="col">{table.provider}</th>
            <th scope="col">{table.purpose}</th>
            <th scope="col">{table.duration}</th>
            <th scope="col">{table.category}</th>
          </tr>
        </thead>
        <tbody>
          {COOKIE_INVENTORY.map((entry) => (
            <tr key={entry.name}>
              <td data-label={table.name}>
                <code className={styles.name}>{entry.name}</code>
              </td>
              <td data-label={table.provider}>{label(provider, entry.provider)}</td>
              <td data-label={table.purpose}>{label(inventory, entry.purposeKey)}</td>
              <td data-label={table.duration}>{label(duration, entry.durationKey)}</td>
              <td data-label={table.category}>{label(category, entry.category)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
