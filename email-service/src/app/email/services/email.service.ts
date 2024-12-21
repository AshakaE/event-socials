import { JoinRequestStatus, MailData } from '@event-socials/database';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EmailTemplate {
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private apiBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
    this.apiBaseUrl = this.configService.get<string>('BASE_API_URL');
  }

  private getJoinRequestTemplate(data: MailData): EmailTemplate {
    const acceptUrl = `${this.apiBaseUrl}/events/join-request/${data.accept}`;
    const ignoreUrl = `${this.apiBaseUrl}/events/join-request/${data.deny}`;

    switch (data.type) {
      case JoinRequestStatus.PENDING:
        return {
          subject: `New Join Request for ${data.title}`,
          text: `${data.requesterName} has requested to join your event "${data.title}".\n
You can take action on this request by using the following links:
- Accept Request: ${acceptUrl}
- Ignore Request: ${ignoreUrl}`,
          html: `
<p>${data.requesterName} has requested to join your event <strong>"${data.title}"</strong>.</p>
<p>Take action on this request:</p>
<ul>
  <li><a href="${acceptUrl}" style="color: green;">Accept Request</a></li>
  <li><a href="${ignoreUrl}" style="color: red;">Ignore Request</a></li>
</ul>`,
        };

      case JoinRequestStatus.ACCEPTED:
        return {
          subject: 'Join Request Status',
          text: `The event creator has accepted your join request for "${data.title}" event.`,
        };

      case JoinRequestStatus.REJECTED:
        return {
          subject: 'Join Request Status',
          text: `The event creator has denied your join request for "${data.title}" event.`,
        };

      default:
        throw new Error(`Unsupported request type: ${data.type}`);
    }
  }

  async sendEmail(data: MailData): Promise<unknown> {
    const template = this.getJoinRequestTemplate(data);

    const mailOptions = {
      to: data.receipient,
      ...template,
    };

    const response = await this.transporter.sendMail(mailOptions);
    return response;
  }
}
