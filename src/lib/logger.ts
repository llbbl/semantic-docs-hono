/**
 * Simple logger using console
 * Compatible with Cloudflare Workers (no async at global scope)
 */

interface Logger {
  info(message: string, properties?: Record<string, unknown>): void;
  error(message: string, properties?: Record<string, unknown>): void;
  warn(message: string, properties?: Record<string, unknown>): void;
  debug(message: string, properties?: Record<string, unknown>): void;
}

function formatMessage(
  level: string,
  message: string,
  properties?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const props = properties ? ` ${JSON.stringify(properties)}` : '';
  return `[${timestamp}] ${level}: ${message}${props}`;
}

export const logger: Logger = {
  info(message: string, properties?: Record<string, unknown>): void {
    console.log(formatMessage('INFO', message, properties));
  },
  error(message: string, properties?: Record<string, unknown>): void {
    console.error(formatMessage('ERROR', message, properties));
  },
  warn(message: string, properties?: Record<string, unknown>): void {
    console.warn(formatMessage('WARN', message, properties));
  },
  debug(message: string, properties?: Record<string, unknown>): void {
    console.debug(formatMessage('DEBUG', message, properties));
  },
};
