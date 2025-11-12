# Cloudflare Setup Guide

This guide explains how to configure your Cloudflare account for deploying semantic-docs-hono.

## Prerequisites

- Cloudflare account
- GitHub repository with your content
- Wrangler CLI installed (`npm install -g wrangler`)

## 1. Create R2 Buckets

This project uses **two separate R2 buckets** to keep AI Search focused on markdown content only:

- **`hono-content`**: Stores markdown files (scanned by AI Search)
- **`hono-static`**: Stores static assets like client.js, favicon, manifest.json (NOT scanned by AI Search)

```bash
# Login to Cloudflare
wrangler login

# Create content bucket for markdown files
wrangler r2 bucket create hono-content

# Create static bucket for assets
wrangler r2 bucket create hono-static
```

**Note:** If you want to use different bucket names, update `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "CONTENT"
bucket_name = "your-content-bucket-name"  # Change this

[[r2_buckets]]
binding = "STATIC"
bucket_name = "your-static-bucket-name"  # Change this
```

And update the GitHub variables `R2_CONTENT_BUCKET` and `R2_STATIC_BUCKET` to match.

## 2. Create AI Search Index

Cloudflare AI Search indexes your R2 content for semantic search.

### Via Cloudflare Dashboard:

1. Go to **AI** → **AI Search** in your Cloudflare dashboard
2. Click **Create Index**
3. Configure:
   - **Name**: `semantic-docs` (or your choice - this will be used in `AI_SEARCH_INDEX` env var)
   - **Data Source**: R2 Bucket
   - **Bucket**: Select **`hono-content`** (the content bucket, NOT the static bucket)
   - **File Types**: Enable Markdown (.md)
4. Click **Create Index**

**Important:** Point AI Search to the `hono-content` bucket only. This ensures AI Search doesn't waste resources indexing JavaScript files, manifests, or other static assets.

### Index Configuration:

The AI Search index will automatically:
- Scan your R2 bucket for `.md` files
- Convert markdown to searchable text
- Generate embeddings
- Create vector search index

**Important:** Wait for initial indexing to complete before testing search (check index status in dashboard).

## 3. Configure GitHub Secrets and Variables

Add these to your GitHub repository for the deployment workflow.

### Repository Secrets (Required)

**These are sensitive credentials that must be kept secret.**

