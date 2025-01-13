import { redisCache } from "@/lib/redis";
import { CHALLENGE_DURATION_SECONDS } from "@/lib/constants";

export async function POST(req: Request) {
  const { challengeId } = await req.json();

  if (!challengeId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const challenge = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32))
  ).toString("hex");

  // Set the challenge with an expiration
  await redisCache.setex(
    `challenge:${challengeId}`,
    CHALLENGE_DURATION_SECONDS,
    challenge
  );

  return Response.json({
    challenge,
  });
}
