'use client';

import { type FC } from 'react';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Card, Timeline, Typography, Tag } from 'antd';
import { useRightsIntakeApprovals } from '@/api/hooks/useRightsIntakes';
import styles from './ApprovalHistory.module.scss';

const { Text, Title } = Typography;

interface ApprovalHistoryProps {
  intakeId: string;
}

export const ApprovalHistory: FC<ApprovalHistoryProps> = ({ intakeId }) => {
  const { data: approvals, isLoading } = useRightsIntakeApprovals(intakeId);

  if (isLoading) {
    return null;
  }

  if (!approvals || approvals.length === 0) {
    return null;
  }

  const items = approvals.map((approval) => ({
    key: approval.id,
    dot:
      approval.decision === 'APPROVED' ? (
        <CheckCircleOutlined className={styles.approvedIcon} />
      ) : (
        <CloseCircleOutlined className={styles.rejectedIcon} />
      ),
    color: approval.decision === 'APPROVED' ? 'green' : 'red',
    children: (
      <div className={styles.timelineItem}>
        <div className={styles.timelineHeader}>
          <Tag color={approval.decision === 'APPROVED' ? 'success' : 'error'}>
            {approval.decision === 'APPROVED' ? 'Approved' : 'Rejected'}
          </Tag>
          <Text className={styles.timelineDate}>
            {new Date(approval.createdAt).toLocaleString()}
          </Text>
        </div>
        {approval.decidedByUser && (
          <Text className={styles.timelineUser}>
            by {approval.decidedByUser.name || approval.decidedByUser.email}
          </Text>
        )}
        {approval.notesRu && <Text className={styles.timelineNotes}>{approval.notesRu}</Text>}
      </div>
    ),
  }));

  return (
    <Card className={styles.card}>
      <Title level={5} className={styles.cardTitle}>
        Approval History
      </Title>
      <Timeline items={items} className={styles.timeline} />
    </Card>
  );
};
