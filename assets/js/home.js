/* =========================================================
   Ahn HyoJeoung — Portfolio / HOME  interactions
   1) 메뉴 호버   : Work / About / Email / Linkedin 위에서 아래로
   2) 꾹 눌러 당기기 : 커서 방향으로 라인 박스가 끌려가며 안쪽이 보인다
   3) 플로팅 버튼 : 블라인드가 열렸다가 3초 뒤 닫힘
   ========================================================= */
(() => {
  'use strict';

  const NS     = 'http://www.w3.org/2000/svg';
  const stage  = document.getElementById('stage');
  const svg    = document.getElementById('blind');
  const gSlats = document.getElementById('slats');
  const gLines = document.getElementById('lines');
  const fab    = document.getElementById('fab');

  /* ---------------- 기준 수치 (피그마 1920 x 1080) ---------------- */
  const BASE_W = 1920, BASE_H = 1080;
  const ROW_H  = 54;      // 직사각형 박스 세로 54 (1080/20행) / 가로는 화면 전체(1920)
                          // 타이포 베이스라인이 라인 위에 얹히도록 얇게 (피그마 19-269)
  const OPEN_R = 0.5;     // 블라인드가 열리면 세로 27 (54의 절반)
  const OVERLAP= 0.6;     // 박스끼리 살짝 겹쳐 그려 경계 틈(안티에일리어싱) 방지

  /* ---------------- 당김 물리 상수 ---------------- */
  const SEG    = 16;                    // 커서 주변 곡선을 몇 조각으로 샘플링할지
  const PULL_K = 0.30, PULL_D = 0.68;   // 누르는 동안 : 단단한 스프링, 빠르게 붙는다
  const REL_K  = 0.14, REL_D = 0.78;    // 놓은 뒤     : 무른 스프링, 감쇠 진동(출렁임)
  const LAG_P  = 0.45;                  // 당길 때 : 경계에서 먼 슬랫일수록 늦게 따라오는 정도
  const LAG_R  = 0.18;                  // 놓을 때 : 먼 슬랫일수록 늦게 돌아가 물결이 퍼진다
  const FLAT   = 0.05;                  // 이보다 덜 끌린 엣지는 '변형 없는 평평한 선' 으로 본다

  let W = 0, H = 0, N = 12;
  let dpr = 1;                          // build() 에서 캐시하고 resize 마다 갱신
  const slats = [], lineTop = [], lineBot = [];

  /* ---------------- 상태 ---------------- */
  const press = { active:false, x:0, y:0 };
  const anim  = { x:0, y:0 };                      // 커서 추적 위치
  const tear  = { index:0 };                       // 당길 때 벌어지는 경계선
  const slatS = [], slatV = [];                    // 슬랫별 당김 스프링 (값 / 속도)
  let   pullActive = false;                        // 당김 애니메이션이 진행 중인지
  const blind = { open:0, from:0, to:0, t0:0, dur:1, timer:null };

  let wasPulling = false;

  /* ---------------- 명함 ----------------
     CSS rest 위치(끼임 자리) 기준 오프셋 x/y(px)·rz/rx(deg) 를 --cx/--cy/--rz/--rx 로 넘긴다.
     state : rest(정지) → drag(잡고 끌기) → spring(끼임 자리로 복귀) | fall(낙하) → gone(화면 밖, 새로고침 전까지 유지) */
  const cardMask = document.getElementById('cardMask');
  const cardEl   = document.getElementById('card');
  const CARD_ROW  = 4;                  // 명함이 끼어 있는 경계선 (4번째 줄 = 슬랫 3 의 아래 엣지)
  const CARD_GAIN = 0.35;               // 명함을 끌 때 블라인드가 함께 당겨지는 비율
  const CARD_K = 0.08, CARD_D = 0.70;   // 끼임 자리로 돌아가는 스프링 (놓았을 때 · 재장전)
  const DROP_R = 0.13;                  // 뷰포트 높이의 13% 이상 끌어내리고 놓으면 떨어진다
  const MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.05 : 1;  // 감소 모션 : 낙하·재장전을 20배 빨리
  const card = { state:'rest', x:0, y:0, rz:0, rx:0, vx:0, vy:0, vz:0,
                 downX:0, downY:0, px:0, py:0, t0:0, x0:0, y0:0, z0:0, timer:null };
  let wasCard = false, cardClip = '';

  const f    = n => Math.round(n * 1000) / 1000;
  const unit = () => Math.min(W / BASE_W, H / BASE_H);
  const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

  /* 평평한 선은 실제 픽셀의 '반 픽셀' 그리드에 올려야 1px 스트로크가
     한 픽셀 행에 정확히 얹혀 어디서나 같은 굵기로 선명하게 보인다.
     (viewBox 가 화면 크기와 1:1 이라 1 user unit = 1 CSS px) */
  const snapY = y => (Math.round(y * dpr - 0.5) + 0.5) / dpr;

  /* ---------------- 라인 박스 만들기 ---------------- */
  function build() {
    W = stage.clientWidth  || window.innerWidth  || BASE_W;
    H = stage.clientHeight || window.innerHeight || BASE_H;
    dpr = window.devicePixelRatio || 1;
    /* 1 CSS px 는 dpr 디바이스 px — 배율(1.25 등)에 따라 스냅 위상별로 굵기가 달라 보이므로
       1/dpr 로 잡아 어떤 배율에서도 정확히 1 디바이스 픽셀 굵기로 통일한다 */
    gLines.setAttribute('stroke-width', 1 / dpr);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    N = Math.max(4, Math.round(H / (ROW_H * unit())));

    gSlats.textContent = '';
    gLines.textContent = '';
    slats.length = lineTop.length = lineBot.length = 0;
    slatS.length = slatV.length = 0;

    for (let i = 0; i < N; i++) {
      const slat = document.createElementNS(NS, 'path');
      slat.setAttribute('fill', '#FFFFFF');
      gSlats.appendChild(slat);
      slats.push(slat);
      slatS.push(0);
      slatV.push(0);

      const a = document.createElementNS(NS, 'path');
      const b = document.createElementNS(NS, 'path');
      gLines.appendChild(a);
      gLines.appendChild(b);
      lineTop.push(a);
      lineBot.push(b);
    }
    if (!press.active) { anim.x = W / 2; anim.y = H / 2; }
    render();
  }

  /* ------------- 당길 때 박스가 이동하는 거리 -------------
     누른 지점에서 가장 가까운 경계선(tear)을 잡고,
      - 아래로 끌면 : 그 아래쪽 박스들이 손끝(gy)까지 밀려 내려가 쌓이고
      - 위로 끌면   : 그 위쪽 박스들이 손끝까지 밀려 올라가 쌓인다
     => 잡은 경계선이 벌어지면서 그 사이로 안쪽(이미지)이 보인다.
     gy 는 저항이 적용된 손끝 위치 — 멀리 끌수록 커서를 덜 따라간다.  */
  function shift(i, y, downward, gy) {
    if (downward) { if (i >= tear.index) return Math.max(y, gy) - y; }
    else          { if (i <  tear.index) return Math.min(y, gy) - y; }
    return 0;
  }

  /* 커서 x 중심의 코사인 종(bell) 곡선 : 중심 1, 폭 끝에서 0 으로 부드럽게 */
  const bell = u => 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, Math.abs(u)));

  /* y 기준선이 커서 쪽으로 a 만큼 끌린 가로 엣지의 점 목록 (좌→우, [x,y,...])
     변형이 없으면 반 픽셀 그리드에 스냅한 직선 2점,
     끌리는 중이면 스냅 없이 곡선 샘플을 그대로 둔다(geometricPrecision). */
  function edgePts(y, a, cx, halfW) {
    if (Math.abs(a) < FLAT) {
      /* 화면 위/아래 경계는 스냅하지 않는다 — 0 을 0.5 로 올리면 첫 슬랫 위로 배경이 샌다 */
      const sy = (y <= 0.6 || y >= H - 0.6) ? y : snapY(y);
      return [0, sy, W, sy];
    }
    const pts = [];
    const x0  = Math.max(0, cx - halfW);
    const x1  = Math.min(W, cx + halfW);
    if (x0 > 0) pts.push(0, y);
    for (let k = 0; k <= SEG; k++) {
      const x = x0 + (x1 - x0) * k / SEG;
      pts.push(x, y + a * bell((x - cx) / halfW));
    }
    if (x1 < W) pts.push(W, y);
    return pts;
  }

  /* ------------- 샘플 점 -> 부드러운 곡선 -------------
     Catmull-Rom 스플라인을 큐빅 베지어(C) 로 변환해, 샘플 점을 모두 지나면서
     다각형 모서리는 보이지 않게 잇는다. 접선 가중치는 현 길이(chord) 기반 —
     곡선 샘플(짧은 간격)과 평면 끝점(긴 간격)이 만나는 접점에서 제어점이
     오버슈트해 고리가 생기는 것을 막는다. 현 길이는 방향과 무관하므로
     역방향으로 순회해도 완전히 같은 곡선이 나와 선(lineD)과 슬랫 아래
     엣지(역방향)의 윤곽이 정확히 일치한다. (간격이 균일하면 w=1/2 이 되어
     기존 균일 파라미터 곡선과 동일)
       rev : true 면 점 목록을 우→좌 로 순회
       dy  : 모든 y 에 더할 오프셋 (슬랫 아래 엣지의 OVERLAP) */
  function curveCmds(pts, rev, dy) {
    const n  = pts.length >> 1;
    const px = i => pts[2 * (rev ? n - 1 - i : i)];
    const py = i => pts[2 * (rev ? n - 1 - i : i) + 1] + dy;
    if (n === 2) return 'L' + f(px(1)) + ' ' + f(py(1));   // 변형 없는 평평한 엣지
    const dist = (i, j) => Math.hypot(px(j) - px(i), py(j) - py(i));
    let d = '';
    for (let i = 0; i < n - 1; i++) {
      const j0 = i > 0 ? i - 1 : 0;                // 양 끝점은 자기 자신을 한 번 더 쓴다
      const j3 = i + 2 < n ? i + 2 : n - 1;
      const x1 = px(i),     y1 = py(i);
      const x2 = px(i + 1), y2 = py(i + 1);
      const d0 = dist(j0, i), d1 = dist(i, i + 1), d2 = dist(i + 1, j3);
      const w1 = d0 + d1 > 0 ? d1 / (d0 + d1) / 3 : 0;
      const w2 = d1 + d2 > 0 ? d1 / (d1 + d2) / 3 : 0;
      d += 'C' + f(x1 + (x2 - px(j0)) * w1) + ' ' + f(y1 + (y2 - py(j0)) * w1)
         + ' ' + f(x2 - (px(j3) - x1) * w2) + ' ' + f(y2 - (py(j3) - y1) * w2)
         + ' ' + f(x2) + ' ' + f(y2);
    }
    return d;
  }

  function lineD(pts) {
    return 'M' + f(pts[0]) + ' ' + f(pts[1]) + curveCmds(pts, false, 0);
  }

  /* 위 엣지(좌→우) + 아래 엣지(우→좌, OVERLAP 만큼 내려서) 로 닫힌 슬랫 path
     — 두 엣지 모두 lineD 와 같은 곡선 빌더를 쓰므로 면과 선이 어긋나지 않는다 */
  function slatD(top, bot) {
    const n = bot.length;
    return 'M' + f(top[0]) + ' ' + f(top[1]) + curveCmds(top, false, 0)
         + 'L' + f(bot[n - 2]) + ' ' + f(bot[n - 1] + OVERLAP)
         + curveCmds(bot, true, OVERLAP) + 'Z';
  }

  function setLine(el, pts, y, a) {
    if (Math.abs(a) < 0.4 && (y <= 0.6 || y >= H - 0.6)) { el.removeAttribute('d'); return; }
    el.setAttribute('d', lineD(pts));
  }

  /* ---------------- 그리기 ---------------- */
  function render() {
    const closed = H / N;
    const slatH  = closed * (1 - OPEN_R * blind.open);   // 세로가 점점 짧아진다
    const pitch  = N > 1 ? (H - slatH) / (N - 1) : closed;
    const tearY  = tear.index * pitch;
    const down   = anim.y >= tearY;

    /* 당김 저항 : 멀리 끌수록 손끝이 커서를 덜 따라간다 (천의 장력) */
    const lim = H * 0.7;
    const gy  = tearY + lim * Math.tanh((anim.y - tearY) / lim);

    /* 곡선 폭 : 많이 당길수록 주름이 옆으로 넓게 퍼진다 */
    const halfW = W * 0.24 + Math.min(W * 0.18, Math.abs(gy - tearY) * 0.5);

    const mode = pullActive ? 'geometricPrecision' : 'crispEdges';
    if (gLines.getAttribute('shape-rendering') !== mode) gLines.setAttribute('shape-rendering', mode);

    let prevBotY = null;   // 앞 슬랫 아래 엣지선의 y (평평할 때만)
    for (let i = 0; i < N; i++) {
      const t  = i * pitch;
      const b  = t + slatH;
      const s  = slatS[i];
      const at = s ? shift(i, t, down, gy) * s : 0;
      const ab = s ? shift(i, b, down, gy) * s : 0;

      const topPts = edgePts(t, at, anim.x, halfW);
      const botPts = edgePts(b, ab, anim.x, halfW);
      slats[i].setAttribute('d', slatD(topPts, botPts));
      if (i === CARD_ROW - 1) setCardClip(botPts);   // 명함은 이 슬랫 아래 엣지 밑으로만 보인다

      /* 닫힌 상태에선 슬랫 i 위 엣지선이 앞 슬랫 아래 엣지선과 같은 y 에 겹쳐
         스트로크가 두 번 쌓여 굵어 보인다 — 평평한 선이 반 디바이스 픽셀 안에서
         같은 자리면(float 오차 흡수) 하나만 남긴다 */
      if (Math.abs(at) < FLAT && prevBotY !== null && Math.abs(t - prevBotY) < 0.5 / dpr) {
        lineTop[i].removeAttribute('d');
      } else {
        setLine(lineTop[i], topPts, t, at);
      }
      setLine(lineBot[i], botPts, b, ab);
      prevBotY = Math.abs(ab) < FLAT ? b : null;
    }
  }

  /* ---------------- 블라인드 (플로팅 버튼) ---------------- */
  function tweenBlind(to, dur) {
    blind.from = blind.open;
    blind.to   = to;
    blind.t0   = performance.now();
    blind.dur  = dur;
  }

  fab.addEventListener('click', () => {
    clearTimeout(blind.timer);
    tweenBlind(1, 420);                                        // 열림 (빠르게)
    blind.timer = setTimeout(() => tweenBlind(0, 340), 2200);  // 2.2초 뒤 닫힘
  });

  /* ---------------- 꾹 눌러 잡아당기기 ---------------- */
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.no-drag')) return;
    press.active = true;
    press.x = anim.x = e.clientX;
    press.y = anim.y = e.clientY;
    tear.index = Math.min(N, Math.max(0, Math.round(e.clientY / (H / N))));
    stage.classList.add('is-pulling');
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });

  window.addEventListener('pointermove', e => {
    if (!press.active) return;
    press.x = e.clientX;
    if (card.state === 'drag') {
      /* 명함 드래그 : 명함은 커서를 따라오고, 블라인드는 게인만큼만 약하게 따라온다 */
      const dy = e.clientY - card.downY;
      card.px = e.clientX - card.downX;
      card.py = dy < 0 ? dy * 0.25 : dy;                               // 위로는 저항
      press.y = tear.index * (H / N) + CARD_GAIN * Math.max(0, dy);
    } else press.y = e.clientY;
  }, { passive:true });

  const release = () => {
    if (!press.active) return;
    press.active = false;
    stage.classList.remove('is-pulling');
    if (card.state === 'drag') dropCard();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

  /* ---------------- 명함 잡기 / 놓기 / 낙하 / 재장전 ---------------- */
  cardEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 || card.state === 'fall' || card.state === 'gone') return;
    card.state = 'drag';
    card.downX = e.clientX - card.x;      // 복귀 중에 다시 잡아도 튀지 않게 현재 오프셋을 유지
    card.downY = e.clientY - card.y;
    card.px = card.x;
    card.py = card.y;
    /* 블라인드도 약하게 함께 당긴다 — 기존 당김 물리를 명함 끼임 경계(tear) 기준으로 재사용 */
    tear.index = CARD_ROW;
    press.active = true;
    press.x = anim.x = e.clientX;
    press.y = anim.y = tear.index * (H / N);
    stage.classList.add('is-pulling');
    try { cardEl.setPointerCapture(e.pointerId); } catch (_) {}
  });

  function dropCard() {
    if (card.y < H * DROP_R) { card.state = 'spring'; return; }   // 임계 미만 : 스프링으로 끼임 자리 복귀
    card.state = 'fall';
    card.t0 = performance.now();
    card.x0 = card.x; card.y0 = card.y; card.z0 = card.rz;
  }

  /* 슬랫 3 의 아래 엣지 곡선을 그대로 clip 폴리곤으로 — 당김으로 선이 휘어도 명함이 그 밑에서만 보인다 */
  function setCardClip(pts) {
    let s = 'polygon(';
    for (let k = 0; k < pts.length; k += 2) s += f(pts[k]) + 'px ' + f(pts[k + 1] + OVERLAP) + 'px,';
    s += W + 'px ' + 2 * H + 'px,0px ' + 2 * H + 'px)';
    if (s !== cardClip) cardMask.style.clipPath = cardClip = s;
  }

  function stepCard(now) {
    if (card.state === 'drag') {
      /* 커서를 살짝 늦게 따라오고, 뒤처진 방향의 반대로 기운다 */
      card.x += (card.px - card.x) * 0.35;
      card.y += (card.py - card.y) * 0.35;
      card.rz += (Math.max(-14, Math.min(14, (card.px - card.x) * 0.15)) - card.rz) * 0.2;
    } else if (card.state === 'spring') {
      card.vx += -card.x  * CARD_K; card.vx *= CARD_D; card.x  += card.vx;
      card.vy += -card.y  * CARD_K; card.vy *= CARD_D; card.y  += card.vy;
      card.vz += -card.rz * CARD_K; card.vz *= CARD_D; card.rz += card.vz;
      if (Math.abs(card.x) + Math.abs(card.y) + Math.abs(card.rz) < 0.05 &&
          Math.abs(card.vx) + Math.abs(card.vy) + Math.abs(card.vz) < 0.05) {
        card.x = card.y = card.rz = card.vx = card.vy = card.vz = 0;
        card.state = 'rest';
      }
    } else if (card.state === 'fall') {
      /* 종이 낙하 : 중력으로 가속하다 종단 속도로 등속(≈2초에 화면 밖),
         좌우 살랑임(sin) + 살랑임보다 1/4 주기 앞선 rotateZ 기울기,
         긴 축 기준 rotateX 로 천천히 뒤집혀 앞면이 보였다가 다시 돈다 */
      const t  = (now - card.t0) / 1000 / MOTION;
      const G  = 0.5 * H, VT = 0.6 * H, tT = VT / G;
      card.y  = card.y0 + (t < tT ? 0.5 * G * t * t : 0.5 * G * tT * tT + VT * (t - tT));
      const ramp = Math.min(1, t / 0.5), w = 2 * Math.PI / 1.2 * t;
      card.x  = card.x0 + W * 0.05 * Math.sin(w) * ramp;
      card.rz = card.z0 * (1 - ramp) + 14 * Math.cos(w) * ramp;
      card.rx = 200 * t;
      /* 회전 바운딩까지 감안해 완전히 화면 밖으로 나간 뒤에만 종료.
         한 번 떨어진 명함은 다시 끼우지 않는다 — 새로고침해야 리셋 (사용자 지정 동작) */
      if (cardEl.getBoundingClientRect().top > H) {
        card.state = 'gone';
        cardMask.style.display = 'none';
      }
    }
  }

  function drawCard() {
    cardEl.style.setProperty('--cx', f(card.x)  + 'px');
    cardEl.style.setProperty('--cy', f(card.y)  + 'px');
    cardEl.style.setProperty('--rz', f(card.rz) + 'deg');
    cardEl.style.setProperty('--rx', f(card.rx) + 'deg');
  }

  /* ---------------- 메뉴 호버 (홈 #menu · 워크 #workMenu 공통) ---------------- */
  document.querySelectorAll('.menu').forEach(m => {
    let t = null;
    m.addEventListener('pointerover', () => {
      clearTimeout(t);
      m.classList.add('is-open');
    });
    m.addEventListener('pointerleave', () => {
      clearTimeout(t);
      t = setTimeout(() => m.classList.remove('is-open'), 40);
    });
  });
  document.querySelectorAll('.menu a[data-link]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const link = a.dataset.link;                 // Email / Linkedin 은 data-link 없이 실제 href 로 동작
      closeDetail();
      openWork(link === 'work');
      openAbout(link === 'about');
    });
  });

  /* ---------------- WORK / ABOUT 화면 열기/닫기 ---------------- */
  const work  = document.getElementById('work');
  const about = document.getElementById('about');
  function openWork(on) {
    work.classList.toggle('is-open', on);
    work.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) preloadPdfs();                 // 첫 클릭 전에 PDF 파싱을 미리 끝내 둔다
  }
  function openAbout(on) {
    about.classList.toggle('is-open', on);
    about.setAttribute('aria-hidden', on ? 'false' : 'true');
    /* display:none → block 직후라 레이아웃이 잡힌 다음 프레임에 처리 */
    requestAnimationFrame(() => { snapAboutLines(); armAboutFx(on); });
  }

  /* ---------------- ABOUT 라인 1 디바이스 픽셀 스냅 ----------------
     1px CSS 선이 소수 DPR(1.25 등)에서 위치에 따라 1~2 디바이스 픽셀로
     달리 그려지는 것을 막는다 — 높이를 1 디바이스 픽셀로 두고
     문서 기준 y 를 디바이스 픽셀 격자에 스냅 (블라인드 snapY 와 같은 원리) */
  const aboutScroll = about.querySelector('.about__scroll');
  function snapAboutLines() {
    const frame = about.querySelector('.about__frame');
    if (!frame || !about.classList.contains('is-open')) return;
    const d  = window.devicePixelRatio || 1;
    const f0 = frame.getBoundingClientRect().top;
    about.querySelectorAll('.about__line, .about__introline').forEach(el => {
      el.style.transform = '';
      el.style.height    = (1 / d) + 'px';
      const y = el.getBoundingClientRect().top - f0;
      el.style.transform = 'translateY(' + (Math.round(y * d) / d - y) + 'px)';
    });
  }

  /* ---------------- ABOUT 등장 모션 ----------------
     .fx 요소가 화면에 들어오면 위→아래로 내려앉는 리빌 (CSS .fx.is-in).
     닫으면 초기화해 다음 진입 때 다시 재생된다 */
  let fxIO = null;
  function armAboutFx(on) {
    if (fxIO) { fxIO.disconnect(); fxIO = null; }
    const els = about.querySelectorAll('.fx');
    els.forEach(el => el.classList.remove('is-in'));
    if (!on) return;
    aboutScroll.scrollTop = 0;                       // 진입 시 항상 첫 화면부터
    fxIO = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { fxIO.unobserve(en.target); en.target.classList.add('is-in'); }
    }), { root: aboutScroll, threshold: 0.2 });
    els.forEach(el => fxIO.observe(el));
  }

  /* ---------------- WORK-DETAILS 오버레이 ----------------
     그리드 카드 클릭 → 타이틀·PDF 를 data 속성으로 채우고
     카드를 복제해 오른쪽 슬롯에 넣은 뒤 왼쪽에서 밀어 넣는다 */
  const detail      = document.getElementById('detail');
  const detailPdf   = document.getElementById('detailPdf');   // 페이지 캔버스 스크롤 컨테이너
  const detailTitle = document.getElementById('detailTitle');
  const detailCard  = document.getElementById('detailCard');

  /* ---------- PDF 렌더링 (pdf.js) ----------
     브라우저 내장 뷰어(iframe)는 부모에서 스크롤 제어가 불가능하고 열람 위치를
     URL 단위로 복원해 버려서, pdf.js 로 페이지를 캔버스에 직접 그린다.
     화면 근처에 온 페이지만 렌더(IntersectionObserver) — 20MB PDF 도 가볍게 */
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
  let pdfTask = null, pdfIO = null, pdfRerender = null;

  /* 문서 캐시 : url -> getDocument 태스크. 닫아도 destroy 하지 않고 남겨
     같은 카드를 다시 열면 파싱 없이 즉시 뜬다.
     Range(206) + disableAutoFetch 로 전체 다운로드 전에 첫 페이지부터 그린다.
     ponytail: 캐시 무제한 — 포트폴리오 PDF 4개뿐. 수십 개로 늘면 LRU 로 교체 */
  const pdfCache = new Map();
  function getPdfTask(url) {
    let t = pdfCache.get(url);
    if (!t) {
      t = pdfjsLib.getDocument({
        url: encodeURI(url),
        disableAutoFetch: true,          // 보이는 페이지 조각만 받는다
        rangeChunkSize: 1 << 20          // 1MB — 10~21MB 파일에서 요청 수/선행량 균형
      });
      pdfCache.set(url, t);
    }
    return t;
  }

  /* work 화면이 열리면 4개 PDF 를 백그라운드에서 순차로 미리 파싱해 둔다.
     카드 pointerenter 는 getPdfTask 를 바로 불러 해당 PDF 가 줄을 서지 않고
     먼저 출발한다 (이미 시작된 건 캐시가 걸러 중복 시작 없음) */
  let preloadStarted = false;
  function preloadPdfs() {
    if (preloadStarted || location.protocol === 'file:') return;
    preloadStarted = true;
    const urls = [...document.querySelectorAll('.work .project')]
      .map(p => p.dataset.pdf).filter(Boolean);
    (async () => {
      for (const u of urls) { try { await getPdfTask(u).promise; } catch (_) { pdfCache.delete(u); } }
    })();
  }

  function clearPdf() {
    if (pdfIO) { pdfIO.disconnect(); pdfIO = null; }
    pdfTask = null;                      // 문서는 pdfCache 에 살아 있다 — destroy 금지
    pdfRerender = null;
    detailPdf.textContent = '';
  }

  async function loadPdf(url) {
    clearPdf();
    /* file:// 로 직접 열면 브라우저가 PDF fetch 를 차단한다 — 안내만 표시 */
    if (location.protocol === 'file:') {
      const p = document.createElement('p');
      p.className = 'detail__notice';
      p.textContent = 'PDF는 로컬 서버로 열어야 보입니다. 프로젝트 폴더의 "사이트 열기.bat"를 실행해 주세요.';
      detailPdf.appendChild(p);
      return;
    }
    /* 파싱을 기다리는 동안 빈 화면 대신 로딩 표시 — 첫 페이지가 그려지면 제거 */
    const notice = document.createElement('p');
    notice.className = 'detail__notice';
    notice.textContent = '불러오는 중…';
    detailPdf.appendChild(notice);

    const task = getPdfTask(url);
    pdfTask = task;
    let doc;
    try { doc = await task.promise; }
    catch (_) { pdfCache.delete(url); notice.textContent = 'PDF를 불러오지 못했습니다.'; return; }
    if (pdfTask !== task) return;                             // 로드 중 다른 PDF 로 교체됨

    /* 기본은 실제 표시 폭(뷰포트의 1303/1920) × DPR 로 렌더해 시간·메모리를 줄이고,
       확대(is-zoom) 때만 뷰포트 전체 폭으로 재렌더한다 */
    const renderW = () => window.innerWidth * (window.devicePixelRatio || 1)
                        * (detail.classList.contains('is-zoom') ? 1 : 1303 / 1920);
    const renderPage = async canvas => {
      const w = Math.round(renderW());
      if (+canvas.dataset.w >= w) return;                     // 이미 충분한 해상도
      canvas.dataset.w = w;
      const page = await doc.getPage(+canvas.dataset.page);
      if (pdfTask !== task) return;
      const vp = page.getViewport({ scale: w / page.getViewport({ scale:1 }).width });
      canvas.width  = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      if (pdfTask === task) notice.remove();                  // 첫 캔버스가 그려졌다
    };
    /* 확대 시 이미 그려진 캔버스만 고해상도로 다시 그린다 (축소해도 그대로 둔다)
       ponytail: 고해상도 캔버스를 유지해 메모리를 더 쓴다 — 문제 되면 축소 시 다운렌더 추가 */
    pdfRerender = () => detailPdf.querySelectorAll('canvas[data-w]').forEach(c => renderPage(c));

    pdfIO = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { pdfIO.unobserve(en.target); renderPage(en.target); }
    }), { root: detailPdf, rootMargin: '150% 0%' });          // 두 화면쯤 앞서 미리 그린다

    const v1 = (await doc.getPage(1)).getViewport({ scale:1 });
    if (pdfTask !== task) return;
    for (let i = 1; i <= doc.numPages; i++) {
      const c = document.createElement('canvas');
      c.className = 'detail__page';
      c.dataset.page = i;
      c.style.aspectRatio = v1.width + ' / ' + v1.height;     // 렌더 전 자리 확보
      detailPdf.appendChild(c);
      if (i <= 2) renderPage(c);                              // 첫 두 장은 IO 를 기다리지 않는다
      else pdfIO.observe(c);
    }
    detailPdf.scrollTop = 0;                                  // 항상 첫 장부터
  }

  function openDetail(proj) {
    detailTitle.textContent = proj.dataset.title || '';
    loadPdf(proj.dataset.pdf);
    detailCard.replaceChildren(proj.cloneNode(true));
    detail.classList.add('is-open');
    detail.setAttribute('aria-hidden', 'false');
  }
  function closeDetail() {
    detail.classList.remove('is-open', 'is-zoom');
    detail.setAttribute('aria-hidden', 'true');
  }

  /* 화살표 : 한 장 높이(+간격)만큼 부드럽게 스크롤 */
  const pdfStep = () => {
    const c = detailPdf.firstElementChild;
    return c ? c.getBoundingClientRect().height + (parseFloat(getComputedStyle(detailPdf).rowGap) || 0)
             : detailPdf.clientHeight;
  };
  document.getElementById('detailDown').addEventListener('click',
    () => detailPdf.scrollBy({ top:  pdfStep(), behavior:'smooth' }));
  document.getElementById('detailUp').addEventListener('click',
    () => detailPdf.scrollBy({ top: -pdfStep(), behavior:'smooth' }));

  /* 확대 : PDF 전체 화면 토글 (ESC 로 해제) — 캔버스는 그대로, CSS 만 전환 */
  function setZoom(on) {
    detail.classList.toggle('is-zoom', on);
    if (on && pdfRerender) pdfRerender();   // 확대 폭에 맞춰 고해상도 재렌더
  }
  document.getElementById('detailZoom').addEventListener('click', () => setZoom(true));
  document.querySelectorAll('.work .project').forEach(p => {
    p.addEventListener('pointerenter', () => {   // 호버한 카드의 PDF 를 우선 파싱
      if (location.protocol !== 'file:' && p.dataset.pdf) getPdfTask(p.dataset.pdf);
    });
    p.addEventListener('click', () => openDetail(p));
  });
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !detail.classList.contains('is-open')) return;
    if (detail.classList.contains('is-zoom')) setZoom(false);   // 확대만 해제 → 상세 유지
    else closeDetail();
  });
  /* 닫힘 모션이 끝나면 무거운 PDF 해제.
     e.target 검사 : 복제 카드 썸네일의 transform 전환이 퇴장 슬라이드 중에
     끝나도 PDF 가 조기에 비워지지 않게 한다 */
  detail.addEventListener('transitionend', e => {
    if (e.target === detail && e.propertyName === 'transform' && !detail.classList.contains('is-open')) {
      clearPdf();
    }
  });

  /* ---------------- 메인 루프 ---------------- */
  function loop(now) {
    requestAnimationFrame(loop);

    /* 당김 : 슬랫별 스프링 — 잡은 경계에서 먼 슬랫일수록 늦게 따라와
       천이 순서대로 끌려오는 전파 지연이 생기고, 놓으면 무른 스프링으로
       바뀌어 오버슈트하며 출렁이다가(감쇠 진동) 제자리로 돌아간다 */
    const target = press.active ? 1 : 0;
    const down   = anim.y >= tear.index * (H / N);
    pullActive   = press.active;
    for (let i = 0; i < N; i++) {
      const dist = down ? Math.max(0, i - tear.index) : Math.max(0, tear.index - 1 - i);
      const k    = (press.active ? PULL_K : REL_K) / (1 + dist * (press.active ? LAG_P : LAG_R));
      slatV[i] += (target - slatS[i]) * k;
      slatV[i] *= press.active ? PULL_D : REL_D;
      slatS[i] += slatV[i];
      if (!press.active && Math.abs(slatS[i]) < 0.001 && Math.abs(slatV[i]) < 0.001) {
        slatS[i] = 0;
        slatV[i] = 0;
      }
      if (slatS[i] !== 0 || slatV[i] !== 0) pullActive = true;
    }
    anim.x += (press.x - anim.x) * 0.34;
    anim.y += (press.y - anim.y) * 0.34;

    /* 명함 — 움직이는 동안만 스타일을 쓴다 (정지 후 한 프레임 더) */
    stepCard(now);
    const cardMoving = card.state !== 'rest';
    if (cardMoving || wasCard) drawCard();
    wasCard = cardMoving;

    /* 블라인드 */
    let blindMoving = false;
    if (blind.open !== blind.to) {
      const k = Math.min(1, (now - blind.t0) / blind.dur);
      blind.open = blind.from + (blind.to - blind.from) * easeInOut(k);
      if (k >= 1) blind.open = blind.to;
      blindMoving = true;
    }

    if (pullActive || blindMoving || wasPulling) render();   // 끝난 직후 한 프레임 더 그려 깔끔히 정리
    wasPulling = pullActive;
  }

  /* ---------------- 초기화 ---------------- */
  let rt = null;
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (stage.clientWidth !== W || stage.clientHeight !== H) build();
    }).observe(stage);
  }
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); snapAboutLines(); }, 120);
  });

  build();
  requestAnimationFrame(loop);
})();
