(function () {
  var $ = function (id) { return document.getElementById(id); };
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var slide = 0, hourlyOpen = false;

  function eur(v) { return Math.round(v || 0).toLocaleString('de-DE') + ' €'; }
  function fmt(v, f) {
    if (v === null || v === undefined) return '—';
    if (f === 'pct') return Math.round(v) + '%';
    if (f === 'eur') return eur(v);
    if (f === 'dec') return (Math.round(v * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return Math.round(v).toLocaleString('de-DE');
  }
  function cls(ok) { return ok === true ? 'v ok' : ok === false ? 'v bad' : 'v na'; }
  function el(tag, className, text) { var e = document.createElement(tag); if (className) e.className = className; if (text != null) e.textContent = text; return e; }
  function show(view) {
    ['vLoading', 'vLogin', 'vError', 'vData'].forEach(function (v) { $(v).hidden = v !== view; });
    var data = view === 'vData';
    $('nav').hidden = !data; $('dots').hidden = !data; $('foot').hidden = !(data || view === 'vError');
  }

  function render(m) {
    if (!m || m.state === 'login') { show('vLogin'); $('hdrName').textContent = 'SALES OS'; $('hdrStand').textContent = SOS.config.env === 'DEV' ? 'Testsystem' : ''; return; }
    if (m.state === 'noemp') { show('vError'); $('errText').textContent = 'Zu deinem Zugang (' + m.email + ') ist kein Mitarbeiter hinterlegt.'; return; }
    if (m.state === 'error') { show('vError'); $('errText').textContent = m.error || 'Unbekannter Fehler'; return; }
    show('vData');
    var first = (m.emp.name || '').split(' ')[0];
    $('hdrName').textContent = 'SALES OS · ' + first.toUpperCase();
    var ts = m.lastSync ? new Date(m.lastSync) : new Date(m.loadedAt);
    $('hdrStand').textContent = 'Stand ' + ('0' + ts.getHours()).slice(-2) + ':' + ('0' + ts.getMinutes()).slice(-2) + ' Uhr';
    $('staleBar').hidden = !m.stale;
    var monat = MONATE[+m.monthKey.slice(5, 7) - 1];
    $('monthHead').textContent = monat.toUpperCase();

    // Testmodus fuer Admins ohne eigenen Mitarbeiter-Datensatz
    $('previewBar').hidden = !m.preview;
    if (m.preview && m.choices) {
      var sel = $('previewSel'); sel.textContent = '';
      m.choices.forEach(function (c) { var o = el('option', null, c.name); o.value = c.id; if (c.id === m.emp.id) o.selected = true; sel.appendChild(o); });
    }

    // Seite 1: Kennzahlen heute / Monat
    var box = $('kRows'); box.textContent = '';
    m.kpis.forEach(function (k) {
      var r = el('div', 'kgrid krow');
      r.appendChild(el('span', 'n', k.label));
      function valCell(v, ok, s) {
        var w = el('span', 'vcell'); w.appendChild(el('span', cls(ok), fmt(v, k.fmt)));
        if (s != null) w.appendChild(el('span', 'sub', 'Soll ' + fmt(s, k.fmt)));
        return w;
      }
      r.appendChild(valCell(k.today, k.okToday, k.sollToday));
      r.appendChild(valCell(k.month, k.okMonth, k.sollMonth));
      r.appendChild(el('span', 'z', k.ziel));
      box.appendChild(r);
    });

    // Seite 2: Provision
    var p = m.prov;
    $('provLabel').textContent = 'DEINE PROVISION · ' + monat.toUpperCase();
    $('provBig').textContent = eur(p.provision);
    $('provMeta').textContent = 'Stand heute, vorläufig · Beschäftigungsmonat ' + (p.bm >= 3 ? '3+' : p.bm);
    var pb = $('provBox'); pb.textContent = '';
    function line(a, b, extra) { var d = el('div', 'pl' + (extra ? ' ' + extra : '')); d.appendChild(el('span', null, a)); d.appendChild(el('b', null, b)); pb.appendChild(d); }
    line('Basisprovision (' + p.qualOpt + ' Opt. × ' + p.basisProOpt.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €)', eur(p.basis));
    line('Umsatzprovision', eur(p.umsatz));
    line('Reguläre Provision', eur(p.regulaer), 'sum');
    var abzText = p.mindestleistungGreift ? 'Abzug: Mindestleistung Opt./Std. nicht erreicht' : (p.verfehlt ? 'Abzug: ' + p.verfehlt + (p.verfehlt === 1 ? ' KPI' : ' KPIs') + ' verfehlt (je −20 %)' : 'Abzug: alle KPIs erreicht');
    line(abzText, (p.abzug > 0.5 ? '−' : '') + eur(p.abzug), p.abzug > 0.5 ? 'red' : '');
    line('Provision', eur(p.provision), 'sum');
    var pk = $('provKpis'); pk.textContent = '';
    p.checks.forEach(function (c) {
      var r = el('div', 'pgrid');
      var ic = el('span', 'ico ' + (c.ok ? 'ok' : 'bad'), c.ok ? '✓' : '✕'); ic.setAttribute('aria-label', c.ok ? 'erreicht' : 'unter Ziel');
      r.appendChild(ic); r.appendChild(el('span', null, c.label));
      r.appendChild(el('span', cls(c.ok), fmt(c.ist, c.fmt)));
      r.appendChild(el('span', 'z', (c.dir === 'lte' ? '≤ ' : '≥ ') + fmt(c.ziel, c.fmt)));
      pk.appendChild(r);
    });
    var tip = $('provTip'); tip.textContent = '';
    var missed = p.checks.filter(function (c) { return !c.ok; });
    if (p.mindestleistungGreift) {
      tip.appendChild(el('b', null, 'Mindestleistung: '));
      tip.appendChild(document.createTextNode('Ab ' + fmt(p.mindestleistung, 'dec') + ' Opt./Std. im Monat gilt wieder die volle Berechnung.'));
    } else if (missed.length) {
      var closest = missed.slice().sort(function (a, b) { return Math.abs(a.ziel - a.ist) / (a.ziel || 1) - Math.abs(b.ziel - b.ist) / (b.ziel || 1); })[0];
      var gap = Math.abs(closest.ziel - closest.ist);
      tip.appendChild(el('b', null, 'Jede erreichte KPI bringt dir +' + eur(p.wertProKpi) + '. '));
      tip.appendChild(document.createTextNode('Am nächsten dran: ' + closest.label + ' (noch ' + (closest.fmt === 'pct' ? Math.ceil(gap) + ' Prozentpunkte' : fmt(gap, 'dec')) + ').'));
    } else {
      tip.appendChild(el('b', null, 'Alle KPIs erreicht – '));
      tip.appendChild(document.createTextNode('volle Provision, weiter so!'));
    }
    setSlide(slide);
    renderHourly();
  }

  function renderHourly() {
    SOS.storageGet(['snapshots']).then(function (st) {
      var res = SOS.hourlyBars(st.snapshots, 8, 17);
      var bars = $('bars'); bars.textContent = '';
      var max = Math.max.apply(null, res.bars.map(function (b) { return b.val; }).concat([1]));
      var nowH = new Date().getHours();
      res.bars.forEach(function (b) {
        var d = el('div', 'bar' + (!b.known ? ' unknown' : b.h === nowH ? ' now' : ''));
        d.style.height = b.known ? Math.max(6, Math.round(b.val / max * 100)) + '%' : '6%';
        d.title = b.h + ' Uhr: ' + (b.known ? b.val + ' Opt.' : 'kein Wert');
        bars.appendChild(d);
      });
      $('hourlyHint').textContent = res.has ? 'Erfasst, solange Chrome geöffnet ist.' : 'Der Verlauf füllt sich im Laufe des Tages, solange Chrome geöffnet ist.';
    });
  }

  function setSlide(i) {
    slide = (i + 2) % 2;
    $('s1').hidden = slide !== 0; $('s2').hidden = slide !== 1;
    $('slideTitle').textContent = slide === 0 ? 'Deine Kennzahlen' : 'Deine Provision';
    var dots = $('dots').children; dots[0].className = 'dot' + (slide === 0 ? ' on' : ''); dots[1].className = 'dot' + (slide === 1 ? ' on' : '');
  }

  function refresh() {
    return new Promise(function (res) { chrome.runtime.sendMessage({ type: 'refresh' }, function (m) { render(m); res(m); }); });
  }

  $('prev').addEventListener('click', function () { setSlide(slide - 1); });
  $('next').addEventListener('click', function () { setSlide(slide + 1); });
  document.addEventListener('keydown', function (e) { if (!$('vData').hidden) { if (e.key === 'ArrowLeft') setSlide(slide - 1); if (e.key === 'ArrowRight') setSlide(slide + 1); } });
  $('toggleHourly').addEventListener('click', function () {
    hourlyOpen = !hourlyOpen; $('hourly').hidden = !hourlyOpen;
    $('toggleHourly').textContent = hourlyOpen ? 'Stundenverlauf ausblenden ▴' : 'Stundenverlauf anzeigen ▾';
    SOS.storageSet({ hourlyOpen: hourlyOpen });
  });
  $('vLogin').addEventListener('submit', function (e) {
    e.preventDefault();
    $('loginBtn').disabled = true; $('loginErr').hidden = true;
    SOS.login($('email').value.trim(), $('pw').value).then(function () { show('vLoading'); return refresh(); })
      .catch(function (err) { $('loginErr').textContent = err.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : err.message; $('loginErr').hidden = false; })
      .finally(function () { $('loginBtn').disabled = false; });
  });
  $('retry').addEventListener('click', function () { show('vLoading'); refresh(); });
  $('logout').addEventListener('click', function (e) { e.preventDefault(); SOS.logout().then(refresh); });
  $('openBoard').addEventListener('click', function (e) { e.preventDefault(); chrome.tabs.create({ url: SOS.config.boardUrl }); });
  $('previewSel').addEventListener('change', function () { show('vLoading'); SOS.storageSet({ previewEmpId: this.value }).then(refresh); });

  // Sofort den letzten Stand zeigen, dann im Hintergrund aktualisieren
  SOS.storageGet(['model', 'session', 'hourlyOpen']).then(function (st) {
    hourlyOpen = !!st.hourlyOpen; $('hourly').hidden = !hourlyOpen;
    $('toggleHourly').textContent = hourlyOpen ? 'Stundenverlauf ausblenden ▴' : 'Stundenverlauf anzeigen ▾';
    if (!st.session) { render({ state: 'login' }); return; }
    if (st.model && st.model.state === 'ok') render(st.model);
    refresh();
  });
})();
