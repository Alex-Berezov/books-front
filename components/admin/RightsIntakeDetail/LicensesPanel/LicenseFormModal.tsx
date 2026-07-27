import { useEffect } from 'react';
import type { FC } from 'react';
import { Checkbox, Form, Input, Modal, Select, message } from 'antd';
import { useCreateRightsLicense, useUpdateRightsLicense } from '@/api/hooks/useRightsLicenses';
import type {
  CreateRightsLicenseRequest,
  RightsLicenseMediaFormat,
  RightsLicenseStatus,
  RightsLicenseSummary,
  RightsLicenseTerritoryScope,
  RightsLicenseType,
} from '@/types/api-schema/rights-licenses';
import styles from './LicenseFormModal.module.scss';

export interface LicenseFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this license instead of creating a new one. */
  license?: RightsLicenseSummary;
  /** Newly created licenses are linked to this profile right away. */
  rightsProfileId?: string;
  onCreated?: (licenseId: string) => void;
}

const TYPE_OPTIONS: { label: string; value: RightsLicenseType }[] = [
  { label: 'Прямая лицензия', value: 'DIRECT_LICENSE' },
  { label: 'Прямое разрешение', value: 'DIRECT_PERMISSION' },
  { label: 'Передача прав', value: 'RIGHTS_ASSIGNMENT' },
  { label: 'Служебное произведение', value: 'WORK_FOR_HIRE' },
  { label: 'Открытая лицензия', value: 'OPEN_LICENSE' },
  { label: 'Передача в общественное достояние', value: 'PUBLIC_DOMAIN_DEDICATION' },
  { label: 'Другое', value: 'OTHER' },
];

const STATUS_OPTIONS: { label: string; value: RightsLicenseStatus }[] = [
  { label: 'Черновик', value: 'DRAFT' },
  { label: 'Ожидает вступления в силу', value: 'PENDING' },
  { label: 'Действует', value: 'ACTIVE' },
  { label: 'Истекла', value: 'EXPIRED' },
  { label: 'Неопределённый статус', value: 'UNCERTAIN' },
  { label: 'Заменена', value: 'SUPERSEDED' },
];

const TERRITORY_OPTIONS: { label: string; value: RightsLicenseTerritoryScope }[] = [
  { label: 'Весь мир', value: 'WORLDWIDE' },
  { label: 'Список стран', value: 'COUNTRY_LIST' },
  { label: 'Все страны, кроме списка', value: 'EXCEPT_COUNTRY_LIST' },
  { label: 'Территория не определена', value: 'UNKNOWN' },
];

const MEDIA_FORMAT_OPTIONS: { label: string; value: RightsLicenseMediaFormat }[] = [
  { label: 'Текст онлайн', value: 'TEXT_ONLINE' },
  { label: 'Скачивание текста', value: 'TEXT_DOWNLOAD' },
  { label: 'Электронная книга', value: 'EBOOK' },
  { label: 'Аудиостриминг', value: 'AUDIO_STREAMING' },
  { label: 'Скачивание аудио', value: 'AUDIO_DOWNLOAD' },
  { label: 'Изображение', value: 'IMAGE' },
  { label: 'Печать', value: 'PRINT' },
  { label: 'Другое', value: 'OTHER' },
];

const LANGUAGE_OPTIONS = ['en', 'es', 'fr', 'pt', 'ru'].map((code) => ({
  label: code,
  value: code,
}));

const PERMISSION_FIELDS: { name: keyof CreateRightsLicenseRequest; label: string }[] = [
  { name: 'commercialUseAllowed', label: 'Коммерческое использование' },
  { name: 'translationAllowed', label: 'Перевод' },
  { name: 'modificationAllowed', label: 'Модификация' },
  { name: 'sublicensingAllowed', label: 'Сублицензирование' },
  { name: 'exclusive', label: 'Эксклюзивная' },
  { name: 'attributionRequired', label: 'Требуется атрибуция' },
];

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

