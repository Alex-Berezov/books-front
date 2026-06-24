'use client';

import type { FC } from 'react';
import { AuthorForm } from '@/components/admin/authors/AuthorForm/AuthorForm';
import type { SupportedLang } from '@/lib/i18n/lang';

interface CreateAuthorPageProps {
  params: {
    lang: SupportedLang;
  };
}

const CreateAuthorPage: FC<CreateAuthorPageProps> = (props) => {
  const { params } = props;
  const { lang } = params;

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
