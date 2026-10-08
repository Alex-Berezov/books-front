/**
 * Шаблон адреса из `@rc-component/async-validator` — им проверяло правило
 * `{ type: 'email' }` формы antd. Взят как есть, чтобы после ухода с antd
 * форма пропускала и отбивала ровно те же адреса (`LEGACY-442`).
 *
 * Диапазоны не-ASCII в домене записаны escape-последовательностями, а не сырыми
 * знаками: первый из них начинается с неразрывного пробела `\u00A0`, и сырой знак
 * легко спутать с обычным пробелом — тогда в домен пройдёт вся печатная ASCII.
 */
const EMAIL_PATTERN =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+\.)+[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}))$/;

/** Предел длины адреса у того же валидатора. */
const EMAIL_MAX_LENGTH = 320;

/**
 * Проверка адреса, как у правила `{ type: 'email' }` antd. Пустую строку
 * правило не проверяло — её ловит `required`, поэтому здесь она не встречается.
 */
export const isValidEmail = (value: string): boolean =>
  value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);

/**
 * Правило поля почты целиком — обязательность, затем формат, — одно на вход
 * и регистрацию. Тексты у страниц свои (разные ключи словаря), правило — общее.
 */
export const validateEmail = (
  value: string,
  messages: { required: string; invalid: string }
): string | undefined => {
  if (!value) return messages.required;
  if (!isValidEmail(value)) return messages.invalid;
  return undefined;
};
