function schemaContainsType(schema: unknown, type: string): boolean {
  if (!schema || typeof schema !== 'object') return false;
  const s = schema as Record<string, unknown>;
  if (s['@type'] === type) return true;
  if (Array.isArray(s['@graph'])) {
    return (s['@graph'] as Record<string, unknown>[]).some((item) => item['@type'] === type);
  }
  return false;
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com').replace(/\/$/, '');
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

export { getSiteUrl, buildBreadcrumbJsonLd, buildItemListJsonLd, schemaContainsType };
