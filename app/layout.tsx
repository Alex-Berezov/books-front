import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bibliaris - Multilingual Audiobook Platform',
  description: 'Discover and enjoy audiobooks in multiple languages',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
