import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RightsOverridePanel } from '@/components/admin/books/RightsOverridePanel/RightsOverridePanel';
import {
  canGrantOverride,
  validateOverrideReason,
} from '@/components/admin/books/RightsOverridePanel/rightsOverridePolicy';
import { ApiError } from '@/types/api';
import type { RightsPublicationOverride } from '@/types/api-schema';
import type { PublicationGateResult } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  snackbar: vi.fn(),
  gate: vi.fn(),
  override: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  pending: { grant: false, revoke: false },
  grantOptions: { current: undefined as { onError?: (e: unknown) => void } | undefined },
  revokeOptions: { current: undefined as { onError?: (e: unknown) => void } | undefined },
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mocks.session(),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mocks.snackbar }),
}));

vi.mock('@/api/hooks', () => ({
  usePublicationGate: () => mocks.gate(),
  useRightsOverride: (bookId: string | undefined) => mocks.override(bookId),
  useGrantRightsOverride: (options: { onError?: (e: unknown) => void }) => {
    mocks.grantOptions.current = options;
    return { mutate: mocks.grant, isPending: mocks.pending.grant };
  },
  useRevokeRightsOverride: (options: { onError?: (e: unknown) => void }) => {
    mocks.revokeOptions.current = options;
    return { mutate: mocks.revoke, isPending: mocks.pending.revoke };
  },
}));

const GRANT_BUTTON = /Разрешить публикацию \(последняя инстанция\)/;

const gateResult = (overrides: Partial<PublicationGateResult> = {}): PublicationGateResult => ({
  versionId: 'version-1',
  bookId: 'book-1',
  canPublish: false,
  checkedAt: '2026-09-27T00:00:00.000Z',
  rightsProfileId: null,
  approvedRightsReviewId: null,
  rightsStatus: null,
  blockingReasons: [
    { code: 'LICENSE_EXPIRED', severity: 'BLOCKER', messageRu: 'Срок лицензии истёк.' },
  ],
  warnings: [],
  contentHashBaseline: null,
  contentHashCurrent: null,
  contentHashMatches: null,
  rightsRecheckRequired: false,
  ...overrides,
});

const decision = (
  overrides: Partial<RightsPublicationOverride> = {}
): RightsPublicationOverride => ({
  id: 'ov-1',
  bookId: 'book-1',
  bookSlug: 'war-and-peace',
  reasonRu: 'Правообладатель подтвердил права письмом',
  grantedAt: '2026-09-27T10:00:00.000Z',
  grantedByUserId: 'admin-1',
  grantedByEmail: 'boss@example.com',
  revokedAt: null,
  revokedByUserId: null,
  revokedByEmail: null,
  revokeReasonRu: null,
  ...overrides,
});

const arrange = (params: {
  roles: string[];
  gate?: PublicationGateResult;
  active?: RightsPublicationOverride | null;
  history?: RightsPublicationOverride[];
  sessionError?: string;
  overrideError?: boolean;
}) => {
  mocks.pending.grant = false;
  mocks.pending.revoke = false;
  mocks.session.mockReturnValue({
    data: { user: { roles: params.roles }, error: params.sessionError },
    status: 'authenticated',
  });
  mocks.gate.mockReturnValue({ data: params.gate, isLoading: false, isError: false });
  const active = params.active ?? null;
  mocks.override.mockReturnValue(
    params.overrideError
      ? { data: undefined, isLoading: false, isError: true }
      : {
          data: { active, history: params.history ?? (active ? [active] : []) },
          isLoading: false,
          isError: false,
        }
  );
};

const apiError = (statusCode: number, data?: Record<string, unknown>) =>
  new ApiError({ statusCode, message: `HTTP ${statusCode}`, data });

const renderPanel = () =>
  render(<RightsOverridePanel bookId="book-1" versionId="version-1" status="draft" />);

