import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { SeoBasicSection } from '@/components/admin/common/SeoSections/SeoBasicSection';

// Wrapper component to provide React Hook Form context
const TestWrapper = () => {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      metaTitle: 'Initial Title',
      metaDescription: 'Initial Description',
    },
  });

  return (
    <SeoBasicSection
      register={register}
      watch={watch}
      errors={errors}
      isSubmitting={false}
      metaTitleField="metaTitle"
      metaDescriptionField="metaDescription"
      styles={{}}
    />
  );
};

describe('SeoBasicSection', () => {
  it('renders title and description fields', () => {
    render(<TestWrapper />);

    expect(screen.getByLabelText(/meta title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meta description/i)).toBeInTheDocument();
  });

  it('displays character counter', () => {
    render(<TestWrapper />);

    // Initial title length is 13 ("Initial Title")
    expect(screen.getByText('13 / 60')).toBeInTheDocument();

    // Initial description length is 19 ("Initial Description")
    expect(screen.getByText('19 / 160')).toBeInTheDocument();
  });
});
