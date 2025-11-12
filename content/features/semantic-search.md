---
title: Semantic Search with Cloudflare AI Search
tags: [search, ai, cloudflare, vectors]
---

# Semantic Search with Cloudflare AI Search

This documentation site uses **Cloudflare AI Search** to enable semantic search - understanding the *meaning* of your queries, not just matching keywords.

## How It Works

### Traditional Search vs Semantic Search

**Traditional keyword search:**
```
Query: "deploy app"
Finds: Documents containing "deploy" AND "app"
Misses: "push to production", "publish application"
```

**Semantic search:**
```
Query: "deploy app"
Understands: User wants to publish/release software
Finds: "deploy", "push to production", "publish", "release"
```

### Behind the Scenes

1. **Manual Sync Trigger**: You click "Sync" in the AI Search dashboard after deploying content
2. **Bucket Scanning**: AI Search scans your R2 bucket for markdown files
3. **Embedding Generation**: Converts markdown content into vector embeddings
4. **Vector Search**: Finds documents similar in meaning to your query
5. **Reranking**: Orders results by relevance

After the initial setup, you only need to click "Sync" when you add or update content.

## Architecture

```
┌─────────────────┐
│  User searches  │
│   "deploy app"  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Cloudflare AI Search   │
│  • Converts to vector   │
│  • Searches index       │
│  • Reranks results      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   R2 Bucket (Content)   │
│  • Markdown files only  │
│  • Auto-indexed by AI   │
└─────────────────────────┘
```

## Implementation

### 1. Storage Setup (Two Buckets)

We use two separate R2 buckets to keep AI Search focused:

```toml
# wrangler.toml
[[r2_buckets]]
binding = "CONTENT"
bucket_name = "hono-content"  # ← AI Search scans this

[[r2_buckets]]
binding = "STATIC"
bucket_name = "hono-static"   # ← Not scanned
```

**Why two buckets?**
- `hono-content`: Only markdown files (indexed by AI Search)
- `hono-static`: JavaScript, CSS, manifest (not indexed)

This prevents AI Search from wasting resources indexing non-content files.

### 2. AI Search Configuration

In Cloudflare Dashboard:

1. **AI** → **AI Search** → **Create Index**
2. Point to `hono-content` bucket
3. Enable Markdown file type
4. Click **Sync** to start initial indexing
5. Wait for indexing to complete (check **Jobs** tab)

After the initial setup, click **Sync** whenever you:
- Add new markdown files to R2
- Update existing files
- Delete files from R2

### 3. Search API

```typescript
// app/routes/api/search.ts
import { Hono } from 'hono';

app.post('/', async (c) => {
  const { query, limit = 10 } = await c.req.json();

  // Get AI Search index name from environment
  const indexName = c.env.AI_SEARCH_INDEX;

  // Perform semantic search
  const response = await c.env.AI.autorag(indexName).search({
    query,
    max_num_results: limit,
    rerank: true, // Improve relevance
  });

  // Return results
  return c.json({
    results: response.data.map(item => ({
      title: item.filename,
      content: item.content[0].text,
      score: item.score,
    }))
  });
});
```

### 4. Client-Side Search (React Island)

```tsx
// app/islands/Search.tsx
export default function Search() {
  const [results, setResults] = useState([]);

  const handleSearch = async (query: string) => {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 10 }),
    });

    const data = await response.json();
    setResults(data.results);
  };

  return (
    <CommandDialog>
      <CommandInput onValueChange={handleSearch} />
      <CommandList>
        {results.map(result => (
          <CommandItem key={result.slug}>
            {result.title}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

## Features

### ✅ Simple Indexing

Deploy markdown files to R2 and trigger a sync:

```bash
# GitHub Actions does this automatically
wrangler r2 object put "hono-content/features/new-feature.md" \
  --file="./content/features/new-feature.md"
```

Then manually sync in the dashboard:
1. Go to **AI** → **AI Search** → Your index
2. Click **Sync**
3. Wait for job to complete

### ✅ Understanding Synonyms

```
Query: "getting started"
Finds:
  - "getting started" (exact match)
  - "introduction" (synonym)
  - "quickstart" (related concept)
  - "setup guide" (similar meaning)
