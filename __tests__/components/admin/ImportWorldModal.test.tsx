import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportWorldModal } from '@/components/admin/books/WorldTab/ImportWorldModal';
import { WORLD_OBJECT_TYPES, worldTextFieldsOf } from '@/lib/admin/book-world-blocks';

/**
 * Подсказка окна «Import JSON» вкладки World (F08-13b-2, хвост F08-13b-1): строка предмета, понятия
 * и события собрана из `WORLD_OBJECT_TYPES` и перечней полей карточки, а не кортежем руками.
 */

const renderModal = (mode: 'version' | 'entity') =>
  render(
    <ImportWorldModal<object>
      mode={mode}
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

describe('ImportWorldModal: подсказка типов предмета, понятия и события', () => {
  it.each(['version', 'entity'] as const)(
    'режим %s: строка на каждый тип WORLD_OBJECT_TYPES с его полями',
    (mode) => {
      renderModal(mode);
      const text = document.body.textContent ?? '';
      for (const type of WORLD_OBJECT_TYPES) {
        const fields = ['aliases', ...worldTextFieldsOf(type).map((f) => f.path)];
        expect(text).toContain(`type "${type}", fields ${fields.join(', ')}`);
      }
      expect(text).toContain(
        'An object: type "object", fields aliases, short, significance, description, quotes, faq, characterKeys, themeKeys. A term: type "term", fields aliases, short, significance, quotes. An event: type "event", fields aliases, short, significance, scenes, quotes, characterKeys.'
      );
      expect(screen.getAllByText(/They have no role, sources or imageBrief\./).length).toBe(1);
    }
  );
});
