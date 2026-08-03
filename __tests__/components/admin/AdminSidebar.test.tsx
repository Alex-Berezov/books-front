import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from '@/components/admin/AdminShell/AdminSidebar/AdminSidebar';

const mocks = vi.hoisted(() => ({ pathname: '/admin/en/books', roles: ['admin'] as string[] }));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { roles: mocks.roles } } }),
}));

const rightsToggle = () => screen.getByRole('button', { name: /rights & legal/i });

describe('AdminSidebar — rights sections live under one parent', () => {
  beforeEach(() => {
    mocks.pathname = '/admin/en/books';
    mocks.roles = ['admin'];
  });

  it('shows one entry instead of five and hides the sections until asked', () => {
    render(<AdminSidebar lang="en" />);

    expect(rightsToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /rights intakes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /legal reviews/i })).not.toBeInTheDocument();
    // Повседневные разделы остаются на виду.
    expect(screen.getByRole('link', { name: /books/i })).toBeInTheDocument();
  });

  it('opens the group on click', async () => {
    render(<AdminSidebar lang="en" />);

    await userEvent.click(rightsToggle());

    expect(rightsToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /rights intakes/i })).toBeInTheDocument();
  });

  // Иначе переход по прямой ссылке приводил бы на страницу, которой в меню не видно.
  it('keeps the group open while one of its sections is the current page', () => {
    mocks.pathname = '/admin/en/rights-intakes/some-id';
    render(<AdminSidebar lang="en" />);

    expect(rightsToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /rights intakes/i })).toBeInTheDocument();
  });

  it('gives a lawyer the group with only their two sections', async () => {
    mocks.roles = ['lawyer'];
    render(<AdminSidebar lang="en" />);

    await userEvent.click(rightsToggle());

    expect(screen.getByRole('link', { name: /legal reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rights notifications/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^books$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /rights intakes/i })).not.toBeInTheDocument();
  });
});
