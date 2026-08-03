import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsIntakeHeader } from '@/components/admin/RightsIntakeDetail/RightsIntakeHeader/RightsIntakeHeader';
import { WorkflowTimeline } from '@/components/admin/RightsIntakeDetail/WorkflowTimeline/WorkflowTimeline';
import type { RightsIntake } from '@/types/api-schema/rights-intake';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en', id: 'test-intake-id' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockIntake: RightsIntake = {
  id: 'intake-123',
  candidateTitle: 'Pride and Prejudice',
  candidateAuthor: 'Jane Austen',
  originalTitle: 'Pride and Prejudice',
  originalLanguage: 'en',
  authorBirthYear: 1775,
  authorDeathYear: 1817,
  sourceProvider: 'PROJECT_GUTENBERG',
  sourceExternalId: '1342',
  sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
  sourceTitle: 'Pride and Prejudice',
  sourceLanguage: 'en',
  sourceTextType: 'ORIGINAL_TEXT',
  targetLanguages: ['en', 'es'],
  targetCountryCodes: ['US', 'GB'],
  plannedContentTypes: ['TEXT'],
  plannedComponents: ['ORIGINAL_TEXT'],
  notesRu: 'Test note',
  workflowStatus: 'READY_FOR_AGENT',
  createdByUserId: 'user-1',
  approvedReviewId: null,
  createdBookId: null,
  archivedAt: null,
  createdAt: '2026-07-26T10:00:00Z',
  updatedAt: '2026-07-26T10:00:00Z',
};

describe('Rights Clearance Phase 9 Components', () => {
  describe('WorkflowTimeline', () => {
    it('renders all 6 workflow stages', () => {
      render(<WorkflowTimeline intake={mockIntake} currentProfile={null} reviewImports={[]} />);

      expect(screen.getByText('Draft Intake')).toBeInTheDocument();
      expect(screen.getByText('Ready for Agent')).toBeInTheDocument();
      expect(screen.getByText('Review Imported')).toBeInTheDocument();
      expect(screen.getByText('Profile Built')).toBeInTheDocument();
      expect(screen.getByText('Human Approval')).toBeInTheDocument();
      expect(screen.getByText('Book Created')).toBeInTheDocument();
    });
  });

  describe('RightsIntakeHeader', () => {
    it('renders candidate title and author', () => {
      render(
        <RightsIntakeHeader
          intake={mockIntake}
          lang="en"
          onEdit={vi.fn()}
          onMarkReady={vi.fn()}
          onReturnToDraft={vi.fn()}
          onArchive={vi.fn()}
        />
      );

      expect(screen.getByText('Pride and Prejudice')).toBeInTheDocument();
      expect(screen.getByText('by Jane Austen')).toBeInTheDocument();
      expect(screen.getByText('Ready For Agent')).toBeInTheDocument();
    });

    // WP-L.3, строгая сторона: без прав админа статус по-прежнему закрывает архивацию.
    it('hides the archive action on an approved intake without admin rights', () => {
      render(
        <RightsIntakeHeader
          intake={{ ...mockIntake, workflowStatus: 'APPROVED' }}
          lang="en"
          onArchive={vi.fn()}
        />
      );

      expect(screen.queryByText('Archive')).not.toBeInTheDocument();
      expect(screen.queryByText('Force Archive')).not.toBeInTheDocument();
    });

    // Смягчённая сторона: админ архивирует из любого статуса, и подпись отличает этот случай.
    it('offers a force archive action on an approved intake for an admin', () => {
      render(
        <RightsIntakeHeader
          intake={{ ...mockIntake, workflowStatus: 'APPROVED' }}
          lang="en"
          onArchive={vi.fn()}
          canForceArchive
        />
      );

      expect(screen.getByText('Force Archive')).toBeInTheDocument();
    });

    // Единственный статус, из которого кнопки нет ни у кого: запись уже архивирована.
    it('hides the archive action on an already archived intake even for an admin', () => {
      render(
        <RightsIntakeHeader
          intake={{ ...mockIntake, workflowStatus: 'ARCHIVED' }}
          lang="en"
          onArchive={vi.fn()}
          canForceArchive
        />
      );

      expect(screen.queryByText('Force Archive')).not.toBeInTheDocument();
    });
  });
});
