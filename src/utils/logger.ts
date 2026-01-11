/**
 * ENEOS Sales Automation - Logger Module
 * Enterprise-grade logging with Winston
 */

import winston from 'winston';
import { config } from '../config/index.js';

// ===========================================
// Custom Log Format
// ===========================================

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${service || 'app'}] ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ===========================================
// Logger Instance
// ===========================================

export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'eneos-automation' },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: config.isDev ? customFormat : jsonFormat,
    }),
  ],
});

// ===========================================
// Child Loggers for Different Modules
// ===========================================

export const createModuleLogger = (moduleName: string) => {
  return logger.child({ service: moduleName });
};

// Pre-configured module loggers
export const webhookLogger = createModuleLogger('webhook');
export const lineLogger = createModuleLogger('line');
export const sheetsLogger = createModuleLogger('sheets');
export const geminiLogger = createModuleLogger('gemini');
export const dedupLogger = createModuleLogger('dedup');

// ===========================================
// Request Logger Middleware Helper
// ===========================================

export interface RequestLogData {
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
}

export const logRequest = (data: RequestLogData) => {
  const level = data.statusCode && data.statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `${data.method} ${data.path}`, {
    ...data,
    service: 'http',
  });
};

// ===========================================
// Error Logger Helper
// ===========================================

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  });
};
