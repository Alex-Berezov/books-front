import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManifestPanel } from '@/components/admin/RightsIntakeDetail/ManifestPanel/ManifestPanel';
import type { RightsIntakeReadiness } from '@/types/api-schema/rights-intake';

/**
 * WP-F.5: пробелы интейка видны редактору до отправки агенту и **ничего не запрещают**.
 * Блокирующая проверка сделала бы вход в систему строже, а задача этапа обратная.
 */

const readinessState: { data: RightsIntakeReadiness | undefined } = { data: undefined };

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useRightsAgentManifest: () => ({ isFetching: false, refetch: vi.fn() }),
  useRightsIntakeReadiness: () => ({ data: readinessState.data, isLoading: false }),
}));

const withGaps: RightsIntakeReadiness = {
  intakeId: 'intake-1',
  isReady: false,
  missing: [
    { code: 'SOURCE_URL_MISSING', field: 'sourceUrl', messageRu: 'Не указана ссылка на источник.' },
  ],
  warnings: [
    {
      code: 'AUTHOR_DEATH_YEAR_MISSING',
      field: 'authorDeathYear',
      messageRu: 'Не указан год смерти автора.',
    },
  ],
};

const ready: RightsIntakeReadiness = {
  intakeId: 'intake-1',
  isReady: true,
  missing: [],
  warnings: [],
};

describe('ManifestPanel: неблокирующий readiness (WP-F.5)', () => {
  it('показывает пробелы, но не запрещает выгрузку манифеста', () => {
    readinessState.data = withGaps;

    render(<ManifestPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    expect(screen.getByText('Не указана ссылка на источник.')).toBeInTheDocument();
    expect(screen.getByText('Не указан год смерти автора.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview Manifest' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeEnabled();
  });

  it('показывает пробелы и в DRAFT — до перехода в Ready For Agent', () => {
    readinessState.data = withGaps;

    render(<ManifestPanel intakeId="intake-1" workflowStatus="DRAFT" />);

    expect(screen.getByText('Не указана ссылка на источник.')).toBeInTheDocument();
  });

  it('у полного интейка списка пробелов нет', () => {
    readinessState.data = ready;

    render(<ManifestPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    expect(screen.queryByText('Не указана ссылка на источник.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview Manifest' })).toBeEnabled();
  });
});
