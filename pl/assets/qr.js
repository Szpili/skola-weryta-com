/* Lesson / teacher / student QR. No accounts.
   Teacher URL is a bookmark. Lesson QR goes on the last slide.
   Student slips are optional one-vote tokens for that lesson only.
   ponytail: QR image via qrserver; URL text is the fallback. */
(function (global) {
  'use strict';

  var IVY = [
    ['brown', 'Brown'], ['columbia', 'Columbia'], ['cornell', 'Cornell'],
    ['dartmouth', 'Dartmouth'], ['harvard', 'Harvard'], ['penn', 'Penn'],
    ['princeton', 'Princeton'], ['yale', 'Yale']
  ];

  function qs() {
    try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); }
  }
  function slug(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'lecture';
  }
  function rnd() {
    var a = new Uint8Array(4);
    var i;
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(a);
    else for (i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0;
    return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function fnv(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function studentTok(k, i) { return fnv(k + ':' + i); }
  function mmdd(d) {
    d = d || new Date();
    return ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
  }
  function ymdInput(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dirBase() {
    return location.origin + location.pathname.replace(/[^/]+$/, '');
  }
  function qrSrc(url, size) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&margin=6&data=' + encodeURIComponent(url);
  }
  function card(url, label, size, cls) {
    size = size || 200;
    return (
      '<figure class="skq-fig ' + (cls || '') + '">' +
        '<img alt="" width="' + size + '" height="' + size + '" src="' + qrSrc(url, size) + '">' +
        '<figcaption><strong>' + label + '</strong><br><a href="' + url + '">' + url.replace(/^https?:\/\//, '') + '</a></figcaption>' +
      '</figure>'
    );
  }

  function mount(el, opts) {
    opts = opts || {};
    var lang = opts.lang === 'pl' ? 'pl' : 'en';
    var T = lang === 'pl' ? {
      eyebrow: 'Nauczyciel · kody QR',
      h1a: 'Ostatni slajd to', h1b: 'jeden kod lekcji.',
      lede: 'Student skanuje telefonem i stuka w kwadrat. Żadnego konta. Opcjonalnie drukujesz kartki studentów — każda kartka to jeden głos na tę lekcję.',
      school: 'Uczelnia',
      handle: 'Twoja sygnatura (zostaje w Twoim QR)',
      handlePh: 'np. smith',
      title: 'Wykład / lab',
      titlePh: 'np. organic lab 3',
      date: 'Dzień',
      n: 'Kartek studentów',
      make: 'Zrób kody',
      print: 'Drukuj arkusz',
      results: 'Wyniki tej lekcji',
      teacher: 'Twój kod (zakładka)',
      lesson: 'Kod lekcji — ostatni slajd',
      slips: 'Kartki studentów — jeden skan = jeden głos',
      slip: 'Student',
      none: 'Wypełnij sygnaturę i tytuł, potem „Zrób kody”.',
      votes: 'głosów w bazie'
    } : {
      eyebrow: 'Teacher · QR codes',
      h1a: 'Last slide is', h1b: 'one lesson code.',
      lede: 'The student scans with a phone and taps the square. No account. Optionally print student slips — each slip is one vote on this lesson.',
      school: 'School',
      handle: 'Your handle (stays in your QR)',
      handlePh: 'e.g. smith',
      title: 'Lecture / lab',
      titlePh: 'e.g. organic lab 3',
      date: 'Day',
      n: 'Student slips',
      make: 'Make codes',
      print: 'Print sheet',
      results: 'Results for this lesson',
      teacher: 'Your code (bookmark this)',
      lesson: 'Lesson code — last slide',
      slips: 'Student slips — one scan = one vote',
      slip: 'Student',
      none: 'Fill in a handle and a title, then Make codes.',
      votes: 'votes in the database'
    };

    var q = qs();
    var school = q.get('u') || 'harvard';
    var handle = (q.get('t') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
    var title = q.get('n') || '';
    var day = q.get('d') || ymdInput();
    var k = (q.get('k') || '').replace(/[^a-z0-9]/gi, '').slice(0, 12);
    var count = Math.min(80, Math.max(0, parseInt(q.get('c') || '24', 10) || 24));
    var pool = (q.get('p') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 80);

    el.innerHTML =
      '<p class="eyebrow">' + T.eyebrow + '</p>' +
      '<h1>' + T.h1a + ' <span class="light">' + T.h1b + '</span></h1>' +
      '<p class="lede">' + T.lede + '</p>' +
      '<form class="skq-form" id="skq-form">' +
        '<p class="skq-lab">' + T.school + '</p>' +
        '<div class="chips" id="skq-ivy"></div>' +
        '<label>' + T.handle + '<input name="t" maxlength="24" placeholder="' + T.handlePh + '" value="' + handle + '"></label>' +
        '<label>' + T.title + '<input name="title" maxlength="40" placeholder="' + T.titlePh + '" value="' + (title.replace(/"/g, '')) + '"></label>' +
        '<label>' + T.date + '<input name="d" type="date" value="' + day + '"></label>' +
        '<label>' + T.n + '<input name="c" type="number" min="0" max="80" value="' + count + '"></label>' +
        '<p class="skq-actions"><button type="submit" class="cta">' + T.make + '</button> ' +
        '<button type="button" class="cta ghost" id="skq-print">' + T.print + '</button></p>' +
      '</form>' +
      '<div id="skq-out" class="skq-out"></div>';

    var ivyEl = el.querySelector('#skq-ivy');
    IVY.forEach(function (row) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = row[1];
      b.setAttribute('data-u', row[0]);
      if (row[0] === school) b.className = 'on';
      b.addEventListener('click', function () {
        school = row[0];
        ivyEl.querySelectorAll('button').forEach(function (x) { x.className = x.getAttribute('data-u') === school ? 'on' : ''; });
      });
      ivyEl.appendChild(b);
    });

    function rateUrl(p, s) {
      var u = dirBase() + 'rate.html?p=' + encodeURIComponent(p);
      if (s) u += '&s=' + encodeURIComponent(s);
      return u;
    }
    function teacherUrl(state) {
      var p = new URLSearchParams();
      p.set('u', state.school);
      p.set('t', state.handle);
      p.set('n', state.title);
      p.set('d', state.day);
      p.set('c', String(state.count));
      p.set('k', state.k);
      p.set('p', state.pool);
      return dirBase() + 'qr.html?' + p.toString();
    }
    function push(state) {
      var u = new URL(teacherUrl(state));
      history.replaceState(null, '', u.pathname + u.search);
    }
    function paint(state) {
      var out = el.querySelector('#skq-out');
      if (!state.pool || !state.k) {
        out.innerHTML = '<p class="lede">' + T.none + '</p>';
        return;
      }
      var lesson = rateUrl(state.pool);
      var teach = teacherUrl(state);
      var html = card(teach, T.teacher, 180, 'skq-teacher') + card(lesson, T.lesson, 280, 'skq-lesson');
      html += '<p><a class="cta ghost" href="' + lesson + '">' + T.results + '</a></p>';
      html += '<p id="skq-tally" class="skq-tally"></p>';
      if (state.count > 0) {
        html += '<h2>' + T.slips + '</h2><div class="skq-grid">';
        for (var i = 1; i <= state.count; i++) {
          var tok = studentTok(state.k, i);
          html += card(rateUrl(state.pool, tok), T.slip + ' ' + i, 140, 'skq-slip');
        }
        html += '</div>';
      }
      out.innerHTML = html;
      var api = global.SKOLA_API;
      if (api) {
        fetch(api + '?action=tally&p=' + encodeURIComponent(state.pool))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var n = el.querySelector('#skq-tally');
            if (n && j && j.ok) n.textContent = (j.total || 0) + ' ' + T.votes;
          }).catch(function () {});
      }
    }

    function currentState(form) {
      var f = form || el.querySelector('#skq-form');
      var h = slug(f.elements.t.value);
      var titleEl = f.elements.namedItem('title');
      var rawTitle = titleEl ? String(titleEl.value || '') : '';
      var tit = slug(rawTitle);
      var d = (f.elements.d && f.elements.d.value) || ymdInput();
      var c = Math.min(80, Math.max(0, parseInt(f.elements.c.value, 10) || 0));
      var md = d.slice(5, 7) + d.slice(8, 10);
      var p = pool;
      var key = k;
      if (!key) key = rnd();
      if (!p) p = ('ivy-' + school + (h ? '-' + h : '') + '-' + tit + '-' + md).slice(0, 80);
      return { school: school, handle: h, title: rawTitle.trim() || tit, day: d, count: c, k: key, pool: p };
    }

    el.querySelector('#skq-form').addEventListener('submit', function (e) {
      e.preventDefault();
      pool = '';
      var st = currentState();
      k = st.k;
      pool = st.pool;
      push(st);
      paint(st);
    });
    el.querySelector('#skq-print').addEventListener('click', function () { window.print(); });

    if (pool && (k || handle)) {
      if (!k) k = rnd();
      paint({ school: school, handle: handle, title: title, day: day, count: count, k: k, pool: pool });
    } else {
      paint({});
    }
  }

  global.SkolaQR = { mount: mount, ivy: IVY };
})(typeof window !== 'undefined' ? window : this);
