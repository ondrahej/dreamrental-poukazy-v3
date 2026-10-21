// Hlavička po odscrollování, objevování sekcí, pás flotily a konfigurátor poukazu.
(function () {
  var hlavicka = document.querySelector('.hlavicka');
  function scroll() { hlavicka.classList.toggle('je-scroll', window.scrollY > 20); }
  scroll();
  window.addEventListener('scroll', scroll, { passive: true });

  // objevování: jen když prohlížeč umí IntersectionObserver a uživatel nechce omezit pohyb
  var klid = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !klid) {
    var io = new IntersectionObserver(function (zaznamy) {
      zaznamy.forEach(function (z) { if (z.isIntersecting) { z.target.classList.add('je-videt'); io.unobserve(z.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.sekce__hlava, .darek, .karta, .pole, .souhrn, .kroky li, .vic-lidi, .auto, .recenze__karta, .otazky__seznam, .brana__text').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('objev'); io.observe(el); }
    });
  }

  // líně načítané fotky se objeví plynule, ne skokem
  document.querySelectorAll('img[loading="lazy"]').forEach(function (im) {
    if (im.complete) return;
    im.classList.add('ceka');
    var hotovo = function () { im.classList.remove('ceka'); };
    im.addEventListener('load', hotovo, { once: true });
    im.addEventListener('error', hotovo, { once: true });
  });

  // odpočet do Štědrého dne v štítku úvodu
  var odpocet = document.querySelector('[data-odpocet]');
  if (odpocet) {
    var dnes = new Date(); dnes.setHours(0, 0, 0, 0);
    var dni = Math.round((new Date(dnes.getFullYear(), 11, 24) - dnes) / 864e5);
    if (dni > 0) {
      odpocet.textContent = 'do Štědrého dne ' + (dni === 1 ? 'zbývá 1 den' : dni < 5 ? 'zbývají ' + dni + ' dny' : 'zbývá ' + dni + ' dní');
      odpocet.hidden = false;
    }
  }

  // flotila: šipky posouvají pás o kartu
  var pas = document.querySelector('.flotila__pas');
  document.querySelectorAll('[data-posun]').forEach(function (b) {
    b.addEventListener('click', function () {
      var karta = pas.querySelector('.auto');
      pas.scrollBy({ left: (karta.offsetWidth + 16) * 2 * Number(b.dataset.posun), behavior: 'smooth' });
    });
  });

  // KONFIGURÁTOR: seznam poukazů (dárky, auta z flotily, částky), každý s vlastním počtem
  var f = document.getElementById('formular');
  if (!f) return;
  var karta = document.getElementById('karta');
  var k = function (n) { return karta.querySelector('[data-k="' + n + '"]'); };
  var s = function (n) { return f.querySelector('[data-s="' + n + '"]'); };
  var seznam = document.getElementById('polozky');
  var volbyNahledu = document.getElementById('nahled-volby');
  var poptat = document.getElementById('poptat');
  var NB = ' ';
  var kc = function (n) { return Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, NB) + NB + 'Kč'; };
  var slovo = function (n) { return n === 1 ? 'poukaz' : n < 5 ? 'poukazy' : 'poukazů'; };

  // adresu (a odesílatele) doplňuje edge funkce na Netlify; viditelné adresy sjednotíme s ní
  var adresa = poptat.getAttribute('href').replace('mailto:', '').split('?')[0];
  document.querySelectorAll('[data-mail]').forEach(function (a) { a.textContent = a.getAttribute('href').replace('mailto:', '').split('?')[0]; });
  // firma z osobního odkazu (/nazev-firmy) se rovnou propíše do poukazu
  var zOdkazu = document.getElementById('firma-z-odkazu');
  if (zOdkazu && zOdkazu.textContent.trim() && !f.firma.value) f.firma.value = zOdkazu.textContent.trim();

  // katalog: tři dárky z karet, auta z pásu flotily
  var katalog = {};
  document.querySelectorAll('[data-darek]').forEach(function (el) {
    katalog[el.dataset.darek] = { klic: el.dataset.darek, nazev: el.dataset.nazev, cena: +el.dataset.cena, bezne: +el.dataset.bezne, foto: el.dataset.foto, darek: true };
  });
  document.querySelectorAll('[data-auto]').forEach(function (el) {
    var klic = el.dataset.auto === 'tesla-cybertruck' ? 'cybertruck' : el.dataset.auto;
    if (katalog[klic]) return;
    katalog[klic] = { klic: klic, nazev: el.dataset.nazev, cena: +el.dataset.cena, bezne: +el.dataset.bezne, foto: el.dataset.foto };
  });
  var FOTO_CASTKA = 'img/auta-porsche-gt4-mr-800.webp';

  // položky v košíku: tři dárky jsou vždy vidět (i s nulou), ostatní se přidávají
  var polozky = ['sportovni', 'cybertruck', 'premiova'].map(function (kl) {
    return Object.assign({}, katalog[kl], { pocet: kl === 'cybertruck' ? 10 : 0, pevna: true });
  });
  var nahled = 'cybertruck';

  function najdi(klic) { return polozky.filter(function (p) { return p.klic === klic; })[0]; }
  function pridej(klic, kolik) {
    var p = najdi(klic);
    if (p) { p.pocet = Math.min(999, p.pocet + (kolik || 1)); }
    else {
      if (klic.indexOf('castka-') === 0) {
        var hodnota = +klic.slice(7);
        p = { klic: klic, nazev: 'Poukaz na ' + kc(hodnota), cena: hodnota, foto: FOTO_CASTKA, castka: true, pocet: kolik || 1 };
      } else {
        p = Object.assign({}, katalog[klic], { pocet: kolik || 1 });
      }
      polozky.push(p);
    }
    nahled = klic;
    vykresli();
    return p;
  }

  function radek(p) {
    var li = document.createElement('li');
    li.className = 'polozka' + (p.pocet > 0 ? ' je-vybrano' : '') + (p.klic === nahled ? ' je-nahled' : '');
    li.innerHTML =
      '<button type="button" class="polozka__nahled" data-nahled="' + p.klic + '" aria-label="Ukázat v náhledu">' +
        '<img src="' + p.foto + '" alt="" width="120" height="64">' +
        '<span><b></b><small></small></span></button>' +
      '<span class="polozka__pocet"><button type="button" data-zmena="-1" aria-label="O jeden méně">−</button>' +
        '<input type="number" min="0" max="999" inputmode="numeric" aria-label="Počet"><button type="button" data-zmena="1" aria-label="O jeden víc">+</button></span>' +
      (p.pevna ? '' : '<button type="button" class="polozka__smazat" data-smazat aria-label="Odebrat">×</button>');
    li.querySelector('b').textContent = p.nazev;
    li.querySelector('small').textContent = p.castka ? 'auto si vyberou sami' : kc(p.cena) + ' za kus';
    var vstup = li.querySelector('input');
    vstup.value = p.pocet;
    li.querySelectorAll('[data-zmena]').forEach(function (b) {
      b.addEventListener('click', function () { p.pocet = Math.max(0, Math.min(999, p.pocet + +b.dataset.zmena)); if (p.pocet > 0) nahled = p.klic; vykresli(); });
    });
    vstup.addEventListener('change', function () { var n = parseInt(vstup.value, 10); p.pocet = isNaN(n) ? 0 : Math.max(0, Math.min(999, n)); vykresli(); });
    li.querySelector('[data-nahled]').addEventListener('click', function () { if (!p.pocet) p.pocet = 1; nahled = p.klic; vykresli(); });
    var smazat = li.querySelector('[data-smazat]');
    if (smazat) smazat.addEventListener('click', function () {
      polozky.splice(polozky.indexOf(p), 1);
      if (nahled === p.klic) nahled = (polozky.filter(function (x) { return x.pocet; })[0] || polozky[1]).klic;
      vykresli();
    });
    return li;
  }

  var posledniFoto = '', posledniText = '';
  function vykresli() {
    seznam.innerHTML = '';
    polozky.forEach(function (p) { seznam.appendChild(radek(p)); });

    var vybrane = polozky.filter(function (p) { return p.pocet > 0; });
    if (!najdi(nahled) || (!najdi(nahled).pocet && vybrane.length)) nahled = (vybrane[0] || polozky[1]).klic;
    var n = najdi(nahled);

    // náhled poukazu
    k('nazev').textContent = n.nazev;
    k('firma').textContent = f.firma.value.trim() || 'vaší firmy';
    k('venovani').textContent = f.venovani.value.trim() || ' ';
    if (n.foto !== posledniFoto) {
      var foto = k('foto');
      posledniFoto = n.foto;
      foto.classList.add('je-zmena');
      setTimeout(function () { foto.src = posledniFoto; foto.onload = function () { foto.classList.remove('je-zmena'); }; }, 250);
    }
    volbyNahledu.innerHTML = '';
    if (vybrane.length > 1) {
      vybrane.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.pocet + '× ' + p.nazev.replace(/^Den s (Teslou )?/, '');
        b.setAttribute('aria-pressed', String(p.klic === nahled));
        b.addEventListener('click', function () { nahled = p.klic; vykresli(); });
        volbyNahledu.appendChild(b);
      });
    }

    // souhrn
    var kusu = 0, celkem = 0, bezne = 0, castky = false;
    var radky = s('polozky');
    radky.innerHTML = '';
    vybrane.forEach(function (p) {
      kusu += p.pocet; celkem += p.pocet * p.cena;
      if (p.castka) castky = true; else bezne += p.pocet * p.bezne;
      var li = document.createElement('li');
      li.innerHTML = '<span></span><span></span>';
      li.children[0].textContent = p.pocet + ' × ' + p.nazev;
      li.children[1].textContent = kc(p.pocet * p.cena);
      radky.appendChild(li);
    });
    s('kusu').textContent = kusu ? kusu + ' ' + slovo(kusu) + ' celkem' : 'Zatím žádný poukaz';
    s('celkem').textContent = kc(celkem);
    var uspora = bezne - (celkem - polozky.filter(function (p) { return p.castka; }).reduce(function (a, p) { return a + p.pocet * p.cena; }, 0));
    s('pozn').textContent = 'včetně DPH' + (uspora > 0 ? ' · oproti běžné ceně ušetříte ' + kc(uspora) : '') +
      (castky ? ' · slevu u poukazů na částku potvrdíme v nabídce' : '');
    poptat.classList.toggle('je-neaktivni', !kusu);

    // text poptávky do e-mailu
    var text = ['Dobrý den,', '', 'máme zájem o firemní vánoční poukazy DREAMRENTAL:', '']
      .concat(vybrane.map(function (p) { return '• ' + p.pocet + ' × ' + p.nazev + ' (' + kc(p.cena) + ' za kus)'; }))
      .concat(['', 'Orientační cena celkem: ' + kc(celkem) + ' vč. DPH',
        'Firma: ' + (f.firma.value.trim() || '(doplníme)'),
        'Věnování: ' + (f.venovani.value.trim() || '(doplníme)'),
        '', 'Logo pošleme v příloze.', '', 'Děkujeme'])
      .join('\n').replace(/ /g, ' ');
    posledniText = text;
    poptat.href = 'mailto:' + adresa + '?subject=' + encodeURIComponent('Firemní poukazy DREAMRENTAL – ' + kusu + ' ' + slovo(kusu)) + '&body=' + encodeURIComponent(text);
  }

  f.addEventListener('input', function (e) { if (e.target.name === 'firma' || e.target.name === 'venovani') vykresli(); });
  f.addEventListener('submit', function (e) { e.preventDefault(); });
  poptat.addEventListener('click', function (e) { if (poptat.classList.contains('je-neaktivni')) e.preventDefault(); });

  document.getElementById('pridat-auto').addEventListener('click', function () {
    var v = document.getElementById('vyber-auto');
    if (!v.value) { v.focus(); return; }
    pridej(v.value); v.value = '';
  });
  document.getElementById('pridat-castku').addEventListener('click', function () {
    var c = document.getElementById('castka');
    var hodnota = Math.round((parseInt(c.value, 10) || 0) / 100) * 100;
    if (hodnota < 500 || hodnota > 200000) { c.focus(); c.select(); return; }
    pridej('castka-' + hodnota);
  });

  f.querySelectorAll('[data-venovani]').forEach(function (b) {
    b.addEventListener('click', function () { f.venovani.value = b.dataset.venovani; vykresli(); });
  });

  // když se e-mail neotevře (webmail), poptávku si zkopírují
  var kopie = document.getElementById('kopie');
  if (kopie && navigator.clipboard) {
    kopie.addEventListener('click', function () {
      navigator.clipboard.writeText(posledniText).then(function () {
        kopie.textContent = 'Zkopírováno. Vložte do e-mailu na ' + adresa;
        kopie.classList.add('je-hotovo');
      });
    });
  } else if (kopie) { kopie.hidden = true; }

  // logo jen do náhledu, nikam se neposílá
  f.logo.addEventListener('change', function () {
    var soubor = f.logo.files && f.logo.files[0];
    var img = k('logo'), text = k('logo-text');
    if (!soubor) { img.hidden = true; text.hidden = false; return; }
    var r = new FileReader();
    r.onload = function () { img.src = r.result; img.alt = 'Logo firmy'; img.hidden = false; text.hidden = true; };
    r.readAsDataURL(soubor);
  });

  // tlačítka u dárků: dárek do košíku (aspoň 1 kus), do náhledu a sjet ke konfigurátoru
  document.querySelectorAll('[data-vybrat]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = najdi(b.dataset.vybrat);
      if (!p.pocet) p.pocet = 1;
      nahled = p.klic; vykresli();
      document.getElementById('poukaz').scrollIntoView({ behavior: klid ? 'auto' : 'smooth' });
    });
  });

  // flotila: auto přidá do poukazů a ukáže potvrzení, stránka zůstane, kde je
  var oznameni = document.createElement('div');
  oznameni.className = 'oznameni'; oznameni.setAttribute('role', 'status'); oznameni.hidden = true;
  oznameni.innerHTML = '<span></span><a href="#poukaz">Zobrazit poukazy</a>';
  document.body.appendChild(oznameni);
  var casovac;
  document.querySelectorAll('[data-pridat-auto]').forEach(function (b) {
    b.addEventListener('click', function () {
      var klic = b.dataset.pridatAuto === 'tesla-cybertruck' ? 'cybertruck' : b.dataset.pridatAuto;
      var p = pridej(klic);
      oznameni.firstChild.textContent = 'Přidáno: ' + p.nazev + ' (' + p.pocet + '×)';
      oznameni.hidden = false;
      requestAnimationFrame(function () { oznameni.classList.add('je-videt'); });
      b.classList.add('je-pridano');
      setTimeout(function () { b.classList.remove('je-pridano'); }, 1200);
      clearTimeout(casovac);
      casovac = setTimeout(function () { oznameni.classList.remove('je-videt'); setTimeout(function () { oznameni.hidden = true; }, 300); }, 3500);
    });
  });

  vykresli();
})();
