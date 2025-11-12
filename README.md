# semantic-docs-hono

HonoX documentation theme with semantic vector search for Cloudflare Workers.

A beautiful documentation theme powered by [HonoX](https://github.com/honojs/honox) and Cloudflare AI Search for semantic search capabilities. Fully optimized for Cloudflare Workers with R2 storage.

> **Note**: This is a HonoX port of [semantic-docs](https://github.com/llbbl/semantic-docs). For the original Astro version, see the main repository.

## Features

- 🎨 **Modern Dark UI** - Sleek design with Tailwind CSS
- 🔍 **Semantic Search** - Cloudflare AI Search with automatic indexing (React island component)
- 📦 **R2 Storage** - Markdown content and static assets stored on Cloudflare R2
- 📱 **Responsive** - Mobile-friendly with collapsible sidebar
- 📑 **Auto TOC** - Table of contents generated from headings
- 🚀 **Edge-Ready** - Runs globally on Cloudflare Workers
- ⚡ **Fast** - SSR with Hono JSX and React islands for interactivity
- 🎯 **Type-Safe** - Full TypeScript support
- 🔄 **Auto Deploy** - GitHub Actions deploys on push to main

## Architecture

- **Framework**: [HonoX](https://github.com/honojs/honox) - File-based routing meta-framework for Hono
- **Runtime**: Cloudflare Workers
- **Storage**: Cloudflare R2 (two buckets: content and static)
- **Search**: Cloudflare AI Search with automatic markdown indexing
- **Styling**: Tailwind CSS 4 (Vite plugin)
- **Interactivity**: React islands (Search, ThemeSwitcher, DocsToc)
- **SSR**: Hono JSX for server-side rendering

## Quick Start

> ⚠️ **Local Development Note**: This project requires Cloudflare infrastructure (R2 buckets, AI Search). Traditional local development with `pnpm dev` **does not work**. See [DEVELOPMENT.md](./DEVELOPMENT.md) for details.

### 1. Clone Repository

```bash
git clone https://github.com/llbbl/semantic-docs-hono.git
cd semantic-docs-hono
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Cloudflare

Follow the detailed setup guide: **[docs/CLOUDFLARE_SETUP.md](./docs/CLOUDFLARE_SETUP.md)**

Quick checklist:
- [ ] Create two R2 buckets: `hono-content` and `hono-static`
- [ ] Create AI Search index pointing to `hono-content` bucket
- [ ] Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [ ] Set GitHub variables: `R2_CONTENT_BUCKET`, `R2_STATIC_BUCKET`
- [ ] Set Worker env variable: `AI_SEARCH_INDEX`

### 4. Add Your Content

Create markdown files in `./content`:

```bash
mkdir -p content/getting-started
cat > content/getting-started/intro.md << 'EOF'
---
title: Getting Started
tags: [tutorial, beginner]
---

# Getting Started

This is my first article!
EOF
```

### 5. Deploy

Push to GitHub to trigger automatic deployment:

```bash
git add .
git commit -m "Add content"
git push origin main
```

GitHub Actions will:
1. Build the client and server bundles
2. Upload markdown files to `hono-content` R2 bucket
3. Upload static assets to `hono-static` R2 bucket
4. Deploy the Worker to Cloudflare

### 6. Test

Visit your Worker URL (e.g., `https://your-worker.workers.dev`) to see your docs!

## Development

For local development (requires Cloudflare setup):

```bash
# Remote development (recommended)
pnpm dev:remote

# Build locally
pnpm build

# Deploy manually
pnpm deploy
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development workflows.

## Project Structure

```
semantic-docs-hono/
├── app/                      # HonoX application
│   ├── routes/              # File-based routes
│   │   ├── index.tsx        # Home page
│   │   ├── content/         # Article routes
│   │   │   └── [...slug].tsx  # Catch-all article route
│   │   └── api/             # API routes
│   │       └── search.ts    # Search API endpoint
│   ├── components/          # Hono JSX components
│   │   ├── DocsHeader.tsx
│   │   ├── DocsSidebar.tsx
│   │   └── ui/              # shadcn-style components
│   ├── islands/             # React islands (client-side)
│   │   ├── Search.tsx       # Search dialog
│   │   ├── ThemeSwitcher.tsx
│   │   └── DocsToc.tsx      # Table of contents
│   ├── _renderer.tsx        # HonoX layout renderer
│   ├── client.tsx           # Client-side hydration
│   ├── server.ts            # Hono server entry
│   └── style.css            # Tailwind styles
├── src/                     # Core logic
│   ├── lib/
│   │   ├── turso.ts         # Turso client (@libsql/client/web)
│   │   ├── search-wrapper.ts
│   │   └── libsql-search-runtime.ts  # Standalone search implementation
│   ├── middleware/
│   │   └── rateLimit.ts     # API rate limiting
│   └── index.ts             # Workers entry point
├── content/                 # Markdown content
├── scripts/                 # Database scripts
│   ├── init-db.ts
│   └── index-content.ts
├── vite.config.ts
├── wrangler.toml            # Cloudflare Workers config
└── package.json
```

## Key Differences from Astro Version

### Framework
- **Astro** → **HonoX**: File-based routing with Hono
- Server adapter changes from `@astrojs/node` to Cloudflare Workers

### Rendering
- **Astro components** → **Hono JSX**: Server-side rendering
- React components → **React islands**: Client-side hydration for interactivity
- Manual HTML wrapper with `c.html()` instead of Astro layouts

### Routing
- File naming: `[...slug].tsx` for catch-all routes (HonoX convention)
- Routes wrapped with `createRoute()` from `honox/factory`

### Database Client
- Using `@libsql/client/web` import for Workers compatibility
- Custom search runtime (`libsql-search-runtime.ts`) to avoid CommonJS dependencies

### Environment Variables
- Loaded via Vite's `loadEnv()` and injected with `define` in `vite.config.ts`
- Access via `process.env` (replaced at build time)

## Commands

```bash
# Development
pnpm dev              # Start dev server (http://localhost:5174)
pnpm build            # Build for production
pnpm preview          # Preview production build

# Database
pnpm db:init          # Initialize Turso database schema
pnpm index            # Index markdown content to Turso

# Testing & Linting
pnpm test             # Run tests with Vitest
pnpm test:ui          # Run tests with UI
pnpm test:coverage    # Generate coverage report
pnpm lint             # Check code with Biome
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Format all files

# Deployment
pnpm deploy           # Deploy to Cloudflare Workers
```

## Deployment

### Cloudflare Workers

Deploy to Cloudflare Workers using Wrangler:

```bash
# Deploy (builds automatically)
pnpm deploy

# Or directly with wrangler
npx wrangler deploy
```

The `wrangler.toml` is configured to build the project automatically before deployment.

**Set environment variables (secrets) using Wrangler CLI:**

```bash
# Set Turso credentials (required)
npx wrangler secret put TURSO_DB_URL
npx wrangler secret put TURSO_AUTH_TOKEN

# Set embedding provider (required for production)
npx wrangler secret put EMBEDDING_PROVIDER
# Enter: gemini or openai

# If using Gemini
npx wrangler secret put GEMINI_API_KEY

# If using OpenAI
npx wrangler secret put OPENAI_API_KEY
```

**Or set via Cloudflare Dashboard:**
1. Go to Workers & Pages > Your Worker
2. Settings > Variables and Secrets
3. Add the environment variables listed above

### Rate Limiting (Important!)

⚠️ **Configure rate limiting via Cloudflare Dashboard** to protect your API:

1. Go to Security → WAF → Rate Limiting Rules
2. Create rule for `/api/search` endpoint
3. Recommended: 20 requests/minute per IP

📖 See [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md) for detailed setup instructions.

### Environment Variables

Required:
- `TURSO_DB_URL`: Your Turso database URL (libsql://...)
- `TURSO_AUTH_TOKEN`: Your Turso authentication token

Optional:
- `EMBEDDING_PROVIDER`: `local` (default), `gemini`, or `openai`
- `GEMINI_API_KEY`: If using Gemini embeddings
- `OPENAI_API_KEY`: If using OpenAI embeddings

## Search Functionality

The semantic search is powered by vector embeddings stored in Turso:

1. **Indexing**: Markdown content is converted to 768-dimension vectors
2. **Query**: User searches are converted to vectors
3. **Matching**: Vector similarity finds relevant articles
4. **Results**: Grouped by folder, sorted by relevance

**Embedding Providers:**
- `local`: @xenova/transformers (Xenova/all-MiniLM-L6-v2) - runs in browser/Workers
- `gemini`: Google Gemini API
- `openai`: OpenAI API

> **Note**: Local embeddings work in development but are externalized for Workers compatibility. For production Workers deployment, use `gemini` or `openai`.

## Known Limitations

### Search in Workers
The `@xenova/transformers` package is externalized for Workers compatibility. The search dropdown will work in development but may need cloud embeddings (`gemini` or `openai`) for production Workers deployment.

### Islands Hydration
React islands (Search, ThemeSwitcher, DocsToc) require client-side hydration via `app/client.tsx`. The script is included in the HTML but may need further configuration for optimal Workers deployment.

## Development Notes

### Hono JSX vs React
- Server components use Hono JSX (imported from `hono/jsx`)
- Client islands use React (imported from `react`)
- `tsconfig.json` uses `"jsxImportSource": "hono/jsx"` by default

### File Extensions
- `.tsx` files in `app/routes/` and `app/components/` use Hono JSX
- `.tsx` files in `app/islands/` use React
- `app/client.tsx` handles island hydration

### CSS & Styling
- Tailwind CSS 4 via `@tailwindcss/vite` plugin
- CSS variables in `app/style.css` for theming
- Multiple theme support (dark, light, ocean, forest, sunset, purple)

## Contributing

Contributions welcome! This is a community-driven project.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linter
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

- Built with [HonoX](https://github.com/honojs/honox)
- Powered by [libsql-search](https://github.com/llbbl/libsql-search)
- Database: [Turso](https://turso.tech)
- Inspired by [semantic-docs](https://github.com/llbbl/semantic-docs) (Astro version)

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/llbbl/semantic-docs-hono/issues)
- Discussions: Share ideas and ask questions
- Documentation: Check the `/content` folder for examples
