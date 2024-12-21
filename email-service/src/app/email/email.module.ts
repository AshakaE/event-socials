import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EmailService } from './services/email.service';
import { EmailConsumerService } from './services/email.consumer.service';
import { EmailConsumerController } from './services/email.consumer.controller.';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [EmailConsumerService, EmailService],
  controllers: [EmailConsumerController],
})
export default class EmailModule {}
