import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SummaryClient from '@/app/[lang]/summary/[bookSlug]/[versionId]/SummaryClient';
import { ApiError } from '@/types/api';

const summaryResult = {
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/summary/hamlet/v1',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    data: { slug: 'hamlet', title: 'Гамлет' },
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks/useBookSummary', () => ({
  useBookSummary: () => summaryResult,
}));

/**
 * LEGACY-084, клиентская половина. Серверный `page.tsx` теперь ручается, что книга
 * и `versionId` существуют, поэтому пустой `summaryData` перестал означать
 * «такого адреса нет» и означает одно из двух: саммари ещё не написано либо его
 * не удалось получить (429/500 на `/versions/{id}/summary`). Слитые в один экран,
 * эти два случая отправляли читателя восвояси с уверенным «саммари не написано».
 */
describe('SummaryClient — отказ загрузки отличим от «саммари ещё нет»', () => {
  beforeEach(() => {
    summaryResult.data = undefined;
    summaryResult.isLoading = false;
    summaryResult.error = null;
  });

  const renderClient = () =>
    render(<SummaryClient params={{ lang: 'ru', bookSlug: 'hamlet', versionId: 'v1' }} />);

  it('500 на запросе саммари показывает отказ, а не «саммари нет»', () => {
    summaryResult.error = new ApiError({ message: 'boom', statusCode: 500 });

    renderClient();

    expect(screen.getByText('Не удалось загрузить краткое содержание')).toBeInTheDocument();
    expect(screen.queryByText('Краткое содержание не найдено')).not.toBeInTheDocument();
  });

  it('успешный ответ без содержимого по-прежнему показывает «саммари ещё нет»', () => {
    summaryResult.data = null;

    renderClient();

    expect(screen.getByText('Краткое содержание не найдено')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить краткое содержание')).not.toBeInTheDocument();
  });

  // 🔴 404 — это ответ, а не отказ: версию сняли с публикации, ждать нечего.
  // «Попробуйте позже» здесь было бы той же путаницей, вывернутой наизнанку.
  it('404 показывает «саммари ещё нет», а не «попробуйте позже»', () => {
    summaryResult.error = new ApiError({ message: 'Not found', statusCode: 404 });

    renderClient();

    expect(screen.getByText('Краткое содержание не найдено')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить краткое содержание')).not.toBeInTheDocument();
  });

  // 🔴 `null` — успешный ответ «саммари не написано». На `!summaryData` неудачный
  // фоновый перезапрос подменял бы верный экран «саммари пока нет» на отказ.
  it('не подменяет «саммари пока нет» отказом после неудачного перезапроса', () => {
    summaryResult.error = new ApiError({ message: 'boom', statusCode: 500 });
    summaryResult.data = null;

    renderClient();

    expect(screen.getByText('Краткое содержание не найдено')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить краткое содержание')).not.toBeInTheDocument();
  });

  // 🔴 Экран отказа — только когда показывать нечего: react-query при отказе
  // **пере**запроса держит прежние данные и одновременно ставит `error`.
  it('не выбрасывает читателя из открытого саммари при отказе перезапроса', () => {
    summaryResult.error = new ApiError({ message: 'boom', statusCode: 500 });
    summaryResult.data = { summary: '<p>Ключевые мысли</p>' };

    renderClient();

    expect(screen.getByText('Ключевые мысли')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить краткое содержание')).not.toBeInTheDocument();
  });
});
