import type { FC } from 'react';
import { useState } from 'react';
import { Input } from 'antd';
import { Modal } from '@/components/common/Modal';
import styles from './ImportAuthorModal.module.scss';

interface ImportAuthorModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onImport: (jsonData: string) => void;
}

export const ImportAuthorModal: FC<ImportAuthorModalProps> = ({ isOpen, onCancel, onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    if (!jsonText.trim()) {
      setError('Please paste JSON data first.');
      return;
    }

    try {
      // Validate JSON format
      JSON.parse(jsonText);
    } catch (e) {
      setError('Invalid JSON format. Please check the structure.');
      return;
    }

    try {
      onImport(jsonText);
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
      title="Import Author Data (5 Languages)"
      confirmText="Import"
      confirmVariant="primary"
      isConfirmDisabled={!jsonText.trim()}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      size="lg"
    >
      <div className={styles.container}>
        <p className={styles.description}>
          Paste the JSON containing author biography, details, and translations for up to 5
          languages.
        </p>
        <Input.TextArea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`{\n  "birthDate": "1854-10-16",\n  "deathDate": "1900-11-30",\n  "translations": {\n    "en": {\n      "name": "Oscar Wilde",\n      "slug": "oscar-wilde",\n      "biography": "Oscar Wilde was an Irish poet...",\n      "seo": {\n        "metaTitle": "Oscar Wilde Biography",\n        "metaDescription": "Read about Oscar Wilde..."\n      }\n    }\n  }\n}`}
          className={styles.textarea}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
};
