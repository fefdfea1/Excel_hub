'use client';

import { useEffect } from 'react';

import { site } from '@/site.config';

import styles from './BottomAd.module.css';

/**
 * 광고 단위 ID 가 아직 없을 때, 어디에 광고가 붙는지 눈으로 보려고 자리만
 * 그려두는 모드입니다. `npm run dev` 로 띄웠을 때만 켜지므로 배포한 사이트에는
 * 나오지 않습니다.
 */
const PREVIEW = process.env.NODE_ENV !== 'production';

/**
 * 본문 맨 아래, 푸터 바로 위에 두는 가로 배너.
 *
 * `site.config.ts` 의 `adsense.bottomSlot` 에 광고 단위 ID 를 넣어야 실제 광고가
 * 나옵니다.
 *
 * 폭에 따라 300×50 · 320×50 · 468×60 · 728×90 으로만 뜹니다. 크기를 CSS 로
 * 못박아 두었기 때문에 광고가 본문만큼 커지거나 화면을 가리는 일은 없습니다.
 * 자리도 미리 잡아두므로 광고가 붙는 순간 아래 내용이 밀리지 않습니다.
 */
export default function BottomAd() {
  const { client, bottomSlot } = site.adsense;

  useEffect(() => {
    if (!client || !bottomSlot) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 스크립트가 없는 경우입니다. 본문에는 영향이 없습니다.
    }
  }, [client, bottomSlot]);

  if (!client) return null;
  if (!bottomSlot && !PREVIEW) return null;

  return (
    <aside className={styles.wrap}>
      {/* 본문과 광고를 헷갈리지 않게 작게 밝혀 둡니다. */}
      <span className={styles.label}>광고</span>
      {bottomSlot ? (
        <ins
          className={`adsbygoogle ${styles.unit}`}
          data-ad-client={client}
          data-ad-slot={bottomSlot}
        />
      ) : (
        <div className={`${styles.unit} ${styles.placeholder}`}>
          <span>광고 자리</span>
          <span className={styles.size}>300×50 · 468×60 · 728×90</span>
        </div>
      )}
    </aside>
  );
}
