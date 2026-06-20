import { createPipeline } from '@src/common/utils/createPipeline';
import { parseJson } from '@src/common/utils/parseJson';
import { ResponseTypes, type SocketEventValues } from '../../logic/constants';
import { sendResponse } from '../../logic/utils/sendResponse';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@src/common/types';
import type { LoggerService } from '@src/core/services/logger';
import type { ActionHandler } from '../../types';
import type { RegisterProps } from './types';

/**
 * Parses JSON, validates the "event" key, and dispatches to the registered domain handler.
 * All client messages must be stringified JSON with an "event" key (Socket.IO-style).
 */
export class MessageDispatcherByEventService {
  private readonly handlersByEvent: Partial<Record<SocketEventValues, ActionHandler>> = {};

  constructor(private readonly logger: LoggerService) {}

  register(props: RegisterProps): void {
    const { event, handler, middlewares = [] } = props;

    const composedHandler = middlewares.length > 0 ? createPipeline([...middlewares, handler]) : handler;

    this.handlersByEvent[event] = composedHandler;
  }

  async dispatchMessage(socket: WebSocket, data: Buffer): Promise<void> {
    const message = parseJson<unknown>(data);

    if (!this.isValidClientMessage(message)) {
      this.logger.debug('Received invalid message: missing or invalid JSON / event key', { raw: data?.toString?.() });

      return void sendResponse({
        socket,
        type: ResponseTypes.ValidationError,
        message: 'Invalid message: must be stringified JSON with an "event" key',
      });
    }

    const { event } = message;

    const eventHandler = this.handlersByEvent[event];

    if (!eventHandler) {
      this.logger.debug('Received unknown event', { event });
      return void sendResponse({ socket, type: ResponseTypes.ValidationError, message: 'Unknown event' });
    }

    try {
      await eventHandler(socket, message);
    } catch (error) {
      this.logger.error('Error in event handler', { event, error });

      sendResponse({ socket, type: ResponseTypes.ServerError, message: 'Internal server error' });
    }
  }

  private isValidClientMessage(message: any): message is ClientMessage {
    return Boolean(message) && typeof message.event === 'string';
  }
}
