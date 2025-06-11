"use client";

import { truncateAddress } from "../lib/utils";
import { themes, type Theme } from "./ThemeSelector";
import type { GeneratedImageStatus } from "@/types/db";
import Countdown from "react-countdown";

interface InProgressJob {
  id: string;
  promptText: string | null;
  createdAt: string;
  status: GeneratedImageStatus;
  quoteId: string;
  transactionHash: string | null;
}

interface JobsSectionProps {
  jobs: InProgressJob[];
  userProfileImage?: string;
  uploadedImage?: string | null;
}

export function JobsSection({
  jobs,
  userProfileImage,
  uploadedImage,
}: JobsSectionProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-10 pt-6 border-t">
      <h2 className="text-2xl font-semibold text-center mb-6">In Progress</h2>
      <div className="space-y-4">
        {jobs.map((job) => {
          // Find if the prompt matches any theme
          const matchingTheme = themes.find((theme) =>
            job.promptText?.includes(theme.prompt)
          );

          return (
            <div key={job.id} className="border rounded-md p-4">
              <div className="flex gap-4">
                {/* Input Image Preview */}
                <div className="w-24 h-24 flex-shrink-0">
                  <img
                    src={
                      userProfileImage || uploadedImage || "/placeholder.png"
                    }
                    alt="Input"
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>

                {/* Job Details */}
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {matchingTheme ? matchingTheme.name : "Custom Prompt"}
                    </p>
                    <div className="flex items-center gap-2">
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
                              (elapsedTotal % (1000 * 60 * 60)) / (1000 * 60)
                            );
                            const elapsedSeconds = Math.floor(
                              (elapsedTotal % (1000 * 60)) / 1000
                            );

                            if (elapsedHours > 0) {
                              return `${elapsedHours}h ${elapsedMinutes}m ${elapsedSeconds}s ago`;
                            } else if (elapsedMinutes > 0) {
                              return `${elapsedMinutes}m ${elapsedSeconds}s ago`;
                            } else {
                              return `${elapsedSeconds}s ago`;
                            }
                          }}
                        />
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
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
                  </div>

                  {/* Show full prompt if custom, otherwise just theme name */}
                  {!matchingTheme && job.promptText && (
                    <p className="text-sm text-gray-600 mb-2">
                      {job.promptText}
                    </p>
                  )}

                  {job.transactionHash && (
                    <p className="text-xs text-gray-500">
                      Tx:{" "}
                      <a
                        href={`https://basescan.org/tx/${job.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {truncateAddress(job.transactionHash)}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
