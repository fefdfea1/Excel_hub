/** @type {import('next').NextConfig} */
const nextConfig = {
  // 개발 서버와 빌드가 서로 다른 폴더를 쓰게 합니다.
  // 같은 폴더를 쓰면 `npm run dev` 가 돌아가는 중에 `npm run build` 를 실행했을 때
  // 캐시가 섞여 개발 서버가 "Cannot find module './356.js'" 로 죽습니다.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',

  // 정적 사이트로 내보냅니다. out/ 폴더를 어떤 웹 서버에든 그대로 올리면 됩니다.
  output: 'export',
  trailingSlash: true,
  images: {
    // 정적 내보내기에서는 이미지 최적화 서버가 없으므로 원본을 그대로 씁니다.
    unoptimized: true,
  },
};

export default nextConfig;
