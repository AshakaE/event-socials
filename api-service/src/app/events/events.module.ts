import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';
import { User, Event, JoinRequest } from '@event-socials/database'
import { AuthService } from '../auth/services/auth.service'


@Module({
  imports: [TypeOrmModule.forFeature([Event, JoinRequest, User])],
  controllers: [EventsController],
  providers: [EventsService, AuthService, JwtService],
  exports: [EventsService],
})
class EventsModule {}

export default EventsModule;
