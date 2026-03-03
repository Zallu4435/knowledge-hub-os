/** @type {import('next').NextConfig} */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@knowledge-hub-os/event-schemas'], // Allows importing monorepo libs
}
module.exports = nextConfig
