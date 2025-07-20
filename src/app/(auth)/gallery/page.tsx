"use client";

import { useAuth } from "@/providers/AuthProvider";
import { JobsSection } from "@/components/JobsSection";
import { CreationsGallery } from "@/components/CreationsGallery";
import { UserThemes } from "@/components/UserThemes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ImageDetailModal } from "@/components/ImageDetailModal";
import type { CompletedImage } from "@/components/CreationItem";
import { fetchAuth } from "@/lib/fetch-auth";

export default function GalleryPage() {
  const searchParams = useSearchParams();
  const imageId = searchParams.get("imageId");
  const [selectedImage, setSelectedImage] = useState<CompletedImage | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  // Fetch specific image when imageId is present
  const {
    data: fetchedImage,
    isLoading: isLoadingImage,
    error: imageError,
  } = useQuery({
    queryKey: ["image", imageId],
    queryFn: async () => {
      if (!imageId) return null;
      const res = await fetch(`/api/images/${imageId}?json=true`);
      if (!res.ok) throw new Error("Failed to fetch image");
      const data = await res.json();
      return data as CompletedImage;
    },
    enabled: !!imageId,
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetchAuth(`/api/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete image");
      }

      return response;
    },
    onSuccess: (_, deletedImageId) => {
      // Invalidate and refetch the images list to update the UI
      queryClient.invalidateQueries({ queryKey: ["infiniteImages", userId] });

      // If the deleted image was the selected image, clear the selection
      if (selectedImage?.id === deletedImageId) {
        setSelectedImage(null);
      }
    },
  });

  // Handle image deletion
  const handleDelete = async (imageId: string) => {
    await deleteImageMutation.mutateAsync(imageId);
  };

  // Set selected image when fetched
  const handleImageClick = (image: CompletedImage) => {
    setSelectedImage(image);
    setShowDetailModal(true);
  };

  useEffect(() => {
    if (fetchedImage) {
      setSelectedImage(fetchedImage);
    }
  }, [fetchedImage]);

  useEffect(() => {
    if (imageId) {
      setShowDetailModal(true);
    }
  }, [imageId]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Gallery
      </h1>

      {/* Desktop Layout - 2 Columns */}
      <div className="hidden lg:grid grid-cols-2 gap-8">
        {/* Completed Creations Gallery */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            My Creations
          </h2>
          <CreationsGallery onImageClick={handleImageClick} />
        </div>

        {/* Right Column - User Themes */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            My Themes
          </h2>
          <UserThemes />
        </div>
      </div>

      {/* Mobile/Tablet Layout - Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-8">
            <CreationsGallery onImageClick={handleImageClick} />
          </TabsContent>

          <TabsContent value="themes">
            <UserThemes />
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Detail Modal */}
      <ImageDetailModal
        image={selectedImage}
        isLoading={isLoadingImage}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onDelete={handleDelete}
      />
    </div>
  );
}
