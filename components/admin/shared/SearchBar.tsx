import type { FC, ChangeEvent, FormEvent } from 'react';
import { Input } from '@/components/common/Input';
import styles from './SearchBar.module.scss';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: FC<SearchBarProps> = (props) => {
  const { value, onChange, onSearch, placeholder = 'Search...', className } = props;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch?.();
  };

  return (
    <form className={`${styles.searchBar} ${className || ''}`} onSubmit={handleSubmit}>
      <Input
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </form>
  );
};
