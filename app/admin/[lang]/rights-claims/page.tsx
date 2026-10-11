'use client';

import { useParams } from 'next/navigation';
import { RightsClaimsList } from '@/components/admin/rights-claims/RightsClaimsList/RightsClaimsList';
import type { SupportedLang } from '@/lib/i18n/lang';

export default function RightsClaimsPage() {
  const { lang } = useParams<{ lang: SupportedLang }>();
  return (
    <div className="rights-claims-page">
      <RightsClaimsList lang={lang} />
    </div>
  );
}
