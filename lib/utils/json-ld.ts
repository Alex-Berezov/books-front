import { getSiteUrl } from '@/lib/seo/urls';

function schemaContainsType(schema: unknown, type: string): boolean {
  if (!schema || typeof schema !== 'object') return false;
  const matchesType = (value: unknown): boolean => {
    if (value === type) return true;
    if (Array.isArray(value)) return value.includes(type);
    return false;
  };
  const s = schema as Record<string, unknown>;
  if (matchesType(s['@type'])) return true;
  if (Array.isArray(s['@graph'])) {
    return (s['@graph'] as Record<string, unknown>[]).some((item) => matchesType(item['@type']));
  }
  return false;
}

function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
  idUrl?: string
): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const breadcrumbId = idUrl ? `${idUrl}#breadcrumb` : `${siteUrl}/#breadcrumb`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildItemListJsonLd(
  items: Array<{ name: string; url: string }>,
  idUrl?: string
): Record<string, unknown> | null {
  const siteUrl = getSiteUrl();
  const validItems = items.filter((item) => item.name && item.url);
  if (validItems.length === 0) return null;
  const listId = idUrl ? `${idUrl}#itemlist` : `${siteUrl}/#itemlist`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': listId,
    itemListElement: validItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  };
}

// `<`, `>`, `&` и разделители строк U+2028/U+2029 - записью кодов, чтобы в исходнике не было невидимых символов.
const JSON_LD_UNSAFE = new RegExp(
  `[${String.fromCharCode(0x3c, 0x3e, 0x26, 0x2028, 0x2029)}]`,
  'g'
);

// Для <script type="application/ld+json">: голый JSON.stringify пропускает `</script>` из текста админки (LEGACY-419).
function serializeJsonLd(value: unknown): string {
  // JSON.stringify(undefined) даёт undefined: пустой блок вместо падения всей страницы на `.replace`.
  const json = JSON.stringify(value) as string | undefined;
  if (json === undefined) return '';
  return json.replace(
    JSON_LD_UNSAFE,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}

export {
  getSiteUrl,
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  schemaContainsType,
  serializeJsonLd,
};
