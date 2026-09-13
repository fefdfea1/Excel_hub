'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import type { Preview } from '@/lib/templates';
import { site } from '@/site.config';
import styles from './SheetViewer.module.css';

/**
 * 시트 미리보기 넘겨보기.
 *
 * previews 배열을 그대로 받아서 그립니다. 이미지를 더 넣거나 빼면
 * 여기서 따로 고칠 것 없이 개수가 알아서 맞춰집니다.
 */
export default function SheetViewer({ previews }: { previews: Preview[] }) {
  const [index, setIndex] = useState(0);
  const total = previews.length;

  const step = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  // ← → 키로도 넘길 수 있게 합니다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step]);

  // site.config.ts 의 autoplaySeconds 가 0보다 크면 자동으로 넘깁니다.
  useEffect(() => {
    const seconds = site.autoplaySeconds;
    if (!seconds || total < 2) return;

    const timer = window.setInterval(() => step(1), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [step, total]);

  if (total === 0) return null;

  return (
    <div className={styles.viewer}>
      <div className={styles.stage}>
        <div className={styles.track} style={{ transform: `translateX(${-index * 100}%)` }}>
          {previews.map((preview, i) => (
            <Image
              key={preview.src}
              src={preview.src}
              alt={`${preview.name} 시트`}
              width={1200}
              height={750}
              priority={i === 0}
              className={styles.slide}
            />
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.prev}`}
              onClick={() => step(-1)}
              aria-label="이전 시트"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              onClick={() => step(1)}
              aria-label="다음 시트"
            >
              ›
            </button>
          </>
        )}

        <span className={styles.counter}>
          {index + 1} / {total}
        </span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="시트 목록">
        {previews.map((preview, i) => (
          <button
            key={preview.src}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={i === index}
            onClick={() => setIndex(i)}
          >
            {preview.name}
          </button>
        ))}
      </div>
    </div>
  );
}
