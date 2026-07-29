'use client';

import { useState, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Typography, Space, message, Alert } from 'antd';
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
  if (reviewStatus !== 'HUMAN_REVIEW_REQUIRED' && reviewStatus !== 'LAWYER_APPROVED') {
    return null;
  }

  const publicationGate = currentProfile?.publicationGate;
  const hasBlockingActions = hasUnresolvedBlockingActions(currentProfile?.actions);
  // The server enforces this too (409 LAWYER_APPROVAL_REQUIRED); the UI only mirrors it.
  const lawyerRequired = !!riskAssessment?.lawyerReviewRequired && !riskAssessment.lawyerApproved;
  const isApproveDisabled =
    approveMutation.isPending ||
    publicationGate === 'BLOCK' ||
    hasBlockingActions ||
    lawyerRequired;

  const approveDisabledReason =
    publicationGate === 'BLOCK'
      ? 'Cannot approve: publication gate is BLOCK'
      : hasBlockingActions
        ? 'Cannot approve: there are unresolved blocking rights actions'
        : lawyerRequired
          ? 'Утверждение заблокировано: требуется заключение юриста'
          : undefined;

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

          {approveDisabledReason && (
            <Alert
              type="warning"
              message="Approval blocked"
              description={approveDisabledReason}
              showIcon
              action={
                lawyerRequired ? (
                  <Button size="small" type="link" href="#lawyer-review-panel">
                    Перейти к юридической проверке
                  </Button>
                ) : undefined
              }
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
            <Button
              type="primary"
              className={styles.approveButton}
              loading={approveMutation.isPending}
              disabled={isApproveDisabled}
              onClick={() =>
                approveMutation.mutate({
                  intakeId,
                  reviewId,
                  data: { notesRu: approveNotes.trim() || undefined },
                })
              }
            >
              Approve Review
            </Button>
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
