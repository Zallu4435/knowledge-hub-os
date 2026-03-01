/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@knowledge-hub-os/event-schemas'], // Allows importing monorepo libs
}
module.exports = nextConfig
