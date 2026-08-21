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

    for (let i = 0; i < N; i++) {
      const t  = i * pitch;
      const b  = t + slatH;
      const s  = slatS[i];
      const at = s ? shift(i, t, down, gy) * s : 0;
      const ab = s ? shift(i, b, down, gy) * s : 0;

      const topPts = edgePts(t, at, anim.x, halfW);
      const botPts = edgePts(b, ab, anim.x, halfW);
      slats[i].setAttribute('d', slatD(topPts, botPts));

      setLine(lineTop[i], topPts, t, at);
      setLine(lineBot[i], botPts, b, ab);
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
    blind.timer = setTimeout(() => tweenBlind(0, 420), 3000);  // 3초 뒤 닫힘
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
    if (press.active) { press.x = e.clientX; press.y = e.clientY; }
  }, { passive:true });

  const release = () => {
    if (!press.active) return;
    press.active = false;
    stage.classList.remove('is-pulling');
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

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
      const link = a.dataset.link;
      if (link === 'home') {                       // 워크 메뉴의 Menu 라벨 → 홈 복귀
        closeDetail();
        openWork(false);
      } else if (link === 'work') {
        if (a.closest('#workMenu')) closeDetail(); // 워크에서는 detail 만 닫고 그리드 유지
        else openWork(true);
      }
      // About / Email / Linkedin 은 이후 연결
    });
  });

  /* ---------------- WORK 화면 열기/닫기 ---------------- */
  const work = document.getElementById('work');
  function openWork(on) {
    work.classList.toggle('is-open', on);
    work.setAttribute('aria-hidden', on ? 'false' : 'true');
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
  let pdfTask = null, pdfIO = null;

  function clearPdf() {
    if (pdfIO)   { pdfIO.disconnect(); pdfIO = null; }
    if (pdfTask) { pdfTask.destroy();  pdfTask = null; }
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
    const task = pdfjsLib.getDocument(encodeURI(url));
    pdfTask = task;
    let doc;
    try { doc = await task.promise; } catch (_) { return; }   // destroy 되면 reject
    if (pdfTask !== task) return;                             // 로드 중 다른 PDF 로 교체됨

    const renderPage = async canvas => {
      const page = await doc.getPage(+canvas.dataset.page);
      if (pdfTask !== task) return;
      /* 확대(전체 화면)에서도 선명하도록 뷰포트 가로 폭 × DPR 기준으로 렌더 */
      const scale = window.innerWidth * (window.devicePixelRatio || 1)
                  / page.getViewport({ scale:1 }).width;
      const vp = page.getViewport({ scale });
      canvas.width  = vp.width;
      canvas.height = vp.height;
      page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
    };
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
      pdfIO.observe(c);
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
  }
  document.getElementById('detailZoom').addEventListener('click', () => setZoom(true));
  document.querySelectorAll('.work .project').forEach(p => {
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
    rt = setTimeout(build, 120);
  });

  build();
  requestAnimationFrame(loop);
})();
