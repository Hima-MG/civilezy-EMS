import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Must be an absolute path. process.cwd() resolves to the directory Next.js
    // is launched from (civilezy-ems/), disambiguating from the stray
    // package-lock.json in the parent directory.
    root: process.cwd(),
  },
};

export default nextConfig;
