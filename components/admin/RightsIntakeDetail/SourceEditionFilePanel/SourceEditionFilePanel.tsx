'use client';

import type { FC } from 'react';
import { downloadRightsSourceFile } from '@/api/endpoints/admin/rights-files';
import { useRightsFileLimits, useUploadRightsSourceFile } from '@/api/hooks/useRightsFiles';
import type { RightsFileMeta, SourceEdition } from '@/types/api-schema/rights-intake';
import styles from './SourceEditionFilePanel.module.scss';
import { RightsFileCard } from '../RightsFileCard/RightsFileCard';

export interface SourceEditionFilePanelProps {
  profileId: string;
  sourceEdition: SourceEdition;
}

const HINT =
  'Файл того самого текста, на который снят клиренс: именно он доказывает, что оценка прав ' +
  'относится к этой редакции. Файл приватный, публичной ссылки у него нет.';

const UPLOAD_WARNING =
  'Загрузка меняет content hash клиренса: контрольная сумма файла входит в него, поэтому все ' +
  'версии книги, снятые с этого профиля, будут помечены требующими перепроверки прав. ' +
  'Публикация таких версий заблокируется до повторной проверки.';

const REPLACEMENT_NOTICE =
  'Замена загруженного файла запрещена: она сделала бы недействительным клиренс, снятый с ' +
  'прежнего файла. Другой текст источника — это другой профиль прав.';

/**
 * WP-8.3 — файл исходного издания.
 *
 * До WP-9 профиль ссылался на источник одним внешним URL: доказать, что клиренс снят именно с
 * этого текста, было нечем. Теперь сумма загруженного файла входит в content hash, и подмена
 * текста перестаёт быть незаметной.
 */
export const SourceEditionFilePanel: FC<SourceEditionFilePanelProps> = (props) => {
  const { profileId, sourceEdition } = props;

  const { data: limits } = useRightsFileLimits();
  const uploadMutation = useUploadRightsSourceFile();

  const file: RightsFileMeta | null = sourceEdition.hasSourceFile
    ? {
        sha256: sourceEdition.sourceFileSha256 ?? null,
        fileName: sourceEdition.sourceFileName ?? null,
        contentType: sourceEdition.sourceFileContentType ?? null,
        sizeBytes: sourceEdition.sourceFileSizeBytes ?? null,
        uploadedAt: sourceEdition.sourceFileUploadedAt ?? null,
      }
    : null;

  const accept = limits?.allowedContentTypes.sourceFile.join(',');

  const handleUpload = async (selected: File) => {
    await uploadMutation.mutateAsync({ profileId, file: selected });
  };

  return (
    <div className={styles.block}>
      <h4 className={styles.blockTitle}>Файл источника</h4>
      <RightsFileCard
        title="Файл исходного издания"
        hint={HINT}
        uploadWarning={UPLOAD_WARNING}
        replacementNotice={REPLACEMENT_NOTICE}
        accept={accept}
        maxSizeMb={limits?.maxSizeMb ?? null}
        file={file}
        uploadLabel="Загрузить файл источника"
        onUpload={handleUpload}
        onDownload={() => downloadRightsSourceFile(profileId)}
      />
    </div>
  );
};
