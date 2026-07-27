import { useState } from 'react';
import type { FC } from 'react';
import { Button, Popconfirm, Tag } from 'antd';
import { ExternalLink, Plus, Trash2, UserCheck } from 'lucide-react';
import {
  useLinkRightsComponentContributor,
  useLinkSourceEditionContributor,
  useUnlinkRightsComponentContributor,
  useUnlinkSourceEditionContributor,
} from '@/api/hooks/useContributors';
import type {
  Contributor,
  ContributorIdentityConfidence,
  ContributorRole,
} from '@/types/contributors';
import { ContributorModal } from './ContributorModal';
import styles from './ContributorsPanel.module.scss';

interface ContributorItem {
  linkId: string;
  contributor: Contributor;
  role: ContributorRole;
  creditedName?: string | null;
}

interface ContributorsPanelProps {
  sourceEditionId?: string;
  rightsComponentId?: string;
  items?: ContributorItem[];
  title?: string;
  readOnly?: boolean;
}

const ROLE_LABELS: Record<ContributorRole, string> = {
  AUTHOR: 'Автор',
  TRANSLATOR: 'Переводчик',
  EDITOR: 'Редактор',
  ILLUSTRATOR: 'Иллюстратор',
  NARRATOR: 'Диктор / Чтец',
  ADAPTER: 'Адаптер',
  COMPILER: 'Составитель',
  COMMENTATOR: 'Автор комментариев',
  INTRODUCTION_AUTHOR: 'Автор предисловия',
  AFTERWORD_AUTHOR: 'Автор послесловия',
  COVER_ARTIST: 'Художник обложки',
  RIGHTS_HOLDER: 'Правообладатель',
  OTHER: 'Другое',
};

const CONFIDENCE_COLORS: Record<ContributorIdentityConfidence, string> = {
  CONFIRMED: 'green',
  PROBABLE: 'blue',
  UNCERTAIN: 'orange',
  UNKNOWN: 'default',
};

export const ContributorsPanel: FC<ContributorsPanelProps> = ({
  sourceEditionId,
  rightsComponentId,
  items = [],
  title = 'Участники и авторы (Contributors / Person Model)',
  readOnly = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const linkSourceEditionMutation = useLinkSourceEditionContributor();
  const unlinkSourceEditionMutation = useUnlinkSourceEditionContributor();
  const linkRightsComponentMutation = useLinkRightsComponentContributor();
  const unlinkRightsComponentMutation = useUnlinkRightsComponentContributor();

  const handleAddContributor = async (
    contributorId: string,
    role: ContributorRole,
    creditedName?: string
  ) => {
    if (sourceEditionId) {
      await linkSourceEditionMutation.mutateAsync({
        sourceEditionId,
        payload: { contributorId, role, creditedName },
      });
    } else if (rightsComponentId) {
      await linkRightsComponentMutation.mutateAsync({
        rightsComponentId,
        payload: { contributorId, role, creditedName },
      });
    }
  };

  const handleRemove = async (linkId: string) => {
    if (sourceEditionId) {
      await unlinkSourceEditionMutation.mutateAsync({ sourceEditionId, linkId });
    } else if (rightsComponentId) {
      await unlinkRightsComponentMutation.mutateAsync({ rightsComponentId, linkId });
    }
  };

  return (
    <div className={styles.contributorsPanel}>
      <div className={styles.header}>
        <h4>
          <UserCheck size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {title} ({items.length})
        </h4>
        {!readOnly && (sourceEditionId || rightsComponentId) && (
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => setModalOpen(true)}
          >
            Добавить участника
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>Участники пока не привязаны.</div>
      ) : (
        <div className={styles.grid}>
          {items.map(({ linkId, contributor, role, creditedName }) => (
            <div key={linkId} className={styles.card}>
              <div className={styles.cardHeader}>
                <Tag color="blue">{ROLE_LABELS[role] || role}</Tag>
                <Tag color={CONFIDENCE_COLORS[contributor.identityConfidence]}>
                  {contributor.identityConfidence}
                </Tag>
              </div>

              <div className={styles.name}>
                {contributor.displayName}
                {creditedName && creditedName !== contributor.displayName && (
                  <span style={{ fontSize: '0.85em', color: '#666', marginLeft: 4 }}>
                    (в источнике: &ldquo;{creditedName}&rdquo;)
                  </span>
                )}
              </div>

              <div className={styles.meta}>
                {(contributor.birthYear || contributor.deathYear) && (
                  <span>
                    Годы жизни: {contributor.birthYear ?? '?'}&ndash;{contributor.deathYear ?? ''}
                  </span>
                )}

                {contributor.nationalityCountry && (
                  <span>Страна: {contributor.nationalityCountry}</span>
                )}

                {contributor.viafId && (
                  <a
                    href={`https://viaf.org/viaf/${contributor.viafId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
                  >
                    VIAF <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {contributor.notesRu && <div className={styles.notes}>{contributor.notesRu}</div>}

              {!readOnly && (
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Popconfirm
                    title="Удалить привязку участника?"
                    onConfirm={() => handleRemove(linkId)}
                    okText="Да"
                    cancelText="Отмена"
                  >
                    <Button type="text" danger size="small" icon={<Trash2 size={14} />}>
                      Удалить
                    </Button>
                  </Popconfirm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ContributorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectContributor={handleAddContributor}
      />
    </div>
  );
};
