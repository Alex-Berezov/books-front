import { useEffect, useRef, type FC, type ReactNode } from 'react';
import styles from './SeoUI.module.scss';

export interface SeoCollapsibleProps {
  /** Section title */
  title: string;
  /** Section content */
  children: ReactNode;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /**
   * Раскрыть секцию, когда внутри ошибка проверки: иначе сообщение прячется в закрытом
   * `<details>`, и отказ формы выглядит как молчащая кнопка «Сохранить» (`T75`). Только
   * раскрывает и никогда не закрывает: ошибка исчезает на первом годном символе, и секция
   * захлопнулась бы посреди набора вместе с полем в фокусе.
   */
  forceOpen?: boolean;
}

/**
 * Collapsible section for SEO settings
 *
 * Uses HTML <details>/<summary> for native functionality
 */
export const SeoCollapsible: FC<SeoCollapsibleProps> = (props) => {
  const { title, children, defaultOpen = false, forceOpen = false } = props;
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (forceOpen && detailsRef.current) detailsRef.current.open = true;
  }, [forceOpen]);

  return (
    <details ref={detailsRef} className={styles.seoSection} open={defaultOpen}>
      <summary className={styles.seoSectionTitle}>{title}</summary>
      <div className={styles.seoSectionContent}>{children}</div>
    </details>
  );
};
