import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthenticateModule } from './authenticate/authenticate.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import mikroOrmConfig from './mikro-orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthenticateModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
