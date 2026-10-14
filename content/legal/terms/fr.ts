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
  lang: 'fr',
  metaTitle: 'Conditions d’utilisation - Bibliaris',
  metaDescription:
    'Les règles d’utilisation de Bibliaris : comptes, ce qui est permis, à qui appartient le contenu, commentaires, titulaires de droits et droit applicable.',
  title: 'Conditions d’utilisation',
  updatedAt: '2026-10-14',
  toc: true,
  sections: [
    {
      id: 'operator',
      heading: '1. Qui fournit le service',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Bibliaris est fourni par ${operatorLegalName}, ${operatorStatusText.fr[operatorStatus].inline} (pays : ${countryName(operatorCountry, 'fr')}). En utilisant le site, vous acceptez les présentes conditions. Si vous ne les acceptez pas, merci de ne pas utiliser le site.`,
            },
          ],
        },
      ],
    },
    {
      id: 'service',
      heading: '2. Le service',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Bibliaris est une bibliothèque en ligne où vous pouvez lire des livres et leurs résumés et écouter des livres audio. Le service est gratuit. Nous pouvons ajouter, modifier ou retirer des fonctionnalités à tout moment.',
            },
          ],
        },
      ],
    },
    {
      id: 'account',
      heading: '3. Votre compte',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: `Vous devez avoir au moins ${minimumAge} ans pour créer un compte.`,
              },
            ],
            [
              {
                kind: 'text',
                text: 'Fournissez des informations exactes lors de votre inscription.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Gardez votre mot de passe secret : vous êtes responsable de ce qui se passe sur votre compte.',
              },
            ],
            [
              {
                kind: 'text',
                text: 'Vous pouvez nous demander de supprimer votre compte à tout moment : voir la page de ',
              },
              { kind: 'link', text: 'suppression des données', href: '/deletion' },
              { kind: 'text', text: '.' },
            ],
          ],
        },
      ],
    },
    {
      id: 'use',
      heading: '4. Ce qui est permis et ce qui ne l’est pas',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Vous pouvez utiliser le site pour lire et écouter à titre personnel et non commercial. Il est interdit :',
            },
          ],
        },
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'de télécharger du contenu en masse, d’aspirer le site ou d’en collecter le contenu de manière automatisée ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'de contourner les restrictions d’accès, y compris les restrictions par pays ;',
              },
            ],
            [
              {
                kind: 'text',
                text: 'de perturber le fonctionnement du site, de l’attaquer ou d’y téléverser du code malveillant ;',
              },
            ],
            [{ kind: 'text', text: 'de publier des commentaires contraires à la loi.' }],
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Nous pouvons restreindre ou fermer un compte qui enfreint ces règles.',
            },
          ],
        },
      ],
    },
    {
      id: 'content',
      heading: '5. Contenu',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les textes des livres reposent sur des éditions qui sont dans le domaine public. Les résumés, les descriptions et le design du site appartiennent à Bibliaris. Vous pouvez les citer avec un lien vers la page d’origine ; leur revente est interdite.',
            },
          ],
        },
      ],
    },
    {
      id: 'comments',
      heading: '6. Commentaires',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Vous êtes responsable de ce que vous écrivez. Nous pouvons masquer ou supprimer les commentaires qui enfreignent les présentes conditions.',
            },
          ],
        },
      ],
    },
    {
      id: 'availability',
      heading: '7. Disponibilité selon les pays',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Un livre peut ne pas être disponible dans certains pays.' },
          ],
        },
      ],
    },
    {
      id: 'rights-holders',
      heading: '8. Titulaires de droits',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si vous détenez des droits sur une œuvre et estimez que du contenu du site les concerne, écrivez-nous comme indiqué sur la page ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            {
              kind: 'text',
              text: ', dans la rubrique destinée aux titulaires de droits. Indiquez l’œuvre concernée, le lien vers la page où elle figure, la justification de vos droits et vos coordonnées.',
            },
          ],
        },
      ],
    },
    {
      id: 'liability',
      heading: '9. Absence de garantie et limitation de responsabilité',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le site est fourni en l’état, sans aucune garantie. Dans la mesure permise par la loi de votre pays, nous ne sommes pas responsables des pertes indirectes liées à l’utilisation du site. Rien dans les présentes conditions ne limite les droits que la loi de votre pays interdit de limiter.',
            },
          ],
        },
      ],
    },
    {
      id: 'law',
      heading: '10. Droit applicable',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Droit applicable : ${countryName(governingLawCountry, 'fr')}. Si vous êtes un consommateur dans l’Union européenne ou au Royaume-Uni, vous conservez la protection que vous accorde la loi de votre pays.`,
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      heading: '11. Modifications des présentes conditions',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Lorsque nous modifions ces conditions, nous publions la nouvelle version sur cette page et mettons à jour la date en haut de la page. Si vous continuez à utiliser le site ensuite, vous acceptez la nouvelle version.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      heading: '12. Contact',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Questions sur ces conditions : ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
