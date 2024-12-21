import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from 'database/src/lib/entities/user.entity';
import { JoinRequestStatus } from '@event-socials/database';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-secret');
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        fullName: 'Test User',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'password123',
      });

      const { password, ...expectedResult } = mockUser;
      expect(result).toEqual(expectedResult);
    });

    it('should return error message when credentials are invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'wrongPassword',
      });

      expect(result).toBe('Invalid credentials');
    });
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        status: HttpStatus.ACCEPTED,
        message: 'Success',
        data: mockUser,
        access_token: 'mock-token',
      });
    });

    it('should return error when login fails', async () => {
      jest
        .spyOn(service, 'validateUser')
        .mockResolvedValue('Invalid credentials');

      const result = await service.login({
        email: 'test@example.com',
        password: 'wrongPassword',
      });

      expect(result).toEqual({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Invalid credentials',
      });
    });
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const mockCreateUserDto = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
      };

      const mockSavedUser = {
        id: 1,
        ...mockCreateUserDto,
        password: 'hashedPassword',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);

      const result = await service.signup(mockCreateUserDto);

      const { password, ...expectedData } = mockSavedUser;
      expect(result).toEqual({
        status: HttpStatus.OK,
        message: 'User created successfully',
        data: expectedData,
      });
    });

    it('should return error when user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1 });

      const result = await service.signup({
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
      });

      expect(result).toEqual({
        status: HttpStatus.CONFLICT,
        message: 'User already exists',
      });
    });
  });

  describe('encodeJoinAction', () => {
    it('should encode join action data', async () => {
      const mockJoinActionData = {
        sender: 'user@email.com',
        receiver: 'user@dmail.com',
        status: JoinRequestStatus.ACCEPTED,
        joinId: 1,
      };
      mockJwtService.sign.mockReturnValue('encoded-token');

      const result = await service.encodeJoinAction(mockJoinActionData);

      expect(result).toBe('encoded-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(mockJoinActionData, {
        secret: 'test-secret',
      });
    });
  });

  describe('decode', () => {
    it('should decode token successfully', async () => {
      const mockDecodedData = {
        sender: 'user@email.com',
        receiver: 'user@dmail.com',
        status: JoinRequestStatus.ACCEPTED,
        joinId: 1,
      };
      mockJwtService.verify.mockReturnValue(mockDecodedData);

      const result = await service.decode('mock-token');

      expect(result).toEqual(mockDecodedData);
      expect(mockJwtService.verify).toHaveBeenCalledWith('mock-token', {
        secret: 'test-secret',
      });
    });

    it('should handle decode errors', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const logSpy = jest.spyOn(service['logger'], 'log');

      const result = await service.decode('invalid-token');

      expect(result).toBeUndefined();
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
