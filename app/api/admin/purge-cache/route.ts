import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

const PUBLIC_PATHS = [
  '',
  '/catalog',
  '/categories',
  '/genres',
  '/collections',
  '/tags',
  '/authors',
];

export async function POST() {
  try {
    const session = await auth();
    if (
      !session?.user?.roles?.some((role) =>
        STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])
      )
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const revalidated: string[] = [];

    // Homepage
    revalidatePath('/');
    revalidated.push('/');

    // Each language
    for (const lang of SUPPORTED_LANGS) {
      const prefix = `/${lang}`;
      for (const sub of PUBLIC_PATHS) {
        const path = `${prefix}${sub}`;
        revalidatePath(path);
        revalidated.push(path);
      }
      revalidatePath(prefix, 'layout');
      revalidated.push(`${prefix} (layout)`);
    }

    // Admin pages
    for (const lang of SUPPORTED_LANGS) {
      revalidatePath(`/admin/${lang}`, 'layout');
      revalidated.push(`/admin/${lang} (layout)`);
    }

    return NextResponse.json({
      success: true,
      revalidated: revalidated.length,
      message: `Cache purged for ${revalidated.length} paths`,
    });
  } catch (error) {
    console.error('Purge cache error:', error);
    return NextResponse.json({ error: 'Failed to purge cache' }, { status: 500 });
  }
}
