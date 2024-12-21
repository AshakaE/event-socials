import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config'
import EmailModule from './app/email/email.module'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { QUEUE_NAME } from '@event-socials/database'

async function bootstrap() {

  const appContext = await NestFactory.createApplicationContext(EmailModule);
  const configService = appContext.get(ConfigService);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    EmailModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [configService.get<string>('RABBITMQ_URL')],
        queue: QUEUE_NAME,
        queueOptions: {
          durable: true,
          deadLetterExchange: 'email_dlx',
          deadLetterRoutingKey: 'email_dlq',
        },
        prefetchCount: 1,
        noAck: false,
      },
    }
  );


  await app.listen();

  Logger.log(`📨 Email microservice is running...`);
}

bootstrap();
