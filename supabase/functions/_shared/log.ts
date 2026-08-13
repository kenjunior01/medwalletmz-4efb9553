/**
 * Logging partilhado das Edge Functions com IDs de request.
 * Aceita o header `x-request-id` do frontend para correlacionar ponta-a-ponta.
 */
export function getRequestId(req: Request, fn: string): string {
  const incoming = req.headers.get('x-request-id');
  if (incoming) return incoming;
  return `${fn}_${crypto.randomUUID().slice(0, 8)}`;
}

export function createLogger(fn: string, requestId: string) {
  const base = (level: string, message: string, data?: unknown) => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      fn,
      request_id: requestId,
      message,
      data: data instanceof Error ? { name: data.name, message: data.message, stack: data.stack } : data,
    });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };
  return {
    requestId,
    info: (m: string, d?: unknown) => base('info', m, d),
    warn: (m: string, d?: unknown) => base('warn', m, d),
    error: (m: string, d?: unknown) => base('error', m, d),
  };
}

/** Headers a devolver para o cliente conseguir ligar o log ao pedido. */
export function requestIdHeaders(requestId: string) {
  return { 'x-request-id': requestId };
}