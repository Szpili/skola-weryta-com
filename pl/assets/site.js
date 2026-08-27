/* Role chips + school/university nouns. Visitor strings follow <html lang>. */
(function () {
  var LANG = (document.documentElement.lang || 'pl').slice(0, 2) === 'en' ? 'en' : 'pl';

  var PACK = {
    pl: {
      you: 'Ty',
      then: 'Co potem widać',
      copy: {
        szkola: { lesson: 'lekcji', person: 'uczeń', adult: 'nauczyciel', place: 'szkoła' },
        uczelnia: { lesson: 'zajęć', person: 'student', adult: 'wykładowca', place: 'uczelnia' }
      },
      roles: {
        uczen: {
          track: 'szkola',
          you: 'Otwierasz plan lekcji (albo skanujesz QR po lekcji) i stukasz jedno pole kwadratu. Bez konta, bez nazwiska, kilka sekund.',
          then: 'Nauczyciel widzi obrazek klasy, nie Twoje imię. Jedno kliknięcie nic nie znaczy — liczy się, gdy ktoś wiele razy odpowiada tak samo.'
        },
        rodzic: {
          track: 'szkola',
          you: 'Dziecko głosuje bez logowania. Głosy nie mają trwałego identyfikatora, więc nie powstaje lista „kto co kliknął”.',
          then: 'Szkoła może pokazać obrazek klasy. Domyślnie nie da się śledzić jednego dziecka w czasie — to świadomy kompromis, nie brak funkcji.'
        },
        nauczyciel: {
          track: 'szkola',
          you: 'Drukujesz arkusz z kodem QR na przedmiot albo na jedną lekcję. Po lekcji patrzysz na kwadrat.',
          then: 'Kolor mówi o nastawieniu, wysokość o nauce. Lewy górny róg (uczą się, nie lubią) to sygnał do pytania — nie do kary.'
        },
        dyrektor: {
          track: 'szkola',
          you: 'Ustalasz częstotliwość: po lekcji, raz dziennie albo raz w semestrze. Ten widok jest dla ciebie i pedagoga.',
          then: 'Widać, gdzie warto zapytać, co się dzieje. To nie jest narzędzie do rozliczania nauczycieli. Pojedynczy zły głos to szum.'
        },
        student: {
          track: 'uczelnia',
          you: 'Po zajęciach stukasz w jedno pole: ile się nauczyłem i na ile mi się podobało. Nic więcej.',
          then: 'Wykładowca i osoba od jakości kształcenia widzą rozkład, nie jedną gwiazdkę. Wymagające zajęcia, z których dużo wynosisz, nie zlewają się ze słabymi.'
        }
      }
    },
    en: {
      you: 'You',
      then: 'What you see next',
      copy: {
        szkola: { lesson: 'class', person: 'student', adult: 'teacher', place: 'school' },
        uczelnia: { lesson: 'class', person: 'college student', adult: 'professor', place: 'university' }
      },
      roles: {
        uczen: {
          track: 'szkola',
          you: 'You open the timetable (or scan a QR after class) and tap one cell on the square. No account, no name, a few seconds.',
          then: 'The teacher sees a picture of the class, not your name. One tap means nothing — it counts when someone keeps answering the same way.'
        },
        rodzic: {
          track: 'szkola',
          you: 'Your child votes without logging in. Votes have no lasting identifier, so there is no list of who tapped what.',
          then: 'The school can show a picture of the class. By default you cannot follow one child over time — that is a deliberate trade-off, not a missing feature.'
        },
        nauczyciel: {
          track: 'szkola',
          you: 'You print a sheet with a QR code for a subject or a single class. After class you look at the square.',
          then: 'Color is attitude; height is learning. The top-left corner (they learn, they do not like it) is a prompt to ask — not to punish.'
        },
        dyrektor: {
          track: 'szkola',
          you: 'You set the frequency: after class, once a day, or once a semester. This view is for you and the counselor.',
          then: 'You see where it is worth asking what is going on. This is not a tool for holding teachers to account. A single bad vote is noise.'
        },
        student: {
          track: 'uczelnia',
          you: 'After class you tap one cell: how much you learned and how much you liked it. Nothing else.',
          then: 'The professor and whoever owns teaching quality see a spread, not one star. A demanding class you learned a lot from does not look the same as a weak one.'
        }
      }
    }
  };

  var L = PACK[LANG];
  var COPY = L.copy;
  var ROLES = L.roles;

  function apply(roleId) {
    var role = ROLES[roleId] || ROLES.uczen;
    var track = COPY[role.track];
    document.querySelectorAll('[data-role]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-role') === roleId);
    });
    document.querySelectorAll('[data-track]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-track') === role.track);
    });
    var box = document.getElementById('role-copy');
    if (box) {
      box.innerHTML =
        '<p><span class="k">' + L.you + '</span><br>' + role.you + '</p>' +
        '<p><span class="k">' + L.then + '</span><br>' + role.then + '</p>';
    }
    document.querySelectorAll('[data-noun]').forEach(function (el) {
      var key = el.getAttribute('data-noun');
      if (track[key]) el.textContent = track[key];
    });
  }

  document.querySelectorAll('[data-role]').forEach(function (b) {
    b.addEventListener('click', function () { apply(b.getAttribute('data-role')); });
  });
  document.querySelectorAll('[data-track]').forEach(function (b) {
    b.addEventListener('click', function () {
      var track = b.getAttribute('data-track');
      var first = Object.keys(ROLES).find(function (k) { return ROLES[k].track === track; });
      apply(first);
    });
  });
  apply('uczen');
})();
