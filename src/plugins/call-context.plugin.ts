import { AsyncLocalStorage } from 'async_hooks';
import { CallContextService } from '@src/core/services/call-context';
import type { Application } from 'express';

export function callContextPlugin(app: Application) {
  const callContextService = initCallContextService();

  app.callContextService = callContextService;
}

function initCallContextService(): CallContextService<string, string> {
  const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

  const callContextService = new CallContextService(asyncLocalStorage);

  return callContextService;
}
