'use client';

import { useEffect, useRef, useState } from 'react';

import { site } from '@/site.config';
import styles from './Comments.module.css';

/**
 * Disqus 댓글.
 *
 * 사이트 전체가 스레드 하나를 같이 씁니다. 어느 페이지에서 보든 같은 댓글이
 * 보이도록 site.config.ts 의 comments.identifier 를 고정 식별자로 넘깁니다.
 *
 * 화면에 들어오기 직전에 불러오므로 첫 화면 로딩에는 영향을 주지 않습니다.
 */
export default function Comments() {
  const holder = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error' | 'unconfigured' | 'placeholder-url'
  >('idle');

  useEffect(() => {
    const node = holder.current;
    if (!node) return;

    if (!site.comments.shortname) {
      setStatus('unconfigured');
      return;
    }

    // 배포 주소를 아직 안 넣었으면 불러오지 않습니다.
    // 잘못된 주소로 스레드가 만들어지면 나중에 되돌리기 번거롭습니다.
    if (/example\.com/i.test(site.url)) {
      setStatus('placeholder-url');
      return;
    }

    let cancelled = false;

    const load = () => {
      if (cancelled || status !== 'idle') return;
      setStatus('loading');

      window.disqus_config = function disqusConfig(this: DisqusConfigScope) {
        // 현재 주소가 아니라 site.config.ts 의 url 을 고정으로 씁니다.
        //
        // Disqus 는 스레드를 만들 때 이 주소에 실제로 접속해서 확인합니다.
        // localhost 나 미리보기 도메인을 넘기면 확인에 실패해서 스레드가
        // '닫힘' 상태로 만들어지고, 댓글을 쓸 때 "thread is closed" 가 뜹니다.
        // 고정된 실제 주소를 쓰면 어디서 접속하든 같은 스레드 하나로 모입니다.
        this.page.url = site.url;
        this.page.identifier = site.comments.identifier;
        this.page.title = `${site.name} · ${site.comments.heading}`;
        this.language = 'ko';
      };

      const script = document.createElement('script');
      script.src = `https://${site.comments.shortname}.disqus.com/embed.js`;
      script.async = true;
      script.setAttribute('data-timestamp', String(Date.now()));
      script.onload = () => !cancelled && setStatus('ready');
      script.onerror = () => !cancelled && setStatus('error');
      document.head.appendChild(script);
    };

    if (typeof IntersectionObserver === 'undefined') {
      load();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // 한 번만 준비하면 되므로 의존성을 비워둡니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={holder}>
      <div id="disqus_thread" className={styles.thread} />

      {status === 'unconfigured' && (
        <p className={styles.note}>
          <code>site.config.ts</code> 의 <code>comments.shortname</code> 에 disqus.com 에서 받은 사이트
          이름을 넣으면 댓글이 나타납니다.
        </p>
      )}

      {status === 'placeholder-url' && (
        <p className={styles.note}>
          댓글을 켜려면 <code>site.config.ts</code> 의 <code>url</code> 을 실제 배포 주소로 바꿔주세요.
          Disqus 가 이 주소를 확인해서 스레드를 만들기 때문에, 임시 주소로 두면 댓글을 쓸 수 없는 스레드가
          만들어집니다.
        </p>
      )}

      {status === 'error' && (
        <p className={styles.note}>
          댓글을 불러오지 못했습니다. 광고 차단 확장 프로그램을 끄거나, disqus.com 설정에서 이 도메인이
          등록되어 있는지 확인해 주세요.
        </p>
      )}

      <noscript>
        <p className={styles.note}>
          댓글을 보려면 자바스크립트를 켜 주세요.{' '}
          <a href="https://disqus.com/?ref_noscript">Disqus</a>
        </p>
      </noscript>
    </div>
  );
}

type DisqusConfigScope = {
  page: { url?: string; identifier?: string; title?: string };
  language?: string;
};

declare global {
  interface Window {
    disqus_config?: (this: DisqusConfigScope) => void;
  }
}
