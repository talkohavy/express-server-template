import { API_PATHS } from '@src/common/constants';
import { ServiceNames } from '@src/plugins/config-service';
import type { CreateDragonDto, UpdateDragonDto } from '../../../dragons/services/dragons/types';
import type { Dragon } from '../../../dragons/types';
import type { HttpClient } from '../../logic/http-client';
import type { IDragonsAdapter } from './dragons.adapter.interface';

export class DragonsHttpAdapter implements IDragonsAdapter {
  constructor(private readonly httpClient: HttpClient) {}

  async getDragons(): Promise<Array<Dragon>> {
    return this.httpClient.get<Array<Dragon>>({
      serviceName: ServiceNames.Dragons,
      route: API_PATHS.dragons,
    });
  }

  async getDragonById(dragonId: string): Promise<Dragon | null> {
    const route = `${API_PATHS.dragons}/${dragonId}`;
    return this.httpClient.get<Dragon | null>({
      serviceName: ServiceNames.Dragons,
      route,
    });
  }

  async createDragon(data: CreateDragonDto): Promise<Dragon> {
    return this.httpClient.post<Dragon>({
      serviceName: ServiceNames.Dragons,
      route: API_PATHS.dragons,
      body: data,
    });
  }

  async updateDragon(dragonId: string, data: UpdateDragonDto): Promise<Dragon | null> {
    const route = `${API_PATHS.dragons}/${dragonId}`;
    return this.httpClient.patch<Dragon | null>({
      serviceName: ServiceNames.Dragons,
      route,
      body: data,
    });
  }

  async deleteDragon(dragonId: string): Promise<{ message: string } | null> {
    const route = `${API_PATHS.dragons}/${dragonId}`;
    return this.httpClient.delete<{ message: string } | null>({
      serviceName: ServiceNames.Dragons,
      route,
    });
  }
}
