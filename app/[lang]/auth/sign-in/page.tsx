import { Suspense } from 'react';
import type { Metadata } from 'next';
import SignInClient from './SignInClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          Loading...
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
