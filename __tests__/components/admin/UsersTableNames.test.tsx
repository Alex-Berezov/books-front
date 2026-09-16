/**
 * Список пользователей показывает имя и дату последнего входа (`LEGACY-380`).
 *
 * Сервер (`PublicUserWithRolesDto`) отдаёт `name`, `firstName`, `lastName` и `nickname`
 * со значением `null`, а даты зовёт `lastLogin`. Рукописный тип обещал несуществующие
 * `displayName` и `lastLoginAt`, поэтому имя вырождалось в «Unknown» всякий раз, когда
 * не заполнены сразу оба — `firstName` и `lastName`, — а колонка «Last Login» всегда
 * печатала «Never». Пустота была неотличима от незаполненного поля.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UsersTable } from '@/components/admin/users/UsersTable';
import type { User } from '@/types/api-schema/user';

const users: User[] = [
  {
    id: 'u-1',
    email: 'mark@example.com',
    name: 'Марк Твен',
    firstName: null,
    lastName: null,
    nickname: null,
    avatarUrl: null,
    languagePreference: 'ru',
    roles: ['admin'],
    isActive: true,
    lastLogin: '2026-09-10T08:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u-2',
    email: 'nick@example.com',
    name: null,
    firstName: null,
    lastName: null,
    nickname: 'booklover',
    avatarUrl: null,
    languagePreference: 'en',
    roles: ['user'],
    isActive: true,
    lastLogin: null,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

vi.mock('@/api/hooks/useUsers', () => ({
  useUsers: () => ({
    data: { items: users, pagination: { total: 2, page: 1, limit: 20, totalPages: 1 } },
    isLoading: false,
    error: null,
  }),
  useDeleteUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('UsersTable', () => {
  it('берёт имя из полей, которые сервер и правда отдаёт', () => {
    render(<UsersTable lang="ru" />);

    expect(screen.getByText('Марк Твен')).toBeInTheDocument();
    expect(screen.getByText('booklover')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('показывает дату последнего входа, а «Never» — только когда входа не было', () => {
    render(<UsersTable lang="ru" />);

    expect(screen.getAllByText('Never')).toHaveLength(1);
  });
});
