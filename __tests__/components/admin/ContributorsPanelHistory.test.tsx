import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContributorsPanel } from '@/components/admin/ContributorsPanel/ContributorsPanel';
import type { RightsProfileContributorEvent } from '@/types/api-schema/rights-intake';

/**
 * LEGACY-037: журнал связей участников заводился ради человеческой читаемости, но до
 * 21.09.2026 не читался нигде — отвязанного участника было видно только прямым запросом
 * в базу. Панель показывает историю; связь удаляется физически, поэтому список участников
 * на этот вопрос не отвечает в принципе.
 */

vi.mock('@/api/hooks/useContributors', () => ({
  useLinkRightsComponentContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLinkSourceEditionContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnlinkRightsComponentContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnlinkSourceEditionContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/admin/ContributorsPanel/ContributorModal', () => ({
  ContributorModal: () => null,
}));

const makeEvent = (
  overrides: Partial<RightsProfileContributorEvent> = {}
): RightsProfileContributorEvent => ({
  id: 'event-1',
  eventType: 'UNLINKED',
  rightsProfileContributorId: 'link-1',
  rightsComponentId: null,
  sourceEditionId: 'se-1',
  personId: 'person-1',
  role: 'TRANSLATOR',
  displayName: 'Иван Иванов',
  creditedName: 'И. Иванов',
  snapshot: {
    canonicalName: 'Иванов, Иван',
    birthYear: 1901,
    deathYear: 1975,
    nationalityCountryCode: 'RU',
    notesRu: 'перевод с французского',
    linkedAt: '2026-08-01T00:00:00.000Z',
  },
  createdByUserId: 'admin-1',
  createdAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});

describe('ContributorsPanel — история привязок (LEGACY-037)', () => {
  it('показывает отвязанного участника, которого уже нет в списке связей', () => {
    render(<ContributorsPanel profileContributors={[]} contributorEvents={[makeEvent()]} />);

    fireEvent.click(screen.getByRole('button', { name: /История привязок \(1\)/ }));

    expect(screen.getByText('Отвязан')).toBeInTheDocument();
    // Имя и годы жизни живут только в снимке события: строка связи удалена физически.
    expect(screen.getByText(/Иванов, Иван/)).toBeInTheDocument();
    expect(screen.getByText(/1901/)).toBeInTheDocument();
    expect(screen.getByText('перевод с французского')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01 10:00')).toBeInTheDocument();
  });

  it('различает привязку и отвязку', () => {
    render(
      <ContributorsPanel
        profileContributors={[]}
        contributorEvents={[
          makeEvent(),
          makeEvent({ id: 'event-2', eventType: 'LINKED', createdAt: '2026-08-01T00:00:00.000Z' }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /История привязок \(2\)/ }));

    expect(screen.getByText('Отвязан')).toBeInTheDocument();
    expect(screen.getByText('Привязан')).toBeInTheDocument();
  });

  // Снимок объявлен обнуляемым, и это ровно тот случай, ради которого журнал читают:
  // у событий, записанных до появления снимка, имя есть только в полях самого события.
  it('без снимка берёт имя из полей события, а затем из personId', () => {
    render(
      <ContributorsPanel
        profileContributors={[]}
        contributorEvents={[
          makeEvent({ snapshot: null }),
          makeEvent({ id: 'event-2', snapshot: null, displayName: null }),
          makeEvent({ id: 'event-3', snapshot: null, displayName: null, personId: null }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /История привязок \(3\)/ }));

    expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
    expect(screen.getByText(/person-1/)).toBeInTheDocument();
    expect(screen.getByText(/—/)).toBeInTheDocument();
    // Годов жизни без снимка нет, и пустой диапазон рисоваться не должен.
    expect(screen.queryByText(/1901/)).not.toBeInTheDocument();
  });

  // Ноль — валидный год: бэкенд пропускает его как конечное число, и теряться он не должен.
  it('показывает нулевой год жизни, а не прячет строку целиком', () => {
    render(
      <ContributorsPanel
        profileContributors={[]}
        contributorEvents={[
          makeEvent({
            snapshot: {
              canonicalName: 'Аноним',
              birthYear: 0,
              deathYear: null,
              nationalityCountryCode: null,
              notesRu: null,
              linkedAt: null,
            },
          }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /История привязок \(1\)/ }));

    // Диапазон рисуется как «0–»: через `||` нулевой год утащил бы за собой всю строку.
    expect(
      screen.getByText((_, element) => element?.textContent?.startsWith('0–') === true, {
        selector: 'span',
      })
    ).toBeInTheDocument();
  });

  it('не показывает блок истории, когда событий нет', () => {
    render(<ContributorsPanel profileContributors={[]} contributorEvents={[]} />);

    expect(screen.queryByRole('button', { name: /История привязок/ })).not.toBeInTheDocument();
  });

  it('до раскрытия история свёрнута', () => {
    render(<ContributorsPanel profileContributors={[]} contributorEvents={[makeEvent()]} />);

    expect(screen.queryByText('Отвязан')).not.toBeInTheDocument();
  });
});
