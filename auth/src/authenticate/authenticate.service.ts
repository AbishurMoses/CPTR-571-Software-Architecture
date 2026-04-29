import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthenticateDto } from './dto/authenticate.dto';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from 'src/users/entities/user.entity';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthenticateService {
  constructor(private readonly em: EntityManager, private readonly jwt: JwtService) {}
  
  async authenticate(authenticateDto: AuthenticateDto) {
    const user = await this.em.findOne(User, { username: authenticateDto.username })
    if (!user || !await bcrypt.compare(authenticateDto.password, user.password)) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Access token is the JWT. It contains user information and is short lived.
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role
      },
      { expiresIn: '10m' }
    );

    // Refresh token stays in the browser through refreshes and tells the gateway to request a new access token.
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      { expiresIn: '1d' }
    );

    return {
      accessToken,
      refreshToken
    };
  }

  async refresh(refreshDto: RefreshDto) {
    try {
      // Verify refresh token.
      console.log(refreshDto)
      const payload = await this.jwt.verifyAsync(refreshDto.refreshToken);

      const user = await this.em.findOne(User, { id: payload.sub })
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Access token is the JWT. It contains user information and is short lived.
      const accessToken = await this.jwt.signAsync(
        {
          sub: payload.sub,
          username: user.username,
          role: user.role
        },
        { expiresIn: '10m' }
      );

      return { accessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
