import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteImages } from "@/hooks/useInfiniteImages";
import { usePendingImages } from "@/hooks/usePendingImages";
import { useAuth } from "@/providers/AuthProvider";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CompletedImage, SwitchableImage } from "./SwitchableImage";
import { Clock, Eye } from "lucide-react";

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

// Pending image fallback component
function PendingImageFallback({ job }: { job: any }) {
  return (
    <div className="aspect-square w-full flex items-center justify-center border rounded-lg">
      <Clock className="h-12 w-12 text-gray-400" />
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

  const { data: pendingJobs = [] } = usePendingImages();

  // Flatten all pages into a single array of images
  const allImages = useMemo(
    () => data?.pages.flatMap((page) => page.images) ?? [],
    [data]
  );

  // Convert pending jobs to CompletedImage format
  const pendingImages = useMemo(() => {
    return pendingJobs.map(
      (job) =>
        ({
          id: job.id,
          imageDataUrl: null, // No output image yet
          promptText: job.promptText,
          createdAt: job.createdAt,
          quoteId: job.quoteId,
          userPfpUrl: job.userPfpUrl,
          referenceCount: 0,
        } as CompletedImage)
    );
  }, [pendingJobs]);

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
      <p className="text-red-500 py-4">
        Error loading images:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (allImages.length === 0 && pendingJobs.length === 0) {
    return (
      <p className="text-gray-500 py-4">
        You haven't generated any images yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {/* Render pending jobs first */}
      {pendingImages.map((image, index) => {
        const job = pendingJobs[index];
        return (
          <div key={image.id} onClick={() => onImageClick(image)}>
            <SwitchableImage
              image={image}
              fallbackComponent={<PendingImageFallback job={job} />}
            />
          </div>
        );
      })}

      {/* Render completed images */}
      {allImages.map((image, index) => {
        const isLastImage = index === allImages.length - 1;

        return (
          <div
            key={image.id || image.quoteId}
            ref={isLastImage ? lastImageRef : undefined}
            onClick={() => onImageClick(image)}
          >
            <SwitchableImage
              image={image}
              hoverOverlay={
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              }
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
