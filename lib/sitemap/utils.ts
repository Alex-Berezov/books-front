export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com').replace(/\/$/, '');
}

export function buildUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}
