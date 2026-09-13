import Container from '@/components/Container';
import TemplateCard from '@/components/TemplateCard';
import { getTemplates } from '@/lib/templates';
import { site } from '@/site.config';

import styles from './page.module.css';

export default function HomePage() {
  const templates = getTemplates();

  return (
    <Container>
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
