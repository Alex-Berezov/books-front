'use client';

import type { FC } from 'react';
import { Check, Clock, AlertTriangle, Circle } from 'lucide-react';
import type {
  RightsIntake,
  RightsProfileDetail,
  RightsReviewImportListItem,
} from '@/types/api-schema/rights-intake';
import styles from './WorkflowTimeline.module.scss';

interface WorkflowTimelineProps {
  intake: RightsIntake;
  currentProfile: RightsProfileDetail | null;
  reviewImports: RightsReviewImportListItem[];
}

export const WorkflowTimeline: FC<WorkflowTimelineProps> = ({
  intake,
  currentProfile,
  reviewImports,
}) => {
  const status = intake.workflowStatus;
  const latestImport = reviewImports.find((i) => i.isCurrent) || reviewImports[0];

  const getStepStates = () => {
    // Stage 1: Draft
    const s1State: 'done' | 'current' | 'blocked' | 'unavailable' =
      status !== 'DRAFT' ? 'done' : 'current';
    const s1Status = status === 'DRAFT' ? 'In draft' : 'Completed';

    // Stage 2: Ready for agent
    let s2State: 'done' | 'current' | 'blocked' | 'unavailable' = 'unavailable';
    let s2Status = 'Not ready';
    if (
      [
        'READY_FOR_AGENT',
        'REVIEW_IMPORTED',
        'HUMAN_REVIEW_REQUIRED',
        'LAWYER_REVIEW_REQUIRED',
        'APPROVED',
        'REJECTED',
        'BOOK_CREATED',
      ].includes(status)
    ) {
      s2State = status === 'READY_FOR_AGENT' ? 'current' : 'done';
      s2Status = status === 'READY_FOR_AGENT' ? 'Ready for export' : 'Manifest exported';
    }

    // Stage 3: Review imported
    let s3State: 'done' | 'current' | 'blocked' | 'unavailable' = 'unavailable';
    let s3Status = 'Waiting for import';
    if (
      [
        'REVIEW_IMPORTED',
        'HUMAN_REVIEW_REQUIRED',
        'LAWYER_REVIEW_REQUIRED',
        'APPROVED',
        'REJECTED',
        'BOOK_CREATED',
      ].includes(status)
    ) {
      if (latestImport?.importStatus === 'VALIDATION_FAILED') {
        s3State = 'blocked';
        s3Status = 'Validation failed';
      } else if (status === 'REVIEW_IMPORTED') {
        s3State = 'current';
        s3Status = 'Review imported';
      } else {
        s3State = 'done';
        s3Status = 'Review validated';
      }
    }

    // Stage 4: Profile built
    let s4State: 'done' | 'current' | 'blocked' | 'unavailable' = 'unavailable';
    let s4Status = 'Profile pending';
    if (currentProfile) {
      s4State = 'done';
      s4Status = `Gate: ${currentProfile.publicationGate}`;
    } else if (status === 'REVIEW_IMPORTED' && latestImport?.importStatus === 'VALIDATED') {
      s4State = 'current';
      s4Status = 'Ready to build profile';
    }

    // Stage 5: Human decision
    let s5State: 'done' | 'current' | 'blocked' | 'unavailable' = 'unavailable';
    let s5Status = 'Decision pending';
    if (status === 'HUMAN_REVIEW_REQUIRED' || status === 'LAWYER_REVIEW_REQUIRED') {
      s5State = 'current';
      s5Status = 'Needs human approval';
    } else if (status === 'APPROVED' || status === 'BOOK_CREATED') {
      s5State = 'done';
      s5Status = 'Approved';
    } else if (status === 'REJECTED') {
      s5State = 'blocked';
      s5Status = 'Rejected';
    }

    // Stage 5b: Legal review (Phase 19)
    let sLawyerState: 'done' | 'current' | 'blocked' | 'unavailable' = 'unavailable';
    let sLawyerStatus = 'Not required';
    if (status === 'LAWYER_REVIEW_REQUIRED') {
      sLawyerState = 'current';
      sLawyerStatus = 'Waiting for the lawyer';
    } else if (currentProfile?.lawyerApprovedAt) {
      sLawyerState = 'done';
      sLawyerStatus = currentProfile.lawyerApprovedLawyerName
        ? `Approved by ${currentProfile.lawyerApprovedLawyerName}`
        : 'Approved by the lawyer';
    } else if (currentProfile?.lawyerReviewRequired) {
      sLawyerState = 'blocked';
      sLawyerStatus = 'Lawyer approval required';
    }

    // Stage 6: Book created
    let s6State: 'done' | 'current' | 'blocked' | 'unavailable' = 'unavailable';
    let s6Status = 'Book not created';
    if (intake.createdBookId) {
      s6State = 'done';
      s6Status = 'Book created';
    } else if (status === 'APPROVED') {
      s6State = 'current';
      s6Status = 'Ready to create book';
    }

    return [
      { id: 1, label: 'Draft Intake', state: s1State, statusText: s1Status },
      { id: 2, label: 'Ready for Agent', state: s2State, statusText: s2Status },
      { id: 3, label: 'Review Imported', state: s3State, statusText: s3Status },
      { id: 4, label: 'Profile Built', state: s4State, statusText: s4Status },
      { id: 5, label: 'Human Approval', state: s5State, statusText: s5Status },
      // Phase 19: legal review sits between the human decision and the final approval.
      { id: 55, label: 'Legal Review', state: sLawyerState, statusText: sLawyerStatus },
      { id: 6, label: 'Book Created', state: s6State, statusText: s6Status },
    ];
  };

  const steps = getStepStates();

  return (
    <div className={styles.container}>
      <div className={styles.timeline}>
        {steps.map((step) => (
          <div key={step.id} className={styles.step}>
            <div className={styles.iconWrapper} data-state={step.state}>
              {step.state === 'done' ? (
                <Check size={16} />
              ) : step.state === 'current' ? (
                <Clock size={16} />
              ) : step.state === 'blocked' ? (
                <AlertTriangle size={16} />
              ) : (
                <Circle size={12} />
              )}
            </div>
            <div className={styles.stepTitle}>{step.label}</div>
            <div className={styles.stepStatus}>{step.statusText}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
