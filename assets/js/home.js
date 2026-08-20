/* =========================================================
   安曉貞 — Portfolio / HOME  interactions
   1) TOUCH IT   : 커서가 멈춰 있을 때 글자가 물결처럼 흐름
   2) 한자 호버   : 安曉貞 → 안효정 (한 글자씩 위아래로 교체)
   3) 메뉴 호버   : Work / About / Email / Linkedin 위에서 아래로
   4) 꾹 눌러 당기기 : 커서 방향으로 라인 박스가 끌려가며 안쪽이 보임
   5) 플로팅 버튼 : 블라인드가 열렸다가 3초 뒤 닫힘
   ========================================================= */
(() => {
  'use strict';

  const NS     = 'http://www.w3.org/2000/svg';
  const stage  = document.getElementById('stage');
  const svg    = document.getElementById('blind');
  const gSlats = document.getElementById('slats');
  const gLines = document.getElementById('lines');
  const menu   = document.getElementById('menu');
  const fab    = document.getElementById('fab');
  const letters= Array.from(document.querySelectorAll('.touch__l'));

  /* ---------------- 기준 수치 (피그마 1920 x 1080) ---------------- */
  const BASE_W = 1920, BASE_H = 1080;
  const ROW_H  = 90;      // 직사각형 박스 세로 90 / 가로는 화면 전체(1920)
  const OPEN_R = 0.5;     // 블라인드가 열리면 세로 45 (90의 절반)
  const OVERLAP= 0.6;     // 박스끼리 살짝 겹쳐 그려 경계 틈(안티에일리어싱) 방지

  let W = 0, H = 0, N = 12;
  const slats = [], lineTop = [], lineBot = [];

  /* ---------------- 상태 ---------------- */
  const press = { active:false, x:0, y:0 };
  const anim  = { x:0, y:0, s:0, v:0 };            // s : 당김 강도(스프링)
  const tear  = { index:0 };                       // 당길 때 벌어지는 경계선
  const blind = { open:0, from:0, to:0, t0:0, dur:1, timer:null };

  let waveAmp = 1, waveTarget = 1, lastMove = -1e9;

  const f    = n => Math.round(n * 100) / 100;
  const unit = () => Math.min(W / BASE_W, H / BASE_H);
  const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

  /* ---------------- 라인 박스 만들기 ---------------- */
  function build() {
    W = stage.clientWidth  || window.innerWidth  || BASE_W;
    H = stage.clientHeight || window.innerHeight || BASE_H;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    N = Math.max(4, Math.round(H / (ROW_H * unit())));

    gSlats.textContent = '';
    gLines.textContent = '';
    slats.length = lineTop.length = lineBot.length = 0;

    for (let i = 0; i < N; i++) {
      const slat = document.createElementNS(NS, 'path');
      slat.setAttribute('fill', '#FFFFFF');
      gSlats.appendChild(slat);
      slats.push(slat);

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
      - 아래로 끌면 : 그 아래쪽 박스들이 커서까지 밀려 내려가 쌓이고
      - 위로 끌면   : 그 위쪽 박스들이 커서까지 밀려 올라가 쌓인다
     => 잡은 경계선이 벌어지면서 그 사이로 안쪽(이미지)이 보인다.
     좌우 끝은 0, 커서 x 에서 최대가 되는 V(텐트) 모양으로 변형된다.      */
  function shift(i, y, downward) {
    const cy = anim.y;
    if (downward) { if (i >= tear.index) return Math.max(y, cy) - y; }
    else          { if (i <  tear.index) return Math.min(y, cy) - y; }
    return 0;
  }

  function setLine(el, y, a) {
    if (Math.abs(a) < 0.4 && (y <= 0.6 || y >= H - 0.6)) { el.removeAttribute('d'); return; }
    el.setAttribute('d', 'M0 ' + f(y) + 'L' + f(anim.x) + ' ' + f(y + a) + 'L' + f(W) + ' ' + f(y));
  }

  /* ---------------- 그리기 ---------------- */
  function render() {
    const closed = H / N;
    const slatH  = closed * (1 - OPEN_R * blind.open);   // 세로가 점점 짧아진다
    const pitch  = N > 1 ? (H - slatH) / (N - 1) : closed;
    const cx     = f(anim.x);
    const s      = anim.s;
    const down   = anim.y >= tear.index * pitch;

    const mode = s ? 'geometricPrecision' : 'crispEdges';
    if (gLines.getAttribute('shape-rendering') !== mode) gLines.setAttribute('shape-rendering', mode);

    for (let i = 0; i < N; i++) {
      const t  = i * pitch;
      const b  = t + slatH;
      const at = s ? shift(i, t, down) * s : 0;
      const ab = s ? shift(i, b, down) * s : 0;

      slats[i].setAttribute('d',
        'M0 ' + f(t) + 'L' + cx + ' ' + f(t + at) + 'L' + f(W) + ' ' + f(t) +
        'L' + f(W) + ' ' + f(b + OVERLAP) + 'L' + cx + ' ' + f(b + ab + OVERLAP) + 'L0 ' + f(b + OVERLAP) + 'Z');

      setLine(lineTop[i], t, at);
      setLine(lineBot[i], b, ab);
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
    anim.v  = 0;
    tear.index = Math.min(N, Math.max(0, Math.round(e.clientY / (H / N))));
    stage.classList.add('is-pulling');
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });

  window.addEventListener('pointermove', e => {
    if (press.active) { press.x = e.clientX; press.y = e.clientY; }
    waveTarget = 0;
    lastMove = performance.now();
  }, { passive:true });

  const release = () => {
    if (!press.active) return;
    press.active = false;
    stage.classList.remove('is-pulling');
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

  /* ---------------- 메뉴 호버 ---------------- */
  let menuTimer = null;
  menu.addEventListener('pointerover', () => {
    clearTimeout(menuTimer);
    menu.classList.add('is-open');
  });
  menu.addEventListener('pointerleave', () => {
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => menu.classList.remove('is-open'), 40);
  });
  menu.querySelectorAll('a[data-link]').forEach(a => {
    a.addEventListener('click', e => e.preventDefault());   // 세부 페이지는 이후 연결
  });

  /* ---------------- 메인 루프 ---------------- */
  function loop(now) {
    requestAnimationFrame(loop);
    const t = now / 1000;

    /* 당김 : 스프링으로 붙고, 놓으면 탄력있게 되돌아간다 */
    const target = press.active ? 1 : 0;
    anim.v += (target - anim.s) * 0.30;
    anim.v *= 0.70;
    anim.s += anim.v;
    if (!press.active && Math.abs(anim.s) < 0.001 && Math.abs(anim.v) < 0.001) {
      anim.s = 0;
      anim.v = 0;
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

    if (anim.s !== 0 || blindMoving) render();

    /* TOUCH IT 물결 : 커서가 멈춰 있을 때만 */
    if (now - lastMove > 900) waveTarget = 1;
    waveAmp += (waveTarget - waveAmp) * 0.07;
    const A = 0.11 * 70 * unit();          // 물결 진폭
    for (let i = 0; i < letters.length; i++) {
      const y = Math.sin((t * 0.85 - i * 0.09) * Math.PI * 2) * A * waveAmp;
      letters[i].style.transform = 'translateY(' + y.toFixed(2) + 'px)';
    }
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
