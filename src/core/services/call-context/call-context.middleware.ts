import { RequestContext } from './logic/constants';
import type { Application, NextFunction, Request, Response } from 'express';
import type { CallContextService } from './call-context.service';

export class CallContextMiddleware {
  public constructor(private readonly callContextService: CallContextService<string, string>) {}

  public use(
    app: Application,
    /**
     * A middleware that will be executed BEFORE the context is created.
     *
     * You can use `shouldCallNext` to skip context creation and call next() right away.
     *
     * You can use `shouldReturn` to skip context creation and return right away.
     *
     * When you might want to call `shouldReturn`? Would'nt the request just hang?
     * Well, obviously you'll have to call `res.end()` or `res.send()` or some similar method on `preUseMiddleware` before returning.
     *
     * @optional
     */
    preUseMiddleware?: (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => { shouldCallNext?: boolean; shouldReturn?: boolean } | undefined,
    /**
     * A middleware that will be executed AFTER the context is created.
     *
     * You can use it to add more data to the context.
     * @optional
     */
    postUseMiddleware?: (
      callContextService: CallContextService<string, string>,
      req: Request,
      res: Response,
      next: NextFunction,
    ) => void,
  ) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (preUseMiddleware) {
        const { shouldCallNext, shouldReturn } = preUseMiddleware(req, res, next) ?? {};

        if (shouldCallNext) return void next();

        if (shouldReturn) return;
      }

      this.callContextService.register();

      this.attachRequestInfo(req);

      postUseMiddleware?.(this.callContextService, req, res, next);

      next();
    });
  }

  private attachRequestInfo(req: Request) {
    const { method, query, url, originalUrl, path } = req;

    this.callContextService.set(RequestContext.Method, method);
    this.callContextService.set(RequestContext.OriginalUrl, originalUrl);
    this.callContextService.set(RequestContext.Url, url);
    this.callContextService.set(RequestContext.Path, path);
    this.callContextService.set(RequestContext.Query, JSON.stringify(query));
  }
}
