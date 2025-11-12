---
title: React Islands Architecture
tags: [react, islands, hydration, interactivity, jsx]
---

# React Islands Architecture

This site uses **React Islands** for client-side interactivity while keeping the server-side rendering fast and minimal with Hono JSX.

## What Are Islands?

Islands architecture separates static content from interactive components:

- **Sea (Server-rendered)**: Static HTML generated with Hono JSX
- **Islands (Client-rendered)**: Interactive React components hydrated in browser

```
┌─────────────────────────────────────────────────────┐
│                  HTML Page (SSR)                     │
│                                                      │
│  ┌──────────────┐    Static content (Hono JSX)      │
│  │   Header     │    • Navigation                   │
│  │   (static)   │    • Layout                       │
│  └──────────────┘    • Typography                   │
│                                                      │
│  ┌──────────────┐    Island 1: React Component      │
│  │    Search    │    • State: query, results        │
│  │   (island)   │◄─  • Effects: debounce, fetch     │
│  └──────────────┘    • Events: keyboard shortcuts   │
│                                                      │
│  Static paragraph text goes here...                 │
│                                                      │
│  ┌──────────────┐    Island 2: React Component      │
│  │Theme Switcher│    • State: theme (dark/light)    │
│  │   (island)   │◄─  • Effects: localStorage sync   │
│  └──────────────┘    • Events: button clicks        │
│                                                      │
│  ┌──────────────┐                                   │
│  │    Footer    │    Static content (Hono JSX)      │
│  │   (static)   │                                   │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- **Performance** - Only interactive parts ship JavaScript
- **SEO** - Content is static HTML (indexed by search engines)
- **Progressive enhancement** - Works without JavaScript

## Server vs Client Components

### Server Components (Hono JSX)

**Where**: `app/components/`, `app/routes/`
**Rendered**: On server (every request)
**JSX Import Source**: `hono/jsx`
**Capabilities**: Presentation only (no state, no hooks)

```tsx
// app/components/DocsHeader.tsx
import type { FC } from 'hono/jsx';

export const DocsHeader: FC = () => {
  return (
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/docs">Docs</a>
      </nav>
    </header>
  );
};
```

**Characteristics:**
- ✅ Fast rendering (HTML strings)
- ✅ No JavaScript sent to browser
- ✅ Access to Cloudflare bindings (R2, AI)
- ❌ No `useState`, `useEffect`, hooks
- ❌ No event handlers (onClick, onChange)
- ❌ No browser APIs (localStorage, fetch)

### Client Components (React Islands)

**Where**: `app/islands/`
**Rendered**: In browser (client-side only)
**JSX Import Source**: `react`
**Capabilities**: Full React with hooks, state, effects

```tsx
// app/islands/ThemeSwitcher.tsx
import { useState, useEffect } from 'react';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

**Characteristics:**
- ✅ Full React hooks (useState, useEffect, etc.)
- ✅ Event handlers
- ✅ Browser APIs
- ✅ State management
- ❌ No access to Cloudflare bindings
- ❌ Larger bundle size (ships to browser)

## JSX Import Sources

This project uses **two different JSX import sources**:

### Default: Hono JSX (Server)

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "jsxImportSource": "hono/jsx"  // ← Default for all .tsx files
  }
}
```

All files use Hono JSX by default.

### Override: React JSX (Islands)

Islands override with a pragma comment:

```tsx
// app/islands/Search.tsx
/** @jsxImportSource react */
import { useState } from 'react';

export default function Search() {
  const [query, setQuery] = useState('');
  // ...
}
```

**Without pragma comment**, islands would try to use Hono JSX and fail.

## Existing Islands

### 1. Search (`app/islands/Search.tsx`)

**Purpose**: Semantic search dialog with ⌘K shortcut

**Features:**
- Keyboard shortcut: `Cmd+K` / `Ctrl+K`
- Debounced API calls
- Search result rendering
- Click-outside to close

**State:**
```tsx
const [open, setOpen] = useState(false);
const [query, setQuery] = useState('');
const [results, setResults] = useState([]);
const [loading, setLoading] = useState(false);
```

**Key logic:**
```tsx
// Keyboard shortcut
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((open) => !open);
    }
  };

  document.addEventListener('keydown', down);
  return () => document.removeEventListener('keydown', down);
}, []);

