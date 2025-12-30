'use client';

import { useState } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useMediaFiles, useDeleteMedia } from '@/api/hooks/useMedia';
import { DeleteMediaModal } from '@/components/admin/media/DeleteMediaModal';
import { MediaGrid } from '@/components/admin/media/MediaGrid';
import { MediaList } from '@/components/admin/media/MediaList';
import { MediaPreviewModal } from '@/components/admin/media/MediaPreviewModal';
import { MediaToolbar } from '@/components/admin/media/MediaToolbar';
import { UploadModal } from '@/components/admin/media/UploadModal';
import { EmptyState, Skeleton } from '@/components/admin/shared';
import { Pagination } from '@/components/admin/shared/Pagination';
import { Button } from '@/components/common/Button';
import type { MediaType, MediaFile } from '@/types/api-schema/media';
import styles from '@/components/admin/media/MediaPage.module.scss';

export default function MediaPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const limit = 20;

  const { enqueueSnackbar } = useSnackbar();
  const { mutateAsync: deleteMedia, isPending: isDeleting } = useDeleteMedia();

  const { data, isLoading } = useMediaFiles({
    page,
    limit,
    search,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTypeFilterChange = (value: MediaType | 'all') => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleCopyUrl = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url);
      enqueueSnackbar('URL copied to clipboard', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to copy URL', { variant: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      await deleteMedia(fileToDelete.id);
      enqueueSnackbar('File deleted successfully', { variant: 'success' });
      setFileToDelete(null);
    } catch (error) {
      enqueueSnackbar('Failed to delete file', { variant: 'error' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Media Library</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload size={18} style={{ marginRight: 8 }} />
          Upload Files
        </Button>
      </div>

      <MediaToolbar
        search={search}
        onSearchChange={handleSearchChange}
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Skeleton variant="rect" height={160} style={{ borderRadius: '8px 8px 0 0' }} />
                <div className={styles.cardContent} style={{ padding: '12px' }}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="40%" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--color-border-light)',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                }}
              >
                <Skeleton variant="rect" width={48} height={48} style={{ borderRadius: '4px' }} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="200px" />
                  <Skeleton variant="text" width="100px" />
                </div>
                <Skeleton variant="button" width={80} />
              </div>
            ))}
          </div>
        )
      ) : !data?.data?.length ? (
        <EmptyState
          title="No media files found"
          description={search ? 'Try a different search term' : 'Upload your first media file'}
          icon={<FolderOpen />}
          action={
            !search && (
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Upload size={18} style={{ marginRight: 8 }} />
                Upload Files
              </Button>
            )
          }
        />
      ) : (
        <>
          {viewMode === 'grid' ? (
            <MediaGrid
              files={data.data}
              onSelect={setPreviewFile}
              onDelete={setFileToDelete}
              onCopyUrl={handleCopyUrl}
            />
          ) : (
            <MediaList
              files={data.data}
              onSelect={setPreviewFile}
              onDelete={setFileToDelete}
              onCopyUrl={handleCopyUrl}
            />
          )}

          {(data?.meta?.totalPages ?? 0) > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          // Optional: close modal on complete or keep open for more uploads
          // setIsUploadModalOpen(false);
        }}
      />

      <DeleteMediaModal
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleDeleteConfirm}
        fileName={fileToDelete?.filename}
        isDeleting={isDeleting}
      />

      <MediaPreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
