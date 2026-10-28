import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunContextView } from '@/components/admin/translation-chunks/TranslationChunks/RunContextView';
import type { DossierData, DossierStatus, Glossary } from '@/types/api-schema';

/**
 * F05-7v-b: досье и глоссарий запуска только на чтение — досье через черновик языка (досье
 * запуска), чужое поколение не подставляется, глоссарий без построенного не запрашивается,
 * досье целиком (решения арбитра `F05 | F05-7v-b`, `product.md` §1, D1).
 */

const hooks = vi.hoisted(() => ({
  dossier: undefined as unknown,
  glossary: undefined as unknown,
  dossierError: false,
  dossierCalls: [] as Array<{ versionId: string; enabled: boolean }>,
  glossaryCalls: [] as Array<{ dossierId: string | null; language: string; enabled: boolean }>,
}));

vi.mock('@/api/hooks', () => ({
  useVersionDossier: (versionId: string, enabled: boolean) => {
    hooks.dossierCalls.push({ versionId, enabled });
    return {
      data: enabled && !hooks.dossierError ? hooks.dossier : undefined,
      isLoading: false,
      isError: hooks.dossierError,
      error: hooks.dossierError ? new Error('boom') : null,
    };
  },
  useDossierGlossary: (dossierId: string | null, language: string, enabled: boolean) => {
    hooks.glossaryCalls.push({ dossierId, language, enabled });
    return { data: enabled ? hooks.glossary : undefined, isLoading: false, isError: false };
  },
}));

const data: DossierData = {
  characters: [
    {
      key: 'ana',
      name: 'Ana',
      variants: ['Anita'],
      gender: 'female',
      whoIs: 'the heroine',
      address: [{ to: 'pedro', form: 'tú' }],
      relations: [{ to: 'pedro', label: 'sister' }],
      firstChapter: 1,
      fate: 'leaves the town',
      role: 'main',
    },
  ],
  entities: [{ key: 'town', name: 'Macondo', kind: 'place', whatIs: 'the town', firstChapter: 1 }],
  narration: { person: 'third person', form: 'past tense', notes: '' },
  setting: { place: 'Colombia', time: '1900s' },
  structure: { parts: [{ title: 'Part one', chapters: [1, 2] }], notes: '' },
  chronology: [{ event: 'the flood', chapter: 2, orderNote: 'told later' }],
  chapters: [{ number: 1, title: 'Arrival', summary: 'Ana arrives in the town.' }],
  summaryPlan: [{ number: 1, title: 'Beginnings', chapters: [1], why: 'sets the scene' }],
  voice: {
    pace: 'slow',
    sentenceLength: 'long',
    lexicon: 'plain',
    irony: 'mild',
    devices: [{ name: 'repetition', howShown: 'names repeat.', example: 'Ana, Ana', chapter: 1 }],
  },
  motifs: [{ image: 'yellow butterflies', chapters: [1, 2] }],
};

const dossierOf = (over: Partial<DossierStatus> = {}): DossierStatus => ({
  status: 'ready',
  id: 'd1',
  sourceVersionId: 'v1',
  generation: 1,
  fresh: true,
  formatVersion: 1,
  model: 'a/model',
  partsDone: 1,
  groupsDone: 0,
  groupsTotal: 0,
  failedReason: null,
  operation: null,
  previousOperation: null,
  data,
  updatedAt: '2026-10-25T00:00:00.000Z',
  ...over,
});

const glossaryOf = (): Glossary => ({
  id: 'g1',
  dossierId: 'd1',
  language: 'es',
  status: 'ready',
  data: {
    entries: [
      { key: 'ana', source: 'Ana', target: 'Ana', kind: 'name', keepOriginal: true, note: '' },
    ],
    address: [],
    phrases: [],
  },
  history: [],
  model: 'a/model',
  operation: null,
  previousOperation: null,
  updatedAt: '2026-10-25T00:00:00.000Z',
});

beforeEach(() => {
  hooks.dossier = dossierOf();
  hooks.glossary = glossaryOf();
  hooks.dossierCalls.length = 0;
  hooks.dossierError = false;
  hooks.glossaryCalls.length = 0;
});

const renderView = (over: Partial<Parameters<typeof RunContextView>[0]> = {}) =>
  render(
    <RunContextView
      sourceVersionId="v1"
      draftVersionId="draft-es"
      dossierId="d1"
      glossaryId="g1"
      language="es"
      {...over}
    />
  );

