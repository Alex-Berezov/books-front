'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { Input } from 'antd';
import { Modal } from '@/components/common/Modal';
import styles from './ImportJsonModal.module.scss';

interface ImportJsonModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onImport: (jsonData: string) => Promise<void>;
  isLoading: boolean;
  title: string;
  description: string;
  placeholder?: string;
}

export const ImportJsonModal: FC<ImportJsonModalProps> = ({
  isOpen,
  onCancel,
  onImport,
  isLoading,
  title,
  description,
  placeholder,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    if (!jsonText.trim()) {
      setError('Please paste JSON data first.');
      return;
    }

    try {
      JSON.parse(jsonText);
    } catch (e) {
      setError('Invalid JSON format. Please check the structure.');
      return;
    }
    try {
      await onImport(jsonText);
      setJsonText('');
      onCancel();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.';
      setError(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      confirmText={isLoading ? 'Importing...' : 'Import'}
      confirmVariant="primary"
      isConfirmDisabled={isLoading || !jsonText.trim()}
      isLoading={isLoading}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      size="lg"
    >
      <div className={styles.container}>
        <p className={styles.description}>{description}</p>
        <Input.TextArea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className={styles.textarea}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
};
