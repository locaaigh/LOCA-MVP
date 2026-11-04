/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // NUEVO-v2 fix (carga de sharp en Vercel): tratar `sharp` como paquete externo del
  // servidor para que Next lo incluya (con su binario nativo) en la función serverless
  // en vez de intentar bundlearlo. Next 14 → experimental.serverComponentsExternalPackages.
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
};

export default nextConfig;
