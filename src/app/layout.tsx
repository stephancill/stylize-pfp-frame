import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "./providers";
import { FRAME_METADATA } from "../lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frame",
    description: "This is an example frame.",
    other: {
      "fc:frame": JSON.stringify(FRAME_METADATA),
    },
    openGraph: {
      images: [
        {
          url: `${process.env.APP_URL}/og.png`,
        },
      ],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
