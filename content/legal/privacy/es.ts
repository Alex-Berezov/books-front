import 'server-only';
import { countryName } from '@/lib/i18n/countryName';
import { pluralize } from '@/lib/i18n/plural';
import {
  contactPrivacy,
  contactResponseDays,
  minimumAge,
  operatorCountry,
  operatorLegalName,
  retentionAnalyticsMonths,
  retentionBackupsMonths,
  retentionDeletionHours,
  retentionServerLogsDays,
  operatorStatus,
} from '@/lib/site/owner-facts';
import type { LegalDocument } from '../types';
import { operatorStatusText } from '../operator-status';

export const document: LegalDocument = {
  page: 'privacy',
  lang: 'es',
  metaTitle: 'Política de Privacidad - Bibliaris',
  metaDescription:
    'Quién gestiona Bibliaris, qué datos personales recoge el sitio, para qué, cuánto tiempo se conservan, quién los recibe y cómo ejercer tus derechos.',
  title: 'Política de Privacidad',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'who',
      heading: '1. Quiénes somos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris lo gestiona ${operatorLegalName}, ${operatorStatusText.es[operatorStatus].inline} (país: ${countryName(operatorCountry, 'es')}). Esta persona decide cómo y para qué se usan tus datos personales (el responsable del tratamiento).`,
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Preguntas sobre tus datos: ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            {
              kind: 'text',
              text: '. La dirección postal y los demás datos del responsable del sitio figuran en la página ',
            },
            { kind: 'link', text: 'Aviso legal', href: '/legal-notice' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'data',
      heading: '2. Qué datos recogemos',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Tu cuenta, si creas una:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'dirección de correo electrónico, contraseña (guardada solo como hash unidireccional), nombre y apodo, enlace a la foto de perfil, idioma de la interfaz;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'si inicias sesión con Google: el identificador de tu cuenta de Google, tu dirección de correo electrónico, tu nombre y tu foto de perfil tal como los envía Google;',
              },
            ],
            [{ kind: 'text', text: 'fecha de registro y del último inicio de sesión.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Lo que haces en el sitio con la sesión iniciada:' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'estantería, progreso de lectura, valoraciones, «me gusta» y visitas a libros vinculados a tu cuenta;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'comentarios. Un comentario es público y se muestra con tu nombre, tu apodo y tu foto de perfil.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Sin cuenta, el progreso de lectura se guarda solo en tu navegador y no nos llega.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Datos técnicos: tu dirección IP la tratan nuestro proveedor de alojamiento y Cloudflare para servir el sitio y protegerlo de abusos. Tu país se determina a partir de la dirección IP en cada solicitud y no se guarda en tu cuenta.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Analítica: estadísticas de visitas de Google Analytics, solo donde está permitido (consulta la sección 10).',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Mensajes: si nos escribes, también como titular de derechos, conservamos la correspondencia y tus datos de contacto durante el tiempo necesario para responder y resolver tu solicitud.',
            },
          ],
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Para qué usamos los datos y con qué base jurídica',
      blocks: [
        {
          kind: 'table',
          head: ['Finalidad', 'Base jurídica', 'Datos'],
          rows: [
            [
              [
                {
                  kind: 'text',
                  text: 'Tu cuenta y sus funciones: inicio de sesión, estantería, progreso de lectura, valoraciones, comentarios',
                },
              ],
              [{ kind: 'text', text: 'Contrato' }],
              [{ kind: 'text', text: 'Datos de la cuenta y lo que haces en el sitio' }],
            ],
            [
              [{ kind: 'text', text: 'Seguridad y protección frente a abusos' }],
              [{ kind: 'text', text: 'Interés legítimo' }],
              [
                {
                  kind: 'text',
                  text: 'Dirección IP, registros del servidor, intentos de inicio de sesión',
                },
              ],
            ],
            [
              [
                {
                  kind: 'text',
                  text: 'Determinar tu país: un libro puede no estar disponible en algunos países',
                },
              ],
              [{ kind: 'text', text: 'Interés legítimo' }],
              [{ kind: 'text', text: 'Dirección IP (el país no se guarda)' }],
            ],
            [
              [{ kind: 'text', text: 'Estadísticas de visitas (Google Analytics)' }],
              [
                {
                  kind: 'text',
                  text: 'Consentimiento en el EEE, el Reino Unido y Suiza, y cuando no se puede determinar tu país; interés legítimo en los demás lugares, y puedes oponerte',
                },
              ],
              [
                {
                  kind: 'text',
                  text: 'Cookies de analítica, páginas visitadas, datos del dispositivo y del navegador',
                },
              ],
            ],
            [
              [{ kind: 'text', text: 'Responder a tus mensajes' }],
              [{ kind: 'text', text: 'Interés legítimo' }],
              [{ kind: 'text', text: 'Dirección de correo electrónico y correspondencia' }],
            ],
          ],
        },
      ],
    },
    {
      id: 'recipients',
      heading: '4. Quién recibe los datos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Recurrimos a estos proveedores de servicios, y solo para estas tareas:',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Namecheap, Inc. (EE. UU.): alojamiento de los servidores del sitio y de la base de datos;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Cloudflare: entrega de contenido, protección, detección del país, almacenamiento de portadas y audio;',
              },
            ],
            [{ kind: 'text', text: 'Google: Google Analytics e inicio de sesión con Google.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'No vendemos tus datos personales.' }],
        },
      ],
    },
    {
      id: 'transfers',
      heading: '5. Transferencias fuera de tu país',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Los proveedores mencionados tienen su sede en los Estados Unidos; Cloudflare además opera mediante servidores en todo el mundo. Estas transferencias se basan en las garantías adecuadas que prevé la ley (artículos 45 y 46 del RGPD); para pedir una copia, escribe a ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'retention',
      heading: '6. Cuánto tiempo conservamos los datos',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Datos de la cuenta y lo que haces en el sitio: hasta que se elimina la cuenta. Tras una solicitud de eliminación, los datos se borran de la base de datos activa en un plazo de ${retentionDeletionHours} horas; en las copias de seguridad permanecen hasta ${retentionBackupsMonths} meses, tras los cuales las copias se sobrescriben.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Se conserva un registro técnico de que una cuenta fue eliminada, sin tu dirección de correo electrónico ni tu nombre.',
              },
            ],
            [
              {
                kind: 'text',
                text: `Registros del servidor con direcciones IP: ${retentionServerLogsDays} días.`,
              },
            ],
            [
              {
                kind: 'text',
                text: `Datos de Google Analytics sobre visitantes concretos y sus acciones: hasta ${retentionAnalyticsMonths} ${pluralize(retentionAnalyticsMonths, 'es', { one: 'mes', few: 'meses', many: 'meses' })} después de tu última visita. Las estadísticas agregadas de visitas, sin identificadores, se conservan más tiempo.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Correspondencia: el tiempo necesario para responder y resolver la solicitud.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '7. Tus derechos',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Tienes derecho a:' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'acceder a tus datos y obtener una copia;' }],
            [{ kind: 'text', text: 'que se rectifiquen los datos inexactos;' }],
            [
              { kind: 'text', text: 'que se supriman tus datos (consulta la página de ' },
              { kind: 'link', text: 'eliminación de datos', href: '/deletion' },
              { kind: 'text', text: ');' },
            ],
            [{ kind: 'text', text: 'limitar el uso de tus datos;' }],
            [{ kind: 'text', text: 'recibir tus datos en un formato portable;' }],
            [{ kind: 'text', text: 'oponerte al uso basado en el interés legítimo;' }],
            [
              {
                kind: 'text',
                text: 'retirar tu consentimiento en cualquier momento, por ejemplo en la configuración de cookies;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'presentar una reclamación ante una autoridad de protección de datos.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Para ejercer estos derechos, escribe a ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: `. Respondemos en un plazo de ${contactResponseDays} días.` },
          ],
        },
      ],
    },
    {
      id: 'regions',
      heading: '8. Por región',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'EEE, Reino Unido, Suiza: tienes los derechos de la sección 7 conforme al RGPD, al UK GDPR o a la LPD suiza, y puedes presentar una reclamación ante la autoridad de protección de datos del lugar donde vives o trabajas.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Estados Unidos, California (CCPA/CPRA): recogemos las categorías de datos enumeradas en la sección 2: identificadores, datos de la cuenta, actividad en el sitio y datos de analítica. Usamos Google Analytics para medir las visitas. No vendemos información personal. Respetamos la señal Global Privacy Control: con ella, la analítica no se carga. Tienes derecho a saber qué datos tenemos, a eliminarlos y a rectificarlos, y a no ser discriminado por ejercer estos derechos.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Brasil (LGPD): tienes los derechos del artículo 18, entre ellos la confirmación del tratamiento, el acceso, la rectificación, la anonimización, el bloqueo o la eliminación, la portabilidad, la información sobre con quién se comparten los datos y la retirada del consentimiento. Las solicitudes se envían a la dirección de la sección 7.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'children',
      heading: '9. Menores',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Para crear una cuenta debes tener al menos ${minimumAge} años. No recogemos a sabiendas datos de menores de esa edad; si crees que lo hemos hecho, escribe a `,
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: ' y los eliminaremos.' },
          ],
        },
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Usamos cookies imprescindibles para el inicio de sesión y, donde está permitido, cookies de Google Analytics. Qué cookies, durante cuánto tiempo y cómo cambiar tu elección se explica en la ',
            },
            { kind: 'link', text: 'Política de Cookies', href: '/cookies' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Seguridad',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'El sitio funciona solo mediante una conexión cifrada (HTTPS). Las contraseñas se guardan solo como hash unidireccional. El acceso a las herramientas de administración está limitado a los roles del personal.',
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '12. Cambios en esta política',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Cuando cambiamos esta política, publicamos la nueva versión en esta página y actualizamos la fecha que figura al principio.',
            },
          ],
        },
      ],
    },
  ],
};
