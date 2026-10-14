import 'server-only';

// Единственное место в коде с фактами владельца. Значения переносятся руками
// из документации фичи F01 и сверяются в ревью; кода-ссылки на документацию нет.
// Только сервер: здесь домашний адрес оператора. Контакты - в `owner-contacts.ts` (их берёт и клиент).
export {
  contactGeneral,
  contactPrivacy,
  contactResponseDays,
  contactRights,
} from './owner-contacts';

// Оператор - физлицо (D5). Представителей в ЕС и UK нет: констант нет, и фразы о них в текстах нет.
export type OperatorStatus = 'individual' | 'sole-proprietor';
/** Статус оператора (`operator.status`); слово на языке страницы - `content/legal/operator-status.ts`. */
export const operatorStatus: OperatorStatus = 'individual';
export const operatorLegalName = 'Berezov Aleksei Vladimirovich';
export const operatorLegalNameRu = 'Березов Алексей Владимирович';
/** Страна оператора, ISO 3166-1; название на языке страницы даёт `countryName` из `lib/i18n`. */
export const operatorCountry = 'AM';
// Почтовый адрес публикуется только на `/legal-notice` (решение арбитра 14.10.2026, F01-6).
export const operatorPostalAddress = '6/1 Adonts St, Apt. 279, Yerevan, Armenia';
export const operatorPostalAddressRu = 'Армения, Ереван, ул. Адонц, 6/1, кв. 279';

/** Право, которому подчиняются условия (`terms.governingLaw`), ISO 3166-1. */
export const governingLawCountry = 'AM';
/** Минимальный возраст для аккаунта (`terms.minimumAge`). */
export const minimumAge = 16;

// Сроки хранения (`retention.*`). Резервные копии - решение арбитра 14.10.2026 (F01-6); аналитика -
// настройка GA, подтверждена владельцем 14.10.2026 (вместо «не дольше 14 месяцев»).
// Удаление из рабочей базы по запросу: `/deletion` (`deletion.step2`, `{hours}`) и privacy.
export const retentionDeletionHours = 24;
export const retentionServerLogsDays = 30;
export const retentionBackupsMonths = 12;
export const retentionAnalyticsMonths = 2;
