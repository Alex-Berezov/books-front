import { Suspense } from 'react';
import type { Metadata } from 'next';
import SignInClient from './SignInClient';
import { SignInLoading } from './SignInLoading';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

export default function Page() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInClient />
    </Suspense>
  );
}
