(function () {
  var $ = function (id) { return document.getElementById(id); };
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var P = '#5C564F', AQ = '#A89C8E', AMB = '#D3C8B6', RED = '#BD2D29', CO = '#F08566', GRN = '#2f6b52';
  var ICONS = {
    heute: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    verlauf: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    kennzahlen: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
    provision: '<path d="M17 6.5A7 7 0 1 0 17 17.5"/><path d="M4 10h9M4 14h9"/>',
    coaching: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    timeline: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    hinweise: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    termine: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3"/>',
    urlaub: '<path d="M3 20h18"/><path d="M12 20V9"/><path d="M12 9c-4 0-7 2-8 5 3-1.5 5.5-1.5 8 0 2.5-1.5 5-1.5 8 0-1-3-4-5-8-5z"/>'
  };
  // Menue wie im Board: Zahlen | Planen, unten Hinweise und das eigene Kuerzel (Einstellungen)
  var TABS = [['heute', 'Heute'], ['verlauf', 'Verlauf'], ['kennzahlen', 'Kennzahlen'], ['provision', 'Provision'], null, ['termine', 'Termine'], ['urlaub', 'Urlaub'], 'spacer', ['hinweise', 'Hinweise'], 'me'];
  var HINT_DEFAULTS = { prognose: true, record: true, idle: false, antrag: true, termin: true };
  var tab = 'heute', model = null, extra = {}, uView = 'konto', form = null, sending = false, aTab = 'antrag', tWeek = 0, tCache = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n0(v) { return v == null ? '–' : Math.round(v).toLocaleString('de-DE'); }
  function eur(v) { return v == null ? '–' : Math.round(v).toLocaleString('de-DE') + ' €'; }
  function pct(v) { return v == null ? '–' : Math.round(v) + ' %'; }
  function dec(v) { return v == null ? '–' : (Math.round(v * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function dm(ds) { return ds ? ds.slice(8, 10) + '.' + ds.slice(5, 7) + '.' : ''; }
  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function stand(m) { var ts = m.lastSync ? new Date(m.lastSync) : new Date(m.loadedAt); return 'Stand ' + ('0' + ts.getHours()).slice(-2) + ':' + ('0' + ts.getMinutes()).slice(-2); }
  function lab(t) { return '<span class="lab">' + esc(t) + '</span>'; }
  function badge(t, good) { return '<span class="badge' + (good === false ? ' bad' : '') + '">' + esc(t) + '</span>'; }
  function side(l, v, sm) { return '<div class="bSide' + (sm ? ' sm' : '') + '"><span>' + esc(l) + '</span><span>' + esc(v) + '</span></div>'; }
  function banner(label, b, big, right, below, bigCls) {
    return '<div class="banner"><div class="bRow">' + lab(label) + (b || '') + '</div>'
      + '<div class="bMain"><span class="big' + (bigCls ? ' ' + bigCls : '') + '">' + esc(big) + '</span>' + (right || '') + '</div>'
      + '<div>' + (below || '<div class="bar"></div>') + '</div></div>';
  }
  function card(inner, cls) { return '<div class="card' + (cls ? ' ' + cls : '') + '">' + inner + '</div>'; }
  function ring(p, col) {
    var r = 15, c = 2 * Math.PI * r, off = c * (1 - Math.max(0.02, Math.min(1, p || 0)));
    return '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="' + r + '" fill="none" stroke="#EFECE5" stroke-width="4"/><circle cx="17" cy="17" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 17 17)"/></svg>';
  }
  function hoursRange(m) { var p = m.dayPlan || { startMin: 510, endMin: 1020 }; var a = Math.floor(p.startMin / 60), b = Math.max(a, Math.ceil(p.endMin / 60) - 1); return [a, b]; }
  function axis(a, b) { return '<div class="axis"><span>' + a + '</span><span>' + Math.round((a + b + 1) / 2) + '</span><span>' + (b + 1) + ' Uhr</span></div>'; }
  function barsHtml(hrs, field, H, col, colNow, sollPerH) {
    var known = hrs.filter(function (x) { return x.known && x[field] != null; });
    var mx = Math.max(1, sollPerH || 0, Math.max.apply(null, known.map(function (x) { return x[field]; }).concat([0])));
    var nowH = new Date().getHours(), out = '<div class="bars">';
    hrs.forEach(function (x) {
      var v = x.known ? x[field] : null;
      out += '<div class="hb" style="height:' + (H + 14) + 'px" title="' + x.h + ' Uhr: ' + (v != null ? v : 'kein Wert') + '">'
        + (v != null ? '<b>' + n0(v) + '</b><i style="height:' + Math.max(3, Math.round(v / mx * H)) + 'px;background:' + (x.h === nowH ? colNow : col) + '"></i>' : '<i style="height:3px;background:#E4E0D6"></i>') + '</div>';
    });
    if (sollPerH) out += '<div class="sollLine" style="bottom:' + Math.round(sollPerH / mx * H) + 'px"></div>';
    return out + '</div>';
  }

  function vHeute(m) {
    var c = m.crMy, d = m.todayDetail, diff = c.today != null && c.month != null ? Math.round(c.today - c.month) : null;
    var b = diff == null ? '' : badge((diff >= 0 ? '+' : '') + diff + ' Pkt. ggü. ' + MONATE[+m.monthKey.slice(5, 7) - 1].slice(0, 3) + '.', diff >= 0);
    var bar = '<div class="bar"><div class="fill" style="width:' + (c.closers ? clamp(c.my / c.closers * 100) : 0) + '%"></div></div>';
    var h = banner('CR MY', b, c.today == null ? '–' : pct(c.today), '<span class="bNote">' + c.my + ' von ' + c.closers + ' Abschlüssen</span>', bar);
    var r = hoursRange(m), hrs = SOS.hourly(extra.snapshots, r[0], r[1]);
    var W = 236, H = 44, n = hrs.length;
    function line(vals, col, dash) {
      var pts = [], mx = 0, mn = Infinity;
      vals.forEach(function (v) { if (v != null) { mx = Math.max(mx, v); mn = Math.min(mn, v); } });
      if (mx === 0) return '';
      if (mn === mx) mn = 0;
      vals.forEach(function (v, i) { if (v != null) pts.push([Math.round(i * W / Math.max(1, n - 1)), Math.round(H - 4 - (v - mn) / (mx - mn) * (H - 8))]); });
      if (!pts.length) return '';
      var l = pts[pts.length - 1];
      return '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="4 3"' : '') + '/><circle cx="' + l[0] + '" cy="' + l[1] + '" r="3" fill="' + col + '"/>';
    }
    var mg = hrs.map(function (x) { return x.known ? x.marge : null; });
    var pa = hrs.map(function (x) { return x.known && x.opt > 0 && x.marge != null ? x.marge / x.opt : null; });
    var grid = [0.5, H / 2, H - 0.5].map(function (y) { return '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="rgba(0,0,0,0.06)"/>'; }).join('');
    var svg = '<svg width="100%" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Marge je Stunde">' + grid + line(mg, P) + line(pa, '#A89C8E', true) + '</svg>';
    var c1 = card('<div class="cHead">' + lab('Marge') + '<span class="xs muted">Ø ' + eur(d.avgMarge) + ' <span class="now">' + eur(d.marge) + '</span></span></div>' + svg
      + '<div class="axis"><span>' + r[0] + '</span><span class="leg"><i style="border-color:' + P + '"></i>Marge</span><span class="leg"><i style="border-color:#A89C8E;border-top-style:dashed"></i>pro Auftrag</span><span>' + (r[1] + 1) + ' Uhr</span></div>', 'sb');
    var parts = [['OEM', d.oem, P], ['UPS', d.ups, AQ], ['WKA', d.wka, AMB]], tot = d.opt || 0, R = 34, C = 2 * Math.PI * R, off = 0, arcs = '';
    if (tot > 0) parts.forEach(function (p) { if (!p[1].n) return; var L = C * p[1].n / tot; arcs += '<circle cx="46" cy="46" r="' + R + '" fill="none" stroke="' + p[2] + '" stroke-width="12" stroke-dasharray="' + Math.max(0, L - 2).toFixed(1) + ' ' + (C - L + 2).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 46 46)"/>'; off += L; });
    else arcs = '<circle cx="46" cy="46" r="' + R + '" fill="none" stroke="rgba(0,0,0,.06)" stroke-width="12"/>';
    var legend = parts.map(function (p) { return '<div class="lg"><span class="d" style="background:' + p[2] + '"></span><span class="muted">' + p[0] + '</span><span style="text-align:right">' + n0(p[1].n) + '</span><span class="xxs faint" style="text-align:right">Ø ' + eur(p[1].avg) + '</span></div>'; }).join('');
    var c2 = card(lab('Optimierungen') + '<div class="donutWrap"><div class="donut"><svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label="Aufteilung der Optimierungen">' + arcs + '</svg><div><b>' + n0(tot) + '</b><span class="xxs faint">Opt.</span></div></div><div style="flex:1;display:flex;flex-direction:column;gap:7px">' + legend + '</div></div>', 'sb');
    return h + '<div class="tiles">' + c1 + c2 + '</div>' + stripHeute(m);
  }

  function strip(label, val, pctv, right) {
    return '<div class="strip"><div class="sTop"><span class="lab">' + esc(label) + '</span><span class="sVal">' + val + '</span><span class="sR">' + right + '</span></div>'
      + '<div class="sBar"><i style="width:' + clamp(pctv) + '%"></i></div></div>';
  }
  function stripHeute(m) {
    var a = m.ausgleich, tl = m.timeline || {}, rec = tl.recordOptBeforeToday || 0, cur = m.optToday || 0;
    if (a && a.open) return strip('Ausgleichstag', n0(a.done) + ' / ' + a.goal, a.done / a.goal * 100, a.reached ? 'erreicht, Freitag frei' : 'noch ' + n0(a.left) + ' bis Do');
    if (a && a.reached) return strip('Ausgleichstag', n0(a.done) + ' / ' + a.goal, 100, 'erreicht');
    if (rec > 0) return strip('Rekord', n0(cur) + ' / ' + n0(rec), cur / rec * 100, cur > rec ? 'neuer Rekord' : 'noch ' + n0(rec - cur + 1) + ' bis zum Rekord');
    return '';
  }

  function vVerlauf(m) {
    var f = m.forecast, cur = m.optToday || 0;
    var scale = Math.max(f.goal || 0, f.opt || 0, cur, 1) * (f.goal ? 1 : 1.1);
    var bar = '<div class="bar" title="' + (f.goal ? 'Ziel ' + f.goal + ' · ' : '') + 'aktuell ' + cur + ' · Prognose ≈ ' + n0(f.opt) + '"><div class="fill" style="width:' + clamp(cur / scale * 100) + '%"></div>'
      + '<div class="prog" style="left:' + clamp(f.opt / scale * 100) + '%"></div>' + (f.goal ? '<div class="tick" style="left:calc(' + clamp(f.goal / scale * 100) + '% - 2px)"></div>' : '') + '</div>';
    var good = f.goal ? f.opt >= f.goal : null;
    var h = f.opt == null ? banner('Prognose', '', '–', '<span class="bNote">ab 1 Stunde Arbeitszeit</span>', '<div class="bar"><div class="fill" style="width:' + clamp(cur / scale * 100) + '%"></div>' + (f.goal ? '<div class="tick" style="left:calc(100% - 2px)"></div>' : '') + '</div>')
      : banner('Prognose', f.perHour != null ? badge(dec(f.perHour) + ' / Std.', good !== false) : '', '≈ ' + n0(f.opt), side('Marge', '≈ ' + eur(f.marge)), bar);
    var r = hoursRange(m), hrs = SOS.hourly(extra.snapshots, r[0], r[1]);
    var p = m.dayPlan || {}, sollH = p.optTag > 0 && p.planned > 0 ? p.optTag / p.planned : null;
    var anyKnown = hrs.some(function (x) { return x.known; });
    var c1 = card('<div class="cHead">' + lab('Optimierungen') + '<span class="xxs faint">' + (sollH ? '- - Soll' : '') + '</span></div>' + barsHtml(hrs, 'opt', 44, '#D3C8B6', P, sollH) + axis(r[0], r[1]), 'sb');
    var aktSum = m.todayDetail ? m.todayDetail.akt : null;
    var c2 = card('<div class="cHead">' + lab('Aktivitäten') + '<span class="xxs faint">' + n0(aktSum) + ' heute</span></div>' + barsHtml(hrs, 'akt', 58, '#E2DDD3', '#8A7F72', null) + axis(r[0], r[1]), 'sb');
    var g = m.goals, st = g ? strip('Monat', n0(g.month.done) + ' / ' + n0(g.month.goal), g.month.goal ? g.month.done / g.month.goal * 100 : 0,
      'Woche ' + n0(g.week.done) + ' / ' + n0(g.week.goal) + (g.month.perDayRest != null && g.month.done < g.month.goal ? ' · ' + dec(g.month.perDayRest) + '/Tag' : ''))
      : '<div class="strip"><span class="xs muted">Für diesen Monat ist noch kein Ziel hinterlegt.</span></div>';
    return h + '<div class="tiles">' + c1 + c2 + '</div>' + st + (anyKnown ? '' : '<span class="xxs faint">Der Verlauf füllt sich, solange Chrome geöffnet ist.</span>');
  }

  // Bezeichnungen der 6 Provisions-KPIs (Berechnung wie im Board)
  var KLABEL = { 'Opt./Std.': 'Opt./Std.', 'CR OEM': 'CR OEM', 'TW-Anteil': 'CR TW', 'SY/MY-Anteil': 'CR SY/MY', 'MY-Anteil': 'CR MY', 'OEM-Anteil': 'OEM' };
  function kfmt(c, v) { return c.fmt === 'pct' ? pct(v) : dec(v); }
  function focusOf(p) {
    var miss = p.checks.filter(function (c) { return !c.ok; });
    if (!miss.length) return null;
    return miss.slice().sort(function (a, b) { return Math.abs(a.ziel - a.ist) / (a.ziel || 1) - Math.abs(b.ziel - b.ist) / (b.ziel || 1); })[0];
  }
  function vKennzahlen(m) {
    var p = m.prov, ok = p.checks.filter(function (c) { return c.ok; }).length, f = focusOf(p);
    var segs = '<div class="segs">' + p.checks.map(function (c) { return '<span style="background:' + (c.ok ? '#fff' : 'rgba(255,255,255,0.3)') + '"></span>'; }).join('') + '</div>';
    var h;
    if (f) {
      var gap = Math.abs(f.ziel - f.ist), gapT = f.fmt === 'pct' ? 'noch ' + Math.max(1, Math.ceil(gap)) + ' Pkt. bis zum Ziel' : 'noch ' + dec(gap) + ' bis zum Ziel';
      h = banner('Fokus · ' + KLABEL[f.label], badge(ok + ' / ' + p.checks.length + ' erreicht', false), kfmt(f, f.ist), side(gapT, '+' + eur(p.wertProKpi)), segs);
    } else h = banner('Provisions-KPIs', badge('alle erreicht', true), ok + ' / ' + p.checks.length, side('volle Provision', eur(p.provision)), segs);
    var cells = p.checks.map(function (c) {
      var col = c.ok ? P : RED, t = m.kpiToday[c.label], ratio = c.ok ? 1 : c.ziel ? (c.dir === 'lte' ? c.ziel / Math.max(c.ist, 0.01) : c.ist / c.ziel) : 1;
      var sub = c.alt ? 'SY/MY ' + pct(c.alt.ist) : 'heute ' + (t == null ? '–' : kfmt(c, t));
      return card('<div class="kpi"><div style="display:flex;flex-direction:column;gap:1px">' + lab(KLABEL[c.label]) + '<span class="val" style="color:' + col + '">' + kfmt(c, c.ist) + '</span><span class="xxs faint">' + sub + '</span></div>' + ring(ratio, col) + '</div>');
    }).join('');
    var tk = p.checks.filter(function (c) { var v = m.kpiToday[c.label]; return v != null; }), tok = tk.filter(function (c) { var v = m.kpiToday[c.label]; return c.dir === 'lte' ? v <= c.ziel : v >= c.ziel; }).length;
    var st = tk.length ? strip('Heute', tok + ' von ' + tk.length + ' über Ziel', tok / tk.length * 100, tok === tk.length ? 'alles im Ziel' : (tk.length - tok) + ' darunter') : strip('Heute', '–', 0, 'noch keine Werte');
    return h + '<div class="tiles6">' + cells + '</div>' + st;
  }

  function vProvision(m) {
    var p = m.prov, monat = MONATE[+m.monthKey.slice(5, 7) - 1];
    var bar = '<div class="split">' + (p.regulaer > 0 ? '<div style="flex:' + Math.max(p.provision, 0.01) + ' 1 0;background:#fff"></div><div style="flex:' + Math.max(p.abzug, 0.01) + ' 1 0;background:rgba(255,255,255,0.35)"></div>' : '<div style="flex:1;background:rgba(255,255,255,0.22)"></div>') + '</div>';
    var h = banner(monat, badge('vorläufig', true), p.abzug > 0.5 ? '−' + eur(p.abzug) : '0 €', side('Provision', eur(p.provision)), bar, p.abzug > 0.5 ? 'red' : '');
    var ab = p.mindestleistungGreift ? 'Abzug (Mindestleistung)' : 'Abzug (' + p.verfehlt + ' × 20 %)';
    var c1 = card(lab('Berechnung') + '<div class="pl"><span>Basis (' + n0(p.qualOpt) + ' × ' + p.basisProOpt.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €)</span><b>' + eur(p.basis) + '</b></div>'
      + '<div class="pl"><span>Umsatzprovision</span><b>' + eur(p.umsatz) + '</b></div><div class="pl sum"><span>Regulär</span><b>' + eur(p.regulaer) + '</b></div>'
      + '<div class="pl"><span>' + ab + '</span><b style="color:' + RED + '">' + (p.abzug > 0.5 ? '−' + eur(p.abzug) : '0 €') + '</b></div>', 'sb');
    var miss = p.checks.filter(function (c) { return !c.ok; });
    // Kompaktes Raster (2 Spalten): auch 5 oder 6 verfehlte KPIs bleiben sichtbar; der Wert je KPI steht einmal im Kopf
    var rows = miss.length ? '<div class="mgrid">' + miss.map(function (c) { return '<div class="mk"><span>' + KLABEL[c.label] + '</span><b>' + kfmt(c, c.ist) + '</b></div>'; }).join('') + '</div>'
      : '<div class="empty">Alle ' + p.checks.length + ' KPIs erreicht – volle Provision.</div>';
    var c2 = card('<div class="cHead">' + lab('Nicht erreicht · ' + miss.length + ' von ' + p.checks.length) + (miss.length ? '<span class="pill">je +' + eur(p.wertProKpi) + '</span>' : '') + '</div>' + rows);
    var oph = p.checks.filter(function (c) { return c.label === 'Opt./Std.'; })[0], ml = p.mindestleistung || 2.5;
    var st = strip('Mindestleistung', dec(oph ? oph.ist : null) + ' / ' + dec(ml), oph ? oph.ist / ml * 100 : 0, p.bm < 2 ? 'gilt ab dem 2. Monat' : p.mindestleistungGreift ? 'unterschritten' : 'erfüllt');
    return h + '<div class="tiles">' + c1 + c2 + '</div>' + st;
  }

  var WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function wdm(ds) { return WD[new Date(ds + 'T00:00:00').getDay()] + ' ' + dm(ds); }
  function inDays(ds, t) { var n = Math.round((new Date(ds + 'T00:00:00') - new Date(t + 'T00:00:00')) / 864e5); return n === 0 ? 'heute' : n === 1 ? 'morgen' : n > 0 ? 'in ' + n + ' Tagen' : 'seit ' + (-n) + ' Tagen fällig'; }
  var KIND = { weekly: 'Weekly', perf: 'Performance', coaching: 'Coaching' };

  function vTermine(m) {
    var tm = m.termine || { items: [] }, t = m.today, it = tm.items, nx = it[0];
    var h = nx ? banner('Nächster Termin', badge(KIND[nx.kind] || 'Termin', true), wdm(nx.date),
        side(nx.due ? 'fällig' : (nx.time ? nx.time + ' Uhr' : 'Uhrzeit offen'), nx.coach ? nx.coach.split(' ')[0] : inDays(nx.date, t)),
        '<div class="bNote" style="text-align:left">' + esc(nx.art) + (nx.thema ? ' · ' + esc(nx.thema) : '') + ' · ' + inDays(nx.date, t) + '</div>')
      : banner('Nächster Termin', '', '–', '<span class="bNote">' + (tm.ok ? 'nichts geplant' : 'Termine noch nicht freigegeben') + '</span>', '');
    var rows = it.slice(1, 4).map(function (x) {
      return '<div class="li"><span class="liD">' + wdm(x.date) + '</span><span class="liT">' + esc(x.art) + '</span><span class="liR">' + (x.due ? 'fällig' : esc(x.time || '')) + '</span></div>';
    }).join('') || '<div class="empty">Danach ist nichts weiter geplant.</div>';
    var c1 = card('<div class="cHead">' + lab('Danach') + '<span class="xxs faint">' + (it.length > 1 ? (it.length - 1) + ' geplant' : '') + '</span></div>' + rows);
    var last = tm.last;
    var c2 = last ? card('<div class="cHead">' + lab('Dein Fokus') + '<span class="xxs faint">' + esc((last.coach_name || '').split(' ')[0]) + ' · ' + dm(last.date) + '</span></div>'
      + [['Start', GRN, last.start_note], ['Stop', RED, last.stop_note], ['Continue', '#B5513A', last.continue_note]].map(function (x) { return '<div class="ssc"><span style="color:' + x[1] + '">' + x[0] + '</span><span>' + esc(x[2] || '–') + '</span></div>'; }).join(''), 'sb')
      : card(lab('Dein Fokus') + '<div class="empty">Noch keine abgeschlossene Session.</div>');
    var imp = m.coachingImpact, mk = m.today.slice(0, 7), doneM = ((m.coaching && m.coaching.sessions) || []).filter(function (x) { return x.status !== 'geplant' && (x.date || '').slice(0, 7) === mk && x.date <= m.today; }).length;
    var st = strip('Sessions', doneM + ' im ' + MONATE[+mk.slice(5, 7) - 1], Math.min(100, doneM * 25), doneM ? 'zuletzt ' + dm(((m.coaching.sessions || []).filter(function (x) { return x.status !== 'geplant' && x.date <= m.today; })[0] || {}).date) : 'noch keine in diesem Monat');
    if (imp && imp.delta != null) {
      var good = imp.lte ? imp.delta <= 0 : imp.delta >= 0, d = Math.round(imp.delta * 10) / 10;
      st = strip('Wirkung', imp.label + ' ' + (d > 0 ? '+' : '') + d.toLocaleString('de-DE') + ' Pkt.', clamp(imp.after), Math.round(imp.before) + ' → ' + Math.round(imp.after) + ' %');
    }
    return h + '<div class="tiles">' + c1 + c2 + '</div>' + st;
  }

  var STATUS = { offen: 'beantragt', genehmigt: 'genehmigt', abgelehnt: 'abgelehnt' };
  function range(x) { return x.von === x.bis ? wdm(x.von) + (x.halb ? (x.halbTeil === 'nm' ? ' ½ NM' : ' ½ VM') : '') : dm(x.von) + '–' + dm(x.bis); }
  function vUrlaub(m) {
    var u = m.urlaub;
    if (!u || !u.ok) return banner('Urlaub', '', '–', '<span class="bNote">Urlaubsdaten noch nicht freigegeben</span>', '') + '<div class="empty">Sobald die Freigabe da ist, siehst du hier dein Urlaubskonto und kannst Urlaub beantragen.</div>';
    if (uView === 'antrag') return vAntrag(m);
    var k = u.konto, T = Math.max(1, k.gesamt);
    var bar = '<div class="split"><div style="flex:' + Math.max(k.tk, 0.01) + ' 1 0;background:#fff"></div><div style="flex:' + Math.max(k.pl, 0.01) + ' 1 0;background:rgba(255,255,255,0.7)"></div><div style="flex:' + Math.max(k.be, 0.01) + ' 1 0;background:rgba(255,255,255,0.45)"></div><div style="flex:' + Math.max(k.frei, 0.01) + ' 1 0;background:rgba(255,255,255,0.2)"></div></div>';
    var h = banner('Urlaub ' + u.year, k.be > 0 ? badge(nf(k.be) + ' T. beantragt', true) : '', nf(k.frei) + ' Tage', side('Flex Days', 'noch ' + nf(k.flex) + ' von ' + k.flexMax, true), bar);
    var rows = u.items.slice(0, 3).map(function (x) {
      var pill = '<span class="pill' + (x.status === 'offen' ? ' open' : x.status === 'abgelehnt' ? ' no' : '') + '">' + (STATUS[x.status] || x.status) + '</span>';
      var del = x.status === 'offen' && !m.preview ? '<button type="button" class="x" data-del="' + esc(x.id) + '" title="Antrag zurückziehen" aria-label="Antrag zurückziehen"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : '';
      return '<div class="li"><span class="liD">' + range(x) + '</span><span class="liT">' + esc(x.label) + ' · ' + nf(x.tage) + ' T.</span>' + pill + del + '</div>';
    }).join('') || '<div class="empty">Nichts geplant oder beantragt.</div>';
    var c1 = card('<div class="cHead">' + lab('Geplant und beantragt') + '<span class="xxs faint">' + (u.items.length > 3 ? '+' + (u.items.length - 3) + ' weitere' : '') + '</span></div>' + rows);
    var c2 = card(lab('Konto ' + u.year)
      + '<div class="pl"><span>Anspruch' + (k.uebEff ? ' + Übertrag ' + nf(k.uebEff) : '') + '</span><b>' + nf(k.gesamt) + '</b></div>'
      + '<div class="pl"><span>Genommen</span><b>' + nf(k.tk) + '</b></div><div class="pl"><span>Geplant</span><b>' + nf(k.pl) + '</b></div>'
      + '<div class="pl"><span>Beantragt</span><b>' + nf(k.be) + '</b></div><div class="pl sum"><span>Noch frei</span><b>' + nf(k.frei) + '</b></div>', 'sb tight');
    var nx = u.items.filter(function (x) { return x.status === 'genehmigt' && x.art !== 'krank'; })[0];
    var st = '<div class="strip row2"><div class="sTxt"><span class="lab">Nächster</span><span class="sVal">' + (nx ? range(nx) : 'keiner geplant') + '</span></div><button type="button" class="primary sm" id="toAntrag">Beantragen</button></div>';
    return h + '<div class="tiles">' + c1 + c2 + '</div>' + st;
  }
  function nf(v) { return v == null ? '–' : String(Math.round(v * 10) / 10).replace('.', ','); }
  function addD(ds, n) { var d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function mondayOf(ds) { var d = new Date(ds + 'T00:00:00Z'), w = (d.getUTCDay() + 6) % 7; return addD(ds, -w); }
  function vAntrag(m) {
    form = form || { von: addD(m.today, 21), bis: addD(m.today, 21), halb: false, halbTeil: 'vm', notiz: '' };
    if (form.halb) form.bis = form.von;
    var segA = '<div class="seg full"><button type="button" data-at="antrag" class="' + (aTab === 'antrag' ? 'on' : '') + '">Antrag</button><button type="button" data-at="team" class="' + (aTab === 'team' ? 'on' : '') + '">Wer ist frei?</button></div>';
    if (aTab === 'team') return segA + vTeam(m) + '<div class="btnrow"><button type="button" class="secondary" id="fBack">Abbrechen</button><button type="button" class="primary" id="toForm">Zum Antrag</button></div>';
    var ev = SOS.evalAntrag(m, form), H = ev.H.slice();
    if (form.frei && form.frei.key === form.von + form.bis) {
      var g = m.rules.freiGrenze, hit = form.frei.rows.filter(function (r) { return r.anzahl >= g && ev.days && ev.days.indexOf(r.tag) >= 0; });
      if (hit.length) H.splice(1, 0, { t: 'warn', h: 'Am ' + hit.map(function (r) { return dm(r.tag); }).join(', ') + ' sind am Standort schon ' + g + ' oder mehr abwesend. Beantragen geht trotzdem, die Entscheidung trifft dein Coach.' });
    }
    if (m.preview) H.push({ t: 'info', h: 'Testmodus: Der Antrag wird nicht gesendet.' });
    var art = ev.n ? (ev.art === 'flex' ? 'Flex Day' : 'Urlaub') + ' · ' + nf(ev.n) + ' Arbeitstag' + (ev.n === 1 ? '' : 'e') : '';
    return segA + '<div class="card fcard"><div class="frow"><div class="ff"><label for="fVon">Von</label><input id="fVon" type="date" value="' + form.von + '" min="' + m.today + '"></div>'
      + '<div class="ff"><label for="fBis">Bis</label><input id="fBis" type="date" value="' + form.bis + '" min="' + form.von + '"' + (form.halb ? ' disabled' : '') + '></div></div>'
      + '<div class="frow"><button type="button" class="sw' + (form.halb ? ' on' : '') + '" id="fHalb" role="switch" aria-checked="' + form.halb + '"><i></i><span>Halber Tag</span></button>'
      + (form.halb ? '<div class="seg"><button type="button" data-ht="vm" class="' + (form.halbTeil !== 'nm' ? 'on' : '') + '">Vormittag</button><button type="button" data-ht="nm" class="' + (form.halbTeil === 'nm' ? 'on' : '') + '">Nachmittag</button></div>' : '') + '</div>'
      + '<div class="ff"><label for="fNotiz">Notiz (optional)</label><input id="fNotiz" type="text" maxlength="200" value="' + esc(form.notiz) + '" placeholder="z. B. Hochzeit, Umzug"></div>'
      + '<div class="hints">' + (art ? '<div class="hl ok"><b>' + art + '</b></div>' : '') + H.map(function (x) { return '<div class="hl ' + x.t + '">' + esc(x.h) + '</div>'; }).join('') + '</div>'
      + '<p class="error" id="fErr" hidden></p></div>'
      + '<div class="btnrow"><button type="button" class="secondary" id="fBack">Abbrechen</button><button type="button" class="primary" id="fSend"' + (ev.blocked || m.preview || sending ? ' disabled' : '') + '>' + (sending ? 'Wird gesendet …' : 'Antrag senden') + '</button></div>';
  }

  // Teamansicht: zwei Wochen ab der Woche des gewählten Zeitraums, nur Kolleg:innen mit Eintrag + du
  function vTeam(m) {
    var start = addD(mondayOf(form.von), tWeek * 7), days = [];
    for (var i = 0; i < 14; i++) { var d = addD(start, i), w = new Date(d + 'T00:00:00Z').getUTCDay(); if (w > 0 && w < 6) days.push(d); }
    var end = days[days.length - 1], key = start;
    if (!tCache || tCache.key !== key) { loadTeam(start, end, key); }
    var rows = tCache && tCache.key === key ? tCache.rows : null;
    var head = '<div class="tg tgh"><span></span>' + days.map(function (d, i) { return '<span class="' + (i === 5 ? 'wk2 ' : '') + (d === m.today ? 'td' : '') + '">' + WD[new Date(d + 'T00:00:00').getDay()].slice(0, 1) + '<b>' + +d.slice(8, 10) + '</b></span>'; }).join('') + '</div>';
    function cell(entries, d, i, own) {
      var cls = i === 5 ? 'wk2 ' : '';
      if (!SOS.workdayFor(m, d)) return '<span class="' + cls + 'c off" title="frei (Feiertag)"></span>';
      var x = entries.filter(function (e) { return e.von <= d && e.bis >= d; })[0];
      var sel = own && d >= form.von && d <= form.bis;
      if (!x) return '<span class="' + cls + 'c' + (sel ? ' sel' : '') + '"></span>';
      var k = x.art === 'urlaub' || x.art === 'flex' ? 'u' : 'x', open = x.status === 'offen';
      return '<span class="' + cls + 'c ' + k + (open ? ' o' : '') + (x.halb ? ' h' : '') + (sel ? ' sel' : '') + '" title="' + (k === 'u' ? 'Urlaub' : 'abwesend') + (open ? ', beantragt' : '') + (x.halb ? ', halber Tag' : '') + '"></span>';
    }
    var own = (m.urlaub.items || []).map(function (x) { return { art: x.art, von: x.von, bis: x.bis, halb: x.halb, status: x.status }; });
    var body = '<div class="tg tme"><span class="tn">Du</span>' + days.map(function (d, i) { return cell(own, d, i, true); }).join('') + '</div>';
    if (rows === null) body += '<div class="empty">Lade …</div>';
    else if (rows === false) body += '<div class="empty">Die Teamansicht ist noch nicht freigeschaltet.</div>';
    else {
      var by = {}; rows.forEach(function (r) { (by[r.name] = by[r.name] || []).push(r); });
      var names = Object.keys(by).filter(function (n) { return by[n].some(function (r) { return r.bis >= start && r.von <= end; }); }).sort();
      body += names.map(function (n) { return '<div class="tg"><span class="tn" title="' + esc(n) + '">' + esc(n) + '</span>' + days.map(function (d, i) { return cell(by[n], d, i, false); }).join('') + '</div>'; }).join('')
        || '<div class="empty">In diesen zwei Wochen hat am Standort niemand frei.</div>';
      var cnt = days.map(function (d) { if (!SOS.workdayFor(m, d)) return 0; return names.filter(function (n) { return by[n].some(function (r) { return r.von <= d && r.bis >= d; }); }).length; });
      body += '<div class="tg tsum"><span class="tn">Frei</span>' + cnt.map(function (c, i) { return '<span class="' + (i === 5 ? 'wk2 ' : '') + (c >= m.rules.freiGrenze ? 'hi' : '') + '">' + (c || '') + '</span>'; }).join('') + '</div>';
    }
    var nav = '<div class="cHead"><button type="button" class="x" id="tPrev" aria-label="Zwei Wochen zurück"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>'
      + '<span class="lab">KW ' + kw(start) + '–' + kw(end) + ' · ' + dm(start) + '–' + dm(end) + '</span>'
      + '<button type="button" class="x" id="tNext" aria-label="Zwei Wochen weiter"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>';
    var leg = '<div class="legend"><span><i class="c u"></i>Urlaub</span><span><i class="c u o"></i>beantragt</span><span><i class="c x"></i>abwesend</span><span><i class="c sel"></i>dein Zeitraum</span></div>';
    return '<div class="card fcard">' + nav + '<div class="tgrid">' + head + body + '</div>' + leg + '</div>';
  }
  function kw(ds) { var d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); var y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - y) / 864e5 + 1) / 7); }
  function loadTeam(von, bis, key) {
    tCache = { key: key, rows: null };
    SOS.teamKalender(von, bis).then(function (rows) { if (!tCache || tCache.key !== key) return; tCache.rows = rows || false; if (tab === 'urlaub' && uView === 'antrag' && aTab === 'team') render(model); })
      .catch(function () { if (tCache && tCache.key === key) { tCache.rows = false; render(model); } });
  }

  function vHinweise(m) {
    var hs = extra.hints && extra.hints.date === m.today ? extra.hints.items.slice(0, 8) : [], imp = hs.filter(function (x) { return x.imp; }).length;
    var bar = '<div class="split">' + (hs.length ? '<div style="flex:' + imp + ' 1 0;background:#fff"></div><div style="flex:' + (hs.length - imp) + ' 1 0;background:rgba(255,255,255,0.5)"></div>' : '<div style="flex:1;background:rgba(255,255,255,0.22)"></div>') + '</div>';
    var h = banner('Hinweise heute', imp ? badge(imp + ' wichtig', false) : '', String(hs.length), side('zuletzt', hs[0] ? hs[0].t + ' Uhr' : '–'), bar);
    var list = hs.slice(0, 9).map(function (x) { return '<div class="hint"><span class="p' + (x.imp ? ' imp' : '') + '"></span><span class="tm">' + esc(x.t) + '</span><span>' + esc(x.text) + '</span></div>'; }).join('') || '<div class="empty">Heute noch keine Hinweise. Was dir gemeldet wird, stellst du über dein Kürzel unten in der Leiste ein.</div>';
    var set = Object.assign({}, HINT_DEFAULTS, extra.hintSettings || {}), on = Object.keys(HINT_DEFAULTS).filter(function (k) { return set[k]; }).length, all = Object.keys(HINT_DEFAULTS).length;
    return h + '<div class="card" style="height:300px;flex-shrink:0">' + lab('Heute') + list + '</div>' + strip('Benachrichtigungen', on + ' von ' + all + ' an', on / all * 100, '');
  }

  function vMe(m) {
    var set = Object.assign({}, HINT_DEFAULTS, extra.hintSettings || {});
    var sw = [['prognose', 'Prognose fällt unter das Tagesziel'], ['record', 'Neuer Rekord'], ['idle', 'Eine Stunde ohne Optimierung'], ['antrag', 'Urlaubsantrag entschieden'], ['termin', 'Termin am nächsten Tag']].map(function (x) {
      return '<button type="button" class="sw' + (set[x[0]] ? ' on' : '') + '" data-sw="' + x[0] + '" role="switch" aria-checked="' + !!set[x[0]] + '"><i></i><span>' + x[1] + '</span></button>';
    }).join('');
    var on = Object.keys(HINT_DEFAULTS).filter(function (k) { return set[k]; }).length, all = Object.keys(HINT_DEFAULTS).length;
    var segs = '<div class="segs">' + Object.keys(HINT_DEFAULTS).map(function (k) { return '<span style="background:' + (set[k] ? '#fff' : 'rgba(255,255,255,0.3)') + '"></span>'; }).join('') + '</div>';
    var h = banner('Einstellungen', SOS.config.env === 'DEV' ? badge('Testsystem', true) : '', (m.emp.name || '').split(' ')[0], side('Daten', stand(m).replace('Stand ', '') + ' Uhr'), segs);
    var c0 = card('<div class="meHead"><span class="av big">' + esc(ini(m.emp.name)) + '</span><div><b>' + esc(m.emp.name) + '</b><span class="xs muted">' + esc(m.email || '') + '</span></div></div>'
      + (m.preview && m.choices ? '<div class="pl" style="align-items:center"><span>Vorschau als</span><select id="previewSel" class="prevSel">' + m.choices.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === m.emp.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' : '')
      + '<div class="pl"><span>Version</span><b>' + esc(chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '') + '</b></div>', 'sb');
    var c1 = card(lab('Benachrichtige mich, wenn …') + sw);
    var st = '<div class="strip row2"><div class="sTxt"><span class="lab">Hinweise</span><span class="sVal">' + on + ' von ' + all + ' an</span></div><button type="button" class="secondary sm" id="meLogout">Abmelden</button></div>';
    return h + '<div class="tiles" style="grid-template-rows:110px 180px">' + c0 + c1 + '</div>' + st;
  }
  function ini(n) { return String(n || '').split(' ').map(function (x) { return x[0] || ''; }).join('').slice(0, 2).toUpperCase(); }

  var VIEWS = { heute: ['Hallo', vHeute], verlauf: ['Verlauf', vVerlauf], kennzahlen: ['Kennzahlen', vKennzahlen], provision: ['Provision', vProvision], termine: ['Termine', vTermine], urlaub: ['Urlaub', vUrlaub], hinweise: ['Hinweise', vHinweise], me: ['Einstellungen', vMe] };

  function tabBtn(id, label, inner, extraCls) {
    return '<button type="button" class="tab' + (id === tab ? ' on' : '') + (extraCls || '') + '" data-tab="' + id + '" aria-label="' + label + '"' + (id === tab ? ' aria-current="page"' : '') + '>' + inner + '</button>';
  }
  function renderTabs() {
    var hasNew = extra.hints && model && extra.hints.date === model.today && extra.hints.items.length && (!extra.hintsSeen || extra.hintsSeen < extra.hints.items.length);
    $('tabs').innerHTML = TABS.map(function (t) {
      if (!t) return '<div class="sep"></div>';
      if (t === 'spacer') return '<div class="spacer"></div>';
      if (t === 'me') return tabBtn('me', 'Einstellungen', '<span class="av">' + esc(model && model.emp ? ini(model.emp.name) : '') + '</span>', ' meBtn');
      return tabBtn(t[0], t[1], '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[t[0]] + '</svg><span class="tlab">' + t[1] + '</span>'
        + (t[0] === 'hinweise' && hasNew && tab !== 'hinweise' ? '<span class="dot"></span>' : ''));
    }).join('');
  }
  function renderSub() {}
  function render(m) {
    model = m;
    $('rail').classList.toggle('locked', !m || m.state !== 'ok');
    if (!m || m.state === 'login') return renderLogin();
    if (m.state !== 'ok') {

      $('view').innerHTML = '<p class="error">' + esc(m.state === 'noemp' ? 'Zu deinem Zugang (' + m.email + ') ist kein Mitarbeiter hinterlegt.' : (m.error || 'Unbekannter Fehler')) + '</p><button class="secondary" id="retry">Erneut versuchen</button>';
      $('retry').onclick = function () { refresh(); };
      return;
    }
    // Daten aus einer aelteren Version (z. B. direkt nach einem Update): neu laden statt abstuerzen
    if (!m.forecast || !m.crMy || !m.prov || !m.todayDetail || !m.termine) { $('view').innerHTML = '<div class="empty">Lade deine Zahlen …</div>'; if (!render._retry) { render._retry = true; refresh(); } return; }
    render._retry = false;
    renderTabs(); renderSub(m);
    var v = VIEWS[tab];
    try { $('view').innerHTML = v[1](m); }
    catch (e) { console.error(e); $('view').innerHTML = '<p class="error">Diese Ansicht konnte nicht geladen werden.</p>'; }
    if (tab === 'hinweise') {
      var cnt = extra.hints && extra.hints.date === m.today ? extra.hints.items.length : 0;
      if (cnt !== extra.hintsSeen) { extra.hintsSeen = cnt; SOS.storageSet({ hintsSeen: cnt }); renderTabs(); }
    }
    if (tab === 'me') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-sw]'), function (b) {
        b.onclick = function () { var st = Object.assign({}, HINT_DEFAULTS, extra.hintSettings || {}); st[b.dataset.sw] = !st[b.dataset.sw]; extra.hintSettings = st; SOS.storageSet({ hintSettings: st }).then(function () { render(model); }); };
      });
      $('meLogout').onclick = function () { SOS.logout().then(refresh); };
      var ps = $('previewSel'); if (ps) ps.onchange = function () { $('view').innerHTML = '<div class="empty">Lade …</div>'; SOS.storageSet({ previewEmpId: this.value }).then(refresh); };
    }
    if (tab === 'urlaub') bindUrlaub(m);
  }
  function bindUrlaub(m) {
    var b = $('toAntrag'); if (b) b.onclick = function () { uView = 'antrag'; form = null; aTab = 'antrag'; tWeek = 0; tCache = null; render(model); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-del]'), function (x) {
      x.onclick = function () {
        if (!confirm('Diesen Antrag zurückziehen?')) return;
        x.disabled = true; SOS.zurueckziehen(x.dataset.del).then(refresh).catch(function (e) { alert(e.message); x.disabled = false; });
      };
    });
    if (uView !== 'antrag') return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-at]'), function (x) { x.onclick = function () { aTab = x.dataset.at; tWeek = 0; render(model); }; });
    if (aTab === 'team') {
      $('tPrev').onclick = function () { tWeek -= 2; render(model); }; $('tNext').onclick = function () { tWeek += 2; render(model); };
      $('toForm').onclick = function () { aTab = 'antrag'; render(model); };
      $('fBack').onclick = function () { uView = 'konto'; form = null; aTab = 'antrag'; render(model); };
      return;
    }
    function upd(k, v) { form[k] = v; if (k === 'von' && form.bis < form.von) form.bis = form.von; render(model); checkFrei(); }
    $('fVon').onchange = function () { upd('von', this.value); };
    $('fBis').onchange = function () { upd('bis', this.value); };
    $('fNotiz').oninput = function () { form.notiz = this.value; };
    $('fHalb').onclick = function () { upd('halb', !form.halb); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-ht]'), function (x) { x.onclick = function () { upd('halbTeil', x.dataset.ht); }; });
    $('fBack').onclick = function () { uView = 'konto'; form = null; render(model); };
    $('fSend').onclick = function () {
      var ev = SOS.evalAntrag(model, form); if (ev.blocked || model.preview) return;
      sending = true; render(model);
      SOS.sendAntrag(model, form, ev).then(function () { sending = false; uView = 'konto'; form = null; return refresh(); })
        .catch(function (e) { sending = false; render(model); var el = $('fErr'); if (el) { el.textContent = e.message; el.hidden = false; } });
    };
    if (!form.frei || form.frei.key !== form.von + form.bis) checkFrei();
  }
  function checkFrei() {
    var key = form.von + form.bis;
    SOS.teamFrei(form.von, form.halb ? form.von : form.bis).then(function (rows) {
      if (!rows || !form || form.von + form.bis !== key) return;
      form.frei = { key: key, rows: rows }; if (tab === 'urlaub' && uView === 'antrag') render(model);
    }).catch(function () {});
  }
  function renderLogin() {

    $('view').innerHTML = '<form id="login"><div class="loginHead"><b>Anmelden</b><span class="empty" style="padding:0">Mit deinem Sales-OS-Zugang. Du siehst danach nur deine eigenen Zahlen.</span></div>'
      + '<label for="email">E-Mail</label><input id="email" type="email" autocomplete="username" required><label for="pw">Passwort</label><input id="pw" type="password" autocomplete="current-password" required>'
      + '<button type="submit" class="primary" id="loginBtn">Anmelden</button><p class="error" id="loginErr" hidden></p></form>';
    $('login').addEventListener('submit', function (e) {
      e.preventDefault(); $('loginBtn').disabled = true; $('loginErr').hidden = true;
      SOS.login($('email').value.trim(), $('pw').value).then(function () { $('view').innerHTML = '<div class="empty">Lade deine Zahlen …</div>'; return refresh(); })
        .catch(function (err) { $('loginErr').textContent = err.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : err.message; $('loginErr').hidden = false; })
        .finally(function () { var b = $('loginBtn'); if (b) b.disabled = false; });
    });
  }
  function loadExtra() { return SOS.storageGet(['snapshots', 'hints', 'hintSettings', 'hintsSeen']).then(function (st) { extra = st; }); }
  function refresh() {
    return SOS.load().catch(function (e) { return { state: 'error', error: String(e.message || e) }; })
      .then(function (m) { return loadExtra().then(function () { render(m); try { chrome.runtime.sendMessage({ type: 'refresh' }); } catch (e) {} return m; }); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    tab = b.dataset.tab; if (tab !== 'urlaub') { uView = 'konto'; form = null; } SOS.storageSet({ lastTab: tab }); render(model);
  });

  SOS.storageGet(['model', 'session', 'lastTab']).then(function (st) {
    if (st.lastTab && VIEWS[st.lastTab]) tab = st.lastTab;
    if (!st.session) { render({ state: 'login' }); return; }
    $('view').innerHTML = '<div class="empty">Lade deine Zahlen …</div>';
    loadExtra().then(function () { if (st.model && st.model.state === 'ok' && st.model.forecast && st.model.prov && st.model.termine) render(st.model); refresh(); });
  });
})();
