import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'es',
  metaTitle: 'Política editorial - Bibliaris',
  metaDescription:
    'De dónde salen los textos de Bibliaris, quién escribe los resúmenes y las descripciones, cómo se elaboran los análisis de libros, cómo se preparan los textos de los libros y cómo se corrigen los errores.',
  title: 'Política editorial',
  updatedAt: '2026-10-19',
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
              text: 'Los resúmenes y las descripciones de los libros, y los análisis de personajes, símbolos y citas de los bloques de las páginas de los libros, los escriben y los editan personas: la redacción de Bibliaris. Los análisis de libros se preparan de otra manera: consulta «Cómo se preparan los análisis de libros» más abajo.',
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
      id: 'analysis',
      heading: 'Cómo se preparan los análisis de libros',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las páginas de análisis las prepara la Redacción de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El borrador de cada análisis se elabora con un modelo de lenguaje siguiendo las instrucciones de la redacción. El modelo recibe información sobre esta versión del libro en el sitio, entre ella el título, el autor, el idioma y la lista de capítulos. La redacción carga y publica el borrador.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El análisis en cada idioma se escribe por separado para los lectores de ese idioma, no se traduce de otro; por eso las secciones pueden variar de un idioma a otro.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las instrucciones exigen citar literalmente la edición del libro publicada en Bibliaris. El número de capítulo junto a una cita es el número del capítulo de esta versión en el sitio; enlaza a ese capítulo en el lector solo si el capítulo existe. Al cargar el análisis, los números de capítulo se comprueban automáticamente: si un capítulo no existe en esta versión, la redacción ve un aviso.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las instrucciones prohíben incluir fechas, datos biográficos, adaptaciones o fuentes sobre los que no haya certeza, y exigen presentar las interpretaciones como interpretaciones. Cuando se indican las fuentes, aparecen al final de la página del análisis.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Puedes avisar de un error en un análisis en la página ' },
            { kind: 'link', text: 'Contacto', href: '/contact' },
            { kind: 'text', text: ', como se describe en «Correcciones».' },
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
      id: 'authors',
      heading: 'Páginas de autores',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'La información de las páginas de autores — fechas y lugares de su vida, cronología, influencias, premios, adaptaciones y datos curiosos — se recopila de fuentes abiertas. Cuando se indican las fuentes, aparecen al final de la página del autor.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Puedes avisar de un error en la página de un autor en la página ',
            },
            { kind: 'link', text: 'Contacto', href: '/contact' },
            { kind: 'text', text: ', como se describe en «Correcciones».' },
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
