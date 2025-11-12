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
- 🤖 **AI-Powered Search** - Cloudflare AI Search with vector embeddings

## Architecture

- **Framework**: [HonoX](https://github.com/honojs/honox) - File-based routing meta-framework for Hono
- **Runtime**: Cloudflare Workers
- **Storage**: Cloudflare R2 (two buckets: content and static)
- **Search**: Cloudflare AI Search with automatic markdown indexing
- **Styling**: Tailwind CSS 4 (Vite plugin)
- **Interactivity**: React islands (Search, ThemeSwitcher, DocsToc)
- **SSR**: Hono JSX for server-side rendering

### Two-Bucket Architecture

```
┌─────────────────────────────────────────┐
│      Cloudflare Worker                  │
│                                         │
│  ┌────────────┐      ┌────────────┐   │
│  │  CONTENT   │      │  STATIC    │   │
│  │  binding   │      │  binding   │   │
│  └──────┬─────┘      └──────┬─────┘   │
└─────────┼──────────────────┼───────────┘
          │                  │
          ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  hono-content    │  │  hono-static     │
│                  │  │                  │
│ ✅ AI Search    │  │ ❌ Not indexed   │
│    scans this    │  │                  │
│                  │  │                  │
│ • *.md files     │  │ • client.*.js    │
│ • Indexed        │  │ • manifest.json  │
│ • Searchable     │  │ • favicon, etc.  │
└──────────────────┘  └──────────────────┘
```

**Why two buckets?**
- `hono-content`: Only markdown files (indexed by AI Search)
- `hono-static`: JavaScript, CSS, manifest (not indexed, saves resources)

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

**After deployment**, manually trigger AI Search indexing:
1. Go to Cloudflare Dashboard → **AI** → **AI Search** → Your index
2. Click **Sync** to re-index content
3. Wait for indexing to complete (check **Jobs** tab)

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
│   │   │   └── [...slug].tsx  # Catch-all article route (fetches from R2)
│   │   └── api/             # API routes
│   │       └── search.ts    # Search API endpoint (AI Search)
│   ├── components/          # Hono JSX components
│   │   ├── DocsHeader.tsx
│   │   ├── DocsSidebar.tsx
│   │   └── ui/              # shadcn-style components
│   ├── islands/             # React islands (client-side)
│   │   ├── Search.tsx       # Search dialog with ⌘K shortcut
│   │   ├── ThemeSwitcher.tsx
│   │   └── DocsToc.tsx      # Table of contents
│   ├── _renderer.tsx        # HonoX layout renderer
│   ├── client.tsx           # Client-side hydration (createRoot)
│   ├── server.ts            # Hono server entry
│   └── style.css            # Tailwind styles
├── src/                     # Core logic
│   ├── lib/
│   │   └── logger.ts        # Logging utility
│   └── index.ts             # Workers entry point
├── content/                 # Markdown content
│   ├── getting-started/
│   ├── features/
│   └── guides/
├── scripts/                 # Build scripts
│   └── generate-client-manifest.ts  # Cache busting
├── docs/                    # Setup documentation
│   ├── CLOUDFLARE_SETUP.md
│   └── RATE_LIMITING.md
├── vite.config.ts
├── wrangler.toml            # Cloudflare Workers config (R2 bindings)
└── package.json
```

## Key Differences from Astro Version

### Framework
- **Astro** → **HonoX**: File-based routing with Hono
- Server adapter changes from `@astrojs/node` to Cloudflare Workers

### Rendering
- **Astro components** → **Hono JSX**: Server-side rendering
- React components → **React islands**: Client-side hydration for interactivity
- Manual HTML wrapper with `c.html()` or `c.body()` instead of Astro layouts

### Routing
- File naming: `[...slug].tsx` for catch-all routes (HonoX convention)
- Routes wrapped with `createRoute()` from `honox/factory`
- Content fetched from R2 at runtime (not pre-rendered)

### Search & Storage
- **Turso/libSQL** → **Cloudflare R2 + AI Search**
- No manual indexing required (AI Search auto-indexes R2)
- No database credentials needed (uses Worker bindings)

### Environment Variables
- **Before**: Turso credentials, embedding provider API keys
- **Now**: Only `AI_SEARCH_INDEX` (set in Worker settings)

## Commands

```bash
# Development
pnpm dev:remote       # Start remote dev server (wrangler dev --remote)
pnpm build            # Build for production
pnpm preview          # Preview production build (wrangler dev --remote)

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

**Note**: `pnpm dev` is disabled because local development requires Cloudflare bindings (R2, AI Search) that aren't available locally. Use `pnpm dev:remote` instead.

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

**Set environment variables in Cloudflare Dashboard:**

1. Go to **Workers & Pages** → Your Worker
2. **Settings** → **Variables and Secrets**
3. Add **Environment Variable**:
   - **Variable name**: `AI_SEARCH_INDEX`
   - **Value**: Your AI Search index name (e.g., `semantic-docs`)
4. Click **Deploy** to apply changes

**That's it!** No database credentials or API keys needed for basic functionality.

### Rate Limiting (Important!)

⚠️ **Configure rate limiting via Cloudflare Dashboard** to protect your API:

1. Go to **Security** → **WAF** → **Rate Limiting Rules**
2. Create rule for `/api/search` endpoint
3. Recommended: 20 requests/minute per IP

📖 See [docs/RATE_LIMITING.md](./docs/RATE_LIMITING.md) for detailed setup instructions.

### Environment Variables

Required:
- `AI_SEARCH_INDEX`: Your Cloudflare AI Search index name

**GitHub Secrets** (for deployment workflow):
- `CLOUDFLARE_API_TOKEN`: API token with Workers edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

**GitHub Variables**:
- `R2_CONTENT_BUCKET`: Content bucket name (default: `hono-content`)
- `R2_STATIC_BUCKET`: Static bucket name (default: `hono-static`)

## Search Functionality

The semantic search is powered by Cloudflare AI Search:

1. **Manual Indexing**: After deploying content, click **Sync** in AI Search dashboard
2. **Embedding Generation**: AI Search converts content to vector embeddings
3. **Query Processing**: User searches are vectorized and matched against indexed content
4. **Reranking**: Results are reranked for relevance
5. **Results**: Returned via `/api/search` endpoint

**Indexing workflow**:
1. Deploy content to R2 (via GitHub Actions or manual upload)
2. Go to Cloudflare Dashboard → **AI** → **AI Search** → Your index
3. Click **Sync** to trigger re-indexing
4. Wait for job to complete (check **Jobs** tab)
5. Search will now return updated results

**Search features:**
- ⌘K keyboard shortcut to open
- Real-time results as you type
- Debounced API calls (300ms)
- Understanding of synonyms and related concepts
- Typo tolerance

See `content/features/semantic-search.md` for detailed documentation.

## Content Management

### Adding Content

1. Create markdown file in `./content/folder/article.md`
2. Add frontmatter:
   ```markdown
   ---
   title: Article Title
   tags: [tag1, tag2]
   ---
   ```
3. Commit and push to GitHub
4. GitHub Actions uploads to R2
5. **Manually trigger AI Search sync** in Cloudflare dashboard

### Deleting Content

1. Delete file from `./content`
2. Commit and push
3. **Manually delete from R2**:
   ```bash
   npx wrangler r2 object delete hono-content/folder/article.md --remote
   ```
4. **Manually trigger AI Search sync** in Cloudflare dashboard

See `content/features/r2-storage.md` for full deletion workflow.

## Known Limitations

### Local Development

- **No local dev**: `pnpm dev` is disabled because R2 and AI Search bindings aren't available locally
- **Use remote dev**: `pnpm dev:remote` runs against Cloudflare infrastructure
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for details

### Manual Deletion

- Deleting files from `./content` doesn't automatically delete from R2
- Must manually run `npx wrangler r2 object delete` command
- See R2 Storage documentation for details

### Islands Hydration

- React islands (Search, ThemeSwitcher, DocsToc) use `createRoot()` for client-side mounting
- Islands are not server-rendered (client-only components)

## Development Notes

### Hono JSX vs React

- Server components use Hono JSX (imported from `hono/jsx`)
- Client islands use React (imported from `react`)
- `tsconfig.json` uses `"jsxImportSource": "hono/jsx"` by default
- Islands override with `/** @jsxImportSource react */` pragma

### File Extensions

- `.tsx` files in `app/routes/` and `app/components/` use Hono JSX
- `.tsx` files in `app/islands/` use React with pragma override
- `app/client.tsx` handles island hydration with `createRoot()`

### CSS & Styling

- Tailwind CSS 4 via `@tailwindcss/vite` plugin
- CSS variables in `app/style.css` for theming
- Multiple theme support (dark, light, ocean, forest, sunset, purple)

### Cache Busting

- Client JavaScript uses timestamped filenames: `client.1731369600000.js`
- Generated during build via `scripts/generate-client-manifest.ts`
- Ensures users get latest code after deployments

## Documentation

Comprehensive guides available in `content/features/`:

- **[semantic-search.md](./content/features/semantic-search.md)** - How AI Search works
- **[honox-framework.md](./content/features/honox-framework.md)** - HonoX routing and SSR
- **[r2-storage.md](./content/features/r2-storage.md)** - R2 architecture and file management
- **[react-islands.md](./content/features/react-islands.md)** - Islands architecture

Setup guides in `docs/`:

- **[CLOUDFLARE_SETUP.md](./docs/CLOUDFLARE_SETUP.md)** - Complete Cloudflare setup
- **[RATE_LIMITING.md](./docs/RATE_LIMITING.md)** - Rate limiting configuration
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflows

## Contributing

Contributions welcome! This is a community-driven project.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linter: `pnpm lint && pnpm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

- Built with [HonoX](https://github.com/honojs/honox)
- Search powered by [Cloudflare AI Search](https://developers.cloudflare.com/ai-search/)
- Storage via [Cloudflare R2](https://developers.cloudflare.com/r2/)
- Inspired by [semantic-docs](https://github.com/llbbl/semantic-docs) (Astro version)

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/llbbl/semantic-docs-hono/issues)
- **Discussions**: Share ideas and ask questions
- **Documentation**: Check `content/features/` for comprehensive guides
