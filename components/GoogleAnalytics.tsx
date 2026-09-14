import Script from 'next/script';

import { site } from '@/site.config';

/**
 * 구글 애널리틱스.
 *
 * `site.config.ts` 의 `googleAnalyticsId` 를 채우면 들어가고, 비워두면
 * 아무것도 넣지 않습니다. ID 를 받기 전이나 개발 중에는 그대로 두면 됩니다.
 *
 * 어떤 파일을 몇 번 받아 갔는지는 따로 코드를 붙이지 않아도 집계됩니다.
 * 애널리틱스의 '향상된 측정'이 .xlsx 같은 파일 링크를 누르는 것을 알아서
 * file_download 이벤트로 기록합니다. 여기서 이벤트를 한 번 더 보내면
 * 같은 클릭이 두 번 세어지므로 보내지 않습니다.
 */
export default function GoogleAnalytics() {
  const id = site.googleAnalyticsId;
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {[
          'window.dataLayer = window.dataLayer || [];',
          'function gtag(){dataLayer.push(arguments);}',
          "gtag('js', new Date());",
          `gtag('config', '${id}');`,
        ].join('\n')}
      </Script>
    </>
  );
}
