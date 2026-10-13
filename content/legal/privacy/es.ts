import 'server-only';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'es',
  metaTitle: 'Política de Privacidad - Bibliaris',
  metaDescription:
    'Lee nuestra política de privacidad para saber cómo recopilamos, usamos y protegemos tus datos.',
  title: 'Política de Privacidad',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. Información que Recopilamos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cuando utilizas nuestro servicio, podemos recopilar información personal como tu nombre, tu dirección de correo electrónico y tu foto de perfil, principalmente cuando te registras o inicias sesión mediante servicios de terceros como Google o Facebook.',
            },
          ],
        },
      ],
    },
    {
      id: 's2',
      heading: '2. Cómo Usamos tu Información',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Usamos la información que recopilamos para:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'Proporcionar, mantener y mejorar nuestros servicios;' }],
            [{ kind: 'text', text: 'Personalizar tu experiencia de lectura y tu estantería;' }],
            [
              {
                kind: 'text',
                text: 'Autenticar tu identidad mediante correo electrónico/contraseña o proveedores OAuth;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Comunicarnos contigo sobre actualizaciones, alertas de seguridad y avisos relacionados con tu cuenta.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 's3',
      heading: '3. Compartición de Datos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'No vendemos tus datos personales. Solo compartimos datos con proveedores de autenticación de terceros (Google, Facebook) para facilitar flujos de inicio de sesión seguros.',
            },
          ],
        },
      ],
    },
    {
      id: 's4',
      heading: '4. Eliminación y Conservación de Datos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar la eliminación de tu cuenta y de todos los datos personales asociados en cualquier momento escribiéndonos a ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: ', o siguiendo las Instrucciones de Eliminación de Datos.' },
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
              text: 'Si tienes alguna pregunta sobre esta Política de Privacidad, contáctanos en ',
            },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
