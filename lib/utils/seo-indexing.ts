export function hasIndexableContent<T>(items: T[] | undefined | null): boolean {
  return Array.isArray(items) && items.length > 0;
}

export function buildRobotsByContent(hasContent: boolean): { index: boolean; follow: boolean } {
  return hasContent ? { index: true, follow: true } : { index: false, follow: true };
}
