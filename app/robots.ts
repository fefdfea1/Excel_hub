import type { MetadataRoute } from 'next';

import { site } from '@/site.config';

/**
 * robots.txt. 빌드할 때 /robots.txt 파일로 만들어집니다.
 * 전부 공개된 사이트라 모든 검색 로봇을 들여보내고, 사이트맵 위치만 알려줍니다.
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
