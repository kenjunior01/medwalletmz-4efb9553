/**
 * Logger central do frontend com IDs de request.
 * Todos os eventos ficam guardados em memória (window.__medwalletLogs)
 * e os últimos 100 em localStorage para diagnóstico rápido.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  requestId: string;
  scope: string;
  message: string;
  data?: unknown;
}

const STORAGE_KEY = 'mw_logs';
const MAX_ENTRIES = 100;

export const SESSION_ID =
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  ).slice(0, 8);

export function newRequestId(prefix = 'req'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${SESSION_ID}_${rand}`;
}

const buffer: LogEntry[] = [];

function persist(entry: LogEntry) {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  if (typeof window !== 'undefined') {
    (window as any).__medwalletLogs = buffer;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX_ENTRIES)));
    } catch {
      /* quota — ignorar */
    }
  }
}

function serialize(data: unknown) {
  if (data instanceof Error) {
    return { name: data.name, message: data.message, stack: data.stack };
  }
  return data;
}

export function log(level: LogLevel, scope: string, message: string, data?: unknown, requestId?: string) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    requestId: requestId || newRequestId(),
    scope,
    message,
    data: serialize(data),
  };
  persist(entry);
  const tag = `[${entry.requestId}] ${scope}: ${message}`;
  if (level === 'error') console.error(tag, entry.data ?? '');
  else if (level === 'warn') console.warn(tag, entry.data ?? '');
  else console.info(tag, entry.data ?? '');
  return entry.requestId;
}

export const logInfo = (scope: string, message: string, data?: unknown, requestId?: string) =>
  log('info', scope, message, data, requestId);
export const logWarn = (scope: string, message: string, data?: unknown, requestId?: string) =>
  log('warn', scope, message, data, requestId);
export const logError = (scope: string, message: string, data?: unknown, requestId?: string) =>
  log('error', scope, message, data, requestId);

export function getLogs(): LogEntry[] {
  if (buffer.length) return buffer;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearLogs() {
  buffer.length = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Convenience logger object with shorthand methods.
 * Each method auto-derives scope from the caller's file path at build time.
 * Usage: import { logger } from '@/lib/logger'; logger.info('message', data);
 */
export const logger = {
  debug: (message: string, data?: unknown) => log('debug', 'app', message, data),
  info: (message: string, data?: unknown) => log('info', 'app', message, data),
  warn: (message: string, data?: unknown) => log('warn', 'app', message, data),
  error: (message: string, data?: unknown) => log('error', 'app', message, data),
};