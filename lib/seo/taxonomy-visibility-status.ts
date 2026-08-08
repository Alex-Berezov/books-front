import { isTaxonomyLinkable } from './taxonomy-linkable';

/**
 * Почему термин индексируется или нет — в форме, пригодной для админки.
 *
 * Считается **тем же** предикатом `isTaxonomyLinkable`, что и внутренняя
 * перелинковка, sitemap и meta robots. Своя арифметика здесь была бы четвёртым
 * независимым мнением об одном и том же — ровно тем расхождением, из-за которого
 * noindex-страницы попадали в перелинковку (LEGACY-067, LEGACY-069).
 *
 * Редактору важно не только «да/нет», но и **какой именно сигнал закрыл термин**:
 * два переключателя в карточке умеют закрывать и не умеют открывать. Термин без
 * книг или с закрытым гистерезисом останется `noindex` при любом положении
 * галочек, и интерфейс обязан это говорить, а не намекать.
 */
export type TaxonomyVisibilityState =
  | 'indexed'
  | 'hidden'
  | 'noindex'
  | 'empty'
  | 'auto-closed'
  | 'no-translation';

export interface TaxonomyVisibilityStatus {
  state: TaxonomyVisibilityState;
  /** Короткая метка для значка в списке. */
  label: string;
  /** Разъяснение: что именно это значит и что с этим можно сделать. */
  detail: string;
  /** Отдаётся ли страница термина в индекс на выбранном языке. */
  linkable: boolean;
}

export interface TaxonomyVisibilityInput {
  isVisible?: boolean;
  indexable?: boolean;
  /** Состояние гистерезиса для запрошенного языка. */
  autoIndexable?: boolean;
  /** Кэшированное число книг **этого** языка (`CategoryTranslation.bookCount`). */
  langBookCount?: number;
}

/**
 * ⚠️ Ожидает данные, запрошенные **с `?lang`**. Без него бэкенд не присылает ни
 * `autoIndexable`, ни `langBookCount`, и отличить «нет перевода» от «язык не
 * запрашивали» по ответу невозможно. Поэтому вызывающий обязан передавать язык
 * в запрос — иначе статус будет говорить «нет перевода» про все термины подряд.
 */
export function getTaxonomyVisibilityStatus(
  term: TaxonomyVisibilityInput | null | undefined
): TaxonomyVisibilityStatus {
  if (!term) {
    return {
      state: 'no-translation',
      label: 'no page',
      detail: 'There is no term to describe.',
      linkable: false,
    };
  }

  // Порядок ветвей повторяет порядок проверок в isTaxonomyLinkable: показанная
  // причина должна быть той, которая действует сейчас, а не первой попавшейся.
  if (term.isVisible === false) {
    return {
      state: 'hidden',
      label: 'hidden',
      detail:
        'Hidden by an editor: the term is absent from public lists and its page answers noindex.',
      linkable: false,
    };
  }

  if (term.indexable === false) {
    return {
      state: 'noindex',
      label: 'noindex',
      detail:
        'Excluded from indexing by an editor. The term still appears in public lists — untick “Visible” to remove it from those as well.',
      linkable: false,
    };
  }

  if (term.autoIndexable === undefined) {
    return {
      state: 'no-translation',
      label: 'no page',
      detail:
        'The term has no translation into this language, so it has no page here. Add a translation first — the switches cannot create one.',
      linkable: false,
    };
  }

  const count = term.langBookCount ?? 0;

  if (count <= 0) {
    return {
      state: 'empty',
      label: 'empty',
      detail:
        'No published books in this language. An empty term is never indexed, whatever the switches say.',
      linkable: false,
    };
  }

  if (!term.autoIndexable) {
    return {
      state: 'auto-closed',
      label: 'auto: closed',
      detail: `Closed automatically: ${count} book(s) in this language. The rule closes a term at 2 books or fewer and reopens it at 5 — between those it keeps its previous state. The switches cannot open it.`,
      linkable: false,
    };
  }

  const linkable = isTaxonomyLinkable({
    isVisible: term.isVisible,
    indexable: term.indexable,
    autoIndexable: term.autoIndexable,
    booksCount: count,
  });

  return {
    state: linkable ? 'indexed' : 'auto-closed',
    label: linkable ? 'indexed' : 'auto: closed',
    detail: linkable
      ? `Indexed in this language: ${count} book(s), and neither switch is closing it.`
      : 'Closed by the automatic rule.',
    linkable,
  };
}
