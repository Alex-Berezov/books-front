# Bibliaris Frontend

> Multilingual audiobook platform for reading and listening to classic literature

[![Status](https://img.shields.io/badge/status-in_development-yellow)](https://github.com/Alex-Berezov/books-front)
[![Milestone](https://img.shields.io/badge/milestone-M0-blue)](https://github.com/Alex-Berezov/books-app-docs)
[![Progress](https://img.shields.io/badge/progress-6%25-orange)](https://github.com/Alex-Berezov/books-app-docs)

## 🚀 Project Overview

Bibliaris is a modern web platform for discovering, reading, and listening to classic literature in multiple languages. Built with Next.js 14 App Router, TypeScript, and a robust backend API.

**Supported Languages:** English, Spanish, French, Portuguese

## 📋 Current Status

**Milestone M0 (Bootstrap):** 🟡 In Progress (60% complete)

- ✅ M0.1: Next.js project initialization
- ✅ M0.2: App Router structure with i18n routing
- ✅ M0.3: Basic layouts and providers
- 🔄 M0.4: Language switchers (in progress)
- ⏳ M0.5: NextAuth stub setup
- ⏳ M0.6: Base HTTP client

See [books-app-docs](https://github.com/Alex-Berezov/books-app-docs) for detailed progress and task tracking.

## ⭐ Code Style - ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ

**Перед началом разработки прочитайте [CODE_STYLE.md](./CODE_STYLE.md)!**

Основные правила:

- ✅ Только **SCSS модули**, никаких inline стилей
- ✅ Все цвета и spacing из **токенов** (`styles/tokens.scss`)
- ✅ TypeScript **без `any`**, строгая типизация
- ✅ **Деструктуризация props** при 3+ параметрах
- ✅ Комментарии **на русском**
- ✅ **`import type`** для импорта типов

## 🛠️ Tech Stack

### Core

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Package Manager:** Yarn

### UI & Styling

- **Component Library:** Ant Design 5
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
books-app-front/
├── app/
│   ├── [lang]/              # Public pages with i18n (en|es|fr|pt)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── admin/[lang]/        # Admin panel with i18n
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (neutral)/           # Language-neutral routes
│   ├── not-found.tsx
│   └── error.tsx
├── lib/
│   └── i18n/
│       └── lang.ts          # Language utilities
├── providers/
│   └── AppProviders.tsx     # React Query, AntD providers
├── styles/
│   └── globals.css
└── package.json
```

> **📚 Documentation:** Complete project documentation is available in a separate private repository:  
> 👉 **[books-app-docs](https://github.com/Alex-Berezov/books-app-docs)** (requires access)
>
> For local development with AI agents (MCP), clone the docs repository:
> ```bash
> git clone git@github.com:Alex-Berezov/books-app-docs.git
> ```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x LTS
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
```

## 🌍 Internationalization

The app supports 4 languages with URL-based routing:

- `/en` - English
- `/es` - Spanish (Español)
- `/fr` - French (Français)
- `/pt` - Portuguese (Português)

Language is determined by URL prefix and validated on the server side.

## 🔗 Backend API

**Production API:** `https://api.bibliaris.com/api`

API documentation is available in the [books-app-docs](https://github.com/Alex-Berezov/books-app-docs) repository.

## 📚 Documentation

Complete project documentation is maintained in a separate private repository for security and AI agent access:

**👉 [books-app-docs](https://github.com/Alex-Berezov/books-app-docs)** (private, requires access)

### Documentation includes:

- **Development Plan** - Overall roadmap (10 milestones M0-M10)
- **Task Tracking** - Detailed progress tracking
- **Backend API Reference** - Complete API integration guide
- **Git Workflow** - Git procedures and conventions
- **Frontend Agents** - AI agent integration guides
- **Milestone Specifications** - Detailed technical requirements

### For Local Development:

```bash
# Clone documentation repository
cd ~/Dev
git clone git@github.com:Alex-Berezov/books-app-docs.git

# Documentation will be in books-app-docs/frontend/
```

## 🔄 Development Workflow

**CRITICAL RULE:** After completing each subtask, you **MUST**:

1. Run `yarn typecheck && yarn lint`
2. Commit changes
3. **Push to GitHub** ← DO NOT skip this!

Detailed Git workflow procedures are available in the [documentation repository](https://github.com/Alex-Berezov/books-app-docs).

## 🤝 Contributing

This is a learning/portfolio project. Contributions are welcome!

See the [documentation repository](https://github.com/Alex-Berezov/books-app-docs) for available tasks and development guidelines.
2. Create a feature branch
3. Make your changes
4. Run `yarn lint` and `yarn typecheck`
5. Submit a pull request

## 📄 License

MIT

## 🔗 Related Repositories

- [Backend API](https://github.com/Alex-Berezov/books-app-back) - NestJS REST API

---

**Last Updated:** October 19, 2025  
**Current Milestone:** M0 - Project Bootstrap  
**Next Milestone:** M1 - Authentication & Roles
