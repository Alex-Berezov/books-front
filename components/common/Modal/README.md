# Modal

Universal reusable modal component.

## Description

`Modal` is a flexible modal component for various use cases:

- ✅ **Action confirmation** (delete, publish, cancel, etc.)
- ✅ **Information display** (notifications, object details)
- ✅ **Input forms** (create/edit data)
- ✅ **Any custom content** via `children`

**Features:**

- ✅ Custom title with close button (×)
- ✅ Arbitrary content (via `children`)
- ✅ Customizable footer buttons (texts and style variants)
- ✅ Loading state support
- ✅ Close on overlay click or close button
- ✅ Smooth appearance/disappearance animations
- ✅ Uses project design tokens

## Usage

### Basic example (action confirmation)

```tsx
import { useState } from 'react';
import { Modal } from '@/components/common/Modal';

export const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    // Your delete logic
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

### With loading state (React Query)

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

### Information modal

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
    <p>
      <strong>Name:</strong> John Doe
    </p>
    <p>
      <strong>Email:</strong> john@example.com
    </p>
    <p>
      <strong>Role:</strong> Administrator
    </p>
  </div>
</Modal>
```

### Different button variants

```tsx
// Delete (red button)
<Modal
  confirmVariant="danger"
  confirmText="Delete"
  title="Delete Item"
  {...props}
>
  <p>This will permanently delete the item.</p>
</Modal>

// Publish (green button)
<Modal
  confirmVariant="success"
  confirmText="Publish"
  title="Publish Page"
  {...props}
>
  <p>This page will be visible to all users.</p>
</Modal>

// Warning (orange button)
<Modal
  confirmVariant="warning"
  confirmText="Proceed"
  title="Warning"
  {...props}
>
  <p>This action may have unexpected consequences.</p>
</Modal>

// Standard action (blue button)
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

| Prop             | Type                                                    | Required | Default     | Description                      |
| ---------------- | ------------------------------------------------------- | -------- | ----------- | -------------------------------- |
| `isOpen`         | `boolean`                                               | ✅       | -           | Whether to show modal            |
| `title`          | `string`                                                | ✅       | -           | Modal title                      |
| `children`       | `ReactNode`                                             | ✅       | -           | Modal content                    |
| `onConfirm`      | `() => void`                                            | ✅       | -           | Callback on confirm              |
| `onCancel`       | `() => void`                                            | ✅       | -           | Callback on cancel/close         |
| `confirmText`    | `string`                                                | ❌       | `'Confirm'` | Confirm button text              |
| `cancelText`     | `string`                                                | ❌       | `'Cancel'`  | Cancel button text               |
| `confirmVariant` | `'primary'` \| `'danger'` \| `'warning'` \| `'success'` | ❌       | `'primary'` | Confirm button style variant     |
| `isLoading`      | `boolean`                                               | ❌       | `false`     | Loading state (disables buttons) |

## Button variants (`confirmVariant`)

- **`primary`** - blue button (standard actions, information)
- **`danger`** - red button (delete, dangerous actions)
- **`warning`** - orange button (warnings, attention)
- **`success`** - green button (publish, confirm, success)

## Behavior

### Closing modal

Modal closes when:

- Click on close button (×) in header
- Click on cancel button (`cancelText`)
- Click on overlay (darkened background)

**Important:** During loading (`isLoading=true`) closing modal is blocked to prevent accidental operation interruption.

### Loading state

When `isLoading={true}`:

- Confirm button text changes to "Processing..."
- All buttons are disabled
- Modal cannot be closed (close button and overlay don't work)

### Animations

- **Overlay:** Smooth fade in for `0.15s`
- **Modal:** Slide up from bottom for `0.3s`
- All animations use tokens from `$transition-fast` and `$transition-base`

## Usage examples in project

### PageListTable - delete page

File: `/components/admin/pages/PageListTable/PageListTable.tsx`

Complete integration example with React Query for deleting page with confirmation.

### PagePublishPanel - publish page

File: `/components/admin/pages/PagePublishPanel.tsx`

More complex example with different states (publish/unpublish) and custom messages.

## Styling

Modal uses SCSS modules and design tokens from `styles/tokens.scss`:

### Used tokens

- **Colors:**
  - `$color-primary`, `$color-primary-hover` (blue button)
  - `$color-success`, `$color-success-hover` (green button)
  - `$color-warning`, `$color-warning-hover` (orange button)
  - `$color-error`, `$color-error-hover` (red button)
  - `$color-background-*`, `$color-text-*`, `$color-border-*`

- **Spacing:** `$spacing-xs`, `$spacing-sm`, `$spacing-md`, `$spacing-lg`
- **Shadows:** `$shadow-sm`, `$shadow-md`, `$shadow-xl`
- **Border radius:** `$border-radius-base`, `$border-radius-lg`
- **Animations:** `$transition-fast`, `$transition-base`
- **Z-index:** `$z-index-modal` (1050)

### Style customization

To change modal appearance, edit `Modal.module.scss`. All styles are isolated via CSS modules.

## Accessibility

- ✅ Close button has `aria-label="Close modal"`
- ✅ All interactive elements have proper `type="button"`
- ✅ When `isLoading=true` buttons receive `disabled` attribute
- ✅ Modal blocks interaction with background (overlay)

## Migration from window.confirm

### Before (antipattern ❌)

```tsx
const handleDelete = () => {
  const confirmed = window.confirm('Are you sure?');
  if (confirmed) {
    deleteItem();
  }
};
```

### After (correct ✅)

```tsx
const [isOpen, setIsOpen] = useState(false);

const handleDelete = () => {
  setIsOpen(true);
};

const handleConfirm = () => {
  deleteItem();
  setIsOpen(false);
};

// In JSX:
<Modal
  isOpen={isOpen}
  title="Confirm Delete"
  confirmText="Delete"
  confirmVariant="danger"
  onConfirm={handleConfirm}
  onCancel={() => setIsOpen(false)}
>
  <p>Are you sure?</p>
</Modal>;
```

## Extending functionality

### Use cases

1. **Delete confirmation** - use `confirmVariant="danger"`
2. **Publish confirmation** - use `confirmVariant="success"`
3. **Warning** - use `confirmVariant="warning"`
4. **Information** - use `confirmVariant="primary"` and same callbacks for both buttons
5. **Forms** - insert form in `children`, handle submit in `onConfirm`

### Example with form

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

## TODO / Future improvements

- [ ] Keyboard shortcuts support (Esc to cancel, Enter to confirm)
- [ ] Accessibility: trap focus inside modal
- [ ] Accessibility: restore focus on close
- [ ] Optional icon in header (info, warning, success, error)
- [ ] Different modal sizes support (sm, md, lg, xl)
- [ ] Optional footer (ability to hide buttons completely)
- [ ] Tests (unit + integration + accessibility)
- [ ] Storybook stories for all use cases
