import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import { Modal } from '@/components/common/Modal';
import type { MediaFile } from '@/types/api-schema/media';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: MediaFile | null;
}

export const MediaPreviewModal: FC<MediaPreviewModalProps> = ({ isOpen, onClose, file }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasError(false);
    }
  }, [file, isOpen]);

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onCancel={() => {
        setHasError(false);
        onClose();
      }}
      title={file.filename}
      size="xl"
      showFooter={false}
    >
      <div
        className="flex flex-col items-center gap-6"
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        {file.type === 'image' && !hasError ? (
          <div
            className="w-full bg-gray-50/50 rounded-lg"
            style={{ position: 'relative', height: '60vh', minHeight: '300px' }}
          >
            <Image
              src={file.url}
              alt={file.filename}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 80vw"
              onError={() => setHasError(true)}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2 bg-gray-50 rounded-lg w-full">
            {file.type === 'image' ? (
              <>
                <ImageOff size={48} />
                <p>Failed to load image</p>
              </>
            ) : (
              <p>Preview not available for this file type.</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-lg text-sm">
          <div className="flex items-baseline gap-4 border-b border-gray-100 pb-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Type:</span>
            <span className="font-medium"> {file.type}</span>
          </div>

          <div className="flex items-baseline gap-4 border-b border-gray-100 pb-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Size:</span>
            <span className="font-medium"> {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <span className="text-gray-500 w-28 flex-shrink-0">URL:</span>
            <div
              className="truncate select-all bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 border border-gray-200 flex-grow"
              title={file.url}
            >
              {file.url}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
