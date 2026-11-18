import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { MediaGrid } from '@/components/admin/media/MediaGrid';
import { MediaSelectModal } from '@/components/admin/media/MediaSelectModal';
import type { MediaFile } from '@/types/api-schema/media';
import modalStyles from '@/components/admin/common/Modal/Modal.module.scss';
import gridStyles from '@/components/admin/media/MediaPage.module.scss';

/**
 * The cover picker is a window to look at pictures in: it takes most of the
 * screen and shows small cards in book-cover proportions. The media library
 * page keeps its own full-size cards.
 */
const file: MediaFile = {
  id: 'c1',
  url: '/media/c1.png',
  filename: 'c1.png',
  mimeType: 'image/png',
  size: 1024,
  type: 'image',
  createdAt: '2026-11-19T00:00:00.000Z',
  updatedAt: '2026-11-19T00:00:00.000Z',
};

// One answer object for every render, as react-query would hand back.
const mediaAnswer = {
  data: { items: [file], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } },
  isLoading: false,
  isError: false,
  isPlaceholderData: false,
  refetch: vi.fn(),
};

vi.mock('@/api/hooks/useMedia', () => ({
  useMediaFiles: () => mediaAnswer,
}));

vi.mock('@/components/admin/media/MediaToolbar', () => ({ MediaToolbar: () => null }));
vi.mock('@/components/admin/media/MediaUpload', () => ({ MediaUpload: () => null }));

describe('MediaSelectModal layout', () => {
  it('opens as a near full-screen window with the compact grid', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MediaSelectModal isOpen onClose={vi.fn()} onSelect={vi.fn()} allowedTypes={['image']} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('dialog')).toHaveClass(modalStyles.full);
    const card = screen.getByText('c1.png').closest('[role="button"]');
    expect(card?.parentElement).toHaveClass(gridStyles.gridCompact);
  });

  it('keeps full-size cards on the media library page', () => {
    render(<MediaGrid files={[file]} />);

    const card = screen.getByText('c1.png').closest('[role="button"]');
    expect(card?.parentElement).toHaveClass(gridStyles.grid);
    expect(card?.parentElement).not.toHaveClass(gridStyles.gridCompact);
  });
});

/**
 * vitest hands out a class name for any key of a CSS module, even a missing
 * one: the checks above stay green with the rule deleted from the stylesheet.
 * The rules that carry the layout are checked in the source itself.
 */
const REPO_ROOT = resolve(__dirname, '../../..');
const scss = (path: string) => readFileSync(resolve(REPO_ROOT, path), 'utf8');

describe('layout rules in the stylesheets', () => {
  it('keeps the full-screen window size', () => {
    expect(scss('components/admin/common/Modal/Modal.module.scss')).toMatch(
      /&\.full \{[^}]*height: 92vh;/
    );
  });

  it('keeps the compact cards in cover proportions', () => {
    expect(scss('components/admin/media/MediaPage.module.scss')).toMatch(
      /\.gridCompact \{[^}]*\.preview \{[^}]*aspect-ratio: 2 \/ 3;/
    );
  });

  it('stacks gate reasons so they stay inside the sidebar', () => {
    expect(scss('components/admin/books/PublishPanel/PublishPanel.module.scss')).toMatch(
      /\.reasonItem \{[^}]*flex-direction: column;/
    );
  });

  it('lets the version header buttons wrap', () => {
    expect(scss('app/admin/[lang]/books/versions/[id]/page.module.scss')).toMatch(
      /\.actionsGroup \{[^}]*flex-wrap: wrap;/
    );
  });
});
