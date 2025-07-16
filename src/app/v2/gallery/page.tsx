"use client";

import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { JobsSection } from "@/components/JobsSection";
import { CreationsGallery } from "@/components/CreationsGallery";
import { UserThemes } from "@/components/UserThemes";
import { fetchAuth } from "@/lib/fetch-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GeneratedImageStatus } from "@/types/db";

interface CompletedImage {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
  userPfpUrl: string | null;
}

interface InProgressJob {
  id: string;
  promptText: string | null;
  createdAt: string;
  status: GeneratedImageStatus;
  quoteId: string;
  transactionHash: string | null;
  userPfpUrl: string | null;
}

export default function GalleryPage() {
  const { isAuthenticated, userId } = useAuth();

  const {
    data: inProgressJobs = [],
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<InProgressJob[]>({
    queryKey: ["inProgressJobs", userId],
    queryFn: async () => {
      const response = await fetchAuth(`/api/jobs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch jobs");
      }
      const data = await response.json();
      return data.jobs || [];
    },
    enabled: isAuthenticated && !!userId,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Gallery
      </h1>

      {/* Desktop Layout - 2 Columns */}
      <div className="hidden lg:grid grid-cols-2 gap-8">
        {/* Left Column - Pending Jobs & Creations */}
        <div className="space-y-8">
          {/* In Progress Jobs Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              In Progress
            </h2>
            <JobsSection jobs={inProgressJobs} />
          </div>

          {/* Completed Creations Gallery */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              My Creations
            </h2>
            <CreationsGallery />
          </div>
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
            {/* In Progress Jobs Section */}
            <div>
              <JobsSection jobs={inProgressJobs} />
            </div>

            {/* Completed Creations Gallery */}
            <div>
              <CreationsGallery />
            </div>
          </TabsContent>

          <TabsContent value="themes">
            <UserThemes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