Go to **Settings** → **Secrets and variables** → **Actions** → **Secrets** tab → **New repository secret**

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token for Wrangler | [Create token](https://dash.cloudflare.com/profile/api-tokens) with "Edit Cloudflare Workers" permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Found in dashboard URL or Workers overview page |

### Repository Variables (Required)

**These are non-sensitive configuration values.**

Go to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**

| Variable Name | Value | Description |
|------------|-------------|---------|
| `R2_CONTENT_BUCKET` | `hono-content` | R2 bucket for markdown files |
| `R2_STATIC_BUCKET` | `hono-static` | R2 bucket for static assets |

**Note:** If you used different bucket names in step 1, use those names here.

### Cloudflare Worker Variables (Required)

**These are configured in the Cloudflare Dashboard after first deployment.**

After deploying your Worker, you **must** set the AI Search index name:

1. Go to **Workers & Pages** → `semantic-docs-hono` → **Settings** → **Variables and Secrets**
2. Under **Environment Variables**, click **Add variable**:
   - **Variable name**: `AI_SEARCH_INDEX`
   - **Value**: Your AI Search index name (e.g., `semantic-docs`)
   - **Type**: Choose either:
     - **Text** (if you don't consider the name sensitive)
     - **Secret** (if you want to keep it private in a public repo)
3. Click **Deploy** to apply changes

**Important:** The Worker will fail if `AI_SEARCH_INDEX` is not set. Set this immediately after first deployment.

### Creating API Token:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use "Edit Cloudflare Workers" template or create custom token with:
   - **Permissions**:
     - Account - Workers R2 Storage - Edit
     - Account - Workers Scripts - Edit
   - **Account Resources**: Include your account
4. Copy the token and add it as `CLOUDFLARE_API_TOKEN` secret in GitHub

## 4. Update AI Search Index Name (Optional)

If you used a different name for your AI Search index:

1. Edit `app/routes/api/search.ts`:
   ```typescript
   const AI_SEARCH_INDEX = 'your-index-name'; // Change this
   ```

## 5. Deploy

### First Deployment:

Push to the `main` branch to trigger GitHub Actions:

```bash
git add .
git commit -m "Configure Cloudflare deployment"
git push origin main
```

The workflow will:
1. Generate `manifest.json` from `./content`
2. Upload manifest and markdown files to R2
3. Build the Worker
4. Deploy to Cloudflare Workers

### Set Worker Variables (Important!)

**After the first deployment completes**, you must set the required environment variable:

1. Go to **Workers & Pages** → `semantic-docs-hono` → **Settings** → **Variables and Secrets**
2. Add `AI_SEARCH_INDEX` variable (see step 3 above)
3. Click **Deploy** to apply

### Verify Deployment:

1. Check GitHub Actions tab for workflow status
2. Once deployed, visit your Worker URL (shown in Actions logs)
3. Test search API: `POST https://your-worker.workers.dev/api/search` with `{"query": "test"}`
4. If search fails, verify `AI_SEARCH_INDEX` is set in Worker settings

## 6. Configure Rate Limiting (Optional but Recommended)

Protect your search API from abuse using Cloudflare's WAF Rate Limiting Rules:

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Click **Create rule**
3. Configure:
   - **Name**: "Search API Rate Limit"
   - **Expression**: `(http.request.uri.path eq "/api/search" and http.request.method eq "POST")`
   - **Requests**: 20 requests per 60 seconds
   - **Action**: Block
   - **Duration**: 60 seconds
4. Click **Deploy**

See `docs/RATE_LIMITING.md` for detailed instructions.

## 7. Custom Domain (Optional)

Add a custom domain to your Worker:

1. Go to **Workers & Pages** → Your worker → **Settings** → **Domains & Routes**
2. Click **Add Custom Domain**
3. Enter your domain (e.g., `docs.example.com`)
4. Follow DNS setup instructions

## Troubleshooting

### Build Timeout in GitHub Actions

- **Issue**: Build takes >20 minutes
- **Solution**: The new R2-based architecture should complete in <2 minutes. If timeout persists, check GitHub Actions logs for errors.

### AI Search Not Returning Results

- **Check Index Status**: Ensure indexing is complete in Cloudflare dashboard
- **Verify R2 Content**: Confirm markdown files are uploaded to R2
- **Check Index Name**: Verify `AI_SEARCH_INDEX` matches your index name

### R2 Upload Fails

- **Check Permissions**: Ensure API token has R2 edit permissions
- **Verify Bucket Name**: Confirm bucket name matches wrangler.toml and GitHub secret

### Search API Returns 500 Error

- **Check Worker Logs**: View logs in Cloudflare dashboard → Workers → Your worker → Logs
- **Verify AI Binding**: Ensure AI Search index is configured correctly
- **Test Index**: Try searching directly in Cloudflare AI Search dashboard

## Architecture Overview

```
GitHub Push
    ↓
GitHub Actions
    ├── Generate manifest.json (from ./content)
    ├── Upload markdown to hono-content bucket
    ├── Upload manifest + static assets to hono-static bucket
    └── Deploy Worker
        ↓
Cloudflare Workers
    ├── Fetch markdown from CONTENT bucket (hono-content)
    ├── Fetch manifest/assets from STATIC bucket (hono-static)
    ├── Render pages with Hono/React
    └── Search via AI Search API
        ↓
AI Search (automatic)
    ├── Indexes ONLY hono-content bucket (markdown files)
    ├── Generates embeddings
    └── Returns semantic search results
```

## Next Steps

- Add more content to `./content` directory
- Customize themes in `src/config/themes.ts`
- Configure rate limiting
- Add custom domain
- Monitor usage in Cloudflare dashboard

## Support

For issues:
- Check Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Check AI Search docs: https://developers.cloudflare.com/ai-search/
- Open an issue: https://github.com/llbbl/semantic-docs-hono/issues
