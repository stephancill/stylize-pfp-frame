import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useInfiniteImages } from "@/hooks/useInfiniteImages";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CompletedImage, SimpleCreationItem } from "./SimpleCreationItem";

interface CreationsGalleryProps {
  onImageClick: (image: CompletedImage) => void;
}

// Skeleton component for creation items
function CreationItemSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Skeleton className="aspect-square w-full" />
    </div>
  );
}

export function CreationsGallery({ onImageClick }: CreationsGalleryProps) {
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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array(6)
          .fill(null)
          .map((_, i) => (
            <CreationItemSkeleton key={i} />
          ))}
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
        You haven't generated any images yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {allImages.map((image, index) => {
        const isLastImage = index === allImages.length - 1;

        return (
          <div
            key={image.id || image.quoteId}
            ref={isLastImage ? lastImageRef : undefined}
          >
            <SimpleCreationItem
              image={image}
              onClick={() => onImageClick(image)}
            />
          </div>
        );
      })}

      {isFetchingNextPage && (
        <div className="col-span-full flex justify-center items-center py-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {Array(3)
              .fill(null)
              .map((_, i) => (
                <CreationItemSkeleton key={i} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
