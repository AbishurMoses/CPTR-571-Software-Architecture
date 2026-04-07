import { Module } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { AuthenticateController } from './authenticate.controller';
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';

@Module({
  controllers: [AuthenticateController],
  providers: [AuthenticateService],
  imports: [
    JwtModule.register({
      privateKey: fs.readFileSync('private.key'),
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '15m',
      }
    })
  ],
})
export class AuthenticateModule {}
