import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicensesPanel } from '@/components/admin/RightsIntakeDetail/LicensesPanel/LicensesPanel';
import type {
  LicenseCoverageResult,
  RightsLicenseSummary,
} from '@/types/api-schema/rights-licenses';

vi.mock('@/api/hooks/useRightsLicenses', () => ({
  useLinkRightsLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeRightsLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const makeLicense = (overrides: Partial<RightsLicenseSummary> = {}): RightsLicenseSummary => ({
  id: 'lic-1',
  licenseKey: 'license:penguin-2019',
  licenseType: 'DIRECT_LICENSE',
  status: 'ACTIVE',
  effectiveStatus: 'ACTIVE',
  title: 'Лицензия на испанский перевод',
  licensor: 'Penguin Random House',
  licensee: 'Bibliaris',
  rightsHolder: null,
  referenceNumber: 'PRH-2019-4471',
  grantedAt: null,
  effectiveFrom: '2019-06-01T00:00:00.000Z',
  expiresAt: null,
  isPerpetual: true,
  territoryScope: 'COUNTRY_LIST',
  countryCodes: ['ES', 'MX'],
  excludedCountryCodes: [],
  languageCodes: ['es'],
  mediaFormats: ['TEXT_ONLINE'],
  commercialUseAllowed: true,
  modificationAllowed: false,
  translationAllowed: false,
  sublicensingAllowed: false,
  attributionRequired: true,
  requiredAttributionText: '© Penguin Random House, 2019',
  exclusive: false,
  revocable: true,
  revokedAt: null,
  revocationReasonRu: null,
  confidence: 'HIGH',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const makeCoverage = (overrides: Partial<LicenseCoverageResult> = {}): LicenseCoverageResult => ({
  status: 'COVERED',
  checkedAt: '2026-07-28T00:00:00.000Z',
  requiredCountryCodes: ['ES'],
  coveredCountryCodes: ['ES'],
  uncoveredCountryCodes: [],
  countries: [],
  licenseIds: ['lic-1'],
  blockers: [],
  warnings: [],
  attributionTextsRu: [],
  ...overrides,
});

describe('LicensesPanel', () => {
  it('renders the license count, rows and metrics', () => {
    render(<LicensesPanel licenses={[makeLicense()]} rightsProfileId="profile-1" />);

    expect(screen.getByText('Лицензии и разрешения (1)')).toBeInTheDocument();
    expect(screen.getByTestId('license-row-lic-1')).toBeInTheDocument();
    expect(screen.getByText('Лицензия на испанский перевод')).toBeInTheDocument();
    expect(screen.getByText('Penguin Random House')).toBeInTheDocument();
    expect(screen.getByText('Всего: 1')).toBeInTheDocument();
    expect(screen.getByText('Активных: 1')).toBeInTheDocument();
  });

  it('shows the server-computed effective status rather than the stored one', () => {
    render(
      <LicensesPanel
        licenses={[makeLicense({ status: 'ACTIVE', effectiveStatus: 'EXPIRED' })]}
        rightsProfileId="profile-1"
      />
    );

    expect(screen.getByText('Истекла')).toBeInTheDocument();
    expect(screen.getByText('Истёкших: 1')).toBeInTheDocument();
    expect(screen.queryByText('Действует')).not.toBeInTheDocument();
  });

  it('renders a PARTIAL coverage banner with the uncovered countries', () => {
    render(
      <LicensesPanel
        coverage={makeCoverage({
          status: 'PARTIAL',
          requiredCountryCodes: ['ES', 'MX'],
          coveredCountryCodes: ['ES'],
          uncoveredCountryCodes: ['MX'],
        })}
        licenses={[makeLicense()]}
        rightsProfileId="profile-1"
      />
    );

    expect(screen.getByText('Лицензия покрывает не все рынки')).toBeInTheDocument();
    expect(screen.getByText('Непокрытые страны: MX')).toBeInTheDocument();
  });

  it('hides mutating actions in read-only mode', () => {
    render(<LicensesPanel licenses={[makeLicense()]} readOnly rightsProfileId="profile-1" />);

    expect(screen.queryByRole('button', { name: /Добавить лицензию/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Отозвать/ })).not.toBeInTheDocument();
  });

  it('renders the empty state when no license is linked', () => {
    render(<LicensesPanel licenses={[]} rightsProfileId="profile-1" />);

    expect(
      screen.getByText('Лицензии не привязаны. Для public domain-публикаций это нормально.')
    ).toBeInTheDocument();
  });
});
