import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsIntakeList } from '@/components/admin/rights-intakes/RightsIntakeList/RightsIntakeList';
import type { RightsIntakeListItem } from '@/types/api-schema/rights-intake';

/**
 * WP-10.8 (R7-03): единственные два inline-стиля во всём rights UI при запрете
 * AGENTS.md «zero inline styles»; значения (2px, 4px) вдобавок шли мимо токенов.
 */

const intake: RightsIntakeListItem = {
  id: 'intake-1',
  candidateTitle: 'Pride and Prejudice',
  candidateAuthor: 'Jane Austen',
  originalTitle: null,
  originalLanguage: 'en',
  authorBirthYear: 1775,
  authorDeathYear: 1817,
  sourceProvider: 'PROJECT_GUTENBERG',
  sourceExternalId: '1342',
  sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
  sourceTitle: 'Pride and Prejudice',
  sourceLanguage: 'en',
  sourceTextType: 'ORIGINAL_TEXT',
  targetLanguages: ['en'],
  targetCountryCodes: ['US'],
  plannedContentTypes: ['TEXT'],
  plannedComponents: null,
  notesRu: null,
  workflowStatus: 'READY_FOR_AGENT',
  createdByUserId: 'user-1',
  approvedReviewId: null,
  createdBookId: null,
  archivedAt: null,
  createdAt: '2026-07-26T10:00:00Z',
  updatedAt: '2026-07-26T10:00:00Z',
};

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useRightsIntakes: () => ({
    data: { items: [intake], total: 1, page: 1, limit: 20 },
    isLoading: false,
    error: null,
  }),
}));

describe('RightsIntakeList (WP-10.8 / R7-03)', () => {
  it('renders the intake row without inline styles', () => {
    const { container } = render(<RightsIntakeList lang="en" />);

    expect(screen.getByText('Pride and Prejudice')).toBeInTheDocument();
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
