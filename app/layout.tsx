import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { site } from '@/site.config';
import { getTemplates } from '@/lib/templates';

import './globals.css';
import styles from './layout.module.css';

const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  weight: '45 920',
  display: 'swap',
  variable: '--font-pretendard',
  fallback: ['Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.name,
    description: site.description,
    locale: 'ko_KR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const count = getTemplates().length;

  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <div className={styles.shell}>
          <Header count={count} />
          <main className={styles.main}>{children}</main>
          <Footer />
        </div>
        {/* Vercel 방문 통계. Vercel에 배포했을 때만 동작하고, 그 외에는 아무 일도 하지 않습니다. */}
        <Analytics />
      </body>
    </html>
  );
}
