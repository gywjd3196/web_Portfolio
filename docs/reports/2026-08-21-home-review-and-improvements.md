# 홈 화면 검수·개선 최종 보고서

- **날짜**: 2026-08-21
- **대상**: `index.html`, `assets/css/home.css`, `assets/js/home.js`, `README.md`
- **진행 방식**: Orca 오케스트레이션 — 역할군별 워커 4명 병렬 투입 (Run `run_6ecb8879e604`)

| 역할 | 담당 | 결과 |
|---|---|---|
| 타이포/인터랙션 검수자 | 읽기 전용 검수 | 18건 발견 (high 4 / med 9 / low 5) |
| 코드 리뷰어 | 읽기 전용 검수 | 16건 발견 (med 5 / low 11) |
| 모션/물리 엔지니어 | `home.js` 수정 | 블라인드 당김 물리 전면 개선 |
| 마크업/스타일 담당 | `index.html`, `home.css` 수정 | 한자 → 영문 이름 변경 |

---

## 1. 적용 완료된 변경

### 1-1. 한자 삭제 → 영문 이름 변경 (ahn hyojeoung)

- `<title>` → **Ahn Hyojeoung — Portfolio**
- 이름 호버 플립을 유지한 채 재구성: 앞면 `ahn hyojeoung`(Lunchtype25) → 호버 시 음절 단위로 `안효정`(Proxima Nova Hangeul) 플립. 셀 매핑 ahn→안, hyo→효, jeoung→정, 기존 0/55/110ms 스태거 리듬 유지.
- `aria-label="Ahn Hyojeoung (안효정)"` 갱신.
- 한자 전용이던 **Noto Sans KR 구글 폰트 링크·preconnect 제거**, `--font-kr` 폴백 체인 정리.
- `README.md`·JS 주석 포함 프로젝트 전체 한자 잔재 **0건** 확인 (grep 검증).

### 1-2. 블라인드 당김 물리 개선 (`home.js`)

**부자연스러웠던 원인 (기존 구현)**

1. 전역 스프링 하나로 모든 슬랫이 거리와 무관하게 **동시에** 커서에 쌓임 — 전파 지연 없음.
2. 놓으면 출렁임 없이 **단조 복귀** — 탄성 느낌 없음.
3. 변형이 뾰족한 **선형 V(텐트)** — 천 느낌 없음.
4. 당김 거리에 따른 **저항 없음**.

**개선 내용 (새 물리 모델)**

| 항목 | 구현 |
|---|---|
| 전파 지연 | 슬랫별 개별 스프링 + 경계 거리 기반 강성 감쇠 (가까운 슬랫 ~50ms, 먼 슬랫 ~150ms 도달) |
| 릴리즈 출렁임 | 놓는 순간 무른 스프링(k=0.14, damp=0.78)으로 전환 → 약 31% 오버슈트 후 ~0.85초 감쇠 진동 |
| 곡선 변형 | 선형 V → 커서 x 중심 코사인 종(bell) 곡선, 14분할 샘플링, 당길수록 주름 폭 확장 |
| 장력 저항 | tanh 기반 — 멀리 끌수록 손끝이 커서를 덜 따라감 |

**검증**: Node 스텁 시뮬레이션으로 전파 지연·오버슈트·정착 후 crispEdges 복원 수치 확인, headless Edge 렌더 확인, `node --check` 문법 통과. 이 리팩터링으로 코드 리뷰 지적사항 "스프링 스냅 후 최종 프레임 미렌더(잔여 1~2px 변위)"도 함께 해소됨(`wasPulling` 마지막 프레임 렌더).

---

## 2. 검수 결과 — 남은 개선 항목 (미적용)

한자 제거·물리 리팩터링으로 이미 해소된 항목(한자/한글 폰트 혼용, Noto 불필요 다운로드, 스냅 후 미렌더)은 제외.

### HIGH (4건)

