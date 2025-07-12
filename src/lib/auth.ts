import { Lucia } from "lucia";
import { NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE_NAME } from "./constants";
import { getAuthAdapter } from "./db";

const adapter = getAuthAdapter();

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // set to `true` when using HTTPS
      secure: process.env.NODE_ENV === "production",
    },
    name: AUTH_SESSION_COOKIE_NAME,
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      createdAt: attributes.created_at,
      updatedAt: attributes.updated_at,
      fid: attributes.fid,
    };
  },
});

type NextContext = { params: Promise<{}> };

export type UserRouteHandler<
  T extends Record<string, object | string> = NextContext
> = (
  req: NextRequest,
  user: NonNullable<Awaited<ReturnType<typeof lucia.validateSession>>["user"]>,
  context: T
) => Promise<Response>;

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      id: string;
      fid: number;
      created_at: Date;
      updated_at: Date;
    };
  }
}
