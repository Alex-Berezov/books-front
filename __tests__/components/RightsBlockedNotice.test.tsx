import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsBlockedNotice } from '@/components/common/RightsBlockedNotice';
import { isRightsBlockedError } from '@/lib/errors';
import { ApiError } from '@/types/api';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/book/hamlet/read',
}));

const geoBlockedError = () =>
  new ApiError({
    message: 'Content is not available in your country due to rights restrictions.',
    statusCode: 451,
    data: {
      code: 'GEO_BLOCKED_BY_RIGHTS',
      messageRu: 'Контент недоступен в вашей стране из-за ограничений прав.',
      countryCode: 'GB',
      scope: 'TEXT_READER',
    },
  });

const claimBlockedError = () =>
  new ApiError({
    message: 'Content is temporarily unavailable due to a rightsholder claim.',
    statusCode: 451,
    data: {
      code: 'BLOCKED_BY_RIGHTS_CLAIM',
      messageRu: 'Контент временно недоступен из-за претензии правообладателя.',
      countryCode: 'GB',
      scope: 'TEXT_READER',
    },
  });

describe('451 rights blocking (WP-1.6)', () => {
  it('recognises both backend block codes as a rights block', () => {
    expect(isRightsBlockedError(geoBlockedError())).toBe(true);
    expect(isRightsBlockedError(claimBlockedError())).toBe(true);
    expect(geoBlockedError().isRightsBlocked()).toBe(true);
  });

  it('does not mistake other API failures for a rights block', () => {
    expect(isRightsBlockedError(new ApiError({ message: 'nope', statusCode: 404 }))).toBe(false);
    expect(isRightsBlockedError(new ApiError({ message: 'nope', statusCode: 500 }))).toBe(false);
    expect(isRightsBlockedError(new Error('network down'))).toBe(false);
  });

  it('explains the block and keeps the way back to the book card', () => {
    render(<RightsBlockedNotice lang="ru" bookSlug="hamlet" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Недоступно в вашем регионе')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Вернуться к книге/ })).toHaveAttribute(
      'href',
      '/ru/book/hamlet'
    );
  });

  it('says nothing about claims or claimants — the two block codes read identically', () => {
    const { container } = render(<RightsBlockedNotice lang="ru" bookSlug="hamlet" />);
    const text = container.textContent ?? '';

    // Phase 16 / ADR-012: the reader must not be able to tell a geo block from a claim block.
    expect(text).not.toMatch(/претенз|правооблад|жалоб/i);
  });
});
