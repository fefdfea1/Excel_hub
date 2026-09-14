import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
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

/**
 * 모든 페이지가 공통으로 쓰는 검색·공유 정보입니다.
 * 각 페이지에서 같은 항목을 다시 지정하면 그쪽이 우선합니다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.titleDefault,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [...site.keywords],
  applicationName: site.name,
  // 같은 내용이 여러 주소로 잡히지 않도록 대표 주소를 못박습니다.
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // 검색 결과에 미리보기 이미지와 설명을 넉넉히 보여달라는 요청입니다.
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: site.name,
    title: site.titleDefault,
    description: site.description,
    locale: 'ko_KR',
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: site.titleDefault }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.titleDefault,
    description: site.description,
    images: [site.ogImage],
  },
  // 검색 엔진에 사이트 소유자임을 확인시켜 주는 코드입니다.
  // 네이버 서치어드바이저 · 구글 서치 콘솔에서 받아 여기에 넣습니다.
  verification: {
    google: 'hgeEVhgFla3dW-QDb4lHz3RNes4Y8NyuC4Udi8cP1D8',
    other: { 'naver-site-verification': 'b505038f446268d0f4e70a64c14de3bb2641b6fe' },
  },
  // 전화번호처럼 보이는 숫자를 모바일 브라우저가 멋대로 링크로 바꾸지 않게 합니다.
  formatDetection: { telephone: false, email: false, address: false },
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
        {/* 구글 애널리틱스. site.config.ts 에 측정 ID 를 넣어야 동작합니다. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
