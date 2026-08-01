/**
 * WP-9 — private rights file storage (report PDF, source edition file, evidence archive copy).
 *
 * These files never go through `MediaAsset` and have no public URL: `POST` returns only a
 * descriptor (storage key + server-side sha256), and the bytes are readable exclusively via the
 * admin `GET` endpoints below, under the Admin / ContentManager roles.
 *
 * Two consequences for the client:
 *
 * 1. Uploads are plain multipart with the form field `file` — there is no presign flow.
 * 2. Downloads cannot be a bare `<a href>`: the endpoint needs the bearer token, so the bytes
 *    are fetched, wrapped into an object URL and handed to the browser as a save dialog.
 */

import { getAccessToken, httpPatchAuth, httpPostAuth, httpGetAuth } from '@/lib/http-client';
import { ApiError } from '@/types/api';
import type {
  RightsFileDescriptor,
  RightsFileLimits,
  SupersedeRightsEvidenceResponse,
} from '@/types/api-schema/rights-intake';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

/** Form field name expected by `FileInterceptor('file')` on the backend. */
const UPLOAD_FIELD = 'file';

const toFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append(UPLOAD_FIELD, file);
  return formData;
};

export const getRightsFileLimits = (): Promise<RightsFileLimits> =>
  httpGetAuth<RightsFileLimits>('/admin/rights/files/limits', { requireAuth: true });

export const uploadRightsReportPdf = (
  importId: string,
  file: File
): Promise<RightsFileDescriptor> =>
  httpPostAuth<RightsFileDescriptor>(
    `/admin/rights/review-imports/${importId}/report-pdf`,
    toFormData(file),
    { requireAuth: true }
  );

export const uploadRightsSourceFile = (
  profileId: string,
  file: File
): Promise<RightsFileDescriptor> =>
  httpPostAuth<RightsFileDescriptor>(
    `/admin/rights/profiles/${profileId}/source-file`,
    toFormData(file),
    { requireAuth: true }
  );

export const uploadRightsEvidenceArchiveCopy = (
  evidenceId: string,
  file: File
): Promise<RightsFileDescriptor> =>
  httpPostAuth<RightsFileDescriptor>(
    `/admin/rights/evidence/${evidenceId}/archive-copy`,
    toFormData(file),
    { requireAuth: true }
  );

export const supersedeRightsEvidence = (
  evidenceId: string,
  supersededById: string
): Promise<SupersedeRightsEvidenceResponse> =>
  httpPatchAuth<SupersedeRightsEvidenceResponse>(
    `/admin/rights/evidence/${evidenceId}/supersede`,
    { supersededById },
    { requireAuth: true }
  );

/** Extracts `filename="…"` from a Content-Disposition header. */
const parseFileName = (header: string | null, fallback: string): string => {
  if (!header) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1]?.trim() || fallback;
};

/** Hands the fetched bytes to the browser as a download and releases the object URL. */
const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a private rights file and saves it locally.
 *
 * Errors keep the backend `code` (`REPORT_PDF_NOT_UPLOADED`, `RIGHTS_FILE_OBJECT_MISSING`, …)
 * so the UI can translate them instead of showing "Failed to fetch".
 */
export const downloadRightsFile = async (endpoint: string, fallbackName: string): Promise<void> => {
  const accessToken = await getAccessToken(true);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!response.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      // Non-JSON error body — the status code alone drives the message.
    }
    throw new ApiError({
      message: typeof body.message === 'string' ? body.message : 'Не удалось скачать файл.',
      statusCode: response.status,
      error: typeof body.code === 'string' ? body.code : undefined,
      data: body,
    });
  }

  const blob = await response.blob();
  saveBlob(blob, parseFileName(response.headers.get('content-disposition'), fallbackName));
};

export const downloadRightsReportPdf = (importId: string): Promise<void> =>
  downloadRightsFile(
    `/admin/rights/review-imports/${importId}/report-pdf`,
    `rights-report-${importId}.pdf`
  );

export const downloadRightsSourceFile = (profileId: string): Promise<void> =>
  downloadRightsFile(`/admin/rights/profiles/${profileId}/source-file`, `source-${profileId}.bin`);

export const downloadRightsEvidenceArchiveCopy = (evidenceId: string): Promise<void> =>
  downloadRightsFile(
    `/admin/rights/evidence/${evidenceId}/archive-copy`,
    `evidence-${evidenceId}.bin`
  );
