import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

export default function Page() {
  return <RegisterClient />;
}
