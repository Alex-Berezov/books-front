import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TerritoryRegionsPanel } from '@/components/admin/RightsIntakeDetail/TerritoryRegionsPanel/TerritoryRegionsPanel';
import type { TerritoryRegionSummary } from '@/types/api-schema/rights-intake';

/**
 * WP-10.8 (R7-04): «European Union [ALLOWED] · Targeted: 3 · Allowed: 3» скрывало то,
 * что 24 страны ЕС из 27 не проверялись вовсе. Данные (`countryCount`,
 * `notTargetedCountryCount`) в DTO были, рендер их не использовал.
 */

const europeanUnion: TerritoryRegionSummary = {
  regionCode: 'EU',
  label: 'European Union',
  status: 'ALLOWED',
  countryCount: 27,
  targetedCountryCount: 3,
  allowedCountryCount: 3,
  blockedCountryCount: 0,
  licenseRequiredCountryCount: 0,
  pendingReviewCountryCount: 0,
  notTargetedCountryCount: 24,
  undecidedCountryCount: 24,
  geoBlockRequiredCount: 0,
  countries: [],
  blockingReasons: [],
};

const fullyCovered: TerritoryRegionSummary = {
  ...europeanUnion,
  regionCode: 'BENELUX',
  label: 'Benelux',
  countryCount: 3,
  targetedCountryCount: 3,
  allowedCountryCount: 3,
  notTargetedCountryCount: 0,
  undecidedCountryCount: 0,
};

describe('TerritoryRegionsPanel coverage (WP-10.8 / R7-04)', () => {
  it('shows how many countries of the region were assessed out of the total', () => {
    render(<TerritoryRegionsPanel regions={[europeanUnion]} />);

    const header = screen.getByText('European Union').closest('div')?.parentElement;
    expect(header).not.toBeNull();
    expect(within(header as HTMLElement).getByText('Targeted: 3 / 27')).toBeInTheDocument();
  });

  it('names the countries that were never assessed', () => {
    render(<TerritoryRegionsPanel regions={[europeanUnion]} />);

    expect(screen.getByText('Not assessed: 24')).toBeInTheDocument();
  });

  it('separates a deliberately excluded market from a country nobody looked at', () => {
    render(
      <TerritoryRegionsPanel
        regions={[{ ...europeanUnion, notTargetedCountryCount: 24, undecidedCountryCount: 10 }]}
      />
    );

    expect(screen.getByText('Not assessed: 10')).toBeInTheDocument();
    expect(screen.getByText('Not targeted: 14')).toBeInTheDocument();
  });

  it('does not add noise when the whole region was assessed', () => {
    render(<TerritoryRegionsPanel regions={[fullyCovered]} />);

    expect(screen.queryByText(/Not assessed/)).not.toBeInTheDocument();
    expect(screen.getByText('Targeted: 3 / 3')).toBeInTheDocument();
  });
});
