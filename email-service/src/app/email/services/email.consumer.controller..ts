import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EmailConsumerService } from './email.consumer.service'
import { EVENT_NAME, MailData } from '@event-socials/database'


@Controller()
export class EmailConsumerController {
  constructor(private service: EmailConsumerService) {}

  @EventPattern(EVENT_NAME)
  async handleEmailSend(@Payload() data: MailData, @Ctx() context: RmqContext) {
    await this.service.handleSendEmail(data, context);
  }
}
