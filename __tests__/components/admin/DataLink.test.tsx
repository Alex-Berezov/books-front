import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { DataLink, UNSAFE_LINK_NOTE } from '@/components/admin/common/DataLink';

/**
 * 🔴 `LEGACY-447`: ссылка из данных в админке. `http(s)` — ссылка, иная схема — текст
 * с припиской (юрист видит, что значение есть, но негодно), пустое — ничего.
 */
describe('DataLink (LEGACY-447)', () => {
  it('рендерит http(s) ссылкой с подписью', () => {
    render(<DataLink url="https://example.org/law">Закон</DataLink>);
    expect(screen.getByRole('link', { name: 'Закон' })).toHaveAttribute(
      'href',
      'https://example.org/law'
    );
  });

  it.each(['javascript:alert(1)', 'www.gutenberg.org/ebooks/1'])(
    'рендерит %j текстом, не ссылкой',
    (url) => {
      render(<DataLink url={url}>Закон</DataLink>);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText(`${url} ${UNSAFE_LINK_NOTE}`)).toBeInTheDocument();
    }
  );

  it.each([null, undefined, ''])('ничего не рендерит для %j', (url) => {
    const { container } = render(<DataLink url={url} />);
    expect(container).toBeEmptyDOMElement();
  });

  // Шесть мест админки рендерят ссылку из данных только через `DataLink`: сырой `href`
  // от поля вернул бы `javascript:` в клик админа.
  it.each([
    ['components/admin/RightsIntakeDetail/IntakeOverview/IntakeOverview.tsx', 'intake.sourceUrl'],
    ['components/admin/RightsIntakeDetail/EvidencePanel/EvidencePanel.tsx', 'item.url'],
    ['components/admin/books/RightsClaimsPanel/RightsClaimDetailDrawer.tsx', 'attachment.url'],
    ['components/admin/books/RightsTab/RightsTabSourceEdition.tsx', 'sourceEdition.sourceUrl'],
    [
      'components/admin/RightsIntakeDetail/RightsProfilePanel/RightsProfilePanel.tsx',
      'currentProfile.sourceEdition.sourceUrl',
    ],
    ['components/admin/rights-intakes/RightsIntakeList/RightsIntakeList.tsx', 'intake.sourceUrl'],
  ])('%s рендерит %s через DataLink', (file, field) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    expect(source).toContain(`<DataLink url={${field}}`);
    expect(source).not.toContain(`href={${field}}`);
  });
});
