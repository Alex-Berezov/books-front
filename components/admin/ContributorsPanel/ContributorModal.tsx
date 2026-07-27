import { useEffect } from 'react';
import type { FC } from 'react';
import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { useCreateContributor, useContributors } from '@/api/hooks/useContributors';
import type {
  Contributor,
  ContributorIdentityConfidence,
  ContributorRole,
} from '@/types/contributors';

interface ContributorModalProps {
  open: boolean;
  onClose: () => void;
  onSelectContributor: (
    contributorId: string,
    role: ContributorRole,
    creditedName?: string
  ) => void;
}

const ROLE_OPTIONS: { label: string; value: ContributorRole }[] = [
  { label: 'Автор (Author)', value: 'AUTHOR' },
  { label: 'Переводчик (Translator)', value: 'TRANSLATOR' },
  { label: 'Редактор (Editor)', value: 'EDITOR' },
  { label: 'Иллюстратор (Illustrator)', value: 'ILLUSTRATOR' },
  { label: 'Диктор / Чтец (Narrator)', value: 'NARRATOR' },
  { label: 'Адаптер (Adapter)', value: 'ADAPTER' },
  { label: 'Составитель (Compiler)', value: 'COMPILER' },
  { label: 'Автор комментариев (Commentator)', value: 'COMMENTATOR' },
  { label: 'Автор предисловия (Introduction Author)', value: 'INTRODUCTION_AUTHOR' },
  { label: 'Автор послесловия (Afterword Author)', value: 'AFTERWORD_AUTHOR' },
  { label: 'Художник обложки (Cover Artist)', value: 'COVER_ARTIST' },
  { label: 'Правообладатель (Rights Holder)', value: 'RIGHTS_HOLDER' },
  { label: 'Другое (Other)', value: 'OTHER' },
];

const CONFIDENCE_OPTIONS: { label: string; value: ContributorIdentityConfidence }[] = [
  { label: 'Confirmed (Подтверждено)', value: 'CONFIRMED' },
  { label: 'Probable (Вероятно)', value: 'PROBABLE' },
  { label: 'Uncertain (Сомнительно)', value: 'UNCERTAIN' },
  { label: 'Unknown (Неизвестно)', value: 'UNKNOWN' },
];

export const ContributorModal: FC<ContributorModalProps> = ({
  open,
  onClose,
  onSelectContributor,
}) => {
  const [form] = Form.useForm();
  const { data: existingContributors, isLoading } = useContributors({ limit: 100 });
  const createMutation = useCreateContributor();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    try {
      let contributorId = values.existingContributorId as string | undefined;

      if (!contributorId) {
        const created = await createMutation.mutateAsync({
          displayName: values.displayName as string,
          originalName: (values.originalName as string) || undefined,
          birthYear: (values.birthYear as number) || undefined,
          deathYear: (values.deathYear as number) || undefined,
          nationalityCountry: (values.nationalityCountry as string) || undefined,
          pseudonym: (values.pseudonym as string) || undefined,
          viafId: (values.viafId as string) || undefined,
          locAuthorityId: (values.locAuthorityId as string) || undefined,
          identityConfidence:
            (values.identityConfidence as ContributorIdentityConfidence) || 'CONFIRMED',
          notesRu: (values.notesRu as string) || undefined,
        });
        contributorId = created.id;
      }

      onSelectContributor(
        contributorId,
        values.role as ContributorRole,
        (values.creditedName as string) || undefined
      );
      message.success('Участник успешно добавлен');
      onClose();
    } catch {
      message.error('Ошибка при сохранении участника');
    }
  };

  return (
    <Modal
      title="Добавить участника (Contributor / Person)"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createMutation.isPending}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ role: 'AUTHOR', identityConfidence: 'CONFIRMED' }}
      >
        <Form.Item label="Выбрать существующего участника" name="existingContributorId">
          <Select
            allowClear
            placeholder="Выберите из каталога участников"
            loading={isLoading}
            options={(existingContributors?.items ?? []).map((c: Contributor) => ({
              label: `${c.displayName} ${c.birthYear ? `(${c.birthYear}–${c.deathYear ?? ''})` : ''}`,
              value: c.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.existingContributorId !== currentValues.existingContributorId
          }
        >
          {({ getFieldValue }) =>
            !getFieldValue('existingContributorId') ? (
              <>
                <Form.Item
                  label="Отображаемое имя *"
                  name="displayName"
                  rules={[{ required: true, message: 'Укажите имя' }]}
                >
                  <Input placeholder="Например: Alexander Pope" />
                </Form.Item>

                <Form.Item label="Имя на языке оригинала" name="originalName">
                  <Input placeholder="Например: Alexander Pope" />
                </Form.Item>

                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item label="Год рождения" name="birthYear" style={{ flex: 1 }}>
                    <InputNumber style={{ width: '100%' }} placeholder="1688" />
                  </Form.Item>
                  <Form.Item label="Год смерти" name="deathYear" style={{ flex: 1 }}>
                    <InputNumber style={{ width: '100%' }} placeholder="1744" />
                  </Form.Item>
                  <Form.Item label="Страна (ISO)" name="nationalityCountry" style={{ flex: 1 }}>
                    <Input placeholder="GB" maxLength={2} />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item label="VIAF ID" name="viafId" style={{ flex: 1 }}>
                    <Input placeholder="e.g. 24606633" />
                  </Form.Item>
                  <Form.Item label="LoC Authority ID" name="locAuthorityId" style={{ flex: 1 }}>
                    <Input placeholder="e.g. n79084022" />
                  </Form.Item>
                </div>

                <Form.Item label="Уверенность идентификации" name="identityConfidence">
                  <Select options={CONFIDENCE_OPTIONS} />
                </Form.Item>
              </>
            ) : null
          }
        </Form.Item>

        <Form.Item
          label="Роль участника в издании/компоненте *"
          name="role"
          rules={[{ required: true, message: 'Выберите роль' }]}
        >
          <Select options={ROLE_OPTIONS} />
        </Form.Item>

        <Form.Item label="Имя, как указано в источнике (Credited Name)" name="creditedName">
          <Input placeholder="Например: A. Pope" />
        </Form.Item>

        <Form.Item label="Примечания (RU)" name="notesRu">
          <Input.TextArea rows={2} placeholder="Дополнительные сведения..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
