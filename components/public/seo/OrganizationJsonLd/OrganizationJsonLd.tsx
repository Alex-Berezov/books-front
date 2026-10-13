import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/seo/organization-jsonld';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import type { OrganizationJsonLdProps } from './OrganizationJsonLd.types';

/** Разметка организации и сайта (`product.md` F01 §9): главная и `/about`, один источник для обеих. */
export const OrganizationJsonLd = ({ lang }: OrganizationJsonLdProps) => (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildOrganizationJsonLd()) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildWebSiteJsonLd(lang)) }}
    />
  </>
);
