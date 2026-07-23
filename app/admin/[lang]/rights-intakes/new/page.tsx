import { RightsIntakeForm } from '@/components/admin/rights-intakes/RightsIntakeForm/RightsIntakeForm';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

interface NewRightsIntakePageProps {
  params: {
    lang: SupportedLang;
  };
}

export default async function NewRightsIntakePage(props: NewRightsIntakePageProps) {
  const { params } = props;
  const { lang } = params;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Rights Intake</h1>
      </div>
      <RightsIntakeForm lang={lang} />
    </div>
  );
}
