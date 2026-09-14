import type { Metadata } from 'next';
import Link from 'next/link';

import Container from '@/components/Container';
import styles from './not-found.module.css';

// 없는 주소가 검색 결과에 올라가지 않게 합니다.
export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

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
