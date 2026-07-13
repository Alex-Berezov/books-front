# TZ: Mobile performance optimization for Bibliaris homepage

## Goal

Improve mobile loading performance of the Bibliaris homepage without adding R2/CDN work in this task.

Target pages:

- `/en`
- `/es`
- `/fr`
- `/pt`
- `/ru`

The current mobile homepage contains:

- Header
- Hero
- `Top Popular` book carousel
- `Genres`
- `New Releases`
- `Explore Book Themes`
- `Why Bibliaris?`
- `About Bibliaris`
- `FAQ`
- Footer

This task is only about making the existing homepage load faster on mobile.

---

## Out of scope

Do not implement in this task:

- Cloudflare R2
- New media domain
- CDN setup
- Image upload pipeline
- New homepage design
- New taxonomy/content logic
- Heavy carousel libraries
- Full redesign of blocks
- Skeleton loaders for server-available homepage data

---

## Main principle

The homepage should be mostly server-rendered/static.

Do not make the homepage wait for client-side JavaScript before showing books, links, text, or FAQ.

Critical above-the-fold content must be available immediately:

- Header
- Hero title/text/buttons
- First book carousel section
- First visible book cards

---

## 1. Remove Audiobooks from the first screen while there are no audiobooks

On the screenshot, the Hero still shows the `Audiobooks` button.

Until the project has at least one real audiobook, hide this button on mobile and desktop.

Required logic:

- If `audioBooksCount === 0`, do not render the `Audiobooks` CTA in Hero.
- If `audioBooksCount > 0`, render it.

This reduces unnecessary first-screen UI and prevents a link to an unavailable section.

Also make sure `Audiobooks` is not loaded/rendered in:

- Header
- Mobile menu
- Footer
- Homepage sections

when `audioBooksCount === 0`.

---

## 2. Do not use skeletons for the first book block

Do not add skeleton loading for `Top Popular` / first book section.

Skeletons are not needed if the data can be rendered on the server.

Required behavior:

- Book cards must be present in the initial HTML.
- No loading placeholder before book cards if the books are known on the server.
- No client-only fetch for the first book block.

Bad flow:

1. Page renders.
2. Client JS loads.
3. API request starts.
4. Skeleton appears.
5. Books appear.

Correct flow:

1. Server prepares homepage data.
2. HTML already contains book cards.
3. Browser starts loading images with correct priority.

---

## 3. Server-render homepage data

Check how the homepage currently loads:

- books for `Top Popular`
- books for `New Releases`
- genres
- tags/themes
- text blocks
- FAQ

If any of these are fetched only on the client via `useEffect`, client-only React Query, SWR client fetch, or similar, move them to server-side rendering where possible.

Expected result:

- H1 is in HTML.
- Hero text is in HTML.
- First book cards are in HTML.
- Genre cards are in HTML.
- Theme cards are in HTML.
- About text is in HTML.
- FAQ text is in HTML.

If the project uses Next.js App Router:

- Keep the homepage as a Server Component where possible.
- Use server-side data fetching.
- Keep only small interactive parts as Client Components.

Client Components are allowed only for real interactivity:

- mobile menu
- search overlay
- language switcher
- user menu
- carousel arrows, if they are actually interactive

Do not put `use client` on the whole homepage unless absolutely necessary.

---

## 4. Optimize the first book carousel images

The first visible book carousel is close to the first screen on mobile. Its images affect perceived speed and may affect LCP.

Required image behavior:

### First visible book cover

The first visible cover in the first book block must not be lazy-loaded.

Use:

- `loading="eager"`
- `fetchPriority="high"`

or the equivalent supported by the current image component.

Apply this only to the first important visible cover.

### Other visible covers in the same row

For the second and third visible covers:

- Do not set `fetchPriority="high"`.
- Use default/eager behavior only if they are above the fold.
- Use `fetchPriority="auto"`.

### Covers below the first viewport

For covers lower on the page:

- `loading="lazy"`
- `decoding="async"`

Do not lazy-load the possible LCP image.

Do not set high priority on all book covers.

---

## 5. Fix image dimensions and CLS

All book cover images must reserve layout space before the image loads.

Required:

- Use explicit `width` and `height`, or
- Use stable CSS `aspect-ratio`.

For book covers, use a stable ratio close to:

- `aspect-ratio: 2 / 3`

No book card should jump when the cover loads.

Check this for:

- `Top Popular`
- `New Releases`
- any other book card section

---

## 6. Use correct mobile image sizes

On mobile, visible book covers are small. Do not make the browser download large desktop-sized covers for mobile cards.

If using `next/image`, make sure every book cover has correct `sizes`.

Recommended for mobile carousel cards:

- fixed card image: `sizes="160px"`
- responsive card image: `sizes="(max-width: 640px) 42vw, 180px"`

The exact values may be adjusted to match the actual card width.

Required check:

- In DevTools Network, verify that mobile does not download unnecessarily large cover images.
- If the card is around 140-180px wide, the loaded image should not be 1000px+ wide.

