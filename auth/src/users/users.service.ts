import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from './entities/user.entity';
import bcrypt from 'bcryptjs';
import { UpdateHighscoreDto } from './dto/update-highscore.dto';

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}
  
  async create(createUserDto: CreateUserDto) {
    const duplicate = await this.em.findOne(User, { username: createUserDto.username });
    if (duplicate) {
      throw new ConflictException('Username already exists');
    }
    const passhash = await bcrypt.hash(createUserDto.password, 10);
    const role = createUserDto.role ?? 1;

    const user = await this.em.create(User, {
      username: createUserDto.username,
      password: passhash,
      role: role,
      highscore: 0
    });
    await this.em.persistAndFlush(user);

    return {
      username: createUserDto.username,
      role: role
    };
  }

  async updateHighscore(id: number, updateHighscoreDto: UpdateHighscoreDto) {
    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let isNewHighscore = false
    if (updateHighscoreDto.score > user.highscore) {
      user.highscore = updateHighscoreDto.score;
      await this.em.persistAndFlush(user);
      isNewHighscore = true;
    }
    
    return { score: updateHighscoreDto.score, isNewHighscore };
  }

  async getLeaderboard() {
    const users = await this.em.find(User, 
      { highscore: { $gt: 0 } },
      {
      fields: ['username', 'highscore'],
      orderBy: { highscore: 'DESC' },
      limit: 10,
    });

    return users.map(user => ({
      username: user.username,
      highscore: user.highscore,
    }));
  }
}
