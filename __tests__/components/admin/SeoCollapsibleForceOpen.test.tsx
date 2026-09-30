import type { FC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { SeoOpenGraphSection, SeoTechnicalSection } from '@/components/admin/common/SeoSections';
import { SeoCollapsible } from '@/components/admin/common/SeoSections/ui/SeoCollapsible';

// `T75`: ошибка проверки адреса лежит в свёрнутой секции SEO — без раскрытия отказ формы
// выглядит как кнопка «Сохранить», которая ничего не делает.
describe('SeoCollapsible forceOpen (T75)', () => {
  it('закрыта по умолчанию', () => {
    const { container } = render(<SeoCollapsible title="Technical SEO">x</SeoCollapsible>);
    expect(container.querySelector('details')?.open).toBe(false);
  });

  it('раскрывается, когда внутри ошибка, и не закрывается, когда ошибка ушла', () => {
    const { container, rerender } = render(
      <SeoCollapsible title="Technical SEO">x</SeoCollapsible>
    );
    rerender(
      <SeoCollapsible forceOpen title="Technical SEO">
        x
      </SeoCollapsible>
    );
    expect(container.querySelector('details')?.open).toBe(true);

    // Ошибка пропадает на первом годном символе — секция с полем в фокусе остаётся открытой.
    rerender(<SeoCollapsible title="Technical SEO">x</SeoCollapsible>);
    expect(container.querySelector('details')?.open).toBe(true);
  });
});

interface SeoForm {
  seoCanonicalUrl: string;
  seoRobots: string;
  seoOgTitle: string;
  seoOgDescription: string;
  seoOgImageUrl: string;
  seoOgImageAlt: string;
  slug: string;
  language: string;
}

const Harness: FC<{ errors: FieldErrors<SeoForm> }> = ({ errors }) => {
  const { register, control, watch, setValue } = useForm<SeoForm>();
  return (
    <>
      <SeoTechnicalSection<SeoForm>
        canonicalUrlField="seoCanonicalUrl"
        control={control}
        errors={errors}
        isSubmitting={false}
        languageField="language"
        register={register}
        robotsField="seoRobots"
        setValue={setValue}
        slugField="slug"
        styles={{}}
        watch={watch}
      />
      <SeoOpenGraphSection<SeoForm>
        control={control}
        errors={errors}
        isSubmitting={false}
        ogDescriptionField="seoOgDescription"
        ogImageAltField="seoOgImageAlt"
        ogImageUrlField="seoOgImageUrl"
        ogTitleField="seoOgTitle"
        register={register}
        styles={{}}
        watch={watch}
      />
    </>
  );
};

const openBySummary = (container: HTMLElement) =>
  Object.fromEntries(
    [...container.querySelectorAll('details')].map((details) => [
      details.querySelector('summary')?.textContent ?? '',
      details.open,
    ])
  );

const renderHarness = (errors: FieldErrors<SeoForm>) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness errors={errors} />
    </QueryClientProvider>
  );

describe('секции SEO раскрываются по ошибке своего поля (T75)', () => {
  const error = { type: 'custom', message: 'Must be an absolute http(s) URL' };

  it('без ошибок обе секции закрыты', () => {
    const { container } = renderHarness({});
    expect(openBySummary(container)).toEqual({
      'Technical SEO (required)': false,
      'Open Graph - Social Media (Facebook, LinkedIn) (required)': false,
    });
  });

  it('ошибка canonical раскрывает Technical SEO', () => {
    const { container } = renderHarness({ seoCanonicalUrl: error });
    expect(openBySummary(container)).toEqual({
      'Technical SEO (required)': true,
      'Open Graph - Social Media (Facebook, LinkedIn) (required)': false,
    });
  });

  it.each(['seoOgImageUrl', 'seoOgTitle', 'seoOgDescription', 'seoOgImageAlt'] as const)(
    'ошибка %s раскрывает Open Graph',
    (field) => {
      const { container } = renderHarness({ [field]: error });
      expect(openBySummary(container)).toEqual({
        'Technical SEO (required)': false,
        'Open Graph - Social Media (Facebook, LinkedIn) (required)': true,
      });
    }
  );
});
