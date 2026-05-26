'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPath } from '@/lib/i18n/lang';
import styles from './Footer.module.scss';

export function Footer() {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.about}>
            <div className={styles.logo}>
              <BookOpen className={styles.logoIcon} />
              <span className={styles.logoText}>BIBLIARIS</span>
            </div>
            <p className={styles.description}>
              Your digital library. Discover, read, and listen to thousands of books anytime,
              anywhere.
            </p>
          </div>

          <div>
            <h4 className={styles.sectionTitle}>Explore</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/catalog?sort=popular`} className={styles.link}>
                  Popular Books
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog?sort=new`} className={styles.link}>
                  New Releases
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog?type=audio`} className={styles.link}>
                  Audiobooks
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/genres`} className={styles.link}>
                  Browse Genres
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={styles.sectionTitle}>Account</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/auth/sign-in`} className={styles.link}>
                  Sign In
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/auth/register`} className={styles.link}>
                  Create Account
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/bookshelf`} className={styles.link}>
                  My Bookshelf
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={styles.sectionTitle}>Genres</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/catalog/classic-literature`} className={styles.link}>
                  Classic Literature
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/fantasy`} className={styles.link}>
                  Fantasy
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/science-fiction`} className={styles.link}>
                  Science Fiction
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/mystery`} className={styles.link}>
                  Mystery
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/romance`} className={styles.link}>
                  Romance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} Bibliaris. All rights reserved.
          </p>
          <div className={styles.legalLinks}>
            <Link href={`/${lang}/privacy`} className={styles.legalLink}>
              Privacy Policy
            </Link>
            <Link href={`/${lang}/terms`} className={styles.legalLink}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
