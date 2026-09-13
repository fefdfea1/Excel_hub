import fs from 'node:fs';
import path from 'node:path';

import { site } from '@/site.config';

/**
 * 템플릿은 public/templates 아래 폴더 하나가 곧 템플릿 하나입니다.
 * 폴더를 넣으면 사이트에 나타나고, 폴더를 지우면 사라집니다.
 * 목록 어딘가에 등록하는 절차는 없습니다.
 *
 *   public/templates/
 *     07_재고관리_입출고_안전재고/     ← 폴더 이름이 곧 제목, 앞 숫자가 목록 순서
 *       meta.json                   ← 설명·태그·표지·사용 순서
 *       재고관리_입출고_안전재고_월간재고.xlsx   ← 폴더 안의 .xlsx 하나가 다운로드 파일
 *       previews/
 *         01-사용안내.png            ← 앞 숫자가 보이는 순서, 뒷부분이 시트 이름
 *         02-품목마스터.png
 *         ...
 *
 * 시트를 하나 더 보여주고 싶으면 previews 에 이미지를 하나 더 넣으면 됩니다.
 * 빼고 싶으면 지우면 됩니다. 어디에도 적어줄 필요가 없습니다.
 */

const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates');
const PREVIEWS_DIRNAME = 'previews';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'];

/** meta.json 에 적는 내용. 전부 선택이지만 title 은 넣는 편이 좋습니다. */
export type TemplateMeta = {
  /** 목록과 상세에 나오는 제목. 없으면 폴더 이름(밑줄은 띄어쓰기)을 씁니다. */
  title?: string;
  /** 카드와 상세에 나오는 한두 줄 설명 */
  desc?: string;
  /** 카드에 붙는 작은 꼬리표 */
  tags?: string[];
  /**
   * 카드 썸네일로 쓸 미리보기.
   * 숫자면 몇 번째 이미지인지(1부터), 문자면 시트 이름입니다.
   * previews 폴더에 cover 로 시작하는 이미지가 있으면 그게 우선합니다.
   */
  cover?: number | string;
  /** ["제목", "설명"] 쌍의 배열. 상세 페이지 '사용 순서'에 나옵니다. */
  steps?: [string, string][];
  /** 목록 정렬에 쓰는 값. 없으면 폴더 이름 앞 숫자를 씁니다. */
  order?: number;
  /** 주소에 쓰는 영문 이름. 없으면 폴더 이름에서 앞 숫자를 뗀 것을 씁니다. */
  slug?: string;
  /** true 면 빌드에서 제외합니다. 잠시 내려둘 때 씁니다. */
  draft?: boolean;
};

export type Preview = {
  /** 시트 이름. 파일 이름에서 앞 숫자와 확장자를 뗀 부분입니다. */
  name: string;
  /** 브라우저에서 쓰는 경로 */
  src: string;
};

export type Template = {
  slug: string;
  order: number;
  title: string;
  desc: string;
  tags: string[];
  steps: [string, string][];
  previews: Preview[];
  /** 카드 썸네일 경로 */
  cover: string;
  /** 다운로드 경로. 폴더에 엑셀 파일이 없으면 null */
  file: string | null;
  /** 사용자가 받게 될 파일 이름 */
  downloadName: string | null;
  /** 파일 확장자 (.xlsx 등). 다운로드 버튼에 표시합니다. */
  fileExt: string | null;
};

/** "07_재고관리_입출고_안전재고" -> { order: 7, rest: "재고관리_입출고_안전재고" } */
function splitOrderPrefix(dirname: string): { order: number | null; rest: string } {
  const m = dirname.match(/^(\d+)[-_.\s]+(.*)$/);
  if (!m) return { order: null, rest: dirname };
  return { order: Number(m[1]), rest: m[2] };
}

/**
 * 폴더 이름을 제목으로 씁니다. 밑줄과 붙임표는 띄어쓰기로 바꿉니다.
 * "07_재고관리_입출고_안전재고" -> "재고관리 입출고 안전재고"
 *
 * meta.json 에 title 을 적으면 그 값이 우선합니다.
 * 적지 않으면 폴더 이름을 바꾸는 것만으로 제목도 같이 바뀝니다.
 */
