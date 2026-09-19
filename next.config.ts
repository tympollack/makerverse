import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
  },
  transpilePackages: [
    "@digitalcanopy/ui",
    "@digitalcanopy/supabase",
    "react-native-web",
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
      "react-native": "react-native-web",
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
  },
};

export default nextConfig;
