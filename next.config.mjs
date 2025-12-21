/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    swcPlugins: process.env.INSTRUMENT_CODE
      ? [['swc-plugin-coverage-instrument', {}]]
      : [],
  },
}

export default nextConfig
