'use client';

import { useState, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Typography, Space, message } from 'antd';
import {
  useApproveRightsReview,
  useRejectRightsReview,
  rightsIntakeKeys,
} from '@/api/hooks/useRightsIntakes';
import type { RightsReviewStatus } from '@/types/api-schema/rights-intake';
import styles from './ApprovalPanel.module.scss';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ApprovalPanelProps {
  intakeId: string;
  reviewId: string;
  reviewStatus: RightsReviewStatus;
  onApproved: () => void;
  onRejected: () => void;
}

export const ApprovalPanel: FC<ApprovalPanelProps> = ({
  intakeId,
  reviewId,
  reviewStatus,
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

  if (reviewStatus !== 'HUMAN_REVIEW_REQUIRED') {
    return null;
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title level={5} className={styles.cardTitle}>
          Approval Actions
        </Title>
        <Space direction="vertical" size="large" className={styles.space}>
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
              disabled={rejectReason.trim().length < 10}
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
