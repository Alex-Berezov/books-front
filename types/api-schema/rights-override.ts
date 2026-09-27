/**
 * Решение администратора «Разрешить публикацию» (последняя инстанция, решение владельца
 * от 27.09.2026). Ставится на книгу целиком: снимает правовые блокеры гейта публикации для
 * всех её версий. `VERSION_CONTENT_INCOMPLETE` не снимается никогда, претензия правообладателя,
 * поданная после решения, по-прежнему блокирует.
 */
export interface RightsPublicationOverride {
  id: string;
  /** `null`, если книга удалена: запись решения остаётся в журнале. */
  bookId: string | null;
  /** Слаг книги на момент решения — запись узнаваема и после удаления книги. */
  bookSlug: string;
  reasonRu: string;
  grantedAt: string;
  grantedByUserId: string | null;
  grantedByEmail: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revokedByEmail: string | null;
  revokeReasonRu: string | null;
}

/** Ответ `GET /admin/books/:bookId/rights-override`: история — от новых к старым, с активным. */
export interface RightsPublicationOverrideState {
  active: RightsPublicationOverride | null;
  history: RightsPublicationOverride[];
}

/** Тело `POST /admin/books/:bookId/rights-override`; причина после trim — от 10 до 2000 знаков. */
export interface GrantRightsOverrideRequest {
  reasonRu: string;
}

/** Тело `POST /admin/books/:bookId/rights-override/revoke`. */
export interface RevokeRightsOverrideRequest {
  reasonRu?: string;
}
