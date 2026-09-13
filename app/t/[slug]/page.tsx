import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Container from '@/components/Container';
import SheetViewer from '@/components/SheetViewer';
import { getNeighbours, getTemplate, getTemplates } from '@/lib/templates';

import styles from './page.module.css';

type Props = { params: Promise<{ slug: string }> };

/** public/templates 안의 폴더마다 페이지를 하나씩 미리 만들어 둡니다. */
export function generateStaticParams() {
  return getTemplates().map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) return {};

  return {
    title: template.title,
    description: template.desc,
    openGraph: {
      title: template.title,
      description: template.desc,
      images: template.cover ? [template.cover] : undefined,
    },
  };
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  const { prev, next } = getNeighbours(slug);

  return (
    <Container>
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
