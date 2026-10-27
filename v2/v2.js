/* =========================================================
   Ahn HyoJeoung — Portfolio v2 / Landing — DIAGNOSTIC REPORT
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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reflow = el => void el.offsetWidth;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const splitChars = (el, text) => {
    el.textContent = '';
    [...text].forEach((c, k) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.style.setProperty('--k', k); s.textContent = c;
      el.appendChild(s);
    });
    return $$('.ch', el);
  };
  const progressOf = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, in: false };
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true;
    mouse.nx = e.clientX / innerWidth * 2 - 1;
    mouse.ny = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => (mouse.in = false));

  /* ---------- 바코드 : 문자열 → 줄무늬 ---------- */
  $$('[data-barcode]').forEach(el => {
    let x = 0; const stops = [];
    [...el.dataset.barcode].forEach((c, i) => {
      const code = c.charCodeAt(0);
      [code % 3 + 1, (code >> 2) % 3 + 1, (code >> 4) % 2 + 1].forEach((w, j) => {
        const col = (j + i) % 2 ? 'transparent' : 'currentColor';
        stops.push(`${col} ${x}px ${x + w}px`); x += w;
      });
    });
    el.style.background = `linear-gradient(90deg, ${stops.join(',')}) left/${x}px 100% repeat-x`;
  });

  /* ---------- 0. 접수 : 이름 스크램블 + 스캔 라인 ---------- */
  const loader = $('.loader');
  {
    const scan = $('.loader__scan'), nameEl = $('[data-scramble]'), countEl = $('.loader__count');
    const target = nameEl.textContent, glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*/+';
    const dur = reduced ? 10 : 1700, t0 = performance.now();
    const tick = now => {
      const t = clamp((now - t0) / dur);
      const fixed = Math.floor(t * target.length);
      nameEl.textContent = [...target].map((c, i) =>
        i < fixed || c === ' ' ? c : glyphs[(Math.random() * glyphs.length) | 0]).join('');
      countEl.textContent = `${pad(Math.round(ease(t) * 100), 3)}%`;
      scan.style.setProperty('--sy', `${smooth(t) * innerHeight}px`);
      if (t < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add('is-out');
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        setTimeout(() => loader.classList.add('is-gone'), 1200);
      }, reduced ? 0 : 200);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 날짜 · 서울 시계 ---------- */
  {
    const tz = { timeZone: 'Asia/Seoul' };
    const time = new Intl.DateTimeFormat('en-GB', { ...tz, hour: '2-digit', minute: '2-digit' });
    const date = new Intl.DateTimeFormat('en-CA', { ...tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const set = () => {
      const now = new Date();
      $$('[data-clock]').forEach(t => (t.textContent = time.format(now)));
      $$('[data-date]').forEach(t => (t.textContent = date.format(now).replaceAll('-', '.')));
    };
    set(); setInterval(set, 15000);
  }

  /* ---------- 형광펜 : 보이면 칠한다 ---------- */
  {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-on'); io.unobserve(e.target); }
    }), { threshold: .8 });
    $$('mark.hl:not(.is-on)').forEach(m => io.observe(m));
  }

  /* ---------- 커서 : 십자선 + 좌표 ---------- */
  const cursor = $('.cursor'), cross = $('.cursor__cross'), ringEl = $('.cursor__ring'), coord = $('[data-coord]');
  const ring = { x: mouse.x, y: mouse.y };
  if (fine) {
    const label = $('.cursor__ring em');
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-label', !!t);
      if (t) label.textContent = t.dataset.cursor;
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  }

  /* ---------- 하단 차트 내비 ---------- */
  const pill = $('.pill'), pillBtn = $('.pill__btn'), pillLabel = $('[data-pill-label]'),
        pillPage = $('[data-pill-page]'), pillProg = $('[data-pill-progress]');
  const sections = $$('main > section');
  let currentSec = null;
  pillBtn.addEventListener('click', () => pillBtn.setAttribute('aria-expanded', pill.classList.toggle('is-open')));
  $$('.pill__menu a').forEach(a => a.addEventListener('click', () => {
    pill.classList.remove('is-open'); pillBtn.setAttribute('aria-expanded', false);
  }));
  const updatePill = () => {
    const sec = sections.findLast(s => s.getBoundingClientRect().top <= innerHeight * .5) || sections[0];
    if (sec !== currentSec) {
      currentSec = sec;
      pillLabel.textContent = sec.dataset.label; pillPage.textContent = sec.dataset.page;
      pillLabel.classList.remove('is-swap'); reflow(pillLabel); pillLabel.classList.add('is-swap');
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    pillProg.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };

  /* =========================================================
     P.01 INTAKE — 검사 시트가 한 장씩 벗겨지고, 마지막 장이 화면을 덮는다 + 엑스레이 렌즈
     ========================================================= */
  const peel = (() => {
    const sec = $('#peel'), sticky = $('.peel__sticky'), stack = $('.stack'), sheets = $$('.sheet');
    const words = $$('.peel__word'), xwords = $$('.xray__word');
    const depthEl = $('[data-depth]'), depthBar = $('[data-depth-bar]'), hint = $('.peel__hint');
    const last = sheets[sheets.length - 1];
    const tilt = { x: 0, y: 0 }, lens = { r: 0, x: innerWidth / 2, y: innerHeight / 2 };
    return () => {
      const p = progressOf(sec);
      const pf = map(p, .04, .74) * 4;                  // 벗겨진 장 수 (0→4, 소수)
      const e = ease(map(p, .78, .97));                  // 마지막 장 확장
      sheets.forEach((s, i) => {
        if (s === last) return;
        const t = clamp(pf - i), d = Math.max(0, i - pf), lift = smooth(t);
        s.style.transform =
          `translate3d(0, ${-d * 2.4 - lift * 95}vh, ${-d * 60 + lift * 120}px) rotateX(${lift * 70}deg) rotateZ(${lift * (i % 2 ? 6 : -6)}deg)`;
        s.style.opacity = 1 - map(t, .3, .8);
      });
      const dl = Math.max(0, 4 - pf);
      const cover = Math.max(innerWidth / last.offsetWidth, innerHeight / last.offsetHeight) * 1.08;
      last.style.transform = `translate3d(0, ${-dl * 2.4}vh, ${-dl * 60}px) scale(${lerp(1, cover, e)})`;
      last.style.borderRadius = `${lerp(4, 0, e)}px`;
      [...last.children].forEach(c => (c.style.opacity = 1 - map(e, 0, .35)));

      tilt.x = lerp(tilt.x, -mouse.ny * 9, .08);
      tilt.y = lerp(tilt.y, mouse.nx * 13, .08);
      stack.style.setProperty('--rx', `${tilt.x * (1 - e)}deg`);
      stack.style.setProperty('--ry', `${tilt.y * (1 - e)}deg`);

      // 단어는 바깥으로 흩어진다 (ref: Analogue) — 엑스레이 단어도 같은 자리
      const spread = ease(p);
      const tf = [
        `translate3d(${-spread * 22 + mouse.nx * -1.2}vw, ${-spread * 10}vh, 0)`,
        `translate3d(${spread * 22 + mouse.nx * 1.2}vw, 0, 0)`,
        `translate3d(${mouse.nx * -1.6}vw, ${spread * 14}vh, 0)`,
      ];
      words.forEach((w, i) => { w.style.transform = tf[i]; w.style.opacity = 1 - e; });
      xwords.forEach((w, i) => (w.style.transform = tf[i]));

      // 엑스레이 렌즈 — 히어로 위에서만 열린다
      const r = sec.getBoundingClientRect();
      const over = fine && mouse.in && r.top <= 0 && r.bottom >= innerHeight && e < .05;
      lens.r = lerp(lens.r, over ? 130 : 0, .12);
      lens.x = lerp(lens.x, mouse.x, .25); lens.y = lerp(lens.y, mouse.y, .25);
      sticky.style.setProperty('--lr', `${lens.r.toFixed(1)}px`);
      sticky.style.setProperty('--lx', `${lens.x}px`);
      sticky.style.setProperty('--ly', `${lens.y}px`);
      sticky.style.setProperty('--lo', (lens.r / 130).toFixed(2));

      depthEl.textContent = (-pf).toFixed(1).replace('-0.0', '0.0');
      depthBar.style.transform = `scaleX(${pf / 4})`;
      depthEl.parentElement.style.opacity = 1 - e;
      hint.style.opacity = 1 - map(p, .01, .05);
    };
  })();

  /* =========================================================
     P.02 PROTOCOL — 단계 4개, 표본 오브젝트가 animos 템플릿 형태로 모핑
     ========================================================= */
  const ways = (() => {
    const sec = $('#ways');
    const tabs = $$('.tab'), swap = $('[data-swap]'), scribble = $('.scribble'),
          numEl = $('[data-ways-num]'), stepEl = $('[data-ways-step]');
    const copy = $('.ways__copy'), krEl = $('[data-ways-kr]'), descEl = $('[data-ways-desc]'),
          keysEl = $('[data-ways-keys]'), proofEl = $('[data-ways-proof]');
    const spin = $('[data-obj]'), objBox = $('.obj');

    const CH = [
      { word: 'Root cause', step: 'Diagnose', kr: '진단 — 원인 설계', desc: '화면을 다시 그리기 전에, 사용자가 멈춘 지점을 먼저 찾습니다. 인터뷰와 테스트로 “왜”를 정의한 뒤에 그립니다.',
        keys: ['심층 인터뷰', 'A/B 테스트', 'UT', '문제 재정의'], proof: '혈당 원인 파악 92.5초 → 9.5초',
        form: 'ring', c: '#FF13EB', tokens: ['WHY?', 'STUCK', 'DROP', 'UT', 'A/B', 'LOG', '92.5s', 'PAIN', 'WHERE?', 'ASK'] },
      { word: 'Systemize', step: 'Prescribe', kr: '처방 — 반복의 규칙화', desc: '반복되는 작업은 규칙으로 바꿉니다. 컬러·타이포·형태 규칙을 정해 두면, 교체만으로 운영되는 구조가 됩니다.',
        keys: ['디자인 규칙', '에셋 라이브러리', '규격 표준화', '템플릿'], proof: '에셋 제작 1종당 2분 → 40초',
        form: 'grid', c: '#2D3BFF', tokens: ['RULE', 'GRID', 'TYPE', 'COLOR', '8PT', 'TOKEN', 'v1.0', 'SPEC', 'SIZE', 'KIT'] },
      { word: 'Ship it', step: 'Treat', kr: '시술 — 배포까지의 완결', desc: '설계한 것이 배포되는 데까지 함께 갑니다. 스펙 문서, 핸드오프, 구현 QA, 필요하면 코드로 직접 만듭니다.',
        keys: ['디자인 스펙', '개발 핸드오프', '구현 QA', '코드 프로토타이핑'], proof: '푸른SOL 서비스 배포 · 해커톤 혁신상',
        form: 'spiral', c: '#D6FF3B', tokens: ['SPEC', 'QA', 'PR', 'LIVE', 'v2', 'DEPLOY', 'FIX', 'SHIP', 'BUILD', 'TEST'] },
      { word: 'Delegate', step: 'Delegate', kr: '위임 — 판단은 디자이너, 실행은 AI', desc: '무엇을 만들지는 제가 판단하고, 반복 실행은 AI에게 맡깁니다. 생성형 파이프라인으로 같은 품질을 더 빠르게 냅니다.',
        keys: ['Claude', 'Cursor', 'Krea AI', '생성형 파이프라인'], proof: 'AI 파이프라인으로 그래픽 에셋 제작',
        form: 'orbit', c: '#111111', tokens: ['AI', 'CLAUDE', 'CURSOR', 'KREA', 'GEN', 'AUTO', 'AGENT', 'PROMPT', 'AI', 'RUN'] },
    ];

    const N = 40;
    const tiles = Array.from({ length: N }, (_, k) => {
      const t = document.createElement('span');
      t.className = 'tile'; t.style.setProperty('--k', k);
      spin.appendChild(t);
      return t;
    });

    // 각 형태의 타일 좌표 — R 은 오브젝트 박스 크기 기준
    const forms = {
      ring: R => tiles.map((_, i) => {
        const a = i / N * Math.PI * 2;
        return { x: Math.sin(a) * R, y: 0, z: Math.cos(a) * R, ry: a * 180 / Math.PI, rx: 0, w: 46, h: 62 };
      }),
      grid: R => tiles.map((_, i) => {
        const c = i % 8, r = Math.floor(i / 8), a = (c - 3.5) * .17;
        return { x: Math.sin(a) * R * 1.5, y: (r - 2) * 66, z: Math.cos(a) * R * 1.5 - R * 1.2, ry: a * 180 / Math.PI, rx: 0, w: 52, h: 58 };
      }),
      spiral: R => tiles.map((_, i) => {
        const a = i * .44;
        return { x: Math.sin(a) * R * .78, y: (i - N / 2) * 10.5, z: Math.cos(a) * R * .78, ry: a * 180 / Math.PI, rx: 0, w: 60, h: 40 };
      }),
      orbit: R => tiles.map((_, i) => {
        if (i === 0) return { x: 0, y: 0, z: 0, ry: 0, rx: 0, w: 92, h: 118 };
        const n = N - 1, k = i - 1;
        const y = 1 - (k / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = k * 2.39996;
        const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
        return { x: x * R, y: y * R, z: z * R, ry: Math.atan2(x, z) * 180 / Math.PI, rx: -Math.asin(y) * 180 / Math.PI, w: 40, h: 40 };
      }),
    };
    const formTilt = { ring: -16, grid: 0, spiral: 12, orbit: -8 };
    const formSway = { grid: true };

    const layout = ch => {
      const c = CH[ch], R = objBox.offsetWidth * .36;
      forms[c.form](R).forEach((f, i) => {
        const t = tiles[i];
        const center = c.form === 'orbit' && i === 0;
        const ai = c.form === 'orbit' && !center;
        t.style.transform = `translate3d(${f.x}px, ${f.y}px, ${f.z}px) rotateY(${f.ry}deg) rotateX(${f.rx}deg)`;
        t.style.setProperty('--tw', f.w + 'px'); t.style.setProperty('--th', f.h + 'px');
        t.style.setProperty('--tc', center ? '#FF13EB' : c.c);
        t.style.setProperty('--tb', center ? '#FF13EB' : ai ? '#111' : i % 6 === 3 ? c.c : '#fff');
        t.style.setProperty('--tt', ai ? '#fff' : (i % 6 === 3 && c.form !== 'spiral') ? '#fff' : '#111');
        t.textContent = center ? 'YOU — 판단' : c.tokens[i % c.tokens.length];
      });
    };

    let ch = -1, token = 0, tiltCur = -16, angle = 0;
    const setChapter = n => {
      const c = CH[n], my = ++token, first = ch === -1;
      ch = n;
      tabs.forEach((t, i) => t.classList.toggle('is-on', i === n));
      numEl.textContent = pad(n + 1, 3); stepEl.textContent = c.step;
      layout(n);
      krEl.textContent = c.kr; descEl.textContent = c.desc; proofEl.textContent = c.proof;
      keysEl.innerHTML = c.keys.map(k => `<li>${k}</li>`).join('');
      copy.classList.remove('is-fade'); reflow(copy); copy.classList.add('is-fade');
      if (first) return splitChars(swap, c.word);
      scribble.classList.remove('is-draw'); reflow(scribble); scribble.classList.add('is-draw');
      setTimeout(() => {
        if (my !== token) return;
        swap.classList.add('is-out');
        setTimeout(() => {
          if (my !== token) return;
          splitChars(swap, c.word);
          swap.classList.remove('is-out'); swap.classList.add('is-in');
          reflow(swap); swap.classList.remove('is-in');
        }, 480);
      }, 260);
    };
    addEventListener('resize', () => ch >= 0 && layout(ch));

    return (dt, inView) => {
      const n = Math.min(3, Math.floor(progressOf(sec) * 4.0001));
      if (n !== ch) setChapter(n);
      if (!inView || reduced) return;
      const form = CH[ch].form;
      tiltCur = lerp(tiltCur, formTilt[form] - mouse.ny * 6, .05);
      angle += dt * (form === 'spiral' ? .045 : .02);
      const ry = formSway[form] ? Math.sin(angle * .05) * 22 + mouse.nx * 10 : angle + mouse.nx * 14;
      spin.style.transform = `rotateX(${tiltCur}deg) rotateY(${ry}deg)`;
    };
  })();

  /* =========================================================
     P.03 VITALS — 다이얼 바늘이 되감기고, Before/After 막대가 줄어든다
     ========================================================= */
  const proof = (() => {
    const sec = $('#proof');
    const ticks = $('[data-ticks]'), arc = $('[data-arc]'), needle = $('[data-needle] i'), ghost = $('[data-ghost]'), dialLabel = $('[data-dial-label]');
    const idx = $('[data-proof-idx]'), unit = $('[data-proof-unit]'), what = $('[data-proof-what]'), val = $('[data-proof-value]'),
          delta = $('[data-proof-delta]'), src = $('[data-proof-src]'), panel = $('.proof__panel');
    const baB = $('[data-ba-before]'), baA = $('[data-ba-after]'), baBv = $('[data-ba-before-v]'), baAv = $('[data-ba-after-v]');
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, major = i % 5 === 0, r1 = major ? 168 : 174;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', 200 + Math.sin(a) * r1); l.setAttribute('y1', 200 - Math.cos(a) * r1);
      l.setAttribute('x2', 200 + Math.sin(a) * 180); l.setAttribute('y2', 200 - Math.cos(a) * 180);
      if (major) l.classList.add('is-major');
      ticks.appendChild(l);
    }
    // 심전도 — PQRST 한 박을 반복해 200% 폭으로 그리고 CSS 로 흘린다
    {
      let d = 'M0 50', x = 0;
      while (x < 1200) {
        d += ` L${x + 40} 50 L${x + 48} 44 L${x + 56} 50 L${x + 64} 50 L${x + 68} 58 L${x + 74} 8 L${x + 80} 70 L${x + 86} 50 L${x + 100} 50 L${x + 112} 40 L${x + 124} 50 L${x + 150} 50`;
        x += 150;
      }
      $('[data-ecg]').setAttribute('d', d);
    }
    const mmss = v => `${Math.floor(v / 60)}:${pad(Math.round(v % 60))}`;
    const P = [
      { unit: 'Lead time', what: '반복 에셋 제작 리드타임<br>1종당', src: 'NHN DATA · 에이스카운터 — 규칙 기반 에셋 라이브러리', label: 'SEC / ASSET',
        a: 120, b: 40, max: 120, d: 67, sign: '−', fmt: mmss, unitSfx: '%' },
      { unit: 'Time to cause', what: '혈당 원인을<br>파악하는 시간', src: '제로랩 — 데이터 시각화 UI 개선 · A/B 테스트', label: 'SEC / TASK',
        a: 92.5, b: 9.5, max: 100, d: 89, sign: '−', fmt: v => `${v.toFixed(1)}s`, unitSfx: '%' },
      { unit: 'Accuracy', what: '식품 선택<br>정확도', src: '제로랩 — 입력 간소화 UX · UT 반복 검증', label: '% CORRECT',
        a: 20, b: 100, max: 100, d: 80, sign: '+', fmt: v => `${Math.round(v)}%`, unitSfx: '%p' },
    ];
    let cur = -1;
    return () => {
      const p = progressOf(sec);
      const k = Math.min(2, Math.floor(p * 3)), q = smooth(map(p * 3 - k, .12, .8)), c = P[k];
      if (k !== cur) {
        cur = k;
        idx.textContent = `Test ${pad(k + 1)} / 03`; unit.textContent = c.unit; what.innerHTML = c.what;
        src.textContent = c.src; dialLabel.textContent = c.label;
        baB.style.width = `${c.a / c.max * 100}%`; baBv.textContent = c.fmt(c.a);
        panel.classList.remove('is-fade'); reflow(panel); panel.classList.add('is-fade');
      }
      const v = lerp(c.a, c.b, q), ang = v / c.max * 360;
      needle.style.setProperty('--a', `${ang}deg`);
      arc.style.strokeDasharray = `${ang / 3.6} 100`;
      ghost.textContent = Math.round(v);
      val.textContent = c.fmt(v);
      baA.style.width = `${v / c.max * 100}%`; baAv.textContent = c.fmt(v);
      delta.textContent = `${c.sign}${Math.round(c.d * q)}${c.unitSfx}`;
    };
  })();

  /* =========================================================
     P.04 CASE FILES — 부채꼴 케이스 차트 + 줄자 티커
     ========================================================= */
  const work = (() => {
    const sec = $('#work'), fan = $('[data-fan]'), track = $('[data-ruler]');
    const impact = $('[data-work-impact]'), role = $('[data-work-role]'), year = $('[data-work-year]'), count = $('[data-work-count]');
    const W = [
      { t: '흩어진 유입 접점을 하나의 전환 흐름으로 — 에이스카운터', c: 'NHN DATA', tick: 'Acecounter', live: false, y: '2026', bg: '#111111',
        sym: '흩어진 유입 접점 · 반복 에셋 수작업', rx: '채널 통합 유입 흐름 · 규칙 기반 에셋 라이브러리', role: '디자인 인턴 · 디자인 단독', impact: '에셋 리드타임 2분 → 40초 (−67%)' },
      { t: '단절된 장학생 네트워크를 잇다 — 푸른SOL', c: '신한장학재단', tick: 'Pureun SOL', live: false, y: '2026', bg: '#FF13EB',
        sym: '장학생 교류 단절 · 행정 부담', rx: 'O2O 커뮤니티 · OCR 비용 처리 자동화', role: '프로덕트 디자이너 · 5인 팀', impact: '해커톤 혁신상 · 서비스 배포' },
      { t: '혈당 데이터 기반 개인 맞춤 헬스케어 — 제로랩', c: 'Personal', tick: 'Zerolab', live: false, y: '2025', bg: '#2D3BFF',
        sym: '불규칙한 데이터 입력 · 원인 파악 어려움', rx: '입력 간소화 UX · 데이터 시각화 UI', role: '프로덕트 디자이너 · 개인', impact: '원인 파악 −89% · 정확도 100%' },
      { t: 'AI 기반 숏폼 콘텐츠 검색 & 아카이빙 앱', c: 'UX/UI Project', tick: 'Shortform AI', live: false, y: '2025', bg: '#D6FF3B',
        sym: '흩어진 숏폼 콘텐츠 탐색', rx: 'AI 검색 · 아카이빙 UX', role: 'UX/UI 디자인', impact: 'AI 검색 · 아카이빙 모바일 앱' },
      { t: '바이어용 제품 영상 · 국가별 릴스 쇼케이스', c: 'PYDERIN', tick: 'Pyderin', live: true, y: '2026', bg: '#D6FF3B',
        sym: '바이어별로 흩어진 제품 소개 자료', rx: '제품 영상 · 일본/대만 릴스 쇼케이스', role: '기획 · 디자인 · AI 개발', impact: '국가별 쇼케이스 운영 중' },
      { t: '병원 전용 K-뷰티 모바일 커머스', c: 'K-Derma', tick: 'K-Derma', live: true, y: '2026', bg: '#111111',
        sym: '병원 전용 구매 흐름 미정', rx: 'IA v0.4 · 구매 흐름도 · 모바일 데모', role: 'IA · 와이어프레임 · 데모', impact: '대표 검토 단계' },
      { t: '사내 업무툴 — 주간보고 · 온보딩 · 할일보드', c: 'BNK SUPERWORK', tick: 'Superwork', live: true, y: '2026', bg: '#2D3BFF',
        sym: '주간보고 · 온보딩 수작업', rx: '발표 모드 · 온보딩 빌더 · 체크리스트 보드', role: 'UI/UX · 프론트엔드', impact: '사내 적용 중' },
      { t: '코리아에이치앤비 브랜드 페이지', c: 'KOREAHNB', tick: 'Koreahnb', live: false, y: '2026', bg: '#FF13EB',
        sym: '브랜드별로 흩어진 주소', rx: '통합 브랜드 페이지 · 도메인 연결', role: '디자인 · 퍼블리싱', impact: 'koreahnb.com 오픈' },
    ];
    const cards = W.map((w, i) => {
      const el = document.createElement('article');
      el.className = 'card'; el.style.setProperty('--c', w.bg);
      el.innerHTML = `<header><span>Case ${pad(i + 1)}</span><span>${w.c}</span></header>
        <b class="card__idx">${pad(i + 1)}</b>
        <span class="stamp ${w.live ? 'is-live' : ''}">${w.live ? 'In treatment<small>진행중</small>' : 'Resolved<small>완료</small>'}</span>
        <h3>${w.t}</h3>
        <dl><div><dt>Symptom</dt><dd>${w.sym}</dd></div><div><dt>Rx</dt><dd>${w.rx}</dd></div></dl>`;
      fan.appendChild(el);
      return el;
    });
    const ticksEl = W.map(w => { const s = document.createElement('span'); s.textContent = w.tick; track.appendChild(s); return s; });
    let cur = -1;
    const set = n => {
      cur = n;
      cards.forEach((c, i) => {
        const d = i - n;
        c.className = 'card' + ({ '-2': ' is-ll', '-1': ' is-l', 0: ' is-c', 1: ' is-r', 2: ' is-rr' }[d] || (d < 0 ? ' is-ll' : ' is-rr'));
      });
      ticksEl.forEach((t, i) => t.classList.toggle('is-on', i === n));
      const a = ticksEl[n];
      track.style.transform = `translateX(${-(a.offsetLeft + a.offsetWidth / 2)}px)`;
      impact.textContent = W[n].impact; role.textContent = W[n].role; year.textContent = W[n].y;
      count.textContent = `Case ${pad(n + 1)} — ${pad(W.length)}`;
    };
    addEventListener('resize', () => cur >= 0 && set(cur));
    return () => {
      const n = Math.min(W.length - 1, Math.floor(progressOf(sec) * W.length));
      if (n !== cur) set(n);
    };
  })();

  /* =========================================================
     P.05 INSTRUMENTS — 드래그 + 관성으로 도는 라벨 구
     ========================================================= */
  const lab = (() => {
    const box = $('[data-globe]'), spin = $('[data-globe-spin]'), pick = $('[data-globe-pick]');
    const items = [
      ['TOOL', 'Figma'], ['AI', 'Claude'], ['METHOD', 'Interview'], ['TOOL', 'Illustrator'], ['AI', 'Cursor'], ['METHOD', 'A/B Test'],
      ['TOOL', 'Photoshop'], ['AI', 'Krea AI'], ['METHOD', 'UT'], ['BUILD', 'HTML/CSS/JS'], ['OUTPUT', 'IA'], ['METHOD', 'Problem framing'],
      ['BUILD', 'three.js'], ['OUTPUT', 'Wireframe'], ['BUILD', 'Firebase'], ['OUTPUT', 'Design system'], ['BUILD', 'GitHub'], ['OUTPUT', 'Spec doc'],
      ['AI', 'Gen pipeline'], ['OUTPUT', 'Hand-off'], ['METHOD', 'Data viz'], ['OUTPUT', 'QA'], ['BUILD', 'Prototype'], ['OUTPUT', 'Landing'],
      ['OUTPUT', 'Mobile app'], ['OUTPUT', 'Dashboard'], ['AI', 'Agents'], ['OUTPUT', 'Reels'], ['METHOD', 'Flow'], ['OUTPUT', 'Deck'],
      ['TOOL', 'Figma'], ['AI', 'Claude'], ['METHOD', 'Persona'], ['OUTPUT', 'Responsive'], ['BUILD', 'Motion'], ['OUTPUT', 'Template'],
    ];
    const N = items.length;
    const pts = items.map(([cat, name], i) => {
      const el = document.createElement('div');
      el.className = 'gtile' + (cat === 'AI' ? ' is-ai' : '');
      el.innerHTML = `<small>${cat}</small><span>${name}</span>`;
      spin.appendChild(el);
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      return { el, name, x: Math.cos(th) * r, y, z: Math.sin(th) * r };
    });
    const place = () => {
      const R = Math.min(box.offsetWidth, box.offsetHeight) * .38;
      pts.forEach(p => {
        const ry = Math.atan2(p.x, p.z) * 180 / Math.PI, rx = -Math.asin(p.y) * 180 / Math.PI;
        p.el.style.transform = `translate3d(${p.x * R}px, ${p.y * R}px, ${p.z * R}px) rotateY(${ry}deg) rotateX(${rx}deg)`;
      });
    };
    place(); addEventListener('resize', place);

    let rx = -12, ry = 0, vx = 0, vy = .12, drag = null, front = null;
    box.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', e => {
      if (!drag) return;
      vy = (e.clientX - drag.x) * .25; vx = -(e.clientY - drag.y) * .25;
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => (drag = null);
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);

    return (dt, inView) => {
      if (!inView) return;
      if (!drag) { vx *= .94; vy = lerp(vy, reduced ? 0 : .12, .03); }
      rx = clamp(rx + vx * dt * .06, -60, 60); ry += vy * dt * .06;
      spin.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      const a = ry * Math.PI / 180, b = rx * Math.PI / 180;
      let best = null, bz = -Infinity;
      for (const p of pts) {
        const z1 = -p.x * Math.sin(a) + p.z * Math.cos(a);
        const z2 = p.y * Math.sin(b) + z1 * Math.cos(b);
        p.el.style.opacity = .12 + .88 * smooth(map(z2, -.6, .5));
        if (z2 > bz) { bz = z2; best = p; }
      }
      if (best !== front) {
        front?.el.classList.remove('is-pick');
        best.el.classList.add('is-pick'); front = best; pick.textContent = best.name;
      }
    };
  })();

  /* =========================================================
     P.06 REFERRAL — 문장 조합 · 눈 · 이메일 복사 · 시력검사표
     ========================================================= */
  $$('.madlib__opt').forEach(b => {
    const opts = b.dataset.opts.split('|'); let i = 0;
    b.addEventListener('click', () => {
      i = (i + 1) % opts.length; b.textContent = opts[i];
      b.classList.remove('is-flip'); reflow(b); b.classList.add('is-flip');
    });
  });
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const txt = b.dataset.copy;
    try { await navigator.clipboard.writeText(txt); b.textContent = 'Copied ✓'; }
    catch { location.href = `mailto:${txt}`; }
    setTimeout(() => (b.textContent = txt), 1600);
  }));

  const eyes = $('.eyes'), pupils = $$('.eye i');
  const blink = () => {
    eyes.classList.add('is-blink');
    setTimeout(() => eyes.classList.remove('is-blink'), 140);
    setTimeout(blink, 2600 + Math.random() * 2600);
  };
  if (!reduced) setTimeout(blink, 3000);

  const stretchChars = $$('[data-stretch]').flatMap(b => splitChars(b, b.textContent));
  const contactSec = $('#contact');

  /* ---------- 루프 ---------- */
  const view = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => view.set(e.target, e.isIntersecting)), { rootMargin: '10% 0px' });
  ['#ways', '#lab', '#contact'].forEach(s => io.observe($(s)));

  let last = performance.now();
  const loop = now => {
    const dt = Math.min(50, now - last); last = now;
    if (fine) {
      ring.x = lerp(ring.x, mouse.x, .18); ring.y = lerp(ring.y, mouse.y, .18);
      cross.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      ringEl.style.transform = `translate(${ring.x}px, ${ring.y}px)`;
      coord.textContent = `X ${pad(Math.round(mouse.x), 4)} · Y ${pad(Math.round(mouse.y + scrollY), 5)}`;
    }
    updatePill();
    peel();
    ways(dt, view.get($('#ways')));
    proof();
    work();
    lab(dt, view.get($('#lab')));
    if (view.get(contactSec)) {
      pupils.forEach(p => {
        const r = p.parentElement.getBoundingClientRect();
        const dx = mouse.x - (r.left + r.width / 2), dy = mouse.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1, m = Math.min(13, d / 12);
        p.style.setProperty('--ex', `${dx / d * m}px`); p.style.setProperty('--ey', `${dy / d * m}px`);
      });
      stretchChars.forEach(c => {
        const r = c.getBoundingClientRect();
        const dx = (mouse.x - (r.left + r.width / 2)) / (innerWidth * .08);
        const dy = (mouse.y - (r.top + r.height / 2)) / (r.height * 1.4 + 1);
        c.style.setProperty('--s', 1 + .35 * Math.exp(-dx * dx - dy * dy));
      });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
