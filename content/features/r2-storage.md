---
title: R2 Storage Architecture
tags: [r2, cloudflare, storage, caching, deployment]
---

# R2 Storage Architecture

This site uses **Cloudflare R2** for edge-optimized object storage. All content and static assets are stored in R2 and served globally via Cloudflare's CDN.

## What is R2?

Cloudflare R2 is S3-compatible object storage with zero egress fees. Perfect for storing:

- Markdown documentation files
- JavaScript/CSS bundles
- Images and media
- Any static files

**Key benefits:**
- **Global distribution** - Cached at Cloudflare's edge
- **Zero egress fees** - No charges for bandwidth
- **Fast reads** - Average 10-50ms latency
- **S3-compatible API** - Easy migration from AWS

## Two-Bucket Architecture

We use **two separate R2 buckets** to optimize AI Search:

```
┌─────────────────────────────────────────┐
│         Cloudflare Worker               │
│                                         │
│  ┌─────────────┐    ┌─────────────┐   │
│  │   CONTENT   │    │   STATIC    │   │
│  │   binding   │    │   binding   │   │
│  └──────┬──────┘    └──────┬──────┘   │
└─────────┼──────────────────┼───────────┘
          │                  │
          ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  hono-content    │  │  hono-static     │
│                  │  │                  │
│ ✅ Scanned by    │  │ ❌ Not indexed   │
│    AI Search     │  │                  │
│                  │  │                  │
│ • *.md files     │  │ • *.js files     │
│ • Indexed        │  │ • *.css files    │
│ • Searchable     │  │ • *.woff2 fonts  │
│                  │  │ • manifest.json  │
└──────────────────┘  └──────────────────┘
```

### Bucket 1: hono-content

**Purpose**: Markdown documentation files only

**What's stored:**
```
content/
├── getting-started/
│   ├── installation.md
│   └── quickstart.md
├── features/
│   ├── semantic-search.md
│   ├── honox-framework.md
│   └── r2-storage.md
└── guides/
    └── deployment.md
```

**Why separate?**
- AI Search automatically indexes this bucket
- Prevents wasting resources indexing non-content files
- Keeps search results relevant

### Bucket 2: hono-static

**Purpose**: Static assets (JavaScript, CSS, fonts, etc.)

**What's stored:**
```
static/
├── client.[timestamp].js     # React islands bundle
├── client.[timestamp].css    # Tailwind styles
├── manifest.json             # Content manifest
└── fonts/
    └── inter.woff2
```

**Why separate?**
- Not indexed by AI Search
- Cache busting for JavaScript bundles
- Separate from content updates

## Configuration

### wrangler.toml

Define both buckets as bindings:

```toml
name = "semantic-docs-hono"
main = "dist/index.js"
compatibility_date = "2024-11-01"

[[r2_buckets]]
binding = "CONTENT"
bucket_name = "hono-content"

[[r2_buckets]]
binding = "STATIC"
bucket_name = "hono-static"
```

### Environment Variables (GitHub Actions)

Set these in **Settings → Secrets and variables → Actions → Variables**:

```bash
R2_CONTENT_BUCKET=hono-content
R2_STATIC_BUCKET=hono-static
```

Also need repository secrets for authentication:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

## Accessing R2 in Code

### In Server Routes

Access buckets via Hono context:

```tsx
import { createRoute } from 'honox/factory';
import type { Env } from '@/types';

export default createRoute(async (c) => {
  // Get markdown file from content bucket
  const mdFile = await c.env.CONTENT.get('features/intro.md');

  if (!mdFile) {
    return c.text('Not found', 404);
  }

  const content = await mdFile.text();

  return c.html(<article>{content}</article>);
});
```

### Getting File Metadata

R2 returns objects with metadata:

```tsx
const file = await c.env.CONTENT.get('docs/guide.md');

if (file) {
  console.log({
    key: file.key,
    size: file.size,
    etag: file.etag,
    uploaded: file.uploaded,
    httpEtag: file.httpEtag,
  });

  const content = await file.text();
}
```

### Listing Files

List all files in a bucket:

```tsx
const list = await c.env.CONTENT.list({
  prefix: 'features/',  // Optional: filter by prefix
  limit: 100,           // Optional: limit results
});

for (const object of list.objects) {
  console.log(object.key);
}
```

### Checking if File Exists

```tsx
const exists = await c.env.CONTENT.head('docs/intro.md');

if (exists) {
  // File exists, get it
  const file = await c.env.CONTENT.get('docs/intro.md');
}
```

## Cache Busting Strategy

### Problem

Browsers cache JavaScript/CSS aggressively. Without cache busting:

```html
<script src="/client.js"></script>
<!-- Browser caches this forever! -->
```

When you deploy updates, users might see old JavaScript.

### Solution: Timestamp-Based Filenames

We embed timestamps in filenames:

```
client.1731369600000.js  ← Timestamp in filename
client.1731369700000.js  ← New deploy = new filename
```

### Implementation

#### 1. Build Script

During build, create manifest with timestamped filename:

