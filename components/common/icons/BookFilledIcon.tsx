import type { FC } from 'react';
import type { IconProps } from './icons.types';
import { AntdPathIcon } from './AntdPathIcon';

const PATH =
  'M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zM668 345.9L621.5 312 572 347.4V124h96v221.9z';

/**
 * Залитая книга с закладкой — знак пустой полки. В `lucide-react` залитых
 * знаков нет, а `@ant-design/icons` на сайт больше не тянется (`LEGACY-442`);
 * контур взят из `BookFilled`, цвет — `currentColor`.
 */
export const BookFilledIcon: FC<IconProps> = ({ className, size }) => (
  <AntdPathIcon className={className} size={size} d={PATH} />
);
