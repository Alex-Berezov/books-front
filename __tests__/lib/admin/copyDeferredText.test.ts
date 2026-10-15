import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyDeferredText } from '@/lib/admin/copy-deferred-text';

class FakeClipboardItem {
  constructor(public readonly items: Record<string, Promise<Blob>>) {}
}

/** `Blob.text()` в jsdom нет — читаем через `FileReader`. */
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

const stubNavigator = (clipboard: Record<string, unknown>) =>
  vi.stubGlobal('navigator', { userAgent: 'test', clipboard });

describe('copyDeferredText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('с ClipboardItem пишет сразу, текст приходит промисом (жест пользователя не теряется)', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const write = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    stubNavigator({ write, writeText });
    let resolveText!: (value: string) => void;
    const text = new Promise<string>((resolve) => {
      resolveText = resolve;
    });

    const done = copyDeferredText(text);
    // Запись начата до того, как текст готов: это и держит жест пользователя в Safari.
    expect(write).toHaveBeenCalledTimes(1);
    resolveText('hello');
    await done;

    const item = write.mock.calls[0][0][0] as FakeClipboardItem;
    expect(await readBlob(await item.items['text/plain'])).toBe('hello');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('запись ClipboardItem отказала — запасной writeText', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ write: vi.fn().mockRejectedValue(new Error('not allowed')), writeText });

    await copyDeferredText(Promise.resolve('hello'));

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('без ClipboardItem — writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ writeText });

    await copyDeferredText(Promise.resolve('hello'));

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('отказ получения текста пробрасывается как есть, в буфер ничего не пишется', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem);
    const writeText = vi.fn();
    const failure = new Error('no data');
    stubNavigator({ write: vi.fn().mockRejectedValue(new Error('aborted')), writeText });

    await expect(copyDeferredText(Promise.reject(failure))).rejects.toBe(failure);
    expect(writeText).not.toHaveBeenCalled();
  });
});
