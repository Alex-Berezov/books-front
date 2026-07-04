/**
 * Admin panel constants
 */

import type { ComponentType } from 'react';
import {
  Archive,
  BookOpen,
  FileText,
  FolderTree,
  Library,
  Tags,
  Image,
  MessageSquare,
  Users,
  User,
} from 'lucide-react';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Admin panel menu item
 */
export interface AdminMenuItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  path: string;
}

/**
 * Generate menu items for specific language
 */
export const getAdminMenuItems = (lang: SupportedLang): AdminMenuItem[] => [
  {
    id: 'books',
    label: 'Books',
    icon: BookOpen,
    path: `/admin/${lang}/books`,
  },
  {
    id: 'authors',
    label: 'Authors',
    icon: User,
    path: `/admin/${lang}/authors`,
  },
  {
    id: 'pages',
    label: 'Pages',
    icon: FileText,
    path: `/admin/${lang}/pages`,
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: FolderTree,
    path: `/admin/${lang}/categories`,
  },
  {
    id: 'genres',
    label: 'Genres',
    icon: Library,
    path: `/admin/${lang}/genres`,
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: Archive,
    path: `/admin/${lang}/collections`,
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Tags,
    path: `/admin/${lang}/tags`,
  },
  {
    id: 'media',
    label: 'Media',
    icon: Image,
    path: `/admin/${lang}/media`,
  },
  {
    id: 'comments',
    label: 'Comments',
    icon: MessageSquare,
    path: `/admin/${lang}/comments`,
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    path: `/admin/${lang}/users`,
  },
];