---

## 7. Avoid duplicate early image loading from repeated book sections

The screenshots show both `Top Popular` and `New Releases`, and with only 4 books these blocks likely repeat the same books.

For mobile performance, do not eagerly load duplicate book covers from multiple sections.

Required:

- Keep the first book section visible near the top.
- For book sections below the fold, all images must be lazy-loaded.
- If `New Releases` repeats the same books as `Top Popular`, do not prioritize its images.
- Do not preload or high-priority load images from `New Releases`.

Optional, if easy and already supported:

- On mobile, hide `New Releases` if it duplicates the same books as the first block and total books count is very small.
- If not hiding it, keep it below the fold and lazy-load all its images.

Do not make a large redesign for this. The minimum requirement is correct image priority.

---

## 8. Use lightweight horizontal scrolling, not a heavy carousel

For mobile book rows and taxonomy rows, use CSS horizontal scroll.

Preferred:

- `display: flex`
- `overflow-x: auto`
- `scroll-snap-type: x proximity`
- cards with `flex: 0 0 auto`

Do not add Swiper, Slick, or another heavy carousel library for these rows.

If a heavy carousel library is already used only for these simple rows, replace it with CSS scrolling if possible without large refactoring.

---

## 9. Optimize below-the-fold sections without removing them from HTML

Sections below the first screen:

- `Genres`
- `New Releases`
- `Explore Book Themes`
- `Why Bibliaris?`
- `About Bibliaris`
- `FAQ`
- Footer

must remain in HTML for SEO and fast navigation.

Do not lazy-render them via client-side JS after scroll.

Instead, add CSS optimization where safe:

```css
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: 600px;
}
```

Apply to below-fold sections only.

Do not apply to:

- Header
- Hero
- First visible book section

Tune `contain-intrinsic-size` per section if needed to avoid scroll jumps.

---

## 10. Reduce JavaScript on the homepage

Check the homepage bundle.

Remove unnecessary client-side code from static sections:

- Hero
- book card layout
- genre cards
- theme cards
- Why Bibliaris cards
- About text
- FAQ content if it can be rendered with native HTML or a lightweight component

Allowed client-side code:

- menu toggle
- search toggle
- language selector
- account icon/menu
- minimal carousel controls if necessary

Do not hydrate static content unnecessarily.

---

## 11. Optimize FAQ for performance

FAQ should be available in HTML.

Use a lightweight implementation.

Preferred:

- native `details` / `summary`, or
- existing lightweight accordion if already implemented

Avoid a large client-only accordion library for this block.

---

## 12. Fonts and icons

Check mobile first load for fonts and icons.

Required:

- Do not load unused font weights.
- Use `font-display: swap` if custom web fonts are used.
- Avoid large icon libraries on the homepage if only a few icons are used.
- Import only used icons, not the whole icon pack.

---

## 13. What to verify in DevTools

Use mobile throttling and check Network/Performance.

Verify:

1. First book cards are not loaded through a client-only API request after page load.
2. The first important cover is not lazy-loaded.
3. Only one first cover has high priority.
4. Covers below the fold are lazy-loaded.
5. Mobile does not download oversized cover images.
6. There is no layout shift when covers load.
7. `Audiobooks` UI is not rendered when there are no audiobooks.
8. Below-fold sections are present in HTML.
9. There is no heavy carousel JS for simple horizontal rows.
10. Static sections are not unnecessarily hydrated.

---

## 14. Lighthouse targets

Run Lighthouse/PageSpeed for mobile on:

- `/en`

If possible, also check:

- `/es`
- `/fr`
- `/pt`
- `/ru`

Target values:

- Performance: 90+
- LCP: under 2.5s
- CLS: under 0.1
- INP: under 200ms

If targets are not reached, report what still blocks performance.

---

## 15. Acceptance criteria

The task is complete when:

1. `Audiobooks` button/link is hidden while `audioBooksCount === 0`.
2. First book section renders without skeletons.
3. First book section data is available in initial HTML.
4. First important cover uses eager/high priority or equivalent.
5. No other cover incorrectly uses high priority.
6. Below-fold cover images are lazy-loaded.
7. All covers have stable dimensions/aspect ratio.
8. Mobile image sizes are correct and not oversized.
9. Below-fold text/link sections remain in HTML.
10. Below-fold sections use `content-visibility: auto` where safe.
11. Static homepage sections are not unnecessarily client components.
12. No heavy carousel library is used for simple horizontal rows.
13. FAQ is rendered in HTML and remains lightweight.
14. No visible layout shift occurs while images load.
15. Lighthouse/DevTools checks have been performed and summarized.

---

## Final report required from the agent

After implementation, provide a short report:

1. Files changed.
2. Whether homepage data was client-fetched before.
3. How homepage data is loaded now.
4. How first book cover priority is handled.
5. How below-fold images are lazy-loaded.
6. How CLS was prevented.
7. Whether `Audiobooks` is hidden when empty.
8. Lighthouse/DevTools results or remaining blockers.
