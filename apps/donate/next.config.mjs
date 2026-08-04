/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Overridable for sandboxed environments where .next cleanup is restricted.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // pdfkit reads its font-metric files (Helvetica.afm and friends) from a path
  // relative to its own __dirname. Bundling it rewrites __dirname to the build
  // chunk, so every receipt died with
  //   ENOENT ... /node_modules/pdfkit/js/data/Helvetica.afm
  // Leaving it external means it loads from node_modules with __dirname intact.
  // Do not remove this without downloading a receipt from a deployed build.
  serverExternalPackages: ['pdfkit'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Remove noindex at public launch. Until then this service must not be crawled.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        // API responses carry donor data fragments — never cache.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
