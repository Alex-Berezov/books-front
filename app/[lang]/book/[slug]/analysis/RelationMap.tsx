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
export function RelationMap({ map, title }: { map: RelationMapData; title: string }) {
  return (
    <figure className={styles.relationMap}>
      <h3 className={styles.relationTitle}>{title}</h3>
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
        {map.nodes.map((node) => (
          <g key={node.key}>
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
          </g>
        ))}
      </svg>
      <figcaption>
        <ul className={styles.relationList}>
          {map.entries.map((e, i) => (
            <li key={i}>{`${e.from} → ${e.label} → ${e.to}`}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
