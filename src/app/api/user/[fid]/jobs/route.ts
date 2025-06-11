import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  args: { params: Promise<{ fid: string }> }
) {
  const params = await args.params;
  try {
    const userIdString = params.fid;
    if (!userIdString) {
      return NextResponse.json(
        { error: "userId parameter is required." },
        { status: 400 }
      );
    }

    const userId = userIdString;

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
      .where("userId", "=", userId)
      .where((eb) =>
        eb.or([
          eb("status", "=", "pending_payment"),
          eb("status", "=", "paid"),
          eb("status", "=", "queued"),
          eb("status", "=", "generating"),
        ])
      )
      .orderBy("createdAt", "desc")
      .execute();

    return NextResponse.json({ jobs: inProgressJobs });
  } catch (error) {
    console.error(
      `Error fetching in-progress jobs for userId ${params.fid}:`,
      error
    );
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
