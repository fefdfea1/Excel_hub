// 엑셀 시트 하나를 캔버스에 그립니다. 색과 글꼴은 사이트와 같은 값을 씁니다.
//
// 그리는 방식
//   1. 엑셀의 열 너비·글꼴 크기를 그대로 쓴 "자연 크기"로 표를 배치합니다.
//   2. 가로와 세로를 각각 따로 늘이거나 줄여 그림을 채웁니다.
//      (스프레드시트는 열 너비와 행 높이가 서로 무관하므로 비율을 지킬 이유가 없습니다.)
//   3. 글자는 가로·세로 배율 중 작은 쪽을 따릅니다. 그래야 칸 밖으로 넘치지 않습니다.
//   4. 남는 공간은 위아래·좌우로 똑같이 나눠 가운데에 놓습니다.

const W = 1200;
const H = 750;
const PAD = 26;
const TAB_AREA = 34; // 아래쪽 시트 이름표가 차지하는 높이

// 배율 한계
const MAX_COL_SCALE = 2.2; // 열이 몇 개뿐인 시트가 지나치게 벌어지지 않도록
const MAX_ROW_SCALE = 2.2; // 행이 몇 줄뿐인 시트가 지나치게 두꺼워지지 않도록
const MAX_FONT_SCALE = 1.5;
const MIN_SHRINK = 0.72; // 칸에 안 들어갈 때 글자를 줄일 수 있는 하한 (원래 크기 대비)
// 한 칸이 이만큼 넓고 그 안의 값이 이만큼 짧으면, 오른쪽 끝에 두지 않고 왼쪽으로 당깁니다.
const WIDE_CELL_SHARE = 0.3;
const LONELY_TEXT_SHARE = 0.3;
const MIN_COL_SCALE = 0.5; // 이보다 더 줄여야 하면 뒤쪽 열을 뺍니다
const MIN_ROW_SCALE = 0.5;

const PAPER = '#f4efe6';
const SHEET = '#fffdf8';
const LINE = '#e3dbcd';
const INK = '#2b2622';
const MUTED = '#7a716a';
const HEAD = '#eee6d8';
const ACC = '#b5533c';
const INPUT = '#9a4a36';

const F =
  'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

// 자연 크기 기준값
const COL_UNIT = 7.0; // 엑셀 열 너비 1 = 7px
const MIN_COL_W = 46;
const MAX_AUTO_COL_W = 400; // 글자에 맞춰 넓힐 때의 상한
const BASE_FONT = 12.5;
const BASE_ROW_H = 21;
const ROW_LEAD = 1.75; // 행 높이 = 글꼴 크기 × 이 값

const isBigCell = (cell) => cell.s >= 13;
const fontSizeOf = (cell) => (isBigCell(cell) ? Math.min(cell.s * 1.35, 22) : BASE_FONT);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function renderSheet(createCanvas, sheet) {
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');

  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.fillStyle = SHEET;
  g.fillRect(PAD, PAD, W - PAD * 2, H - PAD * 2);

  const rowNums = Object.keys(sheet.rows)
    .map(Number)
    .sort((a, b) => a - b);

  if (rowNums.length > 0) drawTable(g, sheet, rowNums);

  drawSheetTab(g, sheet.name);
  return canvas;
}

/** "← 이 칸만 바꾸세요" 처럼 표 옆에 붙는 안내 문구인지 */
const isAnnotation = (text) => /^[←※→]/.test(text);

const looksNumeric = (text) => /^-?[\d,]+(\.\d+)?$/.test(text);

/** 실제로 쓰이는 가로 정렬. 지정이 없으면 숫자는 오른쪽, 글자는 왼쪽입니다. */
function alignOf(cell) {
  const align = cell.a || (looksNumeric(cell.v) ? 'right' : 'left');
  return align === 'general' ? (looksNumeric(cell.v) ? 'right' : 'left') : align;
}

/** 엑셀처럼 옆 빈 칸으로 글자가 넘쳐 흐를 수 있는 칸인지 */
function canOverflowRight(cell, next) {
  if (looksNumeric(cell.v)) return false;
  if (alignOf(cell) !== 'left') return false;
  return !next || next.v === '';
}

