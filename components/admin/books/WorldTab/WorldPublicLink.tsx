import type { FC } from 'react';
import type { BookWorldEntitySummary } from '@/types/api-schema';
import { worldPublicPath } from './worldErrors';
import styles from './WorldTab.module.scss';

interface WorldPublicLinkProps {
  version: Parameters<typeof worldPublicPath>[0];
  entity: BookWorldEntitySummary;
}

/** Link to the public page of a listed entity of a published version; nothing otherwise. */
export const WorldPublicLink: FC<WorldPublicLinkProps> = ({ version, entity }) => {
  const href = worldPublicPath(version, entity);
  if (!href) return null;
  return (
    <a
      className={styles.publicLink}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Public page: ${entity.key}`}
    >
      Public page
    </a>
  );
};
