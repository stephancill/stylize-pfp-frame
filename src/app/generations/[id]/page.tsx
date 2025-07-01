"use client";

import { ShareCard } from "@/components/ShareCard";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

interface SharedImageData {
  id: string;
  imageDataUrl: string;
  promptText: string | null;
  userPfpUrl: string | null;
  createdAt: string;
  quoteId: string;
}

export default function SharePage() {
  const params = useParams();
  const id = params.id as string;

  const { data: imageData, isLoading, error } = useQuery<SharedImageData>({
    queryKey: ["sharedImage", id],
    queryFn: async () => {
      const response = await fetch(`/api/images/${id}?format=json`);
      if (!response.ok) {
        throw new Error("Failed to fetch image data");
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading shared creation...</p>
        </div>
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Image Not Found</h1>
          <p className="text-muted-foreground">
            The shared image could not be found or is no longer available.
          </p>
          <a 
            href="/" 
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
      <ShareCard
        id={imageData.id}
        imageDataUrl={imageData.imageDataUrl}
        promptText={imageData.promptText}
        userPfpUrl={imageData.userPfpUrl}
        createdAt={imageData.createdAt}
      />
    </div>
  );
}


