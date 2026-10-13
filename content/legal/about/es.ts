import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'about',
  lang: 'es',
  metaTitle: 'Sobre Bibliaris',
  metaDescription:
    'Bibliaris es una biblioteca en línea gratuita de literatura clásica de dominio público: lee, escucha y encuentra resúmenes de libros en cinco idiomas.',
  title: 'Sobre Bibliaris',
  updatedAt: '2026-10-13',
  toc: false,
  sections: [
    {
      id: 'what',
      heading: 'Qué es Bibliaris',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris es una biblioteca en línea gratuita de literatura clásica de dominio público. Aquí puedes leer libros en línea, escucharlos y encontrar resúmenes breves y descripciones de libros en cinco idiomas: inglés, español, francés, portugués y ruso.',
            },
          ],
        },
      ],
    },
    {
      id: 'readers',
      heading: 'Qué hacemos por los lectores',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Un catálogo de libros que puedes explorar por género, categoría, colección y etiqueta.',
              },
            ],
            [{ kind: 'text', text: 'Lectura de libros en línea, sin necesidad de cuenta.' }],
            [{ kind: 'text', text: 'Audiolibros, cuando el libro tiene versión en audio.' }],
            [{ kind: 'text', text: 'Resúmenes breves y descripciones de libros.' }],
            [{ kind: 'text', text: 'Páginas de autores con sus libros.' }],
            [{ kind: 'text', text: 'Una estantería para los lectores que inician sesión.' }],
          ],
        },
      ],
    },
    {
      id: 'who',
      heading: 'Quién hace el sitio',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El sitio lo hace la redacción de Bibliaris: un pequeño equipo de editores que selecciona los libros, prepara los textos para su publicación y escribe los resúmenes y las descripciones.',
            },
          ],
        },
      ],
    },
    {
      id: 'how',
      heading: 'Cómo trabajamos',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Los resúmenes y las descripciones de los libros los escriben y los editan personas.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Los textos de los libros siguen ediciones que son de dominio público.',
              },
            ],
            [{ kind: 'text', text: 'Un error se corrige después de que un lector nos avisa.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Los detalles están en nuestra ' },
            { kind: 'link', text: 'Política editorial', href: '/editorial-policy' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contáctanos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Preguntas, errores en el sitio y sugerencias: consulta la página de ',
            },
            { kind: 'link', text: 'Contacto', href: '/contact' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
