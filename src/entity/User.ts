import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  getRepository
} from 'typeorm';
import DataLoader from 'dataloader';
import { generateToken } from '../lib/token';
import AuthToken from './AuthToken';

@Entity('users', {
  synchronize: false
})
export default class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ unique: true, length: 255 })
  username!: string;

  @Index()
  @Column({ unique: true, length: 255 })
  email!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ default: false })
  is_certified!: boolean;

  async generateUserToken() {
    const authToken = new AuthToken();
    authToken.fk_user_id = this.id;
    await getRepository(AuthToken).save(authToken);

    // refresh token is valid for 30days
    const refreshToken = await generateToken(
      {
        user_id: this.id
      },
      {
        subject: 'refresh_token',
        expiresIn: '30d',
        jwtid: authToken.id
      }
    );

    const accessToken = await generateToken(
      {
        user_id: this.id
      },
      {
        subject: 'access_token',
        expiresIn: '1h'
      }
    );

    return {
      refreshToken,
      accessToken
    };
  }
}

export const userLoader: DataLoader<string, User> = new DataLoader<string, User>(ids => {
  const repo = getRepository(User);
  const users = repo.findByIds(ids);
  return users;
});
