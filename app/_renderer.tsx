import type { FC, PropsWithChildren } from 'hono/jsx';
import { jsxRenderer } from 'hono/jsx-renderer';

interface LayoutProps {
  title?: string;
  description?: string;
}

const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title = 'Astro Vault',
  description = 'Documentation',
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        <link rel="stylesheet" href="/app/style.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'dark';
                const themes = {
                  dark: {
                    background: '#1a1a1a',
                    foreground: '#fafafa',
                    header: '#141414',
                    sidebar: '#0f0f0f',
                    toc: '#262626'
                  },
                  light: {
                    background: '#ffffff',
                    foreground: '#171717',
                    header: '#f5f5f5',
                    sidebar: '#f9fafb',
                    toc: '#fafafa'
                  },
                  ocean: {
                    background: '#0a1628',
                    foreground: '#e0f2fe',
                    header: '#0a1a2e',
                    sidebar: '#071220',
                    toc: '#0f2942'
                  },
                  forest: {
                    background: '#0f1e13',
                    foreground: '#d1fae5',
                    header: '#0d1a11',
                    sidebar: '#0a140d',
                    toc: '#14291a'
                  },
                  sunset: {
                    background: '#1c0f0a',
                    foreground: '#fef3c7',
                    header: '#1a0d08',
                    sidebar: '#110a07',
                    toc: '#2a1510'
                  },
                  purple: {
                    background: '#1a0a1f',
                    foreground: '#f3e8ff',
                    header: '#15091c',
                    sidebar: '#0f0514',
                    toc: '#241129'
                  },
                };
                const theme = themes[savedTheme];
                if (theme) {
                  document.documentElement.style.setProperty('--background', theme.background);
                  document.documentElement.style.setProperty('--foreground', theme.foreground);
                  document.documentElement.style.setProperty('--header', theme.header);
                  document.documentElement.style.setProperty('--sidebar', theme.sidebar);
                  document.documentElement.style.setProperty('--toc', theme.toc);
                }
                // Add dark class to document for Tailwind dark mode
                if (savedTheme === 'dark' || savedTheme === 'ocean' || savedTheme === 'forest' || savedTheme === 'sunset' || savedTheme === 'purple') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
};

export default jsxRenderer(({ children, title, description }: PropsWithChildren<LayoutProps>) => {
  return (
    <Layout title={title} description={description}>
      {children}
    </Layout>
  );
});
