import { BookOpen, FileText, FolderTree, Tags } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSupportedLang, SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({
    lang,
  }));
}

/**
 * Admin Dashboard - admin panel main page
 *
 * Shows brief statistics and quick links to main sections
 */
export default async function AdminDashboardPage({ params }: Props) {
  const { lang } = await params;

  if (!isSupportedLang(lang)) {
    notFound();
  }

  const supportedLang = lang as SupportedLang;

  /**
   * Quick links to main sections
   */
  const quickLinks = [
    {
      title: 'Books',
      description: 'Manage books and their content',
      href: `/admin/${supportedLang}/books`,
      icon: BookOpen,
    },
    {
      title: 'Pages',
      description: 'Edit CMS pages',
      href: `/admin/${supportedLang}/pages`,
      icon: FileText,
    },
    {
      title: 'Categories',
      description: 'Organize content categories',
      href: `/admin/${supportedLang}/categories`,
      icon: FolderTree,
    },
    {
      title: 'Tags',
      description: 'Manage content tags',
      href: `/admin/${supportedLang}/tags`,
      icon: Tags,
    },
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome to Bibliaris Admin Panel</p>
      </div>

      <div className={styles.quickLinks}>
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={styles.card}>
              <div className={styles.cardIcon}>
                <Icon size={32} />
              </div>
              <h3 className={styles.cardTitle}>{link.title}</h3>
              <p className={styles.cardDescription}>{link.description}</p>
            </Link>
          );
        })}
      </div>

      <div className={styles.info}>
        <p className={styles.infoText}>
          <strong>Current Language:</strong> {lang.toUpperCase()}
        </p>
        <p className={styles.infoText}>
          Content management for the multilingual audiobook platform
        </p>
      </div>
    </div>
  );
}
