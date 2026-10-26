import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportAnalysisModal } from '@/components/admin/books/AnalysisTab/ImportAnalysisModal';
import { formFromAnalysis } from '@/lib/admin/book-analysis-form-state';
import { analyzeBookAnalysisImport } from '@/lib/admin/book-analysis-validation';
import type { AnalysisPreview } from '@/components/admin/books/AnalysisTab/AnalysisTab.types';

/**
 * Окно «Import JSON» вкладки Analysis (F03-1, `product.md` §21 п.3; решение А3): проба на сервере
 * после паузы в наборе, импорт только после удачной пробы, ответ на старый текст не перетирает
 * свежий, закрытие сбрасывает текст.
 */

const analyze = (text: string) => analyzeBookAnalysisImport(formFromAnalysis(null), text, 'en');

const ok: AnalysisPreview = { state: 'ok', check: { hasCore: false, warnings: [] } };

const setup = (preview: (data: unknown) => Promise<AnalysisPreview>, initialJson?: string) => {
  const onImport = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ImportAnalysisModal
      isOpen
      onCancel={onCancel}
      analyze={analyze}
      loadFailed={false}
      onRetryLoad={vi.fn()}
      preview={preview}
      onImport={onImport}
      initialJson={initialJson}
    />
  );
  const type = (text: string) =>
    fireEvent.change(screen.getByRole('textbox', { name: 'Import analysis JSON' }), {
      target: { value: text },
    });
  const confirm = () => screen.getByRole('button', { name: 'Import into form' });
  return { ...utils, onImport, onCancel, type, confirm };
};

const flush = async (ms = 400) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

