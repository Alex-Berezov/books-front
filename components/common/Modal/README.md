# Modal

Универсальный переиспользуемый компонент модального окна.

## Описание

`Modal` - это гибкий компонент модального окна для различных сценариев использования:

- ✅ **Подтверждение действий** (удаление, публикация, отмена и т.д.)
- ✅ **Отображение информации** (уведомления, детали объекта)
- ✅ **Формы ввода** (создание/редактирование данных)
- ✅ **Любой кастомный контент** через `children`

**Возможности:**

- ✅ Кастомный заголовок с кнопкой закрытия (×)
- ✅ Произвольное содержимое (через `children`)
- ✅ Настраиваемые кнопки футера (тексты и варианты стилей)
- ✅ Поддержка состояния загрузки
- ✅ Закрытие по клику на оверлей или крестик
- ✅ Плавные анимации появления/исчезновения
- ✅ Использует design tokens проекта

## Использование

### Базовый пример (подтверждение действия)

```tsx
import { useState } from 'react';
import { Modal } from '@/components/common/Modal';

export const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    // Ваша логика удаления
    console.log('Deleted!');
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Delete Item</button>

      <Modal
        isOpen={isOpen}
        title="Delete Item"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsOpen(false)}
      >
        <p>Are you sure you want to delete this item?</p>
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  );
};
```

### С состоянием загрузки (React Query)

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/common/Modal';

export const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      setIsOpen(false);
      setItemToDelete(null);
    },
  });

  const handleConfirm = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setItemToDelete('item-123');
          setIsOpen(true);
        }}
      >
        Delete Item
      </button>

      <Modal
        isOpen={isOpen}
        title="Delete Item"
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirm}
        onCancel={() => {
          setIsOpen(false);
          setItemToDelete(null);
        }}
      >
        <p>Are you sure you want to delete item {itemToDelete}?</p>
      </Modal>
    </>
  );
};
```

### Информационная модалка

```tsx
<Modal
  isOpen={isOpen}
  title="User Details"
  confirmText="OK"
  cancelText="Close"
  confirmVariant="primary"
  onConfirm={() => setIsOpen(false)}
  onCancel={() => setIsOpen(false)}
>
  <div>
    <p><strong>Name:</strong> John Doe</p>
    <p><strong>Email:</strong> john@example.com</p>
    <p><strong>Role:</strong> Administrator</p>
  </div>
</Modal>
```

### Различные варианты кнопок

```tsx
// Удаление (красная кнопка)
<Modal
  confirmVariant="danger"
  confirmText="Delete"
  title="Delete Item"
  {...props}
>
  <p>This will permanently delete the item.</p>
</Modal>

// Публикация (зеленая кнопка)
<Modal
  confirmVariant="success"
  confirmText="Publish"
  title="Publish Page"
  {...props}
>
  <p>This page will be visible to all users.</p>
</Modal>

// Предупреждение (оранжевая кнопка)
<Modal
  confirmVariant="warning"
  confirmText="Proceed"
  title="Warning"
  {...props}
>
  <p>This action may have unexpected consequences.</p>
</Modal>

// Стандартное действие (синяя кнопка)
<Modal
  confirmVariant="primary"
  confirmText="Confirm"
  title="Confirm Action"
  {...props}
>
  <p>Please confirm this action.</p>
