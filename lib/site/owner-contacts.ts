// Контакты из фактов владельца (F01): единственная часть фактов, которую можно в клиентский код -
// её берёт разметка организации, а та входит и в клиентский граф пересказа. Остальные факты -
// в `owner-facts.ts` (только сервер), он же реэкспортирует эти константы (решение арбитра 14.10.2026).
export const contactGeneral = 'support@bibliaris.com';
// В owner-facts.md «как general». Владелец задаст отдельный адрес - меняется только эта строка.
export const contactRights = contactGeneral;
export const contactPrivacy = contactGeneral;
/** Срок ответа на письмо, дней (`contact.responseTime`). */
export const contactResponseDays = 30;
