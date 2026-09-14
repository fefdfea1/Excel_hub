/**
 * 구조화 데이터(JSON-LD)를 페이지에 심습니다.
 *
 * 화면에는 아무것도 보이지 않고, 검색 엔진만 읽습니다.
 * "이 페이지는 무료로 받을 수 있는 엑셀 서식이다" 같은 내용을 글이 아니라
 * 기계가 읽는 형식으로 한 번 더 알려주는 것입니다.
 */
export default function JsonLd({ data }: { data: object }) {
  // 내용에 </script> 같은 조각이 들어가도 문서가 깨지지 않도록 '<' 를 JSON 이스케이프로 바꿉니다.
  const json = JSON.stringify(data).split('<').join('\\u003c');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
