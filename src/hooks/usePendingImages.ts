import { useQuery } from "@tanstack/react-query";
import { fetchAuth } from "@/lib/fetch-auth";
import { useAuth } from "@/hooks/useAuth";
import type { GeneratedImageStatus } from "@/types/db";

interface InProgressJob {
  id: string;
  promptText: string | null;
  createdAt: string;
  status: GeneratedImageStatus;
  quoteId: string;
  transactionHash: string | null;
  userPfpUrl: string | null;
}

export function usePendingImages() {
  const { userId } = useAuth();

  return useQuery<InProgressJob[]>({
    queryKey: ["inProgressJobs", userId],
    queryFn: async () => {
      const response = await fetchAuth(`/api/jobs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch jobs");
      }
      const data = await response.json();
      return data.jobs || [];
    },
    enabled: !!userId,
    refetchInterval: 60 * 1000,
  });
}
