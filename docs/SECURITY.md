# Security Considerations

## API Rate Limiting

⚠️ **Important**: This project is designed for Cloudflare Workers. Rate limiting must be configured via the Cloudflare Dashboard, not in code.

### Setup Instructions

See [docs/RATE_LIMITING.md](./RATE_LIMITING.md) for complete setup instructions.

**Quick Setup:**
1. Go to Cloudflare Dashboard → Security → WAF
2. Create rate limiting rule for `/api/search`
3. Set limit: 20 requests/minute per IP

### Why Platform-Level Rate Limiting?

Cloudflare Workers don't support traditional in-memory rate limiting because:
- Workers use isolates that don't share memory
- Each request may hit a different isolate
- In-memory counters are not shared across instances

### Built-in Input Validation

The search API includes these protections (enforced in code):

- **500 character** maximum query length
- **20 results** maximum per query
- Query type validation (must be string)

## Deployment Considerations

2. **Edge rate limiting** (Platform-specific)
   - Cloudflare Workers: Use Durable Objects
   - Vercel: Use Edge Config or KV
   - Netlify: Use Blobs

3. **WAF/CDN rate limiting**
   - Cloudflare: Configure rate limiting rules
   - AWS CloudFront: Lambda@Edge
   - Fastly: VCL rate limiting

### Query Cost Protection

The API limits:
- Query length (500 chars) - prevents expensive embedding generation
- Results count (max 20) - prevents excessive database queries
- Request rate (20/min) - prevents API/database abuse

### Environment-Specific Risks

**Local/Xenova Provider** (Free)
- Risk: CPU abuse
- Mitigation: Rate limiting sufficient

**Gemini Provider** (Free tier: 1,500 req/day)
- Risk: API quota exhaustion
- Mitigation: Consider stricter rate limits (5-10 req/min)

**OpenAI Provider** (Paid)
- Risk: Cost abuse
- Mitigation: Monitor usage, alert on anomalies
- Recommendation: Use OpenAI's own rate limiting

### Turso Database Limits

Free tier limits:
- 500 databases
- 9 GB total storage
- Unlimited rows read
- Unlimited rows written

**Cost protection**: Rate limiting prevents write abuse from malicious indexing attempts.

## Additional Security Measures

### Optional Enhancements

1. **CORS restrictions**
   ```ts
   headers: {
     'Access-Control-Allow-Origin': 'https://yourdomain.com'
   }
   ```

2. **Referer checking** (weak but simple)
   ```ts
   const referer = request.headers.get('referer');
   if (!referer?.includes('yourdomain.com')) {
     return new Response('Forbidden', { status: 403 });
   }
   ```

3. **API Keys** (for private docs)
   ```ts
   const apiKey = request.headers.get('x-api-key');
   if (apiKey !== process.env.SEARCH_API_KEY) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

4. **Query caching**
   ```ts
   // Cache common queries to reduce database load
   const cacheKey = `search:${query}`;
   const cached = await cache.get(cacheKey);
   if (cached) return cached;
   ```

## Monitoring

Recommended metrics to track:
- Requests per IP
- 429 (rate limited) responses
- Query patterns
- Response times
- Database query counts
- Embedding API usage

Consider setting up alerts for:
- Spike in 429 responses
- Unusually long queries
- High request volume from single IP
