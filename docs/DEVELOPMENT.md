# Development Guide

This guide explains how to work on `semantic-docs-hono` locally.

## ⚠️ Important: Local Development Limitations

This project is **tightly coupled to Cloudflare Workers infrastructure**:
- **R2 Buckets**: Content and static assets are stored in Cloudflare R2
- **AI Search**: Semantic search requires Cloudflare AI Search index
- **Workers Runtime**: Some APIs only work in the Cloudflare Workers environment

**Traditional local development (`vite dev`) does not work** because these Cloudflare services aren't available locally.

## Development Options

### Option 1: Remote Development (Recommended)

Use `wrangler dev --remote` to run your Worker remotely while editing code locally:

```bash
# Prerequisites: Must be logged in and have R2/AI Search configured
wrangler login

# Start remote development server
pnpm dev:remote
```

**How it works:**
- Code runs on Cloudflare's edge (not localhost)
- Has full access to R2 buckets and AI Search
- Hot-reloads on code changes
- Requires internet connection

**Pros:**
- ✅ Full access to R2 and AI Search
- ✅ Identical to production environment
- ✅ No local setup required

**Cons:**
- ❌ Requires internet connection
- ❌ Slightly slower than local development
- ❌ Uses Cloudflare resources (usually free tier is fine)

### Option 2: Build and Deploy

For quick iterations, build and deploy to Cloudflare:

```bash
# Build everything
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy
```

Then test at your worker URL (e.g., `https://your-worker.workers.dev`).

### Option 3: Mock Local Development (Future)

**Status: Not implemented** - We could add local mocks for R2/AI Search in the future.

If you want to contribute this, you'd need to:
1. Mock R2 bucket responses with local filesystem
2. Mock AI Search with local embedding search
3. Add a `dev:local` script that uses these mocks

## Prerequisites for Development

Before running `pnpm dev:remote`, ensure you have:

1. **Cloudflare Account** and logged in via Wrangler:
   ```bash
   wrangler login
   ```

2. **R2 Buckets Created**:
   ```bash
   wrangler r2 bucket create hono-content
   wrangler r2 bucket create hono-static
   ```

3. **Content Uploaded to R2**:
   ```bash
   # Generate manifest
   pnpm generate:manifest

   # Upload markdown to content bucket
   find ./content -type f -name "*.md" | while read -r file; do
     relative_path="${file#./content/}"
     wrangler r2 object put "hono-content/$relative_path" --file="$file"
   done

   # Upload manifest to static bucket
   wrangler r2 object put "hono-static/manifest.json" --file=manifest.json
   ```

4. **AI Search Index Created** (see `docs/CLOUDFLARE_SETUP.md`)

5. **Environment Variables Set** in Cloudflare Dashboard:
   - `AI_SEARCH_INDEX` = your index name

## Development Workflow

### Making Changes

1. **Edit code** in your editor
2. **Run remote dev**:
   ```bash
   pnpm dev:remote
   ```
3. **Visit the URL** shown in terminal (e.g., `http://localhost:8787`)
4. **Make changes** - wrangler will hot-reload

### Testing Changes

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Check types
npx tsc --noEmit

# Lint code
pnpm lint
```

### Building

```bash
# Build everything (client + server)
pnpm build

# Build only client bundle
pnpm build:client

# Build only server bundle
pnpm build:server
```

## Common Development Tasks

### Adding New Content

1. Add markdown files to `./content/folder-name/article.md`
2. Regenerate manifest:
   ```bash
   pnpm generate:manifest
   ```
3. Upload to R2:
   ```bash
   wrangler r2 object put "hono-content/folder-name/article.md" --file="./content/folder-name/article.md"
   wrangler r2 object put "hono-static/manifest.json" --file=manifest.json
   ```
4. Wait for AI Search to re-index (or manually trigger sync in dashboard)

### Updating Styles

1. Edit `app/style.css` or component styles
2. Rebuild client:
   ```bash
   pnpm build:client
   ```
3. The CSS is inlined in the worker bundle, so redeploy:
   ```bash
   pnpm deploy
   ```

### Adding New Islands

1. Create component in `app/islands/MyIsland.tsx`
2. Add `/** @jsxImportSource react */` at the top
3. Register in `app/client.tsx`:
   ```tsx
   import MyIsland from './islands/MyIsland';

   const islands = {
     DocsToc,
     Search,
     ThemeSwitcher,
     MyIsland, // Add here
   };
   ```
4. Use in route:
   ```tsx
   <div
     data-hydrate="true"
     data-component="MyIsland"
     data-props='{"foo":"bar"}'
   />
   ```

## Debugging

### View Worker Logs

```bash
# Tail logs in real-time
wrangler tail
```

Or view in Cloudflare Dashboard: **Workers & Pages** → Your worker → **Logs**

### Check R2 Bucket Contents

```bash
# List files in content bucket
wrangler r2 object list hono-content

# List files in static bucket
wrangler r2 object list hono-static

# Download a file to inspect
wrangler r2 object get hono-static/manifest.json
```

### Test AI Search

Use the search API directly:
```bash
curl -X POST https://your-worker.workers.dev/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":5}'
```

## Troubleshooting

### `pnpm dev` shows error

This is expected! Use `pnpm dev:remote` instead. The `pnpm dev` command is intentionally disabled because Vite's dev server can't access Cloudflare bindings.

### "Manifest not found" error

Your manifest isn't uploaded to R2. Run:
```bash
pnpm generate:manifest
wrangler r2 object put "hono-static/manifest.json" --file=manifest.json
```

### "Client bundle not found" error

Build and upload the client bundle:
```bash
pnpm build:client
CLIENT_FILE=$(ls dist/static/client.*.js | head -1)
wrangler r2 object put "hono-static/$(basename "$CLIENT_FILE")" --file="$CLIENT_FILE"
```

### Search returns 500 error

Check that:
1. `AI_SEARCH_INDEX` environment variable is set in Cloudflare Dashboard
2. AI Search index is created and points to `hono-content` bucket
3. AI Search has finished indexing (check status in dashboard)

## Contributing

When contributing:

1. **Always run linter and type checks**:
   ```bash
   pnpm lint
   npx tsc --noEmit
   ```

2. **Test your changes**:
   ```bash
   pnpm test
   pnpm dev:remote  # Manual testing
   ```

3. **Update documentation** if adding features

4. **Follow existing patterns**:
   - Server components use Hono JSX
   - Client islands use React (with `@jsxImportSource react`)
   - Use TypeScript types from `app/types.ts`

## Future Improvements

Ideas for better local development:

- [ ] Add local R2 mocks using filesystem
- [ ] Add local AI Search mock using in-memory vector DB
- [ ] Create `dev:local` script that uses mocks
- [ ] Add Docker Compose setup for local services
- [ ] Add storybook for component development

If you want to tackle any of these, PRs are welcome!
