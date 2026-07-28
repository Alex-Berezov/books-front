'use client';

import { RightsClaimsList } from '@/components/admin/rights-claims/RightsClaimsList/RightsClaimsList';
import type { SupportedLang } from '@/lib/i18n/lang';

interface RightsClaimsPageProps {
  params: {
    lang: SupportedLang;
  };
}

export default function RightsClaimsPage({ params }: RightsClaimsPageProps) {
  return (
    <div className="rights-claims-page">
      <RightsClaimsList lang={params.lang} />
    </div>
  );
}
