import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto, EventFilterDto } from '../dto/event.dto';
import {
  User,
  Event,
  QUEUE_NAME,
  EVENT_NAME,
  ReturnData,
  JoinActionData,
} from '@event-socials/database';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {
  JoinRequest,
  JoinRequestStatus,
} from 'database/src/lib/entities/join-request.entity';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/services/auth.service';

@Injectable()
export class EventsService {
  private readonly client: ClientProxy;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [this.configService.get<string>('RABBITMQ_URL')],
        queue: QUEUE_NAME,
        queueOptions: {
          durable: true,
          deadLetterExchange: 'email_dlx',
          deadLetterRoutingKey: 'email_dlq',
        },
      },
    });
  }

  async create(
    createEventDto: CreateEventDto,
    creatorId: number
  ): Promise<ReturnData<Event>> {
    const event = this.eventRepository.create({
      ...createEventDto,
      creator: { id: creatorId },
    });
    const newEvent = await this.eventRepository.save(event);
    return {
      status: HttpStatus.CREATED,
      message: 'Event created successfully',
      data: newEvent,
    };
  }

  async findAll(filters: EventFilterDto): Promise<ReturnData<Event[]>> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('event.creator', 'creator')
      .addSelect(['creator.fullName'])
      .orderBy('event.date', 'ASC');

    if (filters.category) {
      query.andWhere('event.category = :category', {
        category: filters.category,
      });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('event.date BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const events = await query
      .skip(filters.offset)
      .take(filters.limit)
      .getMany();

    return {
      status: HttpStatus.OK,
      message: 'Success',
      data: events,
    };
  }

  async sendJoinRequest(
    eventId: number,
    userId: number
  ): Promise<ReturnData<JoinRequest>> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['creator'],
    });
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!event || !user) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Event or User not found',
      };
    }

    const existingRequest = await this.joinRequestRepository.findOne({
      where: {
        event: { id: eventId },
        user: { id: userId },
      },
    });

    if (existingRequest) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Join request already exists',
      };
    }
    const joinRequest = this.joinRequestRepository.create({
      event: { id: eventId },
      user: { id: userId },
      status: JoinRequestStatus.PENDING,
    });
    await this.joinRequestRepository.save(joinRequest);

    const accept = await this.authService.encodeJoinAction({
      receiver: user.email,
      sender: event.creator.email,
      status: JoinRequestStatus.ACCEPTED,
      joinId: joinRequest.id,
    });
    const deny = await this.authService.encodeJoinAction({
      receiver: user.fullName,
      sender: event.creator.email,
      status: JoinRequestStatus.REJECTED,
      joinId: joinRequest.id,
    });

    await this.client
      .emit(EVENT_NAME, {
        type: JoinRequestStatus.PENDING,
        title: event.title,
        receipient: event.creator.email,
        requesterName: user.fullName,
        joinRequestId: joinRequest.id,
        accept,
        deny,
      })
      .toPromise();

    return {
      status: HttpStatus.CREATED,
      message: 'Request to join event acknowledged',
      data: joinRequest,
    };
  }

  async updateJoinRequestStatus(
    data: string
  ): Promise<ReturnData<JoinRequest>> {
    const { sender, status, joinId }: JoinActionData =
      await this.authService.decode(data);

    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: joinId },
      relations: ['event', 'event.creator', 'user'],
    });

    if (!joinRequest) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Join request not found',
      };
    }

    if (joinRequest.event.creator.email !== sender) {
      return {
        status: HttpStatus.FORBIDDEN,
        message: 'Only event creator can update join request status',
      };
    }

    joinRequest.status = status as JoinRequestStatus;
    await this.joinRequestRepository.update(
      { id: joinRequest.id },
      joinRequest
    );

    await this.client.emit(EVENT_NAME, {
      type: status,
      title: joinRequest.event.title,
      receipient: joinRequest.user.email,
    }).toPromise()

    return {
      status: HttpStatus.OK,
      message: 'Join request updated',
      data: joinRequest,
    };
  }
}
