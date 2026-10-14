import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegisterClient from '@/app/[lang]/auth/register/RegisterClient';
import SignInClient from '@/app/[lang]/auth/sign-in/SignInClient';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';

/**
 * Строка о согласии (`product.md` §12, F01-6): под кнопками создания аккаунта на регистрации
 * и под Google на входе - вход через Google создаёт аккаунт новому адресу (решение арбитра
 * 14.10.2026). Ссылки ведут на условия и политику своего языка, в той же вкладке, без галочки.
 */
const nav = { lang: 'en', pathname: '/en/auth/register' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ lang: nav.lang }),
  usePathname: () => nav.pathname,
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

const checkLine = (lang: SupportedLang) => {
  const { consentTermsLink, consentPrivacyLink } = getDictionary(lang).auth.register;
  const terms = screen.getByRole('link', { name: consentTermsLink });
  const privacy = screen.getByRole('link', { name: consentPrivacyLink });

  expect(terms).toHaveAttribute('href', `/${lang}/terms`);
  expect(privacy).toHaveAttribute('href', `/${lang}/privacy`);
  expect(terms).not.toHaveAttribute('target');
  expect(privacy).not.toHaveAttribute('target');

  // Строка стоит после кнопки Google и без галочки.
  const google = screen.getByRole('button', { name: /Google/ });
  expect(google.compareDocumentPosition(terms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
  // Места под ссылки заполнены, а не напечатаны сырыми.
  expect(terms.parentElement?.textContent).not.toMatch(/\{terms\}|\{privacy\}/);
};

describe('строка о согласии', () => {
  it.each(SUPPORTED_LANGS)('регистрация, %s', (lang) => {
    nav.lang = lang;
    nav.pathname = `/${lang}/auth/register`;
    render(<RegisterClient />);
    checkLine(lang);
  });

  it.each(SUPPORTED_LANGS)('вход, под кнопкой Google, %s', (lang) => {
    nav.lang = lang;
    nav.pathname = `/${lang}/auth/sign-in`;
    render(<SignInClient />);
    checkLine(lang);
  });
});
