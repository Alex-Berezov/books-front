'use client';

import { useState } from 'react';
import { Button, Input, Drawer, Dropdown } from 'antd';
import { Search, BookOpen, User, BookMarked, Menu, Headphones } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getLangFromPath, type SupportedLang } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { MenuProps } from 'antd';
import styles from './Header.module.scss';

const getNavLinks = (lang: SupportedLang, t: (key: string) => string) => [
  { label: t('header.popular'), href: `/${lang}/catalog?sort=popular` },
  { label: t('header.newReleases'), href: `/${lang}/catalog?sort=new` },
  { label: t('header.audiobooks'), href: `/${lang}/catalog?type=audio` },
  { label: t('header.genres'), href: `/${lang}/genres` },
  { label: t('header.regional'), href: `/${lang}/catalog?regional=true` },
];

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const lang = getLangFromPath(pathname);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      router.push(`/${lang}/catalog?q=${encodeURIComponent(value.trim())}`);
      setSearchQuery('');
    }
  };

  const navLinks = getNavLinks(lang, t);

  const userMenuItems: MenuProps['items'] = [
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
      onClick: () => signOut({ callbackUrl: `/${lang}` }),
    },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          {/* Mobile Menu Button */}
          <Button
            type="text"
            icon={<Menu size={20} />}
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(true)}
          />

          <Drawer
            title={t('header.menu')}
            placement="left"
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
            className={styles.drawer}
            width={280}
          >
            <div className={styles.mobileNav}>
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
            </div>
          </Drawer>

          {/* Logo */}
          <Link href={`/${lang}`} className={styles.logo}>
            <BookOpen className={styles.logoIcon} />
            <span className={styles.logoText}>BIBLIARIS</span>
          </Link>

          {/* Search Form (Desktop) */}
          <div className={styles.searchContainer}>
            <Input.Search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={handleSearchSubmit}
              placeholder={t('header.searchPlaceholder')}
              enterButton={<Search size={16} />}
              className={styles.searchInput}
            />
          </div>

          {/* Right Actions */}
          <div className={styles.actions}>
            <Button
              type="text"
              icon={<Search size={20} />}
              className={styles.mobileSearchBtn}
              onClick={() => router.push(`/${lang}/catalog`)}
            />

            {!pathname?.includes('/auth/sign-in') && !pathname?.includes('/auth/register') && (
              <Button
                type="text"
                icon={<Headphones size={20} />}
                className={styles.desktopAudioBtn}
                onClick={() => router.push(`/${lang}/catalog?type=audio`)}
                title={t('header.audiobooks')}
              />
            )}

            <LanguageSwitcher />

            {session?.user ? (
              <>
                <Button
                  type="text"
                  icon={<BookMarked size={20} />}
                  className={styles.actionBtn}
                  onClick={() => router.push(`/${lang}/bookshelf`)}
                  title={t('header.myBookshelf')}
                />
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <Button type="text" icon={<User size={20} />} className={styles.actionBtn} />
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
          </div>
        </div>

        {/* Bottom Nav (Desktop) */}
        <nav className={styles.desktopNav}>
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
