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
  /** Brief overview of the book */
  summaryText: string;
  /** Main lessons or insights */
  keyTakeaways: string;
  /** Major themes and deeper analysis */
  themes: string;
}
