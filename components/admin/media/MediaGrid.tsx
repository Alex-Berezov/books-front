import type { FC } from 'react';
import { useState } from 'react';
import { FileText, Image as ImageIcon, Music, Video, Copy, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import type { MediaFile, MediaType } from '@/types/api-schema/media';
import styles from './MediaPage.module.scss';

interface MediaGridProps {
  files: MediaFile[];
  onSelect?: (file: MediaFile) => void;
  onDelete?: (file: MediaFile) => void;
  onCopyUrl?: (file: MediaFile) => void;
}

export const MediaGrid: FC<MediaGridProps> = ({ files, onSelect, onDelete, onCopyUrl }) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const getIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className={styles.icon} />;
      case 'video':
        return <Video className={styles.icon} />;
      case 'audio':
        return <Music className={styles.icon} />;
      case 'document':
        return <FileText className={styles.icon} />;
      default:
        return <FileText className={styles.icon} />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className={styles.grid}>
      {files.map((file) => (
        <div
          key={file.id}
          className={styles.card}
          onClick={() => onSelect?.(file)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelect?.(file);
            }
          }}
        >
          <div className={styles.preview}>
            {file.type === 'image' && !failedImages[file.id] ? (
              <Image
                src={file.url}
                alt={file.filename}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                onError={() => handleImageError(file.id)}
              />
            ) : (
              getIcon(file.type)
            )}

            <div className={styles.actions}>
              <button
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(file);
                }}
                title="Preview"
              >
                <Eye size={16} />
              </button>
              <button
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUrl?.(file);
                }}
                title="Copy URL"
              >
                <Copy size={16} />
              </button>
              <button
                className={`${styles.actionButton} ${styles.delete}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(file);
                }}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className={styles.info}>
            <div className={styles.filename} title={file.filename}>
              {file.filename}
            </div>
            <div className={styles.meta}>
              <span>{formatSize(file.size)}</span>
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
