import { describe, expect, it } from 'vitest';
import { htmlToPlainText, truncateAtWord } from '@/lib/utils/html-text';

/**
 * Правило видимого текста - копия `richHtmlText` бэкенда (раздел «Пересказ», 17.10.2026): по нему
 * страница пересказа решает 404, описание пересказа и автора режется `truncateAtWord`.
 */
describe('htmlToPlainText', () => {
  it('снимает теги, расшифровывает сущности, схлопывает пробелы', () => {
    expect(htmlToPlainText('<p>&laquo;Hi&raquo;&nbsp; <b>you</b></p>')).toBe('«Hi» you');
  });

  it.each(['nbsp', 'ensp', 'emsp', 'thinsp', 'shy', 'zwnj', 'zwj'])(
    'сущность &%s; - не текст',
    (name) => {
      expect(htmlToPlainText(`<p>&${name};</p>`)).toBe('');
    }
  );

  it('знаки нулевой ширины и пробельные сущности - не текст', () => {
    expect(htmlToPlainText('<p>&#8203;&ensp;&shy;\u200b\ufeff</p>')).toBe('');
  });
});

describe('truncateAtWord', () => {
  it('короткий текст - как есть, пустой - undefined', () => {
    expect(truncateAtWord('short')).toBe('short');
    expect(truncateAtWord('')).toBeUndefined();
  });

  it('длинный - по границе слова, без хвостовой пунктуации, с многоточием', () => {
    const text = `${'word '.repeat(40)}end.`;
    const result = truncateAtWord(text, 30) as string;
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('word word word word word…');
  });

  it('слово длиннее порога - режется внутри слова', () => {
    expect(truncateAtWord('a'.repeat(50), 10)).toBe(`${'a'.repeat(9)}…`);
  });
});
