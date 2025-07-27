"use client";

import { useInfiniteCasts } from "@/hooks/useInfiniteCasts";
import CastItem, { CastItemSkeleton } from "@/components/CastItem";
import { useCallback, useEffect, useMemo, useRef } from "react";

export default function RecentsPage() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCasts();

  // Flatten all pages into a single array of casts
  const allCasts = useMemo(
    () => data?.pages.flatMap((page) => page.casts) ?? [],
    [data]
  );

  // Intersection observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCastRef = useCallback(
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
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Recent Creations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            See what others have been creating
          </p>
        </div>
        {Array(3)
          .fill(null)
          .map((_, i) => (
            <CastItemSkeleton key={i} />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Recent Creations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            See what others have been creating
          </p>
        </div>
        <p className="text-red-500 py-4">
          Error loading casts:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  if (allCasts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Recent Creations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            See what others have been creating
          </p>
        </div>
        <p className="text-gray-500 py-4">No recent creations found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Recent Creations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          See what others have been creating
        </p>
      </div>

      <div className="space-y-6">
        {allCasts.map((cast, index) => {
          const isLastCast = index === allCasts.length - 1;

          return (
            <div key={cast.hash} ref={isLastCast ? lastCastRef : undefined}>
              <CastItem cast={cast} />
            </div>
          );
        })}

        {isFetchingNextPage && (
          <div className="space-y-6">
            {Array(2)
              .fill(null)
              .map((_, i) => (
                <CastItemSkeleton key={i} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
