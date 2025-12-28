'use client';

import { useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import { useUploadMedia } from '@/api/hooks/useMedia';
import styles from './MediaUpload.module.scss';
import { UploadProgress, type UploadFile } from './UploadProgress';

interface MediaUploadProps {
  onUploadComplete?: () => void;
}

export const MediaUpload = ({ onUploadComplete }: MediaUploadProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { mutateAsync: upload } = useUploadMedia();
  const { enqueueSnackbar } = useSnackbar();

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
      for (const fileItem of newFiles) {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.file === fileItem.file ? { ...f, status: 'uploading' } : f))
        );

        try {
          const formData = new FormData();
          formData.append('file', fileItem.file);

          await upload(formData);

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

      onUploadComplete?.();
    },
    [upload, enqueueSnackbar, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': [],
      'application/pdf': [],
    },
  });

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
