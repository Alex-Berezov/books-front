// Route: /admin/[lang]/books/versions/new?bookId=...
// Reuses the existing NewBookVersionPage component from books/new.
// The static segment `new` takes precedence over the dynamic `[id]` route,
// so editing (`versions/<uuid>`) is unaffected.
export { default } from '../../new/page';