```typescript
// scripts/generate-client-manifest.ts
import { writeFileSync } from 'node:fs';

const timestamp = Date.now();
const filename = `client.${timestamp}.js`;

// Write manifest
writeFileSync(
  'app/client-manifest.ts',
  `// Auto-generated - do not edit
export const clientFilename = '${filename}';
`
);

console.log(`Generated: ${filename}`);
```

**Run this before build:**
```json
{
  "scripts": {
    "build": "pnpm generate:client-manifest && pnpm build:client && pnpm build:server"
  }
}
```

#### 2. Reference in HTML

Import manifest and use in HTML:

```tsx
// app/routes/index.tsx
import { clientFilename } from '~/client-manifest';

export default createRoute(async (c) => {
  return c.html(
    <html>
      <head>
        <script type="module" src={`/${clientFilename}`} />
      </head>
      <body>...</body>
    </html>
  );
});
```

#### 3. Upload to R2

GitHub Actions uploads with timestamped name:

```yaml
- name: Upload client bundle to R2
  run: |
    TIMESTAMP=$(date +%s)000
    CLIENT_FILE="client.${TIMESTAMP}.js"

    wrangler r2 object put "${{ vars.R2_STATIC_BUCKET }}/${CLIENT_FILE}" \
      --file="./dist/static/client.js"
```

**Result**: Each deploy creates a new filename, bypassing browser cache.

## Deployment Workflow

### GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. Checkout code
      - uses: actions/checkout@v4

      # 2. Setup pnpm
      - uses: pnpm/action-setup@v4

      # 3. Setup Node.js
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      # 4. Install dependencies
      - run: pnpm install

      # 5. Build project
      - run: pnpm build

      # 6. Upload content to R2
      - name: Upload content to R2
        run: |
          for file in content/**/*.md; do
            REMOTE_PATH="${file#content/}"
            wrangler r2 object put "${{ vars.R2_CONTENT_BUCKET }}/${REMOTE_PATH}" \
              --file="${file}"
          done

      # 7. Upload static assets to R2
      - name: Upload static files to R2
        run: |
          TIMESTAMP=$(date +%s)000

          # Upload timestamped client JS
          CLIENT_FILE="client.${TIMESTAMP}.js"
          wrangler r2 object put "${{ vars.R2_STATIC_BUCKET }}/${CLIENT_FILE}" \
            --file="./dist/static/client.js"

          # Upload other static files
          wrangler r2 object put "${{ vars.R2_STATIC_BUCKET }}/manifest.json" \
            --file="./dist/static/manifest.json"

      # 8. Deploy Worker
      - name: Deploy to Cloudflare Workers
        run: pnpm deploy
```

### Manual Deployment

```bash
# Build locally
pnpm build

# Upload content
wrangler r2 object put "hono-content/features/new-doc.md" \
  --file="./content/features/new-doc.md"

# Upload static (with timestamp)
TIMESTAMP=$(date +%s)000
wrangler r2 object put "hono-static/client.${TIMESTAMP}.js" \
  --file="./dist/static/client.js"

