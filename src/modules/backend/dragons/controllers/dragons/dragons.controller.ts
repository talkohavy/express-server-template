import { API_PATHS, StatusCodes } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { createDragonSchema } from './dto/createDragonSchema.dto';
import { updateDragonSchema } from './dto/updateDragonSchema.dto';
import type { Application, Request, Response } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { IDragonsAdapter } from '../../adapters/dragons.adapter.interface';

export class DragonsController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly dragonsAdapter: IDragonsAdapter,
  ) {}

  registerRoutes() {
    this.createDragon();
    this.getDragons();
    this.getDragonById();
    this.updateDragon();
    this.deleteDragon();
  }

  private createDragon() {
    this.app.post(API_PATHS.dragons, joiBodyMiddleware(createDragonSchema), async (req: Request, res: Response) => {
      const { body } = req;

      this.app.logger.info(`POST ${API_PATHS.dragons} - creating new dragon`);

      const newDragon = await this.dragonsAdapter.createDragon(body);

      res.status(StatusCodes.CREATED).json(newDragon);
    });
  }

  private getDragons() {
    this.app.get(API_PATHS.dragons, async (_req, res) => {
      this.app.logger.info(`GET ${API_PATHS.dragons} - fetching dragons`);

      const dragons = await this.dragonsAdapter.getDragons();

      res.json(dragons);
    });
  }

  private getDragonById() {
    this.app.get(API_PATHS.dragonById, async (req: Request, res: Response) => {
      const { params } = req;

      this.app.logger.info(`GET ${API_PATHS.dragonById} - fetching dragon by ID`);

      const dragonId = params.dragonId!;

      const dragon = await this.dragonsAdapter.getDragonById(dragonId);

      if (!dragon) {
        this.app.logger.error('Dragon not found', dragonId);

        return void res.status(StatusCodes.NOT_FOUND).json({ message: 'Dragon not found' });
      }

      res.json(dragon);
    });
  }

  private updateDragon() {
    this.app.patch(API_PATHS.dragonById, joiBodyMiddleware(updateDragonSchema), async (req: Request, res: Response) => {
      const { body, params } = req;

      this.app.logger.info(`PATCH ${API_PATHS.dragonById} - updating dragon by ID`);

      const dragonId = params.dragonId!;
      const updatedDragon = await this.dragonsAdapter.updateDragon(dragonId, body);

      if (!updatedDragon) {
        this.app.logger.error('Dragon not found', dragonId);

        return void res.status(StatusCodes.NOT_FOUND).json({ message: 'Dragon not found' });
      }

      res.json(updatedDragon);
    });
  }

  private deleteDragon() {
    this.app.delete(API_PATHS.dragonById, async (req: Request, res: Response) => {
      const { params } = req;

      this.app.logger.info(`DELETE ${API_PATHS.dragonById} - deleting dragon by ID`);

      const dragonId = params.dragonId!;
      const deletedDragon = await this.dragonsAdapter.deleteDragon(dragonId);

      if (!deletedDragon) {
        this.app.logger.error('Dragon not found', dragonId);

        return void res.status(StatusCodes.NOT_FOUND).json({ message: 'Dragon not found' });
      }

      res.json({ message: 'Dragon deleted successfully' });
    });
  }
}
