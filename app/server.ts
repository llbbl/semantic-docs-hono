import { createApp } from 'honox/server';
import styleCSS from './style.css?inline';
import type { Env } from './types';

const app = createApp();

// Serve CSS as a static route
app.get('/app/style.css', (c) => {
  return c.body(styleCSS, 200, {
    'Content-Type': 'text/css',
    'Cache-Control': 'public, max-age=31536000',
  });
});

// Serve client JS from R2 (with wildcard to support cache-busted filenames)
app.get('/app/client.*.js', async (c) => {
  const env = c.env as Env;

  // List files in static/ to find the latest client.*.js
  const listed = await env.CONTENT.list({ prefix: 'static/client.' });
  const clientFiles = listed.objects
    .filter((obj) => obj.key.endsWith('.js'))
    .sort(
      (a, b) => (b.uploaded?.getTime() || 0) - (a.uploaded?.getTime() || 0),
    );

  if (clientFiles.length === 0) {
    return c.text('Client bundle not found', 404);
  }

  const file = await env.CONTENT.get(clientFiles[0].key);
  if (!file) {
    return c.text('Client bundle not found', 404);
  }

  return c.body(await file.arrayBuffer(), 200, {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
});

// Serve favicon from R2
app.get('/favicon.svg', async (c) => {
  const env = c.env as Env;
  const file = await env.CONTENT.get('favicon.svg');

  if (!file) {
    return c.text('Favicon not found', 404);
  }

  return c.body(await file.arrayBuffer(), 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=31536000',
  });
});

export default app;
