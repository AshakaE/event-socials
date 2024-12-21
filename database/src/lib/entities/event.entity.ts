import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { JoinRequest } from './join-request.entity';

export enum EventCategory {
  CYBERSECURITY = 'CyberSecurity',
  SOFTWARE_ENGINEERING = 'Software Engineering',
  DEVOPS = 'DevOps',
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column('timestamp')
  date!: Date;

  @Column({
    type: 'enum',
    enum: EventCategory,
  })
  category!: EventCategory;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.createdEvents)
  creator!: User;

  @OneToMany(() => JoinRequest, (joinRequest) => joinRequest.event)
  joinRequests!: JoinRequest[];
}
