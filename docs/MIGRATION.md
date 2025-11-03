# Astro to HonoX Migration - Complete

## Migration Summary

Successfully migrated the semantic-docs Astro site to HonoX for Cloudflare Workers deployment.

## What Was Changed

### 1. Project Structure
- **Created `app/` directory** with HonoX structure:
  - `app/routes/` - File-based routing
  - `app/islands/` - React client components with hydration
  - `app/components/` - Server-side React components
  - `app/server.ts` - Main Hono server entry
  - `app/client.ts` - Client-side hydration logic
  - `app/renderer.tsx` - React renderer for HonoX
  - `app/style.css` - Global styles (from src/styles/global.css)

### 2. Configuration Files
- **Replaced `astro.config.mjs`** with **`vite.config.ts`**
  - Configured HonoX with Cloudflare Workers adapter
  - Set up Tailwind CSS 4 via @tailwindcss/vite
  - Configured client entry points and aliases

- **Created `wrangler.toml`** for Cloudflare Workers deployment
  - Configured compatibility date
  - Set up environment variable placeholders

- **Updated `package.json`**:
  - Removed: `astro`, `@astrojs/node`, `@astrojs/react`
  - Added: `hono`, `honox`, `@hono/vite-build`, `@hono/vite-dev-server`, `@hono/react-renderer`, `wrangler`
  - Updated scripts:
    - `dev`: Uses `vite` instead of `astro dev`
    - `build`: Uses `vite build`
    - `preview`: Uses `wrangler pages dev`
    - `deploy`: Uses `wrangler pages deploy`

### 3. Database Integration
- **Updated `src/lib/turso.ts`**:
  - Changed import from `@libsql/client` to `@libsql/client/web` (required for Workers)
  - This ensures compatibility with Cloudflare Workers runtime

### 4. Components Migration
- **Converted Astro components to React**:
  - `DocsHeader.astro` → `app/components/DocsHeader.tsx`
  - `DocsSidebar.astro` → `app/components/DocsSidebar.tsx`
  - `DocsLayout.astro` → Integrated into `app/renderer.tsx`

- **Moved React islands to `app/islands/`**:
  - `Search.tsx` - Semantic search with ⌘K shortcut
  - `DocsToc.tsx` - Table of contents with intersection observer
  - `ThemeSwitcher.tsx` - Theme switcher component
  - UI components: `command.tsx`, `dialog.tsx`

### 5. Routes Migration
- **Created HonoX routes**:
  - `app/routes/index.tsx` - Home page (from `/pages/index.astro`)
  - `app/routes/content/[slug].tsx` - Dynamic article pages (from `/pages/content/[...slug].astro`)
  - `app/routes/api/search.ts` - Search API endpoint (from `/pages/api/search.json.ts`)

### 6. Middleware
- **Updated `src/middleware/rateLimit.ts`**:
  - Converted to Hono middleware
  - Added `rateLimitMiddleware()` function for use with Hono routes
  - Updated to use Hono's `Context` instead of Web API `Request`

### 7. Styling
- **Kept Tailwind CSS 4 setup**:
  - Same CSS variables and theme system
  - Same multi-theme support (dark, light, ocean, forest, sunset, purple)
  - All styles copied to `app/style.css`

## What Stays The Same

- ✅ **Content structure** in `./content/` directory
- ✅ **Database scripts**: `scripts/init-db.ts` and `scripts/index-content.ts`
- ✅ **Turso database** connection and libsql-search integration
- ✅ **Vector search** functionality
- ✅ **Rate limiting** logic (adapted to Hono)
- ✅ **Styling system** (Tailwind CSS 4 with themes)
- ✅ **Utility functions** in `src/lib/`

## Next Steps

### 1. Test the Development Server
```bash
# Make sure database is indexed
pnpm index:local  # Or pnpm index if using Turso

# Start dev server
pnpm dev
```

