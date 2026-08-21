# work-details 화면 구현 + 워크 메뉴 호버 — 최종 보고서

## 1. 개요

- **날짜**: 2026-08-21
- **대상 파일**: `index.html`, `assets/css/home.css`, `assets/js/home.js`
- **디자인 기준**: 피그마 21-97 `work-details` (기준 아트보드 1920×1080, `--u` 비례 스케일)
- **진행 방식**: Orca 오케스트레이션 (`run_266fe77dc721`)
  - 코디네이터(이 세션): 피그마 실측 → 명세 작성 → 태스크 분배 → 결과 종합
  - 구현 담당 워커(claude, 현재 워크트리): 세 파일 수정 전담 — `task_6f5d9774bf53` (succeeded)
  - 검수 담당 워커(claude, 읽기 전용): 디자인 검수 + 코드 리뷰, 보고만 — `task_f7a1428b5b56` (succeeded)
  - 파일 소유권 분리: 검수자는 파일 수정 금지, 구현자만 세 파일 소유

## 2. 적용 완료된 변경

### work-details 오버레이 (피그마 21-97)

- **index.html**: `.detail`(id=detail) 섹션 추가 — 검정 상단 바(장식용 ↓↑ 화살표 SVG, 중앙 타이틀, X 닫기 버튼), PDF `iframe`, 세로 구분선(x1425), 카드 상/하 괘선(y414/1008.6), 복제 카드 슬롯(`#detailCard`). 각 `.project`에 `data-pdf`/`data-title` 부여.
- **home.css**: `.detail` 스코프에서 `--cu:var(--u)` 재정의 — 그리드용 330 축소 카드 모듈(`.project`)이 CSS 중복 없이 425 풀스케일로 그대로 커지는 방식. 열림/닫힘 모션은 `translateX(-100%) ↔ 0`, `.6s cubic-bezier(.22,.9,.24,1)` + `visibility` 지연 토글(닫힘 후 0.6s 시점에 숨김).
- **home.js**: 카드 클릭 → `openDetail()` — 타이틀·PDF(`encodeURI` 한글/공백 경로 처리, `#toolbar=0&navpanes=0`)를 data 속성으로 채우고 클릭된 카드를 `cloneNode(true)`로 복제해 우측 슬롯에 삽입. X 버튼·ESC로 `closeDetail()`, 닫힘 트랜지션 종료 후 무거운 PDF 언로드 시도.
- **PDF 매핑**: 1단 에이스카운터.pdf / 2단 푸른 솔.pdf / 3단 제로랩.pdf / 4단 씨닛.pdf (`assets/Portfolio/`).

### 워크 화면 메뉴 호버

- `.work__label--menu` 버튼을 홈과 동일한 `.menu` 구조(nav + Menu 라벨 / Work / About / Email / Linkedin)로 교체 — 기존 `.menu` CSS 완전 재사용(중복 CSS 없음), 위치·타이포 동일(top 102 / right 240 / 70 / 라인박스 83), 순차 드롭 인터랙션 동일.
- JS 메뉴 호버 바인딩을 `#menu` 단일 → 모든 `.menu` 공통으로 일반화.
- 라우팅: 워크 메뉴 "Menu" 라벨 클릭 → 홈 복귀(기존 동작 유지), "Work" → detail만 닫고 그리드 유지, About/Email/Linkedin → 미연결(추후).

### 검증

- 구현 워커: `node --check`(JS 문법), 선택자·id·calc 수치 정합 자체 점검. **브라우저 실행 확인은 미수행.**
- 검수 워커: 피그마 21-97 실측치와 전수 대조 — 바 1403×132, PDF x50/폭1303/top173.5, 세로선·괘선 좌표, 경계 정합, z-index, 폰트 패밀리, 홈 블라인드·그리드 호버 회귀까지 이상 없음 확인.

## 3. 검수/리뷰 발견사항 (미적용 — 사용자 확인 후 적용)

| 심각도 | 위치 | 문제 | 제안 |
|---|---|---|---|
| med | assets/css/home.css:354-357 | `.project:hover` 확대·크로스페이드가 detail 복제 카드에도 적용됨 (상세 카드는 정적이어야 자연스러움) | 호버 규칙을 `.work .project:hover`로 한정 |
| med | assets/js/home.js:309 | `removeAttribute('src')`는 iframe을 실제로 언로드하지 않음 — PDF 메모리 잔존 | `detailPdf.src='about:blank'`로 교체 |
| med | assets/js/home.js:299-301 | 카드가 클릭 전용(`article`) — 키보드 포커스·Enter 불가, detail 열림 중 하부 `#work` 링크 탭 가능 | `tabindex=0`/`role=button`/keydown, 열림 시 `#work` inert 처리 |
| low | assets/css/home.css:467 | 카드 left 1445.3 + 폭 425 = 우측 끝 1870.3 — 괘선(1870)을 0.3 초과 | left 1445 또는 폭 424.7로 통일 |
| low | assets/js/home.js:307-311 | `transitionend`에 `e.target` 검사 없음 — 복제 카드 썸네일 전환(0.45s)이 끝나면 닫힘 슬라이드(0.6s) 도중 PDF가 조기 언로드돼 퇴장 중 뷰어가 빈 화면 | `e.target===detail` 조건 추가 |
| low | assets/js/home.js:303-305 | PDF iframe 내부 클릭 후에는 ESC가 부모 문서에 도달하지 않음 | 열림 시 `detailClose.focus()`로 완화 |
| low | assets/css/home.css:395 | 화살표 아이콘 사이 gap 20u는 피그마 미확인 임시값 | 피그마 실측 반영 |
| low | assets/js/home.js:290 | `data-pdf` 누락 시 `src='undefined#...'` (현재 4장 모두 존재해 실해 없음) | 필요 시 가드 |

