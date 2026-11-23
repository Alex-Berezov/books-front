import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  isWorldImageRunning,
  useAcceptWorldImage,
  useGenerateWorldImage,
  useWorldImage,
} from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { Spinner } from '@/components/admin/shared';
import { isServerFailure } from '@/lib/admin/request-errors';
import { worldImageSize } from '@/lib/book-world/image';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { WorldImageFile } from '@/types/api-schema';
import {
  worldImageFailedText,
  worldImageReasonText,
  worldImageRequestErrorText,
} from './worldImageErrors';
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
 * Иллюстрация героя во вкладке World (F08-11b, `product.md` §8): принятая, ожидающая «Accept»,
 * «Generate»/«Regenerate» с оценкой цены, статус генерации и причина отказа. Ручки — только
 * `admin`: карточка рисует панель только ему (решение `F08 | F08-11` Р5). Картинки видны и
 * тогда, когда генерировать уже нельзя (`allowed: false`): принятая могла остаться у героя.
 */
export const WorldImagePanel: FC<WorldImagePanelProps> = ({ versionId, entityKey, name }) => {
  const query = useWorldImage(versionId, entityKey);
  const generate = useGenerateWorldImage();
  const accept = useAcceptWorldImage();
  const state = query.data;
  const running = isWorldImageRunning(state);
  const wasRunning = useRef(running);
  const errorGenerationKey = useRef<string | null>(null);
  const { reset: resetGenerate } = generate;
  const { reset: resetAccept } = accept;

  // Генерация закончилась — прежний отказ кнопки («уже идёт») к новому состоянию не относится.
  useEffect(() => {
    if (wasRunning.current && !running) {
      resetGenerate();
      resetAccept();
    }
    wasRunning.current = running;
  }, [running, resetGenerate, resetAccept]);

  // Отказ Generate (409 «уже идёт» при паузе на идущем шаге) снимается, когда генерация в состоянии
  // сменилась (решение `F08 | F08-11c`, хвост 11b). Снимок ключа берётся после перечитывания из
  // `onError` (`!isFetching`): само это перечитывание сообщение не съедает.
  const generationKey = state?.generation
    ? `${state.generation.operationId}:${state.generation.status}`
    : '';
  const generateFailed = generate.error !== null;
  const fetching = query.isFetching;
  useEffect(() => {
    if (!generateFailed) {
      errorGenerationKey.current = null;
      return;
    }
    if (fetching) return;
    if (errorGenerationKey.current === null) {
      errorGenerationKey.current = generationKey;
    } else if (errorGenerationKey.current !== generationKey) {
      errorGenerationKey.current = null;
      resetGenerate();
    }
  }, [generateFailed, fetching, generationKey, resetGenerate]);

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

  const { accepted, pending, generation } = state;
  const startLabel = accepted || pending ? 'Regenerate' : 'Generate';
  // 5xx уже показал общий тост (`AppProviders`), здесь — только разобранные отказы.
  const requestError = [generate.error, accept.error].find((e) => e && !isServerFailure(e));

  return (
    <section className={styles.imagePanel} aria-label="Illustration">
      <h4 className={styles.sectionTitle}>Illustration</h4>

      <div className={styles.imageRow}>
        {accepted && <Figure title="Accepted" file={accepted} name={name} />}
        {pending && <Figure title="Waiting for Accept" file={pending} name={name} />}
        {!accepted && !pending && <p className={styles.hint}>No illustration yet.</p>}
      </div>

      {!state.allowed && (
        <p className={styles.hint}>
          A new illustration needs a main or secondary character with appearance text.
        </p>
      )}
      {query.isError && (
        <div className={styles.error} role="alert">
          <p>Could not refresh the illustration: {worldImageRequestErrorText(query.error)}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {running && (
        <p className={styles.status} role="status">
          Generating the illustration…
        </p>
      )}
      {(generation?.status === 'paused' || generation?.status === 'cancelled') && (
        <p className={styles.status} role="status">
          {generation.status === 'paused'
            ? 'The generation is paused.'
            : 'The last generation was cancelled.'}
          {generation.failedReason !== null && ` ${worldImageReasonText(generation.failedReason)}`}
          {generation.status === 'paused' && state.allowed && ` ${startLabel} to replace it.`}
        </p>
      )}
      {generation?.status === 'failed' && (
        <p className={styles.error} role="alert">
          {worldImageFailedText(generation)}
        </p>
      )}
      {requestError && (
        <p className={styles.error} role="alert">
          {worldImageRequestErrorText(requestError)}
        </p>
      )}

      <div className={styles.actions}>
        {state.allowed && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={generate.isPending}
            disabled={generate.isPending || running}
            onClick={() => {
              accept.reset();
              generate.mutate({ versionId, key: entityKey });
            }}
          >
            {startLabel}
          </Button>
        )}
        {pending && (
          <Button
            type="button"
            size="sm"
            loading={accept.isPending}
            disabled={accept.isPending || running}
            onClick={() => {
              generate.reset();
              accept.mutate({ versionId, key: entityKey, mediaId: pending.mediaId });
            }}
          >
            Accept
          </Button>
        )}
      </div>
      {state.allowed && (
        <p className={styles.hint}>
          Up to {formatMoney(state.estimateUsd)} per image. A new picture waits for Accept; the
          accepted one stays until then. One picture for all languages of the book.
        </p>
      )}
    </section>
  );
};
