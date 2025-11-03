# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**semantic-docs-hono** is a HonoX-based documentation theme with semantic vector search powered by libsql-search. It's designed for deployment on Cloudflare Workers and uses Turso (libSQL) for edge-optimized semantic search capabilities.

**Key differences from semantic-docs (Astro)**:
- Built with **HonoX** instead of Astro
- Targets **Cloudflare Workers** runtime
- Uses **Hono JSX** for SSR + **React islands** for client-side interactivity
- Manual HTML rendering with `c.html()` instead of Astro layouts

## Essential Commands

### Development
```bash
# Install dependencies
pnpm install

# Start dev server (runs on http://localhost:5174)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Content Management
```bash
# Turso (requires .env with credentials)
pnpm db:init    # Initialize Turso database schema
pnpm index      # Index markdown content to Turso

# Run tests
pnpm test

# Linting and formatting
pnpm lint       # Check code with Biome
pnpm lint:fix   # Auto-fix issues
pnpm format     # Format all files
```

**Important:**
- Always run `pnpm index` after adding/modifying content in `./content` directory before building
- The dev server (`pnpm dev`) works with Turso database
- Use cloud embedding providers (`gemini` or `openai`) for production Workers deployment

## Architecture

### Framework & Runtime
- **HonoX**: File-based routing meta-framework built on Hono
- **Runtime**: Cloudflare Workers (not Node.js)
- **Database**: Turso (libSQL) with vector search via `@libsql/client/web`
- **Build Tool**: Vite with HonoX plugins

### Content Flow
1. **Markdown → Database**: Content in `./content` is indexed into Turso via `scripts/index-content.ts`
2. **libsql-search**: Handles embedding generation and vector storage
3. **SSR**: Routes are rendered server-side with Hono JSX
4. **Islands**: React components hydrated client-side for interactivity

### Key Components

#### Routes (`app/routes/`)
- **index.tsx**: Home page (server-rendered with Hono JSX)
- **content/[...slug].tsx**: Dynamic article pages (catch-all route)
- **api/search.ts**: Search API endpoint (Hono app)

All routes wrapped with `createRoute()` from `honox/factory` and return `c.html()` or `c.json()`.

#### Components (`app/components/`)
- **DocsHeader.tsx**: Header with nav (Hono JSX)
- **DocsSidebar.tsx**: Navigation sidebar (Hono JSX)
- Uses `import type { FC } from 'hono/jsx'` for typing

#### Islands (`app/islands/`)
- **Search.tsx**: Search dialog with ⌘K shortcut (React)
- **ThemeSwitcher.tsx**: Theme toggle (React)
- **DocsToc.tsx**: Table of contents (React)
- Hydrated via `app/client.tsx` using `react-dom/client`

### Database Integration
- **src/lib/turso.ts**: Turso client wrapper using `@libsql/client/web`
- **src/lib/libsql-search-runtime.ts**: Standalone search implementation (avoids CommonJS deps)
- **src/lib/search-wrapper.ts**: Re-exports from runtime
- **scripts/init-db.ts**: Initializes database schema with vector search support
- **scripts/index-content.ts**: Indexes markdown files, creates table with 768-dimension vectors

### Environment Variables
Set in `.env` and injected at build time via Vite's `defineConfig`:
- `TURSO_DB_URL`: Turso database URL (libsql://...)
- `TURSO_AUTH_TOKEN`: Turso authentication token
- `EMBEDDING_PROVIDER`: "local", "gemini", or "openai" (default: "local")
- Optional: `GEMINI_API_KEY`, `OPENAI_API_KEY`

Variables are accessed via `process.env` and replaced at build time by Vite.

## Critical Configuration

### Vite Config (`vite.config.ts`)
```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'process.env.TURSO_DB_URL': JSON.stringify(env.TURSO_DB_URL),
      'process.env.TURSO_AUTH_TOKEN': JSON.stringify(env.TURSO_AUTH_TOKEN),
      'process.env.EMBEDDING_PROVIDER': JSON.stringify(env.EMBEDDING_PROVIDER),
    },
    plugins: [honox(), tailwindcss(), devServer(), build()],
    resolve: {
      alias: {
        '@libsql/client$': '@libsql/client/web', // Force web version
      },
      conditions: ['workerd', 'worker', 'browser'],
    },
    ssr: {
      external: ['@xenova/transformers'], // Externalize for Workers
      noExternal: ['@libsql/client'],
    },
  };
});
```

### TypeScript Config
`jsxImportSource` is set to `"hono/jsx"` for server components. **Never** change this.

### Content Structure
Content in `./content` must follow this pattern:
```
content/
├── folder-name/
│   └── article.md
```

Folders become sidebar sections. Each markdown file can have optional frontmatter:
```markdown
---
title: Article Title
tags: [tag1, tag2]
---
```

### Routing Conventions
- **Catch-all routes**: Use `[...slug].tsx` notation
- **Route extraction**: Parse slug from `c.req.path`
- **HTML rendering**: Use `c.html(<html>...</html>)` not `c.render()`
- **API routes**: Return `c.json()` for JSON responses

Example:
```tsx
export default createRoute(async (c) => {
  const slug = c.req.path.replace('/content/', '');
  const article = await getArticleBySlug(client, slug);

  return c.html(
    <html>
      <head>...</head>
      <body>...</body>
    </html>
  );
});
```

## Integration Points

### Adding New libsql-search Features
The project relies heavily on libsql-search. When modifying search behavior:
1. Check libsql-search documentation for available options
2. Update `scripts/index-content.ts` for indexing changes
3. Update `app/routes/api/search.ts` for search query changes
4. Maintain embedding dimension consistency (768) across indexing and search

### React Islands
To add a new island:
1. Create component in `app/islands/MyComponent.tsx`
2. Use React imports: `import { useState } from 'react'`
3. Add to page with `data-hydrate`, `data-component`, `data-props` attributes
4. Hydration happens automatically via `app/client.tsx`

Example:
```tsx
<div
  data-hydrate="true"
  data-component="MyComponent"
  data-props='{"foo":"bar"}'
