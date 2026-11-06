import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // 채널 로고 업로드(최대 2MB) + 폼 필드 여유분
    serverActions: { bodySizeLimit: "3mb" },
  },
  // fs 백엔드는 경로를 런타임에 조립해(turbopackIgnore) 자동 추적에 안 잡힌다.
  // DATA_STORE 가 비어 있는 배포에서도 커밋된 데이터를 읽도록 서버 번들에 직접 넣는다.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*", "./content/**/*"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
