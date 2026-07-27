import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LicenseCoveragePanel } from '@/components/admin/books/LicenseCoveragePanel/LicenseCoveragePanel';
import type { LicenseCoverageResult } from '@/types/api-schema/rights-licenses';

const mocks = vi.hoisted(() => ({
  useVersionLicenseCoverage: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/api/hooks/useRightsLicenses', () => ({
  useVersionLicenseCoverage: (versionId: string) => mocks.useVersionLicenseCoverage(versionId),
}));

const makeCoverage = (overrides: Partial<LicenseCoverageResult> = {}): LicenseCoverageResult => ({
  status: 'PARTIAL',
  checkedAt: '2026-07-28T00:00:00.000Z',
  requiredCountryCodes: ['ES', 'MX'],
  coveredCountryCodes: ['ES'],
  uncoveredCountryCodes: ['MX'],
  countries: [
    { countryCode: 'ES', covered: true, licenseIds: ['lic-1'], issues: [] },
    {
      countryCode: 'MX',
      covered: false,
      licenseIds: [],
      issues: [
        {
          code: 'LICENSE_MISSING_FOR_COUNTRY',
          severity: 'BLOCKER',
          messageRu: 'Для страны MX нет действующей лицензии.',
          countryCode: 'MX',
        },
      ],
    },
  ],
  licenseIds: ['lic-1'],
  blockers: [
    {
      code: 'LICENSE_MISSING_FOR_COUNTRY',
      severity: 'BLOCKER',
      messageRu: 'Для страны MX нет действующей лицензии.',
      countryCode: 'MX',
    },
  ],
  warnings: [
    {
      code: 'LICENSE_EXPIRING_SOON',
      severity: 'WARNING',
      messageRu: 'Лицензия истекает в ближайшие 90 дней.',
      licenseId: 'lic-1',
    },
  ],
  attributionTextsRu: ['© Penguin Random House, 2019'],
  ...overrides,
});

const arrangeCoverage = (
  coverage: LicenseCoverageResult | undefined,
  overrides: Record<string, unknown> = {}
) => {
  mocks.useVersionLicenseCoverage.mockReturnValue({
    data: coverage,
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
    ...overrides,
  });
};

describe('LicenseCoveragePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the country table with coverage reasons', () => {
    arrangeCoverage(makeCoverage());

    render(<LicenseCoveragePanel versionId="version-1" />);

    expect(screen.getByText('Покрытие лицензиями')).toBeInTheDocument();
    expect(screen.getByTestId('license-coverage-ES')).toBeInTheDocument();
    expect(screen.getByTestId('license-coverage-MX')).toBeInTheDocument();
    expect(screen.getByText('Лицензия покрывает не все рынки')).toBeInTheDocument();
  });

  it('renders blockers and warnings with their codes', () => {
    arrangeCoverage(makeCoverage());

    render(<LicenseCoveragePanel versionId="version-1" />);

    expect(screen.getByText('Блокеры публикации')).toBeInTheDocument();
    expect(screen.getAllByText('LICENSE_MISSING_FOR_COUNTRY').length).toBeGreaterThan(0);
    expect(screen.getByText('Предупреждения')).toBeInTheDocument();
    expect(screen.getByText('LICENSE_EXPIRING_SOON')).toBeInTheDocument();
    expect(screen.getByText('© Penguin Random House, 2019')).toBeInTheDocument();
  });

  it('collapses to a single line when no license is required', () => {
    arrangeCoverage(
      makeCoverage({
        status: 'NOT_REQUIRED',
        requiredCountryCodes: [],
        coveredCountryCodes: [],
        uncoveredCountryCodes: [],
        countries: [],
        blockers: [],
        warnings: [],
        attributionTextsRu: [],
      })
    );

    render(<LicenseCoveragePanel versionId="version-1" />);

    expect(screen.getByText('Лицензии для публикации не требуются')).toBeInTheDocument();
    expect(screen.queryByText('Покрытие лицензиями')).not.toBeInTheDocument();
  });

  it('shows an error message with a retry button when loading fails', () => {
    arrangeCoverage(undefined, { isError: true });

    render(<LicenseCoveragePanel versionId="version-1" />);

    expect(screen.getByText('Не удалось загрузить покрытие лицензиями.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Повторить/ }));
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
