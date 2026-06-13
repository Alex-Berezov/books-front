'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  useBookComments,
  useCreateBookComment,
  useDeleteBookComment,
  useToggleCommentReaction,
  useCommentLikes,
} from '@/api/hooks/useBookComments';
import { Button } from '@/components/common/Button';
import { StarRating } from '@/components/public/books/StarRating';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/utils/toast';
import type { ClientComment } from '@/types/api-schema';
import styles from './BookReviews.module.scss';

interface BookReviewsProps {
  bookVersionId: string;
  lang: string;
  bookSlug: string;
}

export default function BookReviews({ bookVersionId, lang, bookSlug }: BookReviewsProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const isAuthenticated = status === 'authenticated';

  const [sortBy, setSortBy] = useState<'date' | 'popularity'>('popularity');
  const [page, setPage] = useState(1);
  const limit = 10;

  // React Query query for comments list
  const { data, isLoading } = useBookComments({
    target: 'version',
    targetId: bookVersionId,
    page,
    limit,
    sortBy,
  });

  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');

  const createCommentMutation = useCreateBookComment();
  const deleteCommentMutation = useDeleteBookComment();

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    if (!reviewText.trim()) {
      toast.error(t('reviews.enterReviewText'));
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        bookVersionId,
        text: reviewText.trim(),
        rating,
      });
      toast.success(t('reviews.reviewPublished'));
      setReviewText('');
      setRating(null);
    } catch {
      toast.error(t('reviews.reviewPublishFail'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('reviews.deleteConfirm'))) return;
    try {
      await deleteCommentMutation.mutateAsync(id);
      toast.success(t('reviews.commentDeleted'));
    } catch {
      toast.error(t('reviews.commentDeleteFail'));
    }
  };

  const handleSignInRedirect = () => {
    router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/book/${bookSlug}`);
  };

  const comments = data?.items || [];
  const hasNext = data?.hasNext || false;

  return (
    <div className={styles.reviewsSection}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>
          {t('reviews.title')} <span className={styles.countBadge}>{data?.total || 0}</span>
        </h2>

        <div className={styles.controls}>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'date' | 'popularity');
              setPage(1);
            }}
          >
            <option value="popularity">{t('reviews.sortByPopular')}</option>
            <option value="date">{t('reviews.sortByNew')}</option>
          </select>
        </div>
      </div>

      {/* Review input form */}
      {isAuthenticated ? (
        <form onSubmit={handleCreateReview} className={styles.reviewForm}>
          <div className={styles.ratingFormRow}>
            <span className={styles.ratingLabel}>{t('reviews.rating')}:</span>
            <StarRating
              rating={rating ?? 0}
              size="md"
              showCount={false}
              interactive
              onRate={(val) => setRating(val)}
            />
          </div>
          <div className={styles.textareaWrapper}>
            <textarea
              className={styles.textarea}
              placeholder={t('reviews.placeholder')}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={createCommentMutation.isPending || !reviewText.trim()}
              className={styles.submitBtn}
            >
              {createCommentMutation.isPending ? (
                <Loader2 className={styles.spinner} size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.authBanner}>
          <p>{t('reviews.signInToRate')}</p>
          <Button variant="secondary" onClick={handleSignInRedirect}>
            {t('reviews.signIn')}
          </Button>
        </div>
      )}

      {/* Reviews list */}
      {isLoading && page === 1 ? (
        <div className={styles.loadingList}>
          <Loader2 className={styles.mainSpinner} />
        </div>
      ) : comments.length > 0 ? (
        <div className={styles.reviewsList}>
          {comments.map((comment) => (
            <ReviewItem
              key={comment.id}
              comment={comment}
              lang={lang}
              onDelete={handleDelete}
              bookVersionId={bookVersionId}
              currentUserId={session?.user?.id}
              currentUserRoles={session?.user?.roles}
            />
          ))}

          {hasNext && (
            <button
              className={styles.loadMoreBtn}
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className={styles.spinner} size={16} /> : t('reviews.loadMore')}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.noComments}>{t('reviews.noComments')}</div>
      )}
    </div>
  );
}

interface ReviewItemProps {
  comment: ClientComment;
  lang: string;
  onDelete: (id: string) => void;
  bookVersionId: string;
  currentUserId?: string;
  currentUserRoles?: string[];
  isReply?: boolean;
}

function ReviewItem({
  comment,
  lang,
  onDelete,
  bookVersionId,
  currentUserId,
  currentUserRoles,
  isReply = false,
}: ReviewItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const toggleReactionMutation = useToggleCommentReaction();
  const createCommentMutation = useCreateBookComment();

  // Optimistic reactions
  const [reactionOverride, setReactionOverride] = useState<{
    liked: boolean;
    isLike: boolean;
    likesOffset: number;
    dislikesOffset: number;
  } | null>(null);

  // Fetch reaction counts for this comment
  const { data: likesData } = useCommentLikes('comment', comment.id);

  // Use optimistic offsets only while mutation is pending
  const isPending = toggleReactionMutation.isPending;

  const currentLikes =
    isPending && reactionOverride
      ? Math.max(0, (likesData?.likes ?? 0) + reactionOverride.likesOffset)
      : (likesData?.likes ?? 0);

  const currentDislikes =
    isPending && reactionOverride
      ? Math.max(0, (likesData?.dislikes ?? 0) + reactionOverride.dislikesOffset)
      : (likesData?.dislikes ?? 0);

  const isLiked = reactionOverride?.liked && reactionOverride?.isLike;
  const isDisliked = reactionOverride?.liked && !reactionOverride?.isLike;

  const handleReact = async (isLike: boolean) => {
    if (!currentUserId) {
      router.push(`/${lang}/auth/sign-in`);
      return;
    }

    // Determine target changes for optimistic updates
    let likesOffset = 0;
    let dislikesOffset = 0;
    let nextLiked = true;

    if (reactionOverride && reactionOverride.liked) {
      if (reactionOverride.isLike === isLike) {
        // Toggle off
        nextLiked = false;
        if (isLike) likesOffset = -1;
        else dislikesOffset = -1;
      } else {
        // Toggle switch
        if (isLike) {
          likesOffset = 1;
          dislikesOffset = -1;
        } else {
          likesOffset = -1;
          dislikesOffset = 1;
        }
      }
    } else {
      // First reaction
      if (isLike) likesOffset = 1;
      else dislikesOffset = 1;
    }

    setReactionOverride({
      liked: nextLiked,
      isLike,
      likesOffset,
      dislikesOffset,
    });

    try {
      await toggleReactionMutation.mutateAsync({
        commentId: comment.id,
        isLike,
      });
    } catch {
      // Rollback
      setReactionOverride(null);
      toast.error(t('reviews.reactionFail'));
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        bookVersionId,
        parentId: comment.id,
        text: replyText.trim(),
      });
      toast.success(t('reviews.replyAdded'));
      setReplyText('');
      setShowReplyForm(false);
    } catch {
      toast.error(t('reviews.replyAddFail'));
    }
  };

  const formattedDate = new Date(comment.createdAt).toLocaleDateString(
    lang === 'ru' ? 'ru-RU' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const displayName = comment.user?.nickname || comment.user?.name || 'User';
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className={`${styles.reviewItem} ${isReply ? styles.replyItem : ''}`}>
      <div className={styles.itemHeader}>
        <div className={styles.authorInfo}>
          {comment.user?.avatarUrl ? (
            <Image
              src={comment.user.avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className={styles.avatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatarPlaceholder}>{initialLetter}</div>
          )}
          <div className={styles.authorMeta}>
            <span className={styles.authorName}>{displayName}</span>
            <span className={styles.date}>{formattedDate}</span>
          </div>
        </div>

        {comment.ratingScore && (
          <div className={styles.rating}>
            <StarRating rating={comment.ratingScore} size="sm" showCount={false} />
          </div>
        )}
      </div>

      <p className={styles.commentText}>{comment.text}</p>

      <div className={styles.itemActions}>
        <button
          onClick={() => handleReact(true)}
          className={`${styles.actionBtn} ${isLiked ? styles.activeLike : ''}`}
        >
          <ThumbsUp size={14} />
          <span>{currentLikes}</span>
        </button>

        <button
          onClick={() => handleReact(false)}
          className={`${styles.actionBtn} ${isDisliked ? styles.activeDislike : ''}`}
        >
          <ThumbsDown size={14} />
          <span>{currentDislikes}</span>
        </button>

        {!isReply && (
          <button onClick={() => setShowReplyForm(!showReplyForm)} className={styles.actionBtn}>
            <MessageSquare size={14} />
            <span>{t('reviews.reply')}</span>
          </button>
        )}

        {((currentUserId && currentUserId === comment.user?.id) ||
          currentUserRoles?.includes('admin') ||
          currentUserRoles?.includes('content_manager')) && (
          <button onClick={() => onDelete(comment.id)} className={styles.deleteBtn}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Inline reply form */}
      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className={styles.replyForm}>
          <textarea
            className={styles.replyTextarea}
            placeholder={t('reviews.replyPlaceholder')}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            maxLength={1000}
          />
          <div className={styles.replyFormActions}>
            <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>
              {t('reviews.cancel')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              loading={createCommentMutation.isPending}
              disabled={!replyText.trim()}
            >
              {t('reviews.submit')}
            </Button>
          </div>
        </form>
      )}

      {/* Nested Replies Rendering */}
      {comment.children && comment.children.length > 0 && (
        <div className={styles.replies}>
          {comment.children.map((child) => (
            <ReviewItem
              key={child.id}
              comment={child}
              lang={lang}
              onDelete={onDelete}
              bookVersionId={bookVersionId}
              currentUserId={currentUserId}
              currentUserRoles={currentUserRoles}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
