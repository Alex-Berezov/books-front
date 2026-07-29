'use client';

import type { FC } from 'react';
import { Card, Typography, Space } from 'antd';
import { CheckCircle, XCircle, User, Calendar, FileText, Scale } from 'lucide-react';
import type { RightsReview, RightsReviewStatus } from '@/types/api-schema/rights-intake';
import styles from './ApprovalState.module.scss';

const { Text, Title } = Typography;

interface ApprovalStateProps {
  review: RightsReview;
}

export const ApprovalState: FC<ApprovalStateProps> = ({ review }) => {
  const status = review.status as RightsReviewStatus;

  if (status === 'HUMAN_APPROVED') {
    return (
      <div className={styles.container}>
        <Card className={`${styles.card} ${styles.approvedCard}`}>
          <Space direction="vertical" size="middle" className={styles.space}>
            <div className={styles.header}>
              <CheckCircle size={24} className={styles.approvedIcon} />
              <Title level={5} className={styles.title}>
                Approved
              </Title>
            </div>
            <Space direction="vertical" size="small">
              {review.approvedAt && (
                <div className={styles.row}>
                  <Calendar size={16} className={styles.icon} />
                  <Text>Approved at: {new Date(review.approvedAt).toLocaleString()}</Text>
                </div>
              )}
              {review.approvedByUser && (
                <div className={styles.row}>
                  <User size={16} className={styles.icon} />
                  <Text>
                    Approved by: {review.approvedByUser.name || review.approvedByUser.email}
                  </Text>
                </div>
              )}
              {review.approvalNotesRu && (
                <div className={styles.row}>
                  <FileText size={16} className={styles.icon} />
                  <Text>Notes: {review.approvalNotesRu}</Text>
                </div>
              )}
            </Space>
            <Text type="success" className={styles.message}>
              This rights review is approved for the next phase: book creation.
            </Text>
          </Space>
        </Card>
      </div>
    );
  }

  if (status === 'HUMAN_REJECTED') {
    return (
      <div className={styles.container}>
        <Card className={`${styles.card} ${styles.rejectedCard}`}>
          <Space direction="vertical" size="middle" className={styles.space}>
            <div className={styles.header}>
              <XCircle size={24} className={styles.rejectedIcon} />
              <Title level={5} className={styles.title}>
                Rejected
              </Title>
            </div>
            <Space direction="vertical" size="small">
              {review.rejectedAt && (
                <div className={styles.row}>
                  <Calendar size={16} className={styles.icon} />
                  <Text>Rejected at: {new Date(review.rejectedAt).toLocaleString()}</Text>
                </div>
              )}
              {review.rejectedByUser && (
                <div className={styles.row}>
                  <User size={16} className={styles.icon} />
                  <Text>
                    Rejected by: {review.rejectedByUser.name || review.rejectedByUser.email}
                  </Text>
                </div>
              )}
              {review.rejectionReasonRu && (
                <div className={styles.row}>
                  <FileText size={16} className={styles.icon} />
                  <Text>Reason: {review.rejectionReasonRu}</Text>
                </div>
              )}
            </Space>
            <Text type="danger" className={styles.message}>
              This intake cannot proceed to book creation unless a new rights review is imported and
              materialized.
            </Text>
          </Space>
        </Card>
      </div>
    );
  }

  // Phase 19: the two lawyer statuses of a rights review.
  if (status === 'LAWYER_REVIEW_REQUIRED' || status === 'LAWYER_APPROVED') {
    const isApproved = status === 'LAWYER_APPROVED';
    return (
      <div className={styles.container}>
        <Card className={`${styles.card} ${isApproved ? styles.approvedCard : ''}`}>
          <Space direction="vertical" size="middle" className={styles.space}>
            <div className={styles.header}>
              <Scale size={24} className={isApproved ? styles.approvedIcon : styles.icon} />
              <Title level={5} className={styles.title}>
                {isApproved ? 'Lawyer approved' : 'Lawyer review required'}
              </Title>
            </div>
            <Space direction="vertical" size="small">
              {review.lawyerApprovedAt && (
                <div className={styles.row}>
                  <Calendar size={16} className={styles.icon} />
                  <Text>Decided at: {new Date(review.lawyerApprovedAt).toLocaleString()}</Text>
                </div>
              )}
              {review.lawyerNameSnapshot && (
                <div className={styles.row}>
                  <User size={16} className={styles.icon} />
                  <Text>Lawyer: {review.lawyerNameSnapshot}</Text>
                </div>
              )}
            </Space>
            <Text type={isApproved ? 'success' : 'warning'} className={styles.message}>
              {isApproved
                ? 'Юрист вынес положительное заключение — утверждение редактором доступно.'
                : 'Утверждение заблокировано, пока юрист не вынесет положительное заключение.'}
            </Text>
          </Space>
        </Card>
      </div>
    );
  }

  return null;
};
