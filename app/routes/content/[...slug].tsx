import { createRoute } from 'honox/factory';
import { marked } from 'marked';
import DocsHeader from '~/components/DocsHeader';
import DocsSidebar from '~/components/DocsSidebar';
import type { Env, Manifest } from '../../types';

// Configure marked to add IDs to headings and handle external links
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : '';

      // Open external links in new tab
      if (href?.startsWith('http://') || href?.startsWith('https://')) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      // Internal links open in same tab
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },
  },
});

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  title: string;
  tags: string[];
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { title: 'Untitled', tags: [], content };
  }

  const [, frontmatter, body] = match;
  const lines = frontmatter.split('\n');
  let title = 'Untitled';
  let tags: string[] = [];

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (key === 'title') {
      title = value.replace(/^['"]|['"]$/g, '');
    } else if (key === 'tags') {
      const tagsMatch = value.match(/\[(.*?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
  }

  return { title, tags, content: body };
}

export default createRoute(async (c) => {
  const env = c.env as Env;

  // Extract slug from full path: /content/folder/article -> folder/article
  const fullPath = c.req.path;
  const slug = fullPath.replace('/content/', '');

  if (!slug) {
    return c.redirect('/');
  }

  // Fetch markdown file from R2
  const mdFile = await env.CONTENT.get(`${slug}.md`);
  if (!mdFile) {
    return c.redirect('/404');
  }

  const rawContent = await mdFile.text();
  const { title, tags, content } = parseFrontmatter(rawContent);

  // Convert markdown to HTML
  const htmlContent = await marked(content);

  // Fetch manifest for sidebar
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
        <title>{title}</title>
        <meta name="description" content={title} />
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

            <main className="flex-1 lg:pl-64 xl:pr-64 min-w-0 relative z-10">
              <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <article className="prose prose-neutral dark:prose-invert max-w-none overflow-x-auto relative">
                  <header className="mb-8 pb-6 border-b border-border">
                    <h1 className="text-4xl font-bold tracking-tight text-balance mb-4">
                      {title}
                    </h1>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </header>

                  <div
                    className="article-content"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
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

          {/* Article content styling */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .article-content {
              line-height: 1.75;
              color: var(--foreground);
            }

            .article-content h1,
            .article-content h2,
            .article-content h3,
            .article-content h4,
            .article-content h5,
            .article-content h6 {
              color: var(--foreground);
              font-weight: 700;
              line-height: 1.3;
              margin-top: 2rem;
              margin-bottom: 1rem;
            }

            .article-content h1 {
              font-size: 2.25rem;
            }

            .article-content h2 {
              font-size: 1.875rem;
              scroll-margin-top: 5rem;
              padding-top: 1rem;
              border-top: 1px solid var(--border);
              margin-top: 3rem;
            }

            .article-content h3 {
              font-size: 1.5rem;
              scroll-margin-top: 5rem;
            }

            .article-content h4 {
              font-size: 1.25rem;
            }

            .article-content p {
              margin-top: 1.25rem;
              margin-bottom: 1.25rem;
            }

            .article-content ul,
            .article-content ol {
              margin-top: 1.25rem;
              margin-bottom: 1.25rem;
              padding-left: 1.75rem;
            }

            .article-content ul {
              list-style-type: disc;
            }

            .article-content ol {
              list-style-type: decimal;
            }

            .article-content li {
              margin-top: 0.5rem;
              margin-bottom: 0.5rem;
            }

            .article-content li::marker {
              color: var(--muted-foreground);
            }

            .article-content strong {
              color: var(--foreground);
              font-weight: 600;
            }

            .article-content pre {
              background: var(--muted);
              color: var(--foreground);
              padding: 1rem;
              border-radius: 0.5rem;
              overflow-x: auto;
              margin: 1.5rem 0;
              border: 1px solid var(--border);
            }

            .article-content code {
              background: var(--muted);
              color: var(--foreground);
              padding: 0.2rem 0.4rem;
              border-radius: 0.25rem;
              font-size: 0.875em;
              font-family: ui-monospace, 'Monaco', 'Courier New', monospace;
              border: 1px solid var(--border);
            }

            .article-content pre code {
              background: transparent;
              padding: 0;
              border: none;
              font-size: 0.875rem;
            }

            .article-content a {
              color: var(--primary);
              text-decoration: underline;
              text-decoration-color: var(--primary);
              text-decoration-thickness: 2px;
              text-underline-offset: 2px;
              font-weight: 500;
              transition: all 0.2s;
            }

            .article-content a:hover {
              text-decoration-thickness: 3px;
              opacity: 0.8;
            }

            .article-content blockquote {
              border-left: 4px solid var(--border);
              padding-left: 1rem;
              font-style: italic;
              color: var(--muted-foreground);
              margin: 1.5rem 0;
            }

            .article-content hr {
              border: none;
              border-top: 1px solid var(--border);
              margin: 3rem 0;
            }

            .article-content img {
              max-width: 100%;
              height: auto;
              border-radius: 0.5rem;
              margin: 2rem 0;
            }

            .article-content table {
              width: 100%;
              border-collapse: collapse;
              margin: 2rem 0;
            }

            .article-content th,
            .article-content td {
              padding: 0.75rem;
              border: 1px solid var(--border);
              text-align: left;
            }

            .article-content th {
              background: var(--muted);
              font-weight: 600;
            }
          `,
            }}
          />
        </div>
      </body>
    </html>,
  );
});
