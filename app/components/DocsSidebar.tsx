/**
 * Docs Sidebar Component
 * Collapsible navigation populated from R2 manifest
 */

import type { FC } from 'hono/jsx';
import type { Folder } from '../types';

interface DocsSidebarProps {
  folders: Folder[];
  currentPath: string;
}

const DocsSidebar: FC<DocsSidebarProps> = ({ folders, currentPath }) => {
  return (
    <>
      <aside
        id="docs-sidebar"
        className="fixed top-14 z-30 -translate-x-full lg:translate-x-0 transition-transform duration-300 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar lg:block"
      >
        <div className="py-6 px-6">
          <nav className="space-y-2">
            {folders.map((folder) => (
              <div key={folder.slug} className="mb-4" data-folder={folder.slug}>
                <button
                  type="button"
                  data-folder-button={folder.slug}
                  className="flex w-full items-center justify-between py-2 text-sm font-medium text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
                >
                  {folder.name}
                  <svg
                    data-folder-icon={folder.slug}
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
                <div
                  data-folder-content={folder.slug}
                  className="mt-2 space-y-1"
                >
                  {folder.articles.map((article) => {
                    const href = `/content/${article.slug}`;
                    const isActive =
                      currentPath === href ||
                      currentPath.startsWith(`${href}/`);

                    return (
                      <a
                        key={article.slug}
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
            ))}
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
