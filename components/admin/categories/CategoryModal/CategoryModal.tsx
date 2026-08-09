'use client';

import { useEffect, type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select as AntdSelect } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { checkCategorySlugUniqueness } from '@/api/endpoints/slug-validation';
import { useCreateCategory, useUpdateCategory, useCategoriesTree } from '@/api/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { SlugInput } from '@/components/common/SlugInput';
import { getTaxonomyVisibilityStatus } from '@/lib/seo/taxonomy-visibility-status';
import { generateSlug } from '@/lib/utils/slug';
import styles from './CategoryModal.module.scss';
import {
  categorySchema,
  type CategoryFormData,
  type CategoryModalProps,
} from './CategoryModal.types';

export const CategoryModal: FC<CategoryModalProps> = (props) => {
  const { isOpen, onClose, category, initialParentId, type } = props;
  const isEditMode = !!category;
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      key: '',
      parentId: initialParentId || null,
      type,
      indexable: true,
      isVisible: true,
    },
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: categoriesTree } = useCategoriesTree(type);

  // Reset form when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
          slug: category.slug,
          key: category.key,
          parentId: category.parentId || null,
          type,
          // `?? true` повторяет бэкенд: колонки nullable, и отсутствующее
          // значение там читается как «разрешено» (`item.indexable ?? true`).
          indexable: category.indexable ?? true,
          isVisible: category.isVisible ?? true,
        });
      } else {
        reset({
          name: '',
          slug: '',
          key: '',
          parentId: initialParentId || null,
          type,
          indexable: true,
          isVisible: true,
        });
      }
    }
  }, [isOpen, category, initialParentId, reset, type]);

  // Auto-generate key from slug when creating
  const watchedSlug = watch('slug');
  useEffect(() => {
    if (!isEditMode && watchedSlug) {
      const currentKey = watch('key');
      if (!currentKey) {
        setValue('key', generateSlug(watchedSlug));
      }
    }
  }, [watchedSlug, isEditMode, setValue, watch]);

  // Считается по **текущим** значениям формы, а не по сохранённым: строка должна
  // отвечать на вопрос «что будет после сохранения», иначе редактор снимет
  // галочку и увидит прежнее состояние, которое к моменту чтения уже неверно.
  // Автоматическая часть (`autoIndexable`, `langBookCount`) приходит из дерева и
  // редактированию не подлежит вовсе.
  const status = getTaxonomyVisibilityStatus({
    isVisible: watch('isVisible'),
    indexable: watch('indexable'),
    autoIndexable: category?.autoIndexable,
    langBookCount: category?.langBookCount,
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Validate slug uniqueness
      const slugCheck = await checkCategorySlugUniqueness(data.slug, category?.id);
      if (!slugCheck.isUnique) {
        setError('slug', {
          type: 'manual',
          message: `Slug is already taken. Suggested: ${slugCheck.suggestedSlug}`,
        });
        return;
      }

      if (isEditMode && category) {
        // Слаг снова отправляется: с 09.08.2026 его смена оставляет 308 со старого
        // адреса (LEGACY-062).
        //
        // 🔴 `key` при этом передаётся **всегда и явно**. В сервисе ветка
        // `dto.key ?? dto.slug` делает слаг ключом, когда `key` не пришёл, — то есть
        // форма, потерявшая это поле, молча переписала бы опорный `key` слагом
        // (LEGACY-068). Пока слаг не отправлялся, ловушка была недостижима; теперь
        // единственное, что её держит, — эта строка.
        const { name, slug, key, parentId, type: formType, indexable, isVisible } = data;
        await updateMutation.mutateAsync({
          id: category.id,
          data: { name, slug, key, parentId, type: formType, indexable, isVisible },
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Flatten categories tree for select options
  // This is a simplified version, ideally we should show hierarchy
  const getCategoryOptions = () => {
    if (!categoriesTree) return [];

    const options: { label: string; value: string }[] = [];

    const traverse = (nodes: typeof categoriesTree, depth = 0) => {
      nodes.forEach((node) => {
        // Don't allow selecting itself as parent
        if (category && node.id === category.id) return;

        options.push({
          label: `${'-'.repeat(depth)} ${node.name}`,
          value: node.id,
        });

        if (node.children) {
          traverse(node.children, depth + 1);
        }
      });
    };

    traverse(categoriesTree);
    return options;
  };

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={isEditMode ? 'Edit Category' : 'Create Category'}
      showFooter={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-name-input">
            Name
          </label>
          <Input
            id="category-name-input"
            {...register('name')}
            error={!!errors.name}
            placeholder="e.g. Fantasy"
          />
          {errors.name?.message && (
            <span className={styles.errorMessage}>{errors.name.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-slug-input">
            Slug
          </label>
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <SlugInput
                id="category-slug-input"
                value={field.value}
                onChange={field.onChange}
                error={errors.slug?.message}
                sourceValue={watch('name')}
                entityType="category"
                // Без него встроенная проверка сравнивает слаг редактируемой записи
                // с ней же самой и сообщает «занят» (LEGACY-061). Ручная проверка в
                // `onSubmit` id передавала правильно — расхождение и маскировало дефект.
                excludeId={category?.id}
                mode={isEditMode ? 'edit' : 'create'}
                // Разблокировано 09.08.2026: `SlugRedirect` появился, и смена слага
                // теперь оставляет 308 со старого адреса (LEGACY-062). До этого поле
                // было заперто, потому что правка молча удаляла проиндексированный URL.
                //
                // ⚠️ Автогенерация из имени при этом по-прежнему выключена (`mode="edit"`):
                // редирект делает смену слага восстановимой, но не бесплатной, и она
                // должна оставаться осознанным действием, а не побочным эффектом
                // переименования.
                // We handle validation manually in onSubmit for now
              />
            )}
          />
          {isEditMode && (
            <span className={styles.hint}>
              This slug is a published URL. Changing it keeps the old address working — visitors and
              search engines are redirected (308) — but the old URL stays a redirect forever, so
              change it only when it is worth it.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-key-input">
            Key
          </label>
          <Input
            id="category-key-input"
            {...register('key')}
            error={!!errors.key}
            placeholder="e.g. classic-literature"
            // Ключ задаётся один раз при создании и дальше неизменяем: по нему
            // связывает JSON-импорт, и уехавший ключ даёт не ошибку, а дубликат
            // термина (LEGACY-068). Бэкенд отвергает смену сам — это поле лишь
            // перестаёт обещать то, чего сделать нельзя.
            //
            // ⚠️ `readOnly`, а не `disabled`: react-hook-form исключает
            // disabled-поля из данных формы, а `key` в схеме обязателен — форма
            // перестала бы сохраняться вовсе.
            readOnly={isEditMode}
          />
          {errors.key?.message && <span className={styles.errorMessage}>{errors.key.message}</span>}
          {isEditMode && (
            <span className={styles.hint}>
              The key is the term&apos;s permanent identifier — imports and links resolve by it. It
              cannot be changed after creation.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-parent-select">
            Parent Category (Optional)
          </label>
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <AntdSelect
                showSearch
                id="category-parent-select"
                placeholder="Select parent category"
                optionFilterProp="label"
                style={{ width: '100%' }}
                size="large"
                value={field.value || undefined}
                onChange={(val) => field.onChange(val || null)}
                onBlur={field.onBlur}
                options={[{ label: 'None', value: '' }, ...getCategoryOptions()]}
                status={errors.parentId ? 'error' : undefined}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            )}
          />
          {errors.parentId?.message && (
            <span className={styles.errorMessage}>{errors.parentId.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-visible-checkbox">
            Visible
          </label>
          <Controller
            name="isVisible"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="category-visible-checkbox"
                checked={field.value ?? true}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <span className={styles.hint}>
            Show in public lists. Unticking also makes the term&apos;s page answer noindex — hiding
            is the stronger of the two switches.
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-indexable-checkbox">
            Indexable
          </label>
          <Controller
            name="indexable"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="category-indexable-checkbox"
                checked={field.value ?? true}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <span className={styles.hint}>
            Allow search engines to index the term&apos;s page. Both switches can only close a term,
            never open one: a term with too few books stays out of the index whatever is ticked
            here.
          </span>
        </div>

        {isEditMode && (
          <div className={styles.field}>
            <span className={styles.label}>After saving</span>
            <span className={styles.hint}>
              <strong>{status.label}</strong> — {status.detail}
            </span>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEditMode ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
