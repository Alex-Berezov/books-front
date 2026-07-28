'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { Checkbox, Form, Input, Modal, Select, message } from 'antd';
import { useCreateRightsClaim, useUpdateRightsClaim } from '@/api/hooks/useRightsClaims';
import {
  CLAIMANT_TYPE_LABELS,
  CLAIM_CHANNEL_LABELS,
  CLAIM_SEVERITY_LABELS,
  CLAIM_TYPE_LABELS,
} from '@/components/admin/rights-claims/claimLabels';
import type {
  CreateRightsClaimRequest,
  RightsClaim,
  RightsClaimChannel,
  RightsClaimSeverity,
  RightsClaimType,
  RightsClaimantType,
} from '@/types/api-schema/rights-claims';
import styles from './RightsClaimFormModal.module.scss';

export interface RightsClaimFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Target version of a newly registered claim. */
  versionId: string;
  bookId: string;
  /** When set, the modal edits this claim instead of registering a new one. */
  claim?: RightsClaim;
}

const toOptions = <T extends string>(labels: Record<T, string>): { label: string; value: T }[] =>
  (Object.keys(labels) as T[]).map((value) => ({ label: labels[value], value }));

const CLAIM_TYPE_OPTIONS = toOptions<RightsClaimType>(CLAIM_TYPE_LABELS);
const SEVERITY_OPTIONS = toOptions<RightsClaimSeverity>(CLAIM_SEVERITY_LABELS);
const CHANNEL_OPTIONS = toOptions<RightsClaimChannel>(CLAIM_CHANNEL_LABELS);
const CLAIMANT_TYPE_OPTIONS = toOptions<RightsClaimantType>(CLAIMANT_TYPE_LABELS);
const LANGUAGE_OPTIONS = ['en', 'es', 'fr', 'pt', 'ru'].map((code) => ({
  label: code,
  value: code,
}));

/** Splits a comma/space separated list into trimmed non-empty items. */
const parseList = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const emptyToUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value.trim();
};

