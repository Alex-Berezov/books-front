import { describe, expect, it } from 'vitest';
import { blockText, formFromAnalysis } from '@/lib/admin/book-analysis-form-state';

describe('blockText: ключ из `kept` - текст поля', () => {
  const form = formFromAnalysis(null);
  const filled = {
    ...form,
    facts: { ...form.facts, genre: 'Novel' },
    texts: { ...form.texts, mainIdea: 'Idea' },
    drafts: { ...form.drafts, themes: { ...form.drafts.themes, text: '[1]' } },
  };

  it.each([
    ['facts.genre', 'Novel'],
    ['mainIdea', 'Idea'],
    ['themes', '[1]'],
  ])('%s', (key, text) => {
    expect(blockText(filled, key)).toBe(text);
  });
});
