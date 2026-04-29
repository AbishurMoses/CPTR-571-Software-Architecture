import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateHighscoreDto } from './dto/update-highscore.dto';
import { ReferenceUserDto } from './dto/reference-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch('/:id/highscore')
  updateHighscore(@Param() params: ReferenceUserDto, @Body() updateHighscoreDto: UpdateHighscoreDto) {
    return this.usersService.updateHighscore(+params.id, updateHighscoreDto);
  }

  @Get('/leaderboard')
  getLeaderboard() {
    return this.usersService.getLeaderboard()
  }
}