export const LicenseFormModal: FC<LicenseFormModalProps> = ({
  open,
  onClose,
  license,
  rightsProfileId,
  onCreated,
}) => {
  const [form] = Form.useForm();
  const createMutation = useCreateRightsLicense();
  const updateMutation = useUpdateRightsLicense();
  const isEdit = Boolean(license);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (license) {
      form.setFieldsValue({
        licenseKey: license.licenseKey ?? undefined,
        licenseType: license.licenseType,
        status: license.status,
        title: license.title,
        licensor: license.licensor,
        licensee: license.licensee ?? undefined,
        rightsHolder: license.rightsHolder ?? undefined,
        referenceNumber: license.referenceNumber ?? undefined,
        effectiveFrom: license.effectiveFrom ? license.effectiveFrom.slice(0, 10) : undefined,
        expiresAt: license.expiresAt ? license.expiresAt.slice(0, 10) : undefined,
        isPerpetual: license.isPerpetual,
        territoryScope: license.territoryScope,
        countryCodes: license.countryCodes.join(', '),
        excludedCountryCodes: license.excludedCountryCodes.join(', '),
        languageCodes: license.languageCodes,
        mediaFormats: license.mediaFormats,
        commercialUseAllowed: license.commercialUseAllowed,
        modificationAllowed: license.modificationAllowed,
        translationAllowed: license.translationAllowed,
        sublicensingAllowed: license.sublicensingAllowed,
        attributionRequired: license.attributionRequired,
        requiredAttributionText: license.requiredAttributionText ?? undefined,
        exclusive: license.exclusive,
      });
    }
  }, [open, license, form]);

  const buildPayload = (values: Record<string, unknown>): CreateRightsLicenseRequest => ({
    licenseKey: emptyToUndefined(values.licenseKey),
    licenseType: values.licenseType as RightsLicenseType,
    status: values.status as RightsLicenseStatus,
    title: (values.title as string).trim(),
    licensor: (values.licensor as string).trim(),
    licensee: emptyToUndefined(values.licensee),
    rightsHolder: emptyToUndefined(values.rightsHolder),
    referenceNumber: emptyToUndefined(values.referenceNumber),
    effectiveFrom: emptyToUndefined(values.effectiveFrom),
    expiresAt: emptyToUndefined(values.expiresAt),
    isPerpetual: values.isPerpetual === true,
    territoryScope: values.territoryScope as RightsLicenseTerritoryScope,
    countryCodes: parseList(values.countryCodes)?.map((code) => code.toUpperCase()),
    excludedCountryCodes: parseList(values.excludedCountryCodes)?.map((code) => code.toUpperCase()),
    languageCodes: (values.languageCodes as string[] | undefined) ?? undefined,
    mediaFormats: (values.mediaFormats as RightsLicenseMediaFormat[] | undefined) ?? undefined,
    commercialUseAllowed: values.commercialUseAllowed === true,
    modificationAllowed: values.modificationAllowed === true,
    translationAllowed: values.translationAllowed === true,
    sublicensingAllowed: values.sublicensingAllowed === true,
    attributionRequired: values.attributionRequired === true,
    requiredAttributionText: emptyToUndefined(values.requiredAttributionText),
    exclusive: values.exclusive === true,
    royaltyTermsRu: emptyToUndefined(values.royaltyTermsRu),
    otherConditionsRu: emptyToUndefined(values.otherConditionsRu),
    notesRu: emptyToUndefined(values.notesRu),
    documentUrl: emptyToUndefined(values.documentUrl),
    documentSha256: emptyToUndefined(values.documentSha256),
  });

  const handleFinish = async (values: Record<string, unknown>) => {
    try {
      if (license) {
        await updateMutation.mutateAsync({ id: license.id, data: buildPayload(values) });
        message.success('Лицензия обновлена');
      } else {
        const created = await createMutation.mutateAsync(buildPayload(values));
        message.success('Лицензия создана');
        onCreated?.(created.id);
      }
      onClose();
    } catch {
      message.error('Не удалось сохранить лицензию. Проверьте сроки и территориальный охват.');
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редактировать лицензию' : 'Добавить лицензию'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={720}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          licenseType: 'DIRECT_LICENSE',
          status: 'DRAFT',
          territoryScope: 'UNKNOWN',
          isPerpetual: false,
        }}
      >
        {rightsProfileId && !isEdit && (
          <p className={styles.hint}>
            Новая лицензия будет автоматически привязана к текущему профилю прав.
          </p>
        )}

        <Form.Item
          name="title"
          label="Название"
          rules={[{ required: true, message: 'Укажите название лицензии' }]}
        >
          <Input placeholder="Лицензия на испанский перевод (Penguin, 2019)" />
        </Form.Item>

        <Form.Item
          name="licensor"
          label="Лицензиар"
          rules={[{ required: true, message: 'Укажите лицензиара' }]}
        >
          <Input placeholder="Penguin Random House" />
        </Form.Item>

        <div className={styles.row}>
          <Form.Item name="licenseType" label="Тип">
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="status" label="Статус">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </div>

        <div className={styles.row}>
          <Form.Item name="licensee" label="Лицензиат">
            <Input placeholder="Bibliaris" />
          </Form.Item>
          <Form.Item name="referenceNumber" label="Номер договора">
            <Input placeholder="PRH-2019-4471" />
          </Form.Item>
        </div>

        <Form.Item name="licenseKey" label="Ключ из отчёта агента">
          <Input placeholder="license:penguin-2019" />
        </Form.Item>

        <div className={styles.row}>
          <Form.Item name="effectiveFrom" label="Действует с (YYYY-MM-DD)">
            <Input placeholder="2019-06-01" />
          </Form.Item>
          <Form.Item name="expiresAt" label="Действует по (YYYY-MM-DD)">
            <Input placeholder="2029-06-01" />
          </Form.Item>
        </div>

        <Form.Item name="isPerpetual" valuePropName="checked">
          <Checkbox>Бессрочная (без даты окончания)</Checkbox>
        </Form.Item>

        <Form.Item name="territoryScope" label="Территориальный охват">
          <Select options={TERRITORY_OPTIONS} />
        </Form.Item>

        <div className={styles.row}>
          <Form.Item name="countryCodes" label="Страны (ISO alpha-2, через запятую)">
            <Input placeholder="ES, MX, AR" />
          </Form.Item>
          <Form.Item name="excludedCountryCodes" label="Исключённые страны">
            <Input placeholder="US" />
          </Form.Item>
        </div>

        <div className={styles.row}>
          <Form.Item name="languageCodes" label="Языки (пусто = все)">
            <Select mode="multiple" options={LANGUAGE_OPTIONS} allowClear />
          </Form.Item>
          <Form.Item name="mediaFormats" label="Форматы (пусто = все)">
            <Select mode="multiple" options={MEDIA_FORMAT_OPTIONS} allowClear />
          </Form.Item>
        </div>

        <div className={styles.permissions}>
          {PERMISSION_FIELDS.map((field) => (
            <Form.Item key={field.name} name={field.name} valuePropName="checked" noStyle>
              <Checkbox>{field.label}</Checkbox>
            </Form.Item>
          ))}
        </div>

        <Form.Item name="requiredAttributionText" label="Текст атрибуции">
          <Input placeholder="© Penguin Random House, 2019" />
        </Form.Item>

        <Form.Item name="royaltyTermsRu" label="Условия по роялти">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="otherConditionsRu" label="Прочие условия">
          <Input.TextArea rows={2} />
        </Form.Item>

        <div className={styles.row}>
          <Form.Item name="documentUrl" label="Ссылка на документ">
            <Input placeholder="https://example.org/license.pdf" />
          </Form.Item>
          <Form.Item name="documentSha256" label="SHA-256 документа">
            <Input placeholder="64 hex-символа" />
          </Form.Item>
        </div>

        <Form.Item name="notesRu" label="Заметки">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
