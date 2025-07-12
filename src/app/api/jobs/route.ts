import { db } from "@/lib/db";
import { withAuth } from "@/lib/siwe-auth";
import { NextResponse } from "next/server";

export const GET = withAuth(async ({ user }) => {
  try {
    const inProgressJobs = await db
      .selectFrom("generatedImages")
      .select([
        "id",
        "userPfpUrl",
        "promptText",
        "createdAt",
        "status",
        "quoteId",
        "transactionHash",
      ])
      .where("userId", "ilike", user.id)
      .where((eb) =>
        eb.or([
          eb("status", "=", "paid"),
          eb("status", "=", "queued"),
          eb("status", "=", "generating"),
        ])
      )
      .orderBy("createdAt", "desc")
      .execute();

    return NextResponse.json({ jobs: inProgressJobs });
  } catch (error) {
    console.error(`Error fetching in-progress jobs for userId ${user}:`, error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
