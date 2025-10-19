# Development conventions

This project uses Yarn.

- Package manager: Yarn (Corepack). Do not switch to npm/pnpm.
- Install: `yarn install --frozen-lockfile`
- Node: 20.x LTS recommended.
- Scripts in docs and CI expect Yarn.

Testing and quality (see M9): Vitest + RTL + Playwright, ESLint/Prettier, Husky.

Deployment (see M10): Docker images published to registry, deploy via compose or PaaS.
