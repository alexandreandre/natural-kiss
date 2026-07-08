import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// i18n sans routing : la locale vient d'un cookie (cf. src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Autorise le loopback en dev (tests E2E Playwright via 127.0.0.1).
  allowedDevOrigins: ["127.0.0.1"],
};

export default withNextIntl(nextConfig);
