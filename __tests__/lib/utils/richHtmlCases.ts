import { expect, it } from 'vitest';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';

// Один набор входов на обе ветки `sanitizeRichHtml`: Node (sanitize-html) и браузер (DOMPurify) — решение арбитра T27.
export const EDITOR_HTML =
  '<h2 style="text-align: right">T</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s></p>' +
  '<pre><code class="language-ts">x</code></pre><ol start="3"><li>a</li></ol>' +
  '<p><a href="https://e.com" target="_blank" rel="noopener noreferrer">l</a> ' +
  '<a href="mailto:a@example.com">m</a> <a href="/ru/book/x">r</a></p>' +
  '<p><img src="https://cdn.example.com/a.png" alt="A" width="10" height="20"></p><blockquote><p>q</p></blockquote><hr>';

export const DANGEROUS: ReadonlyArray<[string, string, string]> = [
  ['event handler on an image', '<img src="https://e.com/x.png" onerror="alert(1)">', 'onerror'],
  ['script with its body', '<script>alert(1)</script><p>t</p>', 'alert'],
  ['javascript: link', '<a href="javascript:alert(1)">x</a>', 'javascript'],
  ['javascript: split by a tab', '<a href="java&#9;script:alert(1)">x</a>', 'script:'],
  ['data: link', '<a href="data:text/html,<b>x</b>">x</a>', 'data:'],
  ['data: image', '<img src="data:image/png;base64,AAA">', 'data:'],
  ['mailto: image', '<img src="mailto:a@example.com">', 'mailto'],
  ['protocol-relative image', '<img src="//evil.example/x.png">', 'evil'],
  ['protocol-relative link with backslashes', '<a href="\\\\evil.example">x</a>', 'evil'],
  ['protocol-relative link with mixed slashes', '<a href="/\\evil.example">x</a>', 'evil'],
  ['iframe', '<iframe src="https://e.com"></iframe>', 'iframe'],
  ['style tag', '<style>p{color:red}</style><p>t</p>', 'color'],
  ['style other than text-align', '<p style="color:red">c</p>', 'color'],
  [
    'text-align smuggling more',
    '<p style="text-align: center; background: url(x)">c</p>',
    'background',
  ],
  [
    'style on a tag that has none',
    '<a href="https://e.com" style="text-align: center">x</a>',
    'style',
  ],
  ['class other than language-*', '<code class="x">c</code>', 'class'],
  ['class on another tag', '<p class="language-ts">c</p>', 'class'],
  ['attribute not on its tag', '<p href="https://e.com" src="https://e.com">c</p>', 'href'],
  ['data attribute', '<p data-x="1">c</p>', 'data-x'],
];

export function describeSanitizeContract(): void {
  it('keeps what the editor produces', () => {
    const out = sanitizeRichHtml(EDITOR_HTML);

    expect(out).toContain('<h2 style="text-align: right">T</h2>');
    expect(out).toContain('<strong>b</strong> <em>i</em> <u>u</u> <s>s</s>');
    expect(out).toContain('<code class="language-ts">x</code>');
    expect(out).toContain('<ol start="3">');
    expect(out).toContain('href="https://e.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('href="mailto:a@example.com"');
    expect(out).toContain('href="/ru/book/x"');
    expect(out).toContain('src="https://cdn.example.com/a.png"');
    expect(out).toContain('width="10"');
    expect(out).toContain('<blockquote><p>q</p></blockquote>');
    expect(out).toContain('<hr');
  });

  it.each(DANGEROUS)('strips %s', (_name, html, needle) => {
    expect(sanitizeRichHtml(html)).not.toContain(needle);
  });

  // Одинаковый выброс на сервере и в браузере: иначе SSR и гидратация показывают разный текст.
  it.each([
    '<textarea>ZZ</textarea>',
    '<select><option>ZZ</option></select>',
    '<title>ZZ</title>',
    '<svg><text>ZZ</text></svg>',
    '<math><mi>ZZ</mi></math>',
    '<template><p>ZZ</p></template>',
    '<iframe>ZZ</iframe>',
    '<noscript>ZZ</noscript>',
    '<object>ZZ</object>',
    '<xmp>ZZ</xmp>',
  ])('drops %s together with its content', (html) => {
    expect(sanitizeRichHtml(`<p>a</p>${html}<p>b</p>`)).toBe('<p>a</p><p>b</p>');
  });

  it('keeps the text of a stripped wrapper', () => {
    expect(sanitizeRichHtml('<div><span>t</span></div>')).toBe('t');
  });
}
