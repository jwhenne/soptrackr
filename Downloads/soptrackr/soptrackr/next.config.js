/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Disable webpack's persistent filesystem cache in dev. On Windows with
    // limited free RAM the gzip serializer can throw
    // ERR_MEMORY_ALLOCATION_FAILED and kill `next dev`. The cache only helps
    // restart speed; dev compile times are barely affected.
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

module.exports = nextConfig;
