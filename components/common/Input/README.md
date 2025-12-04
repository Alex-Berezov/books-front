# Input Component

Reusable Input component wrapping Ant Design Input with extended API for project consistency.

## Features

- **Sizes**: `sm`, `md`, `lg` - mapped to antd small/middle/large
- **Error State**: Visual error indication for form validation
- **Loading State**: Shows spinner when processing
- **Full Width**: Option to span full container width
- **Password Type**: Built-in visibility toggle
- **Prefix/Suffix**: Support for icons or custom elements
- **Character Count**: Optional max length with counter
- **react-hook-form**: Seamless integration with register or Controller

## Installation

The component is part of the common components library. Import from:

```tsx
import { Input } from '@/components/common/Input';
import type { InputProps } from '@/components/common/Input';
```

## Usage

### Basic Usage

```tsx
<Input placeholder="Enter text" onChange={(e) => console.log(e.target.value)} />
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

### Password with Toggle

```tsx
<Input type="password" placeholder="Enter password" />
```

### With Error State

```tsx
<Input error={!!errors.name} placeholder="Name" />
```

### With Prefix Icon

```tsx
import { SearchOutlined } from '@ant-design/icons';

<Input prefix={<SearchOutlined />} placeholder="Search..." />;
```

### With Suffix Icon

```tsx
import { MailOutlined } from '@ant-design/icons';

<Input suffix={<MailOutlined />} placeholder="Email" type="email" />;
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

### With Loading State

```tsx
<Input loading={isLoading} placeholder="Loading..." />
```

### With Allow Clear

```tsx
<Input allowClear placeholder="Clearable input" />
```

### Number Input

```tsx
<Input type="number" placeholder="Enter number" />
```

### Email Input with Autocomplete

```tsx
<Input type="email" autoComplete="email" placeholder="Email address" />
```

## Props

| Prop           | Type                                            | Default   | Description                 |
| -------------- | ----------------------------------------------- | --------- | --------------------------- |
| `size`         | `'sm' \| 'md' \| 'lg'`                          | `'md'`    | Size of the input           |
| `fullWidth`    | `boolean`                                       | `false`   | Whether to span full width  |
| `error`        | `boolean`                                       | `false`   | Error state for validation  |
| `disabled`     | `boolean`                                       | `false`   | Disabled state              |
| `loading`      | `boolean`                                       | `false`   | Loading state               |
| `placeholder`  | `string`                                        | -         | Placeholder text            |
| `value`        | `string`                                        | -         | Controlled value            |
| `defaultValue` | `string`                                        | -         | Default value               |
| `onChange`     | `(e: ChangeEvent<HTMLInputElement>) => void`    | -         | Change handler              |
| `onBlur`       | `() => void`                                    | -         | Blur handler                |
| `type`         | `'text' \| 'password' \| 'email' \| 'url' \| 'number'` | `'text'` | Input type                |
| `prefix`       | `ReactNode`                                     | -         | Prefix icon/element         |
| `suffix`       | `ReactNode`                                     | -         | Suffix icon/element         |
| `allowClear`   | `boolean`                                       | `false`   | Show clear button           |
| `maxLength`    | `number`                                        | -         | Maximum character length    |
| `showCount`    | `boolean`                                       | `false`   | Show character count        |
| `ariaLabel`    | `string`                                        | -         | Accessible label            |
| `className`    | `string`                                        | -         | Additional CSS class        |
| `name`         | `string`                                        | -         | Field name for forms        |
| `autoFocus`    | `boolean`                                       | `false`   | Auto focus on mount         |
| `autoComplete` | `string`                                        | -         | HTML autocomplete attribute |

## Styling

The component uses SCSS modules with design tokens from `@/styles/tokens.scss`.

Custom classes:

- `.input` - Base styles
- `.fullWidth` - Full width mode
- `.error` - Error state styling
- `.spinner` - Loading spinner

## Accessibility

- Supports `aria-label` prop for screen readers
- Proper `id` and `name` attributes for form association
- Keyboard navigation support
- Focus management

## Related Components

- [Button](/components/common/Button/README.md) - Button component
- [Select](/components/common/Select/README.md) - Select/dropdown component
- [SlugInput](/components/common/SlugInput/README.md) - Specialized slug input
