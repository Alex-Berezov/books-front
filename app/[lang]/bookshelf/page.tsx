/**
 * User Bookshelf Page
 *
 * Displays books added to the user's personal shelf, categorized by tabs:
 * All, In Progress (reading/listening progress exists), and Audiobooks.
 */

'use client';

import type { FC } from 'react';
import {
  BookOutlined,
  BookFilled,
  DeleteOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Tabs, Badge, Skeleton, Modal, message } from 'antd';
import { Headphones } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { useProgress } from '@/api/hooks/useProgress';
import { Button } from '@/components/common/Button';
import type { BookshelfItemDto } from '@/api/endpoints/bookshelf';
import styles from './bookshelf.module.scss';

// Single item card on the bookshelf
interface BookshelfCardProps {
  item: BookshelfItemDto;
  onRemove: (versionId: string, title: string) => void;
  lang: string;
}

const BookshelfCard: FC<BookshelfCardProps> = ({ item, onRemove, lang }) => {
  const version = item.bookVersion;
  const bookSlug = version.book?.slug || version.bookId;

  // Query progress for this specific version
  const { data: progress } = useProgress(version.id, {
    enabled: !!version.id,
  });

  const isAudio = version.type === 'audio';

  // Calculate percentage
  let progressPct = 0;
  let progressLabel = '';

  if (progress) {
    if (isAudio) {
      const minutes = Math.floor(progress.position / 60);
      const seconds = Math.floor(progress.position % 60);
      progressLabel = progress.audioChapterNumber
        ? `Ch. ${progress.audioChapterNumber} • ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;
      progressPct = 50; // default indicator for audiobooks in progress
    } else {
      progressPct = Math.min(100, Math.round(progress.position * 100));
      progressLabel = progress.chapterNumber
        ? `Ch. ${progress.chapterNumber} • ${progressPct}%`
        : `${progressPct}%`;
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(version.id, version.title);
  };

  return (
    <div className={styles.card}>
      <Link href={`/${lang}/book/${bookSlug}`} className={styles.coverLink}>
        <div
          className={styles.cover}
          style={{
            backgroundColor: '#4a7c59',
            backgroundImage: version.coverImageUrl ? `url(${version.coverImageUrl})` : 'none',
          }}
        >
          {!version.coverImageUrl && (
            <span className={styles.coverLetter}>{version.title?.[0]}</span>
          )}
        </div>
      </Link>

      <div className={styles.cardInfo}>
        <h3 className={styles.cardTitle}>
          <Link href={`/${lang}/book/${bookSlug}`}>{version.title}</Link>
        </h3>
        <p className={styles.cardAuthor}>{version.author}</p>

        <div className={styles.badgeGroup}>
          {isAudio ? (
            <Badge
              count={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Headphones size={12} />
                  Audiobook
                </span>
              }
              className={styles.badge}
              style={{ backgroundColor: '#c89f55', color: '#fff' }}
            />
          ) : (
            <Badge
              count={
                <span>
                  <BookOutlined style={{ marginRight: 4 }} />
                  Text
                </span>
              }
              className={styles.badge}
              style={{ backgroundColor: '#263f2e', color: '#fff' }}
            />
          )}

          {version.isFree && (
            <Badge
              count="Free"
              className={styles.badge}
              style={{ backgroundColor: '#52c41a', color: '#fff' }}
            />
          )}
        </div>

        {progress && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>Reading Progress</span>
              <span>{progressLabel}</span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                backgroundColor: 'rgba(0,0,0,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${isAudio ? 100 : progressPct}%`,
                  height: '100%',
                  backgroundColor: isAudio ? '#c89f55' : 'var(--public-primary)',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {isAudio ? (
            <Link href={`/${lang}/listen/${bookSlug}/${version.id}`} passHref legacyBehavior>
              <Button
                variant="primary"
                size="sm"
                className={`${styles.actionBtn} ${styles.continueBtn}`}
              >
                <PlayCircleOutlined /> Listen
              </Button>
            </Link>
          ) : (
            <Link href={`/${lang}/read/${bookSlug}/${version.id}`} passHref legacyBehavior>
              <Button
                variant="primary"
                size="sm"
                className={`${styles.actionBtn} ${styles.continueBtn}`}
              >
                <BookOutlined /> {progress ? 'Continue Reading' : 'Start Reading'}
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            variant="ghost"
            leftIcon={<DeleteOutlined />}
            className={styles.removeBtn}
            onClick={handleRemoveClick}
          />
        </div>
      </div>
    </div>
  );
};

export default function BookshelfPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const lang = (params?.lang as string) || 'en';

  const page = 1;
  const limit = 20;

  // Query user bookshelf items
  const { data: bookshelfData, isLoading: isShelfLoading } = useBookshelf(page, limit, {
    enabled: status === 'authenticated',
  });

  const removeMutation = useRemoveFromBookshelf();

  const handleRemove = (versionId: string, title: string) => {
    Modal.confirm({
      title: 'Remove from Bookshelf?',
      content: `Are you sure you want to remove "${title}" from your bookshelf? Your reading progress will be preserved.`,
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await removeMutation.mutateAsync(versionId);
          message.success(`Removed "${title}" from bookshelf`);
        } catch {
          message.error('Failed to remove book from bookshelf');
        }
      },
    });
  };

  // Skeletons while loading session or shelf data
  if (status === 'loading' || (status === 'authenticated' && isShelfLoading)) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <Skeleton.Button active style={{ width: 200, height: 32 }} />
              <div style={{ marginTop: 8 }}>
                <Skeleton.Button active style={{ width: 120, height: 16 }} />
              </div>
            </div>
          </div>
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton
                  active
                  avatar={{ size: 'large', shape: 'square' }}
                  paragraph={{ rows: 2 }}
                />
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
        <div className={styles.unauthContainer}>
          <BookFilled className={styles.unauthIcon} />
          <h1 className={styles.unauthTitle}>Your Bookshelf</h1>
          <p className={styles.unauthText}>
            Sign in to access your personal bookshelf, track your reading progress, and pick up
            where you left off.
          </p>
          <div className={styles.unauthBtnGroup}>
            <Button
              variant="primary"
              size="lg"
              className={styles.signInBtn}
              onClick={() => router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/bookshelf`)}
            >
              Sign In
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className={styles.registerBtn}
              onClick={() => router.push(`/${lang}/auth/register`)}
            >
              Create Account
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

  const tabItems = [
    {
      key: 'all',
      label: `All (${items.length})`,
      children: (
        <div className={styles.grid}>
          {items.map((item) => (
            <BookshelfCard key={item.id} item={item} onRemove={handleRemove} lang={lang} />
          ))}
        </div>
      ),
    },
    {
      key: 'reading',
      label: `Text Books (${readingItems.length})`,
      children: (
        <div className={styles.grid}>
          {readingItems.map((item) => (
            <BookshelfCard key={item.id} item={item} onRemove={handleRemove} lang={lang} />
          ))}
        </div>
      ),
    },
    {
      key: 'audio',
      label: `Audiobooks (${audioItems.length})`,
      children: (
        <div className={styles.grid}>
          {audioItems.map((item) => (
            <BookshelfCard key={item.id} item={item} onRemove={handleRemove} lang={lang} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>My Bookshelf</h1>
            <p className={styles.headerSubtitle}>
              {items.length} {items.length === 1 ? 'book' : 'books'} saved on your shelf
            </p>
          </div>
          <Link href={`/${lang}/catalog`} passHref legacyBehavior>
            <Button variant="secondary" className={styles.browseBtn}>
              Browse Library <RightOutlined />
            </Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyContainer}>
            <BookOutlined className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>Your bookshelf is empty</h2>
            <p className={styles.emptyText}>
              Start building your personal library by adding books you want to read or listen to
              from our catalog.
            </p>
            <Button
              variant="primary"
              size="lg"
              className={styles.emptyBtn}
              onClick={() => router.push(`/${lang}/catalog`)}
            >
              Explore Books
            </Button>
          </div>
        ) : (
          <Tabs defaultActiveKey="all" items={tabItems} />
        )}
      </div>
    </div>
  );
}
