import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from '../dto/user.dto';
import { ReturnData, User } from '@event-socials/database';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async getUser(
    id: number,
    currentUser?: Partial<User>
  ): Promise<ReturnData<User>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'User not found',
      };
    }

    const { password, email, ...publicUser } = user;
    const result =
      id !== currentUser.id ? publicUser : { email: user.email, ...publicUser };

    return {
      status: HttpStatus.OK,
      message: 'success',
      data: result,
    };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: Partial<User>
  ): Promise<ReturnData<User>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'User not found',
      };
    }

    if (currentUser.id !== user.id) {
      return {
        status: HttpStatus.FORBIDDEN,
        message:
          'Action reverted: You are not authorized to perform this action',
      };
    }

    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Email already exists',
        };
      }
    }

    await this.userRepository.update(id, updateUserDto);

    const updatedUser = await this.userRepository.findOneBy({ id });
    return {
      status: HttpStatus.OK,
      message: 'User updated successfully',
      data: updatedUser,
    };
  }
}
