import type { FC } from 'react';
import type { IconProps } from './icons.types';
import { AntdPathIcon } from './AntdPathIcon';

const PATH =
  'M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-260 72h96v209.9L621.5 312 572 347.4V136zm220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0022.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z';

/**
 * Книга с закладкой контуром — марка сайта на страницах входа, правовых и полки.
 * У `lucide-react` такой формы нет, а `@ant-design/icons` на сайт больше не тянется
 * (`LEGACY-442`); контур взят из `BookOutlined`, цвет — `currentColor`.
 */
export const BookOutlinedIcon: FC<IconProps> = ({ className, size }) => (
  <AntdPathIcon className={className} size={size} d={PATH} />
);
