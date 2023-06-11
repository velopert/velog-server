import type { User, Prisma } from '@prisma/client';
import db from '../lib/db';

const userService = {
  async getPublicProfileById(userId: string) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userProfile: true,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      display_name: user.userProfile!.display_name,
      thumbnail: user.userProfile!.thumbnail,
    };
  },
  async findUserById(id: string): Promise<User | null> {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    return user;
  },
  async findUserByEmail(email: string): Promise<User | null> {
    const user = await db.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    return user;
  },
  async updateUser(userId: string, input: Prisma.UserUpdateInput): Promise<User> {
    const user = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        ...input,
      },
    });
    return user;
  },
};

export default userService;
