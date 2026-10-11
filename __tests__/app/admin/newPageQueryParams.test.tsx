import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewPage from '@/app/admin/[lang]/pages/new/page';

const { query, formProps } = vi.hoisted(() => ({
  query: { current: '' },
  formProps: { current: {} as Record<string, unknown> },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en' }),
  useSearchParams: () => new URLSearchParams(query.current),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

vi.mock('@/api/hooks', () => ({
  useCreatePage: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/admin/pages/PageForm', () => ({
  PageForm: (props: Record<string, unknown>) => {
    formProps.current = props;
    return <div data-testid="page-form" />;
  },
}));

/**
 * `T121` (`LEGACY-448`): в next 15 `searchParams` страницы — Promise, и клиентская страница
 * создания CMS-страницы читает адрес через `useSearchParams`. «Создать перевод» приходит сюда
 * с `translationGroupId` и `targetLang` — потерянный параметр создал бы страницу вне группы
 * переводов и на языке админки.
 */
describe('создание CMS-страницы: параметры адреса', () => {
  beforeEach(() => {
    formProps.current = {};
  });

  it('перевод: форма получает группу переводов и язык перевода из адреса', () => {
    query.current = 'translationGroupId=group-1&targetLang=fr';

    render(<NewPage />);

    expect(screen.getByTestId('page-form')).toBeInTheDocument();
    expect(formProps.current).toMatchObject({ lang: 'fr', translationGroupId: 'group-1' });
  });

  it('без параметров: язык админки, вне группы переводов', () => {
    query.current = '';

    render(<NewPage />);

    expect(formProps.current.lang).toBe('en');
    expect(formProps.current.translationGroupId).toBeUndefined();
  });
});
