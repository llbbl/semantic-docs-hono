# Rate Limiting for Cloudflare Workers

This project is deployed on Cloudflare Workers. For rate limiting, use Cloudflare's platform features rather than in-memory solutions.

## Recommended Approach: Cloudflare Dashboard Rate Limiting

### Setup (No Code Required)

1. **Go to Cloudflare Dashboard** → Your domain → Security → WAF
2. **Create a Rate Limiting Rule**:
   - **Name**: `API Search Rate Limit`
   - **If incoming requests match**:
     - Field: `URI Path`
     - Operator: `equals`
     - Value: `/api/search`
   - **Then take action**:
     - Action: `Block`
     - Duration: `1 minute`
   - **When rate exceeds**:
     - Requests: `20`
     - Period: `1 minute` (60 seconds)
     - **Counting method**: `Count requests from each IP address`

3. **Save and Deploy**

### Benefits
- ✅ Distributed across all edge locations
- ✅ No code maintenance required
- ✅ Works across all Worker instances
- ✅ Dashboard analytics and monitoring
- ✅ No memory overhead in Workers

## Alternative: Custom Rate Limiting (Advanced)

If you need custom rate limiting logic, use one of these approaches:

### Option 1: Cloudflare Durable Objects (Recommended for Custom Logic)

```typescript
// Requires paid Workers plan
// See: https://developers.cloudflare.com/durable-objects/

export class RateLimiter {
  async fetch(request: Request) {
    // Distributed rate limiting logic here
  }
}
```

### Option 2: Workers KV (Simple but Higher Latency)

```typescript
// wrangler.toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-kv-namespace-id"

// In your worker
const count = await env.RATE_LIMIT.get(ip);
```

## Why Not In-Memory Rate Limiting?

⚠️ In-memory Maps/objects don't work for rate limiting in Workers because:
- Workers use isolates that don't share memory
- Each request may hit a different isolate
- Users can bypass limits by hitting different isolates
- Memory is lost when isolates are recycled

## Current Implementation

This project currently has **no rate limiting** in the code. Configure it via the Cloudflare Dashboard as shown above.

## Resources

- [Cloudflare Rate Limiting Rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Workers KV](https://developers.cloudflare.com/kv/)
