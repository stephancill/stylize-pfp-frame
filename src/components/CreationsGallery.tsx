import { CompletedImage, CreationItem } from "./CreationItem";
import { Loader2 } from "lucide-react";

interface CreationsGalleryProps {
  images: CompletedImage[];
  isLoading: boolean;
  error: Error | null;
}

export function CreationsGallery({
  images,
  isLoading,
  error,
}: CreationsGalleryProps) {
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

  if (images.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        You haven't generated any characters yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image) => (
        <CreationItem key={image.id || image.quoteId} image={image} />
      ))}
    </div>
  );
}
