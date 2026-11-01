import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from '@/components/admin/users/UserForm';

/**
 * LEGACY-486: форма создания пользователя рендерится на серверной странице
 * `app/admin/[lang]/users/new/page.tsx`, и до гидрации нативная отправка без `method` уходит
 * GET-запросом - пароль нового пользователя оказывается в адресе админки. С `method="post"`
 * нативная отправка несёт его телом. Проверяется серверная разметка - ровно то, что видит
 * браузер до гидрации.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('метод формы пользователя до гидрации', () => {
  it('серверная разметка формы создания отправляется POST', () => {
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <UserForm lang="en" />
      </QueryClientProvider>
    );
    const host = document.createElement('div');
    host.innerHTML = html;
    const form = host.querySelector('form');
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute('method', 'post');
    expect(form).not.toHaveAttribute('action');
    expect(form?.querySelector('input[name="password"]')).not.toBeNull();
  });
});
