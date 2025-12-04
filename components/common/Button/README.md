# Button Component

Обёртка над antd Button с расширенным API для проекта Bibliaris.

## Установка

Компонент уже интегрирован в проект. Импортируйте его:

```tsx
import { Button } from '@/components/common/Button';
```

## API

### Props

| Prop        | Type                                                                                  | Default     | Description                      |
| ----------- | ------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| `variant`   | `'primary' \| 'secondary' \| 'danger' \| 'success' \| 'warning' \| 'ghost' \| 'link'` | `'primary'` | Визуальный стиль кнопки          |
| `size`      | `'sm' \| 'md' \| 'lg'`                                                                | `'md'`      | Размер кнопки                    |
| `shape`     | `'default' \| 'round' \| 'circle'`                                                    | `'default'` | Форма кнопки                     |
| `fullWidth` | `boolean`                                                                             | `false`     | Растягивает кнопку на всю ширину |
| `loading`   | `boolean`                                                                             | `false`     | Состояние загрузки               |
| `active`    | `boolean`                                                                             | `false`     | Активное состояние (для toggle)  |
| `leftIcon`  | `ReactNode`                                                                           | -           | Иконка слева                     |
| `rightIcon` | `ReactNode`                                                                           | -           | Иконка справа                    |
| `type`      | `'button' \| 'submit' \| 'reset'`                                                     | `'button'`  | HTML type                        |
| `form`      | `string`                                                                              | -           | ID формы для submit              |
| `ariaLabel` | `string`                                                                              | -           | Accessibility label              |
| `disabled`  | `boolean`                                                                             | `false`     | Отключена                        |

## Примеры использования

### Primary Button (Submit)

```tsx
<Button type="submit" loading={isSubmitting}>
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

| Variant     | Использование                                         | antd mapping |
| ----------- | ----------------------------------------------------- | ------------ |
| `primary`   | Главное действие (Submit, Create, Save)               | `primary`    |
| `secondary` | Вторичное действие (Cancel, Back, Preview)            | `default`    |
| `danger`    | Деструктивные действия (Delete)                       | `danger`     |
| `success`   | Позитивные действия (Publish)                         | custom       |
| `warning`   | Предупреждающие действия (Unpublish)                  | custom       |
| `ghost`     | Минималистичные кнопки (icon buttons, action buttons) | `text`       |
| `link`      | Кнопка-ссылка (Generate, inline actions)              | `link`       |

## Размеры (Sizes)

| Size | antd size | Использование                            |
| ---- | --------- | ---------------------------------------- |
| `sm` | `small`   | Компактные списки, таблицы, icon buttons |
| `md` | `middle`  | Стандартный размер (по умолчанию)        |
| `lg` | `large`   | Основные CTA кнопки                      |

## Формы (Shapes)

| Shape     | antd shape | Использование             |
| --------- | ---------- | ------------------------- |
| `default` | -          | Стандартный border-radius |
| `round`   | `round`    | Pill-style кнопки         |
| `circle`  | `circle`   | Круглые icon-only кнопки  |

## Accessibility

Компонент поддерживает:

- `aria-label` для screen readers
- Встроенный loading state с индикатором antd
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
<Button type="submit" loading={isSubmitting}>
  Save
</Button>
```
