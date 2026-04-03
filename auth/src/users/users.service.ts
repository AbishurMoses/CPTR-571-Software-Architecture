import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from './entities/user.entity';
import * as bcrypt from 'node_modules/bcryptjs';

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
      role: role
    });
    await this.em.persistAndFlush(user);

    return {
      username: createUserDto.username,
      role: role
    };
  }
}
