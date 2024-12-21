import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'database/src/lib/entities/user.entity';
import { CreateUserDto, LoginDto } from '../../users/dto/user.dto';
import { JoinActionData, ReturnData } from '@event-socials/database';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private secret!: string;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private jwtService: JwtService
  ) {
    this.secret = this.configService.get<string>('JWT_SECRET');
  }

  async validateUser(loginDto: LoginDto): Promise<Partial<User> | string> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });
    const isValid = await bcrypt.compare(loginDto.password, user.password);
    if (user && isValid) {
      const { password, ...result } = user;
      return result;
    }
    return 'Invalid credentials';
  }

  async login(details: LoginDto): Promise<ReturnData<User>> {
    const user = await this.validateUser(details);
    if (typeof user === 'string') {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: user,
      };
    }
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    return {
      status: HttpStatus.ACCEPTED,
      message: 'Success',
      data: user,
      access_token,
    };
  }

  async encodeJoinAction(data: JoinActionData): Promise<string> {
    return this.jwtService.sign(data, { secret: this.secret });
  }

  async decode(token: string): Promise<JoinActionData> {
    try {
      return this.jwtService.verify(token, { secret: this.secret });
    } catch (error: unknown) {
      this.logger.log(error);
    }
  }

  async signup(args: CreateUserDto): Promise<ReturnData<User>> {
    const user = await this.userRepository.findOne({
      where: { email: args.email },
    });

    if (user) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'User already exists',
      };
    }

    const encryptedPassword = await bcrypt.hash(args.password, 10);

    const newUser = this.userRepository.create({
      fullName: args.fullName,
      email: args.email,
      password: encryptedPassword,
    });

    const savedUser = await this.userRepository.save(newUser);

    const { password, ...result } = savedUser;

    return {
      status: HttpStatus.OK,
      message: 'User created successfully',
      data: result,
    };
  }
}
