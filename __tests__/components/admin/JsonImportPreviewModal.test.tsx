import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonImportPreviewModal } from '@/components/admin/common/JsonImportPreviewModal';
import type {
  JsonImportAnalysis,
  JsonImportResult,
} from '@/components/admin/common/JsonImportPreviewModal';

/**
 * Общее окно «Import JSON» админки (Analysis F03-1, World F08-1; круг /fix 1, п.8): итог пробы
 * привязан к тому разбору, который проверялся; подтверждение с промисом держит окно открытым
 * при отказе записи и закрывает при удаче.
 */

type Data = { v: number };
type Ok = { state: 'ok'; v: number };

const analyze = (text: string): JsonImportAnalysis<Data> => {
  try {
    return { data: JSON.parse(text) as Data, errors: [] };
  } catch {
    return { data: null, errors: [{ path: '', message: 'invalid JSON' }] };
  }
};

const flush = async (ms = 400) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

const setup = (onConfirm: (data: Data) => void | Promise<JsonImportResult>) => {
  const renderOk = vi.fn((ok: Ok) => <p>ok {ok.v}</p>);
  const onCancel = vi.fn();
  const previews = vi.fn();
  // Новая функция пробы на каждом рендере родителя — как у вкладок, чьё замыкание меняется.
  const ui = () => (
    <JsonImportPreviewModal<JsonImportAnalysis<Data>, Ok>
      isOpen
      onCancel={onCancel}
      title="Import test JSON"
      confirmText="Import"
      hint="hint"
      placeholder="{}"
      analyze={analyze}
      loadFailed={false}
      onRetryLoad={vi.fn()}
      preview={(data) => {
        previews(data);
        return Promise.resolve({ state: 'ok', v: data.v });
      }}
      renderOk={renderOk}
      onConfirm={onConfirm}
    />
  );
  const view = render(ui());
  const type = (text: string) =>
    fireEvent.change(screen.getByRole('textbox', { name: 'Import test JSON' }), {
      target: { value: text },
    });
  const confirm = () => screen.getByRole('button', { name: 'Import' });
  return { type, confirm, renderOk, onCancel, previews, rerender: () => view.rerender(ui()) };
};

describe('JsonImportPreviewModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('the ok of the previous text is never shown for a new text, not even for one render', async () => {
    const { type, confirm, renderOk } = setup(vi.fn());
    type('{"v":1}');
    await flush();
    expect(screen.getByText('ok 1')).toBeInTheDocument();
    renderOk.mockClear();
    type('{"v":2}');
    expect(renderOk).not.toHaveBeenCalled();
    expect(confirm()).toBeDisabled();
    await flush();
    expect(renderOk).toHaveBeenLastCalledWith(expect.objectContaining({ v: 2 }));
  });

  it('a refused write keeps the window open with the reason; a successful one closes it', async () => {
    const onConfirm = vi
      .fn<(data: Data) => Promise<JsonImportResult>>()
      .mockResolvedValueOnce({ ok: false, message: 'line 1\nline 2' })
      .mockResolvedValueOnce({ ok: true });
    const { type, confirm, onCancel } = setup(onConfirm);
    type('{"v":1}');
    await flush();
    await act(async () => {
      fireEvent.click(confirm());
    });
    expect(screen.getByText('line 1')).toBeInTheDocument();
    expect(screen.getByText('line 2')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(confirm());
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('a rejected write promise resets saving and shows the reason, no unhandled rejection', async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error('network down')));
    const { type, confirm, onCancel } = setup(onConfirm);
    type('{"v":1}');
    await flush();
    await act(async () => {
      fireEvent.click(confirm());
    });
    expect(screen.getByText('network down')).toBeInTheDocument();
    expect(confirm()).toBeEnabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('a new preview function from the parent does not rerun the dry run nor clear the write error', async () => {
    const onConfirm = vi.fn(() => Promise.resolve({ ok: false as const, message: 'refused' }));
    const { type, confirm, previews, rerender } = setup(onConfirm);
    type('{"v":1}');
    await flush();
    expect(previews).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(confirm());
    });
    expect(screen.getByText('refused')).toBeInTheDocument();
    rerender();
    await flush();
    expect(previews).toHaveBeenCalledTimes(1);
    expect(screen.getByText('refused')).toBeInTheDocument();
    // Новый текст — новая проба.
    type('{"v":2}');
    await flush();
    expect(previews).toHaveBeenCalledTimes(2);
  });
});