describe('RightsOverridePanel — кто видит кнопку', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('показывает кнопку администратору, когда гейт запретил правовым блокером', () => {
    arrange({ roles: ['admin'], gate: gateResult() });
    renderPanel();

    expect(screen.getByRole('button', { name: GRANT_BUTTON })).toBeInTheDocument();
  });

  it('не показывает кнопку content_manager при том же запрете гейта', () => {
    arrange({ roles: ['content_manager'], gate: gateResult() });
    renderPanel();

    expect(screen.queryByRole('button', { name: GRANT_BUTTON })).not.toBeInTheDocument();
    expect(screen.queryByText(/Разрешить публикацию/)).not.toBeInTheDocument();
  });

  it('content_manager видит действующее решение, но не может его отменить', () => {
    arrange({ roles: ['content_manager'], gate: gateResult(), active: decision() });
    renderPanel();

    expect(
      screen.getByText('Публикация книги разрешена решением администратора')
    ).toBeInTheDocument();
    expect(screen.getByText('Правообладатель подтвердил права письмом')).toBeInTheDocument();
    expect(screen.getByText(/boss@example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Отменить решение' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: GRANT_BUTTON })).not.toBeInTheDocument();
  });

  it('не запрашивает решение и ничего не рисует для роли без доступа к ручке', () => {
    arrange({ roles: ['lawyer'], gate: gateResult(), active: decision() });
    const { container } = renderPanel();

    expect(mocks.override).toHaveBeenCalledWith(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('не показывает кнопку, когда гейт запретил только незаполненной версией', () => {
    arrange({
      roles: ['admin'],
      gate: gateResult({
        blockingReasons: [
          {
            code: 'VERSION_CONTENT_INCOMPLETE',
            severity: 'BLOCKER',
            messageRu: 'Нет описания.',
          },
        ],
      }),
    });
    renderPanel();

    expect(screen.queryByRole('button', { name: GRANT_BUTTON })).not.toBeInTheDocument();
  });

  it('не показывает кнопку, когда гейт разрешает публикацию', () => {
    arrange({ roles: ['admin'], gate: gateResult({ canPublish: true, blockingReasons: [] }) });
    renderPanel();

    expect(screen.queryByRole('button', { name: GRANT_BUTTON })).not.toBeInTheDocument();
  });
});

describe('RightsOverridePanel — выдача решения', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openGrant = () => {
    arrange({ roles: ['admin'], gate: gateResult() });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: GRANT_BUTTON }));
    return screen.getByRole('dialog');
  };

  it('предупреждает, что снимаются все правовые проверки всех версий и решение журналируется', () => {
    const dialog = openGrant();

    expect(within(dialog).getByText(/всех версий этой книги/)).toBeInTheDocument();
    expect(within(dialog).getByText(/записывается в журнал/)).toBeInTheDocument();
  });

  it('не отправляет решение с причиной короче 10 знаков', () => {
    const dialog = openGrant();
    const confirm = within(dialog).getByRole('button', { name: 'Разрешить публикацию' });

    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/Причина решения/), {
      target: { value: '   коротко   ' },
    });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByText(/не меньше 10 знаков/)).toBeInTheDocument();

    fireEvent.click(confirm);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it('отправляет обрезанную причину, когда она годится', () => {
    const dialog = openGrant();

    fireEvent.change(within(dialog).getByLabelText(/Причина решения/), {
      target: { value: '  Лицензия продлена, скан в деле  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Разрешить публикацию' }));

    expect(mocks.grant).toHaveBeenCalledWith({
      bookId: 'book-1',
      data: { reasonRu: 'Лицензия продлена, скан в деле' },
    });
  });

  it('при действующем решении предупреждает, что новое его заменит', () => {
    arrange({ roles: ['admin'], gate: gateResult(), active: decision() });
    renderPanel();

    expect(screen.getByText(/Новое решение заменит действующее/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: GRANT_BUTTON })).toBeInTheDocument();
  });
});

describe('RightsOverridePanel — отмена решения', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openRevoke = () => {
    arrange({
      roles: ['admin'],
      gate: gateResult({ canPublish: true, blockingReasons: [] }),
      active: decision(),
    });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Отменить решение' }));
    return screen.getByRole('dialog');
  };

  it('отменяет без причины — поле необязательное', () => {
    const dialog = openRevoke();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отменить решение' }));

    expect(mocks.revoke).toHaveBeenCalledWith({ bookId: 'book-1', data: {} });
  });

  it('передаёт причину отмены, если она указана', () => {
    const dialog = openRevoke();
    fireEvent.change(within(dialog).getByLabelText(/Причина отмены/), {
      target: { value: ' Пришла претензия ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отменить решение' }));

    expect(mocks.revoke).toHaveBeenCalledWith({
      bookId: 'book-1',
      data: { reasonRu: 'Пришла претензия' },
    });
  });

  it('на 409 RIGHTS_OVERRIDE_NOT_ACTIVE говорит, что решения уже нет, а не «ошибка»', () => {
    openRevoke();
    act(() => {
      mocks.revokeOptions.current?.onError?.(apiError(409, { code: 'RIGHTS_OVERRIDE_NOT_ACTIVE' }));
    });

    expect(mocks.snackbar).toHaveBeenCalledWith(
      expect.stringMatching(/Действующего решения уже нет/),
      { variant: 'info' }
    );
  });

  it('показывает прошлые решения свёрнутым списком', () => {
    const past = decision({
      id: 'ov-0',
      reasonRu: 'Старое решение по договору',
      revokedAt: '2026-09-26T10:00:00.000Z',
      revokedByEmail: 'boss@example.com',
      revokeReasonRu: 'Договор расторгнут',
    });
    arrange({
      roles: ['admin'],
      gate: gateResult(),
      active: decision(),
      history: [decision(), past],
    });
    renderPanel();

    expect(screen.getByText('Прошлые решения (1)')).toBeInTheDocument();
    expect(screen.getByText('Старое решение по договору')).toBeInTheDocument();
    expect(screen.getByText(/Договор расторгнут/)).toBeInTheDocument();
  });
});

