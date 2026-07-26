import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComponentTerritoryAssessmentsPanel } from '@/components/admin/RightsIntakeDetail/ComponentTerritoryAssessmentsPanel/ComponentTerritoryAssessmentsPanel';
import type { RightsComponent } from '@/types/api-schema/rights-intake';

const createComponent = (territoryAssessments: RightsComponent['territoryAssessments']) => ({
  id: 'component-1',
  rightsProfileId: 'profile-1',
  componentType: 'TRANSLATION',
  titleRu: 'Перевод',
  status: 'COPYRIGHTED',
  requiredAction: 'OBTAIN_LICENSE',
  confidence: 'HIGH',
  notesRu: null,
  territoryAssessments,
  createdAt: '2026-07-27T00:00:00.000Z',
  updatedAt: '2026-07-27T00:00:00.000Z',
});

describe('ComponentTerritoryAssessmentsPanel', () => {
  it('renders rows, restriction styling, summary counts, and expiring warning', () => {
    const rightsExpireAt = new Date();
    rightsExpireAt.setDate(rightsExpireAt.getDate() + 30);
    const components: RightsComponent[] = [
      createComponent([
        {
          id: 'assessment-gb',
          rightsComponentId: 'component-1',
          countryCode: 'GB',
          status: 'BLOCKED',
          accessPolicy: 'BLOCK',
          geoBlockRequired: true,
          reasonRu: 'Перевод защищён.',
          legalBasisRu: 'Translation copyright term.',
          publicDomainFromYear: null,
          rightsExpireAt: rightsExpireAt.toISOString(),
          sourceEvidenceIds: ['evidence-gb'],
          confidence: 'MEDIUM',
          notesRu: null,
          createdAt: '2026-07-27T00:00:00.000Z',
          updatedAt: '2026-07-27T00:00:00.000Z',
        },
        {
          id: 'assessment-us',
          rightsComponentId: 'component-1',
          countryCode: 'US',
          status: 'PENDING_REVIEW',
          accessPolicy: 'REVIEW_REQUIRED',
          geoBlockRequired: false,
          reasonRu: 'Нужна проверка.',
          legalBasisRu: null,
          publicDomainFromYear: null,
          rightsExpireAt: null,
          sourceEvidenceIds: null,
          confidence: 'LOW',
          notesRu: null,
          createdAt: '2026-07-27T00:00:00.000Z',
          updatedAt: '2026-07-27T00:00:00.000Z',
        },
      ]),
    ];

    render(<ComponentTerritoryAssessmentsPanel components={components} />);

    expect(screen.getByText('Total assessments: 2')).toBeInTheDocument();
    expect(screen.getByText('Blocked: 1')).toBeInTheDocument();
    expect(screen.getByText('Review required: 1')).toBeInTheDocument();
    expect(screen.getByText('Geo-block required: 1')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon: 1')).toBeInTheDocument();
    expect(screen.getByText('Expires soon')).toBeInTheDocument();
    expect(screen.getByText('evidence-gb')).toBeInTheDocument();

    const blockedRow = screen.getByTestId('component-territory-GB');
    const reviewRow = screen.getByTestId('component-territory-US');
    expect(blockedRow.className).toContain('blockingRow');
    expect(reviewRow.className).toContain('warningRow');
  });

  it('handles components without territory assessments', () => {
    render(<ComponentTerritoryAssessmentsPanel components={[createComponent([])]} />);

    expect(screen.getByText('Total assessments: 0')).toBeInTheDocument();
    expect(screen.getByText('No country assessments.')).toBeInTheDocument();
  });
});
