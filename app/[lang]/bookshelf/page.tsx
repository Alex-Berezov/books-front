import type { Metadata } from 'next';
import BookshelfClient from './BookshelfClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

export default function Page() {
  return <BookshelfClient />;
}