/**
 * 표 오른쪽에 붙은 수식 작업용 열을 떼어냅니다.
 *
 * 이 템플릿들은 화면에 보여줄 표에는 테두리나 배경색을 주고,
 * 「일치(자동)」 「검색키(자동)」 같은 계산용 보조 열은 아무 서식 없이
 * 표 바깥에 둡니다. 숨김 처리가 되어 있지 않아 그대로 두면 미리보기에
 * TRUE·FALSE 가 줄줄이 나옵니다.
 *
 * 그래서 마지막 "서식 있는 열" 뒤쪽은 잘라내되, 안내 문구가 든 열은 남깁니다.
 * 서식이 아예 없는 시트(사용안내 등)는 손대지 않습니다.
 */
function trimScratchColumns(sheet, rowNums, startCol, lastCol) {
  let lastStructured = 0;
  for (const r of rowNums) {
    for (const [key, cell] of Object.entries(sheet.rows[r])) {
      if (cell.bd || cell.f) lastStructured = Math.max(lastStructured, Number(key));
    }
  }
  if (lastStructured < startCol) return lastCol; // 서식이 없는 시트

  // 안내 문구나 제목 글자가 든 열은 남깁니다.
  // (「A S  요 청 서」처럼 제목을 한 글자씩 여러 칸에 나눠 쓴 서식이 있습니다.)
  const mustKeep = (col) =>
    rowNums.some((r) => {
      const cell = sheet.rows[r][col];
      if (!cell || cell.v === '') return false;
      return isAnnotation(cell.v) || isBigCell(cell);
    });

  let end = lastCol;
  while (end > lastStructured && !mustKeep(end)) end--;
  return Math.max(end, lastStructured);
}

/**
 * 잘릴 수밖에 없는 글자가 든 열을 그 글자가 들어갈 만큼 넓힙니다.
 *
 * 엑셀에서는 옆 칸이 비어 있으면 글자가 그리로 넘쳐 흐르고, 옆 칸에 내용이 있으면
 * 그냥 잘립니다. 화면에서는 스크롤하거나 열 너비를 늘려 확인할 수 있지만
 * 미리보기 그림은 그럴 수가 없어서, 잘린 채로 굳어버립니다.
 * (예: 사용안내 시트의 「④ 차량별집계 / 업체별미수금 / 기사수당내역」)
 *
 * 그래서 넘칠 자리가 없는 글자에 한해 열 너비를 늘려줍니다.
 * 넘칠 수 있는 글자는 원래 너비를 그대로 둡니다.
 */
function widenClippedColumns(g, sheet, rowNums, startCol, lastCol, colW) {
  const startsMerge = (r, c) => sheet.merges.some((m) => m[0] === c && m[1] === r);
  const isCovered = (r, c) =>
    sheet.merges.some(
      (m) => c >= m[0] && c <= m[2] && r >= m[1] && r <= m[3] && !(m[0] === c && m[1] === r),
    );

  for (let c = startCol; c <= lastCol; c++) {
    let needed = 0;

    for (const r of rowNums) {
      const row = sheet.rows[r];
      const cell = row[c];
      if (!cell || cell.v === '') continue;

      // 병합된 칸은 여러 열을 함께 쓰므로 한 열의 너비를 정하는 근거가 못 됩니다.
      if (startsMerge(r, c) || isCovered(r, c)) continue;

      // 넘칠 수 있는 조건은 그리기 쪽과 똑같이 맞춰야 합니다.
      // 왼쪽 정렬된 글자만 옆 빈 칸으로 넘어갑니다. 가운데 정렬된 머리글은 넘치지 못합니다.
      const next = row[c + 1];
      if (canOverflowRight(cell, next)) continue;

      g.font = `${cell.b || isBigCell(cell) ? '600 ' : '400 '}${fontSizeOf(cell)}px ${F}`;
      needed = Math.max(needed, g.measureText(cell.v).width);
    }

    // 넓히기만 합니다. 상한은 "넓히는 목표"에만 걸어야 하며,
    // 원래 넓은 열에 상한을 그대로 적용하면 열이 오히려 깎입니다.
    if (needed > 0) {
      colW[c] = Math.max(colW[c], Math.min(needed + 16, MAX_AUTO_COL_W));
    }
  }
}

