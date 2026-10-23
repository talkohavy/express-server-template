import { createEventMessage } from '../utils/create-event-message';
import type { Application } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { ServerSentEventsService } from '../services/server-sent-events.service';

export class ServerSentEventsController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly serverSentEventsService: ServerSentEventsService,
  ) {}

  registerRoutes() {
    this.connectToChannel();
  }

  private connectToChannel() {
    this.app.get('/api/sse', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');

      this.serverSentEventsService.addClient(res);

      const message = createEventMessage({ content: 'Connection was successful!', eventName: 'connect' });

      res.write(message);
      res.flushHeaders();

      req.on('close', () => {
        this.serverSentEventsService.removeClient(res);

        res.end();
      });
    });
  }
}
