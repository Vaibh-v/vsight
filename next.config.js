/** @type {import('next').NextConfig} */
const path = require("path");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

module.exports = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias || {}), "@": path.resolve(__dirname) };
    return config;
  },
};
