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
  lang: 'fr',
  metaTitle: 'Politique de Confidentialité - Bibliaris',
  metaDescription:
    'Qui gère Bibliaris, quelles données personnelles le site collecte, dans quel but, combien de temps elles sont conservées, qui les reçoit et comment exercer vos droits.',
  title: 'Politique de Confidentialité',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'who',
      heading: '1. Qui nous sommes',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris est géré par ${operatorLegalName}, ${operatorStatusText.fr[operatorStatus].inline} (pays : ${countryName(operatorCountry, 'fr')}). C’est cette personne qui décide comment et pourquoi vos données personnelles sont utilisées (le responsable du traitement).`,
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions sur vos données : ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            {
              kind: 'text',
              text: '. L’adresse postale et les autres informations sur l’éditeur du site figurent dans les ',
            },
            { kind: 'link', text: 'Mentions légales', href: '/legal-notice' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'data',
      heading: '2. Les données que nous collectons',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Votre compte, si vous en créez un :' }],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'adresse e-mail, mot de passe (conservé uniquement sous forme de hachage irréversible), nom et pseudonyme, lien vers la photo de profil, langue de l’interface ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'si vous vous connectez avec Google : l’identifiant de votre compte Google, votre adresse e-mail, votre nom et votre photo de profil tels que transmis par Google ;',
              },
            ],
            [{ kind: 'text', text: 'date d’inscription et date de la dernière connexion.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Ce que vous faites sur le site lorsque vous êtes connecté :' },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'bibliothèque personnelle, progression de lecture, notes, mentions « J’aime » et consultations de livres liées à votre compte ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'commentaires. Un commentaire est public et s’affiche avec votre nom, votre pseudonyme et votre photo de profil.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Sans compte, la progression de lecture n’est conservée que dans votre navigateur et ne nous est pas transmise.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Données techniques : votre adresse IP est traitée par notre hébergeur et par Cloudflare afin de fournir le site et de le protéger contre les abus. Votre pays est déterminé à partir de l’adresse IP à chaque requête et n’est pas enregistré dans votre compte.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Mesure d’audience : statistiques de visite de Google Analytics, uniquement là où c’est autorisé (voir la section 10).',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Messages : si vous nous écrivez, y compris en tant que titulaire de droits, nous conservons la correspondance et vos coordonnées aussi longtemps que nécessaire pour vous répondre et traiter votre demande.',
            },
          ],
        },
      ],
    },
    {
      id: 'purposes',
      heading: '3. Pourquoi nous utilisons les données et sur quelle base légale',
      blocks: [
        {
          kind: 'table',
          head: ['Finalité', 'Base légale', 'Données'],
          rows: [
            [
              [
                {
                  kind: 'text',
                  text: 'Votre compte et ses fonctionnalités : connexion, bibliothèque, progression de lecture, notes, commentaires',
                },
              ],
              [{ kind: 'text', text: 'Contrat' }],
              [{ kind: 'text', text: 'Données du compte et ce que vous faites sur le site' }],
            ],
            [
              [{ kind: 'text', text: 'Sécurité et protection contre les abus' }],
              [{ kind: 'text', text: 'Intérêt légitime' }],
              [
                {
                  kind: 'text',
                  text: 'Adresse IP, journaux du serveur, tentatives de connexion',
                },
              ],
            ],
            [
              [
                {
                  kind: 'text',
                  text: 'Détermination de votre pays : un livre peut ne pas être disponible dans certains pays',
                },
              ],
              [{ kind: 'text', text: 'Intérêt légitime' }],
              [{ kind: 'text', text: 'Adresse IP (le pays n’est pas enregistré)' }],
            ],
            [
              [{ kind: 'text', text: 'Statistiques de visite (Google Analytics)' }],
              [
                {
                  kind: 'text',
                  text: 'Consentement dans l’EEE, au Royaume-Uni et en Suisse, ainsi que lorsque votre pays ne peut pas être déterminé ; intérêt légitime ailleurs, avec possibilité de vous y opposer',
                },
              ],
              [
                {
                  kind: 'text',
                  text: 'Cookies de mesure d’audience, pages consultées, données sur l’appareil et le navigateur',
                },
              ],
            ],
            [
              [{ kind: 'text', text: 'Réponse à vos messages' }],
              [{ kind: 'text', text: 'Intérêt légitime' }],
              [{ kind: 'text', text: 'Adresse e-mail et correspondance' }],
            ],
          ],
        },
      ],
    },
    {
      id: 'recipients',
      heading: '4. Qui reçoit les données',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Nous faisons appel aux prestataires suivants, et uniquement pour ces tâches :',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Namecheap, Inc. (États-Unis) : hébergement des serveurs du site et de la base de données ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Cloudflare : diffusion du contenu, protection, détection du pays, stockage des couvertures et des fichiers audio ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Google : Google Analytics et connexion avec Google.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Nous ne vendons pas vos données personnelles.' }],
        },
      ],
    },
    {
      id: 'transfers',
      heading: '5. Transferts hors de votre pays',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les prestataires ci-dessus sont établis aux États-Unis ; Cloudflare utilise en outre des serveurs répartis dans le monde entier. Ces transferts reposent sur les garanties appropriées prévues par la loi (articles 45 et 46 du RGPD) ; pour en obtenir une copie, écrivez à ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'retention',
      heading: '6. Durée de conservation des données',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Données du compte et ce que vous faites sur le site : jusqu’à la suppression du compte. Après une demande de suppression, les données sont effacées de la base de données active sous ${retentionDeletionHours} heures ; elles subsistent dans les sauvegardes pendant ${retentionBackupsMonths} mois au maximum, après quoi les sauvegardes sont écrasées.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Une trace technique de la suppression du compte est conservée, sans votre adresse e-mail ni votre nom.',
              },
            ],
            [
              {
                kind: 'text',
                text: `Journaux du serveur contenant les adresses IP : ${retentionServerLogsDays} jours.`,
              },
            ],
            [
              {
                kind: 'text',
                text: `Données de Google Analytics sur chaque visiteur et ses actions : jusqu’à ${retentionAnalyticsMonths} ${pluralize(retentionAnalyticsMonths, 'fr', { one: 'mois', few: 'mois', many: 'mois' })} après votre dernière visite. Les statistiques de visite agrégées, sans identifiant, sont conservées plus longtemps.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Correspondance : aussi longtemps que nécessaire pour répondre et traiter la demande.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '7. Vos droits',
      blocks: [
        {
          kind: 'paragraph',
          content: [{ kind: 'text', text: 'Vous avez le droit :' }],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'd’accéder à vos données et d’en obtenir une copie ;' }],
            [{ kind: 'text', text: 'de faire rectifier les données inexactes ;' }],
            [
              { kind: 'text', text: 'de faire supprimer vos données (voir la page de ' },
              { kind: 'link', text: 'suppression des données', href: '/deletion' },
              { kind: 'text', text: ') ;' },
            ],
            [{ kind: 'text', text: 'de limiter l’utilisation de vos données ;' }],
            [{ kind: 'text', text: 'de recevoir vos données dans un format portable ;' }],
            [
              {
                kind: 'text',
                text: 'de vous opposer à une utilisation fondée sur l’intérêt légitime ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'de retirer votre consentement à tout moment, par exemple dans les paramètres des cookies ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'd’introduire une réclamation auprès d’une autorité de protection des données.',
              },
            ],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Pour exercer ces droits, écrivez à ' },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            {
              kind: 'text',
              text: `. Nous répondons dans un délai de ${contactResponseDays} jours.`,
            },
          ],
        },
      ],
    },
    {
      id: 'regions',
      heading: '8. Selon votre région',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'EEE, Royaume-Uni, Suisse : vous disposez des droits de la section 7 en vertu du RGPD, du UK GDPR ou de la LPD suisse, et vous pouvez introduire une réclamation auprès de l’autorité de protection des données du lieu où vous vivez ou travaillez.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'États-Unis, Californie (CCPA/CPRA) : nous collectons les catégories de données énumérées à la section 2 : identifiants, données du compte, activité sur le site et données de mesure d’audience. Nous utilisons Google Analytics pour mesurer les visites. Nous ne vendons pas d’informations personnelles. Nous respectons le signal Global Privacy Control : lorsqu’il est envoyé, la mesure d’audience ne se charge pas. Vous avez le droit de savoir quelles données nous détenons, de les supprimer et de les rectifier, et de ne pas subir de discrimination pour avoir exercé ces droits.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Brésil (LGPD) : vous disposez des droits prévus à l’article 18, notamment la confirmation du traitement, l’accès, la rectification, l’anonymisation, le blocage ou la suppression, la portabilité, l’information sur le partage des données et le retrait du consentement. Les demandes sont à adresser à l’adresse indiquée à la section 7.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'children',
      heading: '9. Enfants',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Vous devez avoir au moins ${minimumAge} ans pour créer un compte. Nous ne collectons pas sciemment de données d’enfants plus jeunes ; si vous pensez que cela s’est produit, écrivez à `,
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: ' et nous les supprimerons.' },
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
              text: 'Nous utilisons des cookies indispensables à la connexion et, là où c’est autorisé, les cookies de Google Analytics. Les cookies utilisés, leur durée et la manière de modifier votre choix sont décrits dans la ',
            },
            { kind: 'link', text: 'Politique relative aux cookies', href: '/cookies' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'security',
      heading: '11. Sécurité',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le site fonctionne uniquement via une connexion chiffrée (HTTPS). Les mots de passe sont conservés uniquement sous forme de hachage irréversible. L’accès aux outils d’administration est réservé aux rôles du personnel.',
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '12. Modifications de cette politique',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Lorsque nous modifions cette politique, nous publions la nouvelle version sur cette page et mettons à jour la date en haut de la page.',
            },
          ],
        },
      ],
    },
  ],
};
