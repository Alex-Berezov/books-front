import 'server-only';
import {
  contactGeneral,
  contactPrivacy,
  contactResponseDays,
  contactRights,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'contact',
  lang: 'es',
  metaTitle: 'Contacto - Bibliaris',
  metaDescription:
    'Cómo contactar con Bibliaris: preguntas generales y soporte, errores en un texto o resumen, mensajes de titulares de derechos y solicitudes sobre datos personales.',
  title: 'Contacto',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'general',
      heading: 'Preguntas generales y soporte',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Preguntas, errores en el sitio y sugerencias: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Un error en un texto o resumen',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si has encontrado un error en el texto de un libro o en un resumen, escribe a ',
            },
            {
              kind: 'mailto',
              text: contactGeneral,
              email: contactGeneral,
              subject: 'Error en el texto de un libro o resumen',
            },
            { kind: 'text', text: '. Cómo corregimos los errores se describe en la ' },
            { kind: 'link', text: 'Política editorial', href: '/editorial-policy#corrections' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'Para titulares de derechos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si eres titular de derechos sobre una obra y crees que el material del sitio los afecta, escribe a ',
            },
            { kind: 'mailto', text: contactRights, email: contactRights },
            { kind: 'text', text: '. Indica en el mensaje:' },
          ],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'la obra de que se trata;' }],
            [{ kind: 'text', text: 'el enlace a la página del sitio donde aparece;' }],
            [{ kind: 'text', text: 'la acreditación de tus derechos;' }],
            [{ kind: 'text', text: 'tus datos de contacto.' }],
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Datos personales',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Solicitudes sobre tus datos personales (acceso, rectificación, supresión): ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. Lee la ' },
            { kind: 'link', text: 'Política de Privacidad', href: '/privacy' },
            { kind: 'text', text: ' y la página de ' },
            { kind: 'link', text: 'eliminación de datos', href: '/deletion' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'response',
      heading: 'Plazo de respuesta y responsable del sitio',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Respondemos en un plazo de ${contactResponseDays} días. Quién gestiona el sitio y su dirección postal figuran en el `,
            },
            { kind: 'link', text: 'Aviso legal', href: '/legal-notice' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
