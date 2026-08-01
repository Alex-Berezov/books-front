import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceEditionFilePanel } from '@/components/admin/RightsIntakeDetail/SourceEditionFilePanel/SourceEditionFilePanel';
import type { SourceEdition } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({
  uploadSourceFile: vi.fn().mockResolvedValue({}),
  downloadSourceFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api/hooks/useRightsFiles', () => ({
  useRightsFileLimits: () => ({
    data: {
      maxSizeMb: 25,
      allowedContentTypes: {
        reportPdf: ['application/pdf'],
        sourceFile: ['application/pdf', 'text/plain'],
        evidence: ['application/pdf'],
      },
    },
  }),
  useUploadRightsSourceFile: () => ({ mutateAsync: mocks.uploadSourceFile, isPending: false }),
}));

vi.mock('@/api/endpoints/admin/rights-files', () => ({
  downloadRightsSourceFile: mocks.downloadSourceFile,
}));

const makeSourceEdition = (overrides: Partial<SourceEdition> = {}): SourceEdition => ({
  id: 'edition-1',
  rightsProfileId: 'profile-1',
  provider: 'PROJECT_GUTENBERG',
  externalId: '1342',
  sourceUrl: 'https://gutenberg.org/ebooks/1342',
  sourceTitle: 'Pride and Prejudice',
  sourceLanguage: 'en',
  sourceTextType: 'ORIGINAL_TEXT',
  gutenbergStatus: null,
  status: 'ACTIVE',
  notesRu: null,
  editionRights: [],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

// WP-8.3: контрольная сумма файла источника входит в content hash клиренса, поэтому загрузка
// помечает версии профиля требующими перепроверки — редактор обязан узнать об этом заранее.
describe('SourceEditionFilePanel (WP-8.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns that the upload invalidates the clearance freshness', () => {
    render(<SourceEditionFilePanel profileId="profile-1" sourceEdition={makeSourceEdition()} />);

    expect(screen.getByText(/меняет content hash клиренса/)).toBeInTheDocument();
    expect(screen.getByText(/требующими перепроверки прав/)).toBeInTheDocument();
  });

  it('uploads the source file for the profile', async () => {
    render(<SourceEditionFilePanel profileId="profile-1" sourceEdition={makeSourceEdition()} />);

    const file = new File(['text'], 'source.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Загрузить файл источника/), {
        target: { files: [file] },
      });
    });

    expect(mocks.uploadSourceFile).toHaveBeenCalledWith({ profileId: 'profile-1', file });
  });

  it('shows the checksum of a stored file and downloads it', async () => {
    render(
      <SourceEditionFilePanel
        profileId="profile-1"
        sourceEdition={makeSourceEdition({
          hasSourceFile: true,
          sourceFileName: 'pride.txt',
          sourceFileSha256: '11223344556677889900aabbccddeeff',
          sourceFileSizeBytes: 8192,
          sourceFileUploadedAt: '2026-08-01T12:00:00.000Z',
        })}
      />
    );

    expect(screen.getByText('pride.txt')).toBeInTheDocument();
    expect(screen.getByText('112233445566')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Скачать файл/ }));
    });

    expect(mocks.downloadSourceFile).toHaveBeenCalledWith('profile-1');
  });
});
