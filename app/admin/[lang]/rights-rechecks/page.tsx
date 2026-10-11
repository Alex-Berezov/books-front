'use client';

import { useParams } from 'next/navigation';
import { RightsRechecksView } from '@/components/admin/rights-rechecks/RightsRechecksView/RightsRechecksView';
import type { SupportedLang } from '@/lib/i18n/lang';

export default function RightsRechecksPage() {
  const { lang } = useParams<{ lang: SupportedLang }>();
  return (
    <div className="rights-rechecks-page">
      <RightsRechecksView lang={lang} />
    </div>
  );
}
