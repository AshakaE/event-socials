
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import UsersModule from './users/users.module';
import { DatabaseModule } from '@event-socials/database';
import { AuthModule } from './auth/auth.module';
import EventsModule from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    PassportModule,
    UsersModule,
    AuthModule,
    EventsModule,
  ],
})
export class AppModule {}
