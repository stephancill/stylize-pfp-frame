"use client";

import { useEffect, useState } from "react";
import { SharedImageCard } from "@/components/SharedImageCard";

interface SharedImageData {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
  userPfpUrl: string | null;
}

interface GenerationPageClientProps {
  id: string;
}

export function GenerationPageClient({ id }: GenerationPageClientProps) {
  const [imageData, setImageData] = useState<SharedImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImageData = async () => {
      try {
        const response = await fetch(`/api/images/${id}?format=json`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Image not found");
          } else if (response.status === 400) {
            setError("Image not ready yet");
          } else {
            setError("Failed to load image");
          }
          return;
        }
        const data = await response.json();
        setImageData(data);
      } catch (err) {
        console.error("Error fetching image data:", err);
        setError("Failed to load image");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchImageData();
    }
  }, [id]);

  const handleDownload = (imageDataUrl: string, imageId: string) => {
    try {
      const link = document.createElement("a");
      link.href = imageDataUrl;
      link.download = `stylized-character-${imageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading shared image...</p>
        </div>
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Unable to load the shared image"}
          </p>
          <a 
            href="/" 
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Go to Stylize Me
          </a>
        </div>
      </div>
    );
  }

  return <SharedImageCard image={imageData} onDownload={handleDownload} />;
}