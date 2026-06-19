import type { DragonsService } from '../../../dragons/services/dragons/dragons.service';
import type { CreateDragonDto, UpdateDragonDto } from '../../../dragons/services/dragons/types';
import type { Dragon } from '../../../dragons/types';
import type { IDragonsAdapter } from './dragons.adapter.interface';

export class DragonsDirectAdapter implements IDragonsAdapter {
  constructor(private readonly dragonsService: DragonsService) {}

  async getDragons(): Promise<Array<Dragon>> {
    return this.dragonsService.getDragons();
  }

  async getDragonById(dragonId: string): Promise<Dragon | null> {
    return this.dragonsService.getDragonById(dragonId);
  }

  async createDragon(data: CreateDragonDto): Promise<Dragon> {
    return this.dragonsService.createDragon(data);
  }

  async updateDragon(dragonId: string, data: UpdateDragonDto): Promise<Dragon | null> {
    return this.dragonsService.updateDragon(dragonId, data);
  }

  async deleteDragon(dragonId: string): Promise<{ message: string } | null> {
    return this.dragonsService.deleteDragon(dragonId);
  }
}
