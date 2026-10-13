import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/privacy',
}));

// Snapshot of the visible structure that the dictionaries rendered before the move (F01-1):
// the same h1, the same h2 in order and the four list items of section 2.
const PRIVACY = {
  en: {
    h1: 'Privacy Policy',
    h2: [
      '1. Information We Collect',
      '2. How We Use Your Information',
      '3. Data Sharing',
      '4. Data Deletion and Retention',
      '5. Contact Us',
    ],
    items: [
      'Provide, maintain, and improve our services;',
      'Personalize your reading experience and bookshelf;',
      'Authenticate your identity via email/password or OAuth providers;',
      'Communicate with you regarding updates, security alerts, and account-related notices.',
    ],
  },
  ru: {
    h1: 'Политика конфиденциальности',
    h2: [
      '1. Информация, которую мы собираем',
      '2. Как мы используем вашу информацию',
      '3. Передача данных',
      '4. Удаление и хранение данных',
      '5. Свяжитесь с нами',
    ],
    items: [
      'Предоставлять, поддерживать и улучшать наши сервисы;',
      'Персонализировать ваш опыт чтения и вашу книжную полку;',
      'Подтверждать вашу личность через электронную почту/пароль или OAuth-провайдеров;',
      'Информировать вас об обновлениях, предупреждениях безопасности и уведомлениях, связанных с аккаунтом.',
    ],
  },
};

describe('real legal documents', () => {
  it.each(['en', 'ru'] as const)(
    'privacy/%s renders the pre-move headings and list items',
    (lang) => {
      render(<LegalPage document={getLegalDocument('privacy', lang)} />);

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(PRIVACY[lang].h1);
      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
        PRIVACY[lang].h2
      );
      expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(
        PRIVACY[lang].items
      );
      expect(screen.getAllByRole('link', { name: 'support@bibliaris.com' })).toHaveLength(2);
    }
  );

  it('terms renders five sections', () => {
    for (const doc of [getLegalDocument('terms', 'en'), getLegalDocument('terms', 'ru')]) {
      const { unmount } = render(<LegalPage document={doc} />);
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
      unmount();
    }
  });

  it('an unknown language falls back to the default document, as the dictionaries did', () => {
    expect(getLegalDocument('privacy', 'xx')).toBe(getLegalDocument('privacy', 'en'));
    expect(getLegalDocument('terms', 'de')).toBe(getLegalDocument('terms', 'en'));
  });
});
