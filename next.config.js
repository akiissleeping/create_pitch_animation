/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist optionally requires 'canvas' which is not available in browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
