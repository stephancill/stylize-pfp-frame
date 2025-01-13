import { Generated } from "kysely";

export type UserRow = {
  id: Generated<string>;
  fid: number;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  notificationUrl: string | null;
  notificationToken: string | null;
};

export interface UserSessionRow {
  id: string;
  userId: string;
  expiresAt: Date;
}

export type Tables = {
  users: UserRow;
  userSession: UserSessionRow;
};
