import { Generated } from "kysely";

export type UserRow = {
  id: Generated<string>;
  fid: number | null;
  walletAddress: string | null;
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

export type GeneratedImageStatus =
  | "pending_payment"
  | "paid"
  | "queued"
  | "generating"
  | "completed"
  | "error"
  | "payment_error";

export type GeneratedImageRow = {
  id: Generated<string>; // UUID
  userId: string; // Changed from fid to userId - can be FID or wallet address
  quoteId: string;
  status: GeneratedImageStatus;
  transactionHash: string | null;
  imageDataUrl: string | null;
  promptText: string | null;
  userPfpUrl: string | null;
  createdAt: Generated<Date>;
};

export type Tables = {
  users: UserRow;
  userSession: UserSessionRow;
  generatedImages: GeneratedImageRow;
};
