/**
 * Logging configuration using logtape
 * Compatible with Cloudflare Workers
 */

import { configure, getConsoleSink, getLogger } from '@logtape/logtape';

// Configure logging once
let configured = false;

export async function configureLogging() {
  if (configured) return;

  await configure({
    sinks: {
      console: getConsoleSink(),
    },
    filters: {},
    loggers: [
      {
        category: 'semantic-docs',
        sinks: ['console'],
      },
      {
        category: ['logtape', 'meta'],
        sinks: [],
      },
    ],
  });

  configured = true;
}

// Export pre-configured logger
export const logger = getLogger('semantic-docs');
