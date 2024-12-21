import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { JoinRequest } from './join-request.entity';
import { Event } from './event.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column('text')
  password!: string;

  @OneToMany(() => Event, (event) => event.creator)
  createdEvents!: Event[];

  @OneToMany(() => JoinRequest, (joinRequest) => joinRequest.user)
  joinRequests!: JoinRequest[];
}
