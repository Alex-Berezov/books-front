import 'server-only';
import type { LegalDocument } from '../types';

export const document: LegalDocument = {
  page: 'editorial-policy',
  lang: 'fr',
  metaTitle: 'Politique éditoriale - Bibliaris',
  metaDescription:
    'D’où viennent les textes de Bibliaris, qui prépare les résumés et écrit les descriptions, comment sont rédigées les analyses de livres, comment les textes des livres sont préparés et comment les erreurs sont corrigées.',
  title: 'Politique éditoriale',
  updatedAt: '2026-11-23',
  toc: false,
  sections: [
    {
      id: 'who',
      heading: 'Qui écrit',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les descriptions des livres sont écrites et révisées par des personnes : la rédaction de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'La rédaction prépare les résumés ainsi que les analyses de personnages, de symboles et de citations dans les blocs des pages des livres : elle a écrit elle-même une partie de ces textes et en prépare une autre partie avec l’aide de modèles de langage, selon ses propres consignes. Un résumé est écrit uniquement à partir du texte du livre. Depuis novembre 2026, les résumés qu’un modèle écrit directement sur le site sont comparés au livre par un second modèle, d’un autre développeur, qui relit aussi les analyses écrites sur le site et signale les passages douteux. La rédaction lit chaque texte et le publie elle-même ; les citations sont reproduites mot pour mot d’après le texte de l’édition publiée sur le site. Plus sur les analyses de livres : « Comment sont préparées les analyses de livres » ci-dessous.',
            },
          ],
        },
      ],
    },
    {
      id: 'sources',
      heading: 'D’où viennent les textes des livres',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les textes des livres sont publiés d’après des éditions qui sont dans le domaine public.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Un livre peut ne pas être disponible dans certains pays.' },
          ],
        },
      ],
    },
    {
      id: 'preparation',
      heading: 'Comment un texte est préparé',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Le texte d’une édition est conservé tel quel. Seules les coquilles de la reconnaissance de texte et la typographie sont corrigées. Rien n’est abrégé ni résumé à l’intérieur du texte d’un livre.',
            },
          ],
        },
      ],
    },
    {
      id: 'summaries',
      heading: 'Comment les résumés sont écrits',
      blocks: [
        {
          kind: 'list',
          items: [
            [
              {
                kind: 'text',
                text: 'Un résumé rend l’intrigue et les idées d’un livre. Il ne remplace pas le livre.',
              },
            ],
            [{ kind: 'text', text: 'Un résumé peut dévoiler l’intrigue.' }],
            [{ kind: 'text', text: 'Un résumé est écrit uniquement à partir du texte du livre.' }],
          ],
        },
      ],
    },
    {
      id: 'analysis',
      heading: 'Comment sont préparées les analyses de livres',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les pages d’analyse sont préparées par la Rédaction de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Une analyse est rédigée à l’aide d’un modèle de langage selon les consignes de la rédaction. Pour une analyse écrite directement sur le site, le modèle lit le texte de cette version du livre (pour un livre long, des résumés de chapitres et une partie du texte), ainsi que le titre, l’auteur, la langue et la liste des chapitres. Un second modèle, d’un autre développeur, relit ensuite ce qui a été écrit et signale les passages douteux. La rédaction lit l’analyse et la publie elle-même. Une analyse peut aussi être importée toute prête : elle est alors rédigée hors du site selon les mêmes consignes.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'L’analyse dans chaque langue est rédigée séparément pour les lecteurs de cette langue, et non traduite d’une autre ; les rubriques peuvent donc varier d’une langue à l’autre.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les consignes exigent que les citations soient reproduites mot pour mot d’après l’édition du livre publiée sur Bibliaris. Le numéro de chapitre à côté d’une citation est celui du chapitre de cette version sur le site ; il renvoie à ce chapitre dans la liseuse seulement si le chapitre existe. Lors de l’import d’une analyse, les numéros de chapitre sont vérifiés automatiquement : si un chapitre n’existe pas dans cette version, la rédaction voit un avertissement.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les consignes interdisent d’inclure des dates, des faits biographiques, des adaptations ou des sources incertains, et demandent de présenter les interprétations comme des interprétations. Lorsque des sources sont indiquées, elles sont citées en bas de la page d’analyse. Ce qui vient de l’extérieur du livre — dates, faits biographiques, adaptations, réception — n’entre dans une analyse écrite sur le site qu’avec une source : le site ouvre la page indiquée et vérifie qu’elle répond et qu’elle mentionne ce livre ou son auteur ; sinon, la source et les affirmations qui ne reposaient que sur elle sont écartées. Ce contrôle montre qu’une source existe et concerne le livre, pas qu’elle dit la même chose ; la rédaction lit donc ces blocs avant de publier.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Vous pouvez signaler une erreur dans une analyse sur la page ' },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ', comme décrit dans « Corrections ».' },
          ],
        },
      ],
    },
    {
      id: 'world',
      heading: 'Comment sont préparées les pages de l’univers du livre',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les pages de l’univers du livre consacrées aux personnages sont préparées par la Rédaction de Bibliaris.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Une page est préparée avec un modèle de langage selon les consignes de la rédaction, à partir du texte de cette version du livre. Pour une page écrite directement sur le site, le modèle lit les chapitres où apparaît le personnage (pour un livre long, les chapitres où il apparaît le plus souvent et les résumés des chapitres plutôt que le texte entier) ; un second modèle, d’un autre développeur, vérifie ensuite la page et signale les passages douteux. Une page peut aussi être importée toute prête : elle est alors rédigée hors du site selon les mêmes consignes. La rédaction relit la page et la publie elle-même ; une page non relue n’est pas affichée sur le site.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les citations sont vérifiées mot pour mot avec le texte du livre publié sur Bibliaris : une citation absente du texte est rejetée lors de l’import de la page dans la rédaction, et une citation qui ne correspond plus au texte après sa correction est masquée sur le site. Une citation non confirmée n’apparaît pas sur le site. Le numéro de chapitre à côté d’une citation ou d’une scène est celui du chapitre dans cette version sur le site ; il renvoie à ce chapitre dans le lecteur seulement si le chapitre existe. Les chapitres où apparaît un personnage sont comptés par un programme à partir du texte des chapitres, ils ne sont pas écrits par le modèle.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Tout ce qui vient de l’extérieur du livre (critique, prototypes, adaptations) n’est inclus qu’avec une source, et ses sources sont listées sur la même page, sous le bloc. Pour une page écrite directement sur le site, le site ouvre la page indiquée pour chaque bloc et vérifie qu’elle répond et mentionne ce livre ou son auteur ; une source qui ne passe pas la vérification est retirée de la liste du bloc, et un bloc dont aucune source n’est confirmée est supprimé. Cette vérification montre qu’une source existe et concerne le livre, non qu’elle dise la même chose ; c’est pourquoi la rédaction relit ces blocs avant de publier.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les illustrations des personnages sont créées avec un modèle de génération d’images à partir de la description de l’apparence du personnage dans le texte du livre, sans les visages d’acteurs réels d’adaptations à l’écran et sans imiter d’artistes reconnaissables. La rédaction vérifie et accepte chaque illustration avant de la publier, et chaque illustration porte une légende qui renvoie à cette section. Une illustration est une interprétation visuelle, non un portrait tiré du livre ; une même illustration sert toutes les versions linguistiques de la page.',
            },
          ],
        },
      ],
    },
    {
      id: 'translations',
      heading: 'Traductions',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si le traducteur d’un livre est connu, il est indiqué sur la page du livre.',
            },
          ],
        },
      ],
    },
    {
      id: 'authors',
      heading: 'Pages des auteurs',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Les informations des pages d’auteurs — dates et lieux de vie, chronologie, influences, prix, adaptations et faits intéressants — proviennent de sources ouvertes. Lorsque des sources sont indiquées, elles sont citées en bas de la page de l’auteur.',
            },
          ],
        },
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Vous pouvez signaler une erreur sur la page d’un auteur sur la page ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            { kind: 'text', text: ', comme décrit dans « Corrections ».' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Corrections',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Si vous remarquez une erreur dans un texte, un résumé ou une description, signalez-la-nous sur la page ',
            },
            { kind: 'link', text: 'Contact', href: '/contact' },
            {
              kind: 'text',
              text: '. L’erreur est corrigée ; si elle se trouvait dans un résumé, la date « Mis à jour » de ce résumé change.',
            },
          ],
        },
      ],
    },
  ],
};
