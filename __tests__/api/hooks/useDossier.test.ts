// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DOSSIER_REFETCH_MS, dossierRefetchInterval } from '@/api/hooks';
import type { DossierStatus } from '@/types/api-schema';

const dossier = (status: DossierStatus['status']) => ({ status }) as DossierStatus;

describe('dossierRefetchInterval (F05-12)', () => {
  it('polls only a dossier that is being built, so the progress line stays live', () => {
    expect(dossierRefetchInterval(dossier('building'))).toBe(DOSSIER_REFETCH_MS);
    expect(dossierRefetchInterval(dossier('ready'))).toBe(false);
    expect(dossierRefetchInterval(dossier('failed'))).toBe(false);
    expect(dossierRefetchInterval(dossier('missing'))).toBe(false);
    expect(dossierRefetchInterval(undefined)).toBe(false);
  });

  it('a failed request stops the polling', () => {
    expect(dossierRefetchInterval(dossier('building'), true)).toBe(false);
  });
});
