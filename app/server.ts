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

// Serve client JS from R2
app.get('/app/client.js', async (c) => {
  const env = c.env as Env;
  const file = await env.CONTENT.get('static/client.js');

  if (!file) {
    return c.text('Client bundle not found', 404);
  }

  return c.body(await file.arrayBuffer(), 200, {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'public, max-age=31536000',
  });
});

export default app;