function titleFromDirname(rest: string): string {
  return rest.replace(/[_-]+/g, ' ').trim();
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function isImage(name: string) {
  return IMAGE_EXTENSIONS.includes(path.extname(name).toLowerCase());
}

/** 파일 이름을 사람이 기대하는 순서로 (1, 2, 10 순서로) 비교합니다. */
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

function readPreviews(dir: string, urlBase: string): Preview[] {
  const previewsDir = path.join(dir, PREVIEWS_DIRNAME);
  if (!fs.existsSync(previewsDir)) return [];

  return fs
    .readdirSync(previewsDir)
    .filter(isImage)
    .filter((name) => !/^cover\b/i.test(name))
    .sort(collator.compare)
    .map((name) => ({
      name: splitOrderPrefix(path.parse(name).name).rest,
      src: `${urlBase}/${PREVIEWS_DIRNAME}/${encodeURIComponent(name)}`,
    }));
}

function findCoverImage(dir: string, urlBase: string): string | null {
  const previewsDir = path.join(dir, PREVIEWS_DIRNAME);
  for (const base of [dir, previewsDir]) {
    if (!fs.existsSync(base)) continue;
    const hit = fs.readdirSync(base).find((name) => isImage(name) && /^cover\b/i.test(name));
    if (hit) {
      const prefix = base === dir ? urlBase : `${urlBase}/${PREVIEWS_DIRNAME}`;
      return `${prefix}/${encodeURIComponent(hit)}`;
    }
  }
  return null;
}

function pickCover(meta: TemplateMeta, previews: Preview[], explicit: string | null): string {
  if (explicit) return explicit;
  if (previews.length === 0) return '';

  const { cover } = meta;
  if (typeof cover === 'number' && previews[cover - 1]) return previews[cover - 1].src;
  if (typeof cover === 'string') {
    const byName = previews.find((p) => p.name === cover);
    if (byName) return byName.src;
  }
  return previews[0].src;
}

function findDownload(dir: string): string | null {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /\.(xlsx|xlsm|xls|csv|zip|pdf)$/i.test(name))
    .sort(collator.compare);
  return files[0] ?? null;
}

// 개발 중에는 캐시하지 않습니다. meta.json 이나 이미지를 고치면 새로고침만으로 바로 보입니다.
// (빌드할 때는 한 번만 읽으면 되므로 캐시합니다.)
const useCache = process.env.NODE_ENV === 'production';
let cache: Template[] | null = null;

/** 모든 템플릿을 목록 순서로 돌려줍니다. 방향은 site.config.ts 의 listOrder 를 따릅니다. */
export function getTemplates(): Template[] {
  if (useCache && cache) return cache;
  if (!fs.existsSync(TEMPLATES_DIR)) return (cache = []);

  const templates = fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))
    .map((entry) => buildTemplate(entry.name))
    .filter((t): t is Template => t !== null);

  const direction = site.listOrder === 'desc' ? -1 : 1;
  templates.sort((a, b) => direction * (a.order - b.order || collator.compare(a.slug, b.slug)));
  return (cache = templates);
}

function buildTemplate(dirname: string): Template | null {
  const dir = path.join(TEMPLATES_DIR, dirname);
  const meta = readJson<TemplateMeta>(path.join(dir, 'meta.json')) ?? {};
  if (meta.draft) return null;

  const { order: prefixOrder, rest } = splitOrderPrefix(dirname);
  const slug = meta.slug ?? rest ?? dirname;
  const urlBase = `/templates/${encodeURIComponent(dirname)}`;

  const previews = readPreviews(dir, urlBase);
  const downloadName = findDownload(dir);

  return {
    slug,
    order: meta.order ?? prefixOrder ?? 0,
    title: meta.title ?? titleFromDirname(rest ?? dirname),
    desc: meta.desc ?? '',
    tags: meta.tags ?? [],
    steps: meta.steps ?? [],
    previews,
    cover: pickCover(meta, previews, findCoverImage(dir, urlBase)),
    file: downloadName ? `${urlBase}/${encodeURIComponent(downloadName)}` : null,
    downloadName,
    fileExt: downloadName ? path.extname(downloadName).toLowerCase() : null,
  };
}

export function getTemplate(slug: string): Template | undefined {
  return getTemplates().find((t) => t.slug === slug);
}

/** 상세 페이지의 이전/다음 카드용 */
export function getNeighbours(slug: string) {
  const all = getTemplates();
  const i = all.findIndex((t) => t.slug === slug);
  return {
    prev: i > 0 ? all[i - 1] : null,
    next: i >= 0 && i < all.length - 1 ? all[i + 1] : null,
  };
}
