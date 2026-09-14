import type { MetadataRoute } from 'next';

import { getTemplates } from '@/lib/templates';
import { site } from '@/site.config';

/**
 * 사이트맵. 빌드할 때 /sitemap.xml 파일로 만들어집니다.
 * 템플릿 폴더를 넣고 빼면 목록도 알아서 따라오므로 손댈 일이 없습니다.
 *
 * 구글 서치 콘솔·네이버 서치어드바이저에 이 주소(주소 끝에 /sitemap.xml)를
 * 한 번 등록해 두면 새 템플릿이 더 빨리 검색에 잡힙니다.
 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const templates = getTemplates();

  // 목록 페이지의 수정일은 템플릿 중 가장 최근 것으로 둡니다.
  const newest = templates.reduce(
    (latest, template) => (template.updated > latest ? template.updated : latest),
    new Date(0).toISOString(),
  );

  return [
    {
      url: `${site.url}/`,
      lastModified: new Date(templates.length > 0 ? newest : Date.now()),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...templates.map((template) => ({
      url: `${site.url}/t/${template.slug}/`,
      lastModified: new Date(template.updated),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
