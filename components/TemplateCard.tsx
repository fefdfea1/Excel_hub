import Image from 'next/image';
import Link from 'next/link';

import type { Template } from '@/lib/templates';
import styles from './TemplateCard.module.css';

export default function TemplateCard({ template }: { template: Template }) {
  return (
    <Link href={`/t/${template.slug}/`} className={styles.card}>
      <div className={styles.thumb}>
        {template.cover && (
          <Image
            src={template.cover}
            alt={`${template.title} 미리보기`}
            width={1200}
            height={750}
            className={styles.image}
          />
        )}
      </div>

      <div className={styles.meta}>
        <div className={styles.row}>
          <h3 className={styles.title}>{template.title}</h3>
          {template.previews.length > 0 && (
            <span className={styles.sheets}>시트 {template.previews.length}</span>
          )}
        </div>

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
    </Link>
  );
}