/>
```

### Styling
- Uses **Tailwind CSS 4** via `@tailwindcss/vite` plugin
- CSS variables defined in `app/style.css` for theming
- Multi-theme system with 6 pre-built themes
- Theme switching handled by `ThemeSwitcher` island

### Security & Rate Limiting
- In-memory rate limiting on search API: 20 requests per minute per IP
- Query length validation: 500 character maximum
- Results limit enforcement: 1-20 results
- See `src/middleware/rateLimit.ts`

## Deployment

### Cloudflare Workers

The project is built for Cloudflare Workers deployment:

```bash
# Build
pnpm build

# Deploy
pnpm deploy
```

**Environment variables** must be set in Cloudflare dashboard:
- `TURSO_DB_URL`
- `TURSO_AUTH_TOKEN`
- `EMBEDDING_PROVIDER` (use `gemini` or `openai` for production)

### Known Limitations

#### Local Embeddings in Workers
- `@xenova/transformers` is externalized for Workers compatibility
- Works in development but not in production Workers
- **Solution**: Use `EMBEDDING_PROVIDER=gemini` or `openai` for production

#### Islands Hydration
- React islands need client-side hydration via `app/client.tsx`
- Script is included but may need optimization for Workers

## Verification Checklist

**IMPORTANT**: Before declaring any changes complete, ALL items in this checklist must pass. This is mandatory for every PR, deployment, or major change.

### 1. Code Quality & Compilation
- [ ] TypeScript compiles with zero errors: `npx tsc --noEmit`
- [ ] Linter passes with no errors: `pnpm lint`
- [ ] No critical warnings in build output
- [ ] Build bundle size is reasonable (< 300 KB)

### 2. Build & Deployment
- [ ] Production build succeeds: `pnpm build`
- [ ] Wrangler dry-run succeeds: `npx wrangler deploy --dry-run`
- [ ] No "global scope async" errors in Workers validation
- [ ] No unresolved dependencies in bundle
- [ ] All external modules properly configured

### 3. Development Mode
- [ ] Dev server starts without errors: `pnpm dev`
- [ ] Homepage loads and renders HTML: `curl http://localhost:5173/`
- [ ] No SSR errors in terminal output
- [ ] CSS loads and applies correctly
- [ ] JavaScript client bundle loads
- [ ] React islands mount (Search, ThemeSwitcher, DocsToc)
- [ ] No browser console errors (check DevTools)
- [ ] Hot module reload works

### 4. API Endpoints (via curl)
- [ ] Homepage returns HTML: `curl http://localhost:5173/ | grep -q "Astro Vault"`
- [ ] Search API responds: `curl -X POST http://localhost:5173/api/search -H "Content-Type: application/json" -d '{"query":"test"}'`
- [ ] Search API validates input (rejects malformed requests)
- [ ] Rate limiting headers present in API responses

### 5. Navigation & UI
- [ ] Sidebar renders (if content exists in `./content`)
- [ ] Header renders with correct links
- [ ] Theme switcher button visible
- [ ] Search dialog opens (can click/interact)
- [ ] Mobile menu button works
- [ ] GitHub link present and correct

### 6. Content & Routing
- [ ] Content pages load if they exist: `/content/*`
- [ ] 404 handling works for missing pages
- [ ] Static files serve correctly

### 7. Database & External Services
- [ ] Turso client initializes without errors
- [ ] Environment variables load correctly in dev mode
- [ ] Graceful error messages when credentials missing
- [ ] Search returns proper error when embedding provider not set

### 8. Workers Compatibility
- [ ] No `module is not defined` errors
- [ ] No `fetch() at global scope` errors
- [ ] No async operations outside request handlers
- [ ] `nodejs_compat` flag set in `wrangler.toml`
- [ ] Promise-limit handled correctly (dev vs prod modes)
- [ ] No CommonJS dependencies bundled incorrectly

### 9. Documentation
- [ ] README.md deployment instructions accurate
- [ ] Environment variables documented
- [ ] `wrangler.toml` has correct settings
- [ ] CLAUDE.md context is current

### 10. Final Smoke Tests
Run all these commands in sequence - all must pass:
```bash
pnpm lint                        # Linter passes
npx tsc --noEmit                 # TypeScript compiles
pnpm build                       # Build succeeds
npx wrangler deploy --dry-run    # Deployment validates
pnpm dev                         # Dev server starts
# Then test in browser at http://localhost:5173/
```

**If any item fails, do NOT declare the work complete.** Fix the issue and re-run the full checklist.