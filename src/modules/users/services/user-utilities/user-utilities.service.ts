import { UserNotFoundError } from '../../logic/errors/user-not-found.error';
import type { IUsersRepository } from '../../repositories/users/types';
import type { DatabaseUser } from '../../types';
import type { FieldScreeningService } from '../field-screening/field-screening.service';

export class UserUtilitiesService {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly fieldScreeningService: FieldScreeningService,
  ) {}

  async getUserByEmail(email: string): Promise<DatabaseUser> {
    const fields = this.fieldScreeningService.getAllFields();

    const user = await this.usersRepository.getUserByEmail(email, { fields });

    if (!user) throw new UserNotFoundError(email);

    return user;
  }
}
