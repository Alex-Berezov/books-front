import type { FC } from 'react';
import { FileIcon, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import styles from './MediaUpload.module.scss';

export interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadProgressProps {
  files: UploadFile[];
}

export const UploadProgress: FC<UploadProgressProps> = ({ files }) => {
  if (files.length === 0) return null;

  return (
    <div className={styles.progressList}>
      {files.map((item, index) => (
        <div key={`${item.file.name}-${index}`} className={styles.progressItem}>
          <FileIcon className={styles.fileIcon} />
          
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{item.file.name}</span>
            <span className={styles.fileSize}>
              {(item.file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          {item.status === 'uploading' && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${item.progress}%` }} 
              />
            </div>
          )}

          <div className={`
            ${styles.status} 
            ${item.status === 'success' ? styles.success : ''} 
            ${item.status === 'error' ? styles.error : ''}
          `}>
            {item.status === 'uploading' && <Loader2 className="animate-spin" size={16} />}
            {item.status === 'success' && <CheckCircle2 size={16} />}
            {item.status === 'error' && <XCircle size={16} />}
          </div>
        </div>
      ))}
    </div>
  );
};
