// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

/**
 * `/contact` (`F01-4`, решение арбитра 13.10.2026): блок берёт адрес своей константы из фактов
 * владельца. Сегодня все три равны общему, поэтому подмена здесь разводит их - иначе перепутанные
 * константы неотличимы, пока владелец не заполнит отдельные адреса.
 */
vi.mock('@/lib/site/owner-facts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/site/owner-facts')>()),
  contactGeneral: 'general@test.invalid',
  contactRights: 'rights@test.invalid',
  contactPrivacy: 'privacy@test.invalid',
}));

describe('контакты: адрес блока - из своей константы', () => {
  it.each(SUPPORTED_LANGS)('%s', (lang) => {
    const emails = Object.fromEntries(
      getLegalDocument('contact', lang).sections.map((section) => [
        section.id,
        section.blocks
          .flatMap((block) => (block.kind === 'paragraph' ? block.content : []))
          .flatMap((part) => (part.kind === 'mailto' ? [part.email] : [])),
      ])
    );
    expect(emails).toEqual({
      general: ['general@test.invalid'],
      corrections: ['general@test.invalid'],
      rights: ['rights@test.invalid'],
      privacy: ['privacy@test.invalid'],
      response: [],
    });
  });
});
