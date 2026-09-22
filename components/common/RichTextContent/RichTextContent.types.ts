export interface RichTextContentProps {
  /** HTML produced by the admin `RichTextEditor`. */
  html: string;
  /** Page-specific class; the caller keeps its own typography and spacing. */
  className?: string;
  /** DOM id, for callers that point `aria-controls` at this block. */
  id?: string;
}
