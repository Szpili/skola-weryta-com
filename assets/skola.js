/* Skola — teacher rating on two axes, as Dr. Dan built it (girltech.me/S).
 *
 * X axis: how much did you like it  (-2..+2 -> red, yellow, green, cyan, blue;
 *         "the cooler the better" — color is the temperature of reputation)
 * Y axis: how much did you learn    (bottom = nothing, top = a lot)
 *
 * A rating is one tap on a 5x5 grid. A teacher/school is a stream of taps over
 * days — never a single average. Aggregate color = column-count-weighted mean
 * of the five base colors (verified against Dan's live API on 2026-07-29).
 * cells[gy][gx]: gy 0 = bottom row (learned nothing), gx 0 = far left (hated).
 * Dan's API numbers his rows the other way up — see flipRows() before touching
 * anything on the learning axis.
 *
 * University mode: live data from Dan's API (CORS open), SKOLA_SNAPSHOT fallback.
 * School mode: deterministic synthetic data for a FICTIONAL school with
 * per-student streams, so the "same kid keeps answering that" pattern flag
 * can be shown. No real school or child is depicted.
 *
 *   Skola.mount(el, {lang: 'en'|'pl'})
 */
(function (global) {
  'use strict';

  var API = 'https://girltech.me/S/skolastic_api.php';
  var COL_RGB = [[255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255]];
  var KEY = 'skola_votes';

  /* ---------- strings ---------- */
  var STR = {
    en: {
      modes: { uni: 'University', school: 'School (K-8)' },
      gray: 'pressure map', grayTitle: 'Grayscale intensity — works without color vision',
      tabs: { schools: 'Schools', compare: 'Compare', cumulative: 'Whole school' },
      axisY: ['learned nothing', 'learned a lot'], axisX: ['hated it', 'loved it'],
      live: 'live data from girltech.me/S', snapshot: 'snapshot of girltech.me/S (live API unreachable)',
      synth: 'synthetic demo data', votes: 'answers', back: '← back',
      rateHere: 'Rate: one tap on the grid', rateHint: 'Up = I learned more. Right = I liked it more. You may also not tap at all — no tap, no record, and that is a fine answer too.',
      dunno: 'I’m not keeping up', dunnoDone: 'noted — the teacher sees a hand you didn’t have to raise',
      dunnoCount: function (n) { return n + '× “I’m not keeping up” today'; },
      voted: 'saved locally — one more tap in the stream', undo: 'undo last',
      noStore: 'this browser is blocking local storage, so the tap could not be kept — the rest of the page still works', rmp: 'Import a RateMyProfessors vote',
      rmpHint: 'RMP asks quality × difficulty. Quality maps to “liked it”, difficulty is the closest proxy for “learned”.',
      rmpQ: 'quality', rmpD: 'difficulty', rmpAdd: 'add as a vote',
      days: 'Day by day — a stream, not an average', calendar: 'Last 3 months', allDays: 'all days',
      day: 'day', class_: 'The class, kid by kid', patterns: 'Patterns to look into',
      patLow: function (s, n, of) { return s + ' answers “learned nothing” far more than the rest of this class (' + n + ' of ' + of + '). Could be nothing — or the start of a problem. What’s going on?'; },
      patBully: function (s, n, of) { return s + ' is learning but stands alone in hating it (' + n + ' of ' + of + '). Engaged yet unhappy — the quadrant Dan suggests could act as a bully detector. Worth a quiet word.'; },
      patNone: 'No kid stands out from this class. Single stray votes mean nothing yet.',
      target: 'the target', targetSub: 'loved it · learned a lot',
      trouble: 'the bad corner', troubleSub: 'hated it · learned nothing — find out why before it grows',
      admit: 'not all bad', admitSub: '“I didn’t get along with the teacher, but I learned a lot”',
      fun: 'fun, no progress', funSub: 'great time, learned nothing — a different problem',
      legendTitle: 'How to read the square',
      schoolsLede: 'Every card is one institution: border = overall color, small square = where its votes fall.',
      teachersLede: 'Tiles, not overlapping logos — each teacher: photo, overall color, vote map.',
      teacherCount: function (n) { return n + ' teachers'; },
      cumulativeLede: 'All votes in the school, one square. “You get a cumulative for the school, and each teacher gets a breakdown.”',
      compareLede: 'Side by side, most learning first. This is only one of the two axes — the colour still carries whether people liked it, so a high place here is not a total score.',
      learning: 'learned', liked: 'liked it',
      tooFewTitle: 'Not enough answers to compare yet',
      tooFew: function (n) { return n + ' answers so far — too few for a percentage'; },
      notRated: 'not rated yet',
      studentVotes: function (n) { return n + ' answers'; },
      dataNote: 'University data comes live from Dan’s Skola at girltech.me/S — the same model rendered by our code. A school’s figure is its teachers’ answers from the last 12 months (one photo per teacher), not a separate vote on the school itself. School (K-8) data is synthetic.',
      dataNoteSnap: 'The live API was unreachable, so university data here is our bundled snapshot of Dan’s Skola (girltech.me/S) taken 2026-07-29 — not today’s votes. School data is synthetic.',
      dataNotePart: 'Some university data could not be fetched live and falls back to our 2026-07-29 snapshot of girltech.me/S. School data is synthetic.',
      loadFail: 'This record could not be displayed — the data from girltech.me/S was incomplete.',
      today: 'today'
    },
    pl: {
      modes: { uni: 'Uczelnia', school: 'Szkoła (K-8)' },
      gray: 'mapa nacisku', grayTitle: 'Skala szarości — działa bez rozróżniania kolorów',
      tabs: { schools: 'Szkoły', compare: 'Porównaj', cumulative: 'Cała szkoła' },
      axisY: ['nic się nie nauczyłem', 'dużo się nauczyłem'], axisX: ['nie znosiłem', 'uwielbiałem'],
      live: 'dane na żywo z girltech.me/S', snapshot: 'migawka girltech.me/S (API niedostępne)',
      synth: 'dane syntetyczne (demo)', votes: 'odpowiedzi', back: '← wróć',
      rateHere: 'Oceń: jedno kliknięcie w kwadrat', rateHint: 'Wyżej = więcej się nauczyłem. W prawo = bardziej mi się podobało. Możesz też nie klikać wcale — brak kliknięcia to brak rekordu i to też jest w porządku.',
      dunno: 'Nie nadążam', dunnoDone: 'zapisane — nauczyciel widzi rękę, której nie musiałeś podnosić',
      dunnoCount: function (n) { return n + '× „nie nadążam” dzisiaj'; },
      voted: 'zapisano lokalnie — jeszcze jeden głos w strumieniu', undo: 'cofnij ostatni',
      noStore: 'ta przeglądarka blokuje pamięć lokalną, więc kliknięcia nie udało się zapisać — reszta strony działa normalnie', rmp: 'Import głosu z RateMyProfessors',
      rmpHint: 'RMP pyta o quality × difficulty. Quality to „podobało się”, difficulty to najbliższy zamiennik osi „nauczyłem się”.',
      rmpQ: 'quality', rmpD: 'difficulty', rmpAdd: 'dodaj jako głos',
      days: 'Dzień po dniu — strumień, nie średnia', calendar: 'Ostatnie 3 miesiące', allDays: 'wszystkie dni',
      day: 'dzień', class_: 'Klasa, dziecko po dziecku', patterns: 'Wzorce do sprawdzenia',
      patLow: function (s, n, of) { return s + ' odpowiada „nic się nie nauczyłem” znacznie częściej niż reszta tej klasy (' + n + ' z ' + of + '). Może nic — a może początek problemu. Co się dzieje?'; },
      patBully: function (s, n, of) { return s + ' uczy się, ale jako jedyne w klasie tego nie znosi (' + n + ' z ' + of + '). Zaangażowanie bez radości — ćwiartka, która według Dana może działać jak wykrywacz dręczenia. Warto cicho zapytać.'; },
      patNone: 'Żadne dziecko nie odstaje od tej klasy. Pojedyncze głosy nic jeszcze nie znaczą.',
      target: 'cel', targetSub: 'uwielbiałem · dużo się nauczyłem',
      trouble: 'zły róg', troubleSub: 'nie znosiłem · nic się nie nauczyłem — sprawdź zanim urośnie',
      admit: 'nie takie złe', admitSub: '„nie dogadywałem się z nauczycielem, ale dużo się nauczyłem”',
      fun: 'zabawa bez postępu', funSub: 'świetny czas, zero nauki — inny problem',
      legendTitle: 'Jak czytać kwadrat',
      schoolsLede: 'Każda karta to jedna instytucja: ramka = kolor zbiorczy, kwadracik = rozkład głosów.',
      teachersLede: 'Kafelki zamiast nakładających się logotypów — nauczyciel: zdjęcie, kolor zbiorczy, mapa głosów.',
      teacherCount: function (n) { return n + ' nauczycieli'; },
      cumulativeLede: 'Wszystkie głosy szkoły w jednym kwadracie. „Szkoła dostaje wynik zbiorczy, a każdy nauczyciel rozkład tego, jak sobie radzi w klasie.”',
      compareLede: 'Obok siebie, najpierw najwięcej nauki. To tylko jedna z dwóch osi — kolor wciąż mówi, czy się podobało, więc wysokie miejsce tutaj to nie ocena ogólna.',
      learning: 'nauki', liked: 'sympatii',
      tooFewTitle: 'Za mało odpowiedzi, żeby porównywać',
      tooFew: function (n) { return 'na razie ' + n + ' odpowiedzi — za mało na procent'; },
      notRated: 'jeszcze nieoceniona',
      studentVotes: function (n) { return n + ' odpowiedzi'; },
      dataNote: 'Dane uczelni płyną na żywo z aplikacji Dana (girltech.me/S) — ten sam model, nasz rendering. Wynik uczelni to odpowiedzi jej wykładowców z ostatnich 12 miesięcy (po jednym zdjęciu na osobę), a nie osobny głos na samą uczelnię. Dane szkolne (K-8) są syntetyczne.',
      dataNoteSnap: 'API było niedostępne, więc dane uczelni pochodzą z naszej migawki aplikacji Dana (girltech.me/S) z 29.07.2026 — to nie są dzisiejsze głosy. Dane szkolne są syntetyczne.',
      dataNotePart: 'Części danych uczelni nie udało się pobrać na żywo — w tym miejscu pochodzą z migawki girltech.me/S z 29.07.2026. Dane szkolne są syntetyczne.',
      loadFail: 'Nie udało się wyświetlić tego rekordu — dane z girltech.me/S były niekompletne.',
      today: 'dziś'
    }
  };

  /* ---------- color & math (Dan's exact formulas) ---------- */
  function colSums(cells) {
    var s = [0, 0, 0, 0, 0];
    for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) s[gx] += cells[gy][gx];
    return s;
  }
  function totalOf(cells) {
    var n = 0;
    for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) n += cells[gy][gx];
    return n;
  }
  function learningOf(cells) {
    var n = 0, acc = 0;
    for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) { n += cells[gy][gx]; acc += cells[gy][gx] * gy / 4; }
    return n ? acc / n : 0;
  }
  /* liking on the same 0..1 scale as learning; equals Dan's color_x field exactly.
     Shown NEXT TO learning on purpose: one number alone reads as a total score,
     which is the single-score problem this whole model exists to avoid. */
  function likingOf(cells) {
    var n = 0, acc = 0;
    for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) { n += cells[gy][gx]; acc += cells[gy][gx] * gx / 4; }
    return n ? acc / n : 0;
  }
  function aggRGB(cells) {
    var s = colSums(cells), n = s[0] + s[1] + s[2] + s[3] + s[4];
    if (!n) return null;
    var r = 0, g = 0, b = 0;
    for (var i = 0; i < 5; i++) { r += s[i] * COL_RGB[i][0]; g += s[i] * COL_RGB[i][1]; b += s[i] * COL_RGB[i][2]; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }
  function css(rgb) { return rgb ? 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')' : 'var(--line)'; }
  function cellColor(gx, count, max, gray) {
    if (!count) return null;
    var a = 0.22 + 0.78 * (max ? count / max : 1);
    if (gray) return 'rgba(128,128,128,' + a.toFixed(2) + ')';
    var c = COL_RGB[gx];
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(2) + ')';
  }
  /* THE ROW FLIP — read this before "fixing" it.
     Dan's API returns cells[0] as the row his own UI paints at the TOP, and his
     vote handler records a tap there as Y_VALUES[0] = 0, so his stored `learning`
     field is the INVERSE of its name. Two inversions that cancel on his screen:
     the picture and his narration agree, only the number is backwards.
       proof 1 — his instruction to students: "If you learned a lot, put at the
         top" (nWnZeBSqFjk); "the top row is the target, to learn a lot" (9u34L0imm8I).
       proof 2 — his narration vs the field, with the dates checked so the data he
         was looking at is the data we have. "Dusty Dowse and the UMaine Ansible"
         (j9PKP1v5j90) went up 2026-07-22, by which day all 25 of Dusty's row-0
         votes had landed (4 of them on the 22nd itself, nothing after) — and over
         that screen Dan says "a lot of all the marks up high here … that shows
         people really learned a lot". The mass he calls "up high" is row 0.
         Same for "Dusty & Co." (yhWOnsN5jcE, 2026-07-19): Dr. Khosla was then 26
         votes in rows 0-1 and Dan says "doing great … everyone agrees they learn
         a lot"; Matt Hermanski 24 in rows 0-1, "people are learning a lot".
         Their `learning` fields read 0.08 and 0.11.
       proof 3 — his backdrop (pics/sapiengame.svg) ramps white at top to black at
         bottom, and he defines "White is 0 … Black is 1 … truer is blacker" (DM
         2026-07-26), so index 0 at the top is consistent with his colour language.
     We therefore read his row 0 as "learned a lot" and render it at the top, which
     matches BOTH his screen and his words. Consequence: our learning % is
     1 − his `learning` field. Colours are column-derived and unaffected.
     Same bug class as the Fairy Dice black/white polarity — worth telling Dan. */
  function flipRows(cells) {
    return [cells[4], cells[3], cells[2], cells[1], cells[0]].map(function (r) { return r.slice(); });
  }
  /* normalise one API record (school, teacher or day) into our orientation */
  function ingest(rec) {
    if (!rec || !rec.cells || rec._ingested) return rec;
    var out = {};
    for (var k in rec) if (Object.prototype.hasOwnProperty.call(rec, k)) out[k] = rec[k];
    out.cells = flipRows(rec.cells);
    out._ingested = true;
    return out;
  }
  function emptyCells() {
    var c = [];
    for (var i = 0; i < 5; i++) c.push([0, 0, 0, 0, 0]);
    return c;
  }
  function addCells(a, b) {
    for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) a[gy][gx] += b[gy][gx];
    return a;
  }

  /* ---------- deterministic synthetic school (SeDoMoCha, K-8) ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* Invented pupils. Deliberately NOT Abigail/Erica/Jennifer/Roxanne — Dan's
     SeDoMoCha video uses those as the names of CLASSROOMS, and this demo hangs
     synthetic "didn't learn / hated it" data on two pupils. Attaching that to
     his real school's real classroom names would read as a claim about them. */
  var KIDS = ['Ada', 'Bo', 'Cleo', 'Dev', 'Elif', 'Finn', 'Gita', 'Hugo'];
  /* home = [gx, gy] the kid's typical answer for this class; quirks override */
  var SCHOOL_TEACHERS = [
    { id: 'sd1', name: 'Ms. Abbott', subject: { en: 'Reading', pl: 'Czytanie' }, home: [4, 4] },
    { id: 'sd2', name: 'Mr. Beal', subject: { en: 'Math', pl: 'Matematyka' }, home: [1, 4] },   /* learned a lot, didn't like */
    { id: 'sd3', name: 'Ms. Cormier', subject: { en: 'Science', pl: 'Przyroda' }, home: [3, 3] }, /* great, except Dylan */
    { id: 'sd4', name: 'Mr. Doyle', subject: { en: 'History', pl: 'Historia' }, home: [1, 1] },  /* the problem class */
    { id: 'sd5', name: 'Ms. Estes', subject: { en: 'Art', pl: 'Plastyka' }, home: [4, 1] },      /* fun, no progress */
    { id: 'sd6', name: 'Mr. Fortin', subject: { en: 'Gym', pl: 'WF' }, home: [2, 2] }            /* all over the map */
  ];
  function clamp5(v) { return v < 0 ? 0 : v > 4 ? 4 : v; }
  /* local calendar date — NOT toISOString(), which is UTC and shifts the day
     label for anyone east of UTC+12 ("what was his ranking today?" must mean
     the rater's today, not Greenwich's) */
  function ymd(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function genSchool(todayYmd) {
    var rnd = mulberry32(20260729);
    var days = [];
    var d = new Date(todayYmd + 'T12:00:00');
    while (days.length < 15) { /* 15 school days back from today */
      if (d.getDay() !== 0 && d.getDay() !== 6) days.unshift(ymd(d));
      d.setDate(d.getDate() - 1);
    }
    var votes = []; /* {tid, student, day, gx, gy} */
    SCHOOL_TEACHERS.forEach(function (t) {
      days.forEach(function (day) {
        KIDS.forEach(function (kid) {
          if (rnd() < 0.18) return; /* absent, or simply did not tap */
          var gx, gy;
          if (t.id === 'sd3' && kid === 'Dev') {
            gx = rnd() < 0.7 ? 0 : 1; gy = rnd() < 0.8 ? 0 : 1;           /* the repeating bottom-left kid */
          } else if (t.id === 'sd2' && kid === 'Cleo') {
            gx = 0; gy = 4;                                               /* learning but unhappy — bully-detector quadrant */
          } else if (t.id === 'sd6') {
            gx = Math.floor(rnd() * 5); gy = Math.floor(rnd() * 5);       /* all over the map */
          } else {
            gx = clamp5(t.home[0] + Math.round((rnd() - 0.5) * 2.4));
            gy = clamp5(t.home[1] + Math.round((rnd() - 0.5) * 2.4));
          }
          votes.push({ tid: t.id, student: kid, day: day, gx: gx, gy: gy });
        });
      });
    });
    return { days: days, votes: votes };
  }

  /* ---------- local votes (append-only stream in this browser) ---------- */
  function localAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  /* returns false when the browser refuses to store (private mode, blocked
     cookies, partitioned iframe, quota) so the caller can say so instead of
     looking broken */
  function localWrite(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; } catch (e) { return false; }
  }
  function localSave(rec) { var a = localAll(); a.push(rec); return localWrite(a); }
  /* newest record of EITHER kind: the button says "undo last", and a raised hand
     is a record too — matching only type 'vote' silently deleted an older vote */
  function localDropLast(tid) {
    var a = localAll();
    for (var i = a.length - 1; i >= 0; i--) if (a[i].tid === tid) { a.splice(i, 1); break; }
    return localWrite(a);
  }
  function localFor(tid, type) {
    return localAll().filter(function (r) { return r.tid === tid && r.type === type; });
  }

  /* ---------- derived stats ---------- */
  function cellsFromVotes(votes) {
    var c = emptyCells();
    votes.forEach(function (v) { c[v.gy][v.gx]++; });
    return c;
  }
  /* Dan's question is "is that a PATTERN? is that always happening?" — so a flag
     means this kid stands out from THIS class, not merely that they sat in a
     quadrant. An absolute count can't tell those apart: in a class the whole
     room dislikes, counting hits flags all of them and buries the one kid who
     is actually different. Hence rate vs the classmates' baseline.
     Extreme column only (gx 0 = -2, the strongest answer), never gx 1.
     ponytail: fixed thresholds, tuned on the demo data (2 designed signals kept,
     23 flags -> 4). A pilot with real classes will want them per-school. */
  var PAT = { minN: 3, ratio: 2, floor: 0.5, margin: 0.2 };
  function patterns(votes, t) {
    var by = {};
    votes.forEach(function (v) {
      if (!v.student) return;
      var s = by[v.student] = by[v.student] || { n: 0, low: 0, bully: 0 };
      s.n++;
      if (v.gy === 0) s.low++;                        /* learned nothing */
      if (v.gy >= 3 && v.gx === 0) s.bully++;         /* learning, hated it */
    });
    var names = Object.keys(by);
    var out = [];
    ['low', 'bully'].forEach(function (kind) {
      var rates = names.map(function (s) { return by[s].n ? by[s][kind] / by[s].n : 0; });
      names.forEach(function (s, i) {
        var rate = rates[i], count = by[s][kind];
        if (count < PAT.minN || rate < PAT.floor) return;
        var others = rates.filter(function (_, j) { return j !== i; });
        var base = others.length ? others.reduce(function (a, b) { return a + b; }, 0) / others.length : 0;
        if (rate < Math.max(base * PAT.ratio, base + PAT.margin)) return;
        out.push(kind === 'low' ? t.patLow(s, count, by[s].n) : t.patBully(s, count, by[s].n));
      });
    });
    return out;
  }

  /* ---------- rendering ---------- */
  var CSS = '' +
    '.sk{--skline:var(--line,#dce2e9);--skmut:var(--muted,#59646f);font-size:15px}' +
    '.sk *{box-sizing:border-box}' +
    '.sk .sk-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:0 0 14px}' +
    '.sk .sk-modes,.sk .sk-tabs{display:flex;gap:6px;flex-wrap:wrap}' +
    '.sk button{font:inherit;color:inherit;background:none;border:1px solid var(--skline);border-radius:9px;padding:7px 13px;cursor:pointer}' +
    '.sk button:hover{border-color:var(--accent,#0e7a6b)}' +
    '.sk button.on{border-color:var(--accent,#0e7a6b);color:var(--accent-ink,#0b5f54);font-weight:700}' +
    '.sk .sk-gray{font-size:12.5px;opacity:.85}' +
    '.sk .sk-src{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--skmut);margin:2px 0 12px}' +
    '.sk .sk-lede{color:var(--skmut);margin:0 0 14px;max-width:70ch}' +
    '.sk .sk-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}' +
    '.sk .sk-card{background:var(--card,#fff);border:2px solid var(--skline);border-radius:13px;padding:12px;cursor:pointer;text-align:center}' +
    '.sk .sk-card:hover{filter:brightness(.97)}' +
    '.sk .sk-card .nm{font-weight:700;margin:8px 0 1px;font-size:14px}' +
    '.sk .sk-card .sb{font-size:12px;color:var(--skmut);margin:0 0 8px}' +
    '.sk .sk-ava{width:52px;height:52px;border-radius:50%;object-fit:cover;display:inline-block;background:var(--paper,#eceff3);color:var(--skmut);font-weight:700;line-height:52px;font-size:17px;text-align:center}' +
    '.sk .sk-avawrap{position:relative;display:inline-block;line-height:0}' +
    '.sk .sk-avaimg{position:absolute;left:0;top:0}' +
    '.sk .sk-grid{display:grid;width:100%;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:2px;aspect-ratio:1;background:transparent}' +
    '.sk .sk-grid .c{border-radius:2px;background:rgba(128,140,155,.16);position:relative}' +
    '.sk .sk-grid.big .c{border-radius:4px}' +
    '.sk .sk-grid .c span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:ui-monospace,monospace;font-size:11px;color:#fff;text-shadow:0 0 4px rgba(0,0,0,.9)}' +
    '.sk .sk-grid.input .c{cursor:pointer}' +
    '.sk .sk-grid.input .c:hover{outline:2px solid var(--accent,#0e7a6b);outline-offset:-1px}' +
    '.sk .sk-mini{width:100%;max-width:120px;margin:0 auto}' +
    '.sk .sk-sq{width:100%;max-width:340px;margin:0 auto}' +
    '.sk .sk-axes{display:grid;grid-template-columns:20px 1fr;gap:6px;max-width:372px;margin:0 auto}' +
    '.sk .sk-ylab{writing-mode:vertical-rl;transform:rotate(180deg);display:flex;justify-content:space-between;font-size:11px;color:var(--skmut)}' +
    '.sk .sk-xlab{grid-column:2;display:flex;justify-content:space-between;font-size:11px;color:var(--skmut);margin-top:4px}' +
    '.sk .sk-head{display:flex;gap:14px;align-items:center;margin:0 0 12px;flex-wrap:wrap}' +
    '.sk .sk-head .sk-ava{width:64px;height:64px;line-height:64px}' +
    '.sk .sk-head h3{margin:0;font-size:20px}' +
    '.sk .sk-head .st{font-family:ui-monospace,monospace;font-size:12px;color:var(--skmut)}' +
    '.sk .sk-chip{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:5px;border:1px solid rgba(0,0,0,.15)}' +
    '.sk h4{font-family:inherit;font-size:14px;letter-spacing:.02em;margin:22px 0 8px;text-transform:uppercase;color:var(--skmut)}' +
    '.sk .sk-daysrow{display:flex;gap:8px;align-items:flex-end;overflow-x:auto;padding:6px 2px 10px}' +
    '.sk .sk-dayc{border-radius:50%;border:1px solid rgba(0,0,0,.2);cursor:pointer;flex:none}' +
    '.sk .sk-dayc.on{outline:2px solid var(--accent,#0e7a6b);outline-offset:2px}' +
    '.sk .sk-cal{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,11px);gap:3px;overflow-x:auto;padding:2px 2px 8px}' +
    '.sk .sk-cal i{width:11px;height:11px;border-radius:2px;background:rgba(128,140,155,.14)}' +
    '.sk .sk-note{font-size:13px;color:var(--skmut);max-width:70ch}' +
    '.sk .sk-alert{border-left:3px solid #d97706;padding:6px 12px;margin:8px 0;font-size:14px;background:var(--card,#fff);border-radius:0 8px 8px 0}' +
    '.sk .sk-ok{border-left-color:var(--accent,#0e7a6b)}' +
    '.sk .sk-cmp{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px}' +
    '.sk .sk-kids{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:12px}' +
    '.sk .sk-kid{text-align:center;border:1px solid var(--skline);border-radius:11px;padding:10px;background:var(--card,#fff)}' +
    '.sk .sk-kid .nm{font-size:13px;font-weight:700;margin:0 0 6px}' +
    '.sk .sk-kid .ct{font-size:11px;color:var(--skmut);margin-top:5px}' +
    '.sk .sk-rate{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}' +
    '.sk .sk-rate>div{flex:1;min-width:230px}' +
    '.sk .sk-status{font-size:13px;color:var(--skmut);min-height:1.5em;margin:8px 0 0}' +
    '.sk .sk-legend{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:8px}' +
    '.sk .sk-leg{border:1px solid var(--skline);border-radius:10px;padding:10px 12px;background:var(--card,#fff)}' +
    '.sk .sk-leg b{display:block;font-size:13.5px}' +
    '.sk .sk-leg i{font-style:normal;font-size:12.5px;color:var(--skmut)}' +
    '.sk .sk-rmp{border:1px dashed var(--skline);border-radius:11px;padding:12px 14px;margin-top:10px}' +
    '.sk .sk-rmp label{font-family:ui-monospace,monospace;font-size:12px;margin-right:8px}' +
    '.sk select{font:inherit;background:var(--card,#fff);color:inherit;border:1px solid var(--skline);border-radius:7px;padding:4px 6px}' +
    '.sk .sk-back{margin:0 0 12px}' +
    '@media(max-width:480px){.sk .sk-cards{grid-template-columns:repeat(auto-fill,minmax(136px,1fr))}}';

  function injectCss() {
    if (document.getElementById('sk-css')) return;
    var s = document.createElement('style');
    s.id = 'sk-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  function gridHtml(cells, opts) {
    opts = opts || {};
    var max = 0, gy, gx;
    for (gy = 0; gy < 5; gy++) for (gx = 0; gx < 5; gx++) if (cells[gy][gx] > max) max = cells[gy][gx];
    var h = '<div class="sk-grid' + (opts.big ? ' big' : '') + (opts.input ? ' input' : '') + (opts.mini ? ' sk-mini' : '') + '">';
    for (gy = 4; gy >= 0; gy--) for (gx = 0; gx < 5; gx++) {
      var n = cells[gy][gx];
      /* grey is for READING results ("a pressure map if you don't have the
         colour"); the input square stays in colour because the five columns ARE
         the liking axis, and Dan's own voting grid has no grey branch */
      var col = opts.input
        ? 'rgba(' + COL_RGB[gx][0] + ',' + COL_RGB[gx][1] + ',' + COL_RGB[gx][2] + ',.5)'
        : cellColor(gx, n, max, opts.gray);
      h += '<div class="c" data-gx="' + gx + '" data-gy="' + gy + '"' + (col ? ' style="background:' + col + '"' : '') + '>' +
        (opts.numbers && n ? '<span>' + n + '</span>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function squareHtml(cells, t, opts) {
    return '<div class="sk-axes"><div class="sk-ylab"><span>' + t.axisY[0] + '</span><span>' + t.axisY[1] + '</span></div>' +
      '<div class="sk-sq">' + gridHtml(cells, opts) + '</div>' +
      '<div class="sk-xlab"><span>' + t.axisX[0] + '</span><span>' + t.axisX[1] + '</span></div></div>';
  }
  function avatarHtml(name, src) {
    var ini = esc(initials(name));
    if (!src) return '<span class="sk-ava">' + ini + '</span>';
    /* The photo sits on top of the initials; if it 404s it deletes itself and the
       initials show through. Nothing is interpolated into the handler — inside an
       inline handler the browser HTML-decodes before JS parses, so entity-escaping
       a name there would not contain it. aria-hidden on the fallback so a screen
       reader does not announce "DD Dusty Dowse". */
    return '<span class="sk-avawrap"><span class="sk-ava" aria-hidden="true">' + ini + '</span>' +
      '<img class="sk-ava sk-avaimg" src="' + esc(src) + '" alt="" onerror="this.remove()"></span>';
  }
  function initials(name) {
    var words = String(name == null ? '' : name).split(/[\s.]+/).filter(Boolean);
    return words.length ? words.map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase() : '?';
  }
  function chip(rgb) { return '<span class="sk-chip" style="background:' + css(rgb) + '"></span>'; }

  /* ---------- app state & data ---------- */
  function mount(el, opts) {
    injectCss();
    opts = opts || {};
    var t = STR[opts.lang] || STR.en;
    var lang = opts.lang === 'pl' ? 'pl' : 'en';
    var today = ymd(new Date());
    var school = genSchool(today);
    var dan = { source: null, schools: [], teachers: {}, years: {} };
    var state = { mode: 'uni', view: 'schools', sid: null, tid: null, day: null, gray: false };

    /* hash <-> state, so a view can be sent as a link ('-' = empty slot) */
    function readHash() {
      var m = location.hash.match(/^#sk\/(uni|school)\/([a-z]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
      if (!m) return;
      state.mode = m[1]; state.view = m[2];
      state.sid = (m[3] && m[3] !== '-') ? m[3] : null;
      state.tid = (m[4] && m[4] !== '-') ? m[4] : null;
    }
    function writeHash() {
      var h = '#sk/' + state.mode + '/' + state.view +
        (state.sid || state.tid ? '/' + (state.sid || '-') : '') +
        (state.tid ? '/' + state.tid : '');
      if (location.hash !== h) history.replaceState(null, '', h);
    }

    function danLoad() {
      return fetch(API + '?action=schools&_=' + Date.now()).then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) throw new Error('api');
          dan.schools = j.schools.map(ingest); dan.source = 'live';
        })
        .catch(function () {
          var snap = global.SKOLA_SNAPSHOT;
          if (!snap) return;
          dan.schools = snap.schools.map(ingest);
          Object.keys(snap.teachers).forEach(function (k) { dan.teachers[k] = snap.teachers[k].map(ingest); });
          Object.keys(snap.years).forEach(function (k) { dan.years[k] = snap.years[k].map(ingest); });
          dan.source = 'snapshot';
        });
    }
    function danTeachers(sid) {
      if (dan.teachers[sid]) return Promise.resolve(dan.teachers[sid]);
      return fetch(API + '?action=ansible&school_id=' + sid + '&_=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (j) { dan.teachers[sid] = (j.teachers || []).map(ingest); return dan.teachers[sid]; })
        .catch(function () {
          var snap = global.SKOLA_SNAPSHOT;
          dan.degraded = true;
          return (snap && snap.teachers[sid] || []).map(ingest);
        });
    }
    function danYear(tid) {
      if (dan.years[tid]) return Promise.resolve(dan.years[tid]);
      return fetch(API + '?action=year&teacher_id=' + tid + '&_=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (j) { dan.years[tid] = (j.days || []).map(ingest); return dan.years[tid]; })
        .catch(function () {
          var snap = global.SKOLA_SNAPSHOT;
          dan.degraded = true;
          return (snap && snap.years[tid] || []).map(ingest);
        });
    }
    function imgUrl(rel) { return rel ? 'https://girltech.me/S/' + rel : null; }

    /* school-mode helpers */
    function schoolTeacher(tid) {
      for (var i = 0; i < SCHOOL_TEACHERS.length; i++) if (SCHOOL_TEACHERS[i].id === tid) return SCHOOL_TEACHERS[i];
      return null;
    }
    function schoolVotes(tid) {
      var v = school.votes.filter(function (x) { return x.tid === tid; });
      localFor(tid, 'vote').forEach(function (r) { v.push({ tid: tid, student: null, day: r.day, gx: r.gx, gy: r.gy }); });
      return v;
    }
    function danCellsWithLocal(teacher) {
      var c = emptyCells();
      addCells(c, teacher.cells);
      localFor('dan:' + teacher.id, 'vote').forEach(function (r) { c[r.gy][r.gx]++; });
      return c;
    }

    /* ---------- view renderers (HTML string + bind step) ---------- */
    var root = document.createElement('div');
    root.className = 'sk';
    el.appendChild(root);

    /* Every render invalidates in-flight fetches: a slow response must not paint
       into the view the user has since navigated to, and must not re-run
       bindCommon() against the live tree (that adds a second click listener to
       every card). Async fills capture gen and bail if it moved on. */
    var gen = 0;

    function render() {
      gen++;
      writeHash();
      var h = topBar();
      if (state.mode === 'uni') {
        if ((state.view === 'teachers' || state.view === 'teacher') && state.sid) h += uniTeachersShell();
        else if (state.view === 'compare') h += uniCompare();
        else { state.view = 'schools'; h += uniSchools(); }
      } else {
        if (state.view === 'teacher' && state.tid) h += schoolTeacherView(state.tid);
        else if (state.view === 'cumulative') h += schoolCumulative();
        else { state.view = 'schools'; h += schoolGrid(); }
      }
      root.innerHTML = h + legendHtml() + '<p class="sk-note" style="margin-top:26px">' + dataNote() + '</p>';
      bindTop();
      if (state.mode === 'uni' && state.view === 'teachers' && state.sid) fillUniTeachers();
      if (state.mode === 'uni' && state.view === 'teacher' && state.tid) fillUniTeacher();
      bindCommon();
    }

    /* never claim "live" while we are actually serving the bundled snapshot */
    function dataNote() {
      if (dan.source === 'snapshot') return t.dataNoteSnap;
      if (dan.degraded) return t.dataNotePart;
      return t.dataNote;
    }

    function topBar() {
      var srcLabel = state.mode === 'uni'
        ? (dan.source === 'live' ? t.live : dan.source === 'snapshot' ? t.snapshot : '…')
        : t.synth;
      var tabs = state.mode === 'uni'
        ? [['schools', t.tabs.schools], ['compare', t.tabs.compare]]
        : [['schools', SCHOOL_NAME], ['cumulative', t.tabs.cumulative]];
      return '<div class="sk-top"><div class="sk-modes">' +
        '<button data-mode="uni" class="' + (state.mode === 'uni' ? 'on' : '') + '">' + t.modes.uni + '</button>' +
        '<button data-mode="school" class="' + (state.mode === 'school' ? 'on' : '') + '">' + t.modes.school + '</button>' +
        '</div><div class="sk-tabs">' +
        tabs.map(function (x) {
          return '<button data-tab="' + x[0] + '" class="' + (state.view === x[0] ? 'on' : '') + '">' + x[1] + '</button>';
        }).join('') +
        '<button class="sk-gray' + (state.gray ? ' on' : '') + '" data-gray title="' + t.grayTitle + '">' + t.gray + '</button>' +
        '</div></div><p class="sk-src">' + srcLabel + '</p>';
    }
    var SCHOOL_NAME = 'Maple Ridge School';   /* fictional — see KIDS comment */

    function uniSchools() {
      if (!dan.schools.length) return '<p class="sk-note">…</p>';
      var sorted = dan.schools.slice().sort(function (a, b) { return b.total - a.total; });
      return '<p class="sk-lede">' + t.schoolsLede + '</p><div class="sk-cards">' +
        sorted.map(function (s) {
          var rgb = aggRGB(s.cells);
          return '<div class="sk-card" data-school="' + esc(s.id) + '" style="border-color:' + css(rgb) + '">' +
            avatarHtml(s.name, s.has_logo ? imgUrl(s.logo) : null) +
            '<p class="nm">' + esc(s.name) + '</p><p class="sb">' +
            (s.state ? esc(s.state) + ' · ' : '') +
            (totalOf(s.cells) ? totalOf(s.cells) + ' ' + t.votes : t.notRated) + '</p>' +
            gridHtml(s.cells, { mini: true, gray: state.gray }) + '</div>';
        }).join('') + '</div>';
    }

    function fillUniTeachers() {
      var mine = gen;
      danTeachers(state.sid).then(function (list) {
        if (mine !== gen) return;
        var holder = root.querySelector('#sk-async');
        if (!holder) return;
        holder.innerHTML = '<p class="sk-lede">' + t.teachersLede + '</p><div class="sk-cards">' +
          list.map(function (te) {
            var cells = danCellsWithLocal(te);
            var rgb = aggRGB(cells);
            return '<div class="sk-card" data-teacher="' + esc(te.id) + '" style="border-color:' + css(rgb) + '">' +
              avatarHtml(te.name, imgUrl(te.src)) +
              '<p class="nm">' + esc(te.name) + '</p><p class="sb">' + totalOf(cells) + ' ' + t.votes + '</p>' +
              gridHtml(cells, { mini: true, gray: state.gray }) + '</div>';
          }).join('') + '</div>';
        bindCommon();
      }).catch(function (e) {
        if (mine !== gen) return;
        var holder = root.querySelector('#sk-async');
        if (holder) holder.innerHTML = '<p class="sk-note">' + esc(t.loadFail) + '</p>';
      });
    }
    function findSchool(sid) {
      for (var i = 0; i < dan.schools.length; i++) if (String(dan.schools[i].id) === String(sid)) return dan.schools[i];
      return null;
    }

    function uniTeachersShell() {
      var s = findSchool(state.sid);
      return '<p class="sk-back"><button data-back>' + t.back + '</button></p>' +
        (s ? '<div class="sk-head">' + avatarHtml(s.name, s.has_logo ? imgUrl(s.logo) : null) +
          '<div><h3>' + esc(s.name) + '</h3><p class="st">' + s.total + ' ' + t.votes + '</p></div></div>' : '') +
        '<div id="sk-async"><p class="sk-note">…</p></div>';
    }

    function fillUniTeacher() {
      var mine = gen;
      danTeachers(state.sid).then(function (list) {
        if (mine !== gen) return;
        var te = null;
        for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(state.tid)) te = list[i];
        if (!te) return;
        var holder = root.querySelector('#sk-async');
        if (!holder) return;
        var cells = danCellsWithLocal(te);
        var rgb = aggRGB(cells);
        /* the ✋ button is offered here too, so its count has to be visible here
           too — otherwise "the teacher sees a hand you didn't have to raise" is
           a false statement in the mode that is open by default */
        var dunno = localFor('dan:' + te.id, 'dunno').filter(function (r) { return r.day === today; }).length;
        holder.innerHTML =
          '<div class="sk-head">' + avatarHtml(te.name, imgUrl(te.src)) +
          '<div><h3>' + esc(te.name) + '</h3><p class="st">' + esc(te.school || '') + ' · ' + totalOf(cells) + ' ' + t.votes +
          ' · ' + chip(rgb) + Math.round(learningOf(cells) * 100) + '% ' + t.learning +
          ' · ' + Math.round(likingOf(cells) * 100) + '% ' + t.liked +
          (dunno ? ' · ✋ ' + t.dunnoCount(dunno) : '') + '</p></div></div>' +
          squareHtml(cells, t, { big: true, numbers: true, gray: state.gray }) +
          '<h4>' + t.days + '</h4><div id="sk-days"><p class="sk-note">…</p></div>' +
          '<h4>' + t.calendar + '</h4><div id="sk-cal"><p class="sk-note">…</p></div>' +
          rateHtml('dan:' + te.id) + rmpHtml();
        bindCommon(); bindRate('dan:' + te.id); bindRmp('dan:' + te.id);
        danYear(state.tid).then(function (days) {
          if (mine === gen) fillDays(daysWithLocal(days, 'dan:' + te.id), cells);
        }).catch(function () {});
      }).catch(function () {
        if (mine !== gen) return;
        var holder = root.querySelector('#sk-async');
        if (holder) holder.innerHTML = '<p class="sk-note">' + esc(t.loadFail) + '</p>';
      });
    }

    /* Merge this browser's own taps into the per-day series. Without this the
       header total, the square and the "all days" dot move on a vote while the
       dots beside them cannot — so the "all" dot stops being the aggregate of
       the dots printed next to it, which is the first arithmetic anyone checks. */
    function daysWithLocal(days, tid) {
      var mine = localFor(tid, 'vote');
      if (!mine.length) return days;
      var out = days.map(function (d) { return d; });
      var byDay = {};
      out.forEach(function (d, i) { byDay[d.day] = i; });
      mine.forEach(function (r) {
        var i = byDay[r.day];
        if (i == null) {
          var cells = emptyCells();
          cells[r.gy][r.gx] = 1;
          out.push({ day: r.day, cells: cells, total: 1, _local: true });
          byDay[r.day] = out.length - 1;
        } else {
          var d = out[i];
          var c = flipRows(flipRows(d.cells));   /* copy */
          c[r.gy][r.gx]++;
          out[i] = { day: d.day, cells: c, total: d.total + 1, _local: true };
        }
      });
      out.sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
      /* recolour any day we touched, with the same formula as the rest */
      return out.map(function (d) {
        return d._local ? { day: d.day, cells: d.cells, total: d.total, color: css(aggRGB(d.cells)) } : d;
      });
    }

    function fillDays(days, allCells) {
      var wrap = root.querySelector('#sk-days'), cal = root.querySelector('#sk-cal');
      if (!wrap) return;
      var shown = days.slice(-30);
      var maxT = 1;
      shown.forEach(function (d) { if (d.total > maxT) maxT = d.total; });
      wrap.innerHTML = '<div class="sk-daysrow">' +
        '<button class="sk-dayc on" data-day="all" title="' + t.allDays + '" style="width:30px;height:30px;background:' + css(aggRGB(allCells)) + '"></button>' +
        shown.map(function (d) {
          var sz = Math.round(16 + 18 * Math.sqrt(d.total / maxT));
          var col = state.gray ? 'rgba(128,128,128,' + (0.3 + 0.7 * d.total / maxT).toFixed(2) + ')' : d.color;
          return '<button class="sk-dayc" data-day="' + esc(d.day) + '" title="' + esc(d.day) + ' · ' + d.total + '" style="width:' + sz + 'px;height:' + sz + 'px;background:' + esc(col) + '"></button>';
        }).join('') + '</div><div id="sk-dayrid"></div>';
      /* 3-month calendar */
      if (cal) {
        var byDay = {};
        days.forEach(function (d) { byDay[d.day] = d; });
        var end = new Date(today + 'T12:00:00');
        var start = new Date(end); start.setDate(start.getDate() - 90);
        while (start.getDay() !== 1) start.setDate(start.getDate() - 1); /* align Monday */
        var cur = new Date(start), h = '';
        while (cur <= end) {
          var k = ymd(cur), d = byDay[k];
          var colr = d ? (state.gray ? 'rgba(128,128,128,.8)' : d.color) : '';
          h += '<i title="' + esc(k) + (d ? ' · ' + d.total : '') + '"' + (colr ? ' style="background:' + esc(colr) + '"' : '') + '></i>';
          cur.setDate(cur.getDate() + 1);
        }
        cal.innerHTML = '<div class="sk-cal">' + h + '</div>';
      }
      wrap.querySelectorAll('[data-day]').forEach(function (b) {
        b.addEventListener('click', function () {
          wrap.querySelectorAll('[data-day]').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          var dk = b.getAttribute('data-day');
          var grid = root.querySelector('#sk-dayrid');
          if (dk === 'all') { grid.innerHTML = ''; return; }
          var d = null;
          days.forEach(function (x) { if (x.day === dk) d = x; });
          grid.innerHTML = d ? '<div style="max-width:200px;margin:10px 0">' + gridHtml(d.cells, { numbers: true, gray: state.gray }) + '</div>' : '';
        });
      });
    }

    /* A percentage off a handful of taps is noise, and this page names real
       institutions. Below the threshold we show no percentage and no rank —
       UNLV on 5 taps was topping the table above MaineTech on 248.
       ponytail: fixed threshold; per USTALENIA the school admin is supposed to
       decide how many answers make a result, so this becomes a setting later. */
    var MIN_RATED = 30;

    function uniCompare() {
      var enough = [], thin = [];
      dan.schools.forEach(function (s) { (totalOf(s.cells) >= MIN_RATED ? enough : thin).push(s); });
      enough.sort(function (a, b) { return learningOf(b.cells) - learningOf(a.cells); });
      thin.sort(function (a, b) { return totalOf(b.cells) - totalOf(a.cells); });
      function card(s, rank) {
        var rgb = aggRGB(s.cells), n = totalOf(s.cells);
        var sub = rank
          ? chip(rgb) + Math.round(learningOf(s.cells) * 100) + '% ' + t.learning +
            ' · ' + Math.round(likingOf(s.cells) * 100) + '% ' + t.liked
          : '<span style="opacity:.8">' + (n ? t.tooFew(n) : t.notRated) + '</span>';
        return '<div class="sk-card" data-school="' + esc(s.id) + '" style="border-color:' + css(rgb) + '">' +
          '<p class="nm">' + esc(s.name) + '</p>' +
          (s.state ? '<p class="sb" style="margin:0 0 4px">' + esc(s.state) + '</p>' : '') +
          '<p class="sb">' + sub + '</p>' +
          gridHtml(s.cells, { mini: true, gray: state.gray }) + '</div>';
      }
      return '<p class="sk-lede">' + t.compareLede + '</p><div class="sk-cmp">' +
        enough.map(function (s) { return card(s, true); }).join('') + '</div>' +
        (thin.length ? '<h4>' + t.tooFewTitle + '</h4><div class="sk-cmp">' +
          thin.map(function (s) { return card(s, false); }).join('') + '</div>' : '');
    }

    /* school mode */
    function schoolGrid() {
      return '<p class="sk-lede">' + t.teachersLede + '</p><div class="sk-cards">' +
        SCHOOL_TEACHERS.map(function (te) {
          var cells = cellsFromVotes(schoolVotes(te.id));
          var rgb = aggRGB(cells);
          return '<div class="sk-card" data-steacher="' + te.id + '" style="border-color:' + css(rgb) + '">' +
            avatarHtml(te.name, null) +
            '<p class="nm">' + esc(te.name) + '</p><p class="sb">' + esc(te.subject[lang]) + ' · ' + totalOf(cells) + ' ' + t.votes + '</p>' +
            gridHtml(cells, { mini: true, gray: state.gray }) + '</div>';
        }).join('') + '</div>';
    }

    function schoolTeacherView(tid) {
      var te = schoolTeacher(tid);
      if (!te) return '';
      var votes = schoolVotes(tid);
      var cells = cellsFromVotes(votes);
      var rgb = aggRGB(cells);
      var dunno = localFor(tid, 'dunno').filter(function (r) { return r.day === today; }).length;
      var pats = patterns(votes, t);
      /* day stream from synthetic days */
      /* generated days are Mon-Fri, so on a weekend the viewer's own tap would
         have no bucket and vanish from the very section that exists to show the
         stream. Take the union of school days and days actually voted on. */
      var dayKeys = school.days.slice();
      votes.forEach(function (v) { if (dayKeys.indexOf(v.day) === -1) dayKeys.push(v.day); });
      dayKeys.sort();
      var dayRow = dayKeys.map(function (day) {
        var dv = votes.filter(function (v) { return v.day === day; });
        var c = cellsFromVotes(dv);
        return { day: day, total: dv.length, cells: c, rgb: aggRGB(c) };
      });
      var maxT = 1;
      dayRow.forEach(function (d) { if (d.total > maxT) maxT = d.total; });
      return '<p class="sk-back"><button data-back>' + t.back + '</button></p>' +
        '<div class="sk-head">' + avatarHtml(te.name, null) +
        '<div><h3>' + esc(te.name) + '</h3><p class="st">' + esc(te.subject[lang]) + ' · ' + totalOf(cells) + ' ' + t.votes +
        ' · ' + chip(rgb) + Math.round(learningOf(cells) * 100) + '% ' + t.learning +
        ' · ' + Math.round(likingOf(cells) * 100) + '% ' + t.liked +
        (dunno ? ' · ✋ ' + t.dunnoCount(dunno) : '') + '</p></div></div>' +
        squareHtml(cells, t, { big: true, numbers: true, gray: state.gray }) +
        '<h4>' + t.patterns + '</h4>' +
        (pats.length ? pats.map(function (p) { return '<div class="sk-alert">' + esc(p) + '</div>'; }).join('')
          : '<div class="sk-alert sk-ok">' + t.patNone + '</div>') +
        '<h4>' + t.days + '</h4><div class="sk-daysrow">' +
        dayRow.map(function (d) {
          var sz = Math.round(14 + 18 * Math.sqrt(d.total / maxT));
          var col = state.gray ? 'rgba(128,128,128,' + (0.3 + 0.7 * d.total / maxT).toFixed(2) + ')' : css(d.rgb);
          return '<span class="sk-dayc" title="' + d.day + ' · ' + d.total + '" style="width:' + sz + 'px;height:' + sz + 'px;background:' + col + '"></span>';
        }).join('') + '</div>' +
        '<h4>' + t.class_ + '</h4><div class="sk-kids">' +
        KIDS.map(function (kid) {
          var kv = votes.filter(function (v) { return v.student === kid; });
          var kc = cellsFromVotes(kv);
          return '<div class="sk-kid"><p class="nm">' + esc(kid) + '</p>' +
            gridHtml(kc, { gray: state.gray }) + '<p class="ct">' + t.studentVotes(kv.length) + '</p></div>';
        }).join('') + '</div>' +
        rateHtml(tid);
    }

    function schoolCumulative() {
      var cells = emptyCells();
      SCHOOL_TEACHERS.forEach(function (te) { addCells(cells, cellsFromVotes(schoolVotes(te.id))); });
      var rgb = aggRGB(cells);
      return '<p class="sk-lede">' + t.cumulativeLede + '</p>' +
        '<div class="sk-head"><div><h3>' + SCHOOL_NAME + '</h3><p class="st">' + totalOf(cells) + ' ' + t.votes +
        ' · ' + chip(rgb) + Math.round(learningOf(cells) * 100) + '% ' + t.learning + ' · ' + Math.round(likingOf(cells) * 100) + '% ' + t.liked + '</p></div></div>' +
        squareHtml(cells, t, { big: true, numbers: true, gray: state.gray });
    }

    /* rating input */
    function rateHtml(tid) {
      var hasLocal = localFor(tid, 'vote').length > 0;
      return '<h4>' + t.rateHere + '</h4><div class="sk-rate"><div>' +
        squareHtml(emptyCells(), t, { input: true, gray: state.gray }) +
        '</div><div><p class="sk-note">' + t.rateHint + '</p>' +
        '<p style="margin:12px 0 0"><button data-dunno>✋ ' + t.dunno + '</button> ' +
        '<button data-undo' + (hasLocal ? '' : ' hidden') + '>' + t.undo + '</button></p>' +
        '<p class="sk-status"></p></div></div>';
    }
    function bindRate(tid) { bindRateIn(root, tid); }
    function bindRateIn(scope, tid) {
      scope.querySelectorAll('.sk-grid.input .c').forEach(function (c) {
        c.addEventListener('click', function () {
          var gx = +c.getAttribute('data-gx'), gy = +c.getAttribute('data-gy');
          /* a refused write must say so — otherwise the tap looks like a dead UI */
          status(localSave({ type: 'vote', tid: tid, gx: gx, gy: gy, day: today, ts: new Date().toISOString() })
            ? t.voted : t.noStore);
          var u = scope.querySelector('[data-undo]');
          if (u) u.hidden = false;
          render();
        });
      });
      var d = scope.querySelector('[data-dunno]');
      if (d) d.addEventListener('click', function () {
        status(localSave({ type: 'dunno', tid: tid, day: today, ts: new Date().toISOString() })
          ? t.dunnoDone : t.noStore);
        render();
      });
      var u = scope.querySelector('[data-undo]');
      if (u) u.addEventListener('click', function () { localDropLast(tid); render(); });
      function status(msg) {
        try { sessionStorage.setItem('sk_status', msg); } catch (e) {}
      }
    }

    /* RMP import (university teacher card) */
    function rmpHtml() {
      var os = function () {
        var o = '';
        for (var i = 1; i <= 5; i++) o += '<option value="' + i + '">' + i + '</option>';
        return o;
      };
      return '<div class="sk-rmp"><h4 style="margin-top:0">' + t.rmp + '</h4><p class="sk-note">' + t.rmpHint + '</p>' +
        '<p style="margin:10px 0 0"><label>' + t.rmpQ + ' <select data-rmpq>' + os() + '</select></label>' +
        '<label>' + t.rmpD + ' <select data-rmpd>' + os() + '</select></label>' +
        '<button data-rmpadd>' + t.rmpAdd + '</button></p></div>';
    }
    function bindRmp(tid) {
      var b = root.querySelector('[data-rmpadd]');
      if (!b) return;
      b.addEventListener('click', function () {
        var q = +root.querySelector('[data-rmpq]').value, d = +root.querySelector('[data-rmpd]').value;
        /* quality -> liked (gx), difficulty -> learned proxy (gy); e.g. Dan's q2/d4 example */
        localSave({ type: 'vote', tid: tid, gx: q - 1, gy: d - 1, day: today, ts: new Date().toISOString(), src: 'rmp' });
        render();
      });
    }

    function legendHtml() {
      var items = [
        { pos: [4, 4], name: t.target, sub: t.targetSub },
        { pos: [0, 4], name: t.admit, sub: t.admitSub },
        { pos: [4, 0], name: t.fun, sub: t.funSub },
        { pos: [0, 0], name: t.trouble, sub: t.troubleSub }
      ];
      return '<h4>' + t.legendTitle + '</h4><div class="sk-legend">' +
        items.map(function (it) {
          var c = emptyCells(); c[it.pos[1]][it.pos[0]] = 1;
          return '<div class="sk-leg"><div style="max-width:64px;margin-bottom:6px">' + gridHtml(c, { gray: state.gray }) + '</div>' +
            '<b>' + it.name + '</b><i>' + it.sub + '</i></div>';
        }).join('') + '</div>';
    }

    /* ---------- bindings ---------- */
    /* bindCommon runs again after async fills; guard so no element gets two listeners */
    function once(node, fn) {
      if (node.__skBound) return;
      node.__skBound = true;
      node.addEventListener('click', fn);
    }
    function bindTop() {
      root.querySelectorAll('[data-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.mode = b.getAttribute('data-mode'); state.view = 'schools'; state.sid = state.tid = null; render();
        });
      });
      root.querySelectorAll('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.view = b.getAttribute('data-tab'); state.sid = state.tid = null; render();
        });
      });
      var g = root.querySelector('[data-gray]');
      if (g) g.addEventListener('click', function () { state.gray = !state.gray; render(); });
    }
    function bindCommon() {
      root.querySelectorAll('[data-school]').forEach(function (c) {
        once(c, function () {
          state.sid = c.getAttribute('data-school'); state.view = 'teachers'; state.tid = null; render();
        });
      });
      root.querySelectorAll('[data-teacher]').forEach(function (c) {
        once(c, function () {
          state.tid = c.getAttribute('data-teacher'); state.view = 'teacher'; render();
        });
      });
      root.querySelectorAll('[data-steacher]').forEach(function (c) {
        once(c, function () {
          state.tid = c.getAttribute('data-steacher'); state.view = 'teacher'; render();
        });
      });
      root.querySelectorAll('[data-back]').forEach(function (b) {
        once(b, function () {
          if (state.view === 'teacher' && state.mode === 'uni') { state.view = 'teachers'; state.tid = null; }
          else { state.view = 'schools'; state.sid = state.tid = null; }
          render();
        });
      });
      var st = root.querySelector('.sk-status');
      if (st) {
        try {
          var msg = sessionStorage.getItem('sk_status');
          if (msg) { st.textContent = msg; sessionStorage.removeItem('sk_status'); }
        } catch (e) {}
      }
      if (state.mode === 'school' && state.view === 'teacher' && state.tid) bindRateIn(root, state.tid);
    }

    readHash();
    render();
    danLoad().then(render);
    global.addEventListener('hashchange', function () { readHash(); render(); });
  }

  /* ---------- GUIDE: the big annotated square + "be the student" ----------
     Dan names the four corners and the target; the other 21 cells get their
     meaning by composing the two axis steps, which is what the axes already
     say — no meaning is attributed to him that he did not state. */
  var G = {
    en: {
      title: 'How to use the square',
      lead: 'You answer two questions with one tap. Nothing to type. No form.',
      qy: 'How much did I learn?', qx: 'Did I like it?',
      axisY: 'MORE LEARNED', axisX: 'LIKED IT MORE',
      learn: ['nothing', 'very little', 'some', 'a lot', 'a whole lot'],
      like: ['hated it', 'did not like it', 'did not mind', 'liked it', 'loved it'],
      learnShort: ['nothing', 'very little', 'some', 'a lot', 'a whole lot'],
      likeShort: ['hate', 'dislike', 'so-so', 'like', 'love'],
      pick: 'Tap any square to read what it means.',
      cell: function (l, k) { return 'I learned <b>' + l + '</b> and I <b>' + k + '</b>.'; },
      notes: {
        '4,4': 'This is what every teacher wants. Dan calls it the target.',
        '0,4': 'Learned a lot, but had a bad time. Dan: “I didn’t get along with the teacher, but I learned a lot.” Not all bad.',
        '4,0': 'Had fun, learned nothing. Nice class, but something is missing.',
        '0,0': 'The bad corner. Dan says this is where you look first, before a small problem grows into a big one.',
        '2,2': 'The middle. “I showed up, I learned something.” An ordinary day.'
      },
      tryTitle: 'Try it — you are the student',
      tryLead: 'Imagine you just left a class. One tap. That is the whole thing a pupil does.',
      tryDone: function (l, k) { return 'You said: learned <b>' + l + '</b>, <b>' + k + '</b>. Your tap is now one dot in this teacher’s week — nobody sees your name, and one tap on its own means nothing. It counts when the same person keeps answering the same way.'; },
      tryAgain: 'Tap again',
      tryHand: '✋ I’m not keeping up',
      tryHandDone: 'The teacher sees a raised hand — and does not see who raised it.'
    },
    pl: {
      title: 'Jak używać kwadratu',
      lead: 'Jednym kliknięciem odpowiadasz na dwa pytania. Nic nie piszesz. Żadnej ankiety.',
      qy: 'Ile się nauczyłem?', qx: 'Czy mi się podobało?',
      axisY: 'WIĘCEJ NAUKI', axisX: 'BARDZIEJ MI SIĘ PODOBAŁO',
      learn: ['nic', 'bardzo mało', 'trochę', 'dużo', 'bardzo dużo'],
      like: ['nie znosiłem', 'nie podobało mi się', 'było mi obojętnie', 'podobało mi się', 'bardzo mi się podobało'],
      learnShort: ['nic', 'mało', 'trochę', 'dużo', 'bardzo dużo'],
      likeShort: ['nie znoszę', 'nie lubię', 'obojętnie', 'lubię', 'uwielbiam'],
      pick: 'Kliknij dowolne pole, żeby przeczytać, co znaczy.',
      cell: function (l, k) { return 'Nauczyłem się <b>' + l + '</b> i <b>' + k + '</b>.'; },
      notes: {
        '4,4': 'O to chodzi każdemu nauczycielowi. Dan nazywa to celem.',
        '0,4': 'Dużo się nauczyłem, ale było mi ciężko. Dan: „nie dogadywałem się z nauczycielem, ale dużo się nauczyłem”. To nie jest zły wynik.',
        '4,0': 'Było fajnie, ale nic z tego nie wyniosłem. Miłe zajęcia, tylko czegoś brakuje.',
        '0,0': 'Zły róg. Dan mówi, że tu się patrzy pierwsze — zanim mały problem zrobi się duży.',
        '2,2': 'Środek. „Byłem, czegoś się nauczyłem.” Zwykły dzień.'
      },
      tryTitle: 'Spróbuj — jesteś uczniem',
      tryLead: 'Wyobraź sobie, że właśnie wyszedłeś z lekcji. Jedno kliknięcie. Tyle robi uczeń.',
      tryDone: function (l, k) { return 'Powiedziałeś: nauczyłem się <b>' + l + '</b>, <b>' + k + '</b>. Twoje kliknięcie jest teraz jedną kropką w tygodniu tego nauczyciela — nikt nie widzi twojego imienia, a jedno kliknięcie samo w sobie nic nie znaczy. Liczy się, gdy ta sama osoba odpowiada tak wiele razy.'; },
      tryAgain: 'Kliknij jeszcze raz',
      tryHand: '✋ Nie nadążam',
      tryHandDone: 'Nauczyciel widzi podniesioną rękę — i nie widzi, kto ją podniósł.'
    }
  };

  var GCSS = '' +
    '.skg{--gline:var(--line,#dce2e9);--gmut:var(--muted,#59646f)}' +
    '.skg .skg-lead{color:var(--gmut);max-width:56ch;margin:0 0 18px;font-size:17px}' +
    '.skg .skg-qs{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}' +
    '.skg .skg-q{border:1px solid var(--gline);border-radius:999px;padding:7px 15px;font-size:15px;background:var(--card,#fff)}' +
    '.skg .skg-q b{font-weight:700}' +
    '.skg .skg-wrap{display:grid;grid-template-columns:26px 1fr;gap:8px;max-width:620px}' +
    '.skg .skg-yax{position:relative;display:flex;align-items:center;justify-content:center}' +
    '.skg .skg-yax span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.12em;color:var(--gmut)}' +
    '.skg .skg-xax{grid-column:2;display:flex;align-items:center;justify-content:center;gap:8px;font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.12em;color:var(--gmut);margin-top:8px}' +
    '.skg .skg-arrow{stroke:var(--gmut);fill:none;stroke-width:1.4}' +
    '.skg .skg-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;aspect-ratio:1}' +
    '.skg .skg-c{border:0;border-radius:5px;cursor:pointer;padding:4px 3px;font:inherit;color:#fff;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center;line-height:1.15;min-width:0}' +
    '.skg .skg-c em{font-style:normal;font-size:12px;font-weight:600;word-break:break-word}' +
    '.skg .skg-c:hover,.skg .skg-c:focus-visible{outline:3px solid currentColor;outline-offset:-4px}' +
    '.skg .skg-c[aria-pressed="true"]{outline:3px solid currentColor;outline-offset:-4px}' +
    '.skg .skg-out{margin:16px 0 0;padding:14px 16px;border-left:3px solid var(--accent,#0e7a6b);' +
      'background:var(--card,#fff);border-radius:0 10px 10px 0;font-size:16px;max-width:620px;min-height:3.4em}' +
    '.skg .skg-out .skg-note{display:block;margin-top:7px;color:var(--gmut);font-size:14.5px}' +
    '.skg .skg-try{margin-top:14px;display:flex;gap:10px;flex-wrap:wrap}' +
    '.skg button.skg-btn{font:inherit;font-size:15px;padding:9px 16px;border-radius:9px;border:1px solid var(--gline);background:var(--card,#fff);color:inherit;cursor:pointer}' +
    '.skg button.skg-btn:hover{border-color:var(--accent,#0e7a6b)}' +
    '@media(max-width:520px){.skg .skg-c em{display:none}.skg .skg-c{min-height:52px}}';

  function arrowSvg(vertical) {
    return vertical
      ? '<svg viewBox="0 0 12 90" width="12" height="90" aria-hidden="true"><path class="skg-arrow" d="M6 88 V6 M2.2 10 L6 3 L9.8 10"/></svg>'
      : '<svg viewBox="0 0 90 12" width="90" height="12" aria-hidden="true"><path class="skg-arrow" d="M2 6 H84 M80 2.2 L87 6 L80 9.8"/></svg>';
  }

  /* Skola.guide(el, lang) — the explainer square, standalone from the data app */
  function guide(el, lang) {
    injectCss();
    if (!document.getElementById('skg-css')) {
      var st = document.createElement('style');
      st.id = 'skg-css'; st.textContent = GCSS;
      document.head.appendChild(st);
    }
    var g = G[lang === 'pl' ? 'pl' : 'en'];
    var root = document.createElement('div');
    root.className = 'skg';
    el.appendChild(root);

    var cells = '';
    for (var gy = 4; gy >= 0; gy--) {
      for (var gx = 0; gx < 5; gx++) {
        var c = COL_RGB[gx];
        /* darker toward the bottom so the vertical axis reads even in greyscale */
        var shade = 0.42 + 0.58 * (gy / 4);
        var r = Math.round(c[0] * shade), gg = Math.round(c[1] * shade), bb = Math.round(c[2] * shade);
        /* text colour by perceived luminance — white on yellow is unreadable */
        var lum = (0.299 * r + 0.587 * gg + 0.114 * bb) / 255;
        var ink = lum > 0.55 ? '#0d1117' : '#ffffff';
        var sh = lum > 0.55 ? 'none' : '0 1px 3px rgba(0,0,0,.85)';
        cells += '<button type="button" class="skg-c" data-gx="' + gx + '" data-gy="' + gy + '"' +
          ' aria-pressed="false" style="background:rgb(' + r + ',' + gg + ',' + bb + ');color:' + ink +
          ';text-shadow:' + sh + '">' +
          '<em>' + esc(g.learnShort[gy]) + '</em><em>' + esc(g.likeShort[gx]) + '</em></button>';
      }
    }

    root.innerHTML =
      '<p class="skg-lead">' + esc(g.lead) + '</p>' +
      '<div class="skg-qs"><span class="skg-q">↕ ' + esc(g.qy) + '</span>' +
      '<span class="skg-q">↔ ' + esc(g.qx) + '</span></div>' +
      '<div class="skg-wrap">' +
        '<div class="skg-yax">' + arrowSvg(true) + '<span>' + esc(g.axisY) + '</span></div>' +
        '<div class="skg-grid">' + cells + '</div>' +
        '<div class="skg-xax"><span>' + esc(g.axisX) + '</span>' + arrowSvg(false) + '</div>' +
      '</div>' +
      '<p class="skg-out" role="status">' + esc(g.pick) + '</p>' +
      '<div class="skg-try">' +
        '<button type="button" class="skg-btn" data-hand>' + esc(g.tryHand) + '</button>' +
      '</div>';

    var out = root.querySelector('.skg-out');
    root.querySelectorAll('.skg-c').forEach(function (b) {
      function show() {
        root.querySelectorAll('.skg-c').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        var gx = +b.getAttribute('data-gx'), gy = +b.getAttribute('data-gy');
        var note = g.notes[gx + ',' + gy];
        out.innerHTML = g.cell(esc(g.learn[gy]), esc(g.like[gx])) +
          (note ? '<span class="skg-note">' + esc(note) + '</span>' : '') +
          '<span class="skg-note">' + g.tryDone(esc(g.learn[gy]), esc(g.like[gx])) + '</span>';
      }
      b.addEventListener('click', show);
      b.addEventListener('mouseenter', function () {
        if (!root.querySelector('.skg-c[aria-pressed="true"]')) show();
      });
    });
    var hand = root.querySelector('[data-hand]');
    hand.addEventListener('click', function () {
      out.innerHTML = esc(g.tryHandDone);
      root.querySelectorAll('.skg-c').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
    });
  }

  /* exports (browser + node self-check) */
  var api = {
    mount: mount,
    guide: guide,
    _math: { aggRGB: aggRGB, learningOf: learningOf, likingOf: likingOf, totalOf: totalOf, colSums: colSums, cellsFromVotes: cellsFromVotes, patterns: patterns, flipRows: flipRows },
    _gen: { genSchool: genSchool, mulberry32: mulberry32 }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Skola = api;
})(typeof window !== 'undefined' ? window : {});
