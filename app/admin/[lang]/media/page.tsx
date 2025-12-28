'use client';

import { useState } from 'react';
import { FolderOpen, Upload, Loader2 } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useMediaFiles, useDeleteMedia } from '@/api/hooks/useMedia';
import { DeleteMediaModal } from '@/components/admin/media/DeleteMediaModal';
import { MediaGrid } from '@/components/admin/media/MediaGrid';
import { MediaList } from '@/components/admin/media/MediaList';
import { MediaPreviewModal } from '@/components/admin/media/MediaPreviewModal';
import { MediaToolbar } from '@/components/admin/media/MediaToolbar';
import { UploadModal } from '@/components/admin/media/UploadModal';
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
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : !data?.data?.length ? (
        <div className={styles.emptyState}>
          <FolderOpen />
          <p>No media files found</p>
        </div>
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
