'use client';

import type { FC } from 'react';
import { useAuthors } from '@/api/hooks/useAuthors';
import { AuthorForm } from '@/components/admin/authors/AuthorForm/AuthorForm';
import { Skeleton } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';

interface EditAuthorPageProps {
  params: {
    lang: SupportedLang;
    id: string;
  };
}

const EditAuthorPage: FC<EditAuthorPageProps> = (props) => {
  const { params } = props;
  const { lang, id } = params;

  // Fetch authors list to find the matching author
  const { data, isLoading } = useAuthors({ page: 1, limit: 1000 });
  const author = data?.data.find((a) => a.id === id);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-4">
        <Skeleton variant="text" width="40%" height="40px" />
        <Skeleton variant="text" width="60%" height="20px" />
        <div className="bg-white rounded-lg p-6 space-y-6 shadow-sm">
          <Skeleton variant="text" width="100%" height="200px" />
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold">Author Not Found</h2>
          <p className="text-sm mt-1">
            The author with ID &ldquo;{id}&rdquo; could not be found or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Edit Author: {author.translations?.[0]?.name || author.slug}
        </h1>
        <p className="text-gray-600 text-sm">
          Update life dates, photo, localization translations, and SEO parameters.
        </p>
      </div>

      <AuthorForm author={author} lang={lang} />
    </div>
  );
};

export default EditAuthorPage;
