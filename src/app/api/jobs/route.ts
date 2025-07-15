import { db } from "@/lib/db";
import { withAuth } from "@/lib/siwe-auth";
import { NextResponse } from "next/server";
import { getInputImageUrl } from "@/lib/image-utils";

export const GET = withAuth(async ({ user }) => {
  try {
    const inProgressJobs = await db
      .selectFrom("generatedImages")
      .select([
        "id",
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

    // Transform the jobs to include URLs instead of raw data
    const jobsWithUrls = inProgressJobs.map(job => ({
      ...job,
      userPfpUrl: getInputImageUrl(job.id),
    }));

    return NextResponse.json({ jobs: jobsWithUrls });
  } catch (error) {
    console.error(`Error fetching in-progress jobs for userId ${user}:`, error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
