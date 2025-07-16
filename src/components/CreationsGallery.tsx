import { useAuth } from "@/hooks/useAuth";
import { useInfiniteImages } from "@/hooks/useInfiniteImages";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CreationItem } from "./CreationItem";

export function CreationsGallery() {
  const { userId } = useAuth();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteImages(userId);

  // Flatten all pages into a single array of images
  const allImages = useMemo(
    () => data?.pages.flatMap((page) => page.images) ?? [],
    [data]
  );

  // Intersection observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastImageRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-500 py-4">
        Error loading images:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (allImages.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        You haven't generated any characters yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {allImages.map((image, index) => {
        const isLastImage = index === allImages.length - 1;

        return (
          <div
            key={image.id || image.quoteId}
            ref={isLastImage ? lastImageRef : undefined}
          >
            <CreationItem image={image} />
          </div>
        );
      })}

      {isFetchingNextPage && (
        <div className="col-span-full flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      )}
    </div>
  );
}
