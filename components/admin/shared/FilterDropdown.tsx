import type { FC } from 'react';
import { Select } from '@/components/common/Select';
import type { SelectOption } from '@/components/common/Select/Select.types';

interface FilterDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const FilterDropdown: FC<FilterDropdownProps> = (props) => {
  const { options, value, onChange, placeholder, className } = props;

  const handleChange = (val: string | string[]) => {
    if (typeof val === 'string') {
      onChange(val);
    }
  };

  return (
    <Select
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      size="md"
    />
  );
};
