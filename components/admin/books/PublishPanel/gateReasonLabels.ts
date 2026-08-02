import { LAWYER_GATE_CODE_LABELS } from '@/components/admin/rights-lawyer/lawyerLabels';

/**
 * Подписи кодов гейта публикации.
 *
 * WP-A.5: незнакомый код выводился сырым идентификатором, и редактор видел
 * `RIGHTS_PROFILE_SNAPSHOT_OUTDATED` вместо причины. Бэкенд расширяет набор кодов аддитивно
 * (ADR-008), поэтому список здесь заведомо неполон — на этот случай есть общая подпись, а
 * `messageRu` от гейта показывается всегда.
 */
export const GATE_REASON_LABELS: Record<string, string> = {
  ...LAWYER_GATE_CODE_LABELS,

  MISSING_RIGHTS_PROFILE: 'Нет профиля прав',
  MISSING_APPROVED_RIGHTS_REVIEW: 'Нет утверждённой проверки прав',
  APPROVED_REVIEW_NOT_FOUND: 'Утверждённая проверка не найдена',
  RIGHTS_REVIEW_NOT_APPROVED: 'Проверка прав не утверждена',
  RIGHTS_REVIEW_STALE: 'Проверка прав устарела',
  RIGHTS_REVIEW_SUPERSEDED: 'Проверка прав заменена новой',
  RIGHTS_REVIEW_REJECTED: 'Проверка прав отклонена',
  RIGHTS_REVIEW_SNAPSHOT_OUTDATED: 'Версия ссылается на устаревшую проверку',
  RIGHTS_PROFILE_NOT_FOUND: 'Профиль прав не найден',
  RIGHTS_PROFILE_NOT_APPROVED: 'Профиль прав не утверждён',
  RIGHTS_PROFILE_STALE: 'Профиль прав устарел',
  RIGHTS_PROFILE_SUPERSEDED: 'Профиль прав заменён',
  RIGHTS_PROFILE_REJECTED: 'Профиль прав отклонён',
  RIGHTS_PROFILE_ARCHIVED: 'Профиль прав архивирован',
  RIGHTS_PROFILE_NOT_CURRENT: 'Профиль прав не является текущим',
  RIGHTS_PROFILE_SNAPSHOT_OUTDATED: 'Версия ссылается на устаревший профиль',
  PUBLICATION_GATE_BLOCK: 'Публикация запрещена по результатам проверки',
  UNRESOLVED_BLOCKING_RIGHTS_ACTION: 'Незакрытое блокирующее действие',
  PENDING_TERRITORIES: 'Территории без решения',
  PENDING_TERRITORIES_OUTSIDE_TARGET_MARKETS: 'Территории без решения вне целевых рынков',
  MISSING_LANGUAGE_RIGHTS_ASSESSMENT: 'Язык версии не покрыт правовой оценкой',
  BLOCKED_COUNTRIES_REQUIRE_GEO_BLOCK: 'Закрытые страны требуют настройки geo-block',
  BLOCKED_COUNTRIES_WITH_GEO_BLOCK: 'Есть закрытые страны, geo-block настроен',
  GEO_BLOCK_NOT_CONFIGURED: 'Geo-block не настроен',
  GEO_BLOCK_RULES_MISSING: 'Не созданы правила geo-block',
  GEO_BLOCK_RULES_NOT_VERIFIED: 'Правила geo-block не проверены',
  GEO_BLOCK_SCOPE_INSUFFICIENT: 'Правило geo-block закрывает не весь контент',
  GEO_BLOCK_VERIFICATION_MISSING: 'Нет подтверждения проверки geo-block',
  GEO_BLOCK_REQUIRED_WITHOUT_RESTRICTED_COUNTRIES: 'Geo-block отмечен, но закрытых стран нет',
  MISSING_RIGHTS_CONTENT_HASH: 'Нет baseline content hash',
  RIGHTS_RECHECK_REQUIRED: 'Требуется повторная проверка прав',
  RIGHTS_CONTENT_HASH_CHANGED: 'Содержимое изменилось после утверждения',
  RIGHTS_CONTENT_HASH_CHECK_FAILED: 'Не удалось вычислить content hash',
  LICENSE_MISSING_FOR_COUNTRY: 'Для страны нет лицензии',
  LICENSE_EXPIRED: 'Срок лицензии истёк',
  LICENSE_EXPIRING_SOON: 'Срок лицензии скоро истекает',
  LICENSE_REVOKED: 'Лицензия отозвана',
  LICENSE_NOT_YET_EFFECTIVE: 'Лицензия ещё не вступила в силу',
  LICENSE_STATUS_NOT_ACTIVE: 'Лицензия не активна',
  LICENSE_ATTRIBUTION_REQUIRED: 'Требуется указание правообладателя',
  LICENSE_SCOPE_LANGUAGE_MISMATCH: 'Лицензия не покрывает язык версии',
  LICENSE_SCOPE_MEDIA_MISMATCH: 'Лицензия не покрывает формат версии',
  LICENSE_TRANSLATION_NOT_ALLOWED: 'Лицензия не разрешает перевод',
  LICENSE_SUBLICENSING_NOT_ALLOWED: 'Лицензия не разрешает сублицензирование',
  LICENSE_TERRITORY_SCOPE_UNKNOWN: 'Неизвестная территориальная область лицензии',
  ACTIVE_RIGHTS_CLAIM: 'Активная претензия правообладателя',
  CRITICAL_RIGHTS_CLAIM_UNRESOLVED: 'Нерешённая критичная претензия',
  RIGHTS_CLAIM_DEADLINE_OVERDUE: 'Просрочен срок ответа по претензии',
  RIGHTS_CLAIM_DEADLINE_SOON: 'Срок ответа по претензии истекает',
  RIGHTS_CLAIM_OPEN_NON_BLOCKING: 'Открытая непретензионная блокировка',
  RIGHTS_CLAIM_ACCESS_BLOCK_ACTIVE: 'Действует блокировка доступа по претензии',
  RIGHTS_CLAIM_PARTIAL_GEO_BLOCK_ACTIVE: 'Действует частичная geo-блокировка по претензии',
  RIGHTS_CLAIM_COUNTER_NOTICE_PENDING: 'Ожидается встречное уведомление',
  RIGHTS_CLAIM_REQUIRES_LAWYER_REVIEW: 'Претензия требует юридической проверки',
  RIGHTS_CLAIM_RECENTLY_RESOLVED: 'Претензия недавно закрыта',
  RIGHTS_RECHECK_OVERDUE: 'Перепроверка прав просрочена',
  RIGHTS_RECHECK_DUE_SOON: 'Срок перепроверки прав приближается',
  RIGHTS_RECHECK_TASK_OPEN: 'Открыта задача перепроверки прав',
};

/** Подпись для кода, которого фронт ещё не знает: идентификатор редактору ничего не говорит. */
export const UNKNOWN_GATE_REASON_LABEL = 'Другое требование гейта прав';

export const gateReasonLabel = (code: string): string =>
  GATE_REASON_LABELS[code] ?? UNKNOWN_GATE_REASON_LABEL;
