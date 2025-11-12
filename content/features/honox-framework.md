---
title: HonoX Framework
tags: [honox, hono, ssr, routing, cloudflare]
---

# HonoX Framework

This site is built with **HonoX**, a meta-framework for [Hono](https://hono.dev) that adds file-based routing and server-side rendering to Cloudflare Workers.

## What is HonoX?

HonoX is a minimal meta-framework built on top of Hono that provides:

- **File-based routing** - Routes defined by file structure in `app/routes/`
- **Server-side rendering** - SSR with Hono JSX (not React)
- **Zero runtime overhead** - Compiles to vanilla Hono apps
- **Cloudflare Workers optimized** - Designed for edge deployment

Unlike full-stack frameworks like Next.js or Remix, HonoX is intentionally minimal - it's just routing + SSR on top of Hono.

## File-Based Routing

Routes are created by adding files to `app/routes/`:

```
app/routes/
├── index.tsx           → /
├── about.tsx           → /about
└── content/
    └── [...slug].tsx   → /content/* (catch-all)
```

Each route exports a default function created with `createRoute()`:

```tsx
// app/routes/index.tsx
import { createRoute } from 'honox/factory';

export default createRoute(async (c) => {
  return c.html(
    <html lang="en">
      <head>
        <title>Home</title>
      </head>
      <body>
        <h1>Welcome</h1>
      </body>
    </html>
  );
});
```

### Catch-All Routes

Dynamic routes use bracket syntax:

```tsx
// app/routes/content/[...slug].tsx
export default createRoute(async (c) => {
  const slug = c.req.path.replace('/content/', '');

  // Fetch content from R2
  const content = await getContent(slug);

  return c.html(
    <html lang="en">
      <head>
        <title>{content.title}</title>
      </head>
      <body>
        <article>{content.html}</article>
      </body>
    </html>
  );
});
```

## Server-Side Rendering with Hono JSX

HonoX uses **Hono JSX** for SSR, not React. This is critical to understand.

### Hono JSX vs React JSX

**Hono JSX** (server-side):
- Lightweight JSX implementation
- Synchronous rendering only
- No hooks, no state, no effects
- Returns HTML strings
- Import source: `hono/jsx`

**React JSX** (client-side):
- Full React with hooks, state, effects
- Used for interactive islands only
- Import source: `react`

### Using Hono JSX in Routes

All route files use Hono JSX:

```tsx
// tsconfig.json
{
  "compilerOptions": {
    "jsxImportSource": "hono/jsx"  // ← Global default
  }
}
```

This means all `.tsx` files in `app/routes/` and `app/components/` use Hono JSX automatically.

### Type Annotations

Use `FC` from `hono/jsx` for component typing:

```tsx
import type { FC } from 'hono/jsx';

interface Props {
  title: string;
  children?: any;
}

export const Layout: FC<Props> = ({ title, children }) => {
  return (
    <html lang="en">
      <head>
        <title>{title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
};
```

## The Hono Context Object

Every route receives a Hono context object (`c`):

```tsx
export default createRoute(async (c) => {
  // Access request
  const url = c.req.url;
  const path = c.req.path;
  const query = c.req.query('q');

  // Access environment (Cloudflare bindings)
  const content = await c.env.CONTENT.get('file.md');
  const searchIndex = c.env.AI_SEARCH_INDEX;

  // Set headers
  c.header('Content-Type', 'text/html; charset=UTF-8');

  // Return responses
  return c.html(<html>...</html>);
  return c.json({ data: 'value' });
  return c.text('Plain text');
  return c.redirect('/other-page');
});
```

### Environment Bindings

Cloudflare bindings are available via `c.env`:

```tsx
import type { Env } from '@/types';

const app = new Hono<{ Bindings: Env }>();

export default createRoute(async (c) => {
  // R2 buckets
  const mdFile = await c.env.CONTENT.get('docs/intro.md');
  const cssFile = await c.env.STATIC.get('style.css');

  // AI Search
  const results = await c.env.AI.autorag(c.env.AI_SEARCH_INDEX).search({
    query: 'test',
  });

  return c.json({ results });
});
```

## Returning HTML

### Method 1: c.html() (Recommended for Components)

Use `c.html()` when returning JSX directly:

```tsx
export default createRoute(async (c) => {
  return c.html(
    <html lang="en">
      <head>
        <title>Page Title</title>
      </head>
      <body>
        <h1>Hello World</h1>
      </body>
    </html>
  );
});
```

### Method 2: c.body() (Required for DOCTYPE)

Use `c.body()` when you need to prepend raw strings like `<!DOCTYPE html>`:

```tsx
export default createRoute(async (c) => {
  const html = (
    <html lang="en">
      <head>
        <title>Page Title</title>
      </head>
      <body>
        <h1>Hello World</h1>
      </body>
    </html>
  );

  c.header('Content-Type', 'text/html; charset=UTF-8');
  return c.body(`<!DOCTYPE html>${html}`);
});
```

**Why?** Putting `<!DOCTYPE html>` inside JSX gets HTML-escaped. Using `c.body()` with string concatenation keeps it as-is.

## Components

Create reusable server components in `app/components/`:

```tsx
// app/components/DocsHeader.tsx
import type { FC } from 'hono/jsx';

interface Props {
  title: string;
}

export const DocsHeader: FC<Props> = ({ title }) => {
  return (
    <header>
      <h1>{title}</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/docs">Docs</a>
      </nav>
    </header>
  );
};
```

Import and use in routes:

```tsx
// app/routes/index.tsx
import { DocsHeader } from '@/components/DocsHeader';

export default createRoute(async (c) => {
  return c.html(
    <html>
      <body>
        <DocsHeader title="Documentation" />
      </body>
    </html>
  );
});
```

## API Routes

Create JSON APIs by returning `c.json()`:

```tsx
// app/routes/api/search.ts
import { Hono } from 'hono';
import type { Env } from '@/types';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const { query } = await c.req.json();

  const results = await c.env.AI.autorag(c.env.AI_SEARCH_INDEX).search({
    query,
    max_num_results: 10,
    rerank: true,
  });

  return c.json({
    results: results.data,
    count: results.data.length,
  });
});

export default app;
```

**Note**: API routes export a `Hono` app instance, not `createRoute()`.

## Build Process

HonoX compiles to a standard Hono app during build:

```bash
pnpm build
# → Outputs to dist/index.js (Cloudflare Worker)
```

The build process:

1. **Vite**: Bundles server code
2. **HonoX plugin**: Generates route manifest
3. **Output**: Single Worker script with all routes

### Development

```bash
# Remote development (recommended)
pnpm dev:remote

# Uses wrangler dev --remote to run against Cloudflare
```

**Why remote?** This project requires Cloudflare-specific bindings (R2, AI Search) that aren't available locally.

## Server vs Client Rendering

**Server-side (Hono JSX)**:
- Renders on every request
- No JavaScript sent to client
- Fast, SEO-friendly
- Use for static content, layouts, navigation

**Client-side (React Islands)**:
- Renders in browser
- JavaScript bundle required
- Interactive, stateful
- Use for search dialogs, theme switchers, dynamic forms

See [React Islands](./react-islands.md) for client-side interactivity.

## Middleware

Add middleware with `app.use()`:

```tsx
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('/api/*', cors());

// Route-specific middleware
app.use('/admin/*', async (c, next) => {
  // Check auth
  const token = c.req.header('Authorization');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  await next();
});
```

## Performance

HonoX is extremely fast because:

- **No virtual DOM** - Direct HTML string generation
- **No hydration overhead** - Server components don't ship JS
- **Edge deployment** - Runs on Cloudflare Workers globally
- **Minimal bundle size** - Only client islands ship JavaScript

Typical response times:
- **HTML pages**: 50-150ms (including R2 fetch)
- **API routes**: 100-300ms (AI Search query)
- **Static assets**: 10-50ms (cached at edge)

## Limitations

Because HonoX uses Hono JSX (not React):

- ❌ No `useState`, `useEffect`, or React hooks in server components
- ❌ No async components (workaround: fetch before rendering)
- ❌ No component lifecycle methods
- ✅ Use React islands for interactivity
- ✅ Use middleware for request-level logic

## Folder Structure

```
app/
├── routes/              # File-based routes (Hono JSX)
│   ├── index.tsx       # Homepage
│   ├── api/            # API routes
│   └── content/        # Dynamic content routes
├── components/          # Reusable server components (Hono JSX)
│   ├── DocsHeader.tsx
│   └── DocsSidebar.tsx
├── islands/            # Client-side React components
│   ├── Search.tsx
│   └── ThemeSwitcher.tsx
└── client.tsx          # Client-side hydration entry
```

## Best Practices

### 1. Keep Server Components Simple

Server components should be presentation-only:

```tsx
// ✅ Good - Simple, presentational
export const ArticleCard: FC<{ title: string; url: string }> = ({ title, url }) => {
  return (
    <article>
      <h2>{title}</h2>
      <a href={url}>Read more</a>
    </article>
  );
};

// ❌ Bad - Complex logic, side effects
export const ArticleCard: FC<{ slug: string }> = async ({ slug }) => {
  // This won't work - async components not supported
  const data = await fetch(`/api/article/${slug}`);
  return <article>{data.title}</article>;
};
```

Instead, fetch data in the route:

```tsx
export default createRoute(async (c) => {
  const slug = c.req.param('slug');
  const article = await getArticle(slug);

  return c.html(
    <ArticleCard title={article.title} url={article.url} />
  );
});
```

### 2. Use TypeScript Strictly

Define proper types for all props and context:

```tsx
import type { FC } from 'hono/jsx';
import type { Context } from 'hono';
import type { Env } from '@/types';

interface Props {
  title: string;
  items: Array<{ id: string; name: string }>;
}

export const List: FC<Props> = ({ title, items }) => {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

### 3. Organize Routes Logically

```
app/routes/
├── index.tsx              # Homepage
├── about.tsx              # Static pages
├── content/
│   └── [...slug].tsx      # Dynamic content
└── api/
    ├── search.ts          # Search API
    └── manifest.ts        # Manifest API
```

### 4. Extract Reusable Logic

Create utility functions for common operations:

```tsx
// app/lib/content.ts
export async function getMarkdownFile(
  bucket: R2Bucket,
  path: string
): Promise<string | null> {
  const file = await bucket.get(path);
  if (!file) return null;
  return await file.text();
}

// Use in routes
export default createRoute(async (c) => {
  const content = await getMarkdownFile(c.env.CONTENT, 'docs/intro.md');
  return c.html(<article>{content}</article>);
});
```

## Resources

- **Hono Docs**: [hono.dev](https://hono.dev)
- **HonoX Repo**: [github.com/honojs/honox](https://github.com/honojs/honox)
- **Cloudflare Workers**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)

## Learn More

- [R2 Storage](./r2-storage.md) - Content storage and cache busting
- [React Islands](./react-islands.md) - Client-side interactivity
- [Semantic Search](./semantic-search.md) - AI-powered search
