import Link from 'next/link';
import type { WorldPerson } from './worldEntityTypes';
import analysisStyles from '../analysis/analysis.module.scss';

/**
 * Имя героя: ссылкой на его страницу, если она есть, иначе текстом. Героя без имени (нет ни в
 * публичном списке, ни в анализе) вызывающий не выводит вовсе - сырой ключ читателю не показывается
 * (`product.md` §1 п.9).
 */
export function WorldPersonRef({ person }: { person: WorldPerson }) {
  return person.href ? (
    <Link href={person.href} className={analysisStyles.textLink}>
      {person.name}
    </Link>
  ) : (
    <>{person.name}</>
  );
}
