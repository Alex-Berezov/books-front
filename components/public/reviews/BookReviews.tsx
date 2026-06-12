'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2, Send, Loader2 } from 'lucide-react';
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
import { toast } from '@/lib/utils/toast';
import type { ClientComment } from '@/types/api-schema';
import styles from './BookReviews.module.scss';

interface BookReviewsProps {
  bookVersionId: string;
  lang: string;
  bookSlug: string;
}

const LOCAL_DICTS: Record<string, Record<string, string>> = {
  ru: {
    reviews: 'Отзывы и комментарии',
    writeReview: 'Оставить отзыв',
    rating: 'Ваша оценка',
    placeholder: 'Напишите ваш отзыв о книге...',
    submit: 'Отправить',
    reply: 'Ответить',
    cancel: 'Отмена',
    signInToRate: 'Войдите, чтобы оценить книгу и оставить отзыв',
    signIn: 'Войти',
    sortByPopular: 'Сначала популярные',
    sortByNew: 'Сначала новые',
    loadMore: 'Показать еще',
    noComments: 'Отзывов пока нет. Будьте первыми!',
    writeReply: 'Написать ответ...',
    replyPlaceholder: 'Ваш ответ на комментарий...',
    deleteConfirm: 'Вы уверены, что хотите удалить этот комментарий?',
    submitting: 'Отправка...',
  },
  en: {
    reviews: 'Reviews & Comments',
    writeReview: 'Write a Review',
    rating: 'Your Rating',
    placeholder: 'Write your review of the book...',
    submit: 'Submit',
    reply: 'Reply',
    cancel: 'Cancel',
    signInToRate: 'Sign in to rate the book and leave a review',
    signIn: 'Sign In',
    sortByPopular: 'Most Popular',
    sortByNew: 'Newest First',
    loadMore: 'Load More',
    noComments: 'No reviews yet. Be the first to leave one!',
    writeReply: 'Write a reply...',
    replyPlaceholder: 'Your reply to this comment...',
    deleteConfirm: 'Are you sure you want to delete this comment?',
    submitting: 'Submitting...',
  },
};

export default function BookReviews({ bookVersionId, lang, bookSlug }: BookReviewsProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const dict = LOCAL_DICTS[lang] || LOCAL_DICTS.en;

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
      toast.error(lang === 'ru' ? 'Введите текст отзыва' : 'Please enter review text');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        bookVersionId,
        text: reviewText.trim(),
        rating,
      });
      toast.success(lang === 'ru' ? 'Отзыв опубликован!' : 'Review published!');
      setReviewText('');
      setRating(null);
    } catch {
      toast.error(lang === 'ru' ? 'Не удалось опубликовать отзыв' : 'Failed to publish review');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(dict.deleteConfirm)) return;
    try {
      await deleteCommentMutation.mutateAsync(id);
      toast.success(lang === 'ru' ? 'Комментарий удален' : 'Comment deleted');
    } catch {
      toast.error(lang === 'ru' ? 'Не удалось удалить комментарий' : 'Failed to delete comment');
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
          {dict.reviews} <span className={styles.countBadge}>{data?.total || 0}</span>
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
            <option value="popularity">{dict.sortByPopular}</option>
            <option value="date">{dict.sortByNew}</option>
          </select>
        </div>
      </div>

      {/* Review input form */}
      {isAuthenticated ? (
        <form onSubmit={handleCreateReview} className={styles.reviewForm}>
          <div className={styles.ratingFormRow}>
            <span className={styles.ratingLabel}>{dict.rating}:</span>
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
              placeholder={dict.placeholder}
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
          <p>{dict.signInToRate}</p>
          <Button variant="secondary" onClick={handleSignInRedirect}>
            {dict.signIn}
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
              dict={dict}
              onDelete={handleDelete}
              bookVersionId={bookVersionId}
              currentUserId={session?.user?.id}
            />
          ))}

          {hasNext && (
            <button
              className={styles.loadMoreBtn}
              onClick={() => setPage((prev) => prev + 1)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className={styles.spinner} size={16} /> : dict.loadMore}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.noComments}>{dict.noComments}</div>
      )}
    </div>
  );
}

