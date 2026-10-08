import type { FC, ReactNode } from 'react';
import { isSafeHref } from '@/lib/utils/safe-href';

/** Приписка к значению, которое ссылкой не рендерится. */
export const UNSAFE_LINK_NOTE = '(ссылка не http(s), не открывается)';

interface DataLinkProps {
  /** Адрес из данных API. */
  url: string | null | undefined;
  /** Подпись ссылки; по умолчанию — сам адрес. */
  children?: ReactNode;
  className?: string;
}

/**
 * Ссылка из данных API в админке (`LEGACY-447`): `http(s)` — внешняя ссылка в новой вкладке,
 * иная схема (`javascript:`, адрес без схемы, записанный до `T118`) — текст с припиской,
 * чтобы юрист видел, что значение есть, но негодно. Пустое значение не рендерится.
 */
export const DataLink: FC<DataLinkProps> = ({ url, children, className }) => {
  if (!url) return null;
  if (!isSafeHref(url)) return <span className={className}>{`${url} ${UNSAFE_LINK_NOTE}`}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children ?? url}
    </a>
  );
};
