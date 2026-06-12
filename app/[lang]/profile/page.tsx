'use client';

import { useState, useEffect, useRef } from 'react';
import { Skeleton } from 'antd';
import { User, Mail, Tag, Save, Upload, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMe, useUpdateProfile, useUserActivities, useUploadAvatar } from '@/api/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/utils/toast';
import styles from './profile.module.scss';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || 'en';
  const { t } = useTranslation();

  const { status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const { data: user, isLoading: isUserLoading } = useMe({
    enabled: status === 'authenticated',
  });
  const { data: activities, isLoading: isActivitiesLoading } = useUserActivities({
    enabled: status === 'authenticated',
  });

  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();

  // Form states
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.displayName || user.name || '');
      setNickname(user.nickname || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadPercent(0);
      const url = await uploadAvatarMutation.mutateAsync({
        file,
        onProgress: (percent) => setUploadPercent(percent),
      });
      setAvatarUrl(url);
      setUploadPercent(null);
      toast.success(t('profile.avatarUploaded'));
    } catch {
      setUploadPercent(null);
      toast.error(t('profile.uploadError'));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nickname validation: alphanumerics and underscores only
    if (nickname) {
      const pattern = /^[a-zA-Z0-9_]+$/;
      if (!pattern.test(nickname)) {
        toast.error(t('profile.invalidNickname'));
        return;
      }
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim() || undefined,
        nickname: nickname.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      toast.success(t('profile.updateSuccess'));
    } catch (err: unknown) {
      const msg = (err as Error)?.message || t('profile.updateError');
      toast.error(msg);
    }
  };

  // Loading skeleton state
  if (status === 'loading' || (status === 'authenticated' && isUserLoading)) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.header}>
            <Skeleton.Button active style={{ width: 250, height: 32 }} />
          </div>
          <div className={styles.profileLayoutGrid}>
            <div className={styles.profileCard}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
            <div className={styles.activitiesCard}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Guest Redirect screen
  if (status === 'unauthenticated' || !user) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.unauthContainer}>
          <User className={styles.unauthIcon} size={48} />
          <h1 className={styles.unauthTitle}>{t('profile.unauthTitle')}</h1>
          <p className={styles.unauthText}>{t('profile.unauthText')}</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/profile`)}
          >
            {t('profile.signIn')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <h1 className={styles.headerTitle}>{t('profile.cabinet')}</h1>

        <div className={styles.profileLayoutGrid}>
          {/* Settings Section */}
          <div className={styles.profileCard}>
            <form onSubmit={handleFormSubmit} className={styles.profileForm}>
              {/* Avatar Selector */}
              <div className={styles.avatarRow}>
                <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="User Avatar"
                      width={110}
                      height={110}
                      className={styles.avatarImage}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {(name || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.avatarHoverOverlay}>
                    <Upload size={16} />
                    <span>{uploadPercent !== null ? `${uploadPercent}%` : ''}</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>

              {/* Email (Readonly) */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-email">
                  {t('profile.email')}
                </label>
                <div className={styles.inputWrapper}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input
                    id="profile-email"
                    type="email"
                    className={`${styles.input} ${styles.inputDisabled}`}
                    value={user.email}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-name">
                  {t('profile.name')}
                </label>
                <div className={styles.inputWrapper}>
                  <User size={16} className={styles.inputIcon} />
                  <input
                    id="profile-name"
                    type="text"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Nickname */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-nickname">
                  {t('profile.nickname')}
                </label>
                <div className={styles.inputWrapper}>
                  <Tag size={16} className={styles.inputIcon} />
                  <input
                    id="profile-nickname"
                    type="text"
                    className={styles.input}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={30}
                    placeholder="john_doe"
                  />
                </div>
                <span className={styles.hint}>{t('profile.nicknameHint')}</span>
              </div>

              <Button
                variant="primary"
                type="submit"
                loading={updateProfileMutation.isPending}
                leftIcon={<Save size={16} />}
                className={styles.saveBtn}
              >
                {updateProfileMutation.isPending ? t('profile.saving') : t('profile.save')}
              </Button>
            </form>
          </div>

          {/* Activities Section */}
          <div className={styles.activitiesCard}>
            <h2 className={styles.sectionTitle}>{t('profile.myActivities')}</h2>
            <p className={styles.sectionDesc}>{t('profile.activitiesDesc')}</p>

            {isActivitiesLoading ? (
              <div className={styles.loadingSpinner}>
                <Loader2 className={styles.spinner} size={28} />
              </div>
            ) : activities && activities.length > 0 ? (
              <div className={styles.activitiesList}>
                {activities.map((activity) => (
                  <div key={activity.id} className={styles.activityItem}>
                    {activity.bookVersion && (
                      <div className={styles.bookHeader}>
                        {activity.bookVersion.coverImageUrl ? (
                          <Image
                            src={activity.bookVersion.coverImageUrl}
                            alt={activity.bookVersion.title}
                            width={32}
                            height={46}
                            className={styles.bookCover}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.bookCoverPlaceholder}>
                            {activity.bookVersion.title.charAt(0)}
                          </div>
                        )}
                        <div className={styles.bookMeta}>
                          <Link
                            href={`/${lang}/book/${activity.bookVersion.slug}`}
                            className={styles.bookLink}
                          >
                            {activity.bookVersion.title}
                          </Link>
                          <span className={styles.bookAuthor}>{activity.bookVersion.author}</span>
                        </div>
                      </div>
                    )}

                    {/* Parent reference if replied */}
                    {activity.parent && (
                      <div className={styles.parentReference}>
                        <MessageSquare size={12} />
                        <span>
                          {t('profile.repliedTo')} @
                          {activity.parent.user.nickname || activity.parent.user.name || 'User'}:
                        </span>
                        <p className={styles.parentText}>&ldquo;{activity.parent.text}&rdquo;</p>
                      </div>
                    )}

                    <p className={styles.activityText}>{activity.text}</p>
                    <span className={styles.activityDate}>
                      {new Date(activity.createdAt).toLocaleDateString(
                        lang === 'ru' ? 'ru-RU' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    </span>

                    {/* Replies count */}
                    {activity.replies && activity.replies.length > 0 && (
                      <div className={styles.repliesBlock}>
                        <span className={styles.repliesTitle}>
                          {t('profile.replies')} ({activity.replies.length})
                        </span>
                        <div className={styles.repliesList}>
                          {activity.replies.map((reply) => (
                            <div key={reply.id} className={styles.replyItem}>
                              <span className={styles.replyAuthor}>
                                @{reply.user.nickname || reply.user.name || 'User'}
                              </span>
                              <p className={styles.replyText}>{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyActivities}>
                <p>{t('profile.noActivities')}</p>
                <Link href={`/${lang}/catalog`} passHref legacyBehavior>
                  <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
                    {t('profile.exploreCatalog')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
