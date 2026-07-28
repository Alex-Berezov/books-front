'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { Button, Drawer, Form, Input, Popconfirm, Select, Tag, message } from 'antd';
import {
  useAddClaimAttachment,
  useLiftClaimBlock,
  useRecordClaimResponse,
  useRecordCounterNotice,
  useResolveRightsClaim,
  useRightsClaim,
} from '@/api/hooks/useRightsClaims';
import {
  CLAIMANT_TYPE_LABELS,
  CLAIM_ATTACHMENT_TYPE_LABELS,
  CLAIM_BLOCK_SCOPE_LABELS,
  CLAIM_BLOCK_STATUS_COLORS,
  CLAIM_BLOCK_STATUS_LABELS,
  CLAIM_CHANNEL_LABELS,
  CLAIM_EVENT_LABELS,
  CLAIM_RESOLUTION_LABELS,
  CLAIM_SEVERITY_COLORS,
  CLAIM_SEVERITY_LABELS,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  formatClaimDate,
  formatClaimDateTime,
} from '@/components/admin/rights-claims/claimLabels';
import type {
  RightsClaimAttachmentType,
  RightsClaimResolution,
} from '@/types/api-schema/rights-claims';
import styles from './RightsClaimDetailDrawer.module.scss';

export interface RightsClaimDetailDrawerProps {
  claimId: string;
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

const RESOLUTION_OPTIONS = (Object.keys(CLAIM_RESOLUTION_LABELS) as RightsClaimResolution[]).map(
  (value) => ({ label: CLAIM_RESOLUTION_LABELS[value], value })
);

const ATTACHMENT_TYPE_OPTIONS = (
  Object.keys(CLAIM_ATTACHMENT_TYPE_LABELS) as RightsClaimAttachmentType[]
).map((value) => ({ label: CLAIM_ATTACHMENT_TYPE_LABELS[value], value }));

export const RightsClaimDetailDrawer: FC<RightsClaimDetailDrawerProps> = ({
  claimId,
  open,
  onClose,
  readOnly = false,
}) => {
  const { data: claim, isLoading } = useRightsClaim(claimId);
  const [responseForm] = Form.useForm();
  const [counterNoticeForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();
  const [liftReasons, setLiftReasons] = useState<Record<string, string>>({});

  const responseMutation = useRecordClaimResponse();
  const counterNoticeMutation = useRecordCounterNotice();
  const resolveMutation = useResolveRightsClaim();
  const liftMutation = useLiftClaimBlock();
  const attachmentMutation = useAddClaimAttachment();

  const canMutate = !readOnly && claim?.isOpen === true;

  const handleResponse = async (values: Record<string, unknown>) => {
    try {
      await responseMutation.mutateAsync({
        id: claimId,
        data: { responseTextRu: (values.responseTextRu as string).trim() },
      });
      message.success('Ответ зафиксирован');
      responseForm.resetFields();
    } catch {
      message.error('Не удалось сохранить ответ заявителю.');
    }
  };

  const handleCounterNotice = async (values: Record<string, unknown>) => {
    try {
      await counterNoticeMutation.mutateAsync({
        id: claimId,
        data: { counterNoticeTextRu: (values.counterNoticeTextRu as string).trim() },
      });
      message.success('Встречное уведомление зафиксировано');
      counterNoticeForm.resetFields();
    } catch {
      message.error('Не удалось сохранить встречное уведомление.');
    }
  };

  const handleResolve = async (values: Record<string, unknown>) => {
    try {
      await resolveMutation.mutateAsync({
        id: claimId,
        data: {
          resolution: values.resolution as RightsClaimResolution,
          resolutionNotesRu: (values.resolutionNotesRu as string).trim(),
          liftActiveBlocks: values.liftActiveBlocks !== false,
        },
      });
      message.success('Претензия резолвлена');
      resolveForm.resetFields();
    } catch {
      message.error('Не удалось резолвить претензию.');
    }
  };

  const handleAttachment = async (values: Record<string, unknown>) => {
    try {
      await attachmentMutation.mutateAsync({
        id: claimId,
        data: {
          attachmentType: values.attachmentType as RightsClaimAttachmentType,
          title: (values.title as string).trim(),
          url: (values.url as string | undefined)?.trim() || undefined,
          storageKey: (values.storageKey as string | undefined)?.trim() || undefined,
          mediaAssetId: (values.mediaAssetId as string | undefined)?.trim() || undefined,
        },
      });
      message.success('Вложение добавлено');
      attachmentForm.resetFields();
    } catch {
      message.error('Не удалось добавить вложение. Укажите url, storageKey или mediaAssetId.');
    }
  };

  const handleLift = (blockId: string) => {
    liftMutation.mutate({
      id: claimId,
      blockId,
      data: { liftReasonRu: liftReasons[blockId]?.trim() || 'Блокировка снята редактором.' },
    });
  };

  return (
    <Drawer
      onClose={onClose}
      open={open}
      title={claim ? `Претензия ${claim.claimNumber}` : 'Претензия'}
      width={720}
    >
      {isLoading || !claim ? (
        <p className={styles.muted}>Загрузка претензии…</p>
      ) : (
        <div className={styles.content}>
          <section className={styles.headerBadges}>
            <Tag color={CLAIM_SEVERITY_COLORS[claim.severity]}>
              {CLAIM_SEVERITY_LABELS[claim.severity]}
            </Tag>
            <Tag>{CLAIM_STATUS_LABELS[claim.status]}</Tag>
            <Tag>{CLAIM_TYPE_LABELS[claim.claimType]}</Tag>
            {claim.blocksPublication && claim.isOpen && <Tag color="red">Блокирует публикацию</Tag>}
            {claim.isOverdue && <Tag color="red">Срок ответа просрочен</Tag>}
            {claim.requiresLawyerReview && <Tag color="purple">Нужен юрист</Tag>}
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Заявитель</h4>
            <dl className={styles.definitionList}>
              <dt>Имя</dt>
              <dd>{claim.claimantName}</dd>
              <dt>Тип</dt>
              <dd>{CLAIMANT_TYPE_LABELS[claim.claimantType]}</dd>
              <dt>Организация</dt>
              <dd>{claim.claimantOrganization ?? '—'}</dd>
              <dt>E-mail</dt>
              <dd>{claim.claimantEmail ?? '—'}</dd>
              <dt>Телефон</dt>
              <dd>{claim.claimantPhone ?? '—'}</dd>
              <dt>Полномочия подтверждены</dt>
              <dd>{claim.claimantIsAuthorized ? 'да' : 'нет'}</dd>
              <dt>Канал</dt>
              <dd>{CLAIM_CHANNEL_LABELS[claim.channel]}</dd>
              <dt>Получена</dt>
              <dd>{formatClaimDate(claim.receivedAt)}</dd>
              <dt>Срок ответа</dt>
              <dd>{formatClaimDate(claim.deadlineAt)}</dd>
            </dl>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Объект претензии</h4>
            <dl className={styles.definitionList}>
              <dt>Заявленное произведение</dt>
              <dd>{claim.claimedWorkTitle ?? '—'}</dd>
              <dt>Заявленный автор</dt>
              <dd>{claim.claimedWorkAuthor ?? '—'}</dd>
              <dt>Страны</dt>
              <dd>
                {claim.affectedCountryCodes.length > 0
                  ? claim.affectedCountryCodes.join(', ')
                  : 'все страны'}
              </dd>
              <dt>Языки</dt>
              <dd>
                {claim.affectedLanguages.length > 0 ? claim.affectedLanguages.join(', ') : 'все'}
              </dd>
              <dt>Описание</dt>
              <dd>{claim.descriptionRu}</dd>
            </dl>
            {claim.components.length > 0 && (
              <ul className={styles.list}>
                {claim.components.map((component) => (
                  <li key={component.id}>
                    {component.titleRu ?? component.componentType ?? component.rightsComponentId}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Блокировки доступа</h4>
            {claim.accessBlocks.length === 0 ? (
              <p className={styles.muted}>Блокировки не применялись.</p>
            ) : (
              <ul className={styles.blockList}>
                {claim.accessBlocks.map((block) => (
                  <li className={styles.blockItem} key={block.id}>
                    <div className={styles.blockHeader}>
                      <Tag color={CLAIM_BLOCK_STATUS_COLORS[block.effectiveStatus]}>
                        {CLAIM_BLOCK_STATUS_LABELS[block.effectiveStatus]}
                      </Tag>
                      <span>{CLAIM_BLOCK_SCOPE_LABELS[block.scope]}</span>
                      <span>{block.countryCode ?? 'весь мир'}</span>
                      <span className={styles.muted}>{formatClaimDate(block.appliedAt)}</span>
                    </div>
                    <p className={styles.muted}>{block.reasonRu}</p>
                    {!readOnly && block.effectiveStatus === 'ACTIVE' && (
                      <div className={styles.blockActions}>
                        <Input
                          onChange={(event) =>
                            setLiftReasons((prev) => ({ ...prev, [block.id]: event.target.value }))
                          }
                          placeholder="Причина снятия"
                          size="small"
                          value={liftReasons[block.id] ?? ''}
                        />
                        <Popconfirm
                          cancelText="Отмена"
                          okText="Снять"
                          onConfirm={() => handleLift(block.id)}
                          title="Снять блокировку? Версия не публикуется автоматически."
                        >
                          <Button size="small">Снять блокировку</Button>
                        </Popconfirm>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Вложения</h4>
            {claim.attachments.length === 0 ? (
              <p className={styles.muted}>Вложений нет.</p>
            ) : (
              <ul className={styles.list}>
                {claim.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <strong>{attachment.title}</strong>{' '}
                    <span className={styles.muted}>
                      ({CLAIM_ATTACHMENT_TYPE_LABELS[attachment.attachmentType]})
                    </span>
                    {attachment.url && (
                      <>
                        {' — '}
                        <a href={attachment.url} rel="noreferrer" target="_blank">
                          ссылка
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && (
              <Form
                className={styles.form}
                form={attachmentForm}
                initialValues={{ attachmentType: 'EVIDENCE' }}
                layout="vertical"
                onFinish={handleAttachment}
              >
                <Form.Item label="Тип" name="attachmentType">
                  <Select options={ATTACHMENT_TYPE_OPTIONS} size="small" />
                </Form.Item>
                <Form.Item
                  label="Название"
                  name="title"
                  rules={[{ required: true, message: 'Укажите название' }]}
                >
                  <Input size="small" />
                </Form.Item>
                <Form.Item label="URL" name="url">
                  <Input placeholder="https://…" size="small" />
                </Form.Item>
                <Form.Item label="Storage key" name="storageKey">
                  <Input size="small" />
                </Form.Item>
                <Form.Item label="Media asset ID" name="mediaAssetId">
                  <Input size="small" />
                </Form.Item>
                <Button
                  htmlType="submit"
                  loading={attachmentMutation.isPending}
                  size="small"
                  type="primary"
                >
                  Добавить вложение
                </Button>
              </Form>
            )}
          </section>

          {canMutate && (
            <>
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Ответ заявителю</h4>
                {claim.responseSentAt && (
                  <p className={styles.muted}>
                    Ответ отправлен {formatClaimDateTime(claim.responseSentAt)}
                  </p>
                )}
                <Form
                  className={styles.form}
                  form={responseForm}
                  layout="vertical"
                  onFinish={handleResponse}
                >
                  <Form.Item
                    label="Текст ответа"
                    name="responseTextRu"
                    rules={[{ required: true, message: 'Введите текст ответа' }]}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Button
                    htmlType="submit"
                    loading={responseMutation.isPending}
                    size="small"
                    type="primary"
                  >
                    Зафиксировать ответ
                  </Button>
                </Form>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Встречное уведомление</h4>
                {claim.counterNoticeReceivedAt && (
                  <p className={styles.muted}>
                    Получено {formatClaimDateTime(claim.counterNoticeReceivedAt)}
                  </p>
                )}
                <Form
                  className={styles.form}
                  form={counterNoticeForm}
                  layout="vertical"
                  onFinish={handleCounterNotice}
                >
                  <Form.Item
                    label="Текст встречного уведомления"
                    name="counterNoticeTextRu"
                    rules={[{ required: true, message: 'Введите текст' }]}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Button htmlType="submit" loading={counterNoticeMutation.isPending} size="small">
                    Зафиксировать встречное уведомление
                  </Button>
                </Form>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Резолюция</h4>
                <Form
                  className={styles.form}
                  form={resolveForm}
                  layout="vertical"
                  onFinish={handleResolve}
                >
                  <Form.Item
                    label="Итог"
                    name="resolution"
                    rules={[{ required: true, message: 'Выберите резолюцию' }]}
                  >
                    <Select options={RESOLUTION_OPTIONS} />
                  </Form.Item>
                  <Form.Item
                    label="Комментарий"
                    name="resolutionNotesRu"
                    rules={[{ required: true, message: 'Опишите принятое решение' }]}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Popconfirm
                    cancelText="Отмена"
                    okText="Резолвить"
                    onConfirm={() => resolveForm.submit()}
                    title="Закрыть претензию и снять все активные блокировки?"
                  >
                    <Button danger loading={resolveMutation.isPending} size="small">
                      Резолвить претензию
                    </Button>
                  </Popconfirm>
                </Form>
              </section>
            </>
          )}

          {claim.resolution && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Итог</h4>
              <dl className={styles.definitionList}>
                <dt>Резолюция</dt>
                <dd>{CLAIM_RESOLUTION_LABELS[claim.resolution]}</dd>
                <dt>Комментарий</dt>
                <dd>{claim.resolutionNotesRu ?? '—'}</dd>
                <dt>Закрыта</dt>
                <dd>{formatClaimDateTime(claim.resolvedAt)}</dd>
              </dl>
            </section>
          )}

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>История событий</h4>
            <ol className={styles.timeline}>
              {claim.events.map((event) => (
                <li className={styles.timelineItem} key={event.id}>
                  <span className={styles.timelineDate}>
                    {formatClaimDateTime(event.createdAt)}
                  </span>
                  <span className={styles.timelineLabel}>
                    {CLAIM_EVENT_LABELS[event.eventType]}
                  </span>
                  {event.previousStatus && event.currentStatus && (
                    <span className={styles.muted}>
                      {CLAIM_STATUS_LABELS[event.previousStatus]} →{' '}
                      {CLAIM_STATUS_LABELS[event.currentStatus]}
                    </span>
                  )}
                  {event.notesRu && <span className={styles.muted}>{event.notesRu}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Drawer>
  );
};
