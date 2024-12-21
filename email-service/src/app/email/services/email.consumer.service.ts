import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { MailData } from '@event-socials/database';

@Injectable()
export class EmailConsumerService {
  private readonly logger = new Logger(EmailConsumerService.name);

  constructor(private readonly emailService: EmailService) {}

  async handleSendEmail(@Payload() data: MailData, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.emailService.sendEmail(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);
      this.logger.error(
        `Failed to send email to ${data.receipient}: ${error.message}`, error
      );
    }
  }
}
