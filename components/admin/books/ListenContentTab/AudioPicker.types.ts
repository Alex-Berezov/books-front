/**
 * Currently selected audio payload — all fields stay in sync with the form.
 */
export interface AudioPickerValue {
  audioUrl: string;
  mediaId: string | null;
  duration: number;
  /** Human-readable display name (filename / URL suffix). Not persisted. */
  displayName: string | null;
}

export interface AudioPickerProps {
  value: AudioPickerValue | null;
  onChange: (value: AudioPickerValue | null) => void;
  /** Optional: open Media Library for picking an existing MediaAsset. */
  onOpenMediaLibrary?: () => void;
  disabled?: boolean;
  /** Reports upload start and end, so the host dialog can refuse to close mid-upload. */
  onUploadingChange?: (isUploading: boolean) => void;
}
