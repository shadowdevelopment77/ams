import { Session } from "../../../generated/prisma";

export interface CreateSessionDTO {
  id: string;
  user_id: number;
  expires_at: Date;
}

export interface SessionRepository {
  create(data: CreateSessionDTO): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteByUser(userId: number): Promise<void>;
  deleteExpired(): Promise<number>;
}
