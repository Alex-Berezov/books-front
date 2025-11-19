import { auth } from '@/lib/auth/auth';
import { AppProviders } from '@/providers/AppProviders';
import '@/styles/globals.css';
import '@/styles/snackbar.scss';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bibliaris - Multilingual Audiobook Platform',
  description: 'Discover and enjoy audiobooks in multiple languages',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get initial session on server to prevent multiple client requests
  const session = await auth();

  return (
    <AppProviders session={session}>
      {children}
    </AppProviders>
  );
}
