import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthorFacts } from '@/components/public/author/AuthorFacts/AuthorFacts';
import { fullAuthor, minimalAuthor } from '../../../fixtures/author-page';

/** F02-3, `product.md` §5: сводка фактов — только заполненные строки, в порядке спецификации. */
describe('AuthorFacts', () => {
  const labels = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent);

  it('полный автор: строки по порядку, дата и место, произведения ссылкой или текстом', () => {
    const { container } = render(<AuthorFacts lang="ru" author={fullAuthor()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Коротко' })).toBeInTheDocument();
    expect(labels(container)).toEqual([
      'Родился',
      'Умер',
      'Страна',
      'Род занятий',
      'Направление',
      'Жанры',
      'Язык творчества',
      'Главные произведения',
    ]);
    expect(
      screen.getByText(/^9 сентября 1828.*, Ясная Поляна, Российская империя$/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Война и мир' })).toHaveAttribute(
      'href',
      '/ru/book/voyna-i-mir'
    );
    expect(screen.queryByRole('link', { name: 'Смерть Ивана Ильича' })).not.toBeInTheDocument();
    expect(screen.getByText(/Смерть Ивана Ильича/)).toHaveTextContent('Смерть Ивана Ильича (1886)');
  });

  it('пол «female» — «Родилась/Умерла», пусто — «Рождение/Смерть» (Р9)', () => {
    const base = fullAuthor().facts;
    const female = render(
      <AuthorFacts lang="ru" author={fullAuthor({ facts: { ...base, gender: 'female' } })} />
    );
    expect(labels(female.container).slice(0, 2)).toEqual(['Родилась', 'Умерла']);
    female.unmount();

    const neutral = render(
      <AuthorFacts lang="ru" author={fullAuthor({ facts: { ...base, gender: undefined } })} />
    );
    expect(labels(neutral.container).slice(0, 2)).toEqual(['Рождение', 'Смерть']);
  });

  it('французский — род в подписи: Née / Morte', () => {
    const base = fullAuthor().facts;
    const { container } = render(
      <AuthorFacts lang="fr" author={fullAuthor({ facts: { ...base, gender: 'female' } })} />
    );

    expect(labels(container).slice(0, 2)).toEqual(['Née', 'Morte']);
  });

  it('дата только годом и место без даты', () => {
    render(
      <AuthorFacts
        lang="ru"
        author={minimalAuthor({ birthDate: '1265', facts: { deathPlace: 'Равенна' } })}
      />
    );

    expect(screen.getByText('1265')).toBeInTheDocument();
    expect(screen.getByText('Равенна')).toBeInTheDocument();
  });

  it('год произведения до н. э. — с подписью языка, а не со знаком минус', () => {
    render(
      <AuthorFacts
        lang="ru"
        author={minimalAuthor({
          notableWorks: [{ title: 'Искусство войны', year: -500, book: null }],
        })}
      />
    );

    expect(screen.getByText('Искусство войны (500 до н. э.)')).toBeInTheDocument();
  });

  it('нет ни одного факта — блока нет вовсе', () => {
    const { container } = render(<AuthorFacts lang="ru" author={minimalAuthor()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
