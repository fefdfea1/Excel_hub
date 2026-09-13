import styles from './Container.module.css';

/** 사이트 전체가 같은 폭과 좌우 여백을 쓰도록 감싸주는 껍데기입니다. */
export default function Container({ children }: { children: React.ReactNode }) {
  return <div className={styles.container}>{children}</div>;
}
