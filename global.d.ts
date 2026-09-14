/**
 * 전역 스타일(`import './globals.css'`) 을 타입스크립트가 알아보게 합니다.
 *
 * Next 가 기본으로 알려주는 것은 `*.module.css` 뿐이라, 편집기에 따라
 * 전역 CSS 를 불러오는 줄에 "Cannot find module ... side-effect import" 오류가 뜹니다.
 * 빌드에는 영향이 없지만 편집기에 빨간 줄이 남으므로 여기서 한 번 선언해 둡니다.
 *
 * 내용은 Next 의 `*.module.css` 선언과 같게 맞춰 둡니다.
 * (`styles.shell` 처럼 쓰는 CSS 모듈이 그대로 동작해야 하기 때문입니다.)
 */
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
