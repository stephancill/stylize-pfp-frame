import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    const redirects = [
      process.env.MAINTENANCE_MODE === "1"
        ? {
            source: "/((?!maintenance))",
            destination: "/maintenance",
            permanent: false,
          }
        : null,
    ];
    return redirects.filter(Boolean) as any[];
  },
};

export default nextConfig;
