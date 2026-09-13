import Link from 'next/link';

import Container from '@/components/Container';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <Container>
      <section className={styles.wrap}>
        <h1 className={styles.title}>페이지를 찾을 수 없습니다</h1>
        <p className={styles.text}>주소가 바뀌었거나 템플릿이 내려갔을 수 있습니다.</p>
        <Link href="/" className={styles.link}>
          ← 목록으로
        </Link>
      </section>
    </Container>
  );
}
