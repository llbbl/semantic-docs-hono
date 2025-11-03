---
title: Semantic Docs Hono Theme Overview
tags: [honox, theme, documentation, semantic-search, cloudflare-workers]
---

# Semantic Docs Hono Theme Overview

Semantic Docs Hono is a modern documentation theme built with HonoX, featuring semantic vector search powered by libSQL and Turso. Optimized for Cloudflare Workers, it uses server-side rendering with React islands for a fast, searchable documentation experience.

**Reference Implementation**: This is a HonoX port of [semantic-docs](https://github.com/llbbl/semantic-docs). For the original Astro version, see the main repository.

## Key Features

### Semantic Vector Search
- **Vector embeddings**: Content is indexed with 768-dimension embeddings
- **Three embedding providers**: Local (onnxruntime), Gemini, or OpenAI
- **Fast semantic search**: Natural language queries return relevant results
- **Edge-optimized**: Runs on Turso's edge database for low latency

### Static Site Generation
- **Pre-rendered pages**: All documentation pages are built at compile time
- **Fast page loads**: Static HTML with minimal JavaScript
- **SEO-friendly**: Proper meta tags and semantic HTML
- **Progressive enhancement**: Works without JavaScript

### Server-Side Search API
- **Rate limiting**: 20 requests per minute per IP
- **Debounced requests**: Client waits 300ms before sending query
- **Security**: Query validation, result limits, XSS protection
- **Real-time**: Search API runs on Cloudflare Workers edge

### Modern Tech Stack
- **HonoX**: File-based routing meta-framework for Hono
- **Cloudflare Workers**: Edge runtime deployment
- **Tailwind CSS 4**: Utility-first CSS with custom themes
- **React 19**: For interactive island components (search, TOC)
- **TypeScript**: Full type safety across the codebase
- **Biome**: Fast linting and formatting
- **Vitest**: Unit testing with browser mode

## Architecture

### Database Layer
```
┌─────────────────────────────────────────┐
│         Turso (libSQL)                  │
│                                         │
│  - Vector embeddings (768-dim)          │
│  - Full-text search                     │
│  - Metadata (tags, folders)             │
└─────────────────────────────────────────┘
           ↑
           │ @libsql/client/web
           │ libsql-search-runtime
           │
┌─────────────────────────────────────────┐
│      HonoX on Cloudflare Workers        │
│                                         │
│  SSR: Article pages with Hono JSX       │
│  API: Search endpoint (/api/search)     │
│  Islands: React hydration (client-side) │
└─────────────────────────────────────────┘
```

### Content Pipeline
1. **Markdown files** in `./content/` directory
2. **Indexing script** (`scripts/index-content.ts`) processes files:
   - Extracts frontmatter (title, tags)
   - Generates embeddings
   - Stores in database with vectors
3. **Build process** pre-renders all pages using database content
4. **Runtime** serves static pages + dynamic search API

### Search Flow
1. User types query in search box
2. Client debounces input (300ms)
3. Fetch request to `/api/search.json?q=query&limit=10`
4. Server performs semantic search on Turso
5. Results ranked by cosine similarity
6. Client displays results in dropdown

## Project Structure

```
semantic-docs-hono/
├── app/                  # HonoX application
│   ├── routes/          # File-based routes
│   │   ├── index.tsx    # Home page
│   │   ├── content/[...slug].tsx  # Article pages
│   │   └── api/search.ts         # Search API
│   ├── components/      # Server components (Hono JSX)
│   │   ├── DocsHeader.tsx
│   │   ├── DocsSidebar.tsx
│   │   └── ui/
│   ├── islands/         # Client components (React)
│   │   ├── Search.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   └── DocsToc.tsx
│   ├── client.tsx       # Island hydration
│   ├── server.ts        # Hono server entry
│   └── style.css        # Tailwind styles
├── content/             # Markdown documentation files
│   ├── getting-started/ # Getting started guides
│   ├── features/        # Feature documentation
│   └── theme/           # Theme documentation
├── src/
│   ├── lib/            # Core utilities
│   │   ├── turso.ts    # Turso client
│   │   └── libsql-search-runtime.ts
│   ├── middleware/
│   │   └── rateLimit.ts
│   └── index.ts        # Workers entry point
├── scripts/            # Database scripts
│   ├── init-db.ts      # Initialize database schema
│   └── index-content.ts # Index markdown to database
└── public/               # Static assets
```

## Configuration

### Environment Variables
```bash
# Production (Turso)
TURSO_DB_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Embedding provider (optional, defaults to "local")
EMBEDDING_PROVIDER=local  # or "gemini" or "openai"

# API keys (if using cloud embeddings)
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key
```

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // Inject environment variables at build time
      'process.env.TURSO_DB_URL': JSON.stringify(env.TURSO_DB_URL),
      'process.env.TURSO_AUTH_TOKEN': JSON.stringify(env.TURSO_AUTH_TOKEN),
    },
    plugins: [
      honox(),           // HonoX file-based routing
      tailwindcss(),     // Tailwind CSS 4
      devServer(),       // Dev server
      build(),           // Production build
    ],
    resolve: {
      conditions: ['workerd', 'worker', 'browser'], // Workers compatibility
    },
});
```

## Theme System

Semantic Docs Hono includes 6 built-in themes that can be switched at runtime:

- **Dark** (default): High contrast dark theme
- **Light**: Clean light theme
- **Ocean**: Blue ocean-inspired theme
- **Forest**: Green nature theme
- **Sunset**: Warm orange/red theme
- **Purple**: Royal purple theme

Themes are implemented with CSS variables and can be customized in `app/style.css`.

## Performance

### Build Performance
- **Fast builds**: Vite's optimized bundling
- **Efficient bundling**: Tree-shaking and code splitting
- **Workers-optimized**: Built specifically for Cloudflare Workers runtime
- **Small bundle**: Minimal JavaScript, maximum performance

### Runtime Performance
- **Static pages**: < 100ms load time
- **Search latency**: ~50-200ms (Turso edge network)
- **Small bundle size**: ~50KB JavaScript (gzipped)
- **Lighthouse score**: 95+ on all metrics

## Deployment

### Cloudflare Workers/Pages
```bash
# Build for production
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

