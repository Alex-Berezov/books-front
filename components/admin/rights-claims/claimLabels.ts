import type {
  RightsClaimAttachmentType,
  RightsClaimBlockScope,
  RightsClaimBlockStatus,
  RightsClaimChannel,
  RightsClaimEventType,
  RightsClaimResolution,
  RightsClaimSeverity,
  RightsClaimStatus,
  RightsClaimType,
  RightsClaimantType,
} from '@/types/api-schema/rights-claims';

export const CLAIM_TYPE_LABELS: Record<RightsClaimType, string> = {
  DMCA_TAKEDOWN: 'DMCA-требование об удалении',
  COPYRIGHT_INFRINGEMENT: 'Нарушение авторских прав',
  LICENSE_VIOLATION: 'Нарушение лицензии',
  ATTRIBUTION_MISSING: 'Отсутствует атрибуция',
  TERRITORY_VIOLATION: 'Нарушение территориальных ограничений',
  TRADEMARK: 'Товарный знак',
  PRIVACY_PERSONAL_DATA: 'Персональные данные',
  DEFAMATION: 'Диффамация',
  COUNTER_NOTICE: 'Встречное уведомление',
  OTHER: 'Другое',
};

export const CLAIM_STATUS_LABELS: Record<RightsClaimStatus, string> = {
  RECEIVED: 'Получена',
  UNDER_REVIEW: 'На рассмотрении',
  ACTION_REQUIRED: 'Требуется действие',
  AWAITING_CLAIMANT: 'Ждём заявителя',
  CONTENT_REMOVED: 'Контент удалён',
  CONTENT_RESTRICTED: 'Контент ограничен',
  COUNTER_NOTICE_FILED: 'Подано встречное уведомление',
  ESCALATED_TO_LAWYER: 'Передана юристу',
  RESOLVED_VALID: 'Закрыта: обоснована',
  RESOLVED_INVALID: 'Закрыта: необоснована',
  WITHDRAWN: 'Отозвана заявителем',
  CLOSED: 'Закрыта',
};

export const CLAIM_SEVERITY_LABELS: Record<RightsClaimSeverity, string> = {
  LOW: 'Низкая',
  MEDIUM: 'Средняя',
  HIGH: 'Высокая',
  CRITICAL: 'Критичная',
};

export const CLAIM_SEVERITY_COLORS: Record<RightsClaimSeverity, string> = {
  LOW: 'default',
  MEDIUM: 'blue',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export const CLAIM_CHANNEL_LABELS: Record<RightsClaimChannel, string> = {
  EMAIL: 'E-mail',
  WEB_FORM: 'Веб-форма',
  POSTAL: 'Почта',
  PHONE: 'Телефон',
  LEGAL_COUNSEL: 'Юридический представитель',
  PLATFORM_NOTICE: 'Уведомление платформы',
  OTHER: 'Другое',
};

export const CLAIMANT_TYPE_LABELS: Record<RightsClaimantType, string> = {
  RIGHTS_HOLDER: 'Правообладатель',
  AUTHOR: 'Автор',
  PUBLISHER: 'Издательство',
  AGENT: 'Агент',
  LAW_FIRM: 'Юридическая фирма',
  COLLECTING_SOCIETY: 'Общество по коллективному управлению',
  PLATFORM: 'Платформа',
  INDIVIDUAL: 'Частное лицо',
  UNKNOWN: 'Не определён',
};

export const CLAIM_RESOLUTION_LABELS: Record<RightsClaimResolution, string> = {
  VALID_CONTENT_REMOVED: 'Обоснована — контент удалён',
  VALID_LICENSE_OBTAINED: 'Обоснована — получена лицензия',
  VALID_GEO_RESTRICTED: 'Обоснована — введены гео-ограничения',
  VALID_ATTRIBUTION_ADDED: 'Обоснована — добавлена атрибуция',
  INVALID_REJECTED: 'Отклонена как необоснованная',
  WITHDRAWN_BY_CLAIMANT: 'Отозвана заявителем',
  COUNTER_NOTICE_UPHELD: 'Встречное уведомление удовлетворено',
  NO_ACTION_NEEDED: 'Действия не требуются',
  OTHER: 'Другое',
};

export const CLAIM_BLOCK_SCOPE_LABELS: Record<RightsClaimBlockScope, string> = {
  ENTIRE_BOOK: 'Вся книга',
  LANGUAGE_EDITION: 'Языковая версия',
  TEXT_READER: 'Читалка',
  DOWNLOADS: 'Скачивания',
  AUDIO: 'Аудио',
  SPECIFIC_ASSET: 'Отдельный файл',
};

export const CLAIM_BLOCK_STATUS_LABELS: Record<RightsClaimBlockStatus, string> = {
  ACTIVE: 'Действует',
  LIFTED: 'Снята',
  EXPIRED: 'Истекла',
};

export const CLAIM_BLOCK_STATUS_COLORS: Record<RightsClaimBlockStatus, string> = {
  ACTIVE: 'red',
  LIFTED: 'green',
  EXPIRED: 'default',
};

export const CLAIM_ATTACHMENT_TYPE_LABELS: Record<RightsClaimAttachmentType, string> = {
  CLAIM_NOTICE: 'Текст претензии',
  EVIDENCE: 'Доказательство',
  POWER_OF_ATTORNEY: 'Доверенность',
  LICENSE_DOCUMENT: 'Лицензионный документ',
  CORRESPONDENCE: 'Переписка',
  COUNTER_NOTICE: 'Встречное уведомление',
  RESPONSE_LETTER: 'Письмо-ответ',
  LEGAL_OPINION: 'Юридическое заключение',
  SCREENSHOT: 'Скриншот',
  OTHER: 'Другое',
};

export const CLAIM_EVENT_LABELS: Record<RightsClaimEventType, string> = {
  CREATED: 'Претензия зарегистрирована',
  UPDATED: 'Данные обновлены',
  STATUS_CHANGED: 'Изменён статус',
  ASSIGNED: 'Назначен ответственный',
  BLOCK_APPLIED: 'Применена блокировка доступа',
  BLOCK_LIFTED: 'Блокировка снята',
  BLOCK_EXPIRED: 'Блокировка истекла',
  RESPONSE_RECORDED: 'Зафиксирован ответ заявителю',
  COUNTER_NOTICE_RECORDED: 'Зафиксировано встречное уведомление',
  RESOLVED: 'Претензия резолвлена',
  REOPENED: 'Претензия переоткрыта',
  ESCALATED: 'Передана юристу',
  DEADLINE_CHANGED: 'Изменён дедлайн',
  COMPONENT_LINKED: 'Привязан компонент',
  COMPONENT_UNLINKED: 'Отвязан компонент',
  ATTACHMENT_ADDED: 'Добавлено вложение',
  ATTACHMENT_REMOVED: 'Удалено вложение',
  VERSION_UNPUBLISHED: 'Версия снята с публикации',
};

/** Rendering helper: ISO timestamp → `YYYY-MM-DD`, empty values → em dash. */
export const formatClaimDate = (value: string | null | undefined): string =>
  value ? new Date(value).toISOString().slice(0, 10) : '—';

export const formatClaimDateTime = (value: string | null | undefined): string =>
  value ? new Date(value).toISOString().slice(0, 16).replace('T', ' ') : '—';
