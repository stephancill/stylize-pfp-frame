import { Lucia } from "lucia";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE_NAME } from "./constants";
import { getAuthAdapter } from "./db";
import { AuthError } from "./errors";

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

export function withAuth<
  T extends Record<string, object | string> = NextContext
>(handler: UserRouteHandler<T>, options: {} = {}) {
  return async (req: NextRequest, context: T): Promise<Response> => {
    try {
      const cookieHeader = req.headers.get("Cookie");
      const authorizationHeader = req.headers.get("Authorization");
      const token =
        lucia.readBearerToken(authorizationHeader ?? "") ||
        lucia.readSessionCookie(cookieHeader ?? "");

      const result = await lucia.validateSession(token ?? "");
      if (!result.session) {
        throw new AuthError("Invalid session");
      }

      return handler(req, result.user, context);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      console.error("Unexpected error in withAuth:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

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
