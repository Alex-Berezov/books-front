export const FONT_SIZES = ['sm', 'md', 'lg', 'xl'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const THEMES = ['light', 'sepia', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * The seven stops the line-height slider offers. Holding them as a list rather
 * than a raw number keeps the setting in the same shape as the font size next
 * to it: a class from a map, never an inline style.
 */
export const LINE_HEIGHTS = [1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4] as const;

/**
 * Index into `LINE_HEIGHTS`, spelled out so the class map is exhaustive: adding
 * an eighth stop without its class turns `className` into `"… undefined"` and
 * drops the line height to the default, with typecheck still green.
 */
export type LineHeightIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 1.8 is the reader's default. */
export const DEFAULT_LINE_HEIGHT_INDEX: LineHeightIndex = 3;
