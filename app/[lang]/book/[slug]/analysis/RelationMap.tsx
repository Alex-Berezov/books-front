import {
  RELATION_MAP_NAME_OFFSET,
  RELATION_MAP_NODE_RADIUS,
  RELATION_MAP_VIEWBOX,
  type RelationMap as RelationMapData,
} from '@/lib/book-analysis/relation-map';
import styles from './analysis.module.scss';

/**
 * Карта отношений героев (`product.md` §10, T9): SVG рисует сервер, без клиентского кода.
 * Под схемой - те же связи списком «Герой → связь → Герой»: на узком экране схемы нет,
 * остаётся список; на широком он - подпись схемы. Текст обоих в HTML на любой ширине.
 */
export function RelationMap({
  map,
  title,
  withHeading = true,
  nodeHref,
}: {
  map: RelationMapData;
  /** Подпись схемы для чтения с экрана и заголовок h3, если он не снят `withHeading`. */
  title: string;
  /** `false` - заголовок рисует раздел страницы (мир книги: свой h2), здесь только подпись схемы. */
  withHeading?: boolean;
  /** Адрес страницы героя по ключу узла (мир книги, F08-3b): узел и имя в списке - ссылки. `null` - без ссылки. */
  nodeHref?: (key: string) => string | null;
}) {
  const personRef = (name: string, key: string) => {
    const href = nodeHref ? nodeHref(key) : null;
    return href ? (
      <a href={href} className={styles.textLink}>
        {name}
      </a>
    ) : (
      name
    );
  };
  return (
    <figure className={styles.relationMap}>
      {withHeading ? <h3 className={styles.relationTitle}>{title}</h3> : null}
      <svg
        className={styles.relationSvg}
        viewBox={`0 0 ${RELATION_MAP_VIEWBOX.width} ${RELATION_MAP_VIEWBOX.height}`}
        role="img"
        aria-label={title}
      >
        {map.lines.map((line) => (
          <g key={JSON.stringify([line.from.key, line.to.key])}>
            <line
              className={styles.relationLine}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
            />
            <text
              className={styles.relationLabel}
              x={(line.from.x + line.to.x) / 2}
              y={(line.from.y + line.to.y) / 2}
              textAnchor="middle"
            >
              {line.label}
            </text>
          </g>
        ))}
        {map.nodes.map((node) => {
          const href = nodeHref ? nodeHref(node.key) : null;
          const body = (
            <>
              <circle
                className={node.role === 'main' ? styles.relationNodeMain : styles.relationNode}
                cx={node.x}
                cy={node.y}
                r={RELATION_MAP_NODE_RADIUS[node.role]}
              />
              <text
                className={styles.relationName}
                x={node.x}
                y={node.y - RELATION_MAP_NAME_OFFSET}
                textAnchor="middle"
              >
                {node.name}
              </text>
            </>
          );
          return <g key={node.key}>{href ? <a href={href}>{body}</a> : body}</g>;
        })}
      </svg>
      <figcaption>
        <ul className={styles.relationList}>
          {map.entries.map((e, i) => (
            <li key={i}>
              {personRef(e.from, e.fromKey)}
              {` → ${e.label} → `}
              {personRef(e.to, e.toKey)}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
