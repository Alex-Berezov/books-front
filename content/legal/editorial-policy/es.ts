import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'es',
  metaTitle: 'Política editorial - Bibliaris',
  metaDescription:
    'De dónde salen los textos de Bibliaris, quién prepara los resúmenes y escribe las descripciones, cómo se elaboran los análisis de libros, cómo se preparan los textos de los libros y cómo se corrigen los errores.',
  title: 'Política editorial',
  updatedAt: '2026-11-27',
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
              text: 'Las descripciones de los libros las escriben y las editan personas: la redacción de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'La redacción prepara los resúmenes y los análisis de personajes, símbolos y citas de los bloques de las páginas de los libros: parte de estos textos la escribió ella misma y otra parte la prepara con la ayuda de modelos de lenguaje, siguiendo sus propias instrucciones. El resumen se escribe únicamente a partir del texto del libro. Desde noviembre de 2026, los resúmenes que un modelo escribe directamente en el sitio los contrasta con el libro un segundo modelo de otro desarrollador, que también revisa los análisis escritos allí y marca los pasajes dudosos. La redacción lee cada texto y lo publica ella misma; las citas se dan literalmente según el texto de la edición del sitio. Más sobre los análisis de libros: «Cómo se preparan los análisis de libros» más abajo.',
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
            [
              {
                kind: 'text',
                text: 'El resumen se escribe únicamente a partir del texto del libro.',
              },
            ],
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
              text: 'Un análisis se elabora con un modelo de lenguaje siguiendo las instrucciones de la redacción. En un análisis escrito directamente en el sitio, el modelo lee el texto de esta versión del libro (en un libro largo, resúmenes de capítulos y parte del texto), además del título, el autor, el idioma y la lista de capítulos. Después, un segundo modelo de otro desarrollador revisa lo escrito y marca los pasajes dudosos. La redacción lee el análisis y lo publica ella misma. Un análisis también puede cargarse ya terminado: entonces se prepara fuera del sitio con las mismas instrucciones.',
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
              text: 'Las instrucciones prohíben incluir fechas, datos biográficos, adaptaciones o fuentes sobre los que no haya certeza, y exigen presentar las interpretaciones como interpretaciones. Cuando se indican las fuentes, aparecen al final de la página del análisis. Lo que viene de fuera del libro —fechas, datos biográficos, adaptaciones, recepción— llega a un análisis escrito en el sitio solo con una fuente: el sitio abre la página indicada y comprueba que responde y menciona este libro o a su autor; si no, se descartan la fuente y las afirmaciones que dependían solo de ella. Esta comprobación muestra que la fuente existe y trata del libro, no que diga lo mismo, así que la redacción lee esos bloques antes de publicar.',
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
      id: 'world',
      heading: 'Cómo se preparan las páginas del mundo del libro',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las páginas del mundo del libro sobre los personajes y los lugares las prepara la Redacción de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Una página se prepara con un modelo de lenguaje siguiendo las instrucciones de la redacción, a partir del texto de esta versión del libro. En una página escrita directamente en el sitio, el modelo lee los capítulos en los que aparece el personaje o el lugar (en un libro largo, los capítulos en los que aparece con más frecuencia y los resúmenes de los capítulos en lugar del texto completo); después, un segundo modelo de otro desarrollador revisa la página y marca los pasajes dudosos. Una página también puede cargarse ya terminada: entonces se prepara fuera del sitio con las mismas instrucciones. La redacción lee la página y la publica ella misma; una página que no ha sido leída no se muestra en el sitio.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las citas se cotejan literalmente con el texto del libro publicado en Bibliaris: una cita que no está en el texto se rechaza al cargar la página en la redacción, y una que deja de coincidir después de corregirse el texto se oculta del sitio. Una cita no confirmada no llega al sitio. El número de capítulo junto a una cita o una escena es el número del capítulo en esta versión del sitio; enlaza a ese capítulo en el lector solo si el capítulo existe. Los capítulos en los que aparece un personaje o se menciona un lugar los cuenta un programa a partir del texto de los capítulos; no los escribe el modelo.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Todo lo que viene de fuera del libro (crítica, prototipos, adaptaciones) se incluye solo con una fuente, y sus fuentes se enumeran en la misma página, debajo del bloque. En una página escrita directamente en el sitio, el sitio abre la página indicada en cada bloque y comprueba que responde y menciona este libro o a su autor; una fuente que no lo cumple se quita de la lista del bloque, y un bloque en el que ninguna fuente se confirma se elimina. Esta comprobación muestra que la fuente existe y se refiere al libro, no que diga lo mismo, por lo que la redacción lee esos bloques antes de publicarlos.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las ilustraciones de los personajes y de los lugares las prepara manualmente la redacción con servicios externos de generación de imágenes a partir de la descripción del aspecto del personaje o del lugar en el texto del libro, sin rostros de actores reales de adaptaciones al cine y la televisión y sin imitar a artistas reconocibles. La redacción revisa y acepta cada ilustración antes de publicarla, y cada una lleva un pie que enlaza con esta sección. Una ilustración es una interpretación visual, no una imagen tomada del libro; una misma ilustración sirve a todas las versiones de idioma de la página.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El punto de un lugar real en el mapa procede solo de Wikidata: el modelo o la redacción indican el número del elemento de Wikidata y el sitio lee sus coordenadas por sí mismo. El punto se coloca solo si el elemento se refiere a la Tierra, las coordenadas están dentro de los límites válidos y el nombre del elemento en el idioma de la página (o su nombre común a todos los idiomas) coincide con el nombre del lugar o con una de sus formas; de lo contrario, el lugar no tiene punto, y un lugar ficticio no lo tiene nunca. El punto se vuelve a comprobar cuando cambian el número de Wikidata o los nombres del lugar (y, si Wikidata no respondió, la próxima vez que se guarde el lugar); no se actualiza por sí solo. El fondo del mapa es de OpenStreetMap (© OpenStreetMap contributors); el sitio guarda sus propias copias de los fragmentos del mapa, por lo que al abrir el mapa el lector no se conecta a OpenStreetMap.',
            },
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
