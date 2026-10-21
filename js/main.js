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

  // odpočet do Štědrého dne: vždy z dnešního data, o půlnoci se přepočítá; po Štědrém dni zmizí
  var odpocet = document.querySelector('[data-odpocet]');
  function odpocitej() {
    var dnes = new Date(); dnes.setHours(0, 0, 0, 0);
    var dni = Math.round((new Date(dnes.getFullYear(), 11, 24) - dnes) / 864e5);
    odpocet.hidden = dni < 0;
    odpocet.textContent = dni === 0 ? 'Štědrý den je dnes' : 'do Štědrého dne ' + (dni === 1 ? 'zbývá 1 den' : dni < 5 ? 'zbývají ' + dni + ' dny' : 'zbývá ' + dni + ' dní');
    var pulnoc = new Date(dnes); pulnoc.setDate(pulnoc.getDate() + 1);
    setTimeout(odpocitej, pulnoc - new Date() + 1000);
  }
  if (odpocet) odpocitej();

  // odkazy uvnitř stránky: dojet rovnou na obsah sekce (ne na její horní okraj), pod pevnou hlavičku
  var CILE = { poukaz: '.poukaz__in', darky: '.darky .sekce__hlava', postup: '.postup__in', otazky: '.otazky__in', kontakt: '.brana__in', flotila: '.flotila .sekce__hlava', recenze: '.recenze__in' };
  function dojed(id) {
    var sekce = document.getElementById(id);
    if (!sekce) return false;
    var cil = (CILE[id] && document.querySelector(CILE[id])) || sekce;
    var y = cil.getBoundingClientRect().top + window.scrollY - hlavicka.offsetHeight - (id === 'poukaz' ? 24 : 8);
    window.scrollTo({ top: Math.max(0, y), behavior: klid ? 'auto' : 'smooth' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    if (dojed(a.getAttribute('href').slice(1))) { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); }
  });

  // visačky „Jak to probíhá“: provázek každé visačky začíná přesně na girlandě (girlanda je křivka přes celou šířku)
  var provazek = document.querySelector('.postup__provazek');
  var visacky = [].slice.call(document.querySelectorAll('.visacka'));
  var MEZERA = [2.4, 4.4, 2.4];
  function zavesVisacky() {
    if (!provazek || !visacky.length) return;
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var pr = provazek.getBoundingClientRect();
    var viditelny = pr.width > 0 && getComputedStyle(provazek).display !== 'none';
    var seznamTop = visacky[0].parentElement.getBoundingClientRect().top;
    visacky.forEach(function (v, i) {
      var nit = (viditelny ? MEZERA[i % 3] : 2.4) * rem, visi = nit;
      if (viditelny) {
        var r = v.getBoundingClientRect();
        var t = (r.left + r.width / 2 - pr.left) / pr.width;               // křivka M0 6 Q600 70 1200 6: x roste lineárně s t
        var yJednotky = 6 * (1 - t) * (1 - t) + 140 * t * (1 - t) + 6 * t * t;
        var lano = pr.top + yJednotky * pr.height / 60 - seznamTop;          // výška girlandy nad horním okrajem seznamu
        visi = lano + nit;
      }
      v.style.setProperty('--visi', visi + 'px');
      v.style.setProperty('--nit', nit + 'px');
    });
  }
  zavesVisacky();
  window.addEventListener('resize', zavesVisacky);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(zavesVisacky);
  window.addEventListener('load', zavesVisacky);

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
  var adresa = (document.querySelector('[data-mail]') || { getAttribute: function () { return 'mailto:info@dreamrental-poukazy.eu'; } }).getAttribute('href').replace('mailto:', '').split('?')[0];
  document.querySelectorAll('[data-mail]').forEach(function (a) { a.textContent = a.getAttribute('href').replace('mailto:', '').split('?')[0]; });
  // z jakého osobního odkazu přišli (dreamrental-poukazy.eu/nazev-firmy), jde do poptávky
  var odkaz = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, '').replace(/index\.html$/, '')) || '(bez osobního odkazu)';

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
  // stejná cesta k obrázkům jako u aut (na stránce firmy /nazev-firmy/ jsou cesty od kořene)
  var FOTO_CASTKA = ((document.querySelector('[data-foto]') || {}).getAttribute ? document.querySelector('[data-foto]').getAttribute('data-foto').replace(/img\/[^/]*$/, '') : '') + 'img/darek-mrak.webp';

  // položky v košíku: tři dárky jsou vždy vidět (i s nulou), ostatní se přidávají
  var polozky = ['sportovni', 'cybertruck', 'premiova'].map(function (kl) {
    return Object.assign({}, katalog[kl], { pocet: 0, pevna: true });
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

  var posledniFoto = '', posledniText = '', souhrnPoptavky = {};
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
      var jeDarek = !!n.castka;
      setTimeout(function () { foto.classList.toggle('karta__auto--darek', jeDarek); foto.src = posledniFoto; foto.onload = function () { foto.classList.remove('je-zmena'); }; }, 250);
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
    souhrnPoptavky = { kusu: kusu, celkem: kc(celkem).replace(/\u00a0/g, ' '),
      radky: vybrane.map(function (p) { return p.pocet + ' × ' + p.nazev + ' (' + kc(p.cena) + ' za kus, celkem ' + kc(p.pocet * p.cena) + ')'; }).join('\n').replace(/\u00a0/g, ' ') };
    var text = ['Dobrý den,', '', 'máme zájem o firemní vánoční poukazy DREAMRENTAL:', '']
      .concat(vybrane.map(function (p) { return '• ' + p.pocet + ' × ' + p.nazev + ' (' + kc(p.cena) + ' za kus)'; }))
      .concat(['', 'Orientační cena celkem: ' + kc(celkem) + ' vč. DPH',
        'Věnování: ' + (f.venovani.value.trim() || '(doplníme)'),
        '', 'Děkujeme'])
      .join('\n').replace(/ /g, ' ');
    posledniText = 'mailto:' + adresa + '?subject=' + encodeURIComponent('Firemní poukazy DREAMRENTAL – ' + kusu + ' ' + slovo(kusu)) + '&body=' + encodeURIComponent(text);
  }

  f.addEventListener('input', function (e) { if (e.target.name === 'firma' || e.target.name === 'venovani') vykresli(); });
  // ODESLÁNÍ: poptávka jde přes formuláře Netlify, Ondřejovi přijde e-mailem; když to selže, otevře se e-mail
  var PRIJEM = 'https://dreamrental-poukazy.netlify.app/';
  var chyba = f.querySelector('[data-chyba]');
  var hotovo = f.querySelector('[data-hotovo]');
  var souhrnBox = f.querySelector('.souhrn');
  function ukazChybu(text, pole) {
    chyba.textContent = text; chyba.hidden = !text;
    if (pole) pole.focus();
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!souhrnPoptavky.kusu) {
      ukazChybu('');
      seznam.classList.add('je-zablesk-seznam'); setTimeout(function () { seznam.classList.remove('je-zablesk-seznam'); }, 1600);
      dojed('poukaz');
      return;
    }
    if (!f.jmeno.value.trim()) return ukazChybu('Doplňte prosím jméno, ať víme, komu napsat.', f.jmeno);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return ukazChybu('Zkontrolujte prosím e-mail, na ten vám pošleme nabídku.', f.email);
    ukazChybu('');
    var kdo = f.firma_kontakt.value.trim() || f.jmeno.value.trim();
    var data = new URLSearchParams({
      'form-name': 'poptavka', 'bot-field': '',
      subject: 'Poptávka poukazů: ' + kdo + ' – ' + souhrnPoptavky.kusu + ' ks, ' + souhrnPoptavky.celkem,
      jmeno: f.jmeno.value.trim(), firma: f.firma_kontakt.value.trim(), email: f.email.value.trim(), telefon: f.telefon.value.trim(),
      poukazy: souhrnPoptavky.radky, celkem: souhrnPoptavky.celkem + ' vč. DPH (' + souhrnPoptavky.kusu + ' ks)',
      venovani: f.venovani.value.trim(), na_poukaz_od: f.firma.value.trim(), poznamka: f.poznamka.value.trim(), odkaz: odkaz
    });
    poptat.disabled = true; poptat.classList.add('je-odesilani');
    // poptávky přijímá Netlify (formulář „poptavka“); z jiné domény (GitHub Pages) se posílá bez čtení odpovědi
    var naNetlify = /netlify\.app$/.test(location.hostname);
    fetch(naNetlify ? '/' : PRIJEM, { method: 'POST', mode: naNetlify ? 'same-origin' : 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() })
      .then(function (res) { if (naNetlify && !res.ok) throw new Error(res.status); })
      .then(function () {
        hotovo.querySelector('[data-hotovo-email]').textContent = f.email.value.trim();
        souhrnBox.classList.add('je-odeslano'); hotovo.hidden = false; hotovo.focus();
        if (window.plausible) window.plausible('Poptavka', { props: { kusu: String(souhrnPoptavky.kusu), celkem: souhrnPoptavky.celkem } });
      })
      .catch(function () {
        ukazChybu('Odeslání se nepovedlo. Otevíráme e-mail s vyplněnou poptávkou, stačí ho odeslat.');
        location.href = posledniText;
      })
      .then(function () { poptat.disabled = false; poptat.classList.remove('je-odesilani'); });
  });
  f.querySelector('[data-znovu]').addEventListener('click', function () {
    souhrnBox.classList.remove('je-odeslano'); hotovo.hidden = true;
    polozky.forEach(function (p) { p.pocet = 0; });
    polozky = polozky.filter(function (p) { return p.pevna; });
    vykresli(); dojed('poukaz');
  });


  // VÝBĚR AUTA: okno s fotkami celé flotily, auta se přidávají rovnou tady
  var okno = document.createElement('dialog');
  okno.className = 'vyber';
  okno.setAttribute('aria-labelledby', 'vyber-nadpis');
  var kategorie = ['Vše'];
  var auta = [].slice.call(document.querySelectorAll('.flotila [data-auto]'));
  auta.forEach(function (el) { if (kategorie.indexOf(el.dataset.kat) < 0) kategorie.push(el.dataset.kat); });
  okno.innerHTML =
    '<div class="vyber__hlava"><div><p class="vyber__nadtitul">Poukaz na konkrétní auto</p><h2 id="vyber-nadpis">Vyberte auto z flotily</h2></div>' +
      '<button type="button" class="vyber__zavrit" data-zavrit aria-label="Zavřít">×</button></div>' +
    '<div class="vyber__filtry" role="group" aria-label="Typ auta">' + kategorie.map(function (c, i) {
      return '<button type="button" data-kat="' + c + '" aria-pressed="' + (i === 0) + '">' + c + '</button>'; }).join('') + '</div>' +
    '<ul class="vyber__mrizka" role="list"></ul>' +
    '<div class="vyber__pata"><p data-vyber-souhrn></p><button type="button" class="tlacitko" data-zavrit>Hotovo <span class="sipka" aria-hidden="true"></span></button></div>';
  document.body.appendChild(okno);
  var mrizka = okno.querySelector('.vyber__mrizka');
  auta.forEach(function (el) {
    var klic = el.dataset.auto === 'tesla-cybertruck' ? 'cybertruck' : el.dataset.auto;
    var a = katalog[klic];
    var znacka = el.querySelector('small').textContent;
    var li = document.createElement('li');
    li.className = 'vyber__auto'; li.dataset.kat = el.dataset.kat; li.dataset.klic = klic;
    li.innerHTML = '<div class="vyber__foto"><img src="' + a.foto + '" alt="" loading="lazy" width="400" height="200"><span class="vyber__pocet" hidden></span></div>' +
      '<div class="vyber__text"><p><small></small><b></b></p><p class="vyber__cena"><b></b><s></s></p></div>' +
      '<div class="vyber__akce"><button type="button" class="vyber__pridat" data-plus><span aria-hidden="true">+</span> Přidat</button>' +
      '<span class="vyber__krok" hidden><button type="button" data-minus aria-label="O jeden méně">−</button><output></output><button type="button" data-plus aria-label="O jeden víc">+</button></span></div>';
    li.querySelector('.vyber__text small').textContent = znacka;
    li.querySelector('.vyber__text b').textContent = el.querySelector('.auto__radek p').lastChild.textContent;
    li.querySelector('.vyber__cena b').textContent = kc(a.cena);
    li.querySelector('.vyber__cena s').textContent = kc(a.bezne);
    li.querySelectorAll('[data-plus]').forEach(function (b) { b.addEventListener('click', function () { pridej(klic); obnovOkno(); }); });
    li.querySelector('[data-minus]').addEventListener('click', function () {
      var p = najdi(klic); if (!p) return;
      p.pocet = Math.max(0, p.pocet - 1);
      if (!p.pocet && !p.pevna) polozky.splice(polozky.indexOf(p), 1);
      vykresli(); obnovOkno();
    });
    mrizka.appendChild(li);
  });
  function obnovOkno() {
    var celkem = 0;
    mrizka.querySelectorAll('.vyber__auto').forEach(function (li) {
      var p = najdi(li.dataset.klic), n = p ? p.pocet : 0;
      li.classList.toggle('je-vybrano', n > 0);
      li.querySelector('.vyber__pridat').hidden = n > 0;
      li.querySelector('.vyber__krok').hidden = !n;
      li.querySelector('output').textContent = n;
      var odznak = li.querySelector('.vyber__pocet');
      odznak.hidden = !n; odznak.textContent = n + '× v poukazech';
      celkem += n;
    });
    okno.querySelector('[data-vyber-souhrn]').textContent = celkem ? 'V poukazech máte z flotily ' + celkem + ' ' + slovo(celkem) : 'Klikněte na Přidat u auta, které chcete darovat.';
  }
  okno.querySelectorAll('.vyber__filtry button').forEach(function (b) {
    b.addEventListener('click', function () {
      okno.querySelectorAll('.vyber__filtry button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      mrizka.querySelectorAll('.vyber__auto').forEach(function (li) { li.hidden = b.dataset.kat !== 'Vše' && li.dataset.kat !== b.dataset.kat; });
    });
  });
  function zavri() { okno.classList.add('je-zavirani'); setTimeout(function () { okno.close(); okno.classList.remove('je-zavirani'); }, 200); }
  okno.querySelectorAll('[data-zavrit]').forEach(function (b) { b.addEventListener('click', zavri); });
  okno.addEventListener('click', function (e) { if (e.target === okno) zavri(); });
  okno.addEventListener('close', function () { document.documentElement.classList.remove('je-okno'); });
  document.getElementById('otevrit-flotilu').addEventListener('click', function () {
    obnovOkno();
    document.documentElement.classList.add('je-okno');
    okno.showModal();
    mrizka.scrollTop = 0;
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
      dojed('poukaz');
      var radekNahled = seznam.querySelector('.je-nahled');
      if (radekNahled) { radekNahled.classList.add('je-zablesk'); setTimeout(function () { radekNahled.classList.remove('je-zablesk'); }, 1600); }
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
      if (window.plausible) window.plausible('Pridat auto', { props: { auto: p.nazev } });
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
