import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchAuth } from "@/lib/fetch-auth";
import type { CastsResponse } from "@/types/user";

export function useInfiniteCasts() {
  return useInfiniteQuery<CastsResponse>({
    queryKey: ["infiniteCasts"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const url = pageParam
        ? `/api/recents?cursor=${pageParam}&limit=25`
        : `/api/recents?limit=25`;

      const response = await fetchAuth(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch casts");
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.next?.cursor || undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
