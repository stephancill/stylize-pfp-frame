import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchAuth } from "@/lib/fetch-auth";
import type { CompletedImage } from "@/components/CreationItem";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ImagesResponse {
  images: CompletedImage[];
  pagination: PaginationInfo;
}

export function useInfiniteImages(userId: string | null) {
  return useInfiniteQuery<ImagesResponse>({
    queryKey: ["infiniteImages", userId],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await fetchAuth(`/api/images?page=${pageParam}&limit=5`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch images");
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
