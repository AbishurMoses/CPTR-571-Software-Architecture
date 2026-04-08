import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { AuthenticateDto } from './dto/authenticate.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('authenticate')
export class AuthenticateController {
  constructor(private readonly authenticateService: AuthenticateService) {}

  @Post()
  @HttpCode(200)
  authenticate(@Body() authenticateDto: AuthenticateDto) {
    return this.authenticateService.authenticate(authenticateDto);
  }

  @Post('/refresh')
  @HttpCode(200)
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authenticateService.refresh(refreshDto);
  }
}
