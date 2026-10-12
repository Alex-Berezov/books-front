/**
 * Пути API, на которые серверный прокси несёт тело загрузки потоком (`LEGACY-465`, решения
 * арбитра 12.10.2026, ревью круг 1).
 *
 * Тело не-JSON на любой другой путь — 415 до чтения: потолок такого тела держит только ручка
 * загрузки на бэкенде. Вызывающие загрузки держат путь литералом по месту вызова — так требует
 * `check:type-sync` (`LEGACY-183`); расхождение с этим списком ловит
 * `__tests__/lib/uploadRoutes.test.ts`: он сам находит загрузки в `api/**` и прогоняет их пути
 * через `isUploadRoute`. Новая ручка загрузки без строки здесь краснеет тестом, а не 415
 * на живом запросе.
 */

/** Сегмент-параметр шаблона: любой непустой сегмент без `/`. */
const PARAM = ':id';

const UPLOAD_ROUTES: readonly string[] = [
  '/uploads/direct',
  '/media/upload',
  '/admin/rights/review-imports/:id/report-pdf',
  '/admin/rights/profiles/:id/source-file',
  '/admin/rights/evidence/:id/archive-copy',
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Шаблон пути в регулярное выражение. Каждый кусок экранируется: точка в будущем пути не должна
 * совпадать с любым символом — иначе поток без потолка ушёл бы на чужой путь.
 */
export const uploadRoutePattern = (route: string): RegExp =>
  new RegExp(`^${route.split(PARAM).map(escapeRegExp).join('[^/]+')}$`);

const UPLOAD_ROUTE_PATTERNS: readonly RegExp[] = UPLOAD_ROUTES.map(uploadRoutePattern);

/** Путь API (без строки запроса) — ручка загрузки. */
export const isUploadRoute = (path: string): boolean =>
  UPLOAD_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
