'use client';

import type { FC } from 'react';
import { useAuthor } from '@/api/hooks/useAuthors';
import { AuthorForm } from '@/components/admin/authors/AuthorForm/AuthorForm';
import { Skeleton } from '@/components/admin/shared';
import { isNotFoundError } from '@/lib/utils/content-failure';
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

  // `GET /admin/authors/:id` — одиночное чтение вместо поиска по первой странице
  // списка (`LEGACY-352`): отказ запроса (401/403/500) и «автора действительно
  // нет» (404) различаются самим react-query, а не одной веткой `!author`.
  // `staleTime: Infinity` и снятые автоперезапросы — не оптимизация, а защита
  // ввода: `AuthorForm` переписывает свои поля из пропа в `useEffect([author])`,
  // а react-query отдаёт новый объект на каждом успешном рефетче. С
  // `refetchOnReconnect`/`refetchOnMount` моргнувшая связь молча заменяла бы
  // десять минут правки серверной записью. После монтирования формой владеет
  // форма; свежие данные приносит сохранение.
  //
  // `isPending`, а не `isLoading`: у react-query v5 `isLoading` — это
  // `isPending && isFetching`, и при обрыве связи запрос встаёт в
  // `fetchStatus: 'paused'` — тогда все три ветки прошли бы мимо и админ
  // увидел бы пустой экран без единого слова.
  const {
    data: author,
    isPending,
    error,
  } = useAuthor(id, {
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (isPending) {
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

  // Отказ вытесняет форму, только если показывать нечего. `refetchOnReconnect`
  // (`lib/queryClient.ts`) перезапрашивает автора после моргнувшей связи, и
  // упавший повтор при живых данных размонтировал бы `AuthorForm` вместе со
  // всем, что редактор успел набрать, — назад оно не возвращается.
  if (error && !author) {
    const isNotFound = isNotFoundError(error);

    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold">
            {isNotFound ? 'Author Not Found' : 'Failed to Load Author'}
          </h2>
          <p className="text-sm mt-1">
            {isNotFound
              ? `The author with ID "${id}" could not be found or has been deleted.`
              : `The author could not be loaded: ${error.message}. Please try again.`}
          </p>
        </div>
      </div>
    );
  }

  if (!author) {
    return null;
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

      {/* Отказ поверх уже загруженных данных: форму не разбираем, но и молчать
          нельзя — редактор должен знать, что видит устаревшую запись. */}
      {error && (
        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg mb-4 text-sm">
          Could not refresh this author ({error.message}). You are looking at the last loaded
          version.
        </div>
      )}

      <AuthorForm author={author} lang={lang} />
    </div>
  );
};

export default EditAuthorPage;
