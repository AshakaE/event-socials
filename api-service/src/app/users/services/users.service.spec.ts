import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '@event-socials/database';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      fullName: 'Test User',
      bio: 'Test bio',
    };

    it('should return user not found when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.getUser(1, { id: 2 });

      expect(result).toEqual({
        status: HttpStatus.NOT_FOUND,
        message: 'User not found',
      });
    });

    it('should return public user data when requesting other user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUser(1, { id: 2 });

      expect(result).toEqual({
        status: HttpStatus.OK,
        message: 'success',
        data: {
          id: mockUser.id,
          fullName: mockUser.fullName,
          bio: mockUser.bio,
        },
      });
    });

    it('should return user data with email when requesting own profile', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUser(1, { id: 1 });

      expect(result).toEqual({
        status: HttpStatus.OK,
        message: 'success',
        data: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          bio: mockUser.bio,
        },
      });
    });
  });

  describe('update', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      fullName: 'Test User',
    };

    const mockCurrentUser = { id: 1 };

    it('should return user not found when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.update(
        1,
        { fullName: 'New Name' },
        mockCurrentUser
      );

      expect(result).toEqual({
        status: HttpStatus.NOT_FOUND,
        message: 'User not found',
      });
    });

    it('should return forbidden when updating other user profile', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.update(
        1,
        { fullName: 'New Name' },
        { id: 2 }
      );

      expect(result).toEqual({
        status: HttpStatus.FORBIDDEN,
        message:
          'Action reverted: You are not authorized to perform this action',
      });
    });

    it('should return conflict when updating to existing email', async () => {
      const existingUser = { ...mockUser, id: 2 };
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for finding target user
        .mockResolvedValueOnce(existingUser); // Second call for checking email

      const result = await service.update(
        1,
        { email: 'existing@example.com' },
        mockCurrentUser
      );

      expect(result).toEqual({
        status: HttpStatus.CONFLICT,
        message: 'Email already exists',
      });
    });

    it('should successfully update user', async () => {
      const updateData = { fullName: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateData };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.findOneBy.mockResolvedValue(updatedUser);

      const result = await service.update(1, updateData, mockCurrentUser);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(result).toEqual({
        status: HttpStatus.OK,
        message: 'User updated successfully',
        data: updatedUser,
      });
    });

    it('should allow email update when it is the same as current email', async () => {
      const updateData = { email: mockUser.email };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call for finding target user
        .mockResolvedValueOnce(mockUser); // Second call for checking email
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.update(1, updateData, mockCurrentUser);

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('User updated successfully');
    });
  });
});