이상 없음 확인 항목: display/transition 충돌 없음(첫 프레임 스킵 없음) / clone 중복 id·리스너 없음 / encodeURI 한글 경로 정상 / X·ESC 배선 정상 / 홈 메뉴·블라인드·그리드 호버 회귀 없음 / 과잉 구현 없음.

## 4. 임시 결정 사항 (사용자 확인 필요)

1. **상세 바 타이틀 문구** — 피그마에는 에이스카운터(`ACE Counter - design intern`)만 있어 나머지 3개는 임시 표기: `Pureun Sol - projects` / `Zero Lab - projects` / `Cnit - projects`
2. **날짜 불일치** — 그리드 카드 26.09.03 vs 피그마 상세 26.09.24. 현재는 그리드 값 복제분 그대로 사용.
3. 화살표 아이콘 간격 20u (피그마 미실측 임시값).

## 후속 수정 (2026-08-22, 사용자 요청)

1. **상세 바 타이틀 확정** — `Pureun Sol → Blue Sol`, `Cnit → Seenit` (`index.html` data-title). 임시 결정 사항 1번 해소.
2. **상세 카드 썸네일 항상 컬러** — `.detail .project__thumb--hover{opacity:1}` 추가 (`home.css`). 상세 화면에서는 호버 여부와 무관하게 컬러 이미지 고정.
3. **PDF 항상 첫 장부터** — 1차 수정(iframe 매번 재생성 + 닫힘 시 `about:blank` 언로드, `e.target` 가드)만으로는 재발: 브라우저 PDF 뷰어(Edge/Chrome)가 **URL 단위로 마지막 열람 위치를 복원**하기 때문. 2차 수정: 열 때마다 `?v=Date.now()` 로 URL 을 유일하게 만들어 위치 기억을 무력화하고 `#page=1` 오픈 파라미터로 첫 장을 명시 (`home.js` openDetail). 1차 수정분(재생성·언로드·가드)은 유지 — 검수 발견사항 med(iframe 언로드 무효)·low(transitionend target 미검사)도 해소된 상태.

4. **확대(전체 화면) 아이콘 추가 (2026-08-22)** — 상단 바 위화살표 옆(동일 간격 20u)에 같은 크기(49×49u)·같은 스트로크(2u)의 돋보기+ 아이콘 버튼(`#detailZoom`) 추가. 클릭 시 `.detail.is-zoom` — PDF 영역이 화면 전체를 덮고(`position:fixed; inset:0`, .detail 의 transform 이 fixed 기준이라 뷰포트 전체) `view=Fit` 오픈 파라미터로 한 장씩 화면에 맞춰 보이게 재로드. ESC 는 계층화: 확대 중이면 확대만 해제(상세 유지), 아니면 상세 닫기. PDF 로드는 `loadPdf(fit)` 헬퍼로 통합. 알려진 한계: PDF 내부를 클릭해 포커스가 iframe 으로 넘어간 뒤에는 ESC 가 부모 문서에 도달하지 않음(기존 low 발견사항과 동일), `view=Fit` 은 브라우저 PDF 뷰어의 지원 범위에 따름(Chrome/Edge 지원).

5. **PDF 뷰어 pdf.js 전환 (2026-08-22)** — iframe 내장 뷰어로는 화살표 스크롤 제어·항상 첫 장·ESC 신뢰성이 구조적으로 불가능해 pdf.js(로컬 벤더 `assets/vendor/`)로 페이지를 캔버스에 직접 렌더. 화면 근처 페이지만 렌더(IntersectionObserver), 화살표 = 한 장 높이+간격 부드러운 스크롤, 확대 = CSS 전환만으로 전체 화면(스크롤 스냅, `object-fit:contain` 한 장씩), ESC 계층(확대 해제 → 상세 닫기), 닫힘 후 문서 destroy. 타이틀이 바 전체를 덮어 화살표·확대 클릭을 가로채던 버그도 `pointer-events:none` 으로 해결. Orca 내장 브라우저로 실동작 검증(8·10페이지 렌더, 첫 장 시작, 화살표 347px=한 장 스크롤, 확대 화면 맞춤).
6. **file:// 차단 대응 (2026-08-22)** — index.html 을 더블클릭(file://)하면 브라우저 보안 정책상 pdf.js 의 PDF fetch 가 차단돼 회색 빈 화면이 됨(Adobe Fonts 도 동일). 프로젝트 루트에 `사이트 열기.bat` + `tools/serve.js`(node 정적 서버, 포트 8741) 추가 — 더블클릭으로 로컬 서버 + 브라우저가 열린다. file:// 로 열면 PDF 영역에 안내 문구 표시. 배포된 실제 사이트(https)에서는 문제없음.

검증: `node --check` 통과. 남은 검수 발견사항: med 2건(그리드 호버 규칙의 detail 잔존 — 썸네일은 2번으로 무관해졌고 scale 확대만 남음 / 키보드 접근성), low 3건(카드 폭 0.3 초과, iframe 내부 클릭 후 ESC, 화살표 gap 임시값).

## 5. 다음 단계 제안

1. 위 발견사항 중 med 3건(+원하면 low) 적용 여부 결정 → 적용
2. 로컬 서버(`npx serve .`)로 실제 브라우저에서 열림/닫힘 모션·PDF 렌더 확인 (file:// 로는 Adobe Fonts·PDF iframe이 제한될 수 있음)
3. 카드 2~4의 상세 화면 피그마 시안이 생기면 타이틀 문구·간격 재대조
4. About / Email / Linkedin 링크 연결
