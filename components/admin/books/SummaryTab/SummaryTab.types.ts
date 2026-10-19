/**
 * SummaryTab component props
 */
export interface SummaryTabProps {
  /** Book version ID */
  versionId: string;
}

/**
 * Summary form data structure
 */
export interface SummaryFormData {
  /** Plot retelling shown on `/{lang}/book/{slug}/summary` */
  summaryText: string;
  /** Very short summary (F04): the "In brief" block at the top of `/summary` */
  briefText: string;
}
