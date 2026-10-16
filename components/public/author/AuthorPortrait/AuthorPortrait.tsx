import { User } from 'lucide-react';
import Image from 'next/image';
import { isOptimizableHost } from '@/lib/utils/image-host';

interface AuthorPortraitProps {
  photoUrl: string | null | undefined;
  alt: string;
  /** `sizes` для `next/image`: ширина круга, в который ставится портрет. */
  sizes: string;
  iconSize: number;
  /** Портрет над первым экраном (шапка) — `priority`; карточки ниже — ленивые. */
  priority?: boolean;
  photoClassName: string;
  iconClassName: string;
}

/**
 * Портрет автора или заглушка-иконка (шапка F02-3, похожие авторы F02-4): одно место, где
 * решаются оптимизация хоста и заглушка. Круг и его размер задаёт вызывающий (`fill`).
 */
export function AuthorPortrait({
  photoUrl,
  alt,
  sizes,
  iconSize,
  priority = false,
  photoClassName,
  iconClassName,
}: AuthorPortraitProps) {
  if (!photoUrl) return <User size={iconSize} className={iconClassName} aria-hidden="true" />;
  return (
    <Image
      src={photoUrl}
      alt={alt}
      className={photoClassName}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizableHost(photoUrl)}
    />
  );
}
