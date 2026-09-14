import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Container from '@/components/Container';
import JsonLd from '@/components/JsonLd';
import SheetViewer from '@/components/SheetViewer';
import { getNeighbours, getTemplate, getTemplates, type Template } from '@/lib/templates';
import { site } from '@/site.config';

import styles from './page.module.css';

type Props = { params: Promise<{ slug: string }> };

/** public/templates 안의 폴더마다 페이지를 하나씩 미리 만들어 둡니다. */
export function generateStaticParams() {
  return getTemplates().map((template) => ({ slug: template.slug }));
}

/** 검색 결과와 공유 카드에 쓰는 제목. 제목만 보고도 무엇을 받는 곳인지 알 수 있게 씁니다. */
function searchTitle(template: Template) {
  return `${template.title} 엑셀 양식 무료 다운로드`;
}

function searchDescription(template: Template) {
  return template.desc || `${template.title} 엑셀 템플릿입니다. 내려받아 바로 쓰실 수 있습니다.`;
}

/** 상대 경로를 공유·검색에 쓸 수 있는 전체 주소로 바꿉니다. */
function absolute(pathname: string) {
  return `${site.url}${pathname}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) return {};

  const pathname = `/t/${template.slug}/`;
  const title = searchTitle(template);
  const description = searchDescription(template);
  // 템플릿 표지가 있으면 그것을, 없으면 사이트 공용 카드 이미지를 씁니다.
  const image = template.cover
    ? { url: template.cover, alt: `${template.title} 미리보기`, ...(template.coverSize ?? {}) }
    : { url: site.ogImage, width: 1200, height: 630, alt: site.titleDefault };

  return {
    // 사이트 이름을 뒤에 또 붙이지 않고 이 제목을 그대로 씁니다.
    title: { absolute: title },
    description,
    keywords: [...template.tags, `${template.title} 엑셀`, '무료 엑셀 양식'],
    alternates: { canonical: pathname },
    openGraph: {
      type: 'article',
      url: pathname,
      siteName: site.name,
      title,
      description,
      locale: 'ko_KR',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}

/**
 * 이 페이지가 "무료로 받을 수 있는 엑셀 서식"이라는 것을 검색 엔진에 알려줍니다.
 * 목록 → 템플릿으로 이어지는 위치(BreadcrumbList)도 같이 넘겨서,
 * 검색 결과에 주소 대신 '엑셀 템플릿 > 재고관리' 같은 경로가 나오게 합니다.
 */
function templateSchema(template: Template) {
  const pageUrl = absolute(`/t/${template.slug}/`);
  const download = template.file ? absolute(template.file) : null;
  const format = template.fileExt === '.xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: site.name, item: `${site.url}/` },
          { '@type': 'ListItem', position: 2, name: template.title, item: pageUrl },
        ],
      },
      {
        '@type': 'CreativeWork',
        '@id': `${pageUrl}#template`,
        name: searchTitle(template),
        headline: template.title,
        description: searchDescription(template),
        url: pageUrl,
        inLanguage: 'ko-KR',
        dateModified: template.updated,
        isAccessibleForFree: true,
        ...(template.cover ? { image: absolute(template.cover) } : {}),
        ...(template.tags.length > 0 ? { keywords: template.tags.join(', ') } : {}),
        ...(format ? { encodingFormat: format } : {}),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'KRW',
          availability: 'https://schema.org/InStock',
        },
        ...(download
          ? {
              associatedMedia: {
                '@type': 'DataDownload',
                contentUrl: download,
                ...(format ? { encodingFormat: format } : {}),
              },
            }
          : {}),
        isPartOf: { '@id': `${site.url}/#website` },
      },
    ],
  };
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  const { prev, next } = getNeighbours(slug);

  return (
    <Container>
      <JsonLd data={templateSchema(template)} />

      <article className={styles.detail}>
        <Link href="/" className={styles.back}>
          ← 목록으로
        </Link>

        <header className={styles.head}>
          <div className={styles.headText}>
            <h1 className={styles.title}>{template.title}</h1>
            {template.desc && <p className={styles.desc}>{template.desc}</p>}
            {template.tags.length > 0 && (
              <div className={styles.tags}>
                {template.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {template.file && template.downloadName && (
            <a className={styles.download} href={template.file} download={template.downloadName}>
              <span>다운로드</span>
              <span className={styles.ext}>{template.fileExt}</span>
            </a>
          )}
        </header>

        <SheetViewer previews={template.previews} />

        {template.steps.length > 0 && (
          <section className={styles.steps}>
            <h2 className={styles.stepsHeading}>사용 순서</h2>
            <p className={styles.stepsHint}>
              파란색 글씨 칸만 입력하세요. 검은색은 자동 계산이라 건드리지 않아도 됩니다.
            </p>
            <ol className={styles.stepList}>
              {template.steps.map(([label, text], i) => (
                <li key={label} className={styles.step}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <div className={styles.stepBody}>
                    <span className={styles.stepLabel}>{label}</span>
                    <span className={styles.stepText}>{text}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(prev || next) && (
          <nav className={styles.siblings} aria-label="다른 템플릿">
            {prev && (
              <Link href={`/t/${prev.slug}/`} className={styles.sibling}>
                <span className={styles.siblingDir}>← 이전</span>
                <span className={styles.siblingTitle}>{prev.title}</span>
              </Link>
            )}
            {next && (
              <Link href={`/t/${next.slug}/`} className={`${styles.sibling} ${styles.siblingNext}`}>
                <span className={styles.siblingDir}>다음 →</span>
                <span className={styles.siblingTitle}>{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>
    </Container>
  );
}
