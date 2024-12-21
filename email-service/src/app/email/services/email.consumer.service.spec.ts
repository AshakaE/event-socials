import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { EmailConsumerService } from './email.consumer.service';
import { EmailService } from './email.service';
import { JoinRequestStatus } from '@event-socials/database';

describe('EmailConsumerService', () => {
  let service: EmailConsumerService;
  let emailService: EmailService;
  let logger: Logger;

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockChannel = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockContext = {
    getChannelRef: jest.fn().mockReturnValue(mockChannel),
    getMessage: jest.fn().mockReturnValue({ content: 'test message' }),
  } as unknown as RmqContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailConsumerService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<EmailConsumerService>(EmailConsumerService);
    emailService = module.get<EmailService>(EmailService);
    logger = new Logger(EmailConsumerService.name);

    jest.clearAllMocks();
  });

  describe('handleSendEmail', () => {
    const mockMailData = {
      receipient: 'test@example.com',
      type: JoinRequestStatus.PENDING,
      title: 'Test Content',
    };

    it('should acknowledge message when email is sent successfully', async () => {
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await service.handleSendEmail(mockMailData, mockContext);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(mockMailData);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockContext.getMessage());
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should negative acknowledge message when email sending fails', async () => {
      const error = new Error('Failed to send email');
      mockEmailService.sendEmail.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.handleSendEmail(mockMailData, mockContext);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(mockMailData);
      expect(mockChannel.nack).toHaveBeenCalledWith(
        mockContext.getMessage(),
        false,
        true
      );
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to send email to ${mockMailData.receipient}: ${error.message}`,
        error
      );
    });

    it('should handle various mail data formats', async () => {
      const differentMailData = {
        receipient: 'test@example.com',
        type: JoinRequestStatus.PENDING,
        title: 'Event Title',
        requesterName: 'John Doe',
      };

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await service.handleSendEmail(differentMailData, mockContext);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        differentMailData
      );
      expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('should call channel methods with correct message reference', async () => {
      const testMessage = { content: 'specific test message' };
      const contextWithSpecificMessage = {
        ...mockContext,
        getMessage: jest.fn().mockReturnValue(testMessage),
      } as unknown as RmqContext;

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await service.handleSendEmail(mockMailData, contextWithSpecificMessage);

      expect(mockChannel.ack).toHaveBeenCalledWith(testMessage);
    });

    it('should pass error details to nack when email service throws', async () => {
      const specificError = new Error('SMTP connection failed');
      mockEmailService.sendEmail.mockRejectedValue(specificError);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.handleSendEmail(mockMailData, mockContext);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMTP connection failed'),
        specificError
      );
      expect(mockChannel.nack).toHaveBeenCalledWith(
        mockContext.getMessage(),
        false,
        true
      );
    });
  });
});
