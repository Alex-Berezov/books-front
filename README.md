# Bibliaris Frontend

> Multilingual audiobook platform for reading and listening to classic literature

[![Status](https://img.shields.io/badge/status-in_development-yellow)](https://github.com/Alex-Berezov/books-front)
[![Milestone](https://img.shields.io/badge/milestone-M0-blue)](./docs/plan/TASKS-TRACKING.md)
[![Progress](https://img.shields.io/badge/progress-6%25-orange)](./docs/plan/TASKS-TRACKING.md)

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

See [TASKS-TRACKING.md](./docs/plan/TASKS-TRACKING.md) for detailed progress.

## 🛠️ Tech Stack

### Core

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Package Manager:** Yarn

### UI & Styling

- **Component Library:** Ant Design 5
- **Styling:** CSS Modules + Global Styles

### Data & State

- **Data Fetching:** React Query (TanStack Query)
- **Authentication:** NextAuth.js v5 (beta)

### Code Quality

- **Linting:** ESLint + TypeScript ESLint
- **Formatting:** Prettier

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
├── docs/                    # Complete project documentation
│   ├── plan/
│   │   ├── DEVELOPMENT-PLAN.md
│   │   └── TASKS-TRACKING.md
│   ├── frontend-agents/     # Backend API integration guides
│   └── milestones/          # Milestone specifications
└── package.json
```

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

See [backend API reference](./docs/frontend-agents/backend-api-reference.md) for complete documentation.

## 📚 Documentation

- **[Development Plan](./docs/plan/DEVELOPMENT-PLAN.md)** - Overall roadmap and milestones
- **[Tasks Tracking](./docs/plan/TASKS-TRACKING.md)** - Detailed task progress
- **[Git Workflow](./docs/GIT-WORKFLOW.md)** - **⚠️ IMPORTANT:** Git procedures and push rules
- **[Git Quick Reference](./docs/GIT-QUICK-REF.md)** - Quick commands cheat sheet
- **[Frontend Agents](./docs/frontend-agents/)** - API integration guides
- **[Milestone M0](./docs/milestones/M0-bootstrap.md)** - Current milestone specification

## 🔄 Development Workflow

**CRITICAL RULE:** After completing each subtask, you **MUST**:

1. Run `yarn typecheck && yarn lint`
2. Commit changes
3. **Push to GitHub** ← DO NOT skip this!
4. Update `TASKS-TRACKING.md`

See [Git Workflow](./docs/GIT-WORKFLOW.md) for detailed procedures.

## 🤝 Contributing

This is a learning/portfolio project. Contributions are welcome!

1. Check [TASKS-TRACKING.md](./docs/plan/TASKS-TRACKING.md) for available tasks
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
