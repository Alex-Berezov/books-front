import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';

vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// 🔴 LEGACY-419: ответ FAQ из админки `</script><img onerror=…>` закрывал блок JSON-LD в серверной
// разметке, и дальше браузер исполнял обычный HTML у анонимного читателя. В тексте блока `<` быть не должно:
// ровно этот текст сервер кладёт между `<script>` и `</script>`.
describe('FaqBlock JSON-LD', () => {
  const HOSTILE = '</script><img src=x onerror=alert(1)>';

  const ldJson = (): string => {
    const { container } = render(<FaqBlock items={[{ question: 'Q?', answer: HOSTILE }]} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    return script?.innerHTML ?? '';
  };

  it('admin text cannot close the ld+json script', () => {
    expect(ldJson()).not.toContain('<');
  });

  it('the ld+json body still parses back to the admin text', () => {
    expect(JSON.parse(ldJson()).mainEntity[0].acceptedAnswer.text).toBe(HOSTILE);
  });
});
