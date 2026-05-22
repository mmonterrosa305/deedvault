/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/foreclosures/michigan',
        destination: '/api/michigan-foreclosures',
      },
    ]
  },
}
module.exports = nextConfig
