/* Skola easter eggs (WANTED / WASTED / vice-city). Built for thumbs, not keyboards.
 *
 * Off for this browser:  open with ?eggs=0   (sticky until ?eggs=1)
 * Off for everyone:      drop the eggs <script> tag, or
 *                        set window.SKOLA_EGGS = false before this file loads.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var STORE = 'skola_eggs';
  var VICE = 'skola_vice';

  function qsEggs() {
    try {
      var q = new URLSearchParams(location.search).get('eggs');
      if (q != null) return q;
      if (/(?:^|[?&])noeggs(?:&|$)/.test(location.search)) return '0';
    } catch (e) {}
    return null;
  }

  function enabled() {
    if (window.SKOLA_EGGS === false || window.SKOLA_EGGS === 0) return false;
    var q = qsEggs();
    if (q === '0' || q === 'off' || q === 'no' || q === 'false') {
      try { localStorage.setItem(STORE, 'off'); } catch (e) {}
      return false;
    }
    if (q === '1' || q === 'on' || q === 'yes' || q === 'true') {
      try { localStorage.removeItem(STORE); } catch (e) {}
      return true;
    }
    try { if (localStorage.getItem(STORE) === 'off') return false; } catch (e) {}
    return true;
  }

  function pl() { return (document.documentElement.lang || '').toLowerCase().indexOf('pl') === 0; }

  function T() {
    return pl() ? {
      cap: 'jedna gwiazdka kłamie',
      tapStars: 'stuknij gwiazdki',
      wastedSub: '…spokojnie: pojedynczy głos nic nie znaczy',
      cheatOn: 'Cheat włączony: nieskończona ciekawość',
      cheatOff: 'Cheat wyłączony'
    } : {
      cap: 'one star lies',
      tapStars: 'tap the stars',
      wastedSub: '…relax: a single vote means nothing',
      cheatOn: 'Cheat activated: infinite curiosity',
      cheatOff: 'Cheat off'
    };
  }

  var STARS = 6;
  var STAR = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">' +
    '<path d="M12 2.2l2.6 6.3 6.8.7-5.2 4.8 1.6 6.6L12 17.2 6.2 20.6l1.6-6.6L2.6 9.2l6.8-.7z"/></svg>';

  var CSS =
    '.sk-egg-mark{touch-action:manipulation;user-select:none;-webkit-user-select:none;' +
      '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}' +
    '.eyebrow.sk-egg-mark{padding:14px 0;margin-top:-14px}' +
    'nav.top > .sk-egg-mark{min-height:44px;min-width:48px;display:inline-flex;align-items:center;' +
      'padding:12px 16px 12px 0;margin:-12px 0;box-sizing:content-box}' +
    '.sk-egg-hud{position:fixed;top:max(52px,calc(env(safe-area-inset-top) + 36px));' +
      'right:max(10px,env(safe-area-inset-right));left:auto;bottom:auto;z-index:10040;' +
      'display:flex;flex-direction:column;align-items:flex-end;padding:6px 8px;pointer-events:none;' +
      'color:#f4d35e;text-align:right;font-family:var(--sans,system-ui,sans-serif);' +
      'text-shadow:0 1px 2px #000,0 0 10px #000}' +
    '.sk-egg-hud.hot{pointer-events:auto}' +
    '.sk-egg-wanted{font-weight:800;letter-spacing:.34em;font-size:clamp(11px,3.2vw,14px);' +
      'margin:0 2px 4px;opacity:0}' +
    '.sk-egg-hud.six .sk-egg-wanted{opacity:1}' +
    '.sk-egg-stars{display:flex;flex-direction:row;gap:.06em;font-size:clamp(22px,8vw,34px);line-height:1;' +
      'padding:8px 2px;touch-action:manipulation}' +
    '.sk-egg-star{display:flex;align-items:center;justify-content:center;color:#c9a227;' +
      'opacity:.4;filter:drop-shadow(0 1px 1px rgba(0,0,0,.8));min-width:1em;min-height:1em}' +
    '.sk-egg-star svg{display:block;width:1em;height:1em;fill:currentColor}' +
    '.sk-egg-star.on{color:#f4d35e;opacity:1}' +
    '.sk-egg-hud.six .sk-egg-star.on{animation:sk-egg-flash .72s steps(1) infinite}' +
    '@keyframes sk-egg-flash{0%,49%{color:#f4d35e}50%,100%{color:#8a7018}}' +
    '.sk-egg-cap{margin:6px 2px 0;font-size:clamp(12px,3.4vw,15px);color:#fff;letter-spacing:.02em;' +
      'opacity:0;max-width:70vw}' +
    '.sk-egg-hud.split .sk-egg-cap{opacity:1}' +
    '.sk-egg-hint{display:block;margin-top:3px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;' +
      'color:#f4d35e;opacity:.85}' +
    '.sk-egg-wasted{position:fixed;inset:0;z-index:10050;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;padding:24px 20px max(24px,env(safe-area-inset-bottom));text-align:center;' +
      'background:rgba(12,12,12,.48);backdrop-filter:grayscale(1) contrast(1.05);' +
      '-webkit-backdrop-filter:grayscale(1) contrast(1.05);color:#f2f2f2;touch-action:manipulation;' +
      'cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.sk-egg-wasted b{font-family:var(--serif,Georgia,serif);font-size:clamp(52px,18vw,108px);font-weight:700;' +
      'letter-spacing:.06em;line-height:.9;font-style:italic}' +
    '.sk-egg-wasted span{display:block;margin-top:18px;max-width:22em;font-size:clamp(15px,4.2vw,18px);' +
      'line-height:1.35;opacity:0}' +
    '.sk-egg-wasted.go span{opacity:1}' +
    '.sk-egg-toast{position:fixed;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 16px));' +
      'transform:translateX(-50%);z-index:10060;max-width:calc(100vw - 24px);padding:12px 16px;border-radius:10px;' +
      'background:#111;color:#f0c400;font-family:var(--mono,ui-monospace,monospace);font-size:clamp(13px,3.6vw,15px);' +
      'text-align:center;pointer-events:none;box-shadow:0 0 0 1px #f0c400}' +
    'html.sk-vice{color-scheme:dark;--paper:#140818;--card:#22102c;--ink:#f6ecff;--muted:#c9a0e0;' +
      '--line:#4a2266;--accent:#2ef0c8;--accent-ink:#ff4ec8}' +
    'html.sk-vice body{background:#140818}' +
    'html.sk-vice h1 .light{color:#ff4ec8}' +
    '.sk-egg-wanted,.sk-egg-cap,.sk-egg-wasted span{transition:opacity .35s}' +
    '@media(prefers-reduced-motion:reduce){.sk-egg-wanted,.sk-egg-cap,.sk-egg-wasted span{transition:none}' +
      '.sk-egg-hud.six .sk-egg-star.on{animation:none}}';

  if (!enabled()) {
    try { document.documentElement.classList.remove('sk-vice'); } catch (e) {}
    try { localStorage.removeItem(VICE); } catch (e) {}
    return;
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wanted = 0;
  var celebrating = false;
  var splitDone = false;
  var wastedOnce = false;
  var decayTimer = null;
  var hud = null;
  var audioCtx = null;

  try { wastedOnce = sessionStorage.getItem('skola_wasted') === '1'; } catch (e) {}

  function injectCss() {
    if (document.getElementById('sk-egg-css')) return;
    var s = document.createElement('style');
    s.id = 'sk-egg-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buzz(pat) {
    try { if (navigator.vibrate) navigator.vibrate(pat); } catch (e) {}
  }

  function siren() {
    if (reduce) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      gain.gain.value = 0.045;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var t0 = audioCtx.currentTime;
      for (var i = 0; i < 6; i++) osc.frequency.setValueAtTime(i % 2 ? 860 : 600, t0 + i * 0.16);
      osc.start(t0);
      osc.stop(t0 + 0.96);
    } catch (e) {}
  }

  function starsHtml(nOn) {
    var h = '', i;
    for (i = 0; i < STARS; i++) {
      h += '<span class="sk-egg-star' + (i < nOn ? ' on' : '') + '">' + STAR + '</span>';
    }
    return '<div class="sk-egg-stars">' + h + '</div>';
  }

  function ensureHud() {
    if (hud) return hud;
    hud = document.createElement('div');
    hud.className = 'sk-egg-hud';
    hud.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hud);
    hud.addEventListener('pointerdown', function (e) {
      if (!splitDone) return;
      if (e.target.closest('.sk-egg-stars')) {
        e.preventDefault();
        e.stopPropagation();
        activateCheat(true);
        return;
      }
      dismissWanted();
    });
    return hud;
  }

  function renderHud() {
    if (wanted <= 0 && !celebrating) {
      if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
      hud = null;
      return;
    }
    var t = T();
    ensureHud();
    hud.className = 'sk-egg-hud' + (wanted >= STARS ? ' six' : '') + (splitDone ? ' split hot' : '');
    hud.innerHTML =
      '<p class="sk-egg-wanted">WANTED</p>' +
      starsHtml(wanted) +
      '<p class="sk-egg-cap">' + t.cap +
        (splitDone ? '<span class="sk-egg-hint">' + t.tapStars + '</span>' : '') +
      '</p>';
  }

  function scheduleDecay() {
    clearTimeout(decayTimer);
    if (celebrating || wanted <= 0) return;
    decayTimer = setTimeout(function () {
      wanted = Math.max(0, wanted - 1);
      renderHud();
      if (wanted > 0) scheduleDecay();
    }, 1800);
  }

  function bumpWanted() {
    if (document.querySelector('.sk-egg-wasted')) return;
    if (celebrating && splitDone) {
      activateCheat(true);
      return;
    }
    if (celebrating) return;
    wanted = Math.min(STARS, wanted + 1);
    renderHud();
    buzz(wanted >= STARS ? [30, 40, 70] : 12);
    if (wanted >= STARS) {
      celebrating = true;
      clearTimeout(decayTimer);
      siren();
      var wait = reduce ? 0 : 1000;
      setTimeout(function () {
        splitDone = true;
        renderHud();
      }, wait);
    } else {
      scheduleDecay();
    }
  }

  function dismissWanted() {
    celebrating = false;
    splitDone = false;
    wanted = 0;
    clearTimeout(decayTimer);
    renderHud();
  }

  function viceOn() {
    try { return localStorage.getItem(VICE) === '1'; } catch (e) { return false; }
  }

  function setVice(on) {
    document.documentElement.classList.toggle('sk-vice', on);
    try {
      if (on) localStorage.setItem(VICE, '1');
      else localStorage.removeItem(VICE);
    } catch (e) {}
  }

  function toast(msg) {
    var old = document.querySelector('.sk-egg-toast');
    if (old) old.parentNode.removeChild(old);
    var el = document.createElement('div');
    el.className = 'sk-egg-toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2400);
  }

  function activateCheat(fromStars) {
    var on = !viceOn();
    setVice(on);
    toast(on ? T().cheatOn : T().cheatOff);
    buzz(on ? [20, 30, 20] : 10);
    if (fromStars) dismissWanted();
  }

  function wasted() {
    if (wastedOnce || celebrating || document.querySelector('.sk-egg-wasted')) return;
    wastedOnce = true;
    try { sessionStorage.setItem('skola_wasted', '1'); } catch (e) {}
    var layer = document.createElement('div');
    layer.className = 'sk-egg-wasted';
    layer.innerHTML = '<b>WASTED</b><span>' + T().wastedSub + '</span>';
    document.body.appendChild(layer);
    var shown = false;
    function punch() {
      if (shown) return;
      shown = true;
      layer.classList.add('go');
    }
    function close() {
      if (!shown) { punch(); return; }
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }
    layer.addEventListener('pointerdown', function (e) { e.preventDefault(); close(); });
    setTimeout(punch, reduce ? 0 : 1200);
    setTimeout(function () { if (shown && layer.parentNode) layer.parentNode.removeChild(layer); }, 4200);
    buzz(25);
  }

  function boot() {
    injectCss();
    if (viceOn()) setVice(true);

    /* Delegation: nav brand, plus the big school tile kids mash on the phone.
       pointerup + slop = a tap counts, a scroll does not. Never preventDefault. */
    var tap = null;
    function eggHit(el) {
      return el && el.closest && el.closest('.sk-egg-mark, .skt-crumb.is-school');
    }
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var el = eggHit(e.target);
      if (!el) return;
      tap = { x: e.clientX, y: e.clientY, el: el };
    });
    document.addEventListener('pointerup', function (e) {
      if (!tap) return;
      var start = tap;
      tap = null;
      var el = eggHit(e.target);
      if (!el || el !== start.el) return;
      if (Math.abs(e.clientX - start.x) > 14 || Math.abs(e.clientY - start.y) > 14) return;
      bumpWanted();
    });

    document.addEventListener('click', function (e) {
      var cell = e.target.closest && e.target.closest('.skg-c, .sk-grid.input .c');
      if (!cell) return;
      if (cell.getAttribute('data-gx') === '0' && cell.getAttribute('data-gy') === '0') wasted();
    });

    /* Desktop leftover: typing still works. Phones never see this. */
    var buf = '';
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      if (e.key && e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-5);
        if (buf.slice(-3) === 'gta' || buf === 'skola') {
          buf = '';
          activateCheat(false);
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
