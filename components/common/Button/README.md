# UniversalButton Component

Универсальный переиспользуемый компонент кнопки для проекта Bibliaris.

## Установка

Компонент уже интегрирован в проект. Импортируйте его:

```tsx
import { Button } from '@/components/common/Button';
```

## API

### Props

| Prop          | Type                                                                                  | Default           | Description                      |
| ------------- | ------------------------------------------------------------------------------------- | ----------------- | -------------------------------- |
| `variant`     | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'warning' \| 'ghost' \| 'link'` | `'primary'`       | Визуальный стиль кнопки          |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                                | `'md'`            | Размер кнопки                    |
| `shape`       | `'default' \| 'round' \| 'circle'`                                                    | `'default'`       | Форма кнопки                     |
| `fullWidth`   | `boolean`                                                                             | `false`           | Растягивает кнопку на всю ширину |
| `loading`     | `boolean`                                                                             | `false`           | Состояние загрузки               |
| `loadingText` | `string`                                                                              | `'Processing...'` | Текст при загрузке               |
| `active`      | `boolean`                                                                             | `false`           | Активное состояние (для toggle)  |
| `leftIcon`    | `ReactNode`                                                                           | -                 | Иконка слева                     |
| `rightIcon`   | `ReactNode`                                                                           | -                 | Иконка справа                    |
| `type`        | `'button' \| 'submit' \| 'reset'`                                                     | `'button'`        | HTML type                        |
| `form`        | `string`                                                                              | -                 | ID формы для submit              |
| `ariaLabel`   | `string`                                                                              | -                 | Accessibility label              |
| `disabled`    | `boolean`                                                                             | `false`           | Отключена                        |

## Примеры использования

### Primary Button (Submit)

```tsx
<Button type="submit" loading={isSubmitting} loadingText="Saving...">
  Save Changes
</Button>
```

### Secondary Button с иконкой

```tsx
import { Eye } from 'lucide-react';

<Button variant="secondary" leftIcon={<Eye size={16} />}>
  Preview
</Button>;
```

### Danger Button

```tsx
<Button variant="danger" onClick={handleDelete}>
  Delete
</Button>
```

### Success Button (полная ширина)

```tsx
<Button variant="success" fullWidth>
  Publish
</Button>
```

### Warning Button

```tsx
<Button variant="warning" onClick={handleUnpublish}>
  Unpublish
</Button>
```

### Ghost Button (icon-only)

```tsx
import { Edit } from 'lucide-react';

<Button variant="ghost" size="sm" ariaLabel="Edit">
  <Edit size={16} />
</Button>;
```

### Link Button

```tsx
<Button variant="link" onClick={handleGenerate}>
  Generate
</Button>
```

### Filter Buttons с active состоянием

```tsx
<Button
  variant="secondary"
  size="sm"
  active={statusFilter === 'published'}
  onClick={() => setStatusFilter('published')}
>
  Published
</Button>
```

### Pagination Buttons

```tsx
<Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={handlePrevious}>
  ← Previous
</Button>
```

## Варианты (Variants)

| Variant     | Использование                                         |
| ----------- | ----------------------------------------------------- |
| `primary`   | Главное действие (Submit, Create, Save)               |
| `secondary` | Вторичное действие (Cancel, Back, Preview)            |
| `danger`    | Деструктивные действия (Delete)                       |
| `success`   | Позитивные действия (Publish)                         |
| `warning`   | Предупреждающие действия (Unpublish)                  |
| `ghost`     | Минималистичные кнопки (icon buttons, action buttons) |
| `link`      | Кнопка-ссылка (Generate, inline actions)              |

## Размеры (Sizes)

| Size | Использование                            |
| ---- | ---------------------------------------- |
| `sm` | Компактные списки, таблицы, icon buttons |
| `md` | Стандартный размер (по умолчанию)        |
| `lg` | Основные CTA кнопки                      |

## Формы (Shapes)

| Shape     | Использование             |
| --------- | ------------------------- |
| `default` | Стандартный border-radius |
| `round`   | Pill-style кнопки         |
| `circle`  | Круглые icon-only кнопки  |

## Accessibility

Компонент поддерживает:

- `aria-label` для screen readers
- `aria-busy` при loading state
- `aria-disabled` для disabled state
- Фокус ring для навигации с клавиатуры

## Миграция с нативных button

Замена нативного `<button>` на `<Button>`:

**До:**

```tsx
<button className={styles.submitButton} disabled={isSubmitting} type="submit">
  {isSubmitting ? 'Saving...' : 'Save'}
</button>
```

**После:**

```tsx
<Button type="submit" loading={isSubmitting} loadingText="Saving...">
  Save
</Button>
```
