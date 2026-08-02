import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RightsTabSourceEdition } from '@/components/admin/books/RightsTab/RightsTabSourceEdition';
import type { SourceEdition } from '@/types/api-schema/rights-intake';

/**
 * WP-10.8 (R7-02а): бейдж статуса исходного издания получал `data-status="APPROVED"`
 * литералом, поэтому COPYRIGHTED / UNCERTAIN / LICENSE_REQUIRED / INSUFFICIENT_DATA
 * рисовались зелёным «одобрено» на экране, где редактор принимает решение о правах.
 */

const makeSourceEdition = (status: string): SourceEdition => ({
  id: 'se-1',
  rightsProfileId: 'profile-1',
  provider: 'PROJECT_GUTENBERG',
  externalId: '1342',
  sourceUrl: null,
  sourceTitle: 'Pride and Prejudice',
  sourceLanguage: 'en',
  sourceTextType: 'ORIGINAL_TEXT',
  gutenbergStatus: 'PUBLIC_DOMAIN_US',
  status,
  notesRu: null,
  editionRights: [],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
});

describe('RightsTabSourceEdition status badge (WP-10.8 / R7-02)', () => {
  it.each(['COPYRIGHTED', 'UNCERTAIN', 'LICENSE_REQUIRED', 'INSUFFICIENT_DATA', 'ALLOWED'])(
    'renders the badge with the actual status %s',
    (status) => {
      render(<RightsTabSourceEdition sourceEdition={makeSourceEdition(status)} />);

      expect(screen.getByText(status)).toHaveAttribute('data-status', status);
    }
  );

  it('never marks a non-allowed source edition as approved', () => {
    render(<RightsTabSourceEdition sourceEdition={makeSourceEdition('COPYRIGHTED')} />);

    expect(document.querySelector('[data-status="APPROVED"]')).toBeNull();
  });
});
