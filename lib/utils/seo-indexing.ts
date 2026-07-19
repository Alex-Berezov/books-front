export function hasIndexableContent<T>(items: T[] | undefined | null): boolean {
  return Array.isArray(items) && items.length > 0;
}

export function buildRobotsByContent(hasContent: boolean): { index: boolean; follow: boolean } {
  return hasContent ? { index: true, follow: true } : { index: false, follow: true };
}

export function shouldNoindexPaginatedPage(
  requestedPage: number,
  totalItems: number,
  pageSize: number
): boolean {
  if (requestedPage <= 1) return false;
  if (totalItems === 0) return true;
  const totalPages = Math.ceil(totalItems / pageSize);
  return requestedPage > totalPages;
}