// Debounced search
useEffect(() => {
  if (!query.trim()) {
    setResults([]);
    return;
  }

  const timer = setTimeout(async () => {
    setLoading(true);
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 10 }),
    });
    const data = await response.json();
    setResults(data.results || []);
    setLoading(false);
  }, 300);

  return () => clearTimeout(timer);
}, [query]);
```

### 2. ThemeSwitcher (`app/islands/ThemeSwitcher.tsx`)

**Purpose**: Toggle between light/dark themes

**Features:**
- Reads from localStorage on mount
- Updates DOM class on change
- Persists preference

**State:**
```tsx
const [theme, setTheme] = useState<'light' | 'dark'>('dark');
```

**Key logic:**
```tsx
// Load saved theme
useEffect(() => {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (saved) setTheme(saved);
}, []);

// Apply theme
useEffect(() => {
  document.documentElement.className = theme;
  localStorage.setItem('theme', theme);
}, [theme]);
```

### 3. DocsToc (`app/islands/DocsToc.tsx`)

**Purpose**: Table of contents with active section highlighting

**Features:**
- Extracts headings from page
- Highlights current section
- Smooth scroll to sections

**State:**
```tsx
const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
const [activeId, setActiveId] = useState<string>('');
```

**Key logic:**
```tsx
// Extract headings from page
useEffect(() => {
  const elements = document.querySelectorAll('h2, h3');
  const extracted = Array.from(elements).map((el) => ({
    id: el.id,
    text: el.textContent || '',
    level: Number(el.tagName[1]),
  }));
  setHeadings(extracted);
}, []);

// Intersection Observer for active section
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      }
    },
    { rootMargin: '-80px 0px -80% 0px' }
  );

  headings.forEach(({ id }) => {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  });

  return () => observer.disconnect();
}, [headings]);
```

## Hydration Process

Islands are mounted client-side using `createRoot` (not `hydrateRoot`):

### 1. Server Renders Placeholder

```tsx
// app/routes/index.tsx (server)
export default createRoute(async (c) => {
  return c.html(
    <html>
      <body>
        {/* Placeholder for Search island */}
        <div
          id="search-island"
          data-hydrate="true"
          data-component="Search"
          data-props="{}"
        />

        {/* Load client bundle */}
        <script type="module" src="/client.123456789.js" />
      </body>
    </html>
  );
});
```

### 2. Client Mounts Islands

```tsx
// app/client.tsx
import { createRoot } from 'react-dom/client';
import Search from './islands/Search';
import ThemeSwitcher from './islands/ThemeSwitcher';
import DocsToc from './islands/DocsToc';

const islands = {
  Search,
  ThemeSwitcher,
  DocsToc,
};

document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('[data-hydrate="true"]');

  for (const element of elements) {
    const componentName = element.getAttribute('data-component');
    const propsStr = element.getAttribute('data-props');

    if (!componentName || !(componentName in islands)) continue;

    const Component = islands[componentName as keyof typeof islands];
    const props = propsStr ? JSON.parse(propsStr) : {};

    // Mount island
    const root = createRoot(element);
    root.render(<Component {...props} />);
  }
});
```

**Why `createRoot` not `hydrateRoot`?**
- Islands aren't pre-rendered on server
- Server only renders empty `<div>` placeholders
- Client mounts React from scratch

## Creating a New Island

### Step 1: Create Island Component

```tsx
// app/islands/Counter.tsx
/** @jsxImportSource react */
import { useState } from 'react';

interface CounterProps {
  initialValue?: number;
}

export default function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setCount(count - 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        -
      </button>
      <span className="text-2xl font-bold">{count}</span>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        +
      </button>
    </div>
  );
}
```

**Important:**
- ✅ Default export (required for dynamic import)
- ✅ `/** @jsxImportSource react */` pragma
- ✅ Props interface for type safety
- ✅ Use React hooks freely

### Step 2: Register in client.tsx

```tsx
// app/client.tsx
import Counter from './islands/Counter';  // ← Add import

