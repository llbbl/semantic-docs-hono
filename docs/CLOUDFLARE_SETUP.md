# Cloudflare Setup Guide

This guide explains how to configure your Cloudflare account for deploying semantic-docs-hono.

## Prerequisites

- Cloudflare account
- GitHub repository with your content
- Wrangler CLI installed (`npm install -g wrangler`)

## 1. Create R2 Bucket

The R2 bucket stores your markdown content and manifest.

```bash
# Login to Cloudflare
wrangler login

# Create R2 bucket (use the same name as in wrangler.toml)
wrangler r2 bucket create hono
```

**Note:** If you want to use a different bucket name, update `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "CONTENT"
bucket_name = "your-bucket-name"  # Change this
```

And update the GitHub secret `R2_BUCKET_NAME` to match.

## 2. Create AI Search Index

Cloudflare AI Search indexes your R2 content for semantic search.

### Via Cloudflare Dashboard:

1. Go to **AI** → **AI Search** in your Cloudflare dashboard
2. Click **Create Index**
3. Configure:
   - **Name**: `semantic-docs` (must match `AI_SEARCH_INDEX` in `app/routes/api/search.ts`)
   - **Data Source**: R2 Bucket
   - **Bucket**: Select your R2 bucket (`hono`)
   - **File Types**: Enable Markdown (.md)
4. Click **Create Index**

### Index Configuration:

The AI Search index will automatically:
- Scan your R2 bucket for `.md` files
- Convert markdown to searchable text
- Generate embeddings
- Create vector search index

**Important:** Wait for initial indexing to complete before testing search (check index status in dashboard).

## 3. Configure GitHub Secrets

Add these secrets to your GitHub repository for the deployment workflow.

### Required Secrets:

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | API token for Wrangler | [Create token](https://dash.cloudflare.com/profile/api-tokens) with "Edit Cloudflare Workers" permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Found in dashboard URL or Workers overview page |

### Optional Secrets:

| Secret Name | Description | Default |
|------------|-------------|---------|
| `R2_BUCKET_NAME` | Custom R2 bucket name | `hono` |

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

### Verify Deployment:

1. Check GitHub Actions tab for workflow status
2. Once deployed, visit your Worker URL (shown in Actions logs)
3. Test search API: `POST https://your-worker.workers.dev/api/search` with `{"query": "test"}`

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
    ├── Upload manifest + markdown to R2
    └── Deploy Worker
        ↓
Cloudflare Workers
    ├── Fetch content from R2
    ├── Render pages with Hono/React
    └── Search via AI Search API
        ↓
AI Search (automatic)
    ├── Indexes R2 markdown files
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
