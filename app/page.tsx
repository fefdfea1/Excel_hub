import Container from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import TemplateCard from '@/components/TemplateCard';
import { getTemplates } from '@/lib/templates';
import { site } from '@/site.config';

import styles from './page.module.css';

/**
 * 검색 엔진에 목록의 생김새를 알려줍니다.
 * 사이트가 무엇인지(WebSite), 이 페이지가 템플릿 목록이라는 것(CollectionPage),
 * 그 안에 어떤 템플릿이 몇 번째로 있는지(ItemList) 세 가지입니다.
 */
function collectionSchema(templates: ReturnType<typeof getTemplates>) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        url: `${site.url}/`,
        name: site.name,
        description: site.description,
        inLanguage: 'ko-KR',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${site.url}/#webpage`,
        url: `${site.url}/`,
        name: site.titleDefault,
        description: site.description,
        isPartOf: { '@id': `${site.url}/#website` },
        inLanguage: 'ko-KR',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: templates.length,
          itemListElement: templates.map((template, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${site.url}/t/${template.slug}/`,
            name: template.title,
          })),
        },
      },
    ],
  };
}

export default function HomePage() {
  const templates = getTemplates();

  return (
    <Container>
      <JsonLd data={collectionSchema(templates)} />

      <section className={styles.intro}>
        <h1 className={styles.headline}>{site.headline}</h1>
        <p className={styles.tagline}>{site.tagline}</p>
      </section>

      {templates.length === 0 ? (
        <p className={styles.empty}>
          아직 등록된 템플릿이 없습니다. <code>public/templates</code> 아래에 폴더를 하나 만들면 여기에
          나타납니다.
        </p>
      ) : (
        <section className={styles.grid}>
          {templates.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </section>
      )}
    </Container>
  );
}