describe('rightsOverridePolicy', () => {
  it('validateOverrideReason: границы 10..2000 после trim', () => {
    expect(validateOverrideReason('')).not.toBeNull();
    expect(validateOverrideReason(`  ${'а'.repeat(9)}  `)).not.toBeNull();
    expect(validateOverrideReason('а'.repeat(10))).toBeNull();
    expect(validateOverrideReason('а'.repeat(2000))).toBeNull();
    expect(validateOverrideReason('а'.repeat(2001))).not.toBeNull();
  });

  it('canGrantOverride: только admin и только при снимаемом блокере', () => {
    const blocked = gateResult();
    expect(canGrantOverride({ isAdmin: true, gate: blocked })).toBe(true);
    expect(canGrantOverride({ isAdmin: false, gate: blocked })).toBe(false);
    expect(canGrantOverride({ isAdmin: true, gate: undefined })).toBe(false);
    expect(
      canGrantOverride({
        isAdmin: true,
        gate: gateResult({
          blockingReasons: [
            { code: 'VERSION_CONTENT_INCOMPLETE', severity: 'BLOCKER', messageRu: 'x' },
            { code: 'LICENSE_EXPIRED', severity: 'BLOCKER', messageRu: 'y' },
          ],
        }),
      })
    ).toBe(true);
  });
});

describe('RightsOverridePanel — сессия, ошибки, ожидание, оставшиеся блокеры', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('при session.error (протухший токен) администратор не видит кнопку и ручку не зовёт', () => {
    arrange({ roles: ['admin'], gate: gateResult(), sessionError: 'RefreshAccessTokenError' });
    const { container } = renderPanel();

    expect(screen.queryByRole('button', { name: GRANT_BUTTON })).not.toBeInTheDocument();
    expect(mocks.override).toHaveBeenCalledWith(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('пока сессия не подтверждена, кнопки нет', () => {
    arrange({ roles: ['admin'], gate: gateResult() });
    mocks.session.mockReturnValue({ data: { user: { roles: ['admin'] } }, status: 'loading' });
    renderPanel();

    expect(screen.queryByRole('button', { name: GRANT_BUTTON })).not.toBeInTheDocument();
  });

  it('говорит, что решение не загрузилось, если ручка ответила ошибкой', () => {
    arrange({ roles: ['content_manager'], overrideError: true });
    renderPanel();

    expect(
      screen.getByText('Не удалось загрузить решение администратора по книге.')
    ).toBeInTheDocument();
  });

  it('во время отправки поле причины и кнопка подтверждения заблокированы', () => {
    arrange({ roles: ['admin'], gate: gateResult() });
    const { rerender } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: GRANT_BUTTON }));
    fireEvent.change(screen.getByLabelText(/Причина решения/), {
      target: { value: 'Лицензия продлена, скан в деле' },
    });

    mocks.pending.grant = true;
    rerender(<RightsOverridePanel bookId="book-1" versionId="version-1" status="draft" />);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/Причина решения/)).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /Разрешить публикацию$/ })).toBeDisabled();
  });

  it('на 5xx свой тост не показывает — это делает глобальный MutationCache', () => {
    arrange({ roles: ['admin'], gate: gateResult() });
    renderPanel();

    act(() => {
      mocks.grantOptions.current?.onError?.(apiError(503));
    });
    expect(mocks.snackbar).not.toHaveBeenCalled();

    act(() => {
      mocks.grantOptions.current?.onError?.(apiError(403));
    });
    expect(mocks.snackbar).toHaveBeenCalledWith(
      expect.stringMatching(/Не удалось разрешить публикацию/),
      { variant: 'error' }
    );
  });

  it('прочий 409 при отмене — обычная ошибка, а не «решения уже нет»', () => {
    arrange({ roles: ['admin'], active: decision() });
    renderPanel();

    act(() => {
      mocks.revokeOptions.current?.onError?.(apiError(409, { code: 'SOMETHING_ELSE' }));
    });

    expect(mocks.snackbar).toHaveBeenCalledWith(
      expect.stringMatching(/Не удалось отменить решение/),
      { variant: 'error' }
    );
  });

  it('при действующем решении называет оставшиеся блокеры и предупреждает, что новое снимет их', () => {
    arrange({
      roles: ['admin'],
      active: decision(),
      gate: gateResult({
        blockingReasons: [
          { code: 'ACTIVE_RIGHTS_CLAIM', severity: 'BLOCKER', messageRu: 'Претензия 1.' },
          { code: 'ACTIVE_RIGHTS_CLAIM', severity: 'BLOCKER', messageRu: 'Претензия 2.' },
          { code: 'VERSION_CONTENT_INCOMPLETE', severity: 'BLOCKER', messageRu: 'Нет обложки.' },
        ],
      }),
    });
    renderPanel();

    const remaining = screen.getByText(/Публикацию всё ещё блокирует/).closest('div');
    expect(remaining).not.toBeNull();
    const items = within(remaining as HTMLElement).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('ACTIVE_RIGHTS_CLAIM');
    expect(remaining).not.toHaveTextContent('VERSION_CONTENT_INCOMPLETE');

    fireEvent.click(screen.getByRole('button', { name: GRANT_BUTTON }));
    expect(
      within(screen.getByRole('dialog')).getByText(/снимет и блокеры, появившиеся после/)
    ).toBeInTheDocument();
  });
});
