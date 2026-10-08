# Input Component

Site input built on the native `<input>` element. No antd, no `@ant-design/icons` — the
public site does not ship antd (`.eslintrc.json`, LEGACY-442). Admin forms may use it as well.

## Features

- **Sizes**: `sm`, `md`, `lg`
- **Error State**: visual error indication plus `aria-invalid`
- **Loading State**: shows a spinner and disables the field
- **Read-only**: value is shown and submitted, but cannot be edited
- **Full Width**: option to span the full container width
- **Password Type**: built-in visibility toggle
- **Left Icon**: any `ReactNode` rendered before the field
- **Clear Button**: optional, hidden when disabled, read-only or loading
- **Character Count**: with `maxLength` and `showCount`
- **react-hook-form**: works with `register` (forwards `ref`) or `Controller`

## Import

```tsx
import { Input } from '@/components/common/Input';
import type { InputProps } from '@/components/common/Input';
```

## Usage

### Basic Usage

```tsx
<Input placeholder="Enter text" onChange={(e) => setValue(e.target.value)} />
```

### With react-hook-form (register)

```tsx
import { useForm } from 'react-hook-form';
import { Input } from '@/components/common/Input';

function MyForm() {
  const {
    register,
    formState: { errors },
  } = useForm();

  return <Input {...register('email')} error={!!errors.email} placeholder="Email" />;
}
```

### With react-hook-form (Controller)

```tsx
import { Controller } from 'react-hook-form';
import { Input } from '@/components/common/Input';

<Controller
  name="email"
  control={control}
  render={({ field, fieldState }) => (
    <Input {...field} error={!!fieldState.error} placeholder="Email" />
  )}
/>;
```

### Read-only vs disabled

```tsx
<Input {...register('slug')} readOnly />
```

Use `readOnly`, not `disabled`, to show a value that must still be submitted:
react-hook-form drops disabled fields from form data, so a required field with
`disabled` fails validation and the form stops saving.

### Password with Toggle

```tsx
<Input type="password" placeholder="Enter password" />
```

### With Left Icon

```tsx
import { Search } from 'lucide-react';

<Input leftIcon={<Search size={16} />} placeholder="Search..." />;
```

### Full Width with Max Length

```tsx
<Input fullWidth maxLength={100} showCount placeholder="Description" />
```

### Different Sizes

```tsx
<Input size="sm" placeholder="Small" />
<Input size="md" placeholder="Medium (default)" />
<Input size="lg" placeholder="Large" />
```

### Loading, Clear, Autocomplete

```tsx
<Input loading={isLoading} placeholder="Loading..." />
<Input allowClear placeholder="Clearable input" />
<Input type="email" autoComplete="email" placeholder="Email address" />
```

## Props

| Prop           | Type                                                   | Default  | Description                                         |
| -------------- | ------------------------------------------------------ | -------- | --------------------------------------------------- |
| `size`         | `'sm' \| 'md' \| 'lg'`                                 | `'md'`   | Size of the input                                   |
| `fullWidth`    | `boolean`                                              | `false`  | Span the full container width                       |
| `error`        | `boolean`                                              | `false`  | Error state, also sets `aria-invalid`               |
| `disabled`     | `boolean`                                              | `false`  | Disabled state (excluded from react-hook-form data) |
| `readOnly`     | `boolean`                                              | `false`  | Shown and submitted, not editable                   |
| `loading`      | `boolean`                                              | `false`  | Shows spinner, disables the field                   |
| `placeholder`  | `string`                                               | -        | Placeholder text                                    |
| `value`        | `string`                                               | -        | Controlled value                                    |
| `defaultValue` | `string`                                               | -        | Initial value (uncontrolled mode)                   |
| `onChange`     | `(e: ChangeEvent<HTMLInputElement>) => void`           | -        | Change handler; clear button sends an empty value   |
| `onBlur`       | `(e?: FocusEvent<HTMLInputElement>) => void`           | -        | Blur handler                                        |
| `type`         | `'text' \| 'password' \| 'email' \| 'url' \| 'number'` | `'text'` | Input type                                          |
| `allowClear`   | `boolean`                                              | `false`  | Show clear button                                   |
| `maxLength`    | `number`                                               | -        | Maximum character length                            |
| `showCount`    | `boolean`                                              | `false`  | Show character count (needs `maxLength`)            |
| `ariaLabel`    | `string`                                               | -        | Accessible label (`aria-label`)                     |
| `className`    | `string`                                               | -        | Additional class on the wrapper                     |
| `name`         | `string`                                               | -        | Field name for forms                                |
| `id`           | `string`                                               | `name`   | HTML id; falls back to `name`                       |
| `autoComplete` | `string`                                               | -        | HTML autocomplete attribute                         |
| `leftIcon`     | `ReactNode`                                            | -        | Icon rendered on the left side                      |

The component forwards `ref` to the native `<input>`.

## Styling

SCSS module `Input.module.scss` with design tokens from `@/styles/tokens.scss`.

Main classes: `.inputWrapper`, `.input`, `.size-sm` / `.size-md` / `.size-lg`, `.fullWidth`,
`.error`, `.disabled` (also used for read-only), `.loading`, `.spinner`, `.clearButton`,
`.passwordToggle`, `.leftIcon`, `.hasLeftIcon`, `.charCount`.

## Accessibility

- `ariaLabel` maps to `aria-label`
- `error` maps to `aria-invalid`
- `id` defaults to `name` for `<label htmlFor>` association
- Clear and password-toggle buttons have their own `aria-label`

## Related Components

- [Button](/components/common/Button/Button.types.ts) - site button (no antd); admin forms use [the antd wrapper](/components/admin/common/Button/README.md)
- [Select](/components/admin/common/Select/README.md) - admin Select/dropdown component (antd)
- [SlugInput](/components/admin/common/SlugInput/SlugInput.tsx) - admin slug input