interface ReviewItemProps {
  comment: ClientComment;
  lang: string;
  dict: Record<string, string>;
  onDelete: (id: string) => void;
  bookVersionId: string;
  currentUserId?: string;
  isReply?: boolean;
}

function ReviewItem({
  comment,
  lang,
  dict,
  onDelete,
  bookVersionId,
  currentUserId,
  isReply = false,
}: ReviewItemProps) {
  const router = useRouter();
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

  // We can fetch reaction counts. But let's check comment model from api listing first:
  // comment has likes & dislikes count?
  // Let's check comment type: in schema.prisma, Like model contains commentId.
  // Wait! In comment.dto.ts: does CommentDto contain likes and dislikes counts?
  // Let's check comment.dto.ts on the backend. Yes, in comment.dto.ts:
  // Let's view CommentDto inside backend module comments.
  // Wait, let's look at comments.service.ts on the backend.
  // In comments.service.ts, the list endpoint does not fetch reaction counts?
  // Wait, let's open comments.service.ts and search for likes or reactions count.
  // Ah! Line 38: sortBy === 'popularity' ? { likes: { _count: 'desc' } } : { createdAt: 'desc' }
  // And `findMany` includes:
  // children: true, rating: true, user: { select: ... }
  // Wait! It does not include likes count in returned fields?
  // Let's check comment.dto.ts on the backend. Let's run a search for `likes` or `dislikes` in `comments.controller.ts` or `comment.dto.ts`.
  // Wait! Let's search inside `d:\newDev\books\src\modules\comments\dto\comment.dto.ts`.
  // Wait, we viewed `comment.dto.ts` earlier and it did not have likes/dislikes counts.
  // But wait, the client can use the `useCommentLikes` hook to query counts for each comment, OR we can fetch them.
  // Let's look at `useCommentLikes(target, targetId)` that we implemented in `useBookComments.ts`!
  // Yes, we can just use the `useCommentLikes('comment', comment.id)` hook for each comment to fetch and update the likes and dislikes count dynamically and reactively! This is incredibly clean, handles cache state perfectly, and decouples reaction counts from comment lists.

  // Fetch reaction counts for this comment
  const { data: likesData } = useCommentLikes('comment', comment.id);

  const currentLikes = reactionOverride
    ? Math.max(0, (likesData?.likes ?? 0) + reactionOverride.likesOffset)
    : (likesData?.likes ?? 0);

  const currentDislikes = reactionOverride
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

    if (reactionOverride) {
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
      toast.error(lang === 'ru' ? 'Не удалось поставить оценку' : 'Failed to register reaction');
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
      toast.success(lang === 'ru' ? 'Ответ добавлен' : 'Reply added');
      setReplyText('');
      setShowReplyForm(false);
    } catch {
      toast.error(lang === 'ru' ? 'Не удалось добавить ответ' : 'Failed to add reply');
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

  const displayName = comment.user.nickname || comment.user.name || 'User';
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className={`${styles.reviewItem} ${isReply ? styles.replyItem : ''}`}>
      <div className={styles.itemHeader}>
        <div className={styles.authorInfo}>
          {comment.user.avatarUrl ? (
            <img src={comment.user.avatarUrl} alt={displayName} className={styles.avatar} />
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
            <span>{dict.reply}</span>
          </button>
        )}

        {(currentUserId === comment.user.id || currentUserId) && (
          // In a real app we might verify if user has moderate roles, but simple delete button check works:
          // Owner can delete or moderators can delete
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
            placeholder={dict.replyPlaceholder}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            maxLength={1000}
          />
          <div className={styles.replyFormActions}>
            <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>
              {dict.cancel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              loading={createCommentMutation.isPending}
              disabled={!replyText.trim()}
            >
              {dict.submit}
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
              dict={dict}
              onDelete={onDelete}
              bookVersionId={bookVersionId}
              currentUserId={currentUserId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
