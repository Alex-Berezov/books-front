import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '@/components/public/layout/Header';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

const openDrawer = () => {
  fireEvent.click(screen.getByRole('button', { name: /меню|menu/i }));
};

/**
 * 🔴 `LEGACY-041`: панель мобильного меню гасила клик `stopPropagation` — обработчиком
 * на элементе, нажимать который не предполагается. Теперь подложка смотрит на цель
 * клика сама, а панель обработчика не несёт вовсе.
 *
 * Сторож краснеет на возврате: подложка, закрывающая меню по любому долетевшему
 * клику, закроет его и от клика по ссылке внутри панели.
 */
describe('подложка мобильного меню', () => {
  it('клик внутри панели меню его не закрывает, клик по подложке — закрывает', () => {
    render(<Header />);

    openDrawer();
    const panel = screen.getByRole('dialog');
    expect(panel).toBeInTheDocument();

    fireEvent.click(panel);
    expect(screen.queryByRole('dialog')).toBeInTheDocument();

    const overlay = panel.parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
