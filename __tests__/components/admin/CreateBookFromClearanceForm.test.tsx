import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateBookFromClearanceForm } from '@/components/admin/RightsIntakeDetail/CreateBookFromClearanceForm/CreateBookFromClearanceForm';
import type { RightsIntake } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useCreateBookFromClearance: () => ({ mutate: mocks.mutate, isPending: false }),
}));

const intake = {
  id: 'intake-1',
  candidateTitle: 'The Fall of the House of Usher',
  candidateAuthor: 'Edgar Allan Poe',
  originalTitle: 'The Fall of the House of Usher',
  originalLanguage: 'en',
  targetLanguages: ['en'],
  targetCountryCodes: ['US'],
  workflowStatus: 'APPROVED',
} as unknown as RightsIntake;

const renderForm = () =>
  render(<CreateBookFromClearanceForm intakeId="intake-1" intake={intake} onSuccess={vi.fn()} />);

const submit = () => screen.getByRole('button', { name: /create book|attach clearance/i });

describe('CreateBookFromClearanceForm — WP-L.1 content fields are gone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not ask for a description or a cover', () => {
    renderForm();

    expect(screen.queryByPlaceholderText('Book description')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('https://example.com/cover.jpg')).not.toBeInTheDocument();
  });

  // Смягчённая сторона: форма отправляется без описания и обложки, которых больше нет.
  it('submits a version without content fields', async () => {
    renderForm();

    await userEvent.click(submit());

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const payload = mocks.mutate.mock.calls[0][0] as {
      data: { versions?: Array<Record<string, unknown>> };
    };
    expect(payload.data.versions).toHaveLength(1);
    expect(payload.data.versions?.[0]).not.toHaveProperty('description');
    expect(payload.data.versions?.[0]).not.toHaveProperty('coverImageUrl');
  });

  // Строгая сторона: то, что относится к изданию, обязательным быть не перестало.
  it('keeps the submit button disabled while the title is empty', async () => {
    renderForm();

    const title = screen.getByPlaceholderText('Book title');
    await userEvent.clear(title);

    expect(submit()).toBeDisabled();
  });
});

describe('CreateBookFromClearanceForm — WP-L.2 attaching to an existing book', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const attachCheckbox = () =>
    screen.getByRole('checkbox', { name: /attach the clearance to an existing book/i });

  it('hides the version editor and sends no versions when attaching', async () => {
    renderForm();

    await userEvent.click(attachCheckbox());

    expect(screen.queryByPlaceholderText('Book title')).not.toBeInTheDocument();
    expect(screen.getByText('Existing book mode')).toBeInTheDocument();

    await userEvent.click(submit());

    const payload = mocks.mutate.mock.calls[0][0] as {
      data: { attachToExistingBook?: boolean; versions?: unknown };
    };
    expect(payload.data.attachToExistingBook).toBe(true);
    expect(payload.data.versions).toBeUndefined();
  });

  // Обратная сторона: без флажка запрос прежний — версии передаются, привязки нет.
  it('sends versions and no attach flag by default', async () => {
    renderForm();

    await userEvent.click(submit());

    const payload = mocks.mutate.mock.calls[0][0] as {
      data: { attachToExistingBook?: boolean; versions?: unknown[] };
    };
    expect(payload.data.attachToExistingBook).toBeUndefined();
    expect(payload.data.versions).toHaveLength(1);
  });

  it('still requires a slug when attaching', async () => {
    renderForm();

    await userEvent.click(attachCheckbox());
    await userEvent.clear(screen.getByPlaceholderText('book-slug'));

    expect(submit()).toBeDisabled();
  });
});
