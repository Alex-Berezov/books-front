'use client';

import { useParams } from 'next/navigation';
import { RightsNotificationsList } from '@/components/admin/rights-notifications/RightsNotificationsList/RightsNotificationsList';
import type { SupportedLang } from '@/lib/i18n/lang';

export default function RightsNotificationsPage() {
  const { lang } = useParams<{ lang: SupportedLang }>();
  return (
    <div className="rights-notifications-page">
      <RightsNotificationsList lang={lang} />
    </div>
  );
}
