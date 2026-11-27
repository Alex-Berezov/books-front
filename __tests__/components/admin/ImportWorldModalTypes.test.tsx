import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportWorldModal } from '@/components/admin/books/WorldTab/ImportWorldModal';

/**
 * Подсказка окна «Import JSON» следует за перечнем `WORLD_OBJECT_TYPES` (хвост F08-13b-1): тип,
 * добавленный в перечень, попадает в строку подсказки без правки окна. Перечень подменён - в нём
 * лишний тип; кортеж руками его бы не показал. Подпись нового типа здесь не проверяется: её
 * требует `Record<WorldObjectType, string>` в `OBJECT_TYPE_TITLES` на `yarn typecheck`.
 */
vi.mock('@/lib/admin/book-world-blocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin/book-world-blocks')>();
  return { ...actual, WORLD_OBJECT_TYPES: [...actual.WORLD_OBJECT_TYPES, 'ritual'] };
});

describe('ImportWorldModal: подсказка из WORLD_OBJECT_TYPES', () => {
  it('тип из перечня, которого окно не знало, есть в подсказке', () => {
    render(
      <ImportWorldModal<object>
        mode="version"
        isOpen
        onCancel={vi.fn()}
        analyze={null}
        loadFailed={false}
        onRetryLoad={vi.fn()}
        preview={vi.fn()}
        onImport={vi.fn()}
        publishedKeys={() => []}
      />
    );
    expect(document.body.textContent).toContain('type "ritual", fields aliases');
  });
});
