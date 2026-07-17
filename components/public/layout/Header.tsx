'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, User, BookMarked, Menu, Headphones, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { getBookCards } from '@/api/endpoints/public';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getLangFromPath, type SupportedLang } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './Header.module.scss';

const ALL_NAV_ITEMS = [
  'catalog',
  'categories',
  'genres',
  'collections',
  'tags',
  'audiobooks',
  'popular',
  'newReleases',
] as const;

const getNavLinks = (lang: SupportedLang, t: (key: string) => string) => {
  const hrefMap: Record<string, string> = {
    catalog: `/${lang}/catalog`,
    categories: `/${lang}/categories`,
    genres: `/${lang}/genres`,
    collections: `/${lang}/collections`,
    tags: `/${lang}/tags`,
    audiobooks: `/${lang}/catalog?type=audio`,
    popular: `/${lang}/catalog?sort=popular`,
    newReleases: `/${lang}/catalog?sort=new`,
  };

  return ALL_NAV_ITEMS.map((key) => ({
    key,
    label: t(`header.${key}`),
    href: hrefMap[key],
  }));
};

/**
 * Check if a nav item should be active based on current pathname.
 */
const isActiveNav = (pathname: string, itemKey: string, lang: string): boolean => {
  const path = pathname.replace(`/${lang}`, '') || '/';
  switch (itemKey) {
    case 'catalog':
      return path === '/catalog';
    case 'categories':
      return path === '/categories' || path.startsWith('/category/');
    case 'genres':
      return path === '/genres' || path.startsWith('/genre/');
    case 'collections':
      return path === '/collections' || path.startsWith('/collection/');
    case 'tags':
      return path === '/tags' || path.startsWith('/tag/');
    default:
      return path.startsWith(`/catalog?${itemKey}`);
  }
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Check if there are any audiobooks (compact cards endpoint, not legacy 11.6 MB)
  const { data: bookCardsData } = useQuery({
    queryKey: ['audiobooks-check', lang],
    queryFn: () => getBookCards(lang, 1, 48),
    staleTime: 10 * 60 * 1000,
    enabled: isMounted,
  });

  const hasAudiobooks = (bookCardsData?.items || []).some((book) => book.hasAudio === true);

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      router.push(`/${lang}/catalog?q=${encodeURIComponent(value.trim())}`);
      setSearchQuery('');
    }
  };

  const navLinks = getNavLinks(lang, t).filter(
    (link) => link.key !== 'audiobooks' || hasAudiobooks
  );

  const handleSignOut = () => {
    document.cookie = 'logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    signOut({ callbackUrl: `/${lang}` });
  };

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
            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMobileOpen(true)}
              aria-label={t('a11y.openMenu')}
              aria-controls="mobile-navigation"
              aria-expanded={mobileOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
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

          {/* Mobile Drawer */}
          {mobileOpen && (
            <button
              type="button"
              className={styles.drawerOverlay}
              onClick={() => setMobileOpen(false)}
              aria-label={t('a11y.closeMenu')}
            >
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <section
                className={styles.drawerPanel}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={t('header.menu')}
              >
                <div className={styles.drawerHeader}>
                  <span className={styles.drawerTitle}>{t('header.menu')}</span>
                  <button
                    type="button"
                    className={styles.drawerCloseBtn}
                    onClick={() => setMobileOpen(false)}
                    aria-label={t('a11y.closeMenu')}
                  >
                    <X size={20} />
                  </button>
                </div>
                <nav
                  id="mobile-navigation"
                  className={styles.mobileNav}
                  aria-label={t('header.menu')}
                >
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${styles.mobileNavLink} ${isActiveNav(pathname, link.key, lang) ? styles.mobileNavLinkActive : ''}`}
                      aria-current={isActiveNav(pathname, link.key, lang) ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </section>
            </button>
          )}

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
                className={styles.searchForm}
              >
                <label htmlFor="site-search" className="sr-only">
                  {t('a11y.searchBooks')}
                </label>
                <input
                  id="site-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('header.searchPlaceholder')}
                  className={styles.searchInput}
                  aria-label={t('a11y.searchBooks')}
                />
                <button
                  type="submit"
                  className={styles.searchBtn}
                  aria-label={t('a11y.searchBooks')}
                >
                  <Search size={16} aria-hidden="true" />
                </button>
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
                <button
                  type="button"
                  className={styles.mobileSearchBtn}
                  onClick={() => router.push(`/${lang}/catalog`)}
                  aria-label={t('a11y.openSearch')}
                >
                  <Search size={20} aria-hidden="true" />
                </button>

                {!pathname?.includes('/auth/sign-in') &&
                  !pathname?.includes('/auth/register') &&
                  hasAudiobooks && (
                    <button
                      type="button"
                      className={styles.desktopAudioBtn}
                      onClick={() => router.push(`/${lang}/catalog?type=audio`)}
                      title={t('header.audiobooks')}
                      aria-label={t('a11y.audiobooks')}
                    >
                      <Headphones size={20} aria-hidden="true" />
                    </button>
                  )}

                <LanguageSwitcher />

                {session?.user ? (
                  <>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => router.push(`/${lang}/bookshelf`)}
                      title={t('header.myBookshelf')}
                      aria-label={t('a11y.myBookshelf')}
                    >
                      <BookMarked size={20} aria-hidden="true" />
                    </button>

                    <div className={styles.dropdownWrapper}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        aria-label={t('a11y.userMenu')}
                        aria-expanded={userMenuOpen}
                      >
                        <User size={20} aria-hidden="true" />
                      </button>
                      {userMenuOpen && (
                        <>
                          <button
                            type="button"
                            className={styles.dropdownOverlay}
                            onClick={() => setUserMenuOpen(false)}
                            aria-hidden="true"
                            tabIndex={-1}
                          />
                          <div className={styles.dropdownMenu}>
                            <Link
                              href={`/${lang}/profile`}
                              className={styles.dropdownItem}
                              onClick={() => setUserMenuOpen(false)}
                            >
                              {t('profile.cabinet')}
                            </Link>
                            <Link
                              href={`/${lang}/bookshelf`}
                              className={styles.dropdownItem}
                              onClick={() => setUserMenuOpen(false)}
                            >
                              {t('header.myBookshelf')}
                            </Link>
                            <div className={styles.dropdownDivider} />
                            <button
                              type="button"
                              className={styles.dropdownItem}
                              onClick={() => {
                                setUserMenuOpen(false);
                                handleSignOut();
                              }}
                            >
                              {t('header.signOut')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.signInBtn}
                    onClick={() => router.push(`/${lang}/auth/sign-in`)}
                  >
                    {t('header.signIn')}
                  </button>
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
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActiveNav(pathname, link.key, lang) ? styles.navLinkActive : ''}`}
              aria-current={isActiveNav(pathname, link.key, lang) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
