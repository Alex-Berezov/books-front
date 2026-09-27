import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSnackbar } from 'notistack';
import {
  useGrantRightsOverride,
  usePublicationGate,
  useRevokeRightsOverride,
  useRightsOverride,
} from '@/api/hooks';
import { STAFF_ROLES, UserRole } from '@/lib/auth/constants';
import { ApiError } from '@/types/api';
import type { RightsOverridePanelProps } from './RightsOverridePanel.types';
import {
  isNeverOverriddenGateCode,
  RIGHTS_OVERRIDE_NOT_ACTIVE_CODE,
  canGrantOverride,
  validateOverrideReason,
} from './rightsOverridePolicy';

/** 409 ручки отмены «решения уже нет». Прочие 409 — обычная ошибка. */
const isOverrideNotActive = (error: unknown): boolean =>
  error instanceof ApiError && error.data?.code === RIGHTS_OVERRIDE_NOT_ACTIVE_CODE;

/** 5xx показывает глобальный тост `MutationCache`; свой тост здесь дал бы второй. */
const isServerError = (error: unknown): boolean =>
  error instanceof ApiError && error.statusCode >= 500;

const STAFF_ROLE_VALUES: readonly string[] = STAFF_ROLES;

export const useRightsOverridePanel = ({ bookId, versionId, status }: RightsOverridePanelProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { data: session, status: sessionStatus } = useSession();
  // L-010: право — это пригодность сессии. После неудачного обновления токена `session.user`
  // остаётся на месте, а запрос с протухшим токеном выбросит администратора на форму входа.
  const isSessionUsable = sessionStatus === 'authenticated' && !session?.error;
  const roles: readonly string[] = isSessionUsable ? (session?.user?.roles ?? []) : [];
  const isAdmin = roles.includes(UserRole.ADMIN);
  // Читать решение вправе `admin` и `content_manager`; остальным ручка ответит 403.
  const isStaff = roles.some((role) => STAFF_ROLE_VALUES.includes(role));

  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [grantReason, setGrantReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const overrideQuery = useRightsOverride(isStaff ? bookId : undefined);
  // Тот же ключ, что у панели публикации: второго запроса к гейту не уходит.
  const { data: gate } = usePublicationGate(status === 'draft' ? versionId : undefined, {
    enabled: status === 'draft',
  });

  const grantMutation = useGrantRightsOverride({
    onSuccess: () => {
      setIsGrantOpen(false);
      setGrantReason('');
      enqueueSnackbar('Публикация книги разрешена решением администратора', {
        variant: 'success',
      });
    },
    onError: (error) => {
      if (isServerError(error)) return;
      enqueueSnackbar(`Не удалось разрешить публикацию: ${error.message}`, { variant: 'error' });
    },
  });

  const revokeMutation = useRevokeRightsOverride({
    onSuccess: () => {
      setIsRevokeOpen(false);
      setRevokeReason('');
      enqueueSnackbar('Решение администратора отменено', { variant: 'success' });
    },
    onError: (error) => {
      if (isServerError(error)) return;
      if (isOverrideNotActive(error)) {
        setIsRevokeOpen(false);
        enqueueSnackbar('Действующего решения уже нет — оно было отменено раньше', {
          variant: 'info',
        });
        return;
      }
      enqueueSnackbar(`Не удалось отменить решение: ${error.message}`, { variant: 'error' });
    },
  });

  const active = overrideQuery.data?.active ?? null;
  const pastDecisions = (overrideQuery.data?.history ?? []).filter(
    (item) => item.id !== active?.id
  );
  const canGrant = canGrantOverride({ isAdmin, gate });
  // Решение действует, а гейт всё равно запрещает: чаще всего это претензия, поданная после
  // решения. Повторное решение снимет и её (решение владельца), поэтому коды называются прямо.
  const remainingBlockers =
    active && gate?.canPublish === false
      ? gate.blockingReasons.filter((reason) => !isNeverOverriddenGateCode(reason.code))
      : [];
  const grantReasonError = validateOverrideReason(grantReason);

  const handleOpenGrant = () => setIsGrantOpen(true);
  const handleCloseGrant = () => {
    if (!grantMutation.isPending) setIsGrantOpen(false);
  };
  const handleConfirmGrant = () => {
    if (!isAdmin || grantReasonError) return;
    grantMutation.mutate({ bookId, data: { reasonRu: grantReason.trim() } });
  };

  const handleOpenRevoke = () => setIsRevokeOpen(true);
  const handleCloseRevoke = () => {
    if (!revokeMutation.isPending) setIsRevokeOpen(false);
  };
  const handleConfirmRevoke = () => {
    if (!isAdmin) return;
    const reasonRu = revokeReason.trim();
    revokeMutation.mutate({ bookId, data: reasonRu ? { reasonRu } : {} });
  };

  return {
    isAdmin,
    isStaff,
    isOverrideLoading: overrideQuery.isLoading,
    isOverrideError: overrideQuery.isError,
    active,
    pastDecisions,
    canGrant,
    remainingBlockers,
    isGrantOpen,
    grantReason,
    grantReasonError,
    isGrantPending: grantMutation.isPending,
    isRevokeOpen,
    revokeReason,
    isRevokePending: revokeMutation.isPending,
    setGrantReason,
    setRevokeReason,
    handleOpenGrant,
    handleCloseGrant,
    handleConfirmGrant,
    handleOpenRevoke,
    handleCloseRevoke,
    handleConfirmRevoke,
  };
};
