import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import {
  contactGeneral,
  governingLawCountry,
  minimumAge,
  operatorCountry,
  operatorLegalName,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'es',
  metaTitle: 'Términos de Servicio - Bibliaris',
  metaDescription:
    'Las normas de uso de Bibliaris: cuentas, qué está permitido, a quién pertenece el contenido, comentarios, titulares de derechos y ley aplicable.',
  title: 'Términos de Servicio',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'operator',
      heading: '1. Quién presta el servicio',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris lo presta ${operatorLegalName}, ${operatorStatusText.es[operatorStatus].inline} (país: ${countryName(operatorCountry, 'es')}). Al usar el sitio, aceptas estos términos. Si no los aceptas, te pedimos que no uses el sitio.`,
            },
          ],
        },
      ],
    },
    {
      id: 'service',
      heading: '2. El servicio',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris es una biblioteca en línea donde puedes leer libros y sus resúmenes y escuchar audiolibros. El servicio es gratuito. Podemos añadir, cambiar o retirar funciones en cualquier momento.',
            },
          ],
        },
      ],
    },
    {
      id: 'account',
      heading: '3. Tu cuenta',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Para crear una cuenta debes tener al menos ${minimumAge} años.`,
              },
            ],
            [{ kind: 'text', text: 'Proporciona información veraz al registrarte.' }],
            [
              {
                kind: 'text',
                text: 'Mantén tu contraseña en secreto; eres responsable de lo que ocurra en tu cuenta.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Puedes pedirnos que eliminemos tu cuenta en cualquier momento: consulta la página de ',
              },
              { kind: 'link', text: 'eliminación de datos', href: '/deletion' },
              { kind: 'text', text: '.' },
            ],
          ],
        },
      ],
    },
    {
      id: 'use',
      heading: '4. Qué está permitido y qué no',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Puedes usar el sitio para leer y escuchar con fines personales y no comerciales. No está permitido:',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'descargar contenido de forma masiva, hacer scraping del sitio o recopilar su contenido de forma automatizada;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'eludir las restricciones de acceso, incluidas las restricciones por país;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'interferir en el funcionamiento del sitio, atacarlo o subir código malicioso;',
              },
            ],
            [{ kind: 'text', text: 'publicar comentarios que infrinjan la ley.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Podemos limitar o cerrar una cuenta que incumpla estas normas.',
            },
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: '5. Contenido',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Los textos de los libros se basan en ediciones de dominio público. Los resúmenes, las descripciones y el diseño del sitio pertenecen a Bibliaris. Puedes citarlos con un enlace a la página de origen; no está permitido revenderlos.',
            },
          ],
        },
      ],
    },
    {
      id: 'comments',
      heading: '6. Comentarios',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Eres responsable de lo que escribes. Podemos ocultar o eliminar los comentarios que incumplan estos términos.',
            },
          ],
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Disponibilidad por país',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Un libro puede no estar disponible en algunos países.' },
          ],
        },
      ],
    },
    {
      id: 'rights-holders',
      heading: '8. Titulares de derechos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si eres titular de derechos sobre una obra y crees que el material del sitio los afecta, escríbenos como se indica en la página de ',
            },
            { kind: 'link', text: 'Contacto', href: '/contact' },
            {
              kind: 'text',
              text: ', en el apartado para titulares de derechos. Indica la obra de que se trata, el enlace a la página donde aparece, la acreditación de tus derechos y tus datos de contacto.',
            },
          ],
        },
      ],
    },
    {
      id: 'liability',
      heading: '9. Ausencia de garantías y limitación de responsabilidad',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El sitio se ofrece tal cual, sin garantías. En la medida en que lo permita la ley de tu país, no respondemos de los daños indirectos derivados del uso del sitio. Nada de lo dispuesto en estos términos limita los derechos que la ley de tu país no permite limitar.',
            },
          ],
        },
      ],
    },
    {
      id: 'law',
      heading: '10. Ley aplicable',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Ley aplicable: ${countryName(governingLawCountry, 'es')}. Si eres consumidor en la Unión Europea o en el Reino Unido, conservas la protección que te otorga la ley de tu país.`,
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Cambios en estos términos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cuando cambiamos estos términos, publicamos la nueva versión en esta página y actualizamos la fecha que figura al principio. Si sigues usando el sitio después, aceptas la nueva versión.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Contacto',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Preguntas sobre estos términos: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
