import { createRoute } from 'honox/factory';
import DocsHeader from '~/components/DocsHeader';
import DocsSidebar from '~/components/DocsSidebar';
import type { Env, Manifest } from '../types';

export default createRoute(async (c) => {
  const env = c.env as Env;

  // Fetch manifest from R2
  const manifestObject = await env.CONTENT.get('manifest.json');
  if (!manifestObject) {
    return c.text('Manifest not found', 500);
  }

  const manifest: Manifest = await manifestObject.json();
  const currentPath = c.req.path;

  return c.html(
    <html lang="en" class="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Astro Vault</title>
        <link rel="stylesheet" href="/app/style.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              const savedTheme = localStorage.getItem('theme') || 'dark';
              document.documentElement.classList.add('dark');
            })();
          `,
          }}
        />
        <script type="module" src="/app/client.js" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <div>
          <DocsHeader />

          <div className="flex">
            <DocsSidebar folders={manifest.folders} currentPath={currentPath} />

            <main className="flex-1 lg:pl-64 xl:pr-64">
              <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
                <article className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="mb-8">
                    <h1
                      id="welcome"
                      className="text-4xl font-bold tracking-tight text-balance mb-4"
                    >
                      Welcome to Your Documentation
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Your content is powered by Cloudflare R2 and AI Search for
                      blazing-fast semantic search.
                    </p>
                  </div>

                  <section id="features" className="mb-12">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 text-balance">
                      Features
                    </h2>
                    <ul className="space-y-2">
                      <li>
                        📦 <strong>R2 Storage</strong>: Content stored in
                        Cloudflare R2 for edge delivery
                      </li>
                      <li>
                        🔍 <strong>AI Search</strong>: Cloudflare AI Search with
                        automatic indexing
                      </li>
                      <li>
                        🚀 <strong>Edge-Ready</strong>: Runs on Cloudflare
                        Workers globally
                      </li>
                      <li>
                        ⚡ <strong>Fast Deployment</strong>: CI/CD via GitHub
                        Actions
                      </li>
                    </ul>
                  </section>

                  <section id="getting-started" className="mb-12">
                    <h2 className="text-3xl font-bold tracking-tight mb-4 text-balance">
                      Getting Started
                    </h2>
                    <p className="text-base leading-relaxed mb-4">
                      Select an article from the sidebar or press ⌘K to open
                      semantic search.
                    </p>
                  </section>
                </article>
              </div>
            </main>

            <div
              data-hydrate="true"
              data-component="DocsToc"
              data-props="{}"
              className="fixed top-14 right-0 z-30 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-l border-toc-border bg-toc xl:block"
            />
          </div>
        </div>
      </body>
    </html>,
  );
});
