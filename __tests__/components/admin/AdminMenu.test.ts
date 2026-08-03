import { describe, expect, it } from 'vitest';
import {
  getAdminMenuItems,
  getVisibleAdminMenuItems,
  getVisibleAdminMenuTree,
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

describe('getVisibleAdminMenuTree', () => {
  const groupNode = (roles: string[]) => {
    const node = getVisibleAdminMenuTree('en', roles).find((entry) => entry.kind === 'group');
    return node?.kind === 'group' ? node : undefined;
  };

  it('collapses every rights section into one top-level entry', () => {
    const nodes = getVisibleAdminMenuTree('en', ['admin']);
    const group = groupNode(['admin']);

    expect(group?.group.label).toBe('Rights & Legal');
    expect(group?.items.map((item) => item.id)).toEqual([
      'rights-intakes',
      'rights-claims',
      'rights-notifications',
      'rights-rechecks',
      'legal-reviews',
    ]);
    // Пять разделов занимают в меню одну строку вместо пяти.
    expect(nodes).toHaveLength(getAdminMenuItems('en').length - 4);
  });

  it('keeps every other section on the top level', () => {
    const topLevelIds = getVisibleAdminMenuTree('en', ['admin'])
      .filter((node) => node.kind === 'item')
      .map((node) => (node.kind === 'item' ? node.item.id : ''));

    expect(topLevelIds).toContain('books');
    expect(topLevelIds).toContain('users');
    expect(topLevelIds).not.toContain('rights-intakes');
  });

  it('gives a lawyer only the group with the two sections they may see', () => {
    const nodes = getVisibleAdminMenuTree('en', ['lawyer']);

    expect(nodes).toHaveLength(1);
    expect(groupNode(['lawyer'])?.items.map((item) => item.id)).toEqual([
      'rights-notifications',
      'legal-reviews',
    ]);
  });

  it('gives a plain user nothing at all — no empty group', () => {
    expect(getVisibleAdminMenuTree('en', ['user'])).toEqual([]);
  });

  it('carries the language through to the nested paths', () => {
    expect(groupNode(['admin'])).toBeDefined();
    const ruGroup = getVisibleAdminMenuTree('ru', ['admin']).find((node) => node.kind === 'group');

    expect(ruGroup?.kind === 'group' && ruGroup.items[0].path).toBe('/admin/ru/rights-intakes');
  });
});
