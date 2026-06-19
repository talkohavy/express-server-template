import { API_PATHS, StatusCodes } from '@src/common/constants';
import { joiBodyMiddleware } from '@src/middlewares/joi-body.middleware';
import { createDragonSchema } from './dto/createDragon.dto';
import { updateDragonSchema } from './dto/updateDragon.dto';
import type { Application } from 'express';
import type { ControllerFactory } from '@src/lib/lucky-server';
import type { DragonsService } from '../../services/dragons/dragons.service';
import type { UpdateDragonDto } from '../../services/dragons/types';

export class DragonsCrudController implements ControllerFactory {
  constructor(
    private readonly app: Application,
    private readonly dragonService: DragonsService,
  ) {}

  registerRoutes() {
    this.getDragons();
    this.getDragonById();
    this.createDragon();
    this.updateDragon();
    this.deleteDragon();
  }

  private getDragons() {
    this.app.get(API_PATHS.dragons, async (_req, res) => {
      this.app.logger.info(`GET ${API_PATHS.dragons} - fetching dragons`);

      const dragons = await this.dragonService.getDragons();

      res.json(dragons);
    });
  }

  private getDragonById() {
    this.app.get(API_PATHS.dragonById, async (req, res) => {
      const { params } = req;

      this.app.logger.info(`GET ${API_PATHS.dragonById} - fetching dragon by ID`);

      const dragonId = params.dragonId as string;

      const dragon = await this.dragonService.getDragonById(dragonId);

      if (!dragon) {
        this.app.logger.error(`Dragon not found - id: ${dragonId}`);

        res.status(StatusCodes.NOT_FOUND).json({ message: 'Dragon not found' });
      }

      res.json(dragon);
    });
  }

  private createDragon() {
    this.app.post(API_PATHS.dragons, joiBodyMiddleware(createDragonSchema), async (req, res) => {
      const { body } = req;

      this.app.logger.info(`POST ${API_PATHS.dragons} - creating new dragon`);

      const newDragon = await this.dragonService.createDragon(body);

      res.status(StatusCodes.CREATED).json(newDragon);
    });
  }

  private updateDragon() {
    this.app.patch(API_PATHS.dragonById, joiBodyMiddleware(updateDragonSchema), async (req, res) => {
      const { params, body } = req as any;

      this.app.logger.info(`PATCH ${API_PATHS.dragonById} - updating dragon by ID`);

      const dragonId = params.dragonId as string;
      const dragon = body as UpdateDragonDto;

      const updatedDragon = await this.dragonService.updateDragon(dragonId, dragon);

      if (!updatedDragon) {
        this.app.logger.error(`Dragon not found - id: ${dragonId}`);

        res.status(StatusCodes.NOT_FOUND).json({ message: 'Dragon not found' });
        return;
      }

      res.json(updatedDragon);
    });
  }

  private deleteDragon() {
    this.app.delete(API_PATHS.dragonById, async (req, res) => {
      const { params } = req as any;

      this.app.logger.info(`DELETE ${API_PATHS.dragonById} - deleting dragon by ID`);

      const dragonId = params.dragonId as string;

      const deletedDragon = await this.dragonService.deleteDragon(dragonId);

      if (!deletedDragon) {
        this.app.logger.error(`Dragon not found - id: ${dragonId}`);

        res.status(StatusCodes.NOT_FOUND).json({ message: 'Dragon not found' });
        return;
      }

      res.json({ message: 'Dragon deleted successfully' });
    });
  }
}
