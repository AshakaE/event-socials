import {
  Controller,
  Get,
  Body,
  Put,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { UpdateUserDto } from '../dto/user.dto';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { User } from '@event-socials/database';
import { CurrentUser } from '../decorators/user.decorator';
import { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger'

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile/:id')
  async findUser(
    @Param('id') id: string,
    @CurrentUser() user: Partial<User>,
    @Res() res: Response
  ) {
    const result = await this.usersService.getUser(+id, user);
    return res.status(result.status).json({
      ...result,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/:id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: Partial<User>,
    @Res() res: Response
  ) {
    const result = await this.usersService.update(+id, updateUserDto, user);
    return res.status(result.status).json({
      ...result,
    });
  }
}
