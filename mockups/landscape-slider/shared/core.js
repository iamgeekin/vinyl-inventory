/*
 * What every option shares: sorting, focus, colour from the cover, and gestures.
 * The colour rules are copied from src/theme/color.ts and palette.ts.
 */
window.Deck = (() => {
  /* ---------- Colour ---------- */
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
  const mix = (from, to, amount) => { const t = rgb(to); return toHex(rgb(from).map((c, i) => c + (t[i] - c) * amount)); };
  const linear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const curved = (c) => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
  const luminance = (h) => { const [r, g, b] = rgb(h).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [l, d] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l + 0.05) / (d + 0.05); };
  function toOklch(hex) {
    const [r, g, b] = rgb(hex).map(linear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(A, B), Math.atan2(B, A)];
  }
  function linearRgb(L, C, h) {
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  function fromOklch(L, C, h) {
    const light = Math.min(1, Math.max(0, L));
    const shows = (c) => linearRgb(light, c, h).every((v) => v >= -0.0005 && v <= 1.0005);
    let chroma = C;
    if (!shows(chroma)) {
      let low = 0, high = C;
      for (let i = 0; i < 24; i++) { const mid = (low + high) / 2; if (shows(mid)) low = mid; else high = mid; }
      chroma = low;
    }
    return toHex(linearRgb(light, chroma, h).map((c) => curved(Math.min(1, Math.max(0, c)))));
  }
  const relight = (hex, L) => { const [l, c, h] = toOklch(hex); return Math.abs(L - l) < 0.001 ? hex : fromOklch(L, c, h); };
  function readable(colour, step, backgrounds, min) {
    const passes = (c) => backgrounds.every((bg) => contrast(c, bg) >= min);
    if (passes(colour)) return colour;
    for (let l = toOklch(colour)[0] + step * 0.01; l > 0 && l < 1; l += step * 0.01) { const c = relight(colour, l); if (passes(c)) return c; }
    return step > 0 ? '#ffffff' : '#000000';
  }
  function themeFor(main, pop, mode) {
    const [l, chroma, hue] = toOklch(main);
    const light = mode === 'light', night = mode === 'night';
    const strength = Math.min(1, chroma / 0.12);
    const L = light ? Math.min(0.95, Math.max(0.93 - 0.13 * strength, l)) : night ? Math.min(0.14 + 0.09 * strength, l * 0.8) : Math.min(0.26 + 0.18 * strength, l);
    const bg = relight(main, L);
    const surface = light ? mix(bg, '#ffffff', 0.5) : L > 0.32 ? mix(bg, '#000000', 0.18) : mix(bg, '#ffffff', night ? 0.05 : 0.09);
    const backs = [bg, surface], toward = light ? -1 : 1;
    const text = readable(light ? fromOklch(0.22, Math.min(chroma, 0.05), hue) : night ? mix(mix(bg, '#ffe2bd', 0.82), '#000000', 0.16) : fromOklch(0.97, Math.min(chroma, 0.02), hue), toward, backs, light ? 9 : 4.6);
    const fill = night ? mix(pop, '#000000', 0.25) : pop;
    return {
      bg, surface,
      line: mix(bg, light ? '#000000' : '#ffffff', light ? 0.1 : night ? 0.08 : 0.13),
      'line-strong': mix(bg, light ? '#000000' : '#ffffff', light ? 0.2 : night ? 0.16 : 0.25),
      text, muted: readable(mix(text, bg, 0.22), toward, backs, 4.6),
      accent: readable(fill, toward, backs, 4.6), fill,
      'fill-ink': contrast(bg, fill) >= 4.6 ? bg : contrast('#000000', fill) > contrast('#ffffff', fill) ? '#000000' : '#ffffff',
      glow: night ? mix(pop, '#000000', 0.45) : pop,
      art: night ? 'brightness(0.72) saturate(0.9)' : 'none',
    };
  }
  const inkOn = (hex) => (contrast(hex, '#000000') > contrast(hex, '#ffffff') ? '#0c0c0f' : '#ffffff');

  const DISCS = [[/clear/i, '#b9c9cc'], [/white/i, '#e8e4d8'], [/red/i, '#b3261e'], [/orange/i, '#e07b24'], [/green/i, '#2f7d4a'], [/blue/i, '#2f86a6'], [/purple/i, '#6b48b0'], [/pink/i, '#d7788f'], [/smoke/i, '#8f8f98']];
  const discColor = (r) => (DISCS.find(([p]) => p.test(r.vinyl)) || [0, '#202026'])[1];
  const grooves = (c) => `repeating-radial-gradient(circle, ${c} 0 2px, color-mix(in srgb, ${c} 80%, #fff) 2px 3px, ${c} 3px 5px)`;
  const discHtml = (r, extra = '') => `<span class="disc ${extra}" style="--label:${r.pop}" aria-hidden="true"><i style="background:${grooves(discColor(r))}"></i></span>`;

  /* ---------- Sorting ---------- */
  const SORTS = { artist: 'Artist', title: 'Title', year: 'Year', purchased: 'Bought', price: 'Price' };
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const artistKey = (r) => r.artist.replace(/^(the|a|an)\s+/i, '');
  const byArtist = (a, b) => collator.compare(artistKey(a), artistKey(b)) || a.year - b.year;
  const COMPARE = {
    artist: byArtist,
    title: (a, b) => collator.compare(a.title, b.title) || byArtist(a, b),
    year: (a, b) => b.year - a.year || byArtist(a, b),
    purchased: (a, b) => b.bought.localeCompare(a.bought),
    price: (a, b) => b.price - a.price || byArtist(a, b),
  };
  const money = (n) => '$' + n.toFixed(2);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthYear = (d) => `${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  const dateText = (d) => `${+d.slice(8, 10)} ${monthYear(d)}`;
  /** Where a record sits in the order, as the app words it. */
  const mark = (r, key = state.sort) =>
    key === 'artist' ? artistKey(r)[0].toUpperCase() : key === 'title' ? r.title[0].toUpperCase()
      : key === 'year' ? String(r.year) : key === 'price' ? money(r.price) : monthYear(r.bought);
  /** The coarser group a record is filed under, for dividers, towers and indexes. */
  const bucket = (r, key = state.sort) => {
    if (key === 'price') { const low = Math.floor(r.price / 10) * 10; return `$${low}+`; }
    if (key === 'purchased') return `Q${Math.ceil(+r.bought.slice(5, 7) / 3)} ’${r.bought.slice(2, 4)}`;
    return mark(r, key);
  };

  /* ---------- State ---------- */
  const query = new URLSearchParams(location.search);
  const state = {
    sort: COMPARE[query.get('sort')] ? query.get('sort') : 'artist',
    mode: ['light', 'dark', 'night'].includes(query.get('mode')) ? query.get('mode') : 'dark',
    list: [], index: 0, p: 0,
  };
  const listeners = { frame: [], focus: [], sort: [] };
  const on = (name, fn) => listeners[name].push(fn);
  const emit = (name) => listeners[name].forEach((fn) => fn(state));
  const record = () => state.list[state.index];
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
  const resort = () => { state.list = [...window.RECORDS].sort(COMPARE[state.sort]); };

  function applyTheme() {
    const r = record(), theme = themeFor(r.spine, r.pop, state.mode), root = document.documentElement;
    for (const [name, value] of Object.entries(theme)) root.style.setProperty('--' + name, value);
    root.dataset.mode = state.mode;
  }

  /** Fills the title, the info lines and the arrows that any option marks up. */
  function paint() {
    const r = record(), n = state.list.length, i = state.index;
    const set = (field, html) => document.querySelectorAll(`[data-f="${field}"]`).forEach((el) => (el.innerHTML = html));
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    set('title', esc(r.title));
    set('artist', esc(r.artist));
    set('count', `${i + 1} of ${n}`);
    set('mark', esc(mark(r)));
    set('year', r.year);
    set('price', money(r.price));
    set('bought', dateText(r.bought));
    set('genre', r.genre);
    set('edition', esc(r.edition || (r.discs > 1 ? `${r.discs} discs` : '')));
    set('meta', `${esc(r.artist)} · ${r.year}${r.edition ? ` · <span class="accent">${esc(r.edition)}</span>` : ''} · ${money(r.price)}`);
    set('first', esc(mark(state.list[0])));
    set('last', esc(mark(state.list[n - 1])));
    document.querySelectorAll('[data-step]').forEach((b) => (b.disabled = i + +b.dataset.step < 0 || i + +b.dataset.step >= n));
    const live = document.getElementById('live');
    if (live) live.textContent = `${r.title} by ${r.artist}, ${i + 1} of ${n}`;
  }

  function setP(p) {
    state.p = clamp(p, -0.35, state.list.length - 0.65);
    const index = clamp(Math.round(state.p), 0, state.list.length - 1);
    const changed = index !== state.index;
    state.index = index;
    if (changed) { applyTheme(); paint(); emit('focus'); if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(4); }
    emit('frame');
  }

  let animation = 0;
  const stop = () => cancelAnimationFrame(animation);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Eases the position to a record. */
  function go(to, speed = 110) {
    stop();
    const target = clamp(Math.round(to), 0, state.list.length - 1);
    if (reduced || document.hidden) return setP(target);
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(48, Math.max(1, now - last));
      last = now;
      const next = state.p + (target - state.p) * (1 - Math.exp(-dt / speed));
      if (Math.abs(target - next) < 0.004) return setP(target);
      setP(next);
      animation = requestAnimationFrame(step);
    };
    animation = requestAnimationFrame(step);
  }

  function setSort(sort) {
    const id = record().id;
    stop();
    state.sort = sort;
    resort();
    state.index = state.list.findIndex((r) => r.id === id);
    state.p = state.index;
    document.querySelectorAll('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.sort === sort));
    paint();
    emit('sort');
    emit('frame');
  }

  /* ---------- Chrome ---------- */
  const ICONS = {
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M19 5l-1.500 1.500M6.500 17.500L5 19"/>',
    dark: '<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z"/>',
    night: '<path d="M18 15.500A8 8 0 0 1 8.500 6a8 8 0 1 0 9.500 9.500z" fill="currentColor"/><path d="M17 3v5M14.500 5.500h5"/>',
  };
  const ARROWS = { '-1': '<path d="M14 6l-6 6 6 6"/>', 1: '<path d="M10 6l6 6-6 6"/>' };

  let toastTimer;
  function toast(text) {
    const el = document.querySelector('.toast');
    el.textContent = text;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 1800);
  }
  const open = (r = record()) => toast(`Opens the page for “${r.title}”`);

  /**
   * Dragging with momentum. `perItem` is how far a finger travels for one record;
   * dragging towards negative x or y moves forward unless `reverse` is set.
   */
  function drag(el, { axis = 'x', perItem = 40, reverse = false, momentum = 150, onTap } = {}) {
    let g = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      stop();
      const at = axis === 'x' ? e.clientX : e.clientY;
      g = { at, from: state.p, last: at, time: e.timeStamp, v: 0, moved: false, target: e.target, held: false };
      g.hold = setTimeout(() => {
        if (!g || g.moved) return;
        g.held = true;
        const id = g.target.closest('[data-id]')?.dataset.id;
        if (id) toast(`Menu: Open · Edit · Delete “${window.RECORDS.find((r) => r.id === id).title}”`);
      }, 550);
    });
    el.addEventListener('pointermove', (e) => {
      if (!g) return;
      if (e.pointerType === 'mouse' && !e.buttons) { clearTimeout(g.hold); g = null; return; }
      const at = axis === 'x' ? e.clientX : e.clientY;
      const delta = (at - g.at) * (reverse ? 1 : -1);
      if (!g.moved) {
        if (Math.abs(at - g.at) < 6) return;
        g.moved = true;
        clearTimeout(g.hold);
        el.setPointerCapture(e.pointerId);
      }
      const dt = Math.max(1, e.timeStamp - g.time);
      g.v = 0.7 * (((at - g.last) * (reverse ? 1 : -1)) / dt) + 0.3 * g.v;
      g.last = at;
      g.time = e.timeStamp;
      setP(g.from + delta / perItem);
    });
    const end = (e) => {
      if (!g) return;
      const done = g;
      g = null;
      clearTimeout(done.hold);
      if (done.moved) {
        const flung = e.timeStamp - done.time < 80 ? (done.v * momentum) / perItem : 0;
        go(state.p + flung, 90 + Math.min(220, Math.abs(flung) * 30));
      } else if (e.type === 'pointerup' && !done.held && onTap) onTap(done.target, e);
      else go(state.p);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dragstart', (e) => e.preventDefault());
    // So that a mouse wheel or trackpad works when trying the mockup on a computer.
    let idle, sum = null;
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      stop();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      sum = clamp((sum ?? state.p) + d / 90, 0, state.list.length - 1);
      setP(sum);
      clearTimeout(idle);
      idle = setTimeout(() => { sum = null; go(state.p); }, 140);
    }, { passive: false });
  }

  /** Wires a bar that jumps straight to a position: `toP` maps the pointer to a record. */
  function scrub(el, toP, { onStart, onEnd } = {}) {
    let active = false;
    const move = (e) => { stop(); setP(clamp(toP(e), 0, state.list.length - 1)); };
    el.addEventListener('pointerdown', (e) => { active = true; el.setPointerCapture(e.pointerId); el.classList.add('is-scrubbing'); onStart?.(); move(e); });
    el.addEventListener('pointermove', (e) => active && move(e));
    const end = () => { if (!active) return; active = false; el.classList.remove('is-scrubbing'); onEnd?.(); go(state.p); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function start({ focus = 'night-tides' } = {}) {
    resort();
    const wanted = query.get('r') || focus;
    state.index = Math.max(0, state.list.findIndex((r) => r.id === wanted));
    state.p = state.index;

    document.querySelectorAll('[data-sorts]').forEach((el) => {
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', 'Sort by');
      el.innerHTML = Object.entries(SORTS).map(([k, label]) => `<button type="button" data-sort="${k}" aria-pressed="${k === state.sort}">${label}</button>`).join('');
      el.addEventListener('click', (e) => e.target.dataset.sort && setSort(e.target.dataset.sort));
    });
    document.querySelectorAll('[data-mode]').forEach((b) => {
      if (b === document.documentElement) return;
      const draw = () => { b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[state.mode]}</svg>`; b.setAttribute('aria-label', `Appearance: ${state.mode}. Change it`); };
      draw();
      b.addEventListener('click', () => { state.mode = { light: 'dark', dark: 'night', night: 'light' }[state.mode]; applyTheme(); draw(); });
    });
    document.querySelectorAll('[data-step]').forEach((b) => {
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ARROWS[b.dataset.step]}</svg>`;
      b.setAttribute('aria-label', b.dataset.step < 0 ? 'Previous record' : 'Next record');
      b.addEventListener('click', () => go(state.index + +b.dataset.step));
    });
    document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => open()));
    document.body.insertAdjacentHTML('beforeend', '<div class="toast" role="status"></div><p class="sr" id="live" aria-live="polite"></p><div class="turn-hint">This mockup is for a phone held sideways.<br>Turn the phone, or widen the window.</div>');
    addEventListener('keydown', (e) => {
      const to = { ArrowLeft: state.index - 1, ArrowUp: state.index - 1, ArrowRight: state.index + 1, ArrowDown: state.index + 1, Home: 0, End: state.list.length - 1 }[e.key];
      if (to !== undefined) { e.preventDefault(); go(to); }
      else if (e.key === 'Enter' && e.target === document.body) open();
    });
    addEventListener('resize', () => { emit('sort'); emit('frame'); });
    applyTheme();
    paint();
    emit('sort');
    emit('frame');
  }

  return { state, on, start, go, setP, setSort, stop, drag, scrub, record, mark, bucket, money, dateText, inkOn, discHtml, open, toast, clamp };
})();
