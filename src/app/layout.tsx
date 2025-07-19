import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "./providers";
import { FRAME_METADATA } from "../lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Stylize Me",
    description: "Stylize your profile picture",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#FFFFFF" />
      </head>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
