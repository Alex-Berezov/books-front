/**
 * Report a swallowed error without breaking the render.
 *
 * Pages fall back to a degraded result when the API fails, and that fallback is
 * silent by design — but silent must not mean invisible: a failing count is what
 * decides whether a page declares itself empty. Kept out of production output on
 * purpose; server logs there are the deployment's concern.
 */
export const logError = (message: string, error: unknown): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};
