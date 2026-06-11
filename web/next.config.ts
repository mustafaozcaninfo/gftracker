import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.galerieslafayette.qa",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
