import Container from './Container';
import Comments from './Comments';
import { site } from '@/site.config';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.inner}>
          <section className={styles.feedback}>
            <h2 className={styles.heading}>{site.comments.heading}</h2>
            <p className={styles.hint}>{site.comments.hint}</p>
            <Comments />
          </section>
          <p className={styles.colophon}>{site.colophon}</p>
        </div>
      </Container>
    </footer>
  );
}
