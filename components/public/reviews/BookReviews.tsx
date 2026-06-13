'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { bookKeys } from '@/api/hooks/useBooks';
import { Button } from '@/components/common/Button';
import { StarRating } from '@/components/public/books/StarRating';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/lib/utils/toast';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ClientComment } from '@/types/api-schema';
import styles from './BookReviews.module.scss';

interface BookReviewsProps {
  bookVersionId: string;
  lang: string;
  bookSlug: string;
  bookId?: string;
  hasRated?: boolean;
}

export default function BookReviews({
  bookVersionId,
  lang,
  bookSlug,
  bookId,
  hasRated = false,
}: BookReviewsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
        rating: hasRated ? null : rating,
      });
      toast.success(t('reviews.reviewPublished'));
      setReviewText('');
      setRating(null);
      if (bookId) {
        queryClient.invalidateQueries({ queryKey: bookKeys.userRating(bookId) });
      }
    } catch {
      toast.error(t('reviews.reviewPublishFail'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('reviews.deleteConfirm'))) return;
    try {
      await deleteCommentMutation.mutateAsync(id);
      toast.success(t('reviews.commentDeleted'));
      if (bookId) {
        queryClient.invalidateQueries({ queryKey: bookKeys.userRating(bookId) });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookOverview(lang as SupportedLang, bookSlug),
      });
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
          {!hasRated && (
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
          )}
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

  // Confirmed server state for the user's current reaction
  const [userReaction, setUserReaction] = useState<{
    liked: boolean;
    isLike: boolean;
    likes: number;
    dislikes: number;
  } | null>(null);

  // Pending optimistic state (only used while mutation is in-flight)
  const [optimistic, setOptimistic] = useState<{
    liked: boolean;
    isLike: boolean;
    likes: number;
    dislikes: number;
  } | null>(null);

  // Fetch reaction counts for this comment
  const { data: likesData } = useCommentLikes('comment', comment.id);

  // Determine the source of truth: optimistic (if in-flight) > userReaction (after first toggle) > server data
  const isPending = toggleReactionMutation.isPending;
  const effectiveState = isPending && optimistic ? optimistic : (userReaction ?? null);

  const serverLikes = likesData?.likes ?? 0;
  const serverDislikes = likesData?.dislikes ?? 0;

  const currentLikes = effectiveState?.likes ?? serverLikes;
  const currentDislikes = effectiveState?.dislikes ?? serverDislikes;
  const isLiked = effectiveState?.liked === true && effectiveState?.isLike === true;
  const isDisliked = effectiveState?.liked === true && effectiveState?.isLike === false;

  const handleReact = async (isLike: boolean) => {
    if (!currentUserId) {
      router.push(`/${lang}/auth/sign-in`);
      return;
    }

    // Prevent clicks while a mutation is in-flight
    if (toggleReactionMutation.isPending) return;

    // Use confirmed state as the base for optimistic prediction
    const base = userReaction ?? {
      liked: false,
      isLike: true,
      likes: serverLikes,
      dislikes: serverDislikes,
    };

    let nextLiked: boolean;
    let nextLikes = base.likes;
    let nextDislikes = base.dislikes;

    if (base.liked) {
      if (base.isLike === isLike) {
        // Same button → toggle off (remove reaction)
        nextLiked = false;
        if (isLike) nextLikes = Math.max(0, nextLikes - 1);
        else nextDislikes = Math.max(0, nextDislikes - 1);
      } else {
        // Different button → switch reaction
        nextLiked = true;
        if (isLike) {
          nextLikes += 1;
          nextDislikes = Math.max(0, nextDislikes - 1);
        } else {
          nextLikes = Math.max(0, nextLikes - 1);
          nextDislikes += 1;
        }
      }
    } else {
      // No existing reaction → create new
      nextLiked = true;
      if (isLike) nextLikes += 1;
      else nextDislikes += 1;
    }

    const optimisticState = {
      liked: nextLiked,
      isLike,
      likes: nextLikes,
      dislikes: nextDislikes,
    };

    setOptimistic(optimisticState);

    try {
      const response = await toggleReactionMutation.mutateAsync({
        commentId: comment.id,
        isLike,
      });
      // Update confirmed state from server response
      setUserReaction({
        liked: response.liked,
        isLike: response.isLike,
        likes: response.likes,
        dislikes: response.dislikes,
      });
    } catch {
      // Rollback: clear optimistic, keep previous confirmed state
      toast.error(t('reviews.reactionFail'));
    } finally {
      setOptimistic(null);
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
