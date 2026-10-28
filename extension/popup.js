(function () {
  var $ = function (id) { return document.getElementById(id); };
  var MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var P = '#206A72', AQ = '#7ED2DB', AMB = '#D94109', RED = '#BD2D29';
  var ICONS = {
    heute: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    verlauf: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    kennzahlen: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
    provision: '<path d="M17 6.5A7 7 0 1 0 17 17.5"/><path d="M4 10h9M4 14h9"/>',
    coaching: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    timeline: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    hinweise: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'
  };
  var TABS = [['heute', 'Heute'], ['verlauf', 'Verlauf'], ['kennzahlen', 'Kennzahlen'], ['provision', 'Provision'], null, ['coaching', 'Coaching'], ['timeline', 'Timeline'], ['hinweise', 'Hinweise']];
  var tab = 'heute', model = null, extra = {};

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
  function side(l, v) { return '<div class="bSide"><span>' + esc(l) + '</span><span>' + esc(v) + '</span></div>'; }
  function banner(label, b, big, right, below, bigCls) {
    return '<div class="banner"><div class="bRow">' + lab(label) + (b || '') + '</div>'
      + '<div class="bMain"><span class="big' + (bigCls ? ' ' + bigCls : '') + '">' + esc(big) + '</span>' + (right || '') + '</div>'
      + '<div>' + (below || '<div class="bar"></div>') + '</div></div>';
  }
  function card(inner, cls) { return '<div class="card' + (cls ? ' ' + cls : '') + '">' + inner + '</div>'; }
  function ring(p, col) {
    var r = 15, c = 2 * Math.PI * r, off = c * (1 - Math.max(0.02, Math.min(1, p || 0)));
    return '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="' + r + '" fill="none" stroke="#e7eae6" stroke-width="4"/><circle cx="17" cy="17" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 17 17)"/></svg>';
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
        + (v != null ? '<b>' + n0(v) + '</b><i style="height:' + Math.max(3, Math.round(v / mx * H)) + 'px;background:' + (x.h === nowH ? colNow : col) + '"></i>' : '<i style="height:3px;background:#e3e6e2"></i>') + '</div>';
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
    var svg = '<svg width="100%" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Marge je Stunde">' + grid + line(mg, P) + line(pa, '#2a9aa3', true) + '</svg>';
    var c1 = card('<div class="cHead">' + lab('Marge') + '<span class="xs muted">Ø ' + eur(d.avgMarge) + ' <span style="font-size:15px;color:#1a1a18">' + eur(d.marge) + '</span></span></div>' + svg
      + '<div class="axis"><span>' + r[0] + '</span><span class="leg"><i style="border-color:' + P + '"></i>Marge</span><span class="leg"><i style="border-color:#2a9aa3;border-top-style:dashed"></i>pro Auftrag</span><span>' + (r[1] + 1) + ' Uhr</span></div>', 'sb');
    var parts = [['OEM', d.oem, P], ['UPS', d.ups, AQ], ['WKA', d.wka, AMB]], tot = d.opt || 0, R = 34, C = 2 * Math.PI * R, off = 0, arcs = '';
    if (tot > 0) parts.forEach(function (p) { if (!p[1].n) return; var L = C * p[1].n / tot; arcs += '<circle cx="46" cy="46" r="' + R + '" fill="none" stroke="' + p[2] + '" stroke-width="12" stroke-dasharray="' + Math.max(0, L - 2).toFixed(1) + ' ' + (C - L + 2).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 46 46)"/>'; off += L; });
    else arcs = '<circle cx="46" cy="46" r="' + R + '" fill="none" stroke="#e3e6e2" stroke-width="12"/>';
    var legend = parts.map(function (p) { return '<div class="lg"><span class="d" style="background:' + p[2] + '"></span><span class="muted">' + p[0] + '</span><span style="text-align:right">' + n0(p[1].n) + '</span><span class="xxs faint" style="text-align:right">Ø ' + eur(p[1].avg) + '</span></div>'; }).join('');
    var c2 = card(lab('Optimierungen') + '<div class="donutWrap"><div class="donut"><svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label="Aufteilung der Optimierungen">' + arcs + '</svg><div><b>' + n0(tot) + '</b><span class="xxs faint">Opt.</span></div></div><div style="flex:1;display:flex;flex-direction:column;gap:7px">' + legend + '</div></div>', 'sb');
    return h + '<div class="tiles">' + c1 + c2 + '</div>';
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
    var c1 = card('<div class="cHead">' + lab('Optimierungen') + '<span class="xxs faint">' + (sollH ? '- - Soll' : '') + '</span></div>' + barsHtml(hrs, 'opt', 44, 'rgba(32,106,114,0.28)', P, sollH) + axis(r[0], r[1]), 'sb');
    var aktSum = m.todayDetail ? m.todayDetail.akt : null;
    var c2 = card('<div class="cHead">' + lab('Aktivitäten') + '<span class="xxs faint">' + n0(aktSum) + ' heute</span></div>' + barsHtml(hrs, 'akt', 58, 'rgba(126,210,219,0.55)', AQ, null) + axis(r[0], r[1]), 'sb');
    return h + '<div class="tiles">' + c1 + c2 + '</div>' + (anyKnown ? '' : '<span class="xxs faint">Der Verlauf füllt sich, solange Chrome geöffnet ist.</span>');
  }

  // Bezeichnungen der 6 Provisions-KPIs (Berechnung wie im Board)
  var KLABEL = { 'Opt./Std.': 'Opt./Std.', 'CR OEM': 'CR OEM', 'TW-Anteil': 'CR TW', 'SY-Anteil': 'CR SY', 'MY-Anteil': 'CR MY', 'OEM-Anteil': 'OEM' };
  function kfmt(c, v) { return c.fmt === 'pct' ? pct(v) : dec(v); }
  function focusOf(p) {
    var miss = p.checks.filter(function (c) { return !c.ok; });
    if (!miss.length) return null;
    return miss.slice().sort(function (a, b) { return Math.abs(a.ziel - a.ist) / (a.ziel || 1) - Math.abs(b.ziel - b.ist) / (b.ziel || 1); })[0];
  }
  function vKennzahlen(m) {
    var p = m.prov, ok = p.checks.filter(function (c) { return c.ok; }).length, f = focusOf(p);
    var segs = '<div class="segs">' + p.checks.map(function (c) { return '<span style="background:' + (c.ok ? AQ : 'rgba(255,255,255,0.22)') + '"></span>'; }).join('') + '</div>';
    var h;
    if (f) {
      var gap = Math.abs(f.ziel - f.ist), gapT = f.fmt === 'pct' ? 'noch ' + Math.max(1, Math.ceil(gap)) + ' Pkt. bis zum Ziel' : 'noch ' + dec(gap) + ' bis zum Ziel';
      h = banner('Fokus · ' + KLABEL[f.label], badge(ok + ' / ' + p.checks.length + ' erreicht', false), kfmt(f, f.ist), side(gapT, '+' + eur(p.wertProKpi)), segs);
    } else h = banner('Provisions-KPIs', badge('alle erreicht', true), ok + ' / ' + p.checks.length, side('volle Provision', eur(p.provision)), segs);
    var cells = p.checks.map(function (c) {
      var col = c.ok ? P : RED, t = m.kpiToday[c.label], ratio = c.ziel ? (c.dir === 'lte' ? (c.ist <= c.ziel ? 1 : c.ziel / Math.max(c.ist, 0.01)) : c.ist / c.ziel) : 1;
      return card('<div class="kpi"><div style="display:flex;flex-direction:column;gap:1px">' + lab(KLABEL[c.label]) + '<span class="val" style="color:' + col + '">' + kfmt(c, c.ist) + '</span><span class="xxs faint">heute ' + (t == null ? '–' : kfmt(c, t)) + '</span></div>' + ring(ratio, col) + '</div>');
    }).join('');
    return h + '<div class="tiles6">' + cells + '</div>';
  }

  function vProvision(m) {
    var p = m.prov, monat = MONATE[+m.monthKey.slice(5, 7) - 1];
    var bar = '<div class="split">' + (p.regulaer > 0 ? '<div style="flex:' + Math.max(p.provision, 0.01) + ' 1 0;background:' + AQ + '"></div><div style="flex:' + Math.max(p.abzug, 0.01) + ' 1 0;background:rgba(255,138,128,0.45)"></div>' : '<div style="flex:1;background:rgba(255,255,255,0.22)"></div>') + '</div>';
    var h = banner(monat, badge('vorläufig', true), p.abzug > 0.5 ? '−' + eur(p.abzug) : '0 €', side('Provision', eur(p.provision)), bar, p.abzug > 0.5 ? 'red' : '');
    var ab = p.mindestleistungGreift ? 'Abzug (Mindestleistung)' : 'Abzug (' + p.verfehlt + ' × 20 %)';
    var c1 = card(lab('Berechnung') + '<div class="pl"><span>Basis (' + n0(p.qualOpt) + ' × ' + p.basisProOpt.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €)</span><b>' + eur(p.basis) + '</b></div>'
      + '<div class="pl"><span>Umsatzprovision</span><b>' + eur(p.umsatz) + '</b></div><div class="pl sum"><span>Regulär</span><b>' + eur(p.regulaer) + '</b></div>'
      + '<div class="pl"><span>' + ab + '</span><b style="color:' + RED + '">' + (p.abzug > 0.5 ? '−' + eur(p.abzug) : '0 €') + '</b></div>', 'sb');
    var miss = p.checks.filter(function (c) { return !c.ok; });
    var rows = miss.length ? miss.map(function (c) { return '<div class="row"><span style="flex:1">' + KLABEL[c.label] + '</span><span class="bad" style="font-weight:600">' + kfmt(c, c.ist) + '</span><span class="pill">+' + eur(p.wertProKpi) + '</span></div>'; }).join('')
      : '<div class="empty">Alle ' + p.checks.length + ' KPIs erreicht – volle Provision.</div>';
    var c2 = card(lab('Nicht erreicht') + rows);
    return h + '<div class="tiles">' + c1 + c2 + '</div>';
  }

  function vCoaching(m) {
    var co = m.coaching || { ok: false, sessions: [] }, imp = m.coachingImpact, t = m.today;
    var h;
    if (imp && imp.delta != null) {
      var good = imp.lte ? imp.delta <= 0 : imp.delta >= 0, d = Math.round(imp.delta * 10) / 10;
      var bar = '<div class="split"><div style="flex:' + Math.max(1, Math.min(imp.before, imp.after)) + ' 1 0;background:rgba(255,255,255,0.35)"></div><div style="flex:' + Math.max(1, Math.abs(imp.after - imp.before)) + ' 1 0;background:' + (good ? AQ : '#ff8a80') + '"></div><div style="flex:' + Math.max(1, 100 - Math.max(imp.before, imp.after)) + ' 1 0;background:rgba(255,255,255,0.12)"></div></div>';
      h = banner('Wirkung · ' + imp.label, badge('seit ' + dm(imp.date), good), (d > 0 ? '+' : '') + d.toLocaleString('de-DE'), side('vorher → jetzt', dec(imp.before) + ' → ' + dec(imp.after) + ' %'), bar);
    } else h = banner('Wirkung', '', '–', '<span class="bNote">' + (co.ok ? 'noch keine Session mit Ziel-KPI' : 'Coaching-Daten noch nicht freigegeben') + '</span>', '');
    var done = co.sessions.filter(function (s) { return s.status !== 'geplant' && s.date <= t; });
    var next = co.sessions.filter(function (s) { return s.status === 'geplant' && s.date >= t; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
    var last = done[0];
    var c1 = last ? card('<div class="cHead">' + lab('Dein Fokus') + '<span class="xxs faint">' + esc(last.coach_name || '') + ' · ' + dm(last.date) + '</span></div>'
      + [['Start', P, last.start_note], ['Stop', RED, last.stop_note], ['Continue', AMB, last.continue_note]].map(function (x) { return '<div class="ssc"><span style="color:' + x[1] + '">' + x[0] + '</span><span>' + esc(x[2] || '–') + '</span></div>'; }).join(''), 'sb')
      : card(lab('Dein Fokus') + '<div class="empty">Noch keine abgeschlossene Session.</div>');
    var c2 = next ? card('<div class="cHead">' + lab('Nächste Session') + '<span class="xxs faint">' + esc(next.art || '') + '</span></div>'
      + '<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:20px;font-weight:500">' + dm(next.date) + '</span><span class="xs muted">' + esc((next.uhrzeit || '').slice(0, 5)) + (next.coach_name ? ' · ' + esc(next.coach_name) : '') + '</span></div>'
      + '<div class="row"><span class="muted" style="flex:1">Thema</span><span>' + esc(next.focus || '–') + '</span></div>', 'sb')
      : card(lab('Nächste Session') + '<div class="empty">Keine Session geplant.</div>');
    return h + '<div class="tiles">' + c1 + c2 + '</div>';
  }

  function vTimeline(m) {
    var tl = m.timeline || { items: [] }, rec = tl.recordOpt || 0, cur = m.optToday || 0;
    var today = '<div class="today"><span>Heute <b style="font-weight:500">' + n0(cur) + ' Opt.</b></span><span class="xs muted">' + (rec && cur < rec ? 'noch ' + (rec - cur) + ' bis zum Rekord' : rec ? 'Rekord!' : '') + '</span></div>';
    var KIND = { rec: 'Rekord', best: 'Bestwert', mile: 'Meilenstein' };
    var list = tl.items.map(function (x, i) {
      return '<div class="tl"><div class="ln"><span class="' + (i === 0 ? 'x' : '') + '"></span><i class="pt ' + x.kind + '"></i><span class="' + (i === tl.items.length - 1 ? 'x' : '') + '"></span></div>'
        + '<div style="display:flex;flex-direction:column;min-width:0"><span class="t">' + esc(x.title) + '</span><span class="m">' + dm(x.date) + ' · ' + KIND[x.kind] + '</span></div><span class="v">' + esc(x.value) + '</span></div>';
    }).join('') || '<div class="empty">Noch keine Einträge.</div>';
    var legend = '<div class="legend"><span><i class="pt rec"></i>Rekord</span><span><i class="pt best"></i>Bestwert</span><span><i class="pt mile"></i>Meilenstein</span></div>';
    return '<div class="card tlCard" style="height:404px;flex-shrink:0">' + today + '<div class="tlList">' + list + '</div>' + legend + '</div>';
  }

  function vHinweise(m) {
    var hs = extra.hints && extra.hints.date === m.today ? extra.hints.items : [], imp = hs.filter(function (x) { return x.imp; }).length;
    var bar = '<div class="split">' + (hs.length ? '<div style="flex:' + imp + ' 1 0;background:#ff8a80"></div><div style="flex:' + (hs.length - imp) + ' 1 0;background:' + AQ + '"></div>' : '<div style="flex:1;background:rgba(255,255,255,0.22)"></div>') + '</div>';
    var h = banner('Hinweise heute', imp ? badge(imp + ' wichtig', false) : '', String(hs.length), side('zuletzt', hs[0] ? hs[0].t + ' Uhr' : '–'), bar);
    var set = Object.assign({ prognose: true, record: true, idle: false }, extra.hintSettings || {});
    var sw = [['prognose', 'Prognose fällt unter das Ziel'], ['record', 'Neuer Rekord'], ['idle', 'Eine Stunde ohne Optimierung']].map(function (x) {
      return '<button class="sw' + (set[x[0]] ? ' on' : '') + '" data-sw="' + x[0] + '" role="switch" aria-checked="' + !!set[x[0]] + '"><i></i><span>' + x[1] + '</span></button>';
    }).join('');
    var c1 = card(lab('Benachrichtige mich, wenn …') + sw);
    var list = hs.slice(0, 4).map(function (x) { return '<div class="hint"><span class="p' + (x.imp ? ' imp' : '') + '"></span><span class="tm">' + esc(x.t) + '</span><span>' + esc(x.text) + '</span></div>'; }).join('') || '<div class="empty">Heute noch keine Hinweise.</div>';
    var c2 = card(lab('Verlauf') + list);
    return h + '<div class="tiles">' + c1 + c2 + '</div>';
  }

  var VIEWS = { heute: ['Hallo', vHeute], verlauf: ['Verlauf', vVerlauf], kennzahlen: ['Kennzahlen', vKennzahlen], provision: ['Provision', vProvision], coaching: ['Coaching', vCoaching], timeline: ['Timeline', vTimeline], hinweise: ['Hinweise', vHinweise] };

  function renderTabs() {
    var hasNew = extra.hints && model && extra.hints.date === model.today && extra.hints.items.length && (!extra.hintsSeen || extra.hintsSeen < extra.hints.items.length);
    $('tabs').innerHTML = TABS.map(function (t) {
      if (!t) return '<div class="sep"></div>';
      return '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '" title="' + t[1] + '" aria-label="' + t[1] + '"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[t[0]] + '</svg>' + (t[0] === 'hinweise' && hasNew && tab !== 'hinweise' ? '<span class="dot"></span>' : '') + '</button>';
    }).join('');
  }
  function renderSub(m) {
    var sub = $('sub');
    if (m && m.preview && m.choices) {
      sub.innerHTML = '<select id="previewSel" title="Testmodus: Vorschau als" style="max-width:130px;height:22px;font-size:11px;border:1px solid #f0d9a8;background:#fff6e5;border-radius:6px">'
        + m.choices.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === m.emp.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>';
      $('previewSel').addEventListener('change', function () { $('view').innerHTML = '<div class="empty">Lade …</div>'; SOS.storageSet({ previewEmpId: this.value }).then(refresh); });
    } else sub.textContent = m && m.state === 'ok' ? stand(m) : '';
  }
  function render(m) {
    model = m;
    $('rail').classList.toggle('locked', !m || m.state !== 'ok');
    if (!m || m.state === 'login') return renderLogin();
    if (m.state !== 'ok') {
      $('title').textContent = 'Sales OS'; renderSub(null);
      $('view').innerHTML = '<p class="error">' + esc(m.state === 'noemp' ? 'Zu deinem Zugang (' + m.email + ') ist kein Mitarbeiter hinterlegt.' : (m.error || 'Unbekannter Fehler')) + '</p><button class="secondary" id="retry">Erneut versuchen</button>';
      $('retry').onclick = function () { refresh(); };
      return;
    }
    renderTabs(); renderSub(m);
    var v = VIEWS[tab];
    $('title').textContent = tab === 'heute' ? 'Hallo ' + (m.emp.name || '').split(' ')[0] : v[0];
    try { $('view').innerHTML = v[1](m); }
    catch (e) { console.error(e); $('view').innerHTML = '<p class="error">Diese Ansicht konnte nicht geladen werden.</p>'; }
    if (tab === 'hinweise') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-sw]'), function (b) {
        b.onclick = function () { var s = Object.assign({ prognose: true, record: true, idle: false }, extra.hintSettings || {}); s[b.dataset.sw] = !s[b.dataset.sw]; extra.hintSettings = s; SOS.storageSet({ hintSettings: s }).then(function () { render(model); }); };
      });
      var cnt = extra.hints && extra.hints.date === m.today ? extra.hints.items.length : 0;
      if (cnt !== extra.hintsSeen) { extra.hintsSeen = cnt; SOS.storageSet({ hintsSeen: cnt }); }
    }
  }
  function renderLogin() {
    $('title').textContent = 'Sales OS'; $('sub').textContent = SOS.config.env === 'DEV' ? 'Testsystem' : '';
    $('view').innerHTML = '<form id="login"><p class="empty" style="margin:0 0 6px">Melde dich mit deinem Sales-OS-Zugang an. Du siehst danach nur deine eigenen Zahlen.</p>'
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
    tab = b.dataset.tab; SOS.storageSet({ lastTab: tab }); render(model);
  });
  $('logout').addEventListener('click', function (e) { e.preventDefault(); SOS.logout().then(refresh); });

  SOS.storageGet(['model', 'session', 'lastTab']).then(function (st) {
    if (st.lastTab && VIEWS[st.lastTab]) tab = st.lastTab;
    if (!st.session) { render({ state: 'login' }); return; }
    $('view').innerHTML = '<div class="empty">Lade deine Zahlen …</div>';
    loadExtra().then(function () { if (st.model && st.model.state === 'ok' && st.model.forecast && st.model.prov) render(st.model); refresh(); });
  });
})();
