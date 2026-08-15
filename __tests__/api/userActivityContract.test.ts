import { describe, it, expect } from 'vitest';
import type { UserActivityParentOrChildComment } from '@/types/api-schema';

/**
 * Посадка LEGACY-191 на стороне фронта.
 *
 * 🔴 Заявленный барьер «уберём поле — покраснеет `yarn typecheck`» не работает
 * сам по себе: поле `email` у автора активности не читает ни один компонент,
 * поэтому возврат строки `email: string;` в рукописный тип компилируется чисто
 * и никакой тест этого не замечает. Схема в `types/api-schema/**` не генерится
 * из бэкенда, и разойтись с ответом API она может молча.
 *
 * Барьер — проверка на уровне типов: `HasEmail` станет `true`, присваивание
 * `false` перестанет компилироваться, и `tsc --noEmit` покраснеет прямо здесь.
 * Рантайм-утверждение ниже нужно, чтобы файл был тестом, а не мёртвым кодом,
 * который однажды выкинут как неиспользуемый.
 */
type HasEmail = 'email' extends keyof UserActivityParentOrChildComment['user'] ? true : false;

const ACTIVITY_AUTHOR_HAS_EMAIL: HasEmail = false;

describe('контракт GET /users/me/activities (LEGACY-191)', () => {
  it('автор чужого комментария и авторы ответов объявлены без почты', () => {
    expect(ACTIVITY_AUTHOR_HAS_EMAIL).toBe(false);
  });
});
