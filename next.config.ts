import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

/**
 * `pnpm analyze` writes webpack-bundle-analyzer reports to `.next/analyze/`.
 * The plugin is webpack-only, so that script builds with `--webpack`; for the
 * default Turbopack build use `next experimental-analyze` instead.
 */
const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
	openAnalyzer: false,
});

const nextConfig: NextConfig = {
	reactStrictMode: true,
};

export default withBundleAnalyzer(nextConfig);
