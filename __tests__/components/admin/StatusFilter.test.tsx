import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusFilter } from '@/components/admin/pages/PageListTable/ui/StatusFilter';

// LEGACY-268: `archived` не существует в enum бэкенда `PublicationStatus` (`draft`/`published`
// only). Сегодня типизация массива `filters` (`Array<{ value: PublicationStatus | 'all'; ... }>`)
// сама отбивает `tsc`-ом возврат литерала `'archived'` — но это первая линия защиты, а не
// единственная: она держится ровно до тех пор, пока эта аннотация не потеряется при рефакторинге
// или пока `PublicationStatus` не расширят обратно. Рантайм-тест сторожит набор отрендеренных
// кнопок независимо от того, через типы или мимо них регрессия вернётся.
//
// ⚠️ Набор кнопок соответствует UI, а не рабочей ручке: нажатие `Draft`/`Published` сегодня
// отвечает 400 (`LEGACY-371`, найдена при разведке этой же записи, чинится отдельным заходом) —
// этот тест проверяет только состав фильтров, а не то, что фильтрация работает.
describe('StatusFilter', () => {
  it('renders exactly the three allowed filters: all, draft, published — and no archived', () => {
    render(<StatusFilter statusFilter="all" onStatusFilterChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archived' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});
