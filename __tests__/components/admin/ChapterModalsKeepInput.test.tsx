import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AudioChapterModal } from '@/components/admin/books/ListenContentTab/AudioChapterModal';
import { ChapterModal } from '@/components/admin/books/ReadContentTab/ChapterModal';
import type { AudioChapter, Chapter } from '@/types/api-schema';

vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));

vi.mock('@/components/admin/books/ListenContentTab/AudioPicker', () => ({
  AudioPicker: () => null,
}));

const chapter: Chapter = {
  id: 'c1',
  bookVersionId: 'v1',
  number: 1,
  title: 'Saved title',
  content: '<p>text</p>',
  createdAt: '2026-10-07T00:00:00.000Z',
};

const audioChapter: AudioChapter = {
  id: 'a1',
  bookVersionId: 'v1',
  number: 1,
  title: 'Saved title',
  audioUrl: 'https://cdn.example.com/a.mp3',
  mediaId: null,
  duration: 60,
  description: null,
  transcript: null,
  createdAt: '2026-10-07T00:00:00.000Z',
  updatedAt: '2026-10-07T00:00:00.000Z',
};

interface ViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  nextChapterNumber?: number;
  /** Edit mode: the id and title of the chapter passed as initialData. */
  withData?: boolean | { id: string; title: string };
}

const dataFor = <T extends { id: string; title?: string }>(
  base: T,
  withData: ViewProps['withData']
): T | undefined => {
  if (!withData) return undefined;
  return withData === true ? { ...base } : { ...base, ...withData };
};

const chapterView = ({ withData, ...props }: ViewProps) => (
  <ChapterModal {...props} initialData={dataFor(chapter, withData)} />
);
const audioChapterView = ({ withData, ...props }: ViewProps) => (
  <AudioChapterModal {...props} initialData={dataFor(audioChapter, withData)} />
);

const titleInput = () => screen.getAllByRole('textbox')[0];
const numberInput = () => screen.getByRole('spinbutton');

/**
 * Both chapter forms keep the typed input (LEGACY-439): a failed save (the hook catches the
 * error and the promise resolves) does not close the dialog, and a refetched chapter list
 * while the dialog is open does not reset the form. The form still resets on reopening, and
 * an untouched number of a new chapter follows the list.
 */
describe.each([
  ['ChapterModal', chapterView],
  ['AudioChapterModal', audioChapterView],
] as const)('%s keeps input', (_name, view) => {
  const baseProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  });

  it.each([
    ['edit', true, 'Save Changes', 'Saved title edited'],
    ['create', false, 'Create Chapter', ' edited'],
  ] as const)(
    'stays open with the typed text after onSubmit resolves (%s)',
    async (_mode, withData, confirm, expected) => {
      const user = userEvent.setup();
      const props = baseProps();
      render(view({ ...props, withData }));

      await user.type(titleInput(), ' edited');
      await user.click(screen.getByRole('button', { name: confirm }));

      if (withData) {
        await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
      } else {
        // A new audio chapter has no file in the stubbed picker and fails validation;
        // either way the dialog must stay open with the text.
        await waitFor(() => expect(titleInput()).toHaveValue(expected));
      }
      expect(props.onClose).not.toHaveBeenCalled();
      expect(titleInput()).toHaveValue(expected);
    }
  );

  it('keeps typed text and follows an untouched number when the list refetches', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = render(view({ ...props, nextChapterNumber: 3 }));

    await user.type(titleInput(), 'typed text');
    rerender(view({ ...props, nextChapterNumber: 4 }));

    expect(titleInput()).toHaveValue('typed text');
    await waitFor(() => expect(numberInput()).toHaveValue(4));
  });

  it('does not overwrite a number the user typed', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = render(view({ ...props, nextChapterNumber: 3 }));

    await user.clear(numberInput());
    await user.type(numberInput(), '10');
    rerender(view({ ...props, nextChapterNumber: 4 }));

    expect(numberInput()).toHaveValue(10);
  });

  it('does not overwrite a typed number equal to the opening one', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = render(view({ ...props, nextChapterNumber: 3 }));

    rerender(view({ ...props, nextChapterNumber: 4 }));
    await waitFor(() => expect(numberInput()).toHaveValue(4));
    await user.clear(numberInput());
    await user.type(numberInput(), '3');
    rerender(view({ ...props, nextChapterNumber: 5 }));

    expect(numberInput()).toHaveValue(3);
  });

  it('keeps edits when the edited chapter object is replaced while open', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = render(view({ ...props, withData: true }));

    await user.type(titleInput(), ' edited');
    rerender(view({ ...props, withData: true, nextChapterNumber: 9 }));

    expect(titleInput()).toHaveValue('Saved title edited');
    expect(numberInput()).toHaveValue(1);
  });

  it('resets to another chapter passed while open', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = render(view({ ...props, withData: true }));

    await user.type(titleInput(), ' edited');
    rerender(view({ ...props, withData: { id: 'other', title: 'Other chapter' } }));

    await waitFor(() => expect(titleInput()).toHaveValue('Other chapter'));
  });

  it('resets to the new data on reopening', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const { rerender } = render(view({ ...props, withData: true }));

    await user.type(titleInput(), ' edited');
    rerender(view({ ...props, isOpen: false, withData: true }));
    rerender(view({ ...props, nextChapterNumber: 7 }));

    expect(titleInput()).toHaveValue('');
    expect(numberInput()).toHaveValue(7);
  });
});
