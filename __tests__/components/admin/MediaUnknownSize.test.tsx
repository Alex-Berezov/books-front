import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MediaGrid } from '@/components/admin/media/MediaGrid';
import { MediaList } from '@/components/admin/media/MediaList';
import { MediaPreviewModal } from '@/components/admin/media/MediaPreviewModal';
import { formatFileSize } from '@/lib/admin/formatters';
import type { MediaFile } from '@/types/api-schema';

/**
 * `MediaAsset.size` — `Int?`: размер бывает неизвестен. До T104c маппер подставлял `0`,
 * и медиатека показывала «0 B», то есть пустой файл; ещё раньше — «NaN undefined».
 * Неизвестный размер показывается прочерком, известный ноль — по-прежнему «0 B».
 * Все три места показа берут один `formatFileSize`, поэтому проверяется каждое.
 */
const file = (overrides: Partial<MediaFile> = {}): MediaFile => ({
  id: 'm-1',
  url: 'https://cdn/y',
  filename: 'y',
  mimeType: null,
  size: null,
  type: 'document',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides,
});

const views = {
  список: (f: MediaFile) => render(<MediaList files={[f]} />),
  сетка: (f: MediaFile) => render(<MediaGrid files={[f]} />),
  превью: (f: MediaFile) => render(<MediaPreviewModal isOpen onClose={() => {}} file={f} />),
};

describe('медиатека: размер файла', () => {
  describe.each(Object.entries(views))('%s', (_name, show) => {
    it('неизвестный размер — прочерк, а не «0 B»', () => {
      show(file());
      expect(screen.getByText('—')).toBeInTheDocument();
      expect(screen.queryByText(/^0(\.0+)? (B|MB)$/)).toBeNull();
    });

    it('известный нулевой размер — «0 B»', () => {
      show(file({ size: 0 }));
      expect(screen.getByText('0 B')).toBeInTheDocument();
      expect(screen.queryByText('—')).toBeNull();
    });

    // Общий форматтер: два знака и единица по величине (с T104c и в превью, где раньше всё шло в MB).
    it('известный размер форматируется общим форматтером', () => {
      show(file({ size: 1280 }));
      expect(screen.getByText('1.25 KB')).toBeInTheDocument();
    });
  });

  it('formatFileSize: отсутствующее поле (undefined) — тоже прочерк, а не «NaN undefined»', () => {
    expect(formatFileSize(undefined)).toBe('—');
  });
});
