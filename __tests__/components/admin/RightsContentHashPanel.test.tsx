import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RightsContentHashPanel } from '@/components/admin/books/RightsContentHashPanel/RightsContentHashPanel';
import type { RightsContentHashCheck } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({ hash: vi.fn(), check: vi.fn() }));

vi.mock('@/api/hooks/useBookVersions', () => ({
  useVersionRightsContentHash: () => mocks.hash(),
  useCheckVersionRightsContentHash: () => ({ mutate: mocks.check, isPending: false }),
}));

const hashCheck = (overrides: Partial<RightsContentHashCheck> = {}): RightsContentHashCheck => ({
  versionId: 'version-1',
  baselineHash: 'baseline-hash',
  currentHash: 'baseline-hash',
  algorithmVersion: 'v1',
  matchesBaseline: true,
  isStale: false,
  recheckRequired: false,
  reasonCode: null,
  reasonRu: null,
  checkedAt: '2026-09-27T10:00:00.000Z',
  ...overrides,
});

const arrange = (data: RightsContentHashCheck) =>
  mocks.hash.mockReturnValue({ data, isLoading: false, isError: false });

const CHANGED_TEXT =
  'Контент изменён после одобрения прав — изменение записано в журнал, публикацию не блокирует';

describe('RightsContentHashPanel — контент изменён после одобрения (27.09.2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('при расхождении с baseline без флагов показывает «изменено, не блокирует», а не перепроверку', () => {
    arrange(hashCheck({ currentHash: 'edited-hash', matchesBaseline: false }));
    render(<RightsContentHashPanel versionId="version-1" />);

    expect(screen.getByText(CHANGED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText('Требуется повторная проверка прав')).not.toBeInTheDocument();
  });

  it('при совпадении с baseline состояние «актуален»', () => {
    arrange(hashCheck());
    render(<RightsContentHashPanel versionId="version-1" />);

    expect(screen.getByText('Rights content hash актуален')).toBeInTheDocument();
    expect(screen.queryByText(CHANGED_TEXT)).not.toBeInTheDocument();
  });

  it('явный флаг перепроверки по-прежнему показывается как перепроверка', () => {
    arrange(hashCheck({ matchesBaseline: false, recheckRequired: true }));
    render(<RightsContentHashPanel versionId="version-1" />);

    expect(screen.getByText('Требуется повторная проверка прав')).toBeInTheDocument();
    expect(screen.queryByText(CHANGED_TEXT)).not.toBeInTheDocument();
  });
});
