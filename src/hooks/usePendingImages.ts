import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuth } from "@/lib/fetch-auth";
import { useAuth } from "@/providers/AuthProvider";
import type { GeneratedImageStatus } from "@/types/db";
import { useRef, useEffect } from "react";

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
  const queryClient = useQueryClient();
  const previousCountRef = useRef<number | null>(null);

  const query = useQuery<InProgressJob[]>({
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

  // Track changes in pending image count and invalidate creations gallery cache when count decreases
  useEffect(() => {
    if (query.data && userId) {
      const currentCount = query.data.length;

      // If we have a previous count and the current count is less, invalidate the infinite images cache
      if (
        previousCountRef.current !== null &&
        currentCount < previousCountRef.current
      ) {
        queryClient.invalidateQueries({
          queryKey: ["infiniteImages", userId],
        });
      }

      // Update the previous count reference
      previousCountRef.current = currentCount;
    }
  }, [query.data, userId, queryClient]);

  return query;
}