/** 내용이 있는 열·행의 범위와 자연 크기를 구합니다. */
function measure(g, sheet, rowNums) {
  const lastRow = rowNums[rowNums.length - 1];

  let lastCol = 1;
  for (const r of rowNums) {
    for (const c of Object.keys(sheet.rows[r])) {
      if (sheet.rows[r][c].v !== '') lastCol = Math.max(lastCol, Number(c));
    }
  }
  for (const m of sheet.merges) {
    if (m[1] <= lastRow) lastCol = Math.max(lastCol, m[2]);
  }

  // 첫 열이 여백용 좁은 열이면 건너뜁니다.
  const firstRow = sheet.rows[rowNums[0]];
  const startCol = !firstRow[1] && (sheet.cols[1] || 8) < 4 ? 2 : 1;

  lastCol = trimScratchColumns(sheet, rowNums, startCol, lastCol);

  const colW = [];
  for (let c = startCol; c <= lastCol; c++) {
    colW[c] = Math.max((sheet.cols[c] || 9) * COL_UNIT, MIN_COL_W);
  }
  widenClippedColumns(g, sheet, rowNums, startCol, lastCol, colW);

  const rowH = [];
  for (let r = 1; r <= lastRow; r++) {
    const cells = Object.values(sheet.rows[r] || {});
    const tallest = cells.reduce((max, cell) => Math.max(max, fontSizeOf(cell)), BASE_FONT);
    rowH[r] = Math.max(tallest * ROW_LEAD, BASE_ROW_H);
  }

  return { startCol, lastCol, lastRow, colW, rowH };
}

