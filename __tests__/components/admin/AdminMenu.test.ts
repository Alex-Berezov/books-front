import { describe, expect, it } from 'vitest';
import {
  getAdminMenuItems,
  getVisibleAdminMenuItems,
} from '@/components/admin/AdminShell/admin.constants';

describe('getVisibleAdminMenuItems', () => {
  it('gives a lawyer exactly the two legal sections', () => {
    const items = getVisibleAdminMenuItems('en', ['lawyer']);

    expect(items.map((item) => item.id)).toEqual(['rights-notifications', 'legal-reviews']);
  });

  it('gives an admin every item', () => {
    const items = getVisibleAdminMenuItems('en', ['admin']);

    expect(items).toHaveLength(getAdminMenuItems('en').length);
    expect(items.map((item) => item.id)).toContain('books');
    expect(items.map((item) => item.id)).toContain('legal-reviews');
  });

  it('gives a content manager every item as well', () => {
    const items = getVisibleAdminMenuItems('en', ['content_manager']);

    expect(items).toHaveLength(getAdminMenuItems('en').length);
  });

  it('gives a plain user nothing', () => {
    expect(getVisibleAdminMenuItems('en', ['user'])).toEqual([]);
  });

  it('unions the items when a user is both staff and a lawyer', () => {
    const items = getVisibleAdminMenuItems('en', ['content_manager', 'lawyer']);

    expect(items).toHaveLength(getAdminMenuItems('en').length);
  });

  it('builds the legal reviews path for the current language', () => {
    const [, legal] = getVisibleAdminMenuItems('ru', ['lawyer']);

    expect(legal.path).toBe('/admin/ru/legal-reviews');
  });
});
