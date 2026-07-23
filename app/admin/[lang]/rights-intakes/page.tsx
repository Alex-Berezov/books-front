import { RightsIntakeList } from '@/components/admin/rights-intakes/RightsIntakeList/RightsIntakeList';
import type { SupportedLang } from '@/lib/i18n/lang';

interface RightsIntakesPageProps {
  params: {
    lang: SupportedLang;
  };
}

export default async function RightsIntakesPage(props: RightsIntakesPageProps) {
  const { params } = props;
  const { lang } = params;

  return (
    <div className="rights-intakes-page">
      <RightsIntakeList lang={lang} />
    </div>
  );
}
