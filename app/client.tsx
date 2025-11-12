import { createRoot } from 'react-dom/client';
import DocsToc from './islands/DocsToc';
import Search from './islands/Search';
import ThemeSwitcher from './islands/ThemeSwitcher';

// Island component registry
const islands = {
  DocsToc,
  Search,
  ThemeSwitcher,
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountIslands);
} else {
  mountIslands();
}

function mountIslands() {
  // Get all island elements
  const islandElements = document.querySelectorAll('[data-hydrate]');

  islandElements.forEach((element) => {
    const componentName = element.getAttribute('data-component');
    const propsJson = element.getAttribute('data-props');

    if (!componentName) return;

    const Component = islands[componentName as keyof typeof islands];
    if (!Component) {
      console.error(`Island component not found: ${componentName}`);
      return;
    }

    try {
      const props = propsJson ? JSON.parse(propsJson) : {};
      const root = createRoot(element);
      root.render(<Component {...props} />);
    } catch (error) {
      console.error(`Failed to mount island: ${componentName}`, error);
    }
  });
}
