'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useRightsIntake,
  useChangeRightsIntakeStatus,
  useArchiveRightsIntake,
  useRightsReviewImports,
  useCurrentRightsProfile,
} from '@/api/hooks/useRightsIntakes';
import { useProfileRiskAssessment } from '@/api/hooks/useRightsLawyer';
import { RightsIntakeForm } from '@/components/admin/rights-intakes/RightsIntakeForm/RightsIntakeForm';
import { AgentAutomationPanel } from '@/components/admin/RightsIntakeDetail/AgentAutomationPanel/AgentAutomationPanel';
import { ApprovalHistory } from '@/components/admin/RightsIntakeDetail/ApprovalHistory/ApprovalHistory';
import { ApprovalPanel } from '@/components/admin/RightsIntakeDetail/ApprovalPanel/ApprovalPanel';
import { ApprovalState } from '@/components/admin/RightsIntakeDetail/ApprovalState/ApprovalState';
import { CreateBookFromClearanceForm } from '@/components/admin/RightsIntakeDetail/CreateBookFromClearanceForm/CreateBookFromClearanceForm';
import { IntakeOverview } from '@/components/admin/RightsIntakeDetail/IntakeOverview/IntakeOverview';
import { LawyerReviewPanel } from '@/components/admin/RightsIntakeDetail/LawyerReviewPanel/LawyerReviewPanel';
import { ManifestPanel } from '@/components/admin/RightsIntakeDetail/ManifestPanel/ManifestPanel';
import { RecheckPanel } from '@/components/admin/RightsIntakeDetail/RecheckPanel/RecheckPanel';
import { ReviewChainPanel } from '@/components/admin/RightsIntakeDetail/ReviewChainPanel/ReviewChainPanel';
import { ReviewImportPanel } from '@/components/admin/RightsIntakeDetail/ReviewImportPanel/ReviewImportPanel';
import { RightsIntakeHeader } from '@/components/admin/RightsIntakeDetail/RightsIntakeHeader/RightsIntakeHeader';
import { RightsProfilePanel } from '@/components/admin/RightsIntakeDetail/RightsProfilePanel/RightsProfilePanel';
import { WorkflowTimeline } from '@/components/admin/RightsIntakeDetail/WorkflowTimeline/WorkflowTimeline';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  RightsReviewStatus,
  CreateBookFromClearanceResponse,
} from '@/types/api-schema/rights-intake';
import styles from './page.module.scss';

