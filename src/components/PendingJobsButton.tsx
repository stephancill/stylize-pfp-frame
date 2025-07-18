"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePendingImages } from "@/hooks/usePendingImages";
import { Clock, Loader2 } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import themes from "@/lib/themes";
import Countdown from "react-countdown";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function PendingJobsButton() {
  const { data: jobs = [], isLoading, refetch } = usePendingImages();

  // Don't render if no jobs or loading
  if (isLoading || jobs.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 relative"
          onClick={() => refetch()}
        >
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
              {jobs.length}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <h4 className="font-medium">Pending Creations</h4>
            <span className="text-xs text-gray-500">({jobs.length})</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {jobs.map((job) => {
              // Find if the prompt matches any theme
              const matchingTheme = themes.find((theme) =>
                job.promptText?.includes(theme.prompt)
              );

              return (
                <Card key={job.id} className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {/* Input Image Preview */}
                      <div className="w-16 h-16 flex-shrink-0">
                        <img
                          src={job.userPfpUrl || "/placeholder.png"}
                          alt="Input"
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>

                      {/* Job Details */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <CardTitle className="text-sm font-medium truncate">
                            {matchingTheme
                              ? matchingTheme.name
                              : "Custom Prompt"}
                          </CardTitle>
                          <span
                            className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                              job.status === "generating"
                                ? "bg-blue-100 text-blue-700"
                                : job.status === "queued"
                                ? "bg-yellow-100 text-yellow-700"
                                : job.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {job.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Show full prompt if custom, otherwise just theme name */}
                        {!matchingTheme && job.promptText && (
                          <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                            {job.promptText}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            <Countdown
                              date={new Date(job.createdAt).getTime()}
                              overtime={true}
                              renderer={({ total }) => {
                                // Since creation time is always in the past, total will be negative
                                // We want to show the elapsed time since creation
                                const elapsedTotal = Math.abs(total);
                                const elapsedHours = Math.floor(
                                  elapsedTotal / (1000 * 60 * 60)
                                );
                                const elapsedMinutes = Math.floor(
                                  (elapsedTotal % (1000 * 60 * 60)) /
                                    (1000 * 60)
                                );
                                const elapsedSeconds = Math.floor(
                                  (elapsedTotal % (1000 * 60)) / 1000
                                );

                                if (elapsedHours > 0) {
                                  return `${elapsedHours}h ${elapsedMinutes}m ago`;
                                } else if (elapsedMinutes > 0) {
                                  return `${elapsedMinutes}m ${elapsedSeconds}s ago`;
                                } else {
                                  return `${elapsedSeconds}s ago`;
                                }
                              }}
                            />
                          </span>

                          {job.transactionHash && (
                            <a
                              href={`https://basescan.org/tx/${job.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {truncateAddress(job.transactionHash)}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