The dev server should start on `http://localhost:5173` (default Vite port).

### 2. Test Key Functionality
- [ ] Home page renders correctly
- [ ] Article pages load with proper content
- [ ] Sidebar navigation works
- [ ] Search functionality works (⌘K to open)
- [ ] Table of contents appears and works
- [ ] Theme switcher works
- [ ] Mobile menu works

### 3. Configure Environment Variables
Set up Cloudflare Workers environment variables:

```bash
# For Turso (production)
wrangler secret put TURSO_DB_URL
wrangler secret put TURSO_AUTH_TOKEN

# Optional: embedding provider
wrangler secret put EMBEDDING_PROVIDER  # "local", "gemini", or "openai"
wrangler secret put GEMINI_API_KEY      # if using Gemini
wrangler secret put OPENAI_API_KEY      # if using OpenAI
```

### 4. Build for Production
```bash
pnpm build
```

This will create a `dist/` directory with the Cloudflare Workers build.

### 5. Deploy to Cloudflare Workers
```bash
pnpm deploy
```

Or use Wrangler directly:
```bash
wrangler pages deploy
```

## Important Notes

### SSR vs Pre-rendering
Unlike Astro's `getStaticPaths()`, HonoX uses **full server-side rendering**:
- Article pages are rendered on each request
- No pre-generation of static HTML
- Consider implementing caching with Cloudflare Cache API for better performance

### Caching Strategy (Optional)
To improve performance, consider adding Cloudflare Cache API:

```typescript
// In article route
const cache = caches.default;
const cacheKey = new Request(c.req.url);
let response = await cache.match(cacheKey);

if (!response) {
  // Render page
  response = await renderPage();
  // Cache for 1 hour
  response.headers.set('Cache-Control', 'public, max-age=3600');
  await cache.put(cacheKey, response.clone());
}
```

### Client Hydration
The islands architecture works as follows:
1. Server renders initial HTML
2. Client-side script (`app/client.ts`) looks for `data-hydrate` attributes
3. React components are hydrated only where needed (Search, TOC, ThemeSwitcher)

### Database Connection
- The `/web` import for `@libsql/client` is **required** for Cloudflare Workers
- Local SQLite fallback works in development but won't work in Workers (use Turso)

## Troubleshooting

### Common Issues

1. **Module resolution errors**: Make sure `tsconfig.json` has proper path aliases
2. **Build errors**: Check that all imports use relative paths or configured aliases
3. **Runtime errors in Workers**: Ensure no Node.js-specific APIs are used
4. **Hydration mismatches**: Check that server and client render the same initial HTML

### Getting Help
- HonoX docs: https://github.com/honojs/honox
- Hono docs: https://hono.dev
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/

## Files Created/Modified

### New Files
- `vite.config.ts`
- `wrangler.toml`
- `app/server.ts`
- `app/client.ts`
- `app/renderer.tsx`
- `app/style.css`
- `app/routes/index.tsx`
- `app/routes/content/[slug].tsx`
- `app/routes/api/search.ts`
- `app/components/DocsHeader.tsx`
- `app/components/DocsSidebar.tsx`
- `app/islands/Search.tsx` (moved)
- `app/islands/DocsToc.tsx` (moved)
- `app/islands/ThemeSwitcher.tsx` (moved)
- `app/islands/ui/command.tsx` (moved)
- `app/islands/ui/dialog.tsx` (moved)

### Modified Files
- `package.json` (dependencies and scripts)
- `src/lib/turso.ts` (web client import)
- `src/middleware/rateLimit.ts` (Hono middleware)

### Deprecated Files (can be deleted after testing)
- `astro.config.mjs`
- `src/pages/` directory
- `src/components/` directory (old Astro components)
- `src/layouts/` directory

## Migration Status: ✅ COMPLETE

The migration from Astro to HonoX is complete. All core functionality has been ported to the new architecture. The site is ready for testing and deployment to Cloudflare Workers.
