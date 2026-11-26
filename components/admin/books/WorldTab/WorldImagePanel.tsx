import { useRef, useState, type ChangeEvent, type FC } from 'react';
import Image from 'next/image';
import { useAcceptWorldImage, useUploadWorldImage, useWorldImage } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import { worldImageFileLimitsOf } from '@/lib/admin/book-world-blocks';
import { errorCode, isServerFailure } from '@/lib/admin/request-errors';
import { worldImageSize, type WorldImageEntityType } from '@/lib/book-world/image';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { WorldImageFile } from '@/types/api-schema';
import {
  WORLD_IMAGE_KEY_CONFLICT_TEXT,
  WORLD_IMAGE_NOT_ALLOWED_TEXT,
  worldImageRequestErrorText,
} from './worldImageErrors';
import styles from './WorldTab.module.scss';

interface WorldImagePanelProps {
  versionId: string;
  entityKey: string;
  name: string;
  /** Герой - портрет от 1200×1200, место - от 1200×675 (F08-12c-2, круг 1 Q3). */
  entityType: WorldImageEntityType;
}

const Figure: FC<{
  title: string;
  file: WorldImageFile;
  name: string;
  entityType: WorldImageEntityType;
}> = ({ title, file, name, entityType }) => (
  <figure className={styles.imageFigure}>
    <Image
      src={file.url}
      alt={`${name}: ${title}`}
      {...worldImageSize(file, entityType)}
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

/** Правило файла в подписи поля - из предела типа сущности (F08-12c-2). */
const fileRule = (entityType: WorldImageEntityType): string => {
  const { minWidth, minHeight, maxMb, maxMegapixels } = worldImageFileLimitsOf(entityType);
  return `PNG, JPEG or WebP, from ${minWidth}×${minHeight} px, up to ${maxMb} MB and ${maxMegapixels} megapixels`;
};

/** Подпись поля: что станет с ожидающей и принятой после загрузки (`product.md` §8). */
const uploadLabel = (hasPending: boolean, hasAccepted: boolean, rule: string): string => {
  if (hasPending) return `Upload a file to replace the one waiting for Accept (${rule}):`;
  if (hasAccepted) {
    return `Upload a new file — the accepted one stays on the site until Accept (${rule}):`;
  }
  return `Upload a file (${rule}):`;
};

/**
 * Иллюстрация героя и места (F08-12c-2) во вкладке World (F08-11b, `product.md` §8): принятая и
 * ожидающая «Accept».
 * Сайт картинку не генерирует (решение владельца, F08-11d): её готовит редакция вручную и
 * загружает файлом (F08-11d-3) в ожидающую ячейку; принятая остаётся, пока не нажато «Accept». Ручки —
 * только `admin`: карточка рисует панель только ему (решение `F08 | F08-11` Р5). Картинки видны
 * и тогда, когда иллюстрация герою уже не положена (`roleAllowed: false`): принятая могла остаться,
 * а «Accept» не показывается — сервер всё равно ответит 409 `WORLD_IMAGE_NOT_ALLOWED`. Панель читает
 * флаг роли, а не `allowed`: он верен и на бэкенде до `F08-11d-1`, где `allowed` требовал ещё
 * «Внешность».
 */
export const WorldImagePanel: FC<WorldImagePanelProps> = ({
  versionId,
  entityKey,
  name,
  entityType,
}) => {
  const limits = worldImageFileLimitsOf(entityType);
  const maxFileBytes = limits.maxMb * 1024 * 1024;
  const query = useWorldImage(versionId, entityKey);
  const accept = useAcceptWorldImage();
  const upload = useUploadWorldImage();
  const fileInput = useRef<HTMLInputElement>(null);
  // Файл больше предела отбивается до отправки: его байты не идут через прокси ради известного 413.
  const [localRefusal, setLocalRefusal] = useState<string | null>(null);
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
  // Обе мутации сбрасывают друг друга при запуске: показана ошибка последнего действия.
  const failure = upload.error ?? accept.error;
  // Отказ по роли после перечитывания уже сказан подсказкой ниже — второй строкой не повторяется.
  const roleRefusalShown = !state.roleAllowed && errorCode(failure) === 'WORLD_IMAGE_NOT_ALLOWED';
  // Ключ занят картинкой сущности другого типа (F08-12c-2, круг 1 Q2): загрузка и «Accept» всё равно
  // кончатся 409 - их нет, причина сказана подсказкой; отказ после перечитывания второй строкой не идёт.
  const keyConflict = state.keyConflict === true;
  const keyRefusalShown = keyConflict && errorCode(failure) === 'WORLD_IMAGE_KEY_CONFLICT';
  const canAct = state.roleAllowed && !keyConflict;
  const requestError =
    failure && !isServerFailure(failure) && !roleRefusalShown && !keyRefusalShown ? failure : null;
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    accept.reset();
    if (file.size > maxFileBytes) {
      upload.reset();
      // Отказ до отправки — только по размеру файла: мегапиксели здесь не известны.
      setLocalRefusal(`The file is too large: up to ${limits.maxMb} MB.`);
      event.target.value = '';
      return;
    }
    setLocalRefusal(null);
    upload.mutate(
      { versionId, key: entityKey, file },
      {
        // Тот же файл можно выбрать снова после отказа.
        onSettled: () => {
          if (fileInput.current) fileInput.current.value = '';
        },
      }
    );
  };

  return (
    <section className={styles.imagePanel} aria-label="Illustration">
      <h4 className={styles.sectionTitle}>Illustration</h4>

      <div className={styles.imageRow}>
        {accepted && (
          <Figure title="Accepted" file={accepted} name={name} entityType={entityType} />
        )}
        {pending && (
          <Figure title="Waiting for Accept" file={pending} name={name} entityType={entityType} />
        )}
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
      {localRefusal && !requestError && (
        <p className={styles.error} role="alert">
          {localRefusal}
        </p>
      )}
      {requestError && (
        <p className={styles.error} role="alert">
          {worldImageRequestErrorText(requestError, entityType)}
        </p>
      )}

      {canAct && (
        <div className={styles.actions}>
          <label className={styles.hint}>
            {uploadLabel(Boolean(pending), Boolean(accepted), fileRule(entityType))}{' '}
            <input
              ref={fileInput}
              type="file"
              accept={limits.types.join(',')}
              disabled={upload.isPending || accept.isPending}
              onChange={onFile}
            />
          </label>
          {upload.isPending && <Spinner size="sm" />}
        </div>
      )}

      {pending && canAct && (
        <div className={styles.actions}>
          <Button
            type="button"
            size="sm"
            loading={accept.isPending}
            disabled={accept.isPending || upload.isPending}
            onClick={() => {
              upload.reset();
              setLocalRefusal(null);
              accept.mutate({ versionId, key: entityKey, mediaId: pending.mediaId });
            }}
          >
            Accept
          </Button>
        </div>
      )}
      {state.roleAllowed && keyConflict && (
        <p className={styles.hint}>{WORLD_IMAGE_KEY_CONFLICT_TEXT}</p>
      )}
      {!state.roleAllowed && <p className={styles.hint}>{WORLD_IMAGE_NOT_ALLOWED_TEXT}</p>}
    </section>
  );
};
