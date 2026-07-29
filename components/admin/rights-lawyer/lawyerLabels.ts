import type {
  RightsLawyerConditionStatus,
  RightsLawyerDecision,
  RightsLawyerReviewEventType,
  RightsLawyerReviewStatus,
  RightsLawyerReviewTrigger,
  RightsLawyerType,
  RightsLegalOpinionKind,
  RightsRiskFactorCode,
  RightsRiskLevel,
} from '@/types/api-schema/rights-lawyer';

/** AntD `Tag` colours. Kept as literals so a wrong colour name fails to type-check. */
export type BadgeColor = 'default' | 'blue' | 'green' | 'gold' | 'orange' | 'red' | 'purple';

export const RISK_LEVEL_LABELS: Record<RightsRiskLevel, string> = {
  LOW: 'Низкий риск',
  MEDIUM: 'Средний риск',
  HIGH: 'Высокий риск',
  CRITICAL: 'Критический риск',
};

export const RISK_LEVEL_COLORS: Record<RightsRiskLevel, BadgeColor> = {
  LOW: 'default',
  MEDIUM: 'gold',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export const LAWYER_REVIEW_STATUS_LABELS: Record<RightsLawyerReviewStatus, string> = {
  PENDING: 'Ожидает юриста',
  IN_PROGRESS: 'В работе',
  APPROVED: 'Согласовано',
  APPROVED_WITH_CONDITIONS: 'Согласовано с условиями',
  REJECTED: 'Отказано',
  WITHDRAWN: 'Отозвано',
  EXPIRED: 'Срок заключения истёк',
};

export const LAWYER_REVIEW_STATUS_COLORS: Record<RightsLawyerReviewStatus, BadgeColor> = {
  PENDING: 'gold',
  IN_PROGRESS: 'blue',
  APPROVED: 'green',
  APPROVED_WITH_CONDITIONS: 'orange',
  REJECTED: 'red',
  WITHDRAWN: 'default',
  EXPIRED: 'red',
};

export const LAWYER_DECISION_LABELS: Record<RightsLawyerDecision, string> = {
  APPROVED: 'Согласовано',
  APPROVED_WITH_CONDITIONS: 'Согласовано с условиями',
  REJECTED: 'Отказано',
};

export const LAWYER_REVIEW_TRIGGER_LABELS: Record<RightsLawyerReviewTrigger, string> = {
  AGENT_REQUESTED: 'Требование агента',
  HIGH_RISK_POLICY: 'Политика высокого риска',
  MANUAL_REQUEST: 'Ручной запрос редактора',
  RIGHTS_CLAIM: 'Претензия правообладателя',
  LEGAL_CHANGE: 'Изменение законодательства',
  LICENSE_REQUIRED: 'Требуется лицензия',
  OTHER: 'Другое',
};

export const LAWYER_TYPE_LABELS: Record<RightsLawyerType, string> = {
  IN_HOUSE: 'Штатный юрист',
  EXTERNAL_COUNSEL: 'Внешний консультант',
  LAW_FIRM: 'Юридическая фирма',
  OTHER: 'Другое',
};

export const LEGAL_OPINION_KIND_LABELS: Record<RightsLegalOpinionKind, string> = {
  EXTERNAL_COUNSEL_MEMO: 'Меморандум внешнего консультанта',
  IN_HOUSE_MEMO: 'Меморандум штатного юриста',
  EMAIL_CONFIRMATION: 'Подтверждение по электронной почте',
  COURT_FILING: 'Судебный документ',
  REGULATOR_RESPONSE: 'Ответ регулятора',
  OTHER: 'Другое',
};

export const LAWYER_CONDITION_STATUS_LABELS: Record<RightsLawyerConditionStatus, string> = {
  PENDING: 'Не выполнено',
  SATISFIED: 'Выполнено',
  WAIVED: 'Отменено',
};

export const LAWYER_CONDITION_STATUS_COLORS: Record<RightsLawyerConditionStatus, BadgeColor> = {
  PENDING: 'orange',
  SATISFIED: 'green',
  WAIVED: 'default',
};

export const LAWYER_EVENT_TYPE_LABELS: Record<RightsLawyerReviewEventType, string> = {
  REQUESTED: 'Проверка запрошена',
  ASSIGNED: 'Назначен юрист',
  UNASSIGNED: 'Юрист снят с проверки',
  STARTED: 'Взято в работу',
  OPINION_ATTACHED: 'Прикреплено заключение',
  OPINION_ARCHIVED: 'Заключение архивировано',
  CONDITION_ADDED: 'Добавлено условие',
  CONDITION_SATISFIED: 'Условие выполнено',
  CONDITION_WAIVED: 'Условие отменено',
  DECIDED: 'Вынесено решение',
  WITHDRAWN: 'Проверка отозвана',
  REOPENED: 'Проверка переоткрыта',
  EXPIRED: 'Срок заключения истёк',
  DUE_DATE_CHANGED: 'Изменён срок',
  NOTE_ADDED: 'Комментарий',
};

export const RISK_FACTOR_LABELS: Record<RightsRiskFactorCode, string> = {
  PUBLICATION_GATE_BLOCK: 'Публикационный шлюз — BLOCK',
  OVERALL_STATUS_REJECTED: 'Итоговый статус — REJECTED',
  CLAIM_ESCALATED_TO_LAWYER: 'Претензия передана юристу',
  CRITICAL_CLAIM_OPEN: 'Открыта критичная претензия',
  AGENT_REQUESTED_LAWYER_REVIEW: 'Агент требует юридической проверки',
  CONFIDENCE_LOW: 'Низкая уверенность проверки',
  OVERALL_STATUS_INSUFFICIENT_DATA: 'Недостаточно данных',
  OVERALL_STATUS_LICENSE_REQUIRED: 'Требуется лицензия',
  UNCERTAIN_COMPONENT: 'Спорный компонент сохраняется',
  COPYRIGHTED_COMPONENT_KEPT: 'Защищённый компонент сохраняется',
  LICENSE_REQUIRED_TERRITORY: 'Страна требует лицензии',
  UNRESOLVED_BLOCKING_ACTION: 'Незакрытое блокирующее действие',
  PENDING_REVIEW_TERRITORY: 'Страна не проверена',
  CONFIDENCE_MEDIUM: 'Средняя уверенность проверки',
  DERIVATIVE_SOURCE_TEXT: 'Производное произведение',
  CONTRIBUTOR_DEATH_YEAR_UNKNOWN: 'Неизвестен год смерти участника',
  BLOCKED_TERRITORY: 'Есть заблокированная страна',
};

/** Publication-gate codes contributed by Phase 19. */
export const LAWYER_GATE_CODE_LABELS: Record<string, string> = {
  LAWYER_REVIEW_REQUIRED_NOT_APPROVED: 'Требуется положительное заключение юриста',
  LAWYER_REVIEW_PENDING: 'Юридическая проверка не завершена',
  LAWYER_REVIEW_REJECTED: 'Юрист отказал',
  LAWYER_OPINION_EXPIRED: 'Срок действия заключения истёк',
  LAWYER_CONDITIONS_UNMET: 'Не выполнены условия юриста',
  LAWYER_REVIEW_OPEN_NON_BLOCKING: 'Открыта информационная юридическая проверка',
  LAWYER_OPINION_EXPIRING_SOON: 'Заключение юриста скоро истекает',
  LAWYER_APPROVED_WITH_CONDITIONS: 'Согласовано с условиями',
  HIGH_RISK_WITHOUT_LAWYER_REVIEW: 'Высокий риск без юридической проверки',
  LAWYER_REVIEW_OVERDUE: 'Юридическая проверка просрочена',
};

/** Unknown codes render as they are — a new backend code must never blank the UI. */
export const lawyerGateCodeLabel = (code: string): string => LAWYER_GATE_CODE_LABELS[code] ?? code;
