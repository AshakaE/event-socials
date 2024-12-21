import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { EventsService } from './events.service';
import { AuthService } from '../../auth/services/auth.service';
import { Event, User, QUEUE_NAME, EVENT_NAME, EventCategory } from '@event-socials/database';
import {
  JoinRequest,
  JoinRequestStatus,
} from 'database/src/lib/entities/join-request.entity';

// Mock ClientProxyFactory
jest.mock('@nestjs/microservices', () => ({
  ...jest.requireActual('@nestjs/microservices'),
  ClientProxyFactory: {
    create: jest.fn(() => ({
      emit: jest.fn().mockReturnValue({ toPromise: jest.fn() }),
    })),
  },
}));

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: Repository<Event>;
  let userRepository: Repository<User>;
  let joinRequestRepository: Repository<JoinRequest>;
  let authService: AuthService;
  let configService: ConfigService;
  let clientProxy: ClientProxy;

  const mockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockJoinRequestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthService = {
    encodeJoinAction: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(JoinRequest),
          useValue: mockJoinRequestRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    joinRequestRepository = module.get<Repository<JoinRequest>>(
      getRepositoryToken(JoinRequest)
    );
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockEventRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockConfigService.get.mockReturnValue('amqp://localhost');
  });

  describe('create', () => {
    const createEventDto = {
      title: 'Test Event',
      description: 'Test Description',
      date: "2024-12-21",
      category: 'DevOps' as EventCategory,
    };

    it('should create a new event successfully', async () => {
      const createdEvent = { id: 1, ...createEventDto };
      mockEventRepository.create.mockReturnValue(createdEvent);
      mockEventRepository.save.mockResolvedValue(createdEvent);

      const result = await service.create(createEventDto, 1);

      expect(result).toEqual({
        status: HttpStatus.CREATED,
        message: 'Event created successfully',
        data: createdEvent,
      });
      expect(mockEventRepository.create).toHaveBeenCalledWith({
        ...createEventDto,
        creator: { id: 1 },
      });
    });
  });

  describe('findAll', () => {
    const filters = {
      category: 'DevOps' as EventCategory,
      startDate: '2024-12-10',
      endDate: '2024-12-21',
      offset: 0,
      limit: 10,
    };

    it('should return filtered events', async () => {
      const events = [
        { id: 1, title: 'Event 1' },
        { id: 2, title: 'Event 2' },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(events);

      const result = await service.findAll(filters);

      expect(result).toEqual({
        status: HttpStatus.OK,
        message: 'Success',
        data: events,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendJoinRequest', () => {
    const mockEvent = {
      id: 1,
      title: 'Test Event',
      creator: { email: 'creator@test.com' },
    };
    const mockUser = {
      id: 1,
      email: 'user@test.com',
      fullName: 'Test User',
    };

    it('should return not found when event or user does not exist', async () => {
      mockEventRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.sendJoinRequest(1, 1);

      expect(result).toEqual({
        status: HttpStatus.NOT_FOUND,
        message: 'Event or User not found',
      });
    });

    it('should return conflict when join request already exists', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJoinRequestRepository.findOne.mockResolvedValue({ id: 1 });

      const result = await service.sendJoinRequest(1, 1);

      expect(result).toEqual({
        status: HttpStatus.CONFLICT,
        message: 'Join request already exists',
      });
    });

    it('should create join request successfully', async () => {
      const mockJoinRequest = { id: 1, status: JoinRequestStatus.PENDING };
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJoinRequestRepository.findOne.mockResolvedValue(null);
      mockJoinRequestRepository.create.mockReturnValue(mockJoinRequest);
      mockJoinRequestRepository.save.mockResolvedValue(mockJoinRequest);
      mockAuthService.encodeJoinAction.mockResolvedValue('encoded-token');

      const result = await service.sendJoinRequest(1, 1);

      expect(result).toEqual({
        status: HttpStatus.CREATED,
        message: 'Request to join event acknowledged',
        data: mockJoinRequest,
      });
    });
  });

  describe('updateJoinRequestStatus', () => {
    const mockJoinRequest = {
      id: 1,
      status: JoinRequestStatus.PENDING,
      event: {
        id: 1,
        title: 'Test Event',
        creator: { email: 'creator@test.com' },
      },
      user: { email: 'user@test.com' },
    };

    it('should return not found when join request does not exist', async () => {
      mockAuthService.decode.mockResolvedValue({
        sender: 'creator@test.com',
        status: JoinRequestStatus.ACCEPTED,
      });
      mockJoinRequestRepository.findOne.mockResolvedValue(null);

      const result = await service.updateJoinRequestStatus('encoded-data');

      expect(result).toEqual({
        status: HttpStatus.NOT_FOUND,
        message: 'Join request not found',
      });
    });

    it('should return forbidden when non-creator tries to update status', async () => {
      mockAuthService.decode.mockResolvedValue({
        sender: 'wrong@test.com',
        status: JoinRequestStatus.ACCEPTED,
      });
      mockJoinRequestRepository.findOne.mockResolvedValue(mockJoinRequest);

      const result = await service.updateJoinRequestStatus('encoded-data');

      expect(result).toEqual({
        status: HttpStatus.FORBIDDEN,
        message: 'Only event creator can update join request status',
      });
    });

    it('should update join request status successfully', async () => {
      const decodedData = {
        sender: 'creator@test.com',
        status: JoinRequestStatus.ACCEPTED,
        joinId: 1,
      };
      mockAuthService.decode.mockResolvedValue(decodedData);
      mockJoinRequestRepository.findOne.mockResolvedValue(mockJoinRequest);

      const result = await service.updateJoinRequestStatus('encoded-data');

      expect(result).toEqual({
        status: HttpStatus.OK,
        message: 'Join request updated',
        data: expect.objectContaining({
          status: JoinRequestStatus.ACCEPTED,
        }),
      });
    });
  });
});
