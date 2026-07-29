'use client';

import { RightsRechecksView } from '@/components/admin/rights-rechecks/RightsRechecksView/RightsRechecksView';
import type { SupportedLang } from '@/lib/i18n/lang';

interface RightsRechecksPageProps {
  params: {
    lang: SupportedLang;
  };
}

export default function RightsRechecksPage({ params }: RightsRechecksPageProps) {
  return (
    <div className="rights-rechecks-page">
      <RightsRechecksView lang={params.lang} />
    </div>
  );
}
