/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse pulls in pdf.js internals that break when webpack bundles them
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle native modules on client
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
}

export default nextConfig