export const RightsClaimFormModal: FC<RightsClaimFormModalProps> = ({
  open,
  onClose,
  versionId,
  bookId,
  claim,
}) => {
  const [form] = Form.useForm();
  const createMutation = useCreateRightsClaim();
  const updateMutation = useUpdateRightsClaim();
  const isEdit = Boolean(claim);
  const blocksPublication = Form.useWatch('blocksPublication', form) as boolean | undefined;

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (claim) {
      form.setFieldsValue({
        claimType: claim.claimType,
        severity: claim.severity,
        channel: claim.channel,
        receivedAt: claim.receivedAt.slice(0, 10),
        deadlineAt: claim.deadlineAt ? claim.deadlineAt.slice(0, 10) : undefined,
        claimantName: claim.claimantName,
        claimantType: claim.claimantType,
        claimantOrganization: claim.claimantOrganization ?? undefined,
        claimantEmail: claim.claimantEmail ?? undefined,
        claimantPhone: claim.claimantPhone ?? undefined,
        claimantAddress: claim.claimantAddress ?? undefined,
        claimantIsAuthorized: claim.claimantIsAuthorized,
        affectedCountryCodes: claim.affectedCountryCodes.join(', '),
        affectedLanguages: claim.affectedLanguages,
        claimedWorkTitle: claim.claimedWorkTitle ?? undefined,
        claimedWorkAuthor: claim.claimedWorkAuthor ?? undefined,
        descriptionRu: claim.descriptionRu,
        claimedRightsDescriptionRu: claim.claimedRightsDescriptionRu ?? undefined,
        infringingUrls: claim.infringingUrls.join('\n'),
        originalNoticeText: claim.originalNoticeText ?? undefined,
        originalNoticeUrl: claim.originalNoticeUrl ?? undefined,
        goodFaithStatement: claim.goodFaithStatement,
        swornStatement: claim.swornStatement,
        blocksPublication: claim.blocksPublication,
        blocksPublicationOverrideReasonRu: claim.blocksPublicationOverrideReasonRu ?? undefined,
        requiresLawyerReview: claim.requiresLawyerReview,
        internalNotesRu: claim.internalNotesRu ?? undefined,
      });
    }
  }, [open, claim, form]);

  const buildPayload = (values: Record<string, unknown>): CreateRightsClaimRequest => ({
    claimType: values.claimType as RightsClaimType,
    severity: values.severity as RightsClaimSeverity,
    channel: values.channel as RightsClaimChannel,
    receivedAt: emptyToUndefined(values.receivedAt),
    deadlineAt: emptyToUndefined(values.deadlineAt),
    claimantName: (values.claimantName as string).trim(),
    claimantType: values.claimantType as RightsClaimantType,
    claimantOrganization: emptyToUndefined(values.claimantOrganization),
    claimantEmail: emptyToUndefined(values.claimantEmail),
    claimantPhone: emptyToUndefined(values.claimantPhone),
    claimantAddress: emptyToUndefined(values.claimantAddress),
    claimantIsAuthorized: values.claimantIsAuthorized === true,
    bookId,
    bookVersionId: versionId,
    affectedCountryCodes: parseList(values.affectedCountryCodes)?.map((code) => code.toUpperCase()),
    affectedLanguages: (values.affectedLanguages as string[] | undefined) ?? undefined,
    claimedWorkTitle: emptyToUndefined(values.claimedWorkTitle),
    claimedWorkAuthor: emptyToUndefined(values.claimedWorkAuthor),
    descriptionRu: (values.descriptionRu as string).trim(),
    claimedRightsDescriptionRu: emptyToUndefined(values.claimedRightsDescriptionRu),
    infringingUrls: parseList(values.infringingUrls),
    originalNoticeText: emptyToUndefined(values.originalNoticeText),
    originalNoticeUrl: emptyToUndefined(values.originalNoticeUrl),
    goodFaithStatement: values.goodFaithStatement === true,
    swornStatement: values.swornStatement === true,
    blocksPublication: values.blocksPublication !== false,
    blocksPublicationOverrideReasonRu: emptyToUndefined(values.blocksPublicationOverrideReasonRu),
    requiresLawyerReview: values.requiresLawyerReview === true,
    internalNotesRu: emptyToUndefined(values.internalNotesRu),
  });

  const handleFinish = async (values: Record<string, unknown>) => {
    try {
      if (claim) {
        await updateMutation.mutateAsync({ id: claim.id, data: buildPayload(values) });
        message.success('Претензия обновлена');
      } else {
        await createMutation.mutateAsync(buildPayload(values));
        message.success('Претензия зарегистрирована');
      }
      onClose();
    } catch {
      message.error('Не удалось сохранить претензию. Проверьте даты, страны и URL.');
    }
  };

  return (
    <Modal
      cancelText="Отмена"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      destroyOnClose
      okText="Сохранить"
      onCancel={onClose}
      onOk={() => form.submit()}
      open={open}
      title={isEdit ? 'Редактировать претензию' : 'Зарегистрировать претензию'}
      width={760}
    >
      <Form
        form={form}
        initialValues={{
          claimType: 'DMCA_TAKEDOWN',
          severity: 'MEDIUM',
          channel: 'EMAIL',
          claimantType: 'UNKNOWN',
          claimantIsAuthorized: false,
          goodFaithStatement: false,
          swornStatement: false,
          blocksPublication: true,
          requiresLawyerReview: false,
        }}
        layout="vertical"
        onFinish={handleFinish}
      >
        <div className={styles.grid}>
          <Form.Item
            label="Тип претензии"
            name="claimType"
            rules={[{ required: true, message: 'Укажите тип претензии' }]}
          >
            <Select options={CLAIM_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="Критичность" name="severity">
            <Select options={SEVERITY_OPTIONS} />
          </Form.Item>
          <Form.Item label="Канал получения" name="channel">
            <Select options={CHANNEL_OPTIONS} />
          </Form.Item>
          <Form.Item label="Дата получения" name="receivedAt">
            <Input placeholder="2026-07-28" type="date" />
          </Form.Item>
          <Form.Item label="Срок ответа" name="deadlineAt">
            <Input placeholder="2026-08-11" type="date" />
          </Form.Item>
        </div>

        <h4 className={styles.sectionTitle}>Заявитель</h4>
        <div className={styles.grid}>
          <Form.Item
            label="Имя заявителя"
            name="claimantName"
            rules={[{ required: true, message: 'Укажите имя заявителя' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Тип заявителя" name="claimantType">
            <Select options={CLAIMANT_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="Организация" name="claimantOrganization">
            <Input />
          </Form.Item>
          <Form.Item label="E-mail" name="claimantEmail">
            <Input />
          </Form.Item>
          <Form.Item label="Телефон" name="claimantPhone">
            <Input />
          </Form.Item>
        </div>
        <Form.Item label="Адрес" name="claimantAddress">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="claimantIsAuthorized" valuePropName="checked">
          <Checkbox>Заявитель подтвердил полномочия действовать от имени правообладателя</Checkbox>
        </Form.Item>

        <h4 className={styles.sectionTitle}>Предмет претензии</h4>
        <div className={styles.grid}>
          <Form.Item label="Название заявленного произведения" name="claimedWorkTitle">
            <Input />
          </Form.Item>
          <Form.Item label="Автор заявленного произведения" name="claimedWorkAuthor">
            <Input />
          </Form.Item>
          <Form.Item
            label="Затронутые страны (пусто = все)"
            name="affectedCountryCodes"
            tooltip="Двухбуквенные коды через запятую, например DE, FR"
          >
            <Input placeholder="DE, FR" />
          </Form.Item>
          <Form.Item label="Затронутые языки" name="affectedLanguages">
            <Select mode="multiple" options={LANGUAGE_OPTIONS} />
          </Form.Item>
        </div>
        <Form.Item
          label="Описание претензии"
          name="descriptionRu"
          rules={[{ required: true, message: 'Опишите суть претензии' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Заявленные права" name="claimedRightsDescriptionRu">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="URL нарушающего контента (по одному в строке)" name="infringingUrls">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Оригинальный текст уведомления" name="originalNoticeText">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Ссылка на оригинальное уведомление" name="originalNoticeUrl">
          <Input placeholder="https://…" />
        </Form.Item>
        <Form.Item name="goodFaithStatement" valuePropName="checked">
          <Checkbox>Заявление о добросовестности (good faith)</Checkbox>
        </Form.Item>
        <Form.Item name="swornStatement" valuePropName="checked">
          <Checkbox>Заявление под присягой</Checkbox>
        </Form.Item>

        <h4 className={styles.sectionTitle}>Работа с претензией</h4>
        <Form.Item name="blocksPublication" valuePropName="checked">
          <Checkbox>Претензия блокирует публикацию</Checkbox>
        </Form.Item>
        {blocksPublication === false && (
          <Form.Item
            label="Причина снятия блокировки публикации"
            name="blocksPublicationOverrideReasonRu"
            rules={[{ required: true, message: 'Укажите причину' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        )}
        <Form.Item name="requiresLawyerReview" valuePropName="checked">
          <Checkbox>Требуется юридическая проверка</Checkbox>
        </Form.Item>
        <Form.Item label="Внутренние заметки" name="internalNotesRu">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
