import { API_PATHS } from '@src/common/constants';
import { ForbiddenError, UnauthorizedError } from '@src/core/errors';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { ConfigKeys, type CookiesConfig } from '@src/plugins/config-service';
import { SseDemoEventNames } from '../../logic/constants';
import { joinTopicSchema } from './dto/join-topic.dto';
import { leaveTopicSchema } from './dto/leave-topic.dto';
import { sendToTopicSchema } from './dto/send-to-topic.dto';
import { sendToUserSchema } from './dto/send-to-user.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { IAuthAdapter } from '../../../login/adapters/auth.adapter.interface';
import type { SendToTopicBody, SendToUserBody, TopicBody, TopicMessageData, UserMessageData } from '../../types';

/**
 * Lets a browser drive the SSE features, which are otherwise internal (`app.sseTopics`, `app.ssePublisher`):
 * join and leave topics, send to a topic, and send to a user.
 *
 * For demo purposes only: any logged-in user can join any topic and message any user.
 * In a real app, the service that owns the membership (e.g. a chats service) decides who is in which topic.
 */
export class SseDemoController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly authAdapter: IAuthAdapter,
  ) {}

  registerRoutes() {
    this.getTopics();
    this.joinTopic();
    this.leaveTopic();
    this.sendToTopic();
    this.sendToUser();
  }

  private getTopics() {
    this.app.get(API_PATHS.sseDemoTopics, async (req: Request, res: Response) => {
      const userId = await this.getUserId(req);

      this.app.logger.info(`GET ${API_PATHS.sseDemoTopics} - listing the user's SSE topics`);

      const topics = await this.app.sseTopics.getUserTopics(userId);

      topics.sort();

      res.json({ topics });
    });
  }

  private joinTopic() {
    this.app.post(
      API_PATHS.sseDemoJoinTopic,
      joiBodyMiddleware(joinTopicSchema),
      async (req: Request, res: Response) => {
        const userId = await this.getUserId(req);
        const { topic } = req.bodyParsed as TopicBody;

        this.app.logger.info(`POST ${API_PATHS.sseDemoJoinTopic} - adding the user to an SSE topic`);

        const isAdded = await this.app.sseTopics.addUserToTopic({ userId, topic });

        res.json({ isAdded });
      },
    );
  }

  private leaveTopic() {
    this.app.post(
      API_PATHS.sseDemoLeaveTopic,
      joiBodyMiddleware(leaveTopicSchema),
      async (req: Request, res: Response) => {
        const userId = await this.getUserId(req);
        const { topic } = req.bodyParsed as TopicBody;

        this.app.logger.info(`POST ${API_PATHS.sseDemoLeaveTopic} - removing the user from an SSE topic`);

        const isRemoved = await this.app.sseTopics.removeUserFromTopic({ userId, topic });

        res.json({ isRemoved });
      },
    );
  }

  private sendToTopic() {
    this.app.post(
      API_PATHS.sseDemoSendToTopic,
      joiBodyMiddleware(sendToTopicSchema),
      async (req: Request, res: Response) => {
        const userId = await this.getUserId(req);
        const { topic, text } = req.bodyParsed as SendToTopicBody;

        this.app.logger.info(`POST ${API_PATHS.sseDemoSendToTopic} - sending an SSE event to a topic`);

        const userTopics = await this.app.sseTopics.getUserTopics(userId);

        if (!userTopics.includes(topic)) {
          throw new ForbiddenError('Join the topic before sending to it');
        }

        const data: TopicMessageData = { topic, text, fromUserId: userId, sentAt: Date.now() };

        const receivingNodesCount = await this.app.ssePublisher.sendToTopic({
          topic,
          event: SseDemoEventNames.TopicMessage,
          data,
        });

        res.json({ receivingNodesCount });
      },
    );
  }

  private sendToUser() {
    this.app.post(
      API_PATHS.sseDemoSendToUser,
      joiBodyMiddleware(sendToUserSchema),
      async (req: Request, res: Response) => {
        const fromUserId = await this.getUserId(req);
        const { userId, text } = req.bodyParsed as SendToUserBody;

        this.app.logger.info(`POST ${API_PATHS.sseDemoSendToUser} - sending an SSE event to a user`);

        const data: UserMessageData = { text, fromUserId, sentAt: Date.now() };

        const receivingNodesCount = await this.app.ssePublisher.sendToUser({
          userId,
          event: SseDemoEventNames.UserMessage,
          data,
        });

        res.json({ receivingNodesCount });
      },
    );
  }

  /**
   * @throws UnauthorizedError when the access cookie is missing, invalid, or expired, so the browser refreshes the session.
   */
  private async getUserId(req: Request): Promise<string> {
    const { accessCookie } = this.app.configService.get<CookiesConfig>(ConfigKeys.Cookies);

    const accessToken: string | undefined = req.cookies?.[accessCookie.name];

    if (!accessToken) throw new UnauthorizedError('Missing access token');

    const decodedToken = await this.authAdapter.verifyToken(accessToken);

    const userId = String(decodedToken.id);

    return userId;
  }
}
