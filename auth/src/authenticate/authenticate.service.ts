import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticateDto } from './dto/authenticate.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from 'src/users/entities/user.entity';
import * as bcrypt from 'node_modules/bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthenticateService {
  constructor(private readonly em: EntityManager, private readonly jwt: JwtService) {}
  
  async authenticate(authenticateDto: AuthenticateDto) {
    const user = await this.em.findOne(User, { username: authenticateDto.username })
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!await bcrypt.compare(authenticateDto.password, user.password)) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const token = await this.jwt.signAsync({
      username: user.username,
      role: user.role
    })

    return {
      token
    };
  }
}
