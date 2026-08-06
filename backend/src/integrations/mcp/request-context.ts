import { AsyncLocalStorage } from "node:async_hooks";

const mcpRequestHeaders = new AsyncLocalStorage<Headers>();

export function runWithMcpRequestHeaders<T>(headers: Headers, fn: () => T): T {
  return mcpRequestHeaders.run(headers, fn);
}

export function getMcpRequestHeaders(): Headers {
  return mcpRequestHeaders.getStore() ?? new Headers();
}
