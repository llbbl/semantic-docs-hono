# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**semantic-docs-hono** is a HonoX-based documentation theme with semantic vector search powered by Cloudflare AI Search. It's designed for deployment on Cloudflare Workers and uses R2 for content storage with automatic AI-powered search indexing.

**Key differences from semantic-docs (Astro)**:
- Built with **HonoX** instead of Astro
- Targets **Cloudflare Workers** runtime
- Uses **Hono JSX** for SSR + **React islands** for client-side interactivity
- Manual HTML rendering with `c.html()` or `c.body()` instead of Astro layouts
- **R2 + AI Search** instead of Turso/libSQL for content and search

## Essential Commands

### Development
```bash
# Install dependencies
pnpm install

# Start dev server (requires Cloudflare bindings)
pnpm dev:remote

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Content Management
```bash
# No database indexing required!
# Content is uploaded to R2 and automatically indexed by AI Search

# Run tests
pnpm test

# Linting and formatting
pnpm lint       # Check code with Biome
pnpm lint:fix   # Auto-fix issues
pnpm format     # Format all files
```

**Important:**
- Local dev (`pnpm dev`) is disabled - must use `pnpm dev:remote` with Cloudflare
- Content in `./content` is deployed to R2 via GitHub Actions
- AI Search automatically indexes R2 content (no manual indexing step)
- Search is fully managed by Cloudflare AI Search

## Architecture

### Framework & Runtime
- **HonoX**: File-based routing meta-framework built on Hono
- **Runtime**: Cloudflare Workers (not Node.js)
- **Storage**: R2 buckets (two-bucket architecture)
- **Search**: Cloudflare AI Search with automatic embedding generation
- **Build Tool**: Vite with HonoX plugins

### Two-Bucket R2 Architecture

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
- `hono-content`: Only markdown files (indexed by AI Search for semantic search)
- `hono-static`: JavaScript, CSS, manifest (not indexed, saves resources)

### Content Flow

1. **Developer pushes to GitHub**: Markdown files in `./content`
2. **GitHub Actions workflow**:
   - Builds project with Vite
   - Uploads markdown to `hono-content` R2 bucket
   - Uploads static assets to `hono-static` R2 bucket
   - Deploys Worker to Cloudflare
3. **AI Search auto-indexes**: Cloudflare AI Search detects new/updated files in `hono-content` and indexes them (5-15 minutes)
4. **User requests page**: Worker fetches markdown from R2, renders HTML with HonoX
5. **User searches**: Search API calls AI Search, which returns semantically relevant results

### Key Components

#### Routes (`app/routes/`)
- **index.tsx**: Home page (server-rendered with Hono JSX)
- **content/[...slug].tsx**: Dynamic article pages (fetches from R2)
- **api/search.ts**: Search API endpoint (uses Cloudflare AI Search)

All routes wrapped with `createRoute()` from `honox/factory` and return `c.html()`, `c.body()`, or `c.json()`.

#### Components (`app/components/`)
- **DocsHeader.tsx**: Header with nav (Hono JSX)
- **DocsSidebar.tsx**: Navigation sidebar (Hono JSX)
- Uses `import type { FC } from 'hono/jsx'` for typing

#### Islands (`app/islands/`)
- **Search.tsx**: Search dialog with ⌘K shortcut (React)
- **ThemeSwitcher.tsx**: Theme toggle (React)
- **DocsToc.tsx**: Table of contents (React)
- Hydrated via `app/client.tsx` using `react-dom/client` with `createRoot()`

### R2 Integration

Content is fetched from R2 at runtime:

```tsx
// Fetch markdown from R2
const file = await c.env.CONTENT.get('features/intro.md');
if (!file) return c.text('Not found', 404);

const markdown = await file.text();
```

**R2 bindings** (defined in `wrangler.toml`):
- `c.env.CONTENT`: Access to `hono-content` bucket
- `c.env.STATIC`: Access to `hono-static` bucket

### AI Search Integration

Search uses Cloudflare AI Search API:

```tsx
const searchResponse = await c.env.AI.autorag(c.env.AI_SEARCH_INDEX).search({
  query: userQuery,
  max_num_results: 10,
  rerank: true,
});

// Returns: { data: [...], has_more: boolean, next_page: string | null }
```

**No manual indexing required** - AI Search automatically:
- Detects new/updated files in R2
- Generates embeddings
- Updates search index
- Handles reranking for relevance

### Environment Variables

Set in Cloudflare Dashboard (Workers & Pages → Settings → Variables):
- `AI_SEARCH_INDEX`: Your AI Search index name (e.g., `semantic-docs`)

**No database credentials needed** - R2 and AI are bound via `wrangler.toml`.

## Critical Configuration

### wrangler.toml

```toml
name = "semantic-docs-hono"
main = "dist/index.js"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[[r2_buckets]]
binding = "CONTENT"
bucket_name = "hono-content"  # Markdown files (scanned by AI Search)

[[r2_buckets]]
binding = "STATIC"
bucket_name = "hono-static"   # Static assets (not scanned)
```

### Vite Config (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [
    honox(),
    tailwindcss(),
    devServer({ exclude: [/.*\/manifest\.json$/, /^\/@.+$/, /\/static\/.*/] }),
    build(),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Note**: No environment variable injection needed for R2/AI Search (uses bindings).

### TypeScript Config

`jsxImportSource` is set to `"hono/jsx"` for server components. **Never** change this.

```json
{
  "compilerOptions": {
    "jsxImportSource": "hono/jsx"
  }
}
```

React islands override with `/** @jsxImportSource react */` pragma.

### Content Structure

Content in `./content` must follow this pattern:

```
content/
├── getting-started/
│   ├── installation.md
│   └── quickstart.md
├── features/
│   ├── semantic-search.md
│   ├── honox-framework.md
│   ├── r2-storage.md
│   └── react-islands.md
└── guides/
    └── deployment.md
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
- **HTML rendering**: Use `c.body(\`<!DOCTYPE html>\${html}\`)` for DOCTYPE, or `c.html()` for fragments
- **API routes**: Return `c.json()` for JSON responses

Example:

```tsx
export default createRoute(async (c) => {
  const slug = c.req.path.replace('/content/', '');

  // Fetch from R2
  const file = await c.env.CONTENT.get(`${slug}.md`);
  if (!file) return c.text('Not found', 404);

  const content = await file.text();

  const html = (
    <html lang="en">
      <head><title>{slug}</title></head>
      <body>{content}</body>
    </html>
  );

  c.header('Content-Type', 'text/html; charset=UTF-8');
  return c.body(`<!DOCTYPE html>${html}`);
});
```

**DOCTYPE handling**: JSX escapes `<!DOCTYPE html>`, so use string concatenation with `c.body()`.

## Integration Points

### Cloudflare AI Search

The project uses Cloudflare AI Search for semantic vector search:

1. **Automatic indexing**: AI Search scans `hono-content` bucket
2. **No manual steps**: No embedding generation or database writes needed
3. **Search API**: Use `c.env.AI.autorag(indexName).search()` in routes
4. **Reranking**: Enable `rerank: true` for better relevance

See `app/routes/api/search.ts` for full implementation.

### React Islands

To add a new island:

1. Create component in `app/islands/MyComponent.tsx`
2. Add pragma: `/** @jsxImportSource react */`
3. Use React hooks: `import { useState } from 'react'`
4. Register in `app/client.tsx`:
   ```tsx
   const islands = {
     Search,
     ThemeSwitcher,
     DocsToc,
     MyComponent, // ← Add here
   };
   ```
5. Add to page with `data-hydrate` attributes:
   ```tsx
   <div
     data-hydrate="true"
     data-component="MyComponent"
     data-props='{"foo":"bar"}'
   />
   ```

**Hydration**: Uses `createRoot()` not `hydrateRoot()` because islands aren't SSR.

### Styling

- Uses **Tailwind CSS 4** via `@tailwindcss/vite` plugin
- CSS variables defined in `app/style.css` for theming
- Multi-theme system with 6 pre-built themes
- Theme switching handled by `ThemeSwitcher` island

### Security & Rate Limiting

- **No in-memory rate limiting** (doesn't work in Workers isolates)
- **Use Cloudflare Dashboard**: Security → WAF → Rate limiting rules
- Query length validation: 500 character maximum
- Results limit enforcement: 1-20 results
- See `docs/RATE_LIMITING.md` for setup

## Deployment

### Cloudflare Workers

The project is built for Cloudflare Workers deployment:

```bash
# Build
pnpm build

# Deploy
pnpm deploy
```

**Deployment workflow** (via GitHub Actions):
1. Checkout code
2. Install dependencies
3. Build project
4. Upload markdown to `hono-content` R2 bucket
5. Upload static assets to `hono-static` R2 bucket
6. Deploy Worker to Cloudflare

**Environment variables** must be set in Cloudflare dashboard:
- `AI_SEARCH_INDEX`: Your AI Search index name

**GitHub secrets/variables** (for Actions):
- `CLOUDFLARE_API_TOKEN`: API token with Workers edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your account ID
- `R2_CONTENT_BUCKET`: Content bucket name (variable, not secret)
- `R2_STATIC_BUCKET`: Static bucket name (variable, not secret)

### Known Limitations

#### Local Development

- **No local dev**: `pnpm dev` is disabled because R2 and AI Search bindings aren't available locally
- **Use remote dev**: `pnpm dev:remote` runs `wrangler dev --remote` against Cloudflare
- See `DEVELOPMENT.md` for details

#### Cache Busting

- Client JavaScript uses timestamped filenames: `client.1731369600000.js`
- Generated during build via `scripts/generate-client-manifest.ts`
- Ensures users get latest JavaScript after deployments

#### File Deletion

- **Manual deletion required**: Removing files from `./content` doesn't delete from R2
- Must run: `npx wrangler r2 object delete hono-content/path/to/file.md --remote`
- See `content/features/r2-storage.md` for full deletion workflow

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
- [ ] Remote dev server starts: `pnpm dev:remote`
- [ ] Homepage loads: Visit worker URL in browser
- [ ] No SSR errors in wrangler output
- [ ] CSS loads and applies correctly
- [ ] JavaScript client bundle loads
- [ ] React islands mount (Search, ThemeSwitcher, DocsToc)
- [ ] No browser console errors (check DevTools)

### 4. API Endpoints
- [ ] Homepage returns HTML
- [ ] Search API responds: Test via search dialog or direct POST request
- [ ] Search API validates input (rejects malformed requests)
- [ ] Search returns results (if AI Search index has data)

### 5. Navigation & UI
- [ ] Sidebar renders (if manifest.json exists in R2)
- [ ] Header renders with correct links
- [ ] Theme switcher button visible
- [ ] Search dialog opens with ⌘K
- [ ] Mobile menu button works
- [ ] GitHub link present and correct

### 6. Content & Routing
- [ ] Content pages load from R2: `/content/*`
- [ ] 404 handling works for missing pages
- [ ] Static files serve from R2

### 7. R2 & External Services
- [ ] R2 buckets accessible (check wrangler logs)
- [ ] AI Search returns results (check `/api/search` endpoint)
- [ ] Graceful error messages when content missing
- [ ] Manifest loads from R2 static bucket

### 8. Workers Compatibility
- [ ] No `module is not defined` errors
- [ ] No `fetch() at global scope` errors
- [ ] No async operations outside request handlers
- [ ] `nodejs_compat` flag set in `wrangler.toml`
- [ ] No CommonJS dependencies bundled incorrectly

### 9. Documentation
- [ ] README.md deployment instructions accurate
- [ ] Environment variables documented
- [ ] `wrangler.toml` has correct R2 bucket bindings
- [ ] CLAUDE.md context is current

### 10. Final Smoke Tests

Run all these commands in sequence - all must pass:

```bash
pnpm lint                        # Linter passes
npx tsc --noEmit                 # TypeScript compiles
pnpm build                       # Build succeeds
npx wrangler deploy --dry-run    # Deployment validates
pnpm dev:remote                  # Remote dev starts
# Then test in browser at the wrangler-provided URL
```

**If any item fails, do NOT declare the work complete.** Fix the issue and re-run the full checklist.

## Common Tasks

### Adding New Content

1. Create markdown file in `./content/folder/article.md`
2. Add frontmatter with title and tags
3. Commit and push to GitHub
4. GitHub Actions automatically uploads to R2
5. AI Search re-indexes within 5-15 minutes

### Deleting Content

1. Delete file from `./content`
2. Commit and push
3. **Manually delete from R2**: `npx wrangler r2 object delete hono-content/folder/article.md --remote`
4. Trigger AI Search sync in dashboard (or wait for auto-sync)

### Updating Search Behavior

1. Edit `app/routes/api/search.ts`
2. Modify search query parameters (max_num_results, rerank, etc.)
3. Test with `pnpm dev:remote`
4. Deploy

### Creating New React Island

1. Create `app/islands/MyIsland.tsx` with `/** @jsxImportSource react */`
2. Register in `app/client.tsx`
3. Use in route with `data-hydrate` attributes
4. Test hydration in browser

## Troubleshooting

### Search Returns No Results

1. Check AI Search index status in dashboard
2. Verify files uploaded to R2: `npx wrangler r2 object list hono-content --remote`
3. Check `AI_SEARCH_INDEX` env var is set in Worker settings
4. Trigger manual sync in AI Search dashboard

### Content Not Loading

1. Check R2 bucket contains file: `npx wrangler r2 object list hono-content --remote`
2. Verify slug matches R2 path
3. Check wrangler logs for errors: `npx wrangler tail`

### Islands Not Hydrating

1. Verify client bundle loads: Check Network tab for `client.*.js`
2. Check browser console for errors
3. Verify island registered in `app/client.tsx`
4. Check `data-hydrate="true"` and `data-component` match

### Build Errors

1. Check TypeScript: `npx tsc --noEmit`
2. Check linter: `pnpm lint`
3. Verify all imports use correct paths
4. Check for missing dependencies

## Additional Resources

- **HonoX Docs**: [github.com/honojs/honox](https://github.com/honojs/honox)
- **Cloudflare Workers**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
- **R2 Storage**: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/)
- **AI Search**: [developers.cloudflare.com/ai-search](https://developers.cloudflare.com/ai-search/)
- **Project Docs**: See `content/features/` for comprehensive guides
