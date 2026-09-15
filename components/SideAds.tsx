'use client';

import { useEffect, useState } from 'react';

import { site } from '@/site.config';

import styles from './SideAds.module.css';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 양옆 광고를 띄우기 시작하는 화면 폭.
 * 본문 1120px + 좌우 광고 160px 두 짝 + 사이 여백 24px 두 번 = 1488px 이고,
 * 스크롤바까지 생각해 조금 여유를 뒀습니다. 이보다 좁으면 아예 넣지 않습니다.
 */
const MIN_WIDTH = 1500;

/**
 * 광고 단위 ID 가 아직 없을 때, 어디에 광고가 붙는지 눈으로 보려고 자리만
 * 그려두는 모드입니다. `npm run dev` 로 띄웠을 때만 켜지므로 배포한 사이트에는
 * 나오지 않습니다.
 */
const PREVIEW = process.env.NODE_ENV !== 'production';

function Rail({ side, slot }: { side: 'left' | 'right'; slot: string }) {
  useEffect(() => {
    if (!slot) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 스크립트가 없는 경우입니다. 본문에는 영향이 없습니다.
    }
  }, [slot]);

  return (
    <aside className={`${styles.rail} ${styles[side]}`} aria-hidden="true">
      {slot ? (
        <ins
          className={`adsbygoogle ${styles.unit}`}
          data-ad-client={site.adsense.client}
          data-ad-slot={slot}
        />
      ) : (
        <div className={`${styles.unit} ${styles.placeholder}`}>
          <span>광고 자리</span>
          <span className={styles.size}>160 × 600</span>
        </div>
      )}
    </aside>
  );
}

/**
 * 본문 양옆 빈 자리에 세로 광고를 답니다.
 *
 * `site.config.ts` 의 `adsense.sideSlots` 에 광고 단위 ID 를 넣어야 실제 광고가
 * 나옵니다. 애드센스 화면에서 '디스플레이 광고' 단위를 좌·우용으로 두 개 만들면
 * `data-ad-slot` 에 들어갈 열 자리 숫자를 받습니다.
 *
 * 화면 폭은 붙이고 나서 재기 때문에 첫 그림에는 광고 자리가 없습니다.
 * 서버가 그린 화면과 어긋나지 않게 하려는 것이고, 좁은 화면에서는
 * 빈 광고 틀이 남지 않습니다.
 */
export default function SideAds() {
  const { client, sideSlots } = site.adsense;
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const sync = () => setWide(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  if (!client || !wide) return null;

  return (
    <>
      {sideSlots.left || PREVIEW ? <Rail side="left" slot={sideSlots.left} /> : null}
      {sideSlots.right || PREVIEW ? <Rail side="right" slot={sideSlots.right} /> : null}
    </>
  );
}
