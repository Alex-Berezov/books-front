import type { Metadata } from 'next';
import SignInClient from './SignInClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

export default function Page() {
  return <SignInClient />;
}