# Deploy Worker
pnpm deploy
```

## Content Flow

### From Repo to User

```
┌─────────────────────────────────────────────────────┐
│ 1. Developer pushes to GitHub                       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. GitHub Actions triggers                          │
│    • Builds project                                 │
│    • Generates timestamped client.js                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Upload to R2                                     │
│    • content/*.md    → hono-content bucket          │
│    • client.*.js     → hono-static bucket           │
│    • manifest.json   → hono-static bucket           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. AI Search indexes content                        │
│    • Scans hono-content bucket                      │
│    • Generates embeddings                           │
│    • Updates search index (5-15 min)                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Deploy Cloudflare Worker                         │
│    • Updates Worker code                            │
│    • Binds to R2 buckets                            │
│    • Available globally (30-60 sec)                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. User requests page                               │
│    • Worker fetches markdown from R2                │
│    • Renders HTML with HonoX                        │
│    • Returns HTML + references to client.*.js       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 7. Browser loads assets                             │
│    • Fetches client.*.js from R2                    │
│    • Cached at Cloudflare edge                      │
│    • React islands hydrate                          │
└─────────────────────────────────────────────────────┘
```

## Performance Optimization

### Cache Headers

Set appropriate cache headers for R2 objects:

```tsx
export default createRoute(async (c) => {
  const file = await c.env.STATIC.get('client.123456789.js');

  if (!file) {
    return c.text('Not found', 404);
  }

  // Set aggressive cache headers (file has timestamp in name)
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('Content-Type', 'application/javascript');

  return c.body(await file.arrayBuffer());
});
```

**Cache strategies:**

| Asset Type | Cache-Control | Why |
|------------|---------------|-----|
| client.*.js | `public, max-age=31536000, immutable` | Filename includes timestamp |
| HTML pages | `public, max-age=300` | Content may update |
| Markdown | `public, max-age=3600` | Updated less frequently |

### Conditional Requests

Use ETags for conditional requests:

```tsx
const file = await c.env.CONTENT.get('docs/intro.md');
if (!file) return c.text('Not found', 404);

const clientETag = c.req.header('If-None-Match');

if (clientETag === file.httpEtag) {
  // File hasn't changed
  return c.text('', 304);
}

// File changed, return it
c.header('ETag', file.httpEtag);
return c.text(await file.text());
```

### Compression

R2 doesn't automatically compress. Compress before uploading:

```bash
# Compress client.js before upload
gzip -k dist/static/client.js

# Upload compressed version
wrangler r2 object put "hono-static/client.123.js" \
  --file="./dist/static/client.js.gz" \
  --content-encoding="gzip"
```

Or compress in Worker:

```tsx
import { compress } from 'hono/compress';

app.use('*', compress());
```

## Monitoring

### Check Bucket Contents

```bash
# List files in content bucket
wrangler r2 object list hono-content

# List files in static bucket
wrangler r2 object list hono-static
```

### Check File Size

```bash
wrangler r2 object get hono-static/client.123456789.js --file=- | wc -c
```

### View File Content

```bash
wrangler r2 object get hono-content/features/intro.md
```

### Delete Old Files

Clean up old timestamped bundles:

```bash
# List all client.*.js files
wrangler r2 object list hono-static --prefix="client."

# Delete old ones (keep latest)
wrangler r2 object delete hono-static/client.1731369600000.js
```

## Troubleshooting

### File Not Found

**Symptom**: 404 errors when fetching from R2

**Check:**
1. Verify bucket name in `wrangler.toml`
2. Check file exists: `wrangler r2 object list hono-content`
3. Verify binding name matches: `c.env.CONTENT` vs `STATIC`

```tsx
// Debug R2 fetch
const file = await c.env.CONTENT.get('docs/intro.md');

if (!file) {
  // List all files to debug
  const list = await c.env.CONTENT.list();
  console.log('Files in bucket:', list.objects.map(o => o.key));

  return c.text('Not found', 404);
}
```

### Cached Old JavaScript

**Symptom**: Users see old JavaScript after deploy

**Solutions:**
1. Verify timestamp in filename: `client.1731369700000.js`
2. Check HTML references correct filename
3. Clear Cloudflare cache: **Caching → Configuration → Purge Everything**

### Slow R2 Reads

**Symptom**: High latency fetching from R2

**Solutions:**
1. Enable Cloudflare caching: `Cache-Control: public, max-age=3600`
2. Use edge caching for static assets
3. Reduce file sizes (compress markdown, minify JS)

### Upload Failures in CI

**Symptom**: GitHub Actions fails to upload to R2

**Check:**
1. `CLOUDFLARE_API_TOKEN` secret has R2 edit permissions
2. Bucket names match variables: `${{ vars.R2_CONTENT_BUCKET }}`
3. File paths are correct in workflow

```yaml
# Debug upload
- name: Debug R2 upload
  run: |
    echo "Bucket: ${{ vars.R2_CONTENT_BUCKET }}"
    echo "File: content/features/intro.md"
    ls -la content/features/intro.md  # Verify file exists
    wrangler r2 object put "${{ vars.R2_CONTENT_BUCKET }}/features/intro.md" \
      --file="content/features/intro.md"
```

## Best Practices

### 1. Separate Content from Code

Don't bundle markdown into Worker code. Store in R2:

```tsx
// ❌ Bad - Bundled into Worker
import intro from './content/intro.md';

// ✅ Good - Fetched from R2
const intro = await c.env.CONTENT.get('intro.md');
```

### 2. Use Descriptive Paths

Organize R2 files logically:

```
hono-content/
├── getting-started/
│   ├── installation.md
│   └── quickstart.md
├── features/
│   ├── semantic-search.md
│   └── r2-storage.md
└── guides/
    └── deployment.md
```

### 3. Version Static Assets

Always include version/timestamp in filenames:

```
✅ client.1731369600000.js
✅ style.v2.css
❌ client.js  ← No version, cache issues
```

### 4. Minimize R2 Reads

Cache data in Worker memory when possible:

```tsx
// Cache manifest in memory (reused across requests)
let cachedManifest: Manifest | null = null;

export default createRoute(async (c) => {
  if (!cachedManifest) {
    const file = await c.env.STATIC.get('manifest.json');
    cachedManifest = await file?.json();
  }

  return c.json(cachedManifest);
});
```

**Warning**: Worker memory is cleared periodically. Always handle `null` case.

### 5. Set Proper Content-Type

R2 doesn't auto-detect content types:

```tsx
const file = await c.env.STATIC.get('client.123.js');

// Set correct content type
c.header('Content-Type', 'application/javascript; charset=utf-8');
return c.body(await file.arrayBuffer());
```

## Resources

- **R2 Documentation**: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/)
- **Wrangler CLI**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler/)
- **R2 API Reference**: [developers.cloudflare.com/r2/api](https://developers.cloudflare.com/r2/api/)

## Learn More

- [HonoX Framework](./honox-framework.md) - Server-side rendering
- [Semantic Search](./semantic-search.md) - AI Search with R2
- [React Islands](./react-islands.md) - Client-side interactivity
