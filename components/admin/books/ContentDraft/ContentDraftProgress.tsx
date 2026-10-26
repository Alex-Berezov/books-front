'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/admin/common/Button';
import { LimitResume } from '@/components/admin/common/LimitResume';
import type { ContentDraftActions } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ContentDraft } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import { buildingText, refusalText } from './contentDraft.utils';

interface ContentDraftProgressProps {
  draft: ContentDraft;
  lang: SupportedLang;
  resume: ContentDraftActions['resume'];
}

/**
 * Ход строящейся заготовки: чего ждёт, пауза операции с причиной и «продолжить» (для
 * `LIMIT_REACHED` - с новым лимитом), ссылка на «LLM settings» при потолке и провайдерах.
 */
export const ContentDraftProgress: FC<ContentDraftProgressProps> = ({ draft, lang, resume }) => {
  const paused = draft.operation.status === 'paused';
  const reason = draft.operation.pauseReason;
  return (
    <div className={styles.draftStatus} role="status">
      <span>{buildingText(draft)}</span>
      {paused && (reason === 'CEILING_REACHED' || reason === 'NO_COMPLIANT_PROVIDER') && (
        <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link>
      )}
      {paused &&
        (reason === 'LIMIT_REACHED' ? (
          <LimitResume
            label="New limit of the draft"
            pending={resume.isPending}
            onResume={(limitUsd) => resume.mutate({ id: draft.operation.id, limitUsd })}
          >
            <span>New limit, $:</span>
          </LimitResume>
        ) : (
          <Button
            variant="secondary"
            onClick={() => resume.mutate({ id: draft.operation.id })}
            loading={resume.isPending}
            disabled={resume.isPending}
          >
            Resume
          </Button>
        ))}
      {resume.error && (
        <span className={styles.error} role="alert">
          {refusalText(resume.error)}
        </span>
      )}
    </div>
  );
};
