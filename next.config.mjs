/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle native modules on client
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
}

export default nextConfig
