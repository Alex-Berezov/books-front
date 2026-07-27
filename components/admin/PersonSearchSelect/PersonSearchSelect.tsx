import type { FC } from 'react';
import { useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Tag } from 'antd';
import { UserPlus } from 'lucide-react';
import { useCreatePerson, usePersons } from '@/api/hooks/usePersons';
import type { CreatePersonPayload, Person } from '@/types/contributors';
import styles from './PersonSearchSelect.module.scss';

export interface PersonSearchSelectProps {
  value?: string;
  onChange?: (personId: string, person?: Person) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PersonSearchSelect: FC<PersonSearchSelectProps> = ({
  value,
  onChange,
  placeholder = 'Поиск по имени или authority ID...',
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<CreatePersonPayload>();

  const { data, isLoading } = usePersons({ q: searchTerm || undefined, limit: 30 });
  const createPersonMutation = useCreatePerson();

  const handleSelect = (selectedId: string) => {
    const person = data?.items.find((p) => p.id === selectedId);
    if (onChange) {
      onChange(selectedId, person);
    }
  };

  const handleCreateSubmit = async (values: CreatePersonPayload) => {
    try {
      const created = await createPersonMutation.mutateAsync(values);
      setIsModalOpen(false);
      form.resetFields();
      if (onChange) {
        onChange(created.id, created);
      }
    } catch {
      // Error handled by query
    }
  };

  return (
    <div className={styles.container}>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          showSearch
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          filterOption={false}
          onSearch={(val) => setSearchTerm(val)}
          onChange={handleSelect}
          loading={isLoading}
          style={{ width: '100%' }}
          options={data?.items.map((person) => ({
            value: person.id,
            label: (
              <div className={styles.optionLabel}>
                <div className={styles.optionHeader}>
                  <span className={styles.optionTitle}>{person.canonicalName}</span>
                  {(person.birthYear || person.deathYear) && (
                    <span className={styles.optionMeta}>
                      ({person.birthYear ?? '?'} – {person.deathYear ?? '?'})
                    </span>
                  )}
                  {person.nationalityCountryCode && (
                    <Tag style={{ fontSize: 10 }}>{person.nationalityCountryCode}</Tag>
                  )}
                </div>
                <div className={styles.authorities}>
                  {person.wikidataId && (
                    <span className={styles.authorityTag}>WD: {person.wikidataId}</span>
                  )}
                  {person.viafId && (
                    <span className={styles.authorityTag}>VIAF: {person.viafId}</span>
                  )}
                  {person.gutenbergAgentId && (
                    <span className={styles.authorityTag}>
                      Gutenberg: {person.gutenbergAgentId}
                    </span>
                  )}
                </div>
              </div>
            ),
          }))}
        />
        <Button
          icon={<UserPlus size={16} />}
          onClick={() => setIsModalOpen(true)}
          disabled={disabled}
          title="Создать персону"
        />
      </Space.Compact>

      <Modal
        title="Создание персоны (Person)"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createPersonMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Form.Item
            name="canonicalName"
            label="Каноническое имя"
            rules={[{ required: true, message: 'Введите имя персоны' }]}
          >
            <Input placeholder="Например: Mark Twain" />
          </Form.Item>
          <Form.Item name="sortName" label="Имя для сортировки">
            <Input placeholder="Например: Twain, Mark" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="birthYear" label="Год рождения">
              <Input type="number" placeholder="1835" />
            </Form.Item>
            <Form.Item name="deathYear" label="Год смерти">
              <Input type="number" placeholder="1910" />
            </Form.Item>
            <Form.Item name="nationalityCountryCode" label="Код страны (ISO)">
              <Input placeholder="US" maxLength={2} />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="wikidataId" label="Wikidata ID">
              <Input placeholder="Q7245" />
            </Form.Item>
            <Form.Item name="viafId" label="VIAF ID">
              <Input placeholder="505050" />
            </Form.Item>
            <Form.Item name="gutenbergAgentId" label="Gutenberg Agent ID">
              <Input placeholder="53" />
            </Form.Item>
          </Space>
          <Form.Item name="notesRu" label="Заметки (рус)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
