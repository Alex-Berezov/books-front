import type { FC } from 'react';
import type { RichTextContentProps } from './RichTextContent.types';
import styles from './RichTextContent.module.scss';

/**
 * Renders HTML authored in the admin editor.
 *
 * This is the single place in the product that puts editor HTML into the DOM.
 * Keeping it in one component means the rules every such block needs - an
 * image that cannot overflow its column, alignment that survives - are written
 * once instead of copied into every page that happens to show a description.
 * It is also the one chokepoint where sanitising the HTML would go, so that
 * work stays a one-line change in one file (`LEGACY-414`).
 *
 * 🔴 Only for HTML written by an admin through `RichTextEditor`. Text typed by
 * a reader - a review, a comment - must keep going through plain JSX so React
 * escapes it; rendering that as HTML would be an XSS hole.
 *
 * There is deliberately no `style` prop: inline styles on DOM nodes are a lint
 * error (`react/forbid-dom-props`, LEGACY-050). A caller with a value computed
 * at runtime sets it with a class instead.
 *
 * @example
 * ```tsx
 * <RichTextContent html={book.description} className={styles.description} />
 * ```
 */
export const RichTextContent: FC<RichTextContentProps> = (props) => {
  const { html, className, id } = props;

  const classes = className ? `${styles.content} ${className}` : styles.content;

  return <div id={id} className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
};
