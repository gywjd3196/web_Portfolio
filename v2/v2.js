/* =========================================================
   Ahn HyoJeoung — Portfolio v2 / Landing
   라이브러리 없이 바닐라 JS. 스크롤 진행도(p 0→1)를 섹션마다 계산해 각 update 로 넘긴다.
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, a, b) => clamp((v - a) / (b - a));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const smooth = t => t * t * (3 - 2 * t);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const progressOf = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };
  const onView = (el, fn, threshold = .45) => new IntersectionObserver(es => es.forEach(e => fn(e.isIntersecting)), { threshold }).observe(el);

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, in: false };
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true;
    mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => (mouse.in = false));

  /* ---------- 서울 시계 · 이메일 복사 ---------- */
  {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
    const set = () => $$('[data-clock]').forEach(t => (t.textContent = fmt.format(new Date())));
    set(); setInterval(set, 15000);
  }
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const txt = b.dataset.copy, label = b.innerHTML;
    try { await navigator.clipboard.writeText(txt); b.textContent = 'Copied ✓'; }
    catch { location.href = `mailto:${txt}`; }
    setTimeout(() => (b.innerHTML = label), 1600);
  }));

  /* ---------- 내비 : 배경 · 현재 섹션 ---------- */
  const nav = $('.nav'), navLinks = $$('.nav__links a');
  const updateNav = () => {
    nav.classList.toggle('is-solid', scrollY > innerHeight * .8);
    let cur = 'home';
    $$('main > section').forEach(s => { if (s.getBoundingClientRect().top <= innerHeight * .4) cur = s.id; });
    navLinks.forEach(a => a.classList.toggle('is-on', a.hash === `#${cur}`));
  };

  /* =========================================================
     HOME — 검사 시트가 한 장씩 벗겨지고 + 엑스레이 렌즈
     ========================================================= */
  const home = (() => {
    const sec = $('#home'), sticky = $('.home__sticky'), stack = $('.stack'), sheets = $$('.sheet');
    const mark = $('[data-split]'), depth = $('[data-depth]');
    mark.innerHTML = [...mark.textContent].map((c, k) => `<span class="ch" style="--k:${k}">${c}</span>`).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => sticky.classList.add('is-in')));
    const tilt = { x: 0, y: 0 }, lens = { r: 0, x: innerWidth / 2, y: innerHeight / 2 };
    const LAST = sheets.length - 1;
    return () => {
      const p = progressOf(sec);
      const pf = map(p, .04, .86) * LAST;               // 벗겨진 장 수 (0→4, 소수)
      sheets.forEach((s, i) => {
        if (i === LAST) {
          const d = LAST - pf;
          s.style.transform = `translate3d(0, ${-d * 2.2}vh, ${-d * 50}px)`;
          return;
        }
        const t = clamp(pf - i), d = Math.max(0, i - pf), lift = smooth(t);
        s.style.transform = `translate3d(0, ${-d * 2.2 - lift * 90}vh, ${-d * 50 + lift * 120}px) rotateX(${lift * 64}deg) rotateZ(${lift * (i % 2 ? 7 : -7)}deg)`;
        s.style.opacity = 1 - map(t, .35, .85);
      });
      depth.textContent = `L0${Math.min(LAST, Math.round(pf)) + 1}`;

      tilt.x = lerp(tilt.x, -mouse.ny * 8, .07); tilt.y = lerp(tilt.y, mouse.nx * 12, .07);
      stack.style.setProperty('--rx', `${tilt.x}deg`); stack.style.setProperty('--ry', `${tilt.y}deg`);

      const r = sec.getBoundingClientRect();
      const over = fine && mouse.in && r.top <= 1 && r.bottom >= innerHeight;
      lens.r = lerp(lens.r, over ? 120 : 0, .12);
      lens.x = lerp(lens.x, mouse.x, .25); lens.y = lerp(lens.y, mouse.y, .25);
      sticky.style.setProperty('--lr', `${lens.r.toFixed(1)}px`);
      sticky.style.setProperty('--lx', `${lens.x}px`); sticky.style.setProperty('--ly', `${lens.y}px`);
      sticky.style.setProperty('--lo', (lens.r / 120).toFixed(2));
    };
  })();

  /* =========================================================
     WORK — 타일마다 작은 인터랙션 (보이면 재생, 호버하면 다시)
     ========================================================= */
  {
    // 01 다이얼 2:00 → 0:40
    const tile = $('[data-tile="dial"]'), g = $('.dial__ticks', tile), needle = $('.dial__needle', tile), arc = $('.dial__arc', tile), read = $('[data-dial]', tile);
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 80 : 74;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', 100 + Math.sin(a) * r1); l.setAttribute('y1', 100 - Math.cos(a) * r1);
      l.setAttribute('x2', 100 + Math.sin(a) * 84); l.setAttribute('y2', 100 - Math.cos(a) * 84);
      g.appendChild(l);
    }
    let raf;
    const run = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now(), dur = reduced ? 1 : 1800;
      const step = now => {
        const q = ease(clamp((now - t0) / dur)), v = lerp(120, 40, q), ang = v / 120 * 360;
        needle.style.setProperty('--a', `${ang}deg`);
        arc.style.setProperty('--arc', ang / 3.6);
        read.textContent = `${Math.floor(v / 60)}:${pad(Math.round(v % 60))}`;
        if (q < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    onView(tile, v => v && run()); tile.addEventListener('pointerenter', run);
  }
  {
    // 02 혈당 차트 그리기
    const tile = $('[data-tile="chart"]'), line = $('.chart__line', tile);
    const run = () => {
      line.style.transition = 'none'; line.style.setProperty('--draw', 1); line.getBoundingClientRect();
      line.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1)'; line.style.setProperty('--draw', 0);
    };
    onView(tile, v => v && run()); tile.addEventListener('pointerenter', run);
  }
  onView($('.mini--tree'), v => $('.mini--tree').classList.toggle('is-on', v));
  {
    // 07 체크리스트가 하나씩 체크된다
    const items = $$('.mini--check li'); let timer, k = 0;
    const tick = () => {
      if (k === items.length) { items.forEach(i => i.classList.remove('is-done')); k = 0; }
      else items[k++].classList.add('is-done');
      timer = setTimeout(tick, k === items.length ? 1800 : 650);
    };
    onView($('[data-tile="check"]'), v => { clearTimeout(timer); if (v) tick(); });
  }
  {
    // 08 도메인 타이핑
    const el = $('[data-type]'), word = el.dataset.type; let timer, i = 0, dir = 1;
    const type = () => {
      i += dir; el.textContent = word.slice(0, i);
      if (i === word.length) dir = -1; else if (i === 0) dir = 1;
      timer = setTimeout(type, i === word.length ? 2200 : dir > 0 ? 110 : 45);
    };
    onView($('[data-tile="url"]'), v => { clearTimeout(timer); if (v) { i = 0; dir = 1; type(); } });
  }

  /* ---------- METHOD — 캐러셀 화살표 + 돋보기 도착 지점 ---------- */
  {
    const rail = $('[data-rail]');
    $$('[data-step]').forEach(b => b.addEventListener('click', () =>
      rail.scrollBy({ left: +b.dataset.step * ($('.way').offsetWidth + 12), behavior: 'smooth' })));
    const art = $('.art--scan'), place = () => {
      const dot = art.children[5], a = art.getBoundingClientRect(), d = dot.getBoundingClientRect();
      art.style.setProperty('--found', `translate(${d.left - a.left + d.width / 2 - 43}px, ${d.top - a.top + d.height / 2 - 43}px)`);
    };
    place(); addEventListener('resize', place);
  }

  /* =========================================================
     TOOLKIT — 스크롤하면 가운데에서 도구 칩이 흩어진다
     ========================================================= */
  const toolkit = (() => {
    const sec = $('#toolkit'), box = $('[data-chips]');
    const T = [
      ['TOOL', 'Figma', -36, -30], ['AI', 'Claude', 30, -32], ['METHOD', 'Interview', -42, 4], ['AI', 'Cursor', 40, 2],
      ['TOOL', 'Illustrator', -24, -40], ['METHOD', 'A/B Test', 20, -42], ['AI', 'Krea AI', -32, 30], ['BUILD', 'Code prototype', 28, 30],
      ['METHOD', 'UT', -12, 40], ['OUTPUT', 'IA', 12, 41], ['TOOL', 'Photoshop', -45, -14], ['OUTPUT', 'Design system', 43, -16],
      ['OUTPUT', 'Hand-off', -44, 20], ['OUTPUT', 'QA', 45, 18], ['BUILD', 'Firebase', -6, -44], ['AI', 'Gen pipeline', 5, 46],
    ];
    const chips = T.map(([cat, name, x, y], i) => {
      const el = document.createElement('div');
      el.className = 'chip' + (cat === 'AI' ? ' is-ai' : '');
      el.innerHTML = `<small>${cat}</small>${name}`;
      box.appendChild(el);
      return { el, x, y, rot: rand(-10, 10), delay: (i % 8) * .03 };
    });
    return () => {
      const p = progressOf(sec), sx = innerWidth < 700 ? .72 : 1;
      chips.forEach(c => {
        const q = ease(map(p, .08 + c.delay, .6 + c.delay));
        c.el.style.transform = `translate(-50%, -50%) translate(${c.x * q * sx}vw, ${c.y * q}vh) rotate(${c.rot * q}deg) scale(${lerp(.5, 1, q)})`;
        c.el.style.opacity = map(q, 0, .25);
      });
    };
  })();

  /* =========================================================
     CONTACT — 바코드 스캐너가 커서를 따라다니고, 누르고 있으면 명함이 쏟아진다
     ========================================================= */
  const contact = (() => {
    const sec = $('#contact'), gun = $('[data-scanner]'), muzzle = $('.scanner__muzzle'), flyer = $('[data-flyer]'), issued = $('[data-issued]');
    const FRONT = encodeURI('../assets/img/명함_앞면.png'), BACK = encodeURI('../assets/img/명함_뒷면.png');
    [FRONT, BACK].forEach(src => (new Image().src = src));
    const GRIP = { x: .38, y: .86 };            // 손잡이 위치 (스캐너 박스 비율) — 커서가 여기를 잡는다
    const BASE = -24;                            // 기본 조준 각도
    const pos = { x: 0, y: 0, a: BASE, ready: false };
    const cards = [];
    let firing = false, acc = 0, count = 0, inView = false;
    gun.style.transformOrigin = `${GRIP.x * 100}% ${GRIP.y * 100}%`;

    const spawn = () => {
      if (cards.length > 90) cards.shift().el.remove();
      const m = muzzle.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'bcard';
      el.innerHTML = `<img src="${FRONT}" alt=""><img src="${BACK}" alt="">`;
      flyer.appendChild(el);
      const ang = (pos.a + rand(-18, 8)) * Math.PI / 180, sp = rand(16, 25);
      cards.push({
        el, x: m.left - 84, y: m.top - 46, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        rx: rand(-20, 20), ry: rand(-30, 30), rz: pos.a + rand(-20, 20),
        vrx: rand(-9, 9), vry: rand(-14, 14), vrz: rand(-7, 7), ph: rand(0, 6.28), t: 0,
      });
      issued.textContent = pad(++count, 3);
      gun.classList.remove('is-kick'); void gun.offsetWidth; gun.classList.add('is-kick');
    };

    const isUI = e => e.target.closest('a, button');
    sec.addEventListener('pointerdown', e => {
      if (isUI(e)) return;
      if (!fine) { for (let i = 0; i < 7; i++) setTimeout(spawn, i * 60); return; }
      firing = true; acc = 999; gun.classList.add('is-firing');
    });
    addEventListener('pointerup', () => { firing = false; gun.classList.remove('is-firing'); });
    onView(sec, v => { inView = v; sec.classList.toggle('is-armed', v && fine); }, .25);

    return dt => {
      const k = dt / 16.67;
      if (inView) {
        const r = sec.getBoundingClientRect(), w = gun.offsetWidth, h = gun.offsetHeight;
        let tx, ty;
        if (fine && mouse.in) { tx = mouse.x - r.left - w * GRIP.x; ty = mouse.y - r.top - h * GRIP.y; }
        else { tx = r.width - w - 40; ty = Math.min(r.height, innerHeight) - h - 90; }
        if (!pos.ready) { pos.x = tx; pos.y = ty; pos.ready = true; }
        const vx = tx - pos.x;
        pos.x = lerp(pos.x, tx, .28); pos.y = lerp(pos.y, ty, .28);
        pos.a = lerp(pos.a, BASE + clamp(vx * .25, -14, 14), .15);
        gun.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${pos.a}deg)`;
        if (firing) { acc += dt; while (acc >= 95) { spawn(); acc -= 95; } }
      }
      // 종이처럼 — 쏘아진 뒤 공기저항으로 느려지고, 팔랑이며 떨어진다
      for (let i = cards.length - 1; i >= 0; i--) {
        const c = cards[i];
        c.t += dt;
        c.vx *= Math.pow(.972, k); c.vy *= Math.pow(.972, k);
        c.vy += .3 * k;
        c.vx += Math.sin(c.t * .006 + c.ph) * .12 * k;
        if (c.vy > 3.4) c.vy = lerp(c.vy, 3.4, .12);
        c.x += c.vx * k; c.y += c.vy * k;
        c.vrx *= Math.pow(.985, k); c.vry *= Math.pow(.985, k); c.vrz *= Math.pow(.985, k);
        c.rx += (c.vrx + Math.sin(c.t * .004 + c.ph) * 1.6) * k;
        c.ry += (c.vry + Math.cos(c.t * .005 + c.ph) * 1.2) * k;
        c.rz += c.vrz * k;
        c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg)`;
        if (c.y > innerHeight + 160 || c.x > innerWidth + 260 || c.x < -400) { c.el.remove(); cards.splice(i, 1); }
      }
    };
  })();

  /* ---------- 루프 ---------- */
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(50, now - last); last = now;
    updateNav();
    home();
    toolkit();
    contact(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
