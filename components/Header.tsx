import Link from 'next/link';

import Container from './Container';
import { site } from '@/site.config';
import styles from './Header.module.css';

export default function Header({ count }: { count: number }) {
  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.dot} aria-hidden="true" />
            <span>{site.name}</span>
          </Link>
          <span className={styles.count}>무료 · 템플릿 {count}개</span>
        </div>
      </Container>
    </header>
  );
}
