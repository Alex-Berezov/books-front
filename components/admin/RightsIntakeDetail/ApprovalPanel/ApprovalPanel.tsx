'use client';

import { useState, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Typography, Space, message, Alert, Popconfirm } from 'antd';
import {
  useApproveRightsReview,
  useRejectRightsReview,
  rightsIntakeKeys,
} from '@/api/hooks/useRightsIntakes';
import type {
  RightsReviewStatus,
  RightsProfileDetail,
  RightsAction,
} from '@/types/api-schema/rights-intake';
import type { RiskAssessmentSnapshot } from '@/types/api-schema/rights-lawyer';
import styles from './ApprovalPanel.module.scss';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ApprovalPanelProps {
  intakeId: string;
  reviewId: string;
  reviewStatus: RightsReviewStatus;
  currentProfile?: RightsProfileDetail;
  /** Phase 19: high-risk clearance may not be approved without a valid lawyer opinion. */
  riskAssessment?: RiskAssessmentSnapshot;
  onApproved: () => void;
  onRejected: () => void;
}

const hasUnresolvedBlockingActions = (actions?: RightsAction[]): boolean => {
  if (!actions) return false;
  return actions.some((a) => a.isBlocking && a.status !== 'COMPLETED' && a.status !== 'WAIVED');
};

/** Статусы, в которых редактор может утвердить или отклонить клиренс. */
const ACTIONABLE_REVIEW_STATUSES: RightsReviewStatus[] = [
  'HUMAN_REVIEW_REQUIRED',
  'LAWYER_APPROVED',
];

/** WP-E.5: панель не исчезает — она объясняет, почему действия недоступны. */
const readOnlyReason = (reviewStatus: RightsReviewStatus): string =>
  reviewStatus === 'LAWYER_REVIEW_REQUIRED'
    ? 'Клиренс на юридической проверке — утвердить или отклонить его можно после решения юриста.'
    : `Статус проверки — ${reviewStatus}: утверждение и отклонение недоступны.`;

export const ApprovalPanel: FC<ApprovalPanelProps> = ({
  intakeId,
  reviewId,
  reviewStatus,
  currentProfile,
  riskAssessment,
  onApproved,
  onRejected,
}) => {
  const queryClient = useQueryClient();

  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const approveMutation = useApproveRightsReview({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['rights-intake-approvals', intakeId] });
      message.success('Review approved successfully');
      setApproveNotes('');
      onApproved();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to approve review');
    },
  });

  const rejectMutation = useRejectRightsReview({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rightsIntakeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['rights-intake-approvals', intakeId] });
      message.success('Review rejected');
      setRejectReason('');
      onRejected();
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Failed to reject review');
    },
  });

  // Phase 19: `LAWYER_APPROVED` is also approvable — the lawyer has unblocked the editor.
  if (!ACTIONABLE_REVIEW_STATUSES.includes(reviewStatus)) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <Title level={5} className={styles.cardTitle}>
            Approval Actions
          </Title>
          <Alert
            type="info"
            message="Действия недоступны"
            description={readOnlyReason(reviewStatus)}
            showIcon
          />
        </Card>
      </div>
    );
  }

  const publicationGate = currentProfile?.publicationGate;
  const hasBlockingActions = hasUnresolvedBlockingActions(currentProfile?.actions);
  // The server enforces this too (409 LAWYER_APPROVAL_REQUIRED); the UI only mirrors it.
  const lawyerRequired = !!riskAssessment?.lawyerReviewRequired && !riskAssessment.lawyerApproved;
  // WP-E.5: кнопка гаснет только при реальном требовании юриста. Остальное — предупреждение
  // с подтверждением: редактор видит причину и решает сам, а сервер по-прежнему проверяет всё.
  const isApproveDisabled = approveMutation.isPending || lawyerRequired;

  const approveWarningReason =
    publicationGate === 'BLOCK'
      ? 'Publication gate is BLOCK'
      : hasBlockingActions
        ? 'There are unresolved blocking rights actions'
        : undefined;

  const runApprove = () =>
    approveMutation.mutate({
      intakeId,
      reviewId,
      data: { notesRu: approveNotes.trim() || undefined },
    });

  const approveButton = (
    <Button
      type="primary"
      className={styles.approveButton}
      loading={approveMutation.isPending}
      disabled={isApproveDisabled}
      onClick={approveWarningReason ? undefined : runApprove}
    >
      Approve Review
    </Button>
  );

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title level={5} className={styles.cardTitle}>
          Approval Actions
        </Title>
        <Space direction="vertical" size="large" className={styles.space}>
          {reviewStatus === 'LAWYER_APPROVED' && (
            <Alert
              type="success"
              message="Юрист одобрил"
              description={
                riskAssessment?.lawyerApprovedLawyerName
                  ? `Положительное заключение вынес ${riskAssessment.lawyerApprovedLawyerName}.`
                  : 'Юрист вынес положительное заключение — утверждение доступно.'
              }
              showIcon
            />
          )}

          {lawyerRequired && (
            <Alert
              type="warning"
              message="Approval blocked"
              description="Утверждение заблокировано: требуется заключение юриста"
              showIcon
              action={
                <Button size="small" type="link" href="#lawyer-review-panel">
                  Перейти к юридической проверке
                </Button>
              }
            />
          )}

          {approveWarningReason && (
            <Alert
              type="warning"
              message="Approval warning"
              description={approveWarningReason}
              showIcon
            />
          )}

          <div className={styles.section}>
            <Text strong className={styles.sectionLabel}>
              Approve Review
            </Text>
            <TextArea
              className={styles.textarea}
              rows={2}
              placeholder="Optional notes (in Russian)"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
            />
            {approveWarningReason ? (
              <Popconfirm
                title="Утвердить несмотря на предупреждение?"
                description={approveWarningReason}
                okText="Утвердить"
                cancelText="Отмена"
                onConfirm={runApprove}
                disabled={isApproveDisabled}
              >
                {approveButton}
              </Popconfirm>
            ) : (
              approveButton
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <Text strong className={styles.sectionLabel}>
              Reject Review
            </Text>
            <TextArea
              className={styles.textarea}
              rows={3}
              placeholder="Reason for rejection (in Russian) — required, at least 10 characters"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              status={
                rejectReason.trim().length > 0 && rejectReason.trim().length < 10
                  ? 'error'
                  : undefined
              }
            />
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 10 && (
              <Text type="danger" className={styles.validationHint}>
                Reason must be at least 10 characters
              </Text>
            )}
            <Button
              danger
              className={styles.rejectButton}
              loading={rejectMutation.isPending}
              disabled={rejectMutation.isPending || rejectReason.trim().length < 10}
              onClick={() =>
                rejectMutation.mutate({
                  intakeId,
                  reviewId,
                  data: { reasonRu: rejectReason.trim() },
                })
              }
            >
              Reject Review
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};
