(function () {
  var $ = function (id) { return document.getElementById(id); };
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var COL = { ok: '#136c72', bad: '#c62828', ups: '#c97f1c', wka: '#7a62c9', rest: '#e3eae9', lost: '#f2a7a7' };
  var tab = 'heute', model = null;

  function n0(v) { return v == null ? '–' : Math.round(v).toLocaleString('de-DE'); }
  function eur(v) { return v == null ? '–' : Math.round(v).toLocaleString('de-DE') + ' €'; }
  function pct(v) { return v == null ? '–' : Math.round(v) + '%'; }
  function dec(v) { return v == null ? '–' : (Math.round(v * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function colOf(ok) { return ok === true ? COL.ok : ok === false ? COL.bad : '#142a2e'; }
  function clear(id) { var e = $(id); e.textContent = ''; return e; }
  function seg(parent, flex, color) { var d = el('div'); d.style.flex = flex + ' 1 0'; d.style.background = color; parent.appendChild(d); }
  function stand(m) { var ts = m.lastSync ? new Date(m.lastSync) : new Date(m.loadedAt); return ('0' + ts.getHours()).slice(-2) + ':' + ('0' + ts.getMinutes()).slice(-2); }

  function showOnly(id) {
    ['vLoading', 'vLogin', 'vError', 'pHeute', 'pVerlauf', 'pKennzahlen', 'pProvision'].forEach(function (v) { $(v).hidden = v !== id; });
    var data = id.charAt(0) === 'p';
    $('rail').classList.toggle('locked', !data && id !== 'vError');
    if (!data) { $('previewBar').hidden = true; $('staleBar').hidden = true; }
  }

  function setTab(t) {
    tab = t;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    if (model && model.state === 'ok') renderPage();
  }

  function render(m) {
    model = m;
    if (!m || m.state === 'login') { showOnly('vLogin'); $('title').textContent = 'Sales OS'; $('sub').textContent = SOS.config.env === 'DEV' ? 'Testsystem' : ''; return; }
    if (m.state === 'noemp') { showOnly('vError'); $('title').textContent = 'Sales OS'; $('errText').textContent = 'Zu deinem Zugang (' + m.email + ') ist kein Mitarbeiter hinterlegt.'; return; }
    if (m.state === 'error') { showOnly('vError'); $('title').textContent = 'Sales OS'; $('errText').textContent = m.error || 'Unbekannter Fehler'; return; }
    $('staleBar').hidden = !m.stale;
    $('previewBar').hidden = !m.preview;
    if (m.preview && m.choices) {
      var sel = clear('previewSel');
      m.choices.forEach(function (c) { var o = el('option', null, c.name); o.value = c.id; if (c.id === m.emp.id) o.selected = true; sel.appendChild(o); });
    }
    renderPage();
  }

  function renderPage() {
    var m = model, first = (m.emp.name || '').split(' ')[0], monat = MONATE[+m.monthKey.slice(5, 7) - 1];
    if (tab === 'heute') { showOnly('pHeute'); $('title').textContent = 'Hallo ' + first; $('sub').textContent = 'heute · ' + stand(m); renderHeute(m); }
    if (tab === 'verlauf') { showOnly('pVerlauf'); $('title').textContent = 'Verlauf'; $('sub').textContent = 'heute · ' + stand(m); renderVerlauf(m); }
    if (tab === 'kennzahlen') { showOnly('pKennzahlen'); $('title').textContent = 'Kennzahlen'; $('sub').textContent = stand(m); renderKennzahlen(m, monat); }
    if (tab === 'provision') { showOnly('pProvision'); $('title').textContent = 'Provision'; $('sub').textContent = monat + ' · ' + stand(m); renderProvision(m); }
    $('staleBar').hidden = !m.stale; $('previewBar').hidden = !m.preview;
  }

  // ── Heute ──
  function renderHeute(m) {
    var d = m.todayDetail;
    $('hOpt').textContent = n0(d.opt);
    var soll = $('hSoll');
    if (d.soll != null) {
      var diff = Math.ceil(d.soll - d.opt);
      soll.textContent = 'Soll ' + n0(d.soll) + (diff > 0 ? ' · noch ' + diff : ' · im Plan');
      soll.style.color = diff > 0 ? COL.bad : COL.ok;
    } else { soll.textContent = 'kein Tagesziel'; soll.style.color = '#56676a'; }
    $('hMarge').textContent = eur(d.marge);
    var sp = clear('hSplit'), total = Math.max(d.opt, d.soll || 0, 1);
    if (d.oem.n) seg(sp, d.oem.n, COL.ok);
    if (d.ups.n) seg(sp, d.ups.n, COL.ups);
    if (d.wka.n) seg(sp, d.wka.n, COL.wka);
    if (total - d.opt > 0) seg(sp, total - d.opt, COL.rest);
    $('hAvg').textContent = d.avgMarge != null ? 'Ø ' + eur(d.avgMarge) + ' / Opt.' : '';
    var cats = clear('hCats');
    [['OEM', COL.ok, d.oem, d.oem.cr != null ? 'CR ' + pct(d.oem.cr) : ''],
     ['Upsells', COL.ups, d.ups, d.ups.ne + ' nicht erfolgr.'],
     ['WKA', COL.wka, d.wka, d.wka.ne + ' nicht erfolgr.']].forEach(function (c) {
      var r = el('div', 'cat'), dot = el('span', 'dot'); dot.style.background = c[1]; r.appendChild(dot);
      var mid = el('div', 'col'); mid.appendChild(el('span', 'n', c[0]));
      mid.appendChild(el('span', 'xs muted', (c[2].avg != null ? 'Ø ' + eur(c[2].avg) : 'Ø –') + (c[3] ? ' · ' + c[3] : '')));
      r.appendChild(mid); r.appendChild(el('span', 'v', n0(c[2].n))); r.appendChild(el('span', 'm', eur(c[2].marge)));
      cats.appendChild(r);
    });
    var st = clear('hStufen'), s = d.stufen, twBad = m.targets && m.targets.crTW && d.oem.n > 0 && (s.tw / Math.max(1, s.tw + s.yes + s.sy + s.my) * 100) > m.targets.crTW.val;
    [['TW', s.tw, twBad], ['Yes', s.yes], ['SY', s.sy], ['MY', s.my]].forEach(function (c) {
      var ch = el('div', 'chip' + (c[2] ? ' bad' : '')); ch.appendChild(el('b', null, n0(c[1]))); ch.appendChild(el('span', null, c[0])); st.appendChild(ch);
    });
    var ak = clear('hAkt');
    [['Aktivitäten', n0(d.akt)], ['Opt./Std.', dec(d.optPerH)], ['n. erreicht', n0(d.notR)], ['n. erfolgr.', n0(d.notErf)]].forEach(function (c) {
      var x = el('div'); x.appendChild(el('b', null, c[1])); x.appendChild(el('span', null, c[0])); ak.appendChild(x);
    });
  }

  // ── Verlauf ──
  function renderVerlauf(m) {
    var p = m.dayPlan || { startMin: 510, endMin: 1020, planned: 8, optTag: 0 };
    var fromH = Math.floor(p.startMin / 60), toH = Math.max(fromH, Math.ceil(p.endMin / 60) - 1);
    var nowH = new Date().getHours();
    SOS.storageGet(['snapshots']).then(function (st) {
      var snaps = st.snapshots && st.snapshots.date === m.today && st.snapshots.empId === m.emp.id ? st.snapshots : null;
      var hrs = SOS.hourly(snaps, fromH, toH);
      var known = hrs.filter(function (x) { return x.known; });
      var sollH = p.optTag > 0 && p.planned > 0 ? p.optTag / p.planned : null;
      // Beste Stunde
      var best = known.slice().sort(function (a, b) { return b.opt - a.opt; })[0];
      $('vBest').textContent = best ? n0(best.opt) : '–';
      $('vBestSub').textContent = best ? best.h + '–' + (best.h + 1) + ' Uhr' + (m.todayDetail.optPerH != null ? ' · Ø ' + dec(m.todayDetail.optPerH) + ' je Stunde' : '') : 'noch keine volle Stunde aufgezeichnet';
      // Balken je Stunde
      var bars = clear('vBars'), maxV = Math.max(1, sollH || 0, Math.max.apply(null, known.map(function (x) { return x.opt; }).concat([0])));
      var H = 92 - 14;
      hrs.forEach(function (x) {
        var c = el('div', 'hb' + (!x.known ? ' unk' : x.h === nowH ? ' now' : ''));
        if (x.known) { c.appendChild(el('b', null, n0(x.opt))); var i = el('i'); i.style.height = Math.max(3, Math.round(x.opt / maxV * H)) + 'px'; c.appendChild(i); }
        else c.appendChild(el('i'));
        c.title = x.h + ' Uhr: ' + (x.known ? x.opt + ' Opt.' : x.baseline ? 'Aufzeichnung gestartet' : 'kein Wert');
        bars.appendChild(c);
      });
      if (sollH) { var sl = el('div', 'sollLine'); sl.style.bottom = Math.round(sollH / maxV * H) + 'px'; bars.appendChild(sl); }
      $('vSollLbl').textContent = sollH ? '- - Soll ' + dec(sollH) + ' je Stunde' : 'kein Tagesziel';
      ['vAxis1', 'vAxis2'].forEach(function (id) { var a = clear(id); a.appendChild(el('span', null, fromH + ' Uhr')); a.appendChild(el('span', null, Math.round((fromH + toH + 1) / 2) + '')); a.appendChild(el('span', null, (toH + 1) + ' Uhr')); });
      // Kumuliert gegen Soll
      var W = 296, HH = 64, n = hrs.length, NS = 'http://www.w3.org/2000/svg';
      var maxC = Math.max(1, p.optTag || 0, m.todayDetail.opt || 0);
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', HH); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + HH);
      svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Optimierungen kumuliert gegen Soll');
      function xAt(i) { return Math.round((i + 1) / n * W * 10) / 10; }
      function yAt(v) { return Math.round((HH - v / maxC * HH) * 10) / 10; }
      if (sollH) {
        var sp = ['0,' + HH]; hrs.forEach(function (x, i) { sp.push(xAt(i) + ',' + yAt(Math.min(p.optTag, sollH * (i + 1)))); });
        var s = document.createElementNS(NS, 'polyline'); s.setAttribute('points', sp.join(' ')); s.setAttribute('fill', 'none'); s.setAttribute('stroke', '#142a2e'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-dasharray', '5 4'); s.setAttribute('opacity', '0.5'); svg.appendChild(s);
      }
      var cp = [], last = null;
      hrs.forEach(function (x, i) { if (x.cumOpt != null && x.h <= nowH) { cp.push(xAt(i) + ',' + yAt(x.cumOpt)); last = [xAt(i), yAt(x.cumOpt)]; } });
      if (cp.length) {
        var l = document.createElementNS(NS, 'polyline'); l.setAttribute('points', cp.join(' ')); l.setAttribute('fill', 'none'); l.setAttribute('stroke', '#136c72'); l.setAttribute('stroke-width', '3'); l.setAttribute('stroke-linecap', 'round'); l.setAttribute('stroke-linejoin', 'round'); svg.appendChild(l);
        var dot = document.createElementNS(NS, 'circle'); dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); dot.setAttribute('r', '4'); dot.setAttribute('fill', '#136c72'); svg.appendChild(dot);
      }
      var cum = clear('vCum'); cum.appendChild(svg);
      var lbl = $('vCumLbl'), sollNow = m.todayDetail.soll;
      if (sollNow != null) { lbl.textContent = n0(m.todayDetail.opt) + ' / ' + n0(sollNow) + ' bis jetzt'; lbl.style.color = m.todayDetail.opt >= sollNow ? COL.ok : COL.bad; lbl.style.fontWeight = '700'; }
      else { lbl.textContent = n0(m.todayDetail.opt) + ' bisher'; lbl.style.color = ''; }
      // Marge je Stunde
      var mr = clear('vMarge'), withM = known.filter(function (x) { return x.marge != null; });
      hrs.filter(function (x) { return x.h <= nowH; }).forEach(function (x) {
        var c = el('div'); c.appendChild(el('b', null, x.known && x.marge != null ? n0(x.marge) : '–')); c.appendChild(document.createTextNode(String(x.h))); mr.appendChild(c);
      });
      var bm = withM.slice().sort(function (a, b) { return b.marge - a.marge; })[0];
      $('vMargeLbl').textContent = bm ? 'beste: ' + bm.h + '–' + (bm.h + 1) + ' Uhr · ' + eur(bm.marge) : '';
      $('vHint').textContent = known.length ? 'Aufgezeichnet, solange Chrome geöffnet ist.' : 'Der Verlauf füllt sich im Laufe des Tages, solange Chrome geöffnet ist.';
    });
  }

  // ── Kennzahlen ──
  function renderKennzahlen(m, monat) {
    var big = clear('kCount');
    big.appendChild(document.createTextNode(String(m.crCount.today)));
    big.appendChild(el('small', null, '/' + (m.crCount.todayKnown || 4)));
    $('kMonth').textContent = monat + ': ' + m.crCount.month + ' von ' + (m.crCount.monthKnown || 4);
    var list = clear('kCr');
    m.kpis.filter(function (k) { return k.fmt === 'pct'; }).forEach(function (k) {
      var t = m.targets[k.key] || {}, c = colOf(k.okToday);
      var row = el('div', 'cr'), top = el('div', 'crTop');
      top.appendChild(el('span', 'n', k.label));
      var z = el('span', 'z', 'Ziel ' + k.ziel + ' · ' + monat.slice(0, 3) + '. ');
      var mb = el('b', null, pct(k.month)); mb.style.color = colOf(k.okMonth); z.appendChild(mb);
      top.appendChild(z); row.appendChild(top);
      var bar = el('div', 'crBar'), tr = el('div', 'track'), f = el('div', 'fill');
      f.style.width = Math.max(0, Math.min(100, k.today || 0)) + '%'; f.style.background = c; tr.appendChild(f);
      if (t.val != null) { var tk = el('div', 'tick'); tk.style.left = Math.min(99, t.val) + '%'; tr.appendChild(tk); }
      bar.appendChild(tr); var v = el('span', 'crVal', pct(k.today)); v.style.color = c; bar.appendChild(v);
      row.appendChild(bar); list.appendChild(row);
    });
    var vol = clear('kVol');
    m.kpis.filter(function (k) { return k.fmt !== 'pct'; }).forEach(function (k) {
      var f = k.fmt === 'eur' ? eur : n0, r = el('div', 'vol');
      r.appendChild(el('span', 'n', k.key === 'opt' ? 'Opt.' : 'Marge'));
      [[k.today, k.okToday, k.sollToday, 'heute'], [k.month, k.okMonth, k.sollMonth, monat.slice(0, 3) + '.']].forEach(function (x) {
        var c = el('div'), b = el('b', null, f(x[0])); b.style.color = colOf(x[1]); c.appendChild(b);
        c.appendChild(el('span', null, x[3] + (x[2] != null ? ' · Soll ' + f(x[2]) : ' · kein Ziel'))); r.appendChild(c);
      });
      vol.appendChild(r);
    });
  }

  // ── Provision ──
  function renderProvision(m) {
    var p = m.prov;
    $('pBig').textContent = eur(p.provision);
    $('pMax').textContent = 'von ' + eur(p.regulaer) + ' möglich';
    $('pAbzug').textContent = p.abzug > 0.5 ? '−' + eur(p.abzug) + ' Abzug' : 'kein Abzug';
    $('pAbzug').className = 'xs b ' + (p.abzug > 0.5 ? 'red' : 'ok');
    var bar = clear('pBar');
    if (p.regulaer > 0) { seg(bar, Math.max(p.provision, 0.01), COL.ok); if (p.abzug > 0.5) seg(bar, p.abzug, COL.lost); } else seg(bar, 1, COL.rest);
    var erreicht = p.checks.filter(function (c) { return c.ok; }).length;
    $('pMeta').textContent = 'vorläufig · Stand heute · ' + erreicht + ' von ' + p.checks.length + ' KPIs erreicht';
    var calc = clear('pCalc');
    function line(a, b, cls) { var d = el('div', 'pl' + (cls ? ' ' + cls : '')); d.appendChild(el('span', null, a)); var v = el('b', null, b); if (cls === 'neg') v.style.color = COL.bad; d.appendChild(v); calc.appendChild(d); }
    line('Basisprovision (' + n0(p.qualOpt) + ' × ' + p.basisProOpt.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €)', eur(p.basis));
    line('Umsatzprovision', eur(p.umsatz));
    line('Reguläre Provision', eur(p.regulaer), 'sum');
    if (p.mindestleistungGreift) line('Abzug (Mindestleistung)', '−' + eur(p.abzug), 'neg');
    else line('Abzug (' + p.verfehlt + ' × 20 %)', p.abzug > 0.5 ? '−' + eur(p.abzug) : '0 €', p.abzug > 0.5 ? 'neg' : '');
    var miss = p.checks.filter(function (c) { return !c.ok; }), box = clear('pMiss'), tip = $('pTip');
    $('pMissHead').textContent = miss.length ? 'NICHT ERREICHT' : 'KPIS';
    if (!miss.length) { box.appendChild(el('div', 'allok', 'Alle ' + p.checks.length + ' KPIs erreicht – volle Provision.')); tip.textContent = ''; return; }
    miss.forEach(function (c) {
      var r = el('div', 'miss');
      r.appendChild(el('span', 'n', c.label));
      r.appendChild(el('span', 'v', c.fmt === 'pct' ? pct(c.ist) : dec(c.ist)));
      r.appendChild(el('span', 'z', (c.dir === 'lte' ? '≤ ' : '≥ ') + (c.fmt === 'pct' ? Math.round(c.ziel) + ' %' : dec(c.ziel))));
      r.appendChild(el('span', 'w', '+' + eur(p.wertProKpi)));
      box.appendChild(r);
    });
    if (p.mindestleistungGreift) { tip.textContent = 'Mindestleistung: ab ' + dec(p.mindestleistung) + ' Opt./Std. im Monat gilt wieder die volle Berechnung.'; return; }
    var closest = miss.slice().sort(function (a, b) { return Math.abs(a.ziel - a.ist) / (a.ziel || 1) - Math.abs(b.ziel - b.ist) / (b.ziel || 1); })[0];
    var gap = Math.abs(closest.ziel - closest.ist);
    tip.textContent = 'Am nächsten dran: ' + closest.label + ' – noch ' + (closest.fmt === 'pct' ? Math.max(1, Math.ceil(gap)) + ' Prozentpunkte' : dec(gap) + ' Opt./Std.');
  }

  function refresh() {
    return new Promise(function (res) { chrome.runtime.sendMessage({ type: 'refresh' }, function (m) { render(m); res(m); }); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.addEventListener('click', function () { setTab(b.dataset.tab); SOS.storageSet({ lastTab: b.dataset.tab }); });
  });
  $('vLogin').addEventListener('submit', function (e) {
    e.preventDefault();
    $('loginBtn').disabled = true; $('loginErr').hidden = true;
    SOS.login($('email').value.trim(), $('pw').value).then(function () { showOnly('vLoading'); return refresh(); })
      .catch(function (err) { $('loginErr').textContent = err.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : err.message; $('loginErr').hidden = false; })
      .finally(function () { $('loginBtn').disabled = false; });
  });
  $('retry').addEventListener('click', function () { showOnly('vLoading'); refresh(); });
  $('logout').addEventListener('click', function (e) { e.preventDefault(); SOS.logout().then(refresh); });
  $('previewSel').addEventListener('change', function () { showOnly('vLoading'); SOS.storageSet({ previewEmpId: this.value }).then(refresh); });

  // Sofort den letzten Stand zeigen, dann im Hintergrund aktualisieren
  SOS.storageGet(['model', 'session', 'lastTab']).then(function (st) {
    setTab(st.lastTab || 'heute');
    if (!st.session) { render({ state: 'login' }); return; }
    if (st.model && st.model.state === 'ok' && st.model.todayDetail) render(st.model);
    refresh();
  });
})();
