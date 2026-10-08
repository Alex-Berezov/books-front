'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { BookFilledIcon } from '@/components/common/icons/BookFilledIcon';
import { BookOutlinedIcon } from '@/components/common/icons/BookOutlinedIcon';
import { Skeleton, SkeletonBlock } from '@/components/common/Skeleton';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { PageBackButton } from '@/components/public/navigation';
import { pluralize, pluralFormsOf } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/utils/toast';
import type { BookshelfItemDto } from '@/types/api-schema';
import styles from './bookshelf.module.scss';
import { BookshelfCard } from './BookshelfCard';

export default function BookshelfClient() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const { t, lang: dictLang } = useTranslation();
  const lang = (params?.lang as string) || 'en';

  const page = 1;
  const limit = 20;

  // Query user bookshelf items
  const { data: bookshelfData, isLoading: isShelfLoading } = useBookshelf(page, limit, {
    enabled: status === 'authenticated',
  });

  const removeMutation = useRemoveFromBookshelf();

  // Книга, удаление которой ждёт подтверждения; `null` — окно закрыто.
  const [pendingRemoval, setPendingRemoval] = useState<{
    versionId: string;
    title: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = (versionId: string, title: string) => {
    setPendingRemoval({ versionId, title });
  };

  // Как прежний `Modal.confirm` с асинхронным `onOk`: окно ждёт ответа и закрывается
  // и после успеха, и после отказа — об исходе говорит тост.
  const confirmRemove = async () => {
    if (!pendingRemoval || isRemoving) return;
    const { versionId, title } = pendingRemoval;
    setIsRemoving(true);
    try {
      await removeMutation.mutateAsync(versionId);
      toast.success(t('bookshelf.removeSuccess', { title }));
    } catch {
      toast.error(t('bookshelf.removeFail'));
    } finally {
      setIsRemoving(false);
      setPendingRemoval(null);
    }
  };

  // Skeletons while loading session or shelf data
  if (status === 'loading' || (status === 'authenticated' && isShelfLoading)) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <SkeletonBlock className={styles.skeletonTitle} />
              <div className={styles.skeletonSubtitleRow}>
                <SkeletonBlock className={styles.skeletonSubtitle} />
              </div>
            </div>
          </div>
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton avatar rows={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated screen
  if (status === 'unauthenticated' || !session) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <PageBackButton lang={lang} />
        </div>
        <div className={styles.unauthContainer}>
          <BookFilledIcon className={styles.unauthIcon} />
          <h1 className={styles.unauthTitle}>{t('bookshelf.title')}</h1>
          <p className={styles.unauthText}>{t('bookshelf.signInPrompt')}</p>
          <div className={styles.unauthBtnGroup}>
            <Button
              variant="primary"
              size="lg"
              className={styles.signInBtn}
              onClick={() => router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/bookshelf`)}
            >
              {t('header.signIn')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className={styles.registerBtn}
              onClick={() => router.push(`/${lang}/auth/register`)}
            >
              {t('footer.createAccount')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const items = bookshelfData?.items || [];

  // Filtering bookshelf items for tabs
  const readingItems = items.filter((item) => item.bookVersion.type === 'text');
  const audioItems = items.filter((item) => item.bookVersion.type === 'audio');

  const renderGrid = (tabItems: BookshelfItemDto[]) => (
    <div className={styles.grid}>
      {tabItems.map((item) => (
        <BookshelfCard key={item.id} item={item} onRemove={handleRemove} lang={lang} />
      ))}
    </div>
  );

  const tabs: TabItem[] = [
    {
      key: 'all',
      label: `${t('bookshelf.tabs.all')} (${items.length})`,
      children: renderGrid(items),
    },
    {
      key: 'reading',
      label: `${t('bookshelf.tabs.reading')} (${readingItems.length})`,
      children: renderGrid(readingItems),
    },
    {
      key: 'audio',
      label: `${t('bookshelf.tabs.audio')} (${audioItems.length})`,
      children: renderGrid(audioItems),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <PageBackButton lang={lang} />

        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>{t('bookshelf.title')}</h1>
            <p className={styles.headerSubtitle}>
              {items.length}{' '}
              {pluralize(items.length, dictLang, pluralFormsOf(t, 'common.bookCount'))}{' '}
              {t('bookshelf.booksSaved')}
            </p>
          </div>
          <Link href={`/${lang}/catalog`} passHref legacyBehavior>
            <Button variant="secondary" className={styles.browseBtn}>
              {t('bookshelf.browseLibrary')}{' '}
              <ChevronRight size="1em" className={styles.inlineIcon} aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyContainer}>
            <BookOutlinedIcon className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>{t('bookshelf.emptyTitle')}</h2>
            <p className={styles.emptyText}>{t('bookshelf.emptyText')}</p>
            <Button
              variant="primary"
              size="lg"
              className={styles.emptyBtn}
              onClick={() => router.push(`/${lang}/catalog`)}
            >
              {t('bookshelf.exploreBooks')}
            </Button>
          </div>
        ) : (
          <Tabs items={tabs} defaultActiveKey="all" ariaLabel={t('bookshelf.title')} />
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        title={t('bookshelf.removeTitle')}
        content={
          pendingRemoval ? t('bookshelf.removeConfirm', { title: pendingRemoval.title }) : ''
        }
        confirmText={t('bookshelf.removeBtn')}
        cancelText={t('bookshelf.cancelBtn')}
        loading={isRemoving}
        danger
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
