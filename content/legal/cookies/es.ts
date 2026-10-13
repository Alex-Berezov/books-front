import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'cookies',
  lang: 'es',
  metaTitle: 'Política de Cookies - Bibliaris',
  metaDescription:
    'Qué cookies y qué almacenamiento del navegador usa Bibliaris, para qué, durante cuánto tiempo y cómo cambiar tu elección sobre la analítica.',
  title: 'Política de Cookies',
  updatedAt: '2026-10-13',
  toc: true,
  sections: [
    {
      id: 's1',
      heading: '1. Qué son las cookies y las tecnologías similares',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Las cookies son pequeños archivos que un sitio web guarda en tu navegador. Los sitios también usan tecnologías similares: el almacenamiento local (localStorage) conserva los datos en tu dispositivo hasta que se borran, y el almacenamiento de sesión (sessionStorage) solo hasta que cierras la pestaña.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'En esta política, «cookies» se refiere a las tres.' }],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Cuáles usamos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'La tabla recoge todo lo que Bibliaris guarda en tu navegador. Se genera a partir de la misma lista que usa nuestro código, así que no falta nada.',
            },
          ],
        },
        { kind: 'widget', widget: 'cookie-table' },
      ],
    },
    {
      id: 's3',
      heading: '3. Cookies imprescindibles',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Sin ellas no funcionan el inicio de sesión, mantener la sesión iniciada, la protección de los formularios ni tus elecciones guardadas. No se usan para publicidad ni para analítica, por eso no pedimos consentimiento para ellas.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Cookies de analítica',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Usamos Google Analytics 4. Cuenta qué páginas se visitan. Su cookie guarda un identificador aleatorio de tu navegador, y nosotros solo vemos estadísticas agregadas, no quién eres. Usamos estas cifras para saber qué libros se leen y qué mejorar.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Google trata estos datos según sus propias normas: ' },
            {
              kind: 'external',
              text: 'cómo usa Google la información de los sitios que utilizan sus servicios',
              href: 'https://policies.google.com/technologies/partner-sites',
            },
            { kind: 'text', text: '.' },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'En los países del Espacio Económico Europeo, en el Reino Unido y en Suiza, así como cuando no podemos saber tu país, Google Analytics solo se carga después de que pulses «Aceptar». En los demás países la analítica está activada por defecto y puedes desactivarla más abajo.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Tu elección',
      blocks: [
        { kind: 'widget', widget: 'consent-choice' },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'También puedes borrar las cookies o bloquearlas en la configuración de tu navegador. Si las borras, el sitio volverá a pedirte tu elección donde sea necesario.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si tu navegador envía la señal Global Privacy Control, la tratamos como un rechazo: la analítica no se carga en ningún país, aunque antes hayas pulsado «Aceptar».',
            },
          ],
        },
      ],
    },
    {
      id: 's6',
      heading: '6. Cambios en esta política',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'La fecha al principio de la página indica cuándo cambió por última vez el contenido de esta política. Si añadimos nueva analítica o nuevas finalidades, volveremos a preguntar a quienes aceptaron la analítica. Un rechazo sigue vigente.',
            },
          ],
        },
      ],
    },
    {
      id: 's7',
      heading: '7. Contacto',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Preguntas sobre las cookies: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '. Cómo tratamos los datos personales se explica en nuestra ' },
            { kind: 'link', text: 'Política de Privacidad', href: '/privacy' },
            { kind: 'text', text: '.' },
            { kind: 'text', text: ' Otras formas de contactarnos están en la página de ' },
            { kind: 'link', text: 'Contacto', href: '/contact' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
