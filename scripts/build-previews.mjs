/**
 * 미리보기 이미지 만들기
 *
 *   npm run previews                 미리보기가 없는 템플릿만 만듭니다
 *   npm run previews -- --force      이미 있는 것도 다시 만듭니다
 *   npm run previews -- 07_재고관리_입출고_안전재고   폴더 하나만 만듭니다
 *
 * public/templates/<폴더>/ 안의 엑셀 파일을 열어서 시트마다 PNG 를 그리고
 * 같은 폴더의 previews/ 에 "01-시트이름.png" 형태로 저장합니다.
 * 어떤 파일을 읽을지 목록으로 적어줄 필요가 없습니다. 폴더만 있으면 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import ExcelJS from 'exceljs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

import { renderSheet } from './render.mjs';
import { cachedResults } from './cached.mjs';

const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates');
const PREVIEWS_DIRNAME = 'previews';
const MAX_ROWS = 30;
const MAX_COLS = 26;

/* -------------------------------------------------------------------------- */
/* 한글 글꼴                                                                   */
/* -------------------------------------------------------------------------- */

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/malgun.ttf',
  'C:/Windows/Fonts/malgunbd.ttf',
  '/System/Library/Fonts/AppleSDGothicNeo.ttc',
  '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
];

export function registerFonts() {
  let registered = 0;
  for (const file of FONT_CANDIDATES) {
    if (fs.existsSync(file)) {
      GlobalFonts.registerFromPath(file, 'Malgun Gothic');
      registered += 1;
    }
  }
  if (registered === 0) {
    console.warn('한글 글꼴을 찾지 못했습니다. 글자가 깨져 보일 수 있습니다.');
  }
}

/* -------------------------------------------------------------------------- */
/* 셀 값 읽기                                                                  */
/* -------------------------------------------------------------------------- */

const pad2 = (n) => String(n).padStart(2, '0');

const isDateFormat = (format) =>
  !!format && /(y{2,4}|d{1,2}|m{1,5}(?![^"]*")).*(y{2,4}|d{1,2})|yy/i.test(format);

/** 엑셀의 날짜 일련번호를 실제 날짜로 바꿉니다. */
function serialToDate(serial) {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function formatDate(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** 셀 서식(numFmt)에 맞춰 숫자를 보기 좋은 문자열로 바꿉니다. */
function formatNumber(value, format) {
  if (!format || format === 'General' || format === '@') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e6) / 1e6);
  }

  const core = format.split(';')[0];
  const decimals = (core.match(/\.(0+)/) ?? [, ''])[1].length;

  if (core.includes('%')) return `${(value * 100).toFixed(decimals)}%`;
  if (isDateFormat(core)) return formatDate(serialToDate(value));

  if (/\[h\]|h+:mm/i.test(core)) {
    const totalHours = value * 24;
    const hours = Math.floor(totalHours);
    return `${hours}:${pad2(Math.round((totalHours - hours) * 60))}`;
  }

  let text = Math.abs(value).toFixed(decimals);
  if (/#,##|,#/.test(core)) {
    const [whole, fraction] = text.split('.');
    text = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? `.${fraction}` : '');
  }

  const currency = /₩|"₩"|\\/.test(core) ? '₩' : '';
  return (value < 0 ? '-' : '') + currency + text;
}

let lastValueWasNumeric = false;

function cellText(cell, cached) {
  lastValueWasNumeric = false;
  let value = cell.value;
  if (value === null || value === undefined) return '';

  if (typeof value === 'object') {
    if (value.formula !== undefined || value.sharedFormula !== undefined) {
      // 수식 셀은 저장된 계산 결과를 씁니다. 없으면 XML 에서 읽은 값으로 보완합니다.
      if (value.result === null || value.result === undefined) {
        const fallback = cached?.[cell.address];
        if (fallback === null || fallback === undefined) return '';
        value = fallback;
      } else {
        value = value.result;
      }
      if (typeof value === 'object' && value?.error) return '';
    } else if (value.richText) {
      value = value.richText.map((part) => part.text).join('');
    } else if (value.text !== undefined) {
      value = value.text;
    } else if (value.error) {
      return '';
    }
  }

  if (typeof value === 'number') lastValueWasNumeric = true;
  if (value instanceof Date) {
    return formatDate(new Date(value.getTime() + value.getTimezoneOffset() * 60000));
  }
  if (typeof value === 'number') return formatNumber(value, cell.numFmt);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value).replace(/\r?\n/g, ' ');
}

function hasFill(cell) {
  const fill = cell.fill;
  if (!fill || fill.type !== 'pattern' || !fill.pattern || fill.pattern === 'none') return false;
  const argb = fill.fgColor?.argb ?? '';
  return argb !== '' && !/^(FF)?FFFFFF$/i.test(argb);
}

function hasBorder(cell) {
  const border = cell.border;
  if (!border) return false;
  return ['top', 'left', 'bottom', 'right'].some(
    (side) => border[side]?.style && border[side].style !== 'none',
  );
}