```

### ✅ Natural Language

```
Query: "how do I make my site faster?"
Understands: User wants performance optimization
Finds:
  - "Performance optimization"
  - "Speed improvements"
  - "Caching strategies"
```

### ✅ Typo Tolerance

```
Query: "javascrpt async" (typo)
Still finds: JavaScript async content
```

### ✅ Conceptual Search

```
Query: "authentication"
Finds:
  - "login system"
  - "user auth"
  - "security credentials"
  - "access control"
```

## Search Quality

AI Search uses reranking to improve results:

```typescript
// Enable reranking for better relevance
const response = await c.env.AI.autorag(indexName).search({
  query,
  rerank: true, // ← Reorders results by relevance
});
```

**Without reranking:**
1. "javascript programming" (0.89 score)
2. "java programming" (0.87 score)
3. "async javascript" (0.85 score)

**With reranking:**
1. "async javascript" (0.95 score - more relevant!)
2. "javascript programming" (0.89 score)
3. "java programming" (0.72 score - demoted)

## Performance

### Search Speed

- **Cold start**: ~1-2 seconds (first search)
- **Warm**: ~200-500ms (subsequent searches)

Cached at the edge via Cloudflare Workers.

### Indexing Speed

After uploading new content and clicking **Sync**:

- **Scanning**: ~1-2 minutes
- **Indexing**: ~5-15 minutes (depending on content size)
- **Job Status**: Check **AI** → **AI Search** → Your index → **Jobs**

**Note**: Indexing is triggered manually by clicking **Sync** in the dashboard, not automatically.

## Environment Variables

Set in Cloudflare Dashboard:

```bash
# Workers & Pages → hono → Settings → Variables
AI_SEARCH_INDEX=semantic-docs  # Your index name
```

GitHub Actions needs these variables:

```bash
# Settings → Secrets and variables → Actions → Variables
R2_CONTENT_BUCKET=hono-content  # Content bucket
R2_STATIC_BUCKET=hono-static    # Static assets
```

## Troubleshooting

### No Search Results

**Check indexing status:**
1. Go to **AI** → **AI Search** → Your index
2. View **Jobs** tab
3. Check "Total index results" count

**Common issues:**
- Forgot to click "Sync" after deploying content
- Index job still running (check **Jobs** tab)
- Wrong bucket configured
- No markdown files in `hono-content` bucket

### 500 Error

Check Worker logs:

```bash
wrangler tail
```

Common causes:
- `AI_SEARCH_INDEX` env var not set
- Index name mismatch
- No results in index

### Search Returns Wrong Results

AI Search learns from usage. Give it time to improve, or:

1. Improve markdown frontmatter:
```markdown
---
title: Clear, descriptive title
tags: [relevant, keywords, here]
---
```

2. Use descriptive headings:
```markdown
# Main Topic

## Subtopic with Clear Description
```

3. Write naturally - AI Search understands context

## Best Practices

### 1. Organize Content by Folder

```
content/
├── getting-started/     # Beginner guides
├── features/            # Feature docs
├── guides/              # How-to guides
└── reference/           # API reference
```

AI Search uses folder structure for relevance scoring.

### 2. Use Descriptive Filenames

```
✅ getting-started/installation-guide.md
❌ getting-started/page1.md
```

### 3. Add Meaningful Frontmatter

```markdown
---
title: Authentication with OAuth
tags: [auth, security, oauth, login]
---
```

Tags help AI Search understand document topics.

### 4. Write Clear Headings

```markdown
# Authentication Guide

## Setting Up OAuth Providers
## Implementing Login Flow
## Securing API Endpoints
```

Headings are weighted heavily in search ranking.

## Resources

- **Cloudflare AI Search Docs**: [developers.cloudflare.com/ai-search](https://developers.cloudflare.com/ai-search/)
- **R2 Documentation**: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/)
- **Workers AI**: [developers.cloudflare.com/workers-ai](https://developers.cloudflare.com/workers-ai/)

## Learn More

- [HonoX Framework](./honox-framework.md) - Server-side rendering with Hono
- [R2 Storage](./r2-storage.md) - Edge storage for content
- [React Islands](./react-islands.md) - Client-side interactivity
