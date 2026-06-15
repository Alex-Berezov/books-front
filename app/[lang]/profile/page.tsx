import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

export default function Page() {
  return <ProfileClient />;
}
