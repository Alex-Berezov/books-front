import type { FC } from 'react';
import Image from 'next/image';
import { useAcceptWorldImage, useWorldImage } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import { isServerFailure } from '@/lib/admin/request-errors';
import { worldImageSize } from '@/lib/book-world/image';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { WorldImageFile } from '@/types/api-schema';
import { worldImageRequestErrorText } from './worldImageErrors';
import styles from './WorldTab.module.scss';

interface WorldImagePanelProps {
  versionId: string;
  entityKey: string;
  name: string;
}

const Figure: FC<{ title: string; file: WorldImageFile; name: string }> = ({
  title,
  file,
  name,
}) => (
  <figure className={styles.imageFigure}>
    <Image
      src={file.url}
      alt={`${name}: ${title}`}
      {...worldImageSize(file)}
      sizes="12rem"
      unoptimized={!isOptimizableHost(file.url)}
      className={styles.image}
    />
    <figcaption className={styles.hint}>
      {title}
      {file.width && file.height ? `, ${file.width}×${file.height}` : ''}
    </figcaption>
  </figure>
);

/**
 * Иллюстрация героя во вкладке World (F08-11b, `product.md` §8): принятая и ожидающая «Accept».
 * Сайт картинку не генерирует (решение владельца, F08-11d): её готовит редакция вручную. Ручки —
 * только `admin`: карточка рисует панель только ему (решение `F08 | F08-11` Р5). Картинки видны
 * и тогда, когда иллюстрация герою уже не положена (`roleAllowed: false`): принятая могла остаться,
 * а «Accept» не показывается — сервер всё равно ответит 409 `WORLD_IMAGE_NOT_ALLOWED`. Панель читает
 * флаг роли, а не `allowed`: он верен и на бэкенде до `F08-11d-1`, где `allowed` требовал ещё
 * «Внешность».
 */
export const WorldImagePanel: FC<WorldImagePanelProps> = ({ versionId, entityKey, name }) => {
  const query = useWorldImage(versionId, entityKey);
  const accept = useAcceptWorldImage();
  const state = query.data;

  if (!state) {
    return (
      <section className={styles.imagePanel} aria-label="Illustration">
        <h4 className={styles.sectionTitle}>Illustration</h4>
        {query.isError ? (
          <div className={styles.error} role="alert">
            <p>Could not load the illustration: {worldImageRequestErrorText(query.error)}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Spinner size="sm" />
        )}
      </section>
    );
  }

  const { accepted, pending } = state;
  // 5xx уже показал общий тост (`AppProviders`), здесь — только разобранные отказы.
  const requestError = accept.error && !isServerFailure(accept.error) ? accept.error : null;

  return (
    <section className={styles.imagePanel} aria-label="Illustration">
      <h4 className={styles.sectionTitle}>Illustration</h4>

      <div className={styles.imageRow}>
        {accepted && <Figure title="Accepted" file={accepted} name={name} />}
        {pending && <Figure title="Waiting for Accept" file={pending} name={name} />}
        {!accepted && !pending && <p className={styles.hint}>No illustration yet.</p>}
      </div>

      {query.isError && (
        <div className={styles.error} role="alert">
          <p>Could not refresh the illustration: {worldImageRequestErrorText(query.error)}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {requestError && (
        <p className={styles.error} role="alert">
          {worldImageRequestErrorText(requestError)}
        </p>
      )}

      {pending && state.roleAllowed && (
        <div className={styles.actions}>
          <Button
            type="button"
            size="sm"
            loading={accept.isPending}
            disabled={accept.isPending}
            onClick={() => accept.mutate({ versionId, key: entityKey, mediaId: pending.mediaId })}
          >
            Accept
          </Button>
        </div>
      )}
      {!state.roleAllowed && (
        <p className={styles.hint}>Only main and secondary characters get an illustration.</p>
      )}
    </section>
  );
};
