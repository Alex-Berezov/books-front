import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContributorModal } from '@/components/admin/ContributorsPanel/ContributorModal';
import '@/providers/LazyConfigProvider';

vi.mock('@/api/hooks/useContributors', () => ({
  useContributors: () => ({ data: { items: [] }, isLoading: false }),
  useCreateContributor: () => ({
    mutateAsync: vi.fn().mockRejectedValue(new Error('backend down')),
    isPending: false,
  }),
}));

/**
 * `T121` (`LEGACY-448`). antd 5 рендерит статические `message.*` и `Modal.confirm` своим
 * `ReactDOM.render`, которого в React 19 нет: без патча `@ant-design/v5-patch-for-react-19`
 * тост в админке молча не появляется. Патч подключает `providers/LazyConfigProvider.tsx` —
 * импортируется он, а не сам патч, чтобы тест краснел и при снятом импорте. Тост вызывает
 * настоящий админский компонент: импорт `antd` в тестах запрещён (`LEGACY-442`).
 */
describe('antd 5 на React 19: статический тост админки виден', () => {
  it('отказ сохранения участника показывает message.error', async () => {
    render(<ContributorModal open onClose={vi.fn()} onSelectContributor={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Например: Alexander Pope'), {
      target: { value: 'Alexander Pope' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ok/i }));
    });

    expect(await screen.findByText('Ошибка при сохранении участника')).toBeInTheDocument();
  });
});
