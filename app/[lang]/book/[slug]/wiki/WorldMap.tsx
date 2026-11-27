import type { ReactNode } from 'react';
import type { BookWorldMap } from '@/types/api-schema';
import styles from './wiki.module.scss';
import analysisStyles from '../analysis/analysis.module.scss';

/** Подпись подложки - условие лицензии OSM: видна под каждой картой, ссылкой, без перевода. */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

const TILE_PX = 256;
/**
 * Радиус точки и кегль номера в пикселях мозаики - атрибутами SVG, они ужимаются вместе со слоем.
 * Мозаика шириной `cols × 256` px на 375 px ужимается примерно в `cols × 256 / 343` раз, поэтому
 * размер растёт с числом колонок: номер на телефоне - около 12 px при любой сетке (§1 п.8).
 */
const pointRadius = (cols: number, numbered: boolean) => (numbered ? 8 : 6) * cols;
const numberSize = (cols: number) => 9 * cols;
/** Обводка точки - в той же пропорции, что радиус: на 375 px около 1,5 px при любой сетке. */
const strokeWidth = (cols: number) => 1.5 * cols;

/** Классы сетки по числу колонок: бэкенд отдаёт 1-4 колонки (`F08-12d`, потолок 4×3). */
const COLS_CLASS: Record<number, string | undefined> = {
  1: styles.mapCols1,
  2: styles.mapCols2,
  3: styles.mapCols3,
  4: styles.mapCols4,
};

/**
 * Ответ можно нарисовать: колонок 1-4, строк от одной, тайлов ровно `cols × rows`. Иначе блока
 * карты нет целиком - вместе с заголовком и легендой (§1 п.5), а не пустая рамка.
 */
export function isDrawableMap(map: BookWorldMap | null | undefined): map is BookWorldMap {
  return (
    !!map &&
    COLS_CLASS[map.cols] !== undefined &&
    map.rows >= 1 &&
    Array.isArray(map.tiles) &&
    Array.isArray(map.points) &&
    map.tiles.length === map.cols * map.rows
  );
}

/** Источник координат точки: «Координаты: Wikidata» ссылкой на запись (решение `F08 | F08-12d` П5). */
export function WikidataSource({ href, label }: { href: string; label: string }) {
  return (
    <>
      {label}:{' '}
      <a href={href} className={analysisStyles.textLink} target="_blank" rel="noopener noreferrer">
        Wikidata
      </a>
    </>
  );
}

export interface WorldMapProps {
  map: BookWorldMap;
  /** Доступное имя карты: картинки тайлов декоративные (`alt=""`), смысл - в подписи и легенде. */
  label: string;
  /** Номера у точек - для легенды общей карты; у малой карты точка одна, без номера. */
  numbered: boolean;
  /** Строка над подписью OSM: «Координаты: Wikidata» (решение `F08 | F08-12d` П5). */
  caption?: ReactNode;
}

/**
 * Литературная карта (`F08-12d`, решения арбитра `F08 | F08-12` Q3, Q7, `F08 | F08-12d`): мозаика
 * `<img>` тайлов OSM из хранилища сайта и точки слоем SVG поверх - серверный HTML, ни байта JS
 * и без `style`: координаты точки - атрибуты SVG в пикселях мозаики, слой масштабируется вместе
 * с сеткой. Ответ не той формы (колонок вне 1-4, тайлов не `cols × rows`) - карты нет.
 */
export function WorldMap({ map, label, numbered, caption }: WorldMapProps) {
  if (!isDrawableMap(map)) return null;
  const cols = COLS_CLASS[map.cols];
  const width = map.cols * TILE_PX;
  const height = map.rows * TILE_PX;
  const r = pointRadius(map.cols, numbered);
  // Точка у края мира (z=1, полюс) не обрезается краем мозаики: центр - не ближе радиуса.
  const inside = (v: number, size: number) => Math.min(Math.max(v, r), size - r);
  return (
    <figure className={styles.mapFigure}>
      <div className={`${styles.mapMosaic} ${cols}`} role="img" aria-label={label}>
        {map.tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- тайл 256×256 из своего хранилища: оптимизатор next/image его не ужмёт, а прогон через /_next/image - лишний запрос на каждый тайл (решение `F08 | F08-12d`)
          <img
            key={`${t.col}-${t.row}`}
            src={t.url}
            alt=""
            width={TILE_PX}
            height={TILE_PX}
            loading="lazy"
            decoding="async"
            className={styles.mapTile}
          />
        ))}
        <svg
          className={styles.mapPoints}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          focusable="false"
        >
          {map.points.map((p, i) => {
            const cx = inside((p.left / 100) * width, width);
            const cy = inside((p.top / 100) * height, height);
            return (
              <g key={p.key} data-point={p.key}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  strokeWidth={strokeWidth(map.cols)}
                  className={styles.mapPoint}
                />
                {numbered ? (
                  <text
                    x={cx}
                    y={cy}
                    fontSize={numberSize(map.cols)}
                    className={styles.mapPointNumber}
                  >
                    {i + 1}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className={styles.mapCaption}>
        {caption ? <span>{caption}</span> : null}
        <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
          {OSM_ATTRIBUTION}
        </a>
      </figcaption>
    </figure>
  );
}