const islands = {
  Search,
  ThemeSwitcher,
  DocsToc,
  Counter,  // ← Add to registry
};
```

### Step 3: Use in Route

```tsx
// app/routes/index.tsx (server)
export default createRoute(async (c) => {
  return c.html(
    <html>
      <body>
        <h1>Counter Demo</h1>

        {/* Render island placeholder */}
        <div
          id="counter-island"
          data-hydrate="true"
          data-component="Counter"
          data-props='{"initialValue": 10}'
        />

        <script type="module" src="/client.123456789.js" />
      </body>
    </html>
  );
});
```

**Props serialization:**
- Must be JSON-serializable
- Use `JSON.stringify()` for objects
- Simple values work: `'{"count": 5}'`
- Complex values need serialization

### Step 4: Test

1. Build: `pnpm build`
2. Deploy: `pnpm dev:remote`
3. Check browser DevTools console for errors
4. Verify island mounts and is interactive

## Advanced Patterns

### Passing Complex Props

For non-serializable data, fetch in island:

```tsx
// ❌ Bad - Can't serialize functions/Dates
<div
  data-props='{"onClick": () => {}, "date": new Date()}'
/>

// ✅ Good - Pass IDs, fetch in island
<div
  data-props='{"articleId": "intro"}'
/>

// app/islands/ArticlePreview.tsx
export default function ArticlePreview({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then(r => r.json())
      .then(setArticle);
  }, [articleId]);

  return <div>{article?.title}</div>;
}
```

### Communicating Between Islands

Use browser events for cross-island communication:

```tsx
// Island 1: Dispatch event
function ThemeSelector() {
  const setTheme = (theme: string) => {
    document.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
  };

  return <button onClick={() => setTheme('dark')}>Dark</button>;
}

// Island 2: Listen to event
function ThemeDisplay() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const handler = (e: CustomEvent) => setTheme(e.detail.theme);
    document.addEventListener('theme-change', handler);
    return () => document.removeEventListener('theme-change', handler);
  }, []);

  return <div>Current theme: {theme}</div>;
}
```

### Lazy Loading Islands

For heavy islands, lazy load only when needed:

```tsx
// app/islands/HeavyChart.tsx
/** @jsxImportSource react */
import { lazy, Suspense } from 'react';

const Chart = lazy(() => import('./Chart'));

export default function HeavyChart() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <Chart />
    </Suspense>
  );
}
```

### Portal Islands

Render islands in different parts of the DOM:

```tsx
import { createPortal } from 'react-dom';

export default function Modal({ children }) {
  const [container] = useState(() => document.getElementById('modal-root'));

  if (!container) return null;

  return createPortal(
    <div className="modal">{children}</div>,
    container
  );
}
```

## UI Component Library

This project uses **shadcn/ui** components adapted for React islands.

### Example: Command Dialog

```tsx
// app/islands/ui/dialog.tsx
/** @jsxImportSource react */
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogContent = ({ className, children, ...props }) => (
  <DialogPortal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
);

export { Dialog, DialogTrigger, DialogContent };
```

**Import in islands:**
```tsx
// app/islands/Search.tsx
import { Dialog, DialogContent } from './ui/dialog';
import { Command, CommandInput, CommandList } from './ui/command';

