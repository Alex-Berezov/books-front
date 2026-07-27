import { useEffect } from 'react';
import type { FC } from 'react';
import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { useCreateContributor, useContributors } from '@/api/hooks/useContributors';
import type { Contributor, ContributorRole } from '@/types/contributors';
import styles from './ContributorModal.module.scss';

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
          birthYear: (values.birthYear as number) || undefined,
          deathYear: (values.deathYear as number) || undefined,
          nationalityCountry: (values.nationalityCountry as string) || undefined,
          wikidataId: (values.wikidataId as string) || undefined,
          viafId: (values.viafId as string) || undefined,
          isni: (values.isni as string) || undefined,
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
        initialValues={{ role: 'AUTHOR' }}
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

                <div className={styles.fieldRow}>
                  <Form.Item label="Год рождения" name="birthYear" className={styles.fieldRowItem}>
                    <InputNumber className={styles.fullWidth} placeholder="1688" />
                  </Form.Item>
                  <Form.Item label="Год смерти" name="deathYear" className={styles.fieldRowItem}>
                    <InputNumber className={styles.fullWidth} placeholder="1744" />
                  </Form.Item>
                  <Form.Item
                    label="Страна (ISO)"
                    name="nationalityCountry"
                    className={styles.fieldRowItem}
                  >
                    <Input placeholder="GB" maxLength={2} />
                  </Form.Item>
                </div>

                <div className={styles.fieldRow}>
                  <Form.Item label="VIAF ID" name="viafId" className={styles.fieldRowItem}>
                    <Input placeholder="e.g. 24606633" />
                  </Form.Item>
                  <Form.Item label="Wikidata ID" name="wikidataId" className={styles.fieldRowItem}>
                    <Input placeholder="e.g. Q7245" />
                  </Form.Item>
                  <Form.Item label="ISNI" name="isni" className={styles.fieldRowItem}>
                    <Input placeholder="e.g. 0000000121174572" />
                  </Form.Item>
                </div>
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
