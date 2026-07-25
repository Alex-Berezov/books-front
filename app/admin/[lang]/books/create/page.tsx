'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SupportedLang } from '@/lib/i18n/lang';

interface CreateBookPageProps {
  params: {
    lang: SupportedLang;
  };
}

const CreateBookPage = (props: CreateBookPageProps) => {
  const { params } = props;
  const { lang } = params;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/admin/${lang}/rights-intakes/new`);
  }, [lang, router]);

  return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Redirecting to Rights Intake Creation...</h1>
      <p className="text-gray-600 mb-8">
        Books are now created from approved rights intakes. You are being redirected.
      </p>
      <Link
        href={`/admin/${lang}/rights-intakes/new`}
        className="text-blue-600 hover:text-blue-800 underline"
      >
        Go to Rights Intake Creation
      </Link>
    </div>
  );
};

export default CreateBookPage;
