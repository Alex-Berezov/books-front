'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import { useUploadMedia } from '@/api/hooks/useMedia';
import type { MediaType } from '@/types/api-schema/media';
import type { Accept } from 'react-dropzone';
import styles from './MediaUpload.module.scss';
import { UploadProgress, type UploadFile } from './UploadProgress';

interface MediaUploadProps {
  /**
   * Called once the dropped batch is done: how many files made it out of how
   * many were tried. Not called if the dropzone was unmounted meanwhile - the
   * batch keeps uploading, but whoever hosted it has moved on.
   */
  onUploadComplete?: (uploaded: number, attempted: number) => void;
  /**
   * Narrows what the dropzone accepts. Without it a picker restricted to images
   * still let an admin upload a pdf, answered "uploaded successfully" and then
   * showed a library that filtered the new file straight back out - success and
   * an empty space, with no explanation anywhere.
   */
  acceptTypes?: MediaType[];
}

const ACCEPT_BY_TYPE: Record<MediaType, Accept> = {
  image: { 'image/*': [] },
  video: { 'video/*': [] },
  audio: { 'audio/*': [] },
  document: { 'application/pdf': [] },
};

const ACCEPT_ALL: Accept = {
  'image/*': [],
  'video/*': [],
  'audio/*': [],
  'application/pdf': [],
};

export const MediaUpload = ({ onUploadComplete, acceptTypes }: MediaUploadProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { mutateAsync: upload } = useUploadMedia();
  const { enqueueSnackbar } = useSnackbar();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Initialize files with pending state
      const newFiles = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setFiles((prev) => [...newFiles, ...prev]);

      // Process uploads
      let uploaded = 0;
      for (const fileItem of newFiles) {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.file === fileItem.file ? { ...f, status: 'uploading' } : f))
        );

        try {
          const formData = new FormData();
          formData.append('file', fileItem.file);

          await upload(formData);
          uploaded += 1;

          // Update status to success
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileItem.file ? { ...f, status: 'success', progress: 100 } : f
            )
          );

          enqueueSnackbar(`File ${fileItem.file.name} uploaded successfully`, {
            variant: 'success',
          });
        } catch (error) {
          console.error(error);
          // Update status to error
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileItem.file ? { ...f, status: 'error', error: 'Upload failed' } : f
            )
          );
          enqueueSnackbar(`Failed to upload ${fileItem.file.name}`, { variant: 'error' });
        }
      }

      if (mounted.current) onUploadComplete?.(uploaded, newFiles.length);
    },
    [upload, enqueueSnackbar, onUploadComplete]
  );

  const accept =
    acceptTypes && acceptTypes.length > 0
      ? acceptTypes.reduce<Accept>((acc, type) => ({ ...acc, ...ACCEPT_BY_TYPE[type] }), {})
      : ACCEPT_ALL;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={styles.icon} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag &apos;n&apos; drop some files here, or click to select files</p>
        )}
      </div>

      <UploadProgress files={files} />
    </div>
  );
};
