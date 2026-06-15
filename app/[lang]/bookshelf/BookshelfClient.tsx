'use client';

import type { FC } from 'react';
import {
  BookOutlined,
  BookFilled,
  DeleteOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Tabs, Skeleton, Modal, message } from 'antd';
import { Headphones } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { useProgress } from '@/api/hooks/useProgress';
import { Button } from '@/components/common/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
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
  const { t } = useTranslation();

  // Query progress for this specific version
  const { data: progress } = useProgress(version.id, {
    enabled: !!version.id,
  });

  const isAudio = version.type === 'audio';

  // Calculate percentage
  let progressPct = 0;
  let progressLabel = '';

  const chapterAbbr = lang === 'en' || lang === 'fr' ? 'Ch.' : 'Cap.';

  if (progress) {
    if (isAudio) {
      const minutes = Math.floor(progress.position / 60);
      const seconds = Math.floor(progress.position % 60);
      progressLabel = progress.audioChapterNumber
        ? `${chapterAbbr} ${progress.audioChapterNumber} • ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;
      progressPct = 50; // default indicator for audiobooks in progress
    } else {
      const chaptersCount = version.chaptersCount || 0;
      const chapterIndex = (progress.chapterNumber || 1) - 1;
      const positionOffset = typeof progress.position === 'number' ? progress.position : 0;
      progressPct =
        chaptersCount > 0
          ? Math.min(100, Math.round(((chapterIndex + positionOffset) / chaptersCount) * 100))
          : 0;
      progressLabel = progress.chapterNumber
        ? `${chapterAbbr} ${progress.chapterNumber} • ${progressPct}%`
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
            <span className={styles.badge} style={{ backgroundColor: '#c89f55', color: '#fff' }}>
              <Headphones size={12} />
              {t('bookshelf.card.audiobook')}
            </span>
          ) : (
            <span className={styles.badge} style={{ backgroundColor: '#263f2e', color: '#fff' }}>
              <BookOutlined />
              {t('bookshelf.card.text')}
            </span>
          )}

          {version.isFree && (
            <span className={styles.badge} style={{ backgroundColor: '#52c41a', color: '#fff' }}>
              {t('bookshelf.card.free')}
            </span>
          )}
        </div>

        {progress && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>{t('bookshelf.card.readingProgress')}</span>
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
                <PlayCircleOutlined /> {t('bookshelf.card.listen')}
              </Button>
            </Link>
          ) : (
            <Link href={`/${lang}/read/${bookSlug}/${version.id}`} passHref legacyBehavior>
              <Button
                variant="primary"
                size="sm"
                className={`${styles.actionBtn} ${styles.continueBtn}`}
              >
                <BookOutlined />{' '}
                {progress ? t('bookshelf.card.continue') : t('bookshelf.card.start')}
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

export default function BookshelfClient() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
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
      title: t('bookshelf.removeTitle'),
      content: t('bookshelf.removeConfirm', { title }),
      okText: t('bookshelf.removeBtn'),
      okType: 'danger',
      cancelText: t('bookshelf.cancelBtn'),
      onOk: async () => {
        try {
          await removeMutation.mutateAsync(versionId);
          message.success(t('bookshelf.removeSuccess', { title }));
        } catch {
          message.error(t('bookshelf.removeFail'));
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
          <h1 className={styles.unauthTitle}>{t('bookshelf.title')}</h1>
          <p className={styles.unauthText}>
            {lang === 'ru'
              ? 'Войдите, чтобы получить доступ к своей книжной полке, отслеживать прогресс чтения и продолжать с того места, где остановились.'
              : lang === 'es'
                ? 'Inicie sesión para acceder a su estantería personal, realizar un seguimiento de su progreso de leitura y continuar donde lo dejó.'
                : lang === 'fr'
                  ? 'Connectez-vous pour accéder à votre bibliothèque personnelle, suivre votre progression de lecture et reprendre là où vous vous étiez arrêté.'
                  : lang === 'pt'
                    ? 'Faça login para acessar sua estante pessoal, acompanhar seu progresso de leitura e continuar de onde parou.'
                    : 'Sign in to access your personal bookshelf, track your reading progress, and pick up where you left off.'}
          </p>
          <div className={styles.unauthBtnGroup}>
            <Button
              variant="primary"
              size="lg"
              className={styles.signInBtn}
              onClick={() => router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/bookshelf`)}
            >
              {t('bookshelf.card.listen')
                .replace('Listen', 'Sign In')
                .replace('Escuchar', 'Iniciar Sesión')
                .replace('Écouter', 'Se Connecter')
                .replace('Ouvir', 'Entrar')}
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

  const tabItems = [
    {
      key: 'all',
      label: `${t('bookshelf.tabs.all')} (${items.length})`,
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
      label: `${t('bookshelf.tabs.reading')} (${readingItems.length})`,
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
      label: `${t('bookshelf.tabs.audio')} (${audioItems.length})`,
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
            <h1 className={styles.headerTitle}>{t('bookshelf.title')}</h1>
            <p className={styles.headerSubtitle}>
              {items.length} {items.length === 1 ? 'book' : 'books'} {t('bookshelf.booksSaved')}
            </p>
          </div>
          <Link href={`/${lang}/catalog`} passHref legacyBehavior>
            <Button variant="secondary" className={styles.browseBtn}>
              {t('bookshelf.browseLibrary')} <RightOutlined />
            </Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyContainer}>
            <BookOutlined className={styles.emptyIcon} />
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
          <Tabs defaultActiveKey="all" items={tabItems} />
        )}
      </div>
    </div>
  );
}
