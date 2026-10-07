import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminChrome } from '@/components/admin/AdminShell/AdminChrome/AdminChrome';

let pathname = '/admin/ru/books/versions/v1';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

const renderChrome = () =>
  render(
    <AdminChrome sidebar={<nav>Sidebar</nav>} topBar={<header>Top bar</header>}>
      <p>Page</p>
    </AdminChrome>
  );

/**
 * The draft preview shows the public reader's view, which owns the viewport.
 * Covering the admin shell with a layer left its links in the tab order, so on
 * the preview route the shell is not rendered at all.
 */
describe('AdminChrome', () => {
  beforeEach(() => {
    pathname = '/admin/ru/books/versions/v1';
  });

  it('рисует сайдбар, верхнюю панель и страницу на обычной странице админки', () => {
    renderChrome();

    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Top bar')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Page');
  });

  it('на предпросмотре версии оставляет только страницу', () => {
    pathname = '/admin/ru/books/versions/v1/preview';

    renderChrome();

    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
    expect(screen.queryByText('Top bar')).not.toBeInTheDocument();
    // Ориентир «основное содержимое» для скринридера остаётся и без оболочки.
    expect(screen.getByRole('main')).toHaveTextContent('Page');
  });
});