**Set environment variables in Cloudflare dashboard:**
1. Go to your Workers/Pages project settings
2. Navigate to Settings > Environment Variables
3. Add the following variables:
   - `TURSO_DB_URL`: Your Turso database URL
   - `TURSO_AUTH_TOKEN`: Your Turso authentication token
   - `EMBEDDING_PROVIDER`: Use `gemini` or `openai` for production (local embeddings don't work in Workers)
   - `GEMINI_API_KEY` or `OPENAI_API_KEY`: If using cloud embeddings

**Important:** Index your content before deploying:
```bash
pnpm db:init    # Initialize database schema
pnpm index      # Index markdown content to Turso
```

## Customization

### Adding Content
1. Create markdown files in `content/` directory
2. Add frontmatter with title and tags
3. Run `pnpm index` to index content to Turso
4. Deploy to Cloudflare Workers

### Styling
- Edit `app/style.css` for global styles
- Use Tailwind utilities in components
- Create new themes by adding CSS variables

### Components
- Server components (Hono JSX) in `app/components/`
- React islands in `app/islands/` for interactivity
- Full TypeScript support with prop validation

## Links

- **GitHub**: [llbbl/semantic-docs-hono](https://github.com/llbbl/semantic-docs-hono)
- **Original Astro Version**: [llbbl/semantic-docs](https://github.com/llbbl/semantic-docs)
- **HonoX**: [github.com/honojs/honox](https://github.com/honojs/honox)
- **Turso**: [turso.tech](https://turso.tech)