describe('Досье и глоссарий запуска (F05-7v-b)', () => {
  it('досье — через черновик языка (досье запуска); без черновика — через исходник', () => {
    renderView();
    expect(hooks.dossierCalls.at(-1)).toEqual({ versionId: 'draft-es', enabled: true });
    renderView({ draftVersionId: null });
    expect(hooks.dossierCalls.at(-1)).toEqual({ versionId: 'v1', enabled: true });
  });

  it('досье целиком: персонажи со связями, хронология, главы, план, приёмы, мотивы', () => {
    renderView();
    expect(screen.getByText(/Relations: sister → pedro/)).toBeInTheDocument();
    expect(screen.getByText(/Address: to pedro: tú/)).toBeInTheDocument();
    expect(screen.getByText(/Fate: leaves the town/)).toBeInTheDocument();
    expect(screen.getByText(/Chapter 2: the flood \(told later\)/)).toBeInTheDocument();
    expect(screen.getByText(/Ana arrives in the town\./)).toBeInTheDocument();
    expect(screen.getByText(/Beginnings \(chapters 1\) — sets the scene/)).toBeInTheDocument();
    expect(screen.getByText(/repetition \(chapter 1\)/)).toBeInTheDocument();
    expect(screen.getByText(/yellow butterflies — chapters 1, 2/)).toBeInTheDocument();
    expect(screen.getByText(/Part one — chapters 1, 2/)).toBeInTheDocument();
  });

  it('досье запуска ещё нет — так и сказано; пока его строят, виден ход по исходнику (F05-12)', () => {
    hooks.dossier = dossierOf({ status: 'missing', id: null, data: null });
    const { unmount } = renderView({ dossierId: null });
    expect(hooks.dossierCalls.at(-1)).toEqual({ versionId: 'draft-es', enabled: true });
    expect(screen.getByText('The dossier of this run is not built yet.')).toBeInTheDocument();
    unmount();

    // Досье привязывается к запуску готовым: строящееся видно только через исходник.
    hooks.dossier = dossierOf({
      status: 'building',
      id: 'd9',
      data: null,
      partsDone: 313,
      groupsDone: 2,
      groupsTotal: 8,
    });
    renderView({ dossierId: null });
    expect(
      screen.getByText(
        'The dossier of this run is not built yet. The dossier is being built: 313 parts of the book read, summary groups answered 2 of 8 (more levels may follow).'
      )
    ).toBeInTheDocument();
  });

  it('ручка отдала другое поколение — не подставляется', () => {
    hooks.dossier = dossierOf({ id: 'd2' });
    renderView({ draftVersionId: null });
    expect(screen.getByText(/rebuilt after this run/)).toBeInTheDocument();
    expect(screen.queryByText('Characters')).not.toBeInTheDocument();
  });

  it('досье нет (missing) — не «заменено», а «нет»', () => {
    hooks.dossier = dossierOf({ status: 'missing', id: null, data: null });
    renderView();
    expect(screen.getByText('The dossier of this run is gone.')).toBeInTheDocument();
    expect(screen.queryByText(/rebuilt/)).not.toBeInTheDocument();
  });

  it.each([
    ['DOSSIER_SOURCE_CHANGED', /the source text was edited while the dossier was being built/],
    ['DOSSIER_TOO_LONG', /the dossier does not fit the model context/],
    [null, /the build failed/],
  ])('отказ построения %s — своей подписью', (failedReason, text) => {
    hooks.dossier = dossierOf({ status: 'failed', failedReason, data: null });
    renderView();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('досье строится, устарело или не прочиталось — своей строкой', () => {
    hooks.dossier = dossierOf({ status: 'building', data: null });
    const { unmount } = renderView();
    expect(
      screen.getByText('The dossier is being built: 1 part of the book read.')
    ).toBeInTheDocument();
    unmount();

    // Части прочитаны, идут платные вызовы групп сводки — их ход виден (F05-12), и «0 of 3» в
    // начале уровня тоже.
    for (const groupsDone of [0, 1]) {
      hooks.dossier = dossierOf({
        status: 'building',
        data: null,
        partsDone: 250,
        groupsDone,
        groupsTotal: 3,
      });
      const groups = renderView();
      expect(
        screen.getByText(
          `The dossier is being built: 250 parts of the book read, summary groups answered ${groupsDone} of 3 (more levels may follow).`
        )
      ).toBeInTheDocument();
      groups.unmount();
    }

    hooks.dossier = dossierOf({ fresh: false });
    const second = renderView();
    expect(screen.getByText(/the source changed since it was built/)).toBeInTheDocument();
    second.unmount();

    hooks.dossierError = true;
    renderView();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('The request failed');
  });

  it('глоссарий не построился или строится — своей строкой; обращения, фразы, пополнения', () => {
    hooks.glossary = { ...glossaryOf(), status: 'failed', data: null };
    const { unmount } = renderView();
    expect(screen.getByText('The glossary was not built.')).toBeInTheDocument();
    unmount();

    hooks.glossary = { ...glossaryOf(), status: 'building', data: null };
    const second = renderView();
    expect(screen.getByText('The glossary is being built.')).toBeInTheDocument();
    second.unmount();

    const g = glossaryOf();
    hooks.glossary = {
      ...g,
      data: {
        ...g.data!,
        address: [{ from: 'ana', to: 'pedro', form: 'tú' }],
        phrases: [{ source: 'good morning', target: 'buenos días' }],
      },
      history: [{ chunkId: 'c1', entries: g.data!.entries }],
    };
    renderView();
    expect(screen.getByText('ana → pedro: tú')).toBeInTheDocument();
    expect(screen.getByText('good morning → buenos días')).toBeInTheDocument();
    expect(screen.getByText(/Added while translating: 1/)).toBeInTheDocument();
  });

  it('язык без черновика, досье перестроено — не подставляется и не обещает невозможного', () => {
    hooks.dossier = dossierOf({ id: 'd2' });
    renderView({ draftVersionId: null });
    expect(screen.getByText(/the language has none/)).toBeInTheDocument();
  });

  it('глоссарий языка не построен — запроса нет, «not built yet» вместо ошибки', () => {
    renderView({ glossaryId: null });
    expect(hooks.glossaryCalls.at(-1)?.enabled).toBe(false);
    expect(screen.getByText('The glossary of this language is not built yet.')).toBeInTheDocument();
  });

  it('глоссарий — по досье запуска и языку; запись «как в оригинале» помечена', () => {
    renderView();
    expect(hooks.glossaryCalls.at(-1)).toEqual({ dossierId: 'd1', language: 'es', enabled: true });
    expect(screen.getByText('Ana (kept as in the original)')).toBeInTheDocument();
  });
});
