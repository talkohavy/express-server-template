import type { UserUtilitiesService } from '../../../users/services/user-utilities/user-utilities.service';
import type { CreateUserDto, UpdateUserDto } from '../../../users/services/users-crud/types';
import type { UsersCrudService } from '../../../users/services/users-crud/users-crud.service';
import type { DatabaseUser } from '../../../users/types';
import type { IUsersAdapter } from './users.adapter.interface';

export class UsersDirectAdapter implements IUsersAdapter {
  constructor(
    private readonly crudService: UsersCrudService,
    private readonly utilitiesService: UserUtilitiesService,
  ) {}

  async createUser(data: CreateUserDto): Promise<DatabaseUser> {
    return this.crudService.createUser(data);
  }

  async getUserById(userId: string): Promise<DatabaseUser> {
    return this.crudService.getUserById(userId);
  }

  async getUsers(query?: any): Promise<Array<DatabaseUser>> {
    return this.crudService.getUsers(query);
  }

  async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    return this.utilitiesService.getUserByEmail(email);
  }

  async updateUserById(userId: string, data: UpdateUserDto): Promise<DatabaseUser> {
    return this.crudService.updateUserById(userId, data);
  }

  async deleteUserById(userId: string): Promise<{ success: boolean }> {
    return this.crudService.deleteUserById(userId);
  }
}
