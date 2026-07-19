import type { SupportedLang } from '@/lib/i18n/lang';

export type CatalogLandingKey = 'audiobooks' | 'popular-books' | 'new-releases';

export const CATALOG_LANDING_CONFIG: Record<
  CatalogLandingKey,
  {
    routePath: string;
    titleKey: string;
    sort?: 'popular' | 'new';
    type?: 'audio';
  }
> = {
  audiobooks: {
    routePath: '/audiobooks',
    titleKey: 'audio',
    type: 'audio',
  },
  'popular-books': {
    routePath: '/popular-books',
    titleKey: 'popular',
    sort: 'popular',
  },
  'new-releases': {
    routePath: '/new-releases',
    titleKey: 'new',
    sort: 'new',
  },
};

export const catalogTitles: Record<SupportedLang, Record<string, string>> = {
  en: {
    default: 'All Books Catalog - Read & Listen Free | Bibliaris',
    popular: 'Popular Books - Read & Listen Free | Bibliaris',
    new: 'New Releases - Read & Listen Free | Bibliaris',
    audio: 'Audiobooks - Read & Listen Free | Bibliaris',
  },
  es: {
    default: 'Catálogo completo de libros - Leer y escuchar gratis | Bibliaris',
    popular: 'Libros populares - Leer y escuchar gratis | Bibliaris',
    new: 'Novedades - Leer y escuchar gratis | Bibliaris',
    audio: 'Audiolibros - Leer y escuchar gratis | Bibliaris',
  },
  fr: {
    default: 'Catalogue complet de livres - Lire et écouter gratuit | Bibliaris',
    popular: 'Livres populaires - Lire et écouter gratuit | Bibliaris',
    new: 'Nouveautés - Lire et écouter gratuit | Bibliaris',
    audio: 'Livres audio - Lire et écouter gratuit | Bibliaris',
  },
  pt: {
    default: 'Catálogo completo de livros - Ler e ouvir grátis | Bibliaris',
    popular: 'Livros populares - Ler e ouvir grátis | Bibliaris',
    new: 'Lançamentos - Ler e ouvir grátis | Bibliaris',
    audio: 'Audiolivros - Ler e ouvir grátis | Bibliaris',
  },
  ru: {
    default: 'Каталог книг — читать и слушать бесплатно | Bibliaris',
    popular: 'Популярные книги — читать и слушать бесплатно | Bibliaris',
    new: 'Новинки — читать и слушать бесплатно | Bibliaris',
    audio: 'Аудиокниги — читать и слушать бесплатно | Bibliaris',
  },
};

export const catalogDescriptions: Record<SupportedLang, Record<string, string>> = {
  en: {
    default:
      'Browse our full catalog of books on Bibliaris. Explore classic literature, audiobooks, summaries, popular genres, and new releases.',
    popular:
      'Discover the most popular books on Bibliaris. Top-rated classic literature loved by readers worldwide.',
    new: 'Explore the latest new releases on Bibliaris. Recently added classic literature and audiobooks.',
    audio:
      'Browse our audiobook catalog on Bibliaris. Listen to classic literature with professional narration.',
  },
  es: {
    default:
      'Explora nuestro catálogo completo de libros en Bibliaris. Descubre literatura clásica, audiolibros, resúmenes, géneros populares y novedades.',
    popular:
      'Descubre los libros más populares en Bibliaris. Literatura clásica mejor valorada por lectores de todo el mundo.',
    new: 'Explora las últimas novedades en Bibliaris. Literatura clásica y audiolibros añadidos recientemente.',
    audio:
      'Explora nuestro catálogo de audiolibros en Bibliaris. Escucha literatura clásica con narración profesional.',
  },
  fr: {
    default:
      'Découvrez notre catalogue complet de livres sur Bibliaris. Explorez la littérature classique, les livres audio, les résumés, les genres populaires et les nouveautés.',
    popular:
      'Découvrez les livres les plus populaires sur Bibliaris. Littérature classique la mieux notée par les lecteurs du monde entier.',
    new: 'Explorez les dernières nouveautés sur Bibliaris. Littérature classique et livres audio récemment ajoutés.',
    audio:
      'Explorez notre catalogue de livres audio sur Bibliaris. Écoutez la littérature classique avec une narration professionnelle.',
  },
  pt: {
    default:
      'Explore nosso catálogo completo de livros no Bibliaris. Descubra literatura clássica, audiolibros, resumos, gêneros populares e lançamentos.',
    popular:
      'Descubra os livros mais populares no Bibliaris. Literatura clássica mais bem avaliada por leitores do mundo todo.',
    new: 'Explore os últimos lançamentos no Bibliaris. Literatura clássica e audiolivros adicionados recentemente.',
    audio:
      'Explore nosso catálogo de audiolivros no Bibliaris. Ouça literatura clássica com narração profissional.',
  },
  ru: {
    default:
      'Просмотрите полный каталог книг на Bibliaris. Откройте для себя классическую литературу, аудиокниги, краткие содержания, популярные жанры и новинки.',
    popular:
      'Откройте для себя самые популярные книги на Bibliaris. Классическая литература с высоким рейтингом от читателей со всего мира.',
    new: 'Исследуйте последние новинки на Bibliaris. Недавно добавленная классическая литература и аудиокниги.',
    audio:
      'Просмотрите каталог аудиокниг на Bibliaris. Слушайте классическую литературу в профессиональном исполнении.',
  },
};
