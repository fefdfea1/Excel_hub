import AdmZip from 'adm-zip';

// exceljs 는 수식의 저장된 계산 결과가 0 이나 빈 문자열이면 그냥 버립니다.
// 그래서 시트 XML 에서 <v> 값을 직접 읽어 빠진 값을 채워 넣습니다.
export function cachedResults(xlsxPath) {
  const zip = new AdmZip(xlsxPath);
  const txt = n => { const e = zip.getEntry(n); return e ? e.getData().toString('utf8') : ''; };

  const rels = {};
  for (const m of txt('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = (m[0].match(/Id="([^"]+)"/) || [])[1];
    const tgt = (m[0].match(/Target="([^"]+)"/) || [])[1];
    if (id && tgt) rels[id] = tgt.replace(/^\/?xl\//, '').replace(/^\.\//, '');
  }

  const shared = [...txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => unesc(t[1])).join(''));

  const bySheet = {};
  for (const m of txt('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = unesc((m[0].match(/name="([^"]*)"/) || [])[1] || '');
    const rid = (m[0].match(/r:id="([^"]+)"/) || [])[1];
    const target = rels[rid];
    if (!name || !target) continue;
    bySheet[name] = parseSheet(txt('xl/' + target), shared);
  }
  return bySheet;
}

function unesc(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
}

function parseSheet(xml, shared) {
  const out = {};
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1], body = m[2] || '';
    if (!/<f[\s>]/.test(body) && !/<f\/>/.test(body)) continue; // formula cells only
    const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
    if (!ref) continue;
    const t = (attrs.match(/\bt="([^"]+)"/) || [])[1] || 'n';
    const vm = body.match(/<v[^>]*>([\s\S]*?)<\/v>/);
    if (!vm) { out[ref] = ''; continue; }
    const raw = unesc(vm[1]);
    if (t === 'e') out[ref] = '';
    else if (t === 's') out[ref] = shared[+raw] ?? '';
    else if (t === 'str' || t === 'inlineStr') out[ref] = raw;
    else if (t === 'b') out[ref] = raw === '1';
    else out[ref] = raw === '' ? '' : Number(raw);
  }
  return out;
}
