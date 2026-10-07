import type { ReactNode } from 'react';

/**
 * One chapter as the reader shows it. The public `reader-bootstrap` chapter and
 * the admin `ChapterDetail` both fit: the admin list leaves title and content
 * optional, so the view treats them as optional too.
 */
export interface ReaderViewChapter {
  id: string;
  title?: string;
  content?: string;
}

export interface ReaderViewProps {
  /** Book title in the header. */
  title?: string;
  /** Chapters in reading order. */
  chapters: ReaderViewChapter[];
  /** Index of the chapter on screen. The caller owns it: the public reader restores and saves it. */
  currentChapterIndex: number;
  /** Called on prev/next and on a pick from the table of contents. */
  onChapterChange: (index: number) => void;
  /** The header's back arrow. */
  onBack: () => void;
  /** Optional strip between the header and the text, e.g. the admin draft notice. */
  notice?: ReactNode;
}
