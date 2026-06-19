import { DatabaseError } from 'pg';
import { RoleTypes } from '@src/common/constants';
import { UserAlreadyExistsError } from '../../../logic/errors/user-already-exists.error';
import type { Client } from 'pg';
import type { DatabaseUser } from '../../../types';
import type {
  IUsersRepository,
  GetUserByIdOptions,
  GetUsersProps,
  CreateUserDto,
  UpdateUserDto,
  GetUserByEmailOptions,
} from '../types';

export class UsersPostgresRepository implements IUsersRepository {
  constructor(private readonly pgClient: Client) {}

  async getUserByEmail(email: string, options: GetUserByEmailOptions = {}): Promise<DatabaseUser | null> {
    const fields = options.fields || ['*'];
    const query = `SELECT ${fields.join(', ')} FROM users WHERE email = $1`;
    const result = await this.pgClient.query(query, [email]);

    if (result.rows.length === 0) {
      result.rows.push({
        id: -1,
        nickname: 'dummy',
        email: 'dummy@gmail.com',
        hashed_password:
          'salt:703453cc3a2dba8d0bed63a5757cc905ee6a6ab357caed7cdf8acdb16d9ea0706647a06259ebc0379bc413b4f0f9dcd51fff8d971f70a99872845a1c908e7462',
        date_of_birth: 0,
        role: RoleTypes.User,
      } as DatabaseUser);
    }

    return result.rows[0] || null;
  }

  async createUser(body: CreateUserDto): Promise<DatabaseUser> {
    try {
      const query = `
        INSERT INTO users (email, hashed_password, nickname, date_of_birth, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `;

      const values = [body.email, body.hashed_password, body.nickname, body.date_of_birth, body.role];

      const dbResult = await this.pgClient.query(query, values);

      const createdUser = dbResult.rows[0] as DatabaseUser;

      return createdUser;
    } catch (error) {
      if (error instanceof DatabaseError && error.code === '23505' && error.constraint === 'users_email_key') {
        throw new UserAlreadyExistsError(body.email);
      }

      throw error;
    }
  }

  async getUsers(props?: GetUsersProps): Promise<Array<DatabaseUser>> {
    let query = 'SELECT * FROM users';
    const values: any[] = [];
    let paramCount = 0;

    if (props?.filter && Object.keys(props.filter).length > 0) {
      const conditions = Object.keys(props.filter).map((key) => {
        paramCount++;
        values.push(props.filter[key]);
        return `${key} = $${paramCount}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (props?.options?.sort && Object.keys(props.options.sort).length > 0) {
      const sortClauses = Object.entries(props.options.sort).map(
        ([field, direction]) => `${field} ${direction === 1 ? 'ASC' : 'DESC'}`,
      );
      query += ` ORDER BY ${sortClauses.join(', ')}`;
    }

    if (props?.options?.limit) {
      query += ` LIMIT ${props.options.limit}`;
    }

    if (props?.options?.skip) {
      query += ` OFFSET ${props.options.skip}`;
    }

    const result = await this.pgClient.query(query, values);
    return result.rows as DatabaseUser[];
  }

  async getUserById(userId: string, _options: GetUserByIdOptions = {}): Promise<DatabaseUser | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pgClient.query(query, [userId]);

    return result.rows[0] || null;
  }

  async updateUserById(userId: string, body: UpdateUserDto): Promise<DatabaseUser> {
    const fields = Object.keys(body).filter(
      (key) => body[key as keyof UpdateUserDto] !== undefined && key !== 'updated_at',
    );
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [userId, ...fields.map((field) => body[field as keyof UpdateUserDto])];

    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pgClient.query(query, values);
    return result.rows[0] as DatabaseUser;
  }

  async deleteUserById(userId: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.pgClient.query(query, [userId]);

    return (result.rowCount ?? 0) > 0;
  }
}
