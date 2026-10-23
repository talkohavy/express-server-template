import type { Application } from 'express';
import type { LoggerService } from '../core/services/logger';

export function registerProcessHandlers(app: Application) {
  const onSignal = createSignalShutdownHandler(app);
  const onFatalError = createFatalErrorHandler(app);

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  process.on('unhandledRejection', onFatalError);
  process.on('uncaughtException', onFatalError);
}

function createSignalShutdownHandler(app: Application) {
  const { logger } = app;

  let isShuttingDown = false;

  return async function onSignal() {
    if (isShuttingDown) return;

    isShuttingDown = true;

    logger.log('Shutting down gracefully...');

    await runCleanupSteps({
      app,
      reasonLabel: 'graceful shutdown',
    });

    logger.log('Cleanup finished');

    process.exit(0);
  };
}

function createFatalErrorHandler(app: Application) {
  return async function onFatalError(reason: unknown) {
    console.error('Unhandled rejection or uncaught exception', { reason });
    console.error('Should not get here! You are missing a try/catch somewhere.');

    await runCleanupSteps({ app, reasonLabel: 'unexpected shutdown' });

    process.exit(1);
  };
}

type RunCleanupStepsProps = {
  app: Application;
  reasonLabel: string;
};

async function runCleanupSteps(props: RunCleanupStepsProps) {
  const { app, reasonLabel } = props;
  const { logger, topicSubscriber, modules } = app;

  // SSE goes first: clients are told to reconnect (to another node) as early as possible.
  await runCleanupStep({
    cleanup: () => modules.ServerSentEventsModule?.cleanup(),
    failureMessage: `SSE cleanup failed during ${reasonLabel}`,
    logger,
  });

  await runCleanupStep({
    cleanup: () => topicSubscriber.cleanup(),
    failureMessage: `Redis WS cleanup failed during ${reasonLabel}`,
    logger,
  });
}

type RunCleanupStepProps = {
  cleanup: () => Promise<void> | undefined;
  failureMessage: string;
  logger: LoggerService;
};

async function runCleanupStep(props: RunCleanupStepProps) {
  const { cleanup, failureMessage, logger } = props;

  try {
    await cleanup();
  } catch (error) {
    logger.error(failureMessage, { error });
  }
}
