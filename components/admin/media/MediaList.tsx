import type { FC } from 'react';
import { useState } from 'react';
import { FileText, Image as ImageIcon, Music, Video, Copy, Trash2 } from 'lucide-react';
import Image from 'next/image';
import type { MediaFile, MediaType } from '@/types/api-schema/media';
import styles from './MediaPage.module.scss';

interface MediaListProps {
  files: MediaFile[];
  onSelect?: (file: MediaFile) => void;
  onDelete?: (file: MediaFile) => void;
  onCopyUrl?: (file: MediaFile) => void;
}

export const MediaList: FC<MediaListProps> = ({ files, onSelect, onDelete, onCopyUrl }) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const getIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={20} />;
      case 'video':
        return <Video size={20} />;
      case 'audio':
        return <Music size={20} />;
      case 'document':
        return <FileText size={20} />;
      default:
        return <FileText size={20} />;
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
    <table className={styles.list}>
      <thead>
        <tr>
          <th style={{ width: '60px' }}>Preview</th>
          <th>Filename</th>
          <th>Type</th>
          <th>Size</th>
          <th>Date</th>
          <th style={{ width: '100px' }}></th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id} onClick={() => onSelect?.(file)} className={styles.row}>
            <td>
              <div
                className={styles.listPreview}
                style={{ position: 'relative', width: '40px', height: '40px' }}
              >
                {file.type === 'image' && !failedImages[file.id] ? (
                  <Image
                    src={file.url}
                    alt={file.filename}
                    fill
                    sizes="40px"
                    style={{ objectFit: 'cover', borderRadius: '4px' }}
                    onError={() => handleImageError(file.id)}
                  />
                ) : (
                  getIcon(file.type)
                )}
              </div>
            </td>
            <td className={styles.filename} title={file.filename}>
              {file.filename}
            </td>
            <td>{file.type}</td>
            <td>{formatSize(file.size)}</td>
            <td>{new Date(file.createdAt).toLocaleDateString()}</td>
            <td>
              <div className={styles.listActions}>
                <button
                  className={styles.listActionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyUrl?.(file);
                  }}
                  title="Copy URL"
                >
                  <Copy size={16} />
                </button>
                <button
                  className={`${styles.listActionButton} ${styles.delete}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(file);
                  }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
