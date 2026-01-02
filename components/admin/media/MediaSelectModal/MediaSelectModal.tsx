'use client';

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useMediaFiles } from '@/api/hooks/useMedia';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import type { MediaSelectModalProps } from './MediaSelectModal.types';
import type { MediaFile, MediaType } from '@/types/api-schema/media';
import { MediaGrid } from '../MediaGrid';
import { MediaToolbar } from '../MediaToolbar';
import { MediaUpload } from '../MediaUpload';
import styles from './MediaSelectModal.module.scss';

type Tab = 'upload' | 'library';

export const MediaSelectModal: FC<MediaSelectModalProps> = (props) => {
  const { isOpen, onClose, onSelect } = props;

  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  // Fetch media files
  const { data, isLoading, refetch } = useMediaFiles({
    page: 1,
    limit: 50, // Load more for the modal
    search: search || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('library');
      setSearch('');
      setTypeFilter('all');
      // We don't reset selectedFile here to allow persistence if needed,
      // but usually we might want to find the file by initialSelectedUrl if we had the full list.
      // For now, we start with no selection in the modal unless the user clicks.
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleUploadComplete = () => {
    refetch();
    setActiveTab('library');
  };

  const handleFileSelect = (file: MediaFile) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onSelect(selectedFile);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title="Select Media"
      size="xl"
      showFooter={false} // We implement our own footer
    >
      <div className={styles.container}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'upload' ? styles.active : ''}`}
            onClick={() => setActiveTab('upload')}
            type="button"
          >
            Upload Files
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'library' ? styles.active : ''}`}
            onClick={() => setActiveTab('library')}
            type="button"
          >
            Media Library
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'upload' ? (
            <MediaUpload onUploadComplete={handleUploadComplete} />
          ) : (
            <div className={styles.libraryContainer}>
              <MediaToolbar
                search={search}
                onSearchChange={setSearch}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                viewMode="grid" // Always grid in modal for now
                onViewModeChange={() => {}} // Disable view toggle in modal
              />

              <div className={styles.gridContainer}>
                {isLoading ? (
                  <div>Loading...</div>
                ) : (
                  <div className={selectedFile ? styles.hasSelection : ''}>
                    <MediaGrid
                      files={data?.data || []}
                      onSelect={handleFileSelect}
                      selectedId={selectedFile?.id}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.selectedInfo}>
            {selectedFile && (
              <>
                {selectedFile.type === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.filename}
                    className={styles.previewThumb}
                  />
                )}
                <span>{selectedFile.filename}</span>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selectedFile} onClick={handleConfirm}>
            Select
          </Button>
        </div>
      </div>
    </Modal>
  );
};
