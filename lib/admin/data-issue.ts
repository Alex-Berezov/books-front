/**
 * Ошибка данных JSON админки (анализ F03-1, мир книги F08-1, окно импорта): путь поля
 * (`themes.0.title`) и текст причины. Один тип и один форматтер на все вкладки.
 */
export interface DataIssue {
  path: string;
  message: string;
}

export const formatDataIssue = (issue: DataIssue): string =>
  issue.path ? `${issue.path}: ${issue.message}` : issue.message;
