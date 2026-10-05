import { describe, expectTypeOf, it } from 'vitest';
import type {
  ContributorLink,
  PersonType,
  RightsProfileDetail,
  RightsProfilePersonSummary,
} from '@/types/api-schema';
import type { RiskFactor, RightsRiskLevel } from '@/types/api-schema/rights-lawyer';
import type { RightsProfileContributor } from '@/types/contributors';

/**
 * LEGACY-183, T103: формы, на которые бэкенд даёт гарантию в схеме (`required`, `enum`),
 * закреплены на уровне типов. Возврат `string`, `?` или общего типа на два ответа краснит
 * `yarn typecheck`: гейт type-sync сверяет имена полей, но обязательность не видит.
 */
describe('контракт профиля прав: обязательность и перечисления', () => {
  it('тип персоны в профиле — PersonType, а не string', () => {
    expectTypeOf<RightsProfilePersonSummary['type']>().toEqualTypeOf<PersonType>();
  });

  it('riskLevel и riskFactors профиля заданы всегда', () => {
    expectTypeOf<RightsProfileDetail['riskLevel']>().toEqualTypeOf<RightsRiskLevel>();
    expectTypeOf<RightsProfileDetail['riskFactors']>().toEqualTypeOf<RiskFactor[]>();
  });

  it('details фактора риска приходит всегда, возможно null', () => {
    expectTypeOf<RiskFactor['details']>().toEqualTypeOf<Record<string, unknown> | null>();
  });

  it('привязка участника не несёт person, профиль — несёт', () => {
    expectTypeOf<ContributorLink>().not.toHaveProperty('person');
    expectTypeOf<ContributorLink['sourceEvidenceIds']>().toEqualTypeOf<unknown>();
    expectTypeOf<
      RightsProfileContributor['person']
    >().toEqualTypeOf<RightsProfilePersonSummary | null>();
  });
});