| # | 문제 | 위치 |
|---|---|---|
| H-1 | `prefers-reduced-motion` 설정에도 JS 물결·스프링·트윈이 계속 동작 — 무한 반복 모션이라 가장 시급 | `home.js` loop() |
| H-2 | 숨겨진 메뉴 링크가 Tab 순회에 잡히지만 키보드로는 메뉴를 열 수 없음 (`focus-within` 부재) | `index.html` 메뉴 / `home.css` |
| H-3 | `:focus-visible` 스타일 전무 — fab은 원형과 어긋난 기본 사각 링 | `home.css` 전체 |
| H-4 | 터치에서 메뉴가 열리자마자 닫힘(pointerover/leave 구조), name 플립도 터치 대안 없음 | `home.js` 메뉴 바인딩 |

### MED (4건)

| # | 문제 | 위치 |
|---|---|---|
| M-1 | `touch-action:none`이 핀치 줌까지 차단 (WCAG 1.4.4) → `pinch-zoom` 권장 | `home.css` `.stage` |
| M-2 | 블라인드 열림 중 당기면 `tear.index`가 닫힌 상태 pitch 기준이라 잡은 줄과 벌어지는 줄이 어긋남 | `home.js` pointerdown |
| M-3 | Lunchtype25(Condensed) 로드 실패 시 폴백(Helvetica/Arial)이 폭을 반영 못해 레이아웃 틀어짐 → `size-adjust` 폴백 권장 | `home.css` `--font-en` |
| M-4 | 플립 오버슈트(cubic-bezier y2=1.06)가 overflow:hidden 셀 하단에 1~2프레임 흰 틈 노출 | `home.css` `.name__flip` |

### LOW (요약)

- 미사용 Lunchtype25 300/500 @font-face 선언 (굵기 위계에 활용하거나 삭제)
- name 플립 커브와 메뉴 커브 미세 불일치 → 모션 언어 통일 고려
- fab `:active` 눌림이 호버와 같은 250ms라 굼뜸 → 80~120ms 권장
- 메뉴 닫힘 유예 40ms가 스태거(~390ms) 대비 짧아 경계 이탈 시 깜빡임 → 120ms 권장
- Typekit `wf-loading` 대응 CSS 부재 (FOUT 무방비)
- `.touch` div의 aria-label이 AT에 전달 안 됨 → `role="img"` + 낱글자 `aria-hidden` 권장
- ResizeObserver + resize 리스너 중복으로 resize당 build() 2회
- `press.x/y` 초기값 (0,0)이 build()의 중앙 정렬을 무효화
- `href="#"` 자리표시자 링크 — 연결 전까지 `tabindex="-1"` 또는 `<button>` 권장
- TTF 전용 폰트 → WOFF2 변환 시 40~60% 용량 절감
- 매직 넘버(스프링 상수·타이밍) 명명 상수화, `html lang="ko"`에 영문 블록 `lang="en"` 부여
- Linkedin/Email 실제 연결 시 `rel="noopener noreferrer"` 필수

### 정합 확인된 부분 (문제 없음)

- letter-spacing `-.025em` 일관성 + 우측 정렬 메뉴의 `margin-right:-.025em` 자간 상쇄 처리
- 메뉴 스태거 열림(top→bottom)/닫힘(bottom→top) 방향 반전 설계
- TOUCH IT 물결 로직 (유휴 900ms 판정, 진폭 페이드)
- setPointerCapture + window 리스너 구조 (버블링으로 정상 동작)
- 레이아웃 스래싱 없음, XSS 표면 없음

---

## 3. 다음 단계 제안

1. **HIGH 4건 우선 적용** — 접근성·reduced-motion은 실사용 영향이 큼.
2. MED 4건 중 M-2(블라인드 열림 중 당김)는 물리 인터랙션 완성도와 직결.
3. 세부 페이지(Work/About) 연결 시 자리표시자 링크·`rel` 정리 병행.

> 원본 상세 보고서(코드 스니펫 포함)는 워커 스크래치패드에 생성됐으며, 핵심 내용은 본 문서에 통합됨.
