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
  const { isOpen, onClose, onSelect, allowedTypes } = props;

  // 🔴 `allowedTypes` was declared in the props type and then never read: the
  // list always showed every kind of media, and callers asking for an image
  // could be handed an mp3 or a pdf. `MediaPicker` had been passing it since
  // it was written, and the editor's "insert image" button would have stored
  // `<img src="….pdf">` in a book description.
  const restrictedTo = allowedTypes && allowedTypes.length > 0 ? allowedTypes : null;
  // One permitted type pins the filter to it. Several keep `'all'`, which the
  // toolbar then offers meaning "all permitted" - a Select holding a value
  // outside its own list renders blank with no way back.
  const defaultTypeFilter: MediaType | 'all' = restrictedTo?.length === 1 ? restrictedTo[0] : 'all';

  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>(defaultTypeFilter);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  // Fetch media files
  const { data, isLoading, isError, refetch } = useMediaFiles({
    page: 1,
    limit: 50, // Load more for the modal
    search: search || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  // Second line of defence: the request above narrows by a single type only,
  // so a caller allowing two kinds still needs the list filtered here.
  const visibleFiles = restrictedTo
    ? (data?.items ?? []).filter((file) => restrictedTo.includes(file.type))
    : (data?.items ?? []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('library');
      setSearch('');
      setTypeFilter(defaultTypeFilter);
      // We don't reset selectedFile here to allow persistence if needed,
      // but usually we might want to find the file by initialSelectedUrl if we had the full list.
      // For now, we start with no selection in the modal unless the user clicks.
      setSelectedFile(null);
    }
  }, [isOpen, defaultTypeFilter]);

  const handleUploadComplete = () => {
    refetch();
    setActiveTab('library');
  };

  const handleFileSelect = (file: MediaFile) => {
    // The grid only ever shows permitted files, but the guard costs nothing and
    // keeps the promise of `allowedTypes` true whatever the grid does later.
    if (restrictedTo && !restrictedTo.includes(file.type)) return;
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
            <MediaUpload
              onUploadComplete={handleUploadComplete}
              acceptTypes={restrictedTo ?? undefined}
            />
          ) : (
            <div className={styles.libraryContainer}>
              <MediaToolbar
                search={search}
                onSearchChange={setSearch}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                availableTypes={restrictedTo ?? undefined}
                viewMode="grid" // Always grid in modal for now
                onViewModeChange={() => {}} // Disable view toggle in modal
              />

              <div className={styles.gridContainer}>
                {isLoading ? (
                  <div>Loading...</div>
                ) : isError ? (
                  // Without this branch a failed request looked exactly like an
                  // empty library: the grid rendered nothing and said nothing.
                  <div role="alert" className={styles.loadFailed}>
                    Could not load the media library.{' '}
                    <button type="button" className={styles.retry} onClick={() => refetch()}>
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className={selectedFile ? styles.hasSelection : ''}>
                    <MediaGrid
                      files={visibleFiles}
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
