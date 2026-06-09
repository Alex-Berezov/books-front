'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPath } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './Footer.module.scss';

export function Footer() {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.about}>
            <div className={styles.logo}>
              <BookOpen className={styles.logoIcon} />
              <span className={styles.logoText}>BIBLIARIS</span>
            </div>
            <p className={styles.description}>{t('footer.description')}</p>
          </div>

          <div>
            <h4 className={styles.sectionTitle}>{t('footer.explore')}</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/catalog?sort=popular`} className={styles.link}>
                  {t('footer.popularBooks')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog?sort=new`} className={styles.link}>
                  {t('footer.newReleases')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog?type=audio`} className={styles.link}>
                  {t('footer.audiobooks')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/genres`} className={styles.link}>
                  {t('footer.browseGenres')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={styles.sectionTitle}>{t('footer.account')}</h4>
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

          <div>
            <h4 className={styles.sectionTitle}>{t('footer.genresTitle')}</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href={`/${lang}/catalog/classic-literature`} className={styles.link}>
                  {t('footer.classicLiterature')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/fantasy`} className={styles.link}>
                  {t('footer.fantasy')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/science-fiction`} className={styles.link}>
                  {t('footer.scienceFiction')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/mystery`} className={styles.link}>
                  {t('footer.mystery')}
                </Link>
              </li>
              <li>
                <Link href={`/${lang}/catalog/romance`} className={styles.link}>
                  {t('footer.romance')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </p>
          <div className={styles.legalLinks}>
            <Link href={`/${lang}/privacy`} className={styles.legalLink}>
              {t('footer.privacyPolicy')}
            </Link>
            <Link href={`/${lang}/terms`} className={styles.legalLink}>
              {t('footer.termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
