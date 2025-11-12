import { hydrateRoot } from 'react-dom/client';
import './style.css';

// This file handles client-side hydration for React island components

// Get all island elements
const islands = document.querySelectorAll('[data-hydrate]');

islands.forEach((island) => {
  const componentName = island.getAttribute('data-component');
  const propsJson = island.getAttribute('data-props');
  const props = propsJson ? JSON.parse(propsJson) : {};

  // Dynamic import and hydrate the island component
  if (componentName) {
    import(`./islands/${componentName}.tsx`)
      .then((module) => {
        const Component = module.default;
        hydrateRoot(island, <Component {...props} />);
      })
      .catch((error) => {
        console.error(`Failed to hydrate island: ${componentName}`, error);
      });
  }
});
