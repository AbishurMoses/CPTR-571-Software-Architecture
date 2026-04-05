import { Controller, Post, Body } from '@nestjs/common';
import { AuthenticateService } from './authenticate.service';
import { AuthenticateDto } from './dto/authenticate.dto';

@Controller('authenticate')
export class AuthenticateController {
  constructor(private readonly authenticateService: AuthenticateService) {}

  @Post()
  authenticate(@Body() authenticateDto: AuthenticateDto) {
    return this.authenticateService.authenticate(authenticateDto);
  }
}
