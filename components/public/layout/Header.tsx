'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Drawer, Dropdown } from 'antd';
import { Search, BookOpen, User, BookMarked, Menu, Headphones } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { getPublicBooks } from '@/api/endpoints/public';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getLangFromPath, type SupportedLang } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { MenuProps } from 'antd';
import styles from './Header.module.scss';

const getNavLinks = (lang: SupportedLang, t: (key: string) => string, hasAudiobooks: boolean) => {
  const links = [
    { label: t('header.popular'), href: `/${lang}/catalog?sort=popular` },
    { label: t('header.newReleases'), href: `/${lang}/catalog?sort=new` },
    { label: t('header.genres'), href: `/${lang}/genres` },
  ];

  if (hasAudiobooks) {
    links.splice(2, 0, {
      label: t('header.audiobooks'),
      href: `/${lang}/catalog?type=audio`,
    });
  }

  return links;
};

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const lang = getLangFromPath(pathname);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if there are any audiobooks
  const { data: booksData } = useQuery({
    queryKey: ['audiobooks-check', lang],
    queryFn: () => getPublicBooks(lang, { limit: 50 }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: isMounted,
  });

  const hasAudiobooks = (booksData?.data || []).some((book) => book.hasAudio === true);

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      router.push(`/${lang}/catalog?q=${encodeURIComponent(value.trim())}`);
      setSearchQuery('');
    }
  };

  const navLinks = getNavLinks(lang, t, hasAudiobooks);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: <Link href={`/${lang}/profile`}>{t('profile.cabinet')}</Link>,
    },
    {
      key: 'bookshelf',
      label: <Link href={`/${lang}/bookshelf`}>{t('header.myBookshelf')}</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'signout',
      danger: true,
      label: t('header.signOut'),
      onClick: () => {
        document.cookie = 'logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        signOut({ callbackUrl: `/${lang}` });
      },
    },
  ];

  const currentFlag =
    lang === 'ru'
      ? '🇷🇺'
      : lang === 'es'
        ? '🇪🇸'
        : lang === 'pt'
          ? '🇵🇹'
          : lang === 'fr'
            ? '🇫🇷'
            : '🇬🇧';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          {/* Mobile Menu Button */}
          {isMounted ? (
            <Button
              type="text"
              icon={<Menu size={20} aria-hidden="true" />}
              className={styles.mobileMenuBtn}
              onClick={() => setMobileOpen(true)}
              aria-label={t('a11y.openMenu')}
              aria-controls="mobile-navigation"
              aria-expanded={mobileOpen}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bibliaris-green-foreground)',
                cursor: 'pointer',
              }}
              className={styles.mobileMenuBtn}
              role="button"
              aria-label={t('a11y.openMenu')}
            >
              <Menu size={20} aria-hidden="true" />
            </div>
          )}

          <Drawer
            title={t('header.menu')}
            placement="left"
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
            className={styles.drawer}
            width={280}
          >
            <nav id="mobile-navigation" className={styles.mobileNav} aria-label={t('header.menu')}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.mobileNavLink}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </Drawer>

          {/* Logo */}
          <Link href={`/${lang}`} className={styles.logo} aria-label="BIBLIARIS">
            <BookOpen className={styles.logoIcon} aria-hidden="true" />
            <span className={styles.logoText} aria-hidden="true">
              BIBLIARIS
            </span>
          </Link>

          {/* Search Form (Desktop) */}
          <div className={styles.searchContainer}>
            {isMounted ? (
              <form
                role="search"
                aria-label={t('a11y.searchBooks')}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchSubmit(searchQuery);
                }}
                style={{ width: '100%' }}
              >
                <label htmlFor="site-search" className="sr-only">
                  {t('a11y.searchBooks')}
                </label>
                <Input.Search
                  id="site-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onSearch={handleSearchSubmit}
                  placeholder={t('header.searchPlaceholder')}
                  enterButton={<Search size={16} aria-hidden="true" />}
                  className={styles.searchInput}
                  aria-label={t('a11y.searchBooks')}
                />
              </form>
            ) : (
              <div style={{ position: 'relative', width: '100%' }}>
                <label htmlFor="site-search-fallback" className="sr-only">
                  {t('a11y.searchBooks')}
                </label>
                <input
                  id="site-search-fallback"
                  type="text"
                  disabled
                  placeholder={t('header.searchPlaceholder')}
                  style={{
                    width: '100%',
                    height: '32px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '0 36px 0 12px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '1px',
                    top: '1px',
                    bottom: '1px',
                    width: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '0 5px 5px 0',
                    color: 'var(--gold)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Search size={16} aria-hidden="true" />
                </div>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className={styles.actions}>
            {isMounted ? (
              <>
                <Button
                  type="text"
                  icon={<Search size={20} aria-hidden="true" />}
                  className={styles.mobileSearchBtn}
                  onClick={() => router.push(`/${lang}/catalog`)}
                  aria-label={t('a11y.openSearch')}
                />

                {!pathname?.includes('/auth/sign-in') &&
                  !pathname?.includes('/auth/register') &&
                  hasAudiobooks && (
                    <Button
                      type="text"
                      icon={<Headphones size={20} aria-hidden="true" />}
                      className={styles.desktopAudioBtn}
                      onClick={() => router.push(`/${lang}/catalog?type=audio`)}
                      title={t('header.audiobooks')}
                      aria-label={t('a11y.audiobooks')}
                    />
                  )}

                <LanguageSwitcher />

                {session?.user ? (
                  <>
                    <Button
                      type="text"
                      icon={<BookMarked size={20} aria-hidden="true" />}
                      className={styles.actionBtn}
                      onClick={() => router.push(`/${lang}/bookshelf`)}
                      title={t('header.myBookshelf')}
                      aria-label={t('a11y.myBookshelf')}
                    />
                    <Dropdown
                      menu={{ items: userMenuItems }}
                      placement="bottomRight"
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<User size={20} aria-hidden="true" />}
                        className={styles.actionBtn}
                        aria-label={t('a11y.userMenu')}
                      />
                    </Dropdown>
                  </>
                ) : (
                  <Button
                    type="primary"
                    className={styles.signInBtn}
                    onClick={() => router.push(`/${lang}/auth/sign-in`)}
                  >
                    {t('header.signIn')}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bibliaris-green-foreground)',
                  }}
                  className={styles.mobileSearchBtn}
                  role="button"
                  aria-label={t('a11y.openSearch')}
                >
                  <Search size={20} aria-hidden="true" />
                </div>

                {!pathname?.includes('/auth/sign-in') && !pathname?.includes('/auth/register') && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--bibliaris-green-foreground)',
                    }}
                    className={styles.desktopAudioBtn}
                    role="button"
                    aria-label={t('a11y.audiobooks')}
                  >
                    <Headphones size={20} aria-hidden="true" />
                  </div>
                )}

                {/* Language Switcher Placeholder */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '32px',
                    padding: '0 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: 'var(--bibliaris-green-foreground)',
                    fontSize: '14px',
                    gap: '6px',
                  }}
                >
                  <span>
                    {currentFlag} {lang.toUpperCase()}
                  </span>
                </div>

                {/* Session Action Placeholder */}
                <div
                  style={{
                    width: '80px',
                    height: '32px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                  }}
                  className={styles.pulsingSkeleton}
                />
              </>
            )}
          </div>
        </div>

        {/* Bottom Nav (Desktop) */}
        <nav className={styles.desktopNav} aria-label={t('header.menu')}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
