'use client';

import { RightsNotificationsList } from '@/components/admin/rights-notifications/RightsNotificationsList/RightsNotificationsList';
import type { SupportedLang } from '@/lib/i18n/lang';

interface RightsNotificationsPageProps {
  params: {
    lang: SupportedLang;
  };
}

export default function RightsNotificationsPage({ params }: RightsNotificationsPageProps) {
  return (
    <div className="rights-notifications-page">
      <RightsNotificationsList lang={params.lang} />
    </div>
  );
}
