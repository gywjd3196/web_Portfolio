# 2026-10-27 — 포트폴리오 v2 랜딩 (레퍼런스 조합 인터랙션 사이트)

## 1. 개요

- 날짜 : 2026-10-27
- 브랜치 : `portfolio-v2` (main / GitHub Pages 배포본은 건드리지 않음)
- 대상 파일 : `v2/index.html`, `v2/v2.css`, `v2/v2.js` (신규, 라이브러리 없음)
- 범위 : 포트폴리오 **랜딩 한 페이지**의 틀. 이미지·세부 포폴 페이지 없음
- 진행 방식 : 단일 에이전트. 레퍼런스 사이트를 실제 Chrome(Playwright)으로 띄워 인트로·커서·스크롤 지점별로 캡처 → 인터랙션 분석 → 조합 설계 → 구현 → 데스크톱(1440×900)·모바일(390×844) 스크롤 지점별 캡처로 검수

### 조사한 레퍼런스

- 사용자 지정 : shopify.design, Mobbin `Portfolio` 카테고리 인기순 31개 전부, animos.app 에디터(템플릿 약 80종)
- Mobbin 31개 : Metalab, Phantom, Aino, Fiasco, COLLINS, Analogue, Freshman, Shader, Oryzo, OFF+BRAND, Mouthwash, basement, Cloudstudio, Raw Materials, Koto, Vucko, Wild, TinyWins, Mother Design, NEON, Nite Riot, Unseen, KODE Immersive, Siena Film, Instrument, Ragged Edge, Büro, Locomotive, Pentagram, Studio Freight, Taxi Studio

## 2. 적용 완료된 변경 — 섹션별 레퍼런스 조합표

| # | 섹션 | 인터랙션 | 가져온 레퍼런스 |
|---|---|---|---|
| 0 | 프리로더 | 이름 글자 스크램블 + 카운터 000→100, 세로 줄무늬 블라인드가 가운데부터 걷힘 (기존 사이트의 블라인드 모티프 연결) | Siena(줄무늬 인트로), KODE(스크램블·100 카운터) |
| 1 | Hero “One Layer Deeper” | 레이어 카드 5장(Screen→Behavior→Cause→Rule→Shipped)이 스크롤마다 한 장씩 위로 벗겨짐, 뒤 카드는 깊이 스택. 마우스로 3D 틸트. 마지막 장이 화면 전체로 확장. 흩어진 큰 단어 3개가 바깥으로 갈라짐. DEPTH 미터 | Metalab(카드 주변에 흩어진 단어 → 풀스크린), animos Deck Peel·Depth Stack, Analogue(텍스트가 양끝으로 갈라짐), Oryzo(오브젝트 고정·장면 전환) |
| 2 | 4 ways I work | 번호 챕터 001~004 + 거대 단어. 단어가 바뀔 때 핑크 낙서줄이 긋고 글자가 위로 굴러 교체. 왼쪽 색 탭 스택(활성 탭만 늘어남). 3D 타일 오브젝트가 챕터마다 형태 모핑 : Ring → Grid Wall → Spiral → Orbit Globe | KODE(001 CREATE + 3D 오브젝트), Raw Materials(색 탭 챕터), Taxi(낙서줄 단어 교체), animos(Cover Ring·Sphere Wall·Spiral Stream·Orbit Globe) |
| 3 | Proof, in seconds | 거대한 시계 다이얼, 스크롤로 핑크 바늘이 되감김(2:00→0:40 / 92.5s→9.5s / 20%→100%). 배경에 외곽선 큰 숫자, −67% 카운트업 | shopify.design(“26” 다이얼·바늘), Ragged Edge(성과 수치 먼저), Büro(큰 카운터) |
| 4 | Selected work | 가운데 카드 + 양옆 기울어진 카드 부채꼴, 하단 눈금자 티커에서 현재 프로젝트 이름 굵게 가운데. Impact / Role / Year 3단. 진행중(초록 점 펄스) / 완료 상태 | Nite Riot(부채꼴·눈금 티커), Taxi(Impact·Client 열), Locomotive(큰 리스트) |
| 5 | Lab | 도구·방법·산출물 타일 36개로 된 구, 드래그+관성 회전, 가장 앞 타일이 핑크로 선택되고 이름 표시. 뒷면 타일은 흐려짐 | animos Card Globe·Sphere Wall, Phantom(드래그 그리드) |
| 6 | Say hi | 클릭하면 단어가 바뀌는 문장(“Let’s go [one layer deeper] on [your product] together.”), 커서를 따라보고 깜빡이는 눈, 이메일 클릭 복사, 거대 워드마크(커서 가까운 글자가 늘어남) | Pentagram(드롭다운 문장), Cloudstudio·Unseen(눈 캐릭터), Mother·MW.S·basement(풀폭 워드마크), OFF+BRAND(글자 반응) |
| — | 전역 | 하단 플로팅 필 — 섹션 이름이 바뀌고 전체 진행 바, +로 섹션 메뉴. 점+링 커서(라벨 표시). 서울 시계 | Büro(문구가 바뀌는 하단 필), Unseen(링 커서), Metalab·Vucko(시계) |

- 폰트 규칙 유지 : Lunchtype25 + Proxima Nova Hangeul 두 가지만
- 색 : 기존 reveal 핑크 `#FF13EB` + 블루 `#2D3BFF` + 라임 `#D6FF3B` + 잉크/페이퍼
- 접근성 : `prefers-reduced-motion` 시 애니메이션 최소화, 터치 기기에서 커스텀 커서 숨김, 시맨틱 섹션/헤딩
- 반응형 : 900px 이하에서 레이아웃 1단, 탭 가로 배치

