'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CookieSettingsButton } from '@/components/public/legal/CookieSettingsButton';
import { getLangFromPath } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './Footer.module.scss';

type FooterProps = {
  hasAudiobooks?: boolean;
};

export function Footer({ hasAudiobooks = true }: FooterProps) {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <h2 className="sr-only">{t('a11y.footerNavigation')}</h2>
        <div className={styles.grid}>
          <div className={styles.about}>
            <div className={styles.logo}>
              <BookOpen className={styles.logoIcon} aria-hidden="true" />
              <span className={styles.logoText}>BIBLIARIS</span>
            </div>
            <p className={styles.description}>{t('footer.description')}</p>
          </div>

          <nav aria-label={t('footer.explore')} className={styles.navContents}>
            <div>
              <h3 className={styles.sectionTitle}>{t('footer.explore')}</h3>
              <ul className={styles.linksList}>
                <li>
                  <Link href={`/${lang}/popular-books`} className={styles.link}>
                    {t('footer.popularBooks')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/new-releases`} className={styles.link}>
                    {t('footer.newReleases')}
                  </Link>
                </li>
                {hasAudiobooks && (
                  <li>
                    <Link href={`/${lang}/audiobooks`} className={styles.link}>
                      {t('footer.audiobooks')}
                    </Link>
                  </li>
                )}
                <li>
                  <Link href={`/${lang}/genres`} className={styles.link}>
                    {t('footer.browseGenres')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/catalog`} className={styles.link}>
                    {t('footer.browseCatalog')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/categories`} className={styles.link}>
                    {t('footer.browseCategories')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/collections`} className={styles.link}>
                    {t('footer.browseCollections')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/tags`} className={styles.link}>
                    {t('footer.browseTags')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/authors`} className={styles.link}>
                    {t('footer.browseAuthors')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={styles.sectionTitle}>{t('footer.account')}</h3>
              <ul className={styles.linksList}>
                <li>
                  <Link href={`/${lang}/auth/sign-in`} className={styles.link}>
                    {t('footer.signIn')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/auth/register`} className={styles.link}>
                    {t('footer.createAccount')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/bookshelf`} className={styles.link}>
                    {t('footer.myBookshelf')}
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          <nav aria-label={t('footer.groupAbout')}>
            <h3 className={styles.sectionTitle}>{t('footer.groupAbout')}</h3>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/about`} className={styles.link}>
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/editorial-policy`} className={styles.link}>
                  {t('footer.editorialPolicy')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/contact`} className={styles.link}>
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.groupLegal')}>
            <h3 className={styles.sectionTitle}>{t('footer.groupLegal')}</h3>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/privacy`} className={styles.link}>
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/terms`} className={styles.link}>
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/cookies`} className={styles.link}>
                  {t('footer.cookiePolicy')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/legal-notice`} className={styles.link}>
                  {t('footer.legalNotice')}
                </Link>
              </li>
              {/* Пустой `li` не выводится: кнопка решает о себе сама, после монтирования. */}
              <CookieSettingsButton
                label={t('footer.cookieSettings')}
                className={styles.linkButton}
                wrapper="li"
              />
            </ul>
          </nav>
        </div>

        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
