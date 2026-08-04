import type { FC } from 'react';

export type TextWithBoldProps = {
  text: string;
  bold: string;
};

export const TextWithBold: FC<TextWithBoldProps> = ({ text, bold }) => {
  const [before, after = ''] = text.split('{b}');

  return (
    <>
      {before}
      <strong>{bold}</strong>
      {after}
    </>
  );
};
