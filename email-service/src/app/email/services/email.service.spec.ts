import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';
import { JoinRequestStatus } from '@event-socials/database';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'password123',
        BASE_API_URL: 'http://api.example.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    } as any;

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    const baseMailData = {
      receipient: 'recipient@example.com',
      title: 'Test Event',
      requesterName: 'John Doe',
      accept: 'accept-token',
      deny: 'deny-token',
    };

    it('should send pending join request email with correct template', async () => {
      const mailData = {
        ...baseMailData,
        type: JoinRequestStatus.PENDING,
      };

      await service.sendEmail(mailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        to: mailData.receipient,
        subject: expect.stringContaining('New Join Request'),
        text: expect.stringContaining(mailData.requesterName),
        html: expect.stringContaining('Accept Request'),
      });
    });

    it('should send accepted join request email', async () => {
      const mailData = {
        ...baseMailData,
        type: JoinRequestStatus.ACCEPTED,
      };

      await service.sendEmail(mailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        to: mailData.receipient,
        subject: 'Join Request Status',
        text: expect.stringContaining('accepted'),
      });
    });

    it('should send rejected join request email', async () => {
      const mailData = {
        ...baseMailData,
        type: JoinRequestStatus.REJECTED,
      };

      await service.sendEmail(mailData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        to: mailData.receipient,
        subject: 'Join Request Status',
        text: expect.stringContaining('denied'),
      });
    });

    it('should throw error for unsupported request type', async () => {
      const mailData = {
        ...baseMailData,
        type: 'INVALID_TYPE' as JoinRequestStatus,
      };

      await expect(service.sendEmail(mailData)).rejects.toThrow(
        'Unsupported request type'
      );
    });

    it('should handle email sending errors', async () => {
      const error = new Error('SMTP error');
      mockTransporter.sendMail.mockRejectedValueOnce(error);

      const mailData = {
        ...baseMailData,
        type: JoinRequestStatus.PENDING,
      };

      await expect(service.sendEmail(mailData)).rejects.toThrow('SMTP error');
    });

    it('should include correct URLs in pending request email', async () => {
      const mailData = {
        ...baseMailData,
        type: JoinRequestStatus.PENDING,
      };

      await service.sendEmail(mailData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain(
        `http://api.example.com/events/join-request/${mailData.accept}`
      );
      expect(callArgs.text).toContain(
        `http://api.example.com/events/join-request/${mailData.deny}`
      );
      expect(callArgs.html).toContain(
        `http://api.example.com/events/join-request/${mailData.accept}`
      );
      expect(callArgs.html).toContain(
        `http://api.example.com/events/join-request/${mailData.deny}`
      );
    });
  });
});
