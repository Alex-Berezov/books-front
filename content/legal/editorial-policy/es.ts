import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'es',
  metaTitle: 'Política editorial - Bibliaris',
  metaDescription:
    'De dónde salen los textos de Bibliaris, quién escribe los resúmenes y las descripciones, cómo se preparan los textos de los libros y cómo se corrigen los errores.',
  title: 'Política editorial',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'who',
      heading: 'Quién escribe',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Los resúmenes y las descripciones de los libros, y los análisis de personajes, símbolos y citas de las páginas de los libros, los escriben y los editan personas: la redacción de Bibliaris.',
            },
          ],
        },
      ],
    },
    {
      id: 'sources',
      heading: 'De dónde salen los textos de los libros',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Los textos de los libros se publican a partir de ediciones que son de dominio público.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Un libro puede no estar disponible en algunos países.' },
          ],
        },
      ],
    },
    {
      id: 'preparation',
      heading: 'Cómo se prepara un texto',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El texto de una edición se conserva tal cual. Solo se corrigen las erratas del reconocimiento de texto y la tipografía. Dentro del texto de un libro no se acorta ni se resume nada.',
            },
          ],
        },
      ],
    },
    {
      id: 'summaries',
      heading: 'Cómo se escriben los resúmenes',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Un resumen transmite la trama y las ideas de un libro. No sustituye al libro.',
              },
            ],
            [{ kind: 'text', text: 'Un resumen puede revelar la trama.' }],
            [{ kind: 'text', text: 'Un resumen se contrasta con el texto del libro.' }],
          ],
        },
      ],
    },
    {
      id: 'translations',
      heading: 'Traducciones',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si se conoce al traductor de un libro, se indica en la página del libro.',
            },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Correcciones',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si notas un error en un texto, un resumen o una descripción, avísanos en la página de ',
            },
            { kind: 'link', text: 'Contacto', href: '/contact' },
            {
              kind: 'text',
              text: '. El error se corrige; si estaba en un resumen, cambia la fecha «Actualizado» de ese resumen.',
            },
          ],
        },
      ],
    },
  ],
};
