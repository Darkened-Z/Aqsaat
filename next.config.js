/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()) },
  async headers() {
    return [
      {
        // Serve the device-owner APK with the right type and no caching surprises,
        // so Android managed-provisioning downloads it directly (no GitHub redirect).
        source: '/device-lock.apk',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
