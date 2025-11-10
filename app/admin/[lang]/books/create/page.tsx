'use client';

import { useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBook } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';

interface CreateBookPageProps {
  params: {
    lang: SupportedLang;
  };
}

/**
 * Страница создания новой книги
 *
 * Отображает форму для создания контейнера книги (только slug)
 */
const CreateBookPage: FC<CreateBookPageProps> = (props) => {
  const { params } = props;
  const { lang } = params;

  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBookMutation = useCreateBook();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!slug.trim()) {
      alert('Please enter a book slug');
      return;
    }

    setIsSubmitting(true);

    try {
      const newBook = await createBookMutation.mutateAsync({
        slug: slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-'),
      });

      // Перенаправляем на создание первой версии книги
      router.push(`/admin/${lang}/books/new?bookId=${newBook.id}`);
    } catch (error) {
      console.error('Failed to create book:', error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Book</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Book Slug *
            </label>
            <input
              type="text"
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. harry-potter-philosophers-stone"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            />
            <p className="mt-2 text-sm text-gray-600">
              Unique identifier for the book. Use lowercase letters, numbers, and hyphens only. This
              will be used in URLs.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !slug.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Book'}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Next Steps</h3>
          <p className="text-sm text-blue-700">
            After creating the book container, you&apos;ll be able to add book versions (different
            languages, formats, etc.) and manage categories and tags.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateBookPage;
