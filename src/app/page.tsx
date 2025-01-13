"use client";

import { useSession } from "../providers/SessionProvider";

export default function Home() {
  const { user, isLoading } = useSession();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>User</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