## 3. 검수/리뷰 발견사항

| 심각도 | 위치 | 내용 | 상태 |
|---|---|---|---|
| med | `v2/v2.js` peel | 뒤 카드 깊이 오프셋이 커서 카드가 위로 튀어나옴 → 2.4vh 로 축소 | 적용 |
| med | `v2/v2.css` `.sheet--last` | 확장 시 transform-origin 이 위쪽이라 상단이 비던 문제 → 중앙 | 적용 |
| med | `v2/v2.css` `.obj` | 3D 오브젝트가 큰 단어를 가림 → 무대 위쪽 가운데로 이동 | 적용 |
| med | `v2/index.html` scribble | `pathLength` 누락으로 낙서줄이 계속 보임 → `pathLength="1"` | 적용 |
| low | `v2/v2.js` fitMark | 워드마크 폭 맞춤 계산 오류·공백 붕괴 → 글자 실측 + `white-space:pre` | 적용 |
| low | `v2/v2.js` lab | 구 뒷면 타일이 지저분 → 깊이에 따라 투명도 | 적용 |
| low | 콘솔 | favicon 404 하나 | 미적용(파비콘 없음) |
| low | Work 4번 “AI 숏폼 앱” | 클라이언트/성과 정보가 레포에 없어 “UX/UI Project”로 임시 표기 | 사용자 확인 필요 |

## 4. 다음 단계 제안

1. 카드·레이어에 실제 썸네일/영상 넣기 (animos 로 만든 MP4 루프를 Work 카드 배경으로 쓰기 좋음)
2. Work 카드 클릭 → 상세 페이지 연결 (지금은 커서에 “Soon”)
3. 진행중 프로젝트(PYDERIN · K-Derma · SUPERWORK) 공개 범위 확인 후 문구 확정
4. 확정되면 `v2/` 를 루트로 올리고 main 에 병합 → GitHub Pages 반영

---

## 후속 작업 (같은 날) — 컨셉 적용 : DIAGNOSTIC REPORT

사용자가 컨셉 5안(발굴 현장 / 진단 리포트 / 조판 공방 / 블라인드 하우스 / 대화하는 UI) 중 **2번 진단 리포트**를 선택. 구조·인터랙션은 그대로 두고 비주얼 언어를 전면 교체.

### 비주얼 시스템
- 바탕 : 모눈 차트지 (24px 보조선 + 120px 주선, 블루 계열)
- 색의 역할 : 핑크 = 형광펜 마커, 블루 = 차트 펜(주석·동그라미), 라임 = 두 번째 형광펜, 필름 네이비 = 엑스레이
- 장치 : 리포트 헤더(Case No · Examiner · Date · 바코드), 섹션마다 `P.0X / 06` 서식 머리줄, 바코드(문자열로 생성), 도장, 체크박스 ☑, 십자선 커서 + 좌표

### 섹션별 변환
| 섹션 | 이전 | 진단 리포트 버전 |
|---|---|---|
| 프리로더 | 줄무늬 블라인드 | 스캔 라인이 내려가며 “SCANNING PRODUCT 000%” → 리포트가 위로 걷힘 |
| P.01 Intake | 레이어 카드 | 검사 시트 SPECIMEN L01~05 (Symptom → Observation → Diagnosis → Prescription → Treated), “Layer” 블루 펜 동그라미, “Deeper” 형광펜. **엑스레이 렌즈** : 커서 주변 원 안에서만 속 레이어(와이어프레임 박스 + “CTA — 여기서 망설인다” 같은 진단 주석 + 히트맵)가 보임 |
| P.02 Protocol | 강점 4챕터 | 치료 프로토콜 ℞ Diagnose · Prescribe · Treat · Delegate, 폴더 탭, 표본 슬라이드 타일, 우측 차트(소견 / 처방 / 결과) |
| P.03 Vitals | 다이얼 | 바이탈 모니터 — 상단 심전도(ECG) 라인이 흐름, 다이얼 + Before/After 막대 |
| P.04 Case files | 부채꼴 카드 | 케이스 차트(폴더 탭 · Symptom · Rx) + RESOLVED / IN TREATMENT 도장이 찍히는 애니메이션, 줄자 티커 |
| P.05 Instruments | 카드 구 | 바코드 라벨 타일 구 + 범례 |
| P.06 Referral | 문장 · 워드마크 | 협진 의뢰서 양식 + OPEN FOR CONSULTATION 도장 + 서명란, **시력검사표(Snellen) 워드마크** — 줄마다 작아지고 마지막 줄 “IF YOU CAN READ THIS LINE, LET’S TALK.” |

### 검수 발견사항
| 심각도 | 위치 | 내용 | 상태 |
|---|---|---|---|
| med | `v2/v2.css` `.snellen__row span` | 글자 분할 span 까지 라벨 스타일이 먹어 AHN·HYOJEOUNG 이 11px 로 렌더 → `>` 자식 선택자로 한정 | 적용 |
| med | `v2/index.html` 헤더 Date | flex 컬럼이라 날짜·시간이 줄바꿈 → 값을 `<b>` 로 묶음 | 적용 |
| low | `v2/v2.css` `.depth` | DEPTH 미터가 “Layer” 동그라미와 겹침 → 좌측 가로 미터로 이동 | 적용 |
| low | 케이스 5~8 Symptom 문구 | 레포 정보로 추정해 쓴 문구 (PYDERIN · K-Derma · SUPERWORK · KOREAHNB) | 사용자 확인 필요 |
| low | 엑스레이 주석 | “CTA — 여기서 망설인다” 등은 컨셉 연출용 예시 문구 (실측 데이터 아님) | 의도됨 |