const columnLetterToNumber = (letters) =>
  [...letters].reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);

/** 시트 하나를 renderSheet 가 이해하는 모양으로 바꿉니다. */
export function extractSheet(worksheet, cached) {
  const rows = {};

  // includeEmpty 를 켜고 읽습니다.
  // 입력용 칸은 테두리만 있고 값이 비어 있는데, 이런 칸을 건너뛰면
  // 수식이 든 열에만 테두리가 남아 표가 세로 줄무늬처럼 깨져 보입니다.
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber > MAX_ROWS) return;

    const cells = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > MAX_COLS) return;

      const text = cellText(cell, cached);
      const filled = hasFill(cell);
      const bordered = hasBorder(cell);

      // 값도 테두리도 배경색도 없으면 진짜 빈 칸입니다.
      if (text === '' && !filled && !bordered) return;

      const alignment = cell.alignment?.horizontal ?? '';
      const font = cell.font ?? {};

      cells[colNumber] = {
        v: text,
        s: font.size || 11,
        b: Boolean(font.bold),
        c: (font.color?.argb ?? '').replace(/^FF/i, ''),
        f: filled,
        bd: bordered,
        // 엑셀이 명시한 정렬만 담습니다. 비어 있으면 "지정 안 함"이고,
        // 숫자는 오른쪽·글자는 왼쪽이라는 기본 규칙은 그리는 쪽에서 적용합니다.
        a: alignment && alignment !== 'general' ? alignment : '',
      };
    });

    if (Object.keys(cells).length > 0) rows[rowNumber] = cells;
  });

  const merges = [];
  for (const ref of worksheet.model.merges ?? []) {
    const match = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) continue;
    merges.push([
      columnLetterToNumber(match[1]),
      Number(match[2]),
      columnLetterToNumber(match[3]),
      Number(match[4]),
    ]);
  }

  const cols = {};
  worksheet.columns.forEach((column, i) => {
    if (column?.width) cols[i + 1] = column.width;
  });

  return { name: worksheet.name, rows, merges, cols };
}

/* -------------------------------------------------------------------------- */
/* 폴더 처리                                                                   */
/* -------------------------------------------------------------------------- */

/** 파일 이름으로 못 쓰는 글자를 걸러냅니다. */
const safeFileName = (name) => name.replace(/[\\/:*?"<>|]/g, '_').trim();

export function findWorkbook(dir) {
  const file = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find((name) => /\.(xlsx|xlsm)$/i.test(name) && !name.startsWith('~$'));
  return file ? path.join(dir, file) : null;
}

async function buildTemplate(dirname, { force }) {
  const dir = path.join(TEMPLATES_DIR, dirname);
  const previewsDir = path.join(dir, PREVIEWS_DIRNAME);

  const workbookPath = findWorkbook(dir);
  if (!workbookPath) {
    console.log(`- ${dirname}: 엑셀 파일이 없어 건너뜁니다`);
    return;
  }

  const alreadyHasPreviews =
    fs.existsSync(previewsDir) && fs.readdirSync(previewsDir).some((n) => n.endsWith('.png'));
  if (alreadyHasPreviews && !force) {
    console.log(`- ${dirname}: 미리보기가 이미 있어 건너뜁니다 (--force 로 다시 만들기)`);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const cached = cachedResults(workbookPath);

  // 다시 만들 때는 예전 이미지를 먼저 지웁니다. 시트를 지운 경우까지 반영됩니다.
  if (fs.existsSync(previewsDir)) {
    for (const name of fs.readdirSync(previewsDir)) {
      if (/\.(png|jpe?g|webp)$/i.test(name) && !/^cover\b/i.test(name)) {
        fs.unlinkSync(path.join(previewsDir, name));
      }
    }
  }
  fs.mkdirSync(previewsDir, { recursive: true });

  workbook.worksheets.forEach((worksheet, i) => {
    const sheet = extractSheet(worksheet, cached[worksheet.name]);
    const canvas = renderSheet(createCanvas, sheet);
    const fileName = `${pad2(i + 1)}-${safeFileName(worksheet.name)}.png`;
    fs.writeFileSync(path.join(previewsDir, fileName), canvas.encodeSync('png'));
  });

  const names = workbook.worksheets.map((w) => w.name).join(' / ');
  console.log(`✓ ${dirname}: ${workbook.worksheets.length}장 — ${names}`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter((arg) => !arg.startsWith('-'));

  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error('public/templates 폴더가 없습니다.');
    process.exitCode = 1;
    return;
  }

  registerFonts();

  const dirs = fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((name) => only.length === 0 || only.includes(name));

  if (dirs.length === 0) {
    console.log('만들 템플릿이 없습니다.');
    return;
  }

  for (const dirname of dirs) {
    await buildTemplate(dirname, { force });
  }
}

// 이 파일을 직접 실행했을 때만 동작합니다 (다른 스크립트에서 함수만 가져다 쓸 수 있게).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
