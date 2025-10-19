import { redirect } from 'next/navigation';
import { getDefaultLang } from '@/lib/i18n/lang';

export default function RootPage() {
  const defaultLang = getDefaultLang();
  redirect(`/${defaultLang}`);
}
