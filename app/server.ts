import { createApp } from 'honox/server';
import styleCSS from './style.css?inline';

const app = createApp();

// Serve CSS as a static route
app.get('/app/style.css', (c) => {
  return c.body(styleCSS, 200, {
    'Content-Type': 'text/css',
    'Cache-Control': 'public, max-age=31536000',
  });
});

export default app;
