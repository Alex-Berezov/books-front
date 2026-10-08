# Bibliaris Frontend

> Multilingual audiobook platform for reading and listening to classic literature

[![Status](https://img.shields.io/badge/status-published-green)](https://github.com/Alex-Berezov/books-front)

## 🚀 Project Overview

Bibliaris is a modern web platform for discovering, reading, and listening to classic literature in multiple languages. Built with Next.js 14 App Router, TypeScript, and a robust backend API.

**Supported Languages:** English, Spanish, French, Portuguese, Russian

## 📋 Current Status

**Status:** ✅ Implemented and published; development proceeds iteratively.

The formal milestone scheme (M0–M10) is **no longer tracked**. Public site and admin panel are live; features are refined iteratively. See [books-app-docs](https://github.com/Alex-Berezov/books-app-docs) → `ai-context/work-queue.md` for the current work queue.

## ⭐ Code Style - REQUIRED READING

**Read [CODE_STYLE.md](./CODE_STYLE.md) before starting development!**

Key rules:

- ✅ Only **SCSS modules**, no inline styles
- ✅ All colors and spacing from **design tokens** (`styles/tokens.scss`)
- ✅ TypeScript **without `any`**, strict typing
- ✅ **Props destructuring** for 3+ parameters
- ✅ Comments **in English** for routine code; explanations of incidents in Russian (see CODE_STYLE.md)
- ✅ **`import type`** for type imports

## 🛠️ Tech Stack

### Core

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Package Manager:** Yarn

### UI & Styling

- **Component Library:** Ant Design 5 — admin panel only; the public site uses its own `components/common` (enforced by ESLint)
- **Styling:** SCSS Modules + Design Tokens
- **CSS Preprocessor:** SASS/SCSS

### Data & State

- **Data Fetching:** React Query (TanStack Query)
- **Authentication:** NextAuth.js v5 (beta)

### Code Quality

- **Linting:** ESLint + TypeScript ESLint
- **Formatting:** Prettier
- **Code Style:** [CODE_STYLE.md](./CODE_STYLE.md) - Production-ready standards

## 📁 Project Structure

```
books-front/
├── app/
│   ├── [lang]/              # Public site with i18n (en|es|fr|pt|ru)
│   ├── admin/               # Admin panel (admin/[lang]/)
│   ├── api/                 # Next route handlers
│   ├── llms.txt/            # llms.txt route
│   ├── sitemap.xml/         # Sitemap index
│   ├── sitemaps/            # Sitemap chunks
│   └── layout.tsx, page.tsx, error.tsx, not-found.tsx, robots.ts
├── api/                     # Request functions (endpoints/) and react-query hooks (hooks/)
├── components/              # common/ (design system), public/, admin/
├── lib/                     # http client, i18n, auth, seo, sitemap, utils
├── providers/               # AppProviders: session, react-query, notifications
├── styles/                  # Design tokens and global styles
├── types/                   # Hand-written API types (api-schema/)
└── __tests__/               # Mirrors the source tree
```

Full layout and where to look for what: [CLAUDE.md](./CLAUDE.md).

> **📚 Documentation:** Complete project documentation is available in a separate private repository:  
> 👉 **[books-app-docs](https://github.com/Alex-Berezov/books-app-docs)** (requires access)
>
> For local development with AI agents, clone the docs repository:
>
> ```bash
> git clone git@github.com:Alex-Berezov/books-app-docs.git
> ```

## 🚀 Getting Started

### Prerequisites

- Node.js 22.x LTS (at least 22.12 — required by `sanitize-html`)
- Yarn (via Corepack)

### Installation

```bash
# Clone the repository
git clone git@github.com:Alex-Berezov/books-front.git
cd books-front

# Install dependencies
yarn install --frozen-lockfile

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Run development server
yarn dev
```

Open [http://localhost:3000/en](http://localhost:3000/en) to see the app.

### Available Scripts

```bash
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
yarn typecheck    # Run TypeScript type checking
yarn format       # Format code with Prettier
yarn format:check # Check code formatting
yarn test         # Run unit tests (vitest)
yarn e2e          # Run end-to-end tests (playwright)
yarn ci           # Full check run, same as the CI pipeline
```

All commands and when to run them: [CLAUDE.md](./CLAUDE.md), section «Команды проверок».

## 🌍 Internationalization

The app supports 5 languages with URL-based routing:

- `/en` - English
- `/es` - Spanish (Español)
- `/fr` - French (Français)
- `/pt` - Portuguese (Português)
- `/ru` - Russian (Русский)

Language is determined by URL prefix and validated on the server side.

## 🔗 Backend API

**Production API:** `https://api.bibliaris.com/api`

API documentation is available in the [books-app-docs](https://github.com/Alex-Berezov/books-app-docs) repository.

## 📚 Documentation

Complete project documentation is maintained in a separate private repository for security and AI agent access:

**👉 [books-app-docs](https://github.com/Alex-Berezov/books-app-docs)** (private, requires access)

### Documentation includes:

- **AI Context** - Systematic AI-agent context (`ai-context/`)
- **Backend API Reference** - Complete API integration guide
- **Git Workflow** - Git procedures and conventions
- **Frontend Agents** - AI agent integration guides

### For Local Development:

```bash
# Clone documentation repository
cd ~/Dev
git clone git@github.com:Alex-Berezov/books-app-docs.git

# Documentation will be in books-app-docs/frontend/
```

## 🔄 Development Workflow

Commit and release order: [CLAUDE.md](./CLAUDE.md).

## 🤝 Contributing

This is a learning/portfolio project. Contributions are welcome!

See the [documentation repository](https://github.com/Alex-Berezov/books-app-docs) for available tasks and development guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn lint` and `yarn typecheck`
5. Submit a pull request

## 📄 License

MIT

## 🔗 Related Repositories

- [Backend API](https://github.com/Alex-Berezov/books) - NestJS REST API

---

**Status:** Implemented and published; iterative development. Formal milestone scheme (M0–M10) is no longer tracked.
