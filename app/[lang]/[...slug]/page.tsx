import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ lang: string }>;
};

/**
 * Catch-all under `/:lang` — anything that matched no other route.
 *
 * It used to render a page that *said* "404" and answer **HTTP 200**, with no
 * robots tag, over an unbounded URL space: every typo in a link, anywhere, minted
 * an indexable soft-404. `notFound()` fired only for an unsupported language;
 * for a supported one the component returned JSX and Next served it as 200.
 *
 * Now it always calls `notFound()`, which renders `app/not-found.tsx` with a real
 * 404 status. The presentation that used to live here belongs in that file, which
 * is the one Next actually reaches for a missing page — keeping a second copy of
 * it on a 200 route is what created the defect.
 */
export default async function CatchAllNotFound({ params }: Props) {
  await params;
  notFound();
}
