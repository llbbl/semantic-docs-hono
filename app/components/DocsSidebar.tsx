/**
 * Docs Sidebar Component
 * Collapsible navigation populated from Turso database
 */

import type { FC } from 'hono/jsx';

interface Article {
  id: number;
  title: string;
  slug: string;
  folder: string;
}

interface DocsSidebarProps {
  articles: Article[];
  currentPath: string;
}

// Format folder names for display
function formatFolderName(folder: string): string {
  if (folder === 'root') return 'Documentation';
  return folder
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const DocsSidebar: FC<DocsSidebarProps> = ({ articles, currentPath }) => {
  // Group articles by folder
  const articlesByFolder = articles.reduce(
    (acc, article) => {
      const folder = article.folder || 'root';
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(article);
      return acc;
    },
    {} as Record<string, Article[]>,
  );

  return (
    <>
      <aside
        id="docs-sidebar"
        className="fixed top-14 z-30 -translate-x-full lg:translate-x-0 transition-transform duration-300 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar lg:block"
      >
        <div className="py-6 px-6">
          <nav className="space-y-2">
            {Object.entries(articlesByFolder).map(
              ([folder, folderArticles]) => (
                <div key={folder} className="mb-4" data-folder={folder}>
                  <button
                    type="button"
                    data-folder-button={folder}
                    className="flex w-full items-center justify-between py-2 text-sm font-medium text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
                  >
                    {formatFolderName(folder)}
                    <svg
                      data-folder-icon={folder}
                      className="h-4 w-4 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div data-folder-content={folder} className="mt-2 space-y-1">
                    {folderArticles.map((article) => {
                      const href = `/content/${article.slug}`;
                      const isActive =
                        currentPath === href ||
                        currentPath.startsWith(`${href}/`);

                      return (
                        <a
                          key={article.id}
                          href={href}
                          className={`block py-2 text-sm transition-colors pl-4 border-l-2 ${
                            isActive
                              ? 'text-sidebar-foreground border-sidebar-primary font-medium'
                              : 'text-muted-foreground border-transparent hover:text-sidebar-foreground hover:border-muted-foreground/30'
                          }`}
                        >
                          {article.title}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </nav>
        </div>
      </aside>

      {/* Collapsible functionality script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const folders = document.querySelectorAll('[data-folder]');
              folders.forEach(function(folder) {
                const folderName = folder.getAttribute('data-folder');
                const button = document.querySelector('[data-folder-button="' + folderName + '"]');
                const content = document.querySelector('[data-folder-content="' + folderName + '"]');
                const icon = document.querySelector('[data-folder-icon="' + folderName + '"]');

                // Initialize as open
                let isOpen = true;

                if (button && content && icon) {
                  button.addEventListener('click', function() {
                    isOpen = !isOpen;
                    if (isOpen) {
                      content.style.display = 'block';
                      icon.style.transform = 'rotate(0deg)';
                    } else {
                      content.style.display = 'none';
                      icon.style.transform = 'rotate(-90deg)';
                    }
                  });
                }
              });
            });
          `,
        }}
      />
    </>
  );
};

export default DocsSidebar;
