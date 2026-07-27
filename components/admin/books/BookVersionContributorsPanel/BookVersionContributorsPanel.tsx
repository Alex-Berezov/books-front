import type { FC } from 'react';
import { useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Switch, Tag } from 'antd';
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2, Users } from 'lucide-react';
import {
  useAddBookVersionContributor,
  useBookVersionContributors,
  useRemoveBookVersionContributor,
  useReorderBookVersionContributors,
  useUpdateBookVersionContributor,
} from '@/api/hooks/useBookVersionContributors';
import { PersonSearchSelect } from '@/components/admin/PersonSearchSelect/PersonSearchSelect';
import type { BookVersionContributor, ContributorRole } from '@/types/contributors';
import styles from './BookVersionContributorsPanel.module.scss';

interface BookVersionContributorsPanelProps {
  versionId: string;
  readOnly?: boolean;
}

const ROLE_OPTIONS: { label: string; value: ContributorRole }[] = [
  { label: 'Автор (Author)', value: 'AUTHOR' },
  { label: 'Переводчик (Translator)', value: 'TRANSLATOR' },
  { label: 'Диктор / Чтец (Narrator)', value: 'NARRATOR' },
  { label: 'Редактор (Editor)', value: 'EDITOR' },
  { label: 'Иллюстратор (Illustrator)', value: 'ILLUSTRATOR' },
  { label: 'Адаптер (Adapter)', value: 'ADAPTER' },
  { label: 'Составитель (Compiler)', value: 'COMPILER' },
  { label: 'Автор комментариев (Commentator)', value: 'COMMENTATOR' },
  { label: 'Автор предисловия (Introduction Author)', value: 'INTRODUCTION_AUTHOR' },
  { label: 'Автор послесловия (Afterword Author)', value: 'AFTERWORD_AUTHOR' },
  { label: 'Художник обложки (Cover Artist)', value: 'COVER_ARTIST' },
  { label: 'Правообладатель (Rights Holder)', value: 'RIGHTS_HOLDER' },
  { label: 'Другое (Other)', value: 'OTHER' },
];