describe('ImportAnalysisModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('проба — после паузы в наборе; импорт закрыт до удачной пробы', async () => {
    const preview = vi.fn(() => Promise.resolve(ok));
    const { type, confirm, onImport } = setup(preview);

    type('{"language":"en","mainIdea":"A"}');
    expect(confirm()).toBeDisabled();
    await flush(399);
    expect(preview).not.toHaveBeenCalled();
    await flush(1);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(confirm()).toBeEnabled();

    fireEvent.click(confirm());
    expect(onImport).toHaveBeenCalledWith({ language: 'en', mainIdea: 'A' });
  });

  it('сервер отверг данные — импорт закрыт, текст отказа виден', async () => {
    const preview = vi.fn(() =>
      Promise.resolve<AnalysisPreview>({ state: 'rejected', message: 'characters.0.themeKeys.0' })
    );
    const { type, confirm, onImport } = setup(preview);
    type('{"language":"en"}');
    await flush();
    expect(confirm()).toBeDisabled();
    expect(screen.getByText(/The server rejected the data/)).toBeInTheDocument();
    fireEvent.click(confirm());
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText('characters.0.themeKeys.0')).toBeInTheDocument();
  });

  it('сбой проверки — не ошибка данных: есть повтор, повтор шлёт пробу снова', async () => {
    const preview = vi
      .fn<(data: unknown) => Promise<AnalysisPreview>>()
      .mockResolvedValueOnce({ state: 'failed', message: 'Failed to fetch' })
      .mockResolvedValueOnce(ok);
    const { type, confirm } = setup(preview);
    type('{"language":"en"}');
    await flush();
    expect(screen.getByText(/Could not check the data/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry check' }));
    await flush();
    expect(preview).toHaveBeenCalledTimes(2);
    expect(confirm()).toBeEnabled();
  });

  it('ответ пробы на старый текст не перетирает новый', async () => {
    let resolveFirst: (v: AnalysisPreview) => void = () => undefined;
    const preview = vi
      .fn<(data: unknown) => Promise<AnalysisPreview>>()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce({ state: 'rejected', message: 'second' });
    const { type, confirm } = setup(preview);
    type('{"language":"en","mainIdea":"A"}');
    await flush();
    type('{"language":"en","mainIdea":"B"}');
    await flush();
    await act(async () => resolveFirst(ok));
    expect(confirm()).toBeDisabled();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('ошибка формы JSON — без пробы на сервере', async () => {
    const preview = vi.fn(() => Promise.resolve(ok));
    const { type } = setup(preview);
    type('{"language":"en","themes":[{"key":"Bad Key","title":"T"}]}');
    await flush();
    expect(preview).not.toHaveBeenCalled();
    expect(screen.getByText(/themes\.0\.key/)).toBeInTheDocument();
  });

  it('закрытие сбрасывает текст', async () => {
    const preview = vi.fn(() => Promise.resolve(ok));
    const { type, onCancel, rerender } = setup(preview);
    type('{"language":"en"}');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    rerender(
      <ImportAnalysisModal
        isOpen
        onCancel={onCancel}
        analyze={analyze}
        loadFailed={false}
        onRetryLoad={vi.fn()}
        preview={preview}
        onImport={vi.fn()}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Import analysis JSON' })).toHaveValue('');
  });

  it('«ok» прошлого текста не одобряет новый: импорт закрыт до пробы нового', async () => {
    const preview = vi.fn(() => Promise.resolve(ok));
    const { type, confirm, onImport } = setup(preview);
    type('{"language":"en","mainIdea":"A"}');
    await flush();
    expect(confirm()).toBeEnabled();
    type('{"language":"en","mainIdea":"B"}');
    expect(confirm()).toBeDisabled();
    fireEvent.click(confirm());
    expect(onImport).not.toHaveBeenCalled();
  });

  it('заготовка из досье (F05-11): окно открывается с её JSON, импорт - той же пробой', async () => {
    const preview = vi.fn(() => Promise.resolve(ok));
    const json = '{"language":"en","keyQuotes":[{"text":"Line","chapter":1}]}';
    const { confirm, onImport } = setup(preview, json);
    expect(screen.getByRole('textbox', { name: 'Import analysis JSON' })).toHaveValue(json);
    await flush();
    expect(preview).toHaveBeenCalledTimes(1);
    expect(confirm()).toBeEnabled();
    fireEvent.click(confirm());
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith({
      language: 'en',
      keyQuotes: [
        { text: 'Line', chapter: 1, speakerKey: null, themeKeys: null, interpretation: null },
      ],
    });
  });

  it('заполненный блок, который заменится целиком, назван до импорта (F05-11)', async () => {
    const prev = formFromAnalysis(null);
    prev.lists.keyQuotes = [{ text: 'Old', chapter: 1 }];
    const onImport = vi.fn();
    render(
      <ImportAnalysisModal
        isOpen
        onCancel={vi.fn()}
        analyze={(text) => analyzeBookAnalysisImport(prev, text, 'en')}
        loadFailed={false}
        onRetryLoad={vi.fn()}
        preview={() => Promise.resolve(ok)}
        onImport={onImport}
        initialJson='{"language":"en","keyQuotes":[{"text":"New","chapter":1}]}'
      />
    );
    // Окно заготовки говорит, что сохранённое внутри блоков заготовка перенесла.
    expect(
      screen.getByText(/will be replaced by the draft \(the draft keeps the saved items/)
    ).toBeInTheDocument();
    expect(screen.getByText('keyQuotes')).toBeInTheDocument();
    await flush();
  });

  it('закрытие окна с заготовкой очищает поле; ручное открытие — пустое (F05-11)', async () => {
    const json = '{"language":"en","mainIdea":"A"}';
    const props = {
      onCancel: vi.fn(),
      analyze,
      loadFailed: false,
      onRetryLoad: vi.fn(),
      preview: () => Promise.resolve(ok),
      onImport: vi.fn(),
    };
    const { rerender } = render(<ImportAnalysisModal isOpen initialJson={json} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    rerender(<ImportAnalysisModal isOpen={false} {...props} />);
    rerender(<ImportAnalysisModal isOpen {...props} />);
    expect(screen.getByRole('textbox', { name: 'Import analysis JSON' })).toHaveValue('');
    await flush();
  });

  it('окно заготовки с вставленным своим JSON говорит о замене целиком, а не о заготовке (Р24)', async () => {
    const prev = formFromAnalysis(null);
    prev.lists.keyQuotes = [{ text: 'Old', chapter: 1 }];
    render(
      <ImportAnalysisModal
        isOpen
        onCancel={vi.fn()}
        analyze={(text) => analyzeBookAnalysisImport(prev, text, 'en')}
        loadFailed={false}
        onRetryLoad={vi.fn()}
        preview={() => Promise.resolve(ok)}
        onImport={vi.fn()}
        initialJson='{"language":"en","keyQuotes":[{"text":"New","chapter":1}]}'
      />
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Import analysis JSON' }), {
      target: { value: '{"language":"en","keyQuotes":[{"text":"Mine","chapter":1}]}' },
    });
    expect(screen.getByText('These filled blocks will be replaced entirely:')).toBeInTheDocument();
    expect(screen.queryByText(/will be replaced by the draft/)).toBeNull();
    await flush();
  });
});
