export interface RichTextContentProps {
  /** HTML produced by the admin `RichTextEditor`. */
  html: string;
  /** Page-specific class; the caller keeps its own typography and spacing. */
  className?: string;
  /** DOM id, for callers that point `aria-controls` at this block. */
  id?: string;
  /**
   * Преобразование уже очищенного HTML — например якоря `h3` для оглавления биографии
   * (`anchorHeadings`). Только из серверного компонента: функцию не передать через границу
   * клиента. Своё преобразование тянет в бандл вызывающий, а не общий компонент.
   */
  transformSafeHtml?: (safeHtml: string) => string;
}