function drawTable(g, sheet, rowNums) {
  const { startCol, lastCol, lastRow, colW, rowH } = measure(g, sheet, rowNums);

  const availW = W - PAD * 2;
  const availH = H - PAD * 2 - TAB_AREA;

  const sum = (arr, from, to) => {
    let total = 0;
    for (let i = from; i <= to; i++) total += arr[i] || 0;
    return total;
  };

  // 최소 배율로도 안 들어가면 뒤쪽 열·행을 잘라냅니다.
  let endCol = lastCol;
  while (endCol > startCol && sum(colW, startCol, endCol) * MIN_COL_SCALE > availW) endCol--;

  let endRow = lastRow;
  while (endRow > 1 && sum(rowH, 1, endRow) * MIN_ROW_SCALE > availH) endRow--;

  const naturalW = sum(colW, startCol, endCol);
  const naturalH = sum(rowH, 1, endRow);
  if (naturalW <= 0 || naturalH <= 0) return;

  // 가로·세로를 각각 맞춥니다.
  const sx = clamp(availW / naturalW, MIN_COL_SCALE, MAX_COL_SCALE);
  const sy = clamp(availH / naturalH, MIN_ROW_SCALE, MAX_ROW_SCALE);
  const fontScale = Math.min(sx, sy, MAX_FONT_SCALE);

  const tableW = naturalW * sx;
  const tableH = naturalH * sy;
  const originX = PAD + (availW - tableW) / 2;
  const originY = PAD + (availH - tableH) / 2;

  // 실제 화면 좌표
  const xs = [];
  let x = originX;
  for (let c = startCol; c <= endCol; c++) {
    xs[c] = x;
    x += colW[c] * sx;
  }
  xs[endCol + 1] = x;

  const ys = [];
  let y = originY;
  for (let r = 1; r <= endRow; r++) {
    ys[r] = y;
    y += rowH[r] * sy;
  }
  ys[endRow + 1] = y;

  const mergeAt = (r, c) => sheet.merges.find((m) => m[0] === c && m[1] === r);
  const isCovered = (r, c) =>
    sheet.merges.some(
      (m) => c >= m[0] && c <= m[2] && r >= m[1] && r <= m[3] && !(m[0] === c && m[1] === r),
    );
  const spanOf = (r, c) => {
    const m = mergeAt(r, c);
    return {
      c2: m ? Math.min(m[2], endCol) : c,
      r2: m ? Math.min(m[3], endRow) : r,
      merged: Boolean(m),
    };
  };

  const eachCell = (fn) => {
    for (let r = 1; r <= endRow; r++) {
      const row = sheet.rows[r] || {};
      for (let c = startCol; c <= endCol; c++) {
        const cell = row[c];
        if (!cell || isCovered(r, c)) continue;
        fn(cell, r, c, row);
      }
    }
  };

  // 배경색
  eachCell((cell, r, c) => {
    if (!cell.f) return;
    const { c2, r2 } = spanOf(r, c);
    g.fillStyle = HEAD;
    g.fillRect(xs[c], ys[r], xs[c2 + 1] - xs[c], ys[r2 + 1] - ys[r]);
  });

  // 테두리가 있는 칸만 격자를 그립니다
  g.strokeStyle = LINE;
  g.lineWidth = 1;
  eachCell((cell, r, c) => {
    if (!cell.bd) return;
    const { c2, r2 } = spanOf(r, c);
    g.strokeRect(xs[c] + 0.5, ys[r] + 0.5, xs[c2 + 1] - xs[c], ys[r2 + 1] - ys[r]);
  });

  // 글자
  g.textBaseline = 'middle';
  eachCell((cell, r, c, row) => {
    if (cell.v === '') return;

    const { c2, r2, merged } = spanOf(r, c);
    let cellW = xs[c2 + 1] - xs[c];
    const cellH = ys[r2 + 1] - ys[r];

    const size = fontSizeOf(cell) * fontScale;
    g.font = `${cell.b || isBigCell(cell) ? '600 ' : '400 '}${size}px ${F}`;

    const isNumber = /^-?[\d,]+(\.\d+)?$/.test(cell.v);
    const isInput = cell.c && /^0000|^1F4E|^0070C0|^2F5597|^1E40AF/i.test(cell.c);
    const isGrey = cell.c && /^(80|7F|59|A6|99)/i.test(cell.c);

    g.fillStyle = isInput ? INPUT : isGrey ? MUTED : INK;
    if (/^[←※]/.test(cell.v)) g.fillStyle = MUTED;

    let align = alignOf(cell);

    // 테두리 없는 글자는 옆 빈 칸으로 넘어갈 수 있습니다
    if (!merged && canOverflowRight(cell, row[c + 1])) {
      let reach = c;
      while (reach < endCol && !(row[reach + 1] && row[reach + 1].v !== '')) reach++;
      cellW = xs[reach + 1] - xs[c];
    }

    const padX = Math.max(5, 7 * fontScale);
    let text = cell.v;
    const maxTextW = cellW - padX * 2;

    if (g.measureText(text).width > maxTextW) {
      // 말줄임으로 글자를 잃기 전에, 먼저 글자를 조금 줄여서 끝까지 보이게 합니다.
      // 열이 많은 표의 머리글(「주문번호(자동)」)이나 긴 안내 문구가 여기에 해당합니다.
      const weight = cell.b || isBigCell(cell) ? '600 ' : '400 ';
      for (let shrunk = size - 0.5; shrunk >= size * MIN_SHRINK; shrunk -= 0.5) {
        g.font = `${weight}${shrunk}px ${F}`;
        if (g.measureText(text).width <= maxTextW) break;
      }

      // 그래도 넘치면 그때 줄입니다.
      if (g.measureText(text).width > maxTextW) {
        while (text.length > 1 && g.measureText(text).width > maxTextW) {
          text = text.slice(0, -2) + '…';
        }
        if (text === '…') text = '';
      }
    }

    // 설정값 입력칸처럼 한 칸이 아주 넓은데 값은 짧은 경우, 엑셀 기본 규칙대로
    // 숫자를 오른쪽에 붙이면 라벨과 화면 반 폭만큼 떨어져 깨진 것처럼 보입니다.
    // 엑셀이 정렬을 따로 지정하지 않은 칸에 한해 라벨 쪽(왼쪽)으로 당깁니다.
    if (
      !cell.a &&
      align === 'right' &&
      cellW > availW * WIDE_CELL_SHARE &&
      g.measureText(text).width < cellW * LONELY_TEXT_SHARE
    ) {
      align = 'left';
    }

    let tx = xs[c] + padX;
    g.textAlign = 'left';
    if (align === 'right') {
      g.textAlign = 'right';
      tx = xs[c] + cellW - padX;
    } else if (align === 'center' || align === 'centerContinuous') {
      g.textAlign = 'center';
      tx = xs[c] + cellW / 2;
    }

    g.fillText(text, tx, ys[r] + cellH / 2 + 1);
  });

}

function drawSheetTab(g, name) {
  g.font = `600 13px ${F}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';

  const tabW = g.measureText(name).width + 28;
  g.fillStyle = ACC;
  g.fillRect(PAD, H - PAD - 2, tabW, 24);
  g.fillStyle = '#fff';
  g.fillText(name, PAD + 14, H - PAD + 10);

  g.fillStyle = LINE;
  g.fillRect(PAD + tabW, H - PAD + 20, W - PAD * 2 - tabW, 2);
}
