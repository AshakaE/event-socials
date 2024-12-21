import { JoinRequestStatus } from '../entities/join-request.entity';

export const EVENT_NAME = 'social-events-email';
export const QUEUE_NAME = 'email_queue';

export interface MailData {
  type: JoinRequestStatus;
  title: string;
  receipient: string;
  requesterName?: string;
  joinRequestId?: number;
  accept?: string;
  deny?: string;
}

export interface ReturnData<T> {
  status: number;
  message: string;
  data?: T | Partial<T> | T[] | Partial<T[]>;
  access_token?: string
}

export interface JoinActionData {
  sender: string;
  receiver: string;
  status: string;
  joinId: number;
}