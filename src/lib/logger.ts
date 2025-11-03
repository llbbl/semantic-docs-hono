/**
 * Logging configuration using logtape
 * Compatible with Cloudflare Workers
 */

import { configure, getConsoleSink, getLogger } from '@logtape/logtape';

// Configure logging once (lazy initialization)
let configuredPromise: Promise<void> | null = null;

function ensureConfigured(): Promise<void> {
  if (!configuredPromise) {
    configuredPromise = configure({
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
  }
  return configuredPromise;
}

// Logger wrapper that ensures configuration before logging
const baseLogger = getLogger('semantic-docs');

interface LazyLogger {
  info(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;
  error(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;
  warn(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;
  debug(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void;
}

export const logger: LazyLogger = {
  info(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void {
    ensureConfigured().then(() => {
      if (properties !== undefined) {
        baseLogger.info(message, properties);
      } else {
        baseLogger.info(message);
      }
    });
  },
  error(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void {
    ensureConfigured().then(() => {
      if (properties !== undefined) {
        baseLogger.error(message, properties);
      } else {
        baseLogger.error(message);
      }
    });
  },
  warn(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void {
    ensureConfigured().then(() => {
      if (properties !== undefined) {
        baseLogger.warn(message, properties);
      } else {
        baseLogger.warn(message);
      }
    });
  },
  debug(
    message: string,
    properties?: Record<string, unknown> | (() => Record<string, unknown>),
  ): void {
    ensureConfigured().then(() => {
      if (properties !== undefined) {
        baseLogger.debug(message, properties);
      } else {
        baseLogger.debug(message);
      }
    });
  },
};
