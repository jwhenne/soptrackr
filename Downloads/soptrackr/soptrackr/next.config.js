/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include SQL migration files in the API function bundle so /api/admin/migrate
  // can read them at runtime on Vercel.
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/migrate': ['./db/migrations/*.sql'],
    },
  },
};

module.exports = nextConfig;
