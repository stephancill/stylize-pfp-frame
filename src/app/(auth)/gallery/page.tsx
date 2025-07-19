"use client";

import { useAuth } from "@/providers/AuthProvider";
import { JobsSection } from "@/components/JobsSection";
import { CreationsGallery } from "@/components/CreationsGallery";
import { UserThemes } from "@/components/UserThemes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GalleryPage() {

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
          <CreationsGallery />
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
            <CreationsGallery />
          </TabsContent>

          <TabsContent value="themes">
            <UserThemes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
