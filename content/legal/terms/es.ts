import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'terms',
  lang: 'es',
  metaTitle: 'Términos de Servicio - Bibliaris',
  metaDescription:
    'Lee nuestros términos de servicio para conocer las normas y directrices de uso de nuestra biblioteca digital.',
  title: 'Términos de Servicio',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Aceptación de los Términos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Al acceder o utilizar Bibliaris, aceptas quedar vinculado por estos Términos de Servicio. Si no aceptas todos los términos, no podrás acceder ni utilizar nuestra plataforma.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Cuentas y Registro',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Para utilizar determinadas funciones, debes registrar una cuenta. Aceptas proporcionar información veraz y mantener seguras tus credenciales. Eres responsable de toda la actividad en tu cuenta.',
            },
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Uso del Contenido',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Todos los libros, audiolibros, metadatos, imágenes y demás materiales de Bibliaris son propiedad intelectual de Bibliaris o de sus licenciantes. Puedes acceder a este contenido estrictamente para uso personal y no comercial.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Terminación',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Nos reservamos el derecho de suspender o cancelar tu cuenta o tu acceso a la plataforma a nuestra entera discreción, sin previo aviso, por conductas que consideremos que infringen estos Términos o que resultan perjudiciales para otros usuarios o para nuestros intereses comerciales.',
            },
          ],
        },
      ],
    },
    {
      id: 's5',
      heading: '5. Contáctanos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Para cualquier pregunta relativa a estos Términos, ponte en contacto con nosotros en ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