export default function RightsIntakeDetailPage() {
  const params = useParams();
  const lang = params.lang as SupportedLang;
  const id = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [bookCreatedResponse, setBookCreatedResponse] =
    useState<CreateBookFromClearanceResponse | null>(null);

  const { data: intake, isLoading, error } = useRightsIntake(id);
  const changeStatusMutation = useChangeRightsIntakeStatus();
  const archiveMutation = useArchiveRightsIntake();
  const { data: reviewImportsData } = useRightsReviewImports(id, { limit: 50 });
  const { data: currentProfile, refetch: refetchProfile } = useCurrentRightsProfile(id);
  // Phase 19: the approval panel mirrors the server-side lawyer gate.
  const { data: riskAssessment } = useProfileRiskAssessment(currentProfile?.id ?? '', {
    enabled: !!currentProfile?.id,
  });

  const reviewImports = reviewImportsData?.items ?? [];

  const handleMarkReady = async () => {
    if (!intake) return;
    await changeStatusMutation.mutateAsync({ id: intake.id, status: 'READY_FOR_AGENT' });
  };

  const handleReturnToDraft = async () => {
    if (!intake) return;
    await changeStatusMutation.mutateAsync({ id: intake.id, status: 'DRAFT' });
  };

  const handleArchive = async () => {
    if (!intake) return;
    await archiveMutation.mutateAsync(intake.id);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading rights intake details...</div>
      </div>
    );
  }

  if (error || !intake) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Rights intake not found</p>
          <Link href={`/admin/${lang}/rights-intakes`} className={styles.backLink}>
            &larr; Back to Rights Intakes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isEditing ? (
        <>
          <div className={styles.breadcrumb}>
            <button className={styles.backLink} onClick={() => setIsEditing(false)}>
              <ArrowLeft size={16} />
              Back to Details
            </button>
          </div>
          <h1 className={styles.title}>Edit: {intake.candidateTitle}</h1>
          <RightsIntakeForm
            lang={lang}
            mode="edit"
            initialData={intake}
            onCancel={() => setIsEditing(false)}
          />
        </>
      ) : (
        <>
          <RightsIntakeHeader
            intake={intake}
            lang={lang}
            onEdit={() => setIsEditing(true)}
            onMarkReady={handleMarkReady}
            onReturnToDraft={handleReturnToDraft}
            onArchive={handleArchive}
            isPendingStatusChange={changeStatusMutation.isPending}
            isPendingArchive={archiveMutation.isPending}
          />

          <WorkflowTimeline
            intake={intake}
            currentProfile={currentProfile ?? null}
            reviewImports={reviewImports}
          />

          <IntakeOverview intake={intake} />

          <ManifestPanel intakeId={id} workflowStatus={intake.workflowStatus} />

          <AgentAutomationPanel intakeId={id} workflowStatus={intake.workflowStatus} />

          <ReviewImportPanel
            intakeId={id}
            workflowStatus={intake.workflowStatus}
            reviewImports={reviewImports}
          />

          <RightsProfilePanel
            intakeId={id}
            workflowStatus={intake.workflowStatus}
            reviewImports={reviewImports}
          />

          {(() => {
            const activeReview = currentProfile?.reviews.length
              ? currentProfile.reviews.find((r) => r.status === 'HUMAN_REVIEW_REQUIRED') ||
                currentProfile.reviews.find((r) => r.id === intake.approvedReviewId) ||
                currentProfile.reviews[currentProfile.reviews.length - 1] ||
                currentProfile.reviews[0]
              : null;

            if (!activeReview) return null;

            return (
              <>
                <ApprovalPanel
                  intakeId={id}
                  reviewId={activeReview.id}
                  reviewStatus={activeReview.status as RightsReviewStatus}
                  currentProfile={currentProfile}
                  riskAssessment={riskAssessment ?? undefined}
                  onApproved={() => refetchProfile()}
                  onRejected={() => refetchProfile()}
                />
                <ApprovalState review={activeReview} />
              </>
            );
          })()}

          <ApprovalHistory intakeId={id} />

          {/* Phase 19: legal review — between approval and the automatic recheck block */}
          <div id="lawyer-review-panel">
            <LawyerReviewPanel intakeId={id} profileId={currentProfile?.id ?? null} />
          </div>

          <RecheckPanel
            intakeId={id}
            profileId={currentProfile?.id ?? null}
            workflowStatus={intake.workflowStatus}
          />

          <ReviewChainPanel intakeId={id} />

          {intake.workflowStatus === 'BOOK_CREATED' && intake.createdBookId && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Book Created</h2>
              <div className={styles.bookCreatedSection}>
                <CheckCircle size={24} className={styles.bookCreatedIcon} />
                <div>
                  <p className={styles.bookCreatedText}>
                    Book has been created from this approved clearance.
                  </p>
                  <Link
                    href={`/admin/${lang}/books/${intake.createdBookId}`}
                    className={styles.bookCreatedLink}
                  >
                    View Book &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {intake.workflowStatus === 'APPROVED' &&
            !intake.createdBookId &&
            currentProfile?.status === 'APPROVED' &&
            currentProfile.reviews.some(
              (review) =>
                review.id === intake.approvedReviewId && review.status === 'HUMAN_APPROVED'
            ) && (
              <CreateBookFromClearanceForm
                intakeId={id}
                intake={intake}
                currentProfile={currentProfile}
                onSuccess={(response) => {
                  setBookCreatedResponse(response);
                }}
              />
            )}

          {bookCreatedResponse && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Book Created Successfully</h2>
              <div className={styles.bookCreatedSection}>
                <CheckCircle size={24} className={styles.bookCreatedIcon} />
                <div>
                  <p className={styles.bookCreatedText}>
                    Book &quot;{bookCreatedResponse.book.slug}&quot; has been created.
                  </p>
                  <Link
                    href={`/admin/${lang}/books/${bookCreatedResponse.book.id}`}
                    className={styles.bookCreatedLink}
                  >
                    View Book &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className={styles.meta}>
            <span>Created: {new Date(intake.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(intake.updatedAt).toLocaleString()}</span>
            {intake.archivedAt && (
              <span>Archived: {new Date(intake.archivedAt).toLocaleString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
