import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { EventsService } from '../services/events.service';
import { User } from '@event-socials/database';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { CurrentUser } from '../../users/decorators/user.decorator';
import { CreateEventDto, EventFilterDto } from '../dto/event.dto';
import { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger'

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async addEvent(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: Partial<User>,
    @Res() res: Response
  ) {
    const result = await this.eventsService.create(createEventDto, user.id);
    return res.status(result.status).json({
      ...result,
    });
  }

  @Get()
  async getevents(
    @Query('EventFilter') filters: EventFilterDto,
    @Res() res: Response
  ) {
    const result = await this.eventsService.findAll(filters);
    return res.status(result.status).json({
      ...result,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async sendJoinRequest(
    @Param('id') eventId: string,
    @CurrentUser() user: Partial<User>,
    @Res() res: Response
  ) {
    const result = await this.eventsService.sendJoinRequest(+eventId, user.id);
    return res.status(result.status).json({
      ...result,
    });
  }

  @Get('join-request/:data')
  async updateJoinRequestStatus(@Param('data') requestData: string) {
    await this.eventsService.updateJoinRequestStatus(requestData);
  }
}
