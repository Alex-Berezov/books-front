import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsTabEmptyState } from '@/components/admin/books/RightsTab/RightsTabEmptyState';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en', id: 'test-version-id' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('RightsTab Components (Phase 10)', () => {
  describe('RightsTabEmptyState', () => {
    it('renders empty state message and links for legacy/unlinked books', () => {
      render(<RightsTabEmptyState lang="en" />);

      expect(screen.getByText('No Rights Clearance Linked')).toBeInTheDocument();
      expect(screen.getByText('Browse Rights Intakes')).toBeInTheDocument();
      expect(screen.getByText('Create Rights Intake')).toBeInTheDocument();
    });
  });
});