export const BookVersionContributorsPanel: FC<BookVersionContributorsPanelProps> = ({
  versionId,
  readOnly = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContributor, setEditingContributor] = useState<BookVersionContributor | null>(null);

  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: contributors = [], isLoading } = useBookVersionContributors(versionId);
  const addMutation = useAddBookVersionContributor(versionId);
  const updateMutation = useUpdateBookVersionContributor(versionId);
  const removeMutation = useRemoveBookVersionContributor(versionId);
  const reorderMutation = useReorderBookVersionContributors(versionId);

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      await addMutation.mutateAsync({
        personId: values.personId,
        role: values.role,
        creditedName: values.creditedName || undefined,
        creditedLanguage: values.creditedLanguage || undefined,
        contributionNoteRu: values.contributionNoteRu || undefined,
        isPrimary: values.isPrimary || false,
      });
      addForm.resetFields();
      setModalOpen(false);
    } catch {
      // Form validation failure
    }
  };

  const handleStartEdit = (c: BookVersionContributor) => {
    setEditingContributor(c);
    editForm.setFieldsValue({
      role: c.role,
      isPrimary: c.isPrimary || false,
      creditedName: c.creditedName || '',
      creditedLanguage: c.creditedLanguage || '',
      contributionNoteRu: c.contributionNoteRu || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContributor) return;
    try {
      const values = await editForm.validateFields();
      await updateMutation.mutateAsync({
        contributorId: editingContributor.id,
        payload: {
          role: values.role,
          isPrimary: values.isPrimary || false,
          creditedName: values.creditedName || undefined,
          creditedLanguage: values.creditedLanguage || undefined,
          contributionNoteRu: values.contributionNoteRu || undefined,
        },
      });
      setEditingContributor(null);
    } catch {
      // Validation failed
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!contributors || contributors.length < 2) return;
    const newOrder = [...contributors];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    await reorderMutation.mutateAsync(newOrder.map((c) => c.id));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Участники и авторы версии ({contributors.length})
        </h3>
        {!readOnly && (
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

      {isLoading ? (
        <div>Загрузка участников...</div>
      ) : contributors.length === 0 ? (
        <div className={styles.empty}>Участники для данной версии пока не назначены.</div>
      ) : (
        <div className={styles.list}>
          {contributors.map((c: BookVersionContributor, index: number) => (
            <div key={c.id} className={styles.row}>
              <div className={styles.info}>
                <Tag color="blue">{c.role}</Tag>
                {c.isPrimary && (
                  <Tag color="gold" icon={<Star size={12} />}>
                    Основной
                  </Tag>
                )}
                <span className={styles.name}>
                  {c.person?.canonicalName || c.creditedName || 'Неизвестная персоналия'}
                </span>
                {c.creditedName && c.creditedName !== c.person?.canonicalName && (
                  <span className={styles.credited}>
                    (указан как: &ldquo;{c.creditedName}&rdquo;)
                  </span>
                )}
                {c.creditedLanguage && <Tag color="cyan">Язык: {c.creditedLanguage}</Tag>}
              </div>

              {!readOnly && (
                <div className={styles.actions}>
                  <Button
                    type="text"
                    size="small"
                    icon={<Pencil size={14} />}
                    onClick={() => handleStartEdit(c)}
                  />
                  <Button
                    type="text"
                    size="small"
                    disabled={index === 0}
                    icon={<ArrowUp size={14} />}
                    onClick={() => handleMove(index, 'up')}
                  />
                  <Button
                    type="text"
                    size="small"
                    disabled={index === contributors.length - 1}
                    icon={<ArrowDown size={14} />}
                    onClick={() => handleMove(index, 'down')}
                  />
                  <Popconfirm
                    title="Удалить привязку участника?"
                    onConfirm={() => removeMutation.mutate(c.id)}
                    okText="Да"
                    cancelText="Отмена"
                  >
                    <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
                  </Popconfirm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding new contributor */}
      <Modal
        title="Добавить участника версии"
        open={modalOpen}
        onOk={handleAdd}
        onCancel={() => setModalOpen(false)}
        confirmLoading={addMutation.isPending}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="personId"
            label="Персоналия (Person)"
            rules={[{ required: true, message: 'Выберите персоналию' }]}
          >
            <PersonSearchSelect placeholder="Поиск персоналии по имени или ID..." />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль участника (Role)"
            rules={[{ required: true, message: 'Выберите роль' }]}
            initialValue="AUTHOR"
          >
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item name="creditedName" label="Имя как в источнике (Credited Name, необязательно)">
            <Input placeholder="Например: Гомер / И.И. Иванов" />
          </Form.Item>

          <Form.Item
            name="creditedLanguage"
            label="Язык в источнике / Перевода (Credited Language)"
          >
            <Input placeholder="Например: en, ru, es" />
          </Form.Item>

          <Form.Item name="contributionNoteRu" label="Заметка о вкладе (на русском)">
            <Input.TextArea rows={2} placeholder="Дополнительное примечание к роли..." />
          </Form.Item>

          <Form.Item name="isPrimary" label="Основной участник" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for editing existing contributor */}
      <Modal
        title={`Редактировать участника: ${editingContributor?.person?.canonicalName || editingContributor?.creditedName || ''}`}
        open={Boolean(editingContributor)}
        onOk={handleSaveEdit}
        onCancel={() => setEditingContributor(null)}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="role"
            label="Роль участника (Role)"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item name="creditedName" label="Имя как в источнике (Credited Name)">
            <Input placeholder="Например: Гомер / И.И. Иванов" />
          </Form.Item>

          <Form.Item
            name="creditedLanguage"
            label="Язык в источнике / Перевода (Credited Language)"
          >
            <Input placeholder="Например: en, ru, es" />
          </Form.Item>

          <Form.Item name="contributionNoteRu" label="Заметка о вкладе (на русском)">
            <Input.TextArea rows={2} placeholder="Дополнительное примечание к роли..." />
          </Form.Item>

          <Form.Item name="isPrimary" label="Основной участник" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