</Modal>
```

## Props

| Prop              | Тип                                                          | Обязательный | По умолчанию | Описание                                      |
| ----------------- | ------------------------------------------------------------ | ------------ | ------------ | --------------------------------------------- |
| `isOpen`          | `boolean`                                                    | ✅           | -            | Показывать ли модалку                         |
| `title`           | `string`                                                     | ✅           | -            | Заголовок модалки                             |
| `children`        | `ReactNode`                                                  | ✅           | -            | Содержимое модалки                            |
| `onConfirm`       | `() => void`                                                 | ✅           | -            | Callback при подтверждении                    |
| `onCancel`        | `() => void`                                                 | ✅           | -            | Callback при отмене/закрытии                  |
| `confirmText`     | `string`                                                     | ❌           | `'Confirm'`  | Текст кнопки подтверждения                    |
| `cancelText`      | `string`                                                     | ❌           | `'Cancel'`   | Текст кнопки отмены                           |
| `confirmVariant`  | `'primary'` \| `'danger'` \| `'warning'` \| `'success'`      | ❌           | `'primary'`  | Вариант стиля кнопки подтверждения            |
| `isLoading`       | `boolean`                                                    | ❌           | `false`      | Состояние загрузки (блокирует кнопки)         |

## Варианты кнопок (`confirmVariant`)

- **`primary`** - синяя кнопка (стандартные действия, информация)
- **`danger`** - красная кнопка (удаление, опасные действия)
- **`warning`** - оранжевая кнопка (предупреждения, внимание)
- **`success`** - зеленая кнопка (публикация, подтверждение, успех)

## Поведение

### Закрытие модалки

Модалка закрывается при:

- Клик по крестику (×) в заголовке
- Клик по кнопке отмены (`cancelText`)
- Клик по оверлею (затемненному фону)

**Важно:** Во время загрузки (`isLoading=true`) закрытие модалки блокируется для предотвращения случайного прерывания операции.

### Состояние загрузки

Когда `isLoading={true}`:

- Текст кнопки подтверждения меняется на "Processing..."
- Все кнопки блокируются (`disabled`)
- Закрытие модалки невозможно (крестик и оверлей не работают)

### Анимации

- **Оверлей:** Плавное появление (fade in) за `0.15s`
- **Модалка:** Появление снизу вверх (slide up) за `0.3s`
- Все анимации используют токены из `$transition-fast` и `$transition-base`

## Примеры использования в проекте

### PageListTable - удаление страницы

Файл: `/components/admin/pages/PageListTable/PageListTable.tsx`

Полный пример интеграции с React Query для удаления страницы с подтверждением.

### PagePublishPanel - публикация страницы

Файл: `/components/admin/pages/PagePublishPanel.tsx`

Более сложный пример с разными состояниями (publish/unpublish) и кастомными сообщениями.

## Стилизация

Модалка использует SCSS модули и design tokens из `styles/tokens.scss`:

### Используемые токены

- **Цвета:**
  - `$color-primary`, `$color-primary-hover` (синяя кнопка)
  - `$color-success`, `$color-success-hover` (зеленая кнопка)
  - `$color-warning`, `$color-warning-hover` (оранжевая кнопка)
  - `$color-error`, `$color-error-hover` (красная кнопка)
  - `$color-background-*`, `$color-text-*`, `$color-border-*`

- **Отступы:** `$spacing-xs`, `$spacing-sm`, `$spacing-md`, `$spacing-lg`
- **Тени:** `$shadow-sm`, `$shadow-md`, `$shadow-xl`
- **Скругления:** `$border-radius-base`, `$border-radius-lg`
- **Анимации:** `$transition-fast`, `$transition-base`
- **Z-index:** `$z-index-modal` (1050)

### Кастомизация стилей

Для изменения внешнего вида модалки редактируйте `Modal.module.scss`. Все стили изолированы через CSS modules.

## Accessibility

- ✅ Кнопка закрытия имеет `aria-label="Close modal"`
- ✅ Все интерактивные элементы имеют правильный `type="button"`
- ✅ При `isLoading=true` кнопки получают `disabled` атрибут
- ✅ Модалка блокирует взаимодействие с фоном (оверлей)

## Миграция с window.confirm

### До (антипаттерн ❌)

```tsx
const handleDelete = () => {
  const confirmed = window.confirm('Are you sure?');
  if (confirmed) {
    deleteItem();
  }
};
```

### После (правильно ✅)

```tsx
const [isOpen, setIsOpen] = useState(false);

const handleDelete = () => {
  setIsOpen(true);
};

const handleConfirm = () => {
  deleteItem();
  setIsOpen(false);
};

// В JSX:
<Modal
  isOpen={isOpen}
  title="Confirm Delete"
  confirmText="Delete"
  confirmVariant="danger"
  onConfirm={handleConfirm}
  onCancel={() => setIsOpen(false)}
>
  <p>Are you sure?</p>
</Modal>
```

## Расширение функциональности

### Сценарии использования

1. **Подтверждение удаления** - используйте `confirmVariant="danger"`
2. **Подтверждение публикации** - используйте `confirmVariant="success"`
3. **Предупреждение** - используйте `confirmVariant="warning"`
4. **Информация** - используйте `confirmVariant="primary"` и одинаковые callbacks для обеих кнопок
5. **Формы** - вставьте форму в `children`, обработайте submit в `onConfirm`

### Пример с формой

```tsx
<Modal
  isOpen={isOpen}
  title="Edit User"
  confirmText="Save"
  confirmVariant="primary"
  isLoading={isSubmitting}
  onConfirm={handleSubmit}
  onCancel={() => setIsOpen(false)}
>
  <form>
    <input type="text" name="name" placeholder="Name" />
    <input type="email" name="email" placeholder="Email" />
  </form>
</Modal>
```

## TODO / Будущие улучшения

- [ ] Поддержка клавиатурных сокращений (Esc для отмены, Enter для подтверждения)
- [ ] Accessibility: trap focus внутри модалки
- [ ] Accessibility: restore focus при закрытии
- [ ] Опциональная иконка в заголовке (info, warning, success, error)
- [ ] Поддержка разных размеров модалки (sm, md, lg, xl)
- [ ] Опциональный футер (возможность скрыть кнопки совсем)
- [ ] Тесты (unit + integration + accessibility)
- [ ] Storybook stories для всех вариантов использования
