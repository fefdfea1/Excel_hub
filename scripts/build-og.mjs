/**
 * 공유 카드 이미지 만들기
 *
 *   npm run og
 *
 * 카카오톡·페이스북·X 에 주소를 붙였을 때 뜨는 1200×630 이미지를
 * public/og.png 로 만듭니다. 사이트 이름이나 설명을 바꾼 뒤 한 번 돌려주면 됩니다.
 * 직접 그린 이미지로 바꾸고 싶으면 같은 자리에 덮어써도 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createCanvas } from '@napi-rs/canvas';

import { registerFonts } from './build-previews.mjs';

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = path.join(process.cwd(), 'public', 'og.png');
const F = 'Malgun Gothic';

const COLOR = {
  paper: '#f4efe6',
  sheet: '#fffdf8',
  line: '#e3dbcd',
  ink: '#2b2622',
  body: '#5d554e',
  muted: '#7a716a',
  accent: '#b5533c',
};

/** site.config.ts 에서 필요한 값만 꺼내 옵니다. 설정 파일이 하나뿐이라 이 정도로 충분합니다. */
function readSiteConfig() {
  const source = fs.readFileSync(path.join(process.cwd(), 'site.config.ts'), 'utf8');
  const lines = source.split(/\r?\n/);

  // "키: '값'" 한 줄을 찾아 따옴표 사이만 꺼냅니다. 값이 다음 줄로 넘어간 경우도 봅니다.
  const pick = (key, fallback) => {
    const i = lines.findIndex((line) => line.trim().startsWith(`${key}:`));
    if (i < 0) return fallback;

    const text = lines[i] + (lines[i + 1] ?? '');
    const start = text.indexOf("'");
    const end = text.indexOf("'", start + 1);
    return start < 0 || end < 0 ? fallback : text.slice(start + 1, end);
  };
  return {
    name: pick('name', '엑셀 템플릿'),
    titleDefault: pick('titleDefault', '무료 엑셀 템플릿 모음'),
    url: pick('url', ''),
  };
}

function countTemplates() {
  const dir = path.join(process.cwd(), 'public', 'templates');
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
    .length;
}

function roundedRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 한 줄에 안 들어가면 띄어쓰기를 기준으로 접습니다. */
function wrap(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (g.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function main() {
  registerFonts();

  const site = readSiteConfig();
  const count = countTemplates();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const g = canvas.getContext('2d');

  g.fillStyle = COLOR.paper;
  g.fillRect(0, 0, WIDTH, HEIGHT);

  // 가운데 종이 한 장
  roundedRect(g, 48, 48, WIDTH - 96, HEIGHT - 96, 28);
  g.fillStyle = COLOR.sheet;
  g.fill();
  g.strokeStyle = COLOR.line;
  g.lineWidth = 2;
  g.stroke();

  // 왼쪽 위 표식 (헤더의 네모와 같은 모양)
  roundedRect(g, 104, 112, 26, 26, 7);
  g.fillStyle = COLOR.accent;
  g.fill();

  g.fillStyle = COLOR.ink;
  g.font = `700 30px ${F}`;
  g.textBaseline = 'top';
  g.fillText(site.name, 148, 113);

  // 가운데 제목
  g.font = `700 68px ${F}`;
  const lines = wrap(g, site.titleDefault.replace(/\s*·\s*/g, '\n').split('\n')[0], WIDTH - 240);
  let y = 236;
  for (const line of lines.slice(0, 2)) {
    g.fillText(line, 104, y);
    y += 88;
  }

  // 설명 한 줄
  g.fillStyle = COLOR.body;
  g.font = `400 34px ${F}`;
  g.fillText('견적서 · 재고관리 · 자금관리 · 설비점검 서식', 104, y + 14);

  // 아래쪽 한 줄
  const footerY = HEIGHT - 148;
  g.strokeStyle = COLOR.line;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(104, footerY);
  g.lineTo(WIDTH - 104, footerY);
  g.stroke();

  g.fillStyle = COLOR.accent;
  g.font = `700 28px ${F}`;
  g.fillText(count > 0 ? `템플릿 ${count}개 · 무료 다운로드` : '무료 다운로드', 104, footerY + 28);

  if (site.url) {
    g.fillStyle = COLOR.muted;
    g.font = `400 26px ${F}`;
    const label = site.url.replace(/^https?:\/\//, '');
    g.fillText(label, WIDTH - 104 - g.measureText(label).width, footerY + 30);
  }

  fs.writeFileSync(OUT, canvas.toBuffer('image/png'));
  console.log(`public/og.png 를 만들었습니다. (${WIDTH}×${HEIGHT})`);
}

main();