export default function Search() {
  return (
    <Dialog>
      <DialogContent>
        <Command>
          <CommandInput placeholder="Search docs..." />
          <CommandList>{/* Results */}</CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

## Performance Optimization

### Bundle Size

Keep island bundles small:

```bash
# Check client bundle size
ls -lh dist/static/client.*.js

# Typical sizes:
# • Good: 50-150 KB (gzipped)
# • Acceptable: 150-300 KB
# • Too large: > 300 KB
```

**Reduce bundle size:**
1. Avoid large dependencies in islands
2. Use lazy loading for heavy components
3. Code split with dynamic imports
4. Tree shake unused code

### Minimize Islands

Only use islands when necessary:

```tsx
// ❌ Unnecessary island - could be server component
export default function StaticButton() {
  return <button>Click me</button>;
}

// ✅ Good use of island - needs state
export default function ToggleButton() {
  const [active, setActive] = useState(false);
  return <button onClick={() => setActive(!active)}>{active ? 'On' : 'Off'}</button>;
}
```

**Guidelines:**
- Static content → Server component (Hono JSX)
- Interactive element → Island (React)
- Forms with validation → Island
- Simple links/buttons → Server component

### Debounce Effects

Debounce expensive operations:

```tsx
import { useState, useEffect } from 'react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Debounce API calls
    const timer = setTimeout(async () => {
      if (!query) return;

      const response = await fetch('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setResults(data.results);
    }, 300);  // ← Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

## Troubleshooting

### Island Not Mounting

**Symptoms:**
- Island doesn't appear
- No errors in console

**Check:**
1. **data-hydrate attribute**: `<div data-hydrate="true" ...>`
2. **data-component matches**: Component name in `islands` registry
3. **Client bundle loading**: Check Network tab for `client.*.js`
4. **Console errors**: Any JavaScript errors?

```tsx
// Debug: Add logging to client.tsx
console.log('Hydrating islands...');
console.log('Found elements:', elements.length);
console.log('Component name:', componentName);
console.log('Component exists:', componentName in islands);
```

### JSX Import Source Errors

**Symptom:**
```
Property 'useState' does not exist on type 'typeof import("hono/jsx")'
```

**Fix:** Add pragma comment to island:
```tsx
/** @jsxImportSource react */
import { useState } from 'react';
```

### Props Not Passing

**Symptom:** Island receives empty props

**Check:**
1. **JSON valid**: Use `JSON.stringify()` for objects
2. **Quotes escaped**: `data-props='{"key":"value"}'` (single quotes outside, double inside)
3. **Props parsed**: Add logging in island:

```tsx
export default function MyIsland(props: any) {
  console.log('Received props:', props);  // ← Debug
  return <div>{JSON.stringify(props)}</div>;
}
```

### Hydration Mismatch

**Symptom:**
```
Warning: Text content did not match. Server: "..." Client: "..."
```

**Cause:** Using `hydrateRoot` instead of `createRoot`

**Fix:** Use `createRoot` in `app/client.tsx`:
```tsx
import { createRoot } from 'react-dom/client';  // ← Not hydrateRoot

const root = createRoot(element);
root.render(<Component {...props} />);
```

### Event Handlers Not Working

**Symptom:** onClick, onChange don't fire

**Check:**
1. **Island mounted**: Use React DevTools to verify
2. **Event handler syntax**: `onClick={() => ...}` (camelCase)
3. **Component is island**: Not server component

## Best Practices

### 1. Default Export for Islands

Always use default export:

```tsx
// ✅ Good
export default function MyIsland() {
  return <div>Island</div>;
}

// ❌ Bad - won't work with dynamic import
export function MyIsland() {
  return <div>Island</div>;
}
```

### 2. Type Props

Define interfaces for all props:

```tsx
interface SearchProps {
  placeholder?: string;
  maxResults?: number;
}

export default function Search({ placeholder = 'Search...', maxResults = 10 }: SearchProps) {
  // ...
}
```

### 3. Clean Up Effects

Always return cleanup function:

```tsx
useEffect(() => {
  const handler = () => console.log('resize');
  window.addEventListener('resize', handler);

  // ← Cleanup required!
  return () => window.removeEventListener('resize', handler);
}, []);
```

### 4. Use Semantic HTML

Islands should be accessible:

```tsx
// ✅ Good - semantic, accessible
export default function Dialog() {
  return (
    <dialog role="dialog" aria-labelledby="title">
      <h2 id="title">Title</h2>
    </dialog>
  );
}

// ❌ Bad - div soup
export default function Dialog() {
  return (
    <div>
      <div>Title</div>
    </div>
  );
}
```

### 5. Minimize Re-renders

Use `useMemo` and `useCallback` for expensive operations:

```tsx
import { useMemo, useCallback } from 'react';

export default function ExpensiveList({ items }) {
  // Memoize filtered list
  const filtered = useMemo(
    () => items.filter(item => item.active),
    [items]
  );

  // Memoize callback
  const handleClick = useCallback(
    (id: string) => console.log(id),
    []
  );

  return <ul>{filtered.map(item => <li onClick={() => handleClick(item.id)}>{item.name}</li>)}</ul>;
}
```

## Resources

- **React Docs**: [react.dev](https://react.dev)
- **Islands Architecture**: [jasonformat.com/islands-architecture](https://jasonformat.com/islands-architecture/)
- **Radix UI**: [radix-ui.com](https://radix-ui.com)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)

## Learn More

- [HonoX Framework](./honox-framework.md) - Server-side rendering
- [R2 Storage](./r2-storage.md) - Edge storage and caching
- [Semantic Search](./semantic-search.md) - AI-powered search island
