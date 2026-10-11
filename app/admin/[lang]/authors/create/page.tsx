'use client';

import type { FC } from 'react';
import { useParams } from 'next/navigation';
import { AuthorForm } from '@/components/admin/authors/AuthorForm/AuthorForm';
import type { SupportedLang } from '@/lib/i18n/lang';

const CreateAuthorPage: FC = () => {
  const { lang } = useParams<{ lang: SupportedLang }>();

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Author</h1>
        <p className="text-gray-600 text-sm">
          Add details, life dates, translations, and SEO tags for the author.
        </p>
      </div>

      <AuthorForm lang={lang} />
    </div>
  );
};

export default CreateAuthorPage;
