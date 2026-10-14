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
  lang: 'pt',
  metaTitle: 'Contato - Bibliaris',
  metaDescription:
    'Como falar com o Bibliaris: perguntas gerais e suporte, erros em um texto ou resumo, mensagens de titulares de direitos e pedidos sobre dados pessoais.',
  title: 'Contato',
  updatedAt: '2026-10-14',
  toc: false,
  sections: [
    {
      id: 'general',
      heading: 'Perguntas gerais e suporte',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Perguntas, erros no site e sugestões: ' },
            { kind: 'mailto', text: contactGeneral, email: contactGeneral },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'corrections',
      heading: 'Um erro em um texto ou resumo',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Se você encontrou um erro no texto de um livro ou em um resumo, escreva para ',
            },
            {
              kind: 'mailto',
              text: contactGeneral,
              email: contactGeneral,
              subject: 'Erro no texto de um livro ou resumo',
            },
            { kind: 'text', text: '. Como corrigimos os erros está descrito na ' },
            { kind: 'link', text: 'Política editorial', href: '/editorial-policy#corrections' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'Para titulares de direitos',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Se você detém direitos sobre uma obra e acredita que o material do site os afeta, escreva para ',
            },
            { kind: 'mailto', text: contactRights, email: contactRights },
            { kind: 'text', text: '. Na mensagem, informe:' },
          ],
        },
        {
          kind: 'list',
          items: [
            [{ kind: 'text', text: 'a obra em questão;' }],
            [{ kind: 'text', text: 'o link da página do site onde ela aparece;' }],
            [{ kind: 'text', text: 'a comprovação dos seus direitos;' }],
            [{ kind: 'text', text: 'seus dados de contato.' }],
          ],
        },
      ],
    },
    {
      id: 'privacy',
      heading: 'Dados pessoais',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: 'Pedidos sobre os seus dados pessoais (acesso, correção, exclusão): ',
            },
            { kind: 'mailto', text: contactPrivacy, email: contactPrivacy },
            { kind: 'text', text: '. Leia a ' },
            { kind: 'link', text: 'Política de Privacidade', href: '/privacy' },
            { kind: 'text', text: ' e a página de ' },
            { kind: 'link', text: 'exclusão de dados', href: '/deletion' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'response',
      heading: 'Prazo de resposta e responsável pelo site',
      blocks: [
        {
          kind: 'paragraph',
          content: [
            {
              kind: 'text',
              text: `Respondemos em até ${contactResponseDays} dias. Quem administra o site e o seu endereço postal estão no `,
            },
            { kind: 'link', text: 'Aviso legal', href: '/legal-notice' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};
