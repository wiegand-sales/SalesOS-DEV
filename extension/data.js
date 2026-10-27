// Sales OS Erweiterung – Datenzugriff und Berechnungen.
// Die Rechenlogik ist 1:1 aus Sales OS (index.html) uebernommen: CR immer aus Rohzahlen
// (erst summieren, dann teilen), Stunden tagesgenau nach Wochenarbeitszeit, Provision wie im Provisions-Tab.
var SOS = (function () {
  var C = SOS_CONFIG;

  // ── Hilfsfunktionen (wie im Board) ──
  function today() { return new Date().toISOString().slice(0, 10); }
  var WEEKDAY_KEYS = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];
  var DEFAULT_WORK_HOURS = {
    mo: { von: '08:30', bis: '18:00', pause: 30 }, di: { von: '08:30', bis: '17:00', pause: 30 }, mi: { von: '08:30', bis: '17:00', pause: 30 },
    do: { von: '08:30', bis: '17:00', pause: 30 }, fr: { von: '08:30', bis: '16:00', pause: 30 }, sa: { von: '', bis: '', pause: 0 }, so: { von: '', bis: '', pause: 0 }
  };
  function timeStrToMin(t) { if (!t) return null; var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function workHoursForDate(emp, dateStr) {
    var wh = emp.workHours || DEFAULT_WORK_HOURS;
    var key = WEEKDAY_KEYS[new Date(dateStr + 'T00:00:00').getDay()];
    var dv = wh[key] || DEFAULT_WORK_HOURS[key];
    if (!dv || !dv.von || !dv.bis) return 0;
    return Math.max(0, (timeStrToMin(dv.bis) - timeStrToMin(dv.von) - (dv.pause || 0)) / 60);
  }
  function elapsedWorkHoursTodayFor(emp, lastSync) {
    var planned = workHoursForDate(emp, today());
    var wh = emp.workHours || DEFAULT_WORK_HOURS;
    var key = WEEKDAY_KEYS[new Date(today() + 'T00:00:00').getDay()];
    var dv = wh[key] || DEFAULT_WORK_HOURS[key];
    var startMin = (dv && dv.von) ? timeStrToMin(dv.von) : 510;
    var now = new Date(), ref = now;
    if (lastSync) { var sd = new Date(lastSync); if (!isNaN(sd.getTime()) && sd.toISOString().slice(0, 10) === today() && sd < now) ref = sd; }
    var elapsed = Math.max((ref.getHours() * 60 + ref.getMinutes() - startMin) / 60, 0.5);
    return planned > 0 ? Math.min(elapsed, planned) : elapsed;
  }
  function beschaeftigungsmonat(emp, monthKey) {
    if (!emp.startDate) return 1;
    var s = new Date(emp.startDate + 'T00:00:00'), t = new Date(monthKey + '-01T00:00:00');
    return Math.max(1, (t.getFullYear() - s.getFullYear()) * 12 + (t.getMonth() - s.getMonth()) + 1);
  }
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, mo - 1, da));
  }
  function bayernFeiertage(y) {
    var o = easterSunday(y), add = function (d, n) { return new Date(d.getTime() + n * 86400000); };
    var l = [new Date(Date.UTC(y, 0, 1)), new Date(Date.UTC(y, 0, 6)), add(o, -2), add(o, 1), new Date(Date.UTC(y, 4, 1)), add(o, 39), add(o, 50), add(o, 60),
      new Date(Date.UTC(y, 7, 15)), new Date(Date.UTC(y, 9, 3)), new Date(Date.UTC(y, 10, 1)), new Date(Date.UTC(y, 11, 25)), new Date(Date.UTC(y, 11, 26))];
    var m = {}; l.forEach(function (d) { m[d.toISOString().slice(0, 10)] = true; }); return m;
  }
  // Arbeitstage des Monats: aus dem Kalender der Zielvereinbarung, sonst Mo–Fr ohne bayerische Feiertage
  function workDaysOfMonth(monthKey, arbeitstage) {
    if (Array.isArray(arbeitstage) && arbeitstage.length) return arbeitstage.slice().sort();
    if (arbeitstage && typeof arbeitstage === 'object' && Object.keys(arbeitstage).length)
      return Object.keys(arbeitstage).filter(function (d) { return arbeitstage[d] === 'work'; }).sort();
    var y = +monthKey.slice(0, 4), mo = +monthKey.slice(5, 7), ft = bayernFeiertage(y), out = [];
    var n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    for (var d = 1; d <= n; d++) {
      var dt = new Date(Date.UTC(y, mo - 1, d)), ds = dt.toISOString().slice(0, 10), wd = dt.getUTCDay();
      if (wd >= 1 && wd <= 5 && !ft[ds]) out.push(ds);
    }
    return out;
  }

  // ── Provision (wie calculateProvision im Board) ──
  var PROVISION_DEFAULTS = {
    basisProOpt: 1.00, divOEM: 10000, divUpsell: 20000, divWka: 20000, reduktionProKpi: 20, mindestprovision: 20, mindestleistungOptH: 2.50,
    monat1: { optH: 2.00, crOem: 45, tw: 20, sy: 30, my: 10, syMy: 40, oemAnteil: 60 },
    monat2: { optH: 2.50, crOem: 50, tw: 20, sy: 40, my: 20, syMy: 60, oemAnteil: 80 },
    monat3plus: { optH: 3.50, crOem: 55, tw: 15, sy: 40, my: 20, syMy: 60, oemAnteil: 80 }
  };
  function effectiveProvisionSettings(emp) {
    var own = emp.provisionSettings || {};
    var pv = Object.assign({}, PROVISION_DEFAULTS, own);
    ['monat1', 'monat2', 'monat3plus'].forEach(function (mk) { pv[mk] = Object.assign({}, PROVISION_DEFAULTS[mk], own[mk] || {}); });
    return pv;
  }
  function kpiSetFor(pv, bm) { return bm === 1 ? pv.monat1 : bm === 2 ? pv.monat2 : pv.monat3plus; }

  function sumRows(rows) {
    var s = { oem: 0, notS: 0, tw: 0, yes: 0, sy: 0, my: 0, ups: 0, wka: 0, marge: 0, margeOEM: 0, margeUps: 0, margeWKA: 0, optGesamtRaw: 0, dates: [] };
    rows.forEach(function (r) {
      s.oem += r.oem_gesamt || 0; s.notS += r.oem_nicht_erfolgreich || 0; s.tw += r.oem_tw || 0; s.yes += r.oem_yes || 0;
      s.sy += r.oem_sy || 0; s.my += r.oem_my || 0; s.ups += r.ups_yes || 0; s.wka += r.wka_gesamt_yes || 0;
      s.marge += r.gesamt_margenerhoehung || 0; s.margeOEM += r.oem_margenerhoehung || 0; s.margeUps += r.ups_margenerhoehung || 0; s.margeWKA += r.wka_margenerhoehung || 0;
      s.optGesamtRaw += r.gesamt_optimierungen || 0; s.dates.push(r.date);
    });
    s.opt = s.oem + s.ups + s.wka;
    s.optGes = s.optGesamtRaw || s.opt;
    return s;
  }
  function cr(s, m) {
    var d;
    if (m === 'crOEM') { d = s.oem + s.notS; return d > 0 ? s.oem / d * 100 : null; }
    if (m === 'crTW') { d = s.tw + s.yes + s.sy + s.my; return d > 0 ? s.tw / d * 100 : null; }
    if (m === 'crSyMy') { d = s.yes + s.sy + s.my; return d > 0 ? (s.sy + s.my) / d * 100 : null; }
    if (m === 'crSY') { d = s.yes + s.sy + s.my; return d > 0 ? s.sy / d * 100 : null; }
    if (m === 'crMY') { d = s.yes + s.sy + s.my; return d > 0 ? s.my / d * 100 : null; }
    return null;
  }
  function calcProvision(emp, monthKey, s) {
    var pv = effectiveProvisionSettings(emp);
    var hours = 0; s.dates.forEach(function (d) { hours += workHoursForDate(emp, d); });
    var optPerH = hours > 0 ? s.optGes / hours : 0;
    var basis = (s.tw + s.yes + s.sy + s.my + s.ups + s.wka) * (pv.basisProOpt || 0);
    var umsatz = s.margeOEM * (pv.divOEM ? (s.marge / pv.divOEM) / 100 : 0)
      + s.margeUps * (pv.divUpsell ? (s.marge / pv.divUpsell) / 100 : 0)
      + s.margeWKA * (pv.divWka ? (s.marge / pv.divWka) / 100 : 0);
    var regulaer = basis + umsatz;
    var bm = beschaeftigungsmonat(emp, monthKey), k = kpiSetFor(pv, bm);
    var checks = [
      { label: 'Opt./Std.', ist: optPerH, ziel: k.optH, dir: 'gte', fmt: 'dec' },
      { label: 'CR OEM', ist: cr(s, 'crOEM') || 0, ziel: k.crOem, dir: 'gte', fmt: 'pct' },
      { label: 'TW-Anteil', ist: cr(s, 'crTW') || 0, ziel: k.tw, dir: 'lte', fmt: 'pct' },
      { label: 'SY-Anteil', ist: cr(s, 'crSY') || 0, ziel: k.sy, dir: 'gte', fmt: 'pct' },
      { label: 'MY-Anteil', ist: cr(s, 'crMY') || 0, ziel: k.my, dir: 'gte', fmt: 'pct' },
      { label: 'OEM-Anteil', ist: s.optGes > 0 ? s.oem / s.optGes * 100 : 0, ziel: k.oemAnteil, dir: 'gte', fmt: 'pct' }
    ];
    checks.forEach(function (c) { c.ok = c.ziel == null ? true : (c.dir === 'gte' ? c.ist >= c.ziel : c.ist <= c.ziel); });
    var verfehlt = checks.filter(function (c) { return !c.ok; }).length;
    var redProKpi = (pv.reduktionProKpi != null ? pv.reduktionProKpi : 20) / 100;
    var minPct = (pv.mindestprovision != null ? pv.mindestprovision : 20) / 100;
    var reduktion = Math.min(verfehlt * redProKpi, 1 - minPct);
    var provision = regulaer * (1 - reduktion);
    var mindestleistung = pv.mindestleistungOptH != null ? pv.mindestleistungOptH : 2.5;
    var mindestleistungGreift = bm >= 2 && optPerH < mindestleistung;
    if (mindestleistungGreift) provision = regulaer * minPct;
    return {
      basis: basis, umsatz: umsatz, regulaer: regulaer, abzug: regulaer - provision, provision: provision, checks: checks, verfehlt: verfehlt,
      wertProKpi: regulaer * redProKpi, bm: bm, mindestleistungGreift: mindestleistungGreift, mindestleistung: mindestleistung,
      qualOpt: s.tw + s.yes + s.sy + s.my + s.ups + s.wka, basisProOpt: pv.basisProOpt || 0
    };
  }

  // Individuelle Ziele wie empTargets() im Board: Mitarbeiter-Override > Provisions-Staffel > globales KPI-Ziel
  function targetsFor(emp, globals, own, monthKey) {
    var pv = effectiveProvisionSettings(emp), k = kpiSetFor(pv, beschaeftigungsmonat(emp, monthKey));
    function pick(key, provKey, gKey, fb, dirKey, fbDir) {
      var val = own[key] != null ? own[key] : (k[provKey] != null ? k[provKey] : (globals[gKey] && globals[gKey].val != null ? globals[gKey].val : fb));
      var dir = own[dirKey] || (globals[gKey] && globals[gKey].dir) || fbDir;
      return { val: val, dir: dir };
    }
    return {
      crOEM: pick('crOEM', 'crOem', 'crOEM', 55, 'crOEMDir', 'gte'),
      crTW: pick('crTW', 'tw', 'crTeilweise', 25, 'crTWDir', 'lte'),
      crSyMy: pick('crSyMy', 'syMy', 'crSyMy', 60, 'crSyMyDir', 'gte'),
      crMY: pick('crMegaYes', 'my', 'crMegaYes', 8, 'crMYDir', 'gte')
    };
  }

  // ── Supabase-Zugriff (REST, ohne Bibliothek) ──
  function storageGet(keys) { return new Promise(function (res) { chrome.storage.local.get(keys, res); }); }
  function storageSet(obj) { return new Promise(function (res) { chrome.storage.local.set(obj, res); }); }

  async function authRequest(grant, body) {
    var r = await fetch(C.supabaseUrl + '/auth/v1/token?grant_type=' + grant, {
      method: 'POST', headers: { apikey: C.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || ('Anmeldung fehlgeschlagen (' + r.status + ')'));
    var session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user.id, email: j.user.email } };
    await storageSet({ session: session });
    return session;
  }
  function login(email, password) { return authRequest('password', { email: email, password: password }); }
  async function logout() { await new Promise(function (res) { chrome.storage.local.remove(['session', 'model', 'previewEmpId', 'snapshots'], res); }); }
  async function getSession() {
    var st = await storageGet(['session']); var s = st.session;
    if (!s) return null;
    if (Date.now() > s.expires_at - 60000) {
      try { s = await authRequest('refresh_token', { refresh_token: s.refresh_token }); }
      catch (e) { await logout(); return null; }
    }
    return s;
  }
  async function rest(path, session) {
    var r = await fetch(C.supabaseUrl + '/rest/v1/' + path, { headers: { apikey: C.anonKey, Authorization: 'Bearer ' + session.access_token } });
    if (!r.ok) throw new Error('Datenabruf fehlgeschlagen (' + r.status + ')');
    return r.json();
  }

  function mapEmp(e) {
    return { id: e.id, name: e.name, role: e.role, active: e.active, startDate: e.start_date, provisionSettings: e.provision_settings || {}, workHours: e.work_hours || null, isPureCoach: e.is_pure_coach === true };
  }

  // Laedt alles fuer EINEN Mitarbeiter. Agents: ueber auth_user_id. Admins im Test: Vorschau ueber previewEmpId.
  async function load() {
    var session = await getSession();
    if (!session) return { state: 'login' };
    var st = await storageGet(['previewEmpId']);
    var own = await rest('employees?select=*&auth_user_id=eq.' + session.user.id, session);
    var emp = own[0] ? mapEmp(own[0]) : null, preview = false, choices = null;
    if (!emp) {
      // Kein Mitarbeiter-Datensatz (z. B. Admin): Testmodus mit Auswahl
      var all = await rest('employees?select=id,name,role,active,is_pure_coach&order=name', session);
      choices = all.filter(function (e) { return e.active !== false && e.is_pure_coach !== true && e.role !== 'SC' && e.role !== 'SDM'; }).map(function (e) { return { id: e.id, name: e.name }; });
      var pid = st.previewEmpId && choices.some(function (c) { return c.id === st.previewEmpId; }) ? st.previewEmpId : (choices[0] && choices[0].id);
      if (!pid) return { state: 'noemp', email: session.user.email };
      var one = await rest('employees?select=*&id=eq.' + pid, session);
      emp = mapEmp(one[0]); preview = true;
    }
    var t = today(), mk = t.slice(0, 7);
    var res = await Promise.all([
      rest('performance?select=*&employee_id=eq.' + emp.id + '&date=gte.' + mk + '-01&date=lte.' + t, session),
      rest('zielvereinbarung?select=*&employee_id=eq.' + emp.id + '&month=eq.' + mk, session).catch(function () { return []; }),
      rest('kpi_targets?select=*', session).catch(function () { return []; }),
      rest('employee_kpi_targets?select=*&employee_id=eq.' + emp.id, session).catch(function () { return []; }),
      rest('settings?select=key,value&key=eq.ftpLastSync', session).catch(function () { return []; })
    ]);
    var globals = {}; res[2].forEach(function (r) { globals[r.metric_key] = { val: r.val, dir: r.dir }; });
    var ownT = {}; res[3].forEach(function (r) { ownT[r.metric_key] = r.val; if (r.dir) ownT[r.metric_key + 'Dir'] = r.dir; });
    var ziel = res[1][0] || null;
    var lastSync = res[4][0] ? res[4][0].value : null;
    var model = compute(emp, res[0], ziel, globals, ownT, lastSync);
    model.preview = preview; model.choices = choices; model.email = session.user.email;
    model.state = 'ok'; model.loadedAt = new Date().toISOString();
    await storageSet({ model: model });
    await recordSnapshot(model);
    return model;
  }

  function compute(emp, rows, ziel, globals, ownT, lastSync) {
    var t = today(), mk = t.slice(0, 7);
    var sT = sumRows(rows.filter(function (r) { return r.date === t; }));
    var sM = sumRows(rows);
    var optTag = ziel && ziel.opt_per_tag != null ? +ziel.opt_per_tag : 0;
    var margeOpt = ziel && ziel.marge_per_opt != null ? +ziel.marge_per_opt : 0;
    var days = workDaysOfMonth(mk, ziel && ziel.arbeitstage);
    var worksToday = days.indexOf(t) >= 0;
    var planned = workHoursForDate(emp, t);
    var frac = worksToday && planned > 0 ? Math.min(1, elapsedWorkHoursTodayFor(emp, lastSync) / planned) : 0;
    var fullBefore = days.filter(function (d) { return d < t; }).length;
    var soll = {
      optToday: worksToday ? optTag * frac : 0, margeToday: worksToday ? optTag * margeOpt * frac : 0,
      optMonth: optTag * (fullBefore + frac), margeMonth: optTag * margeOpt * (fullBefore + frac),
      optDayGoal: worksToday ? optTag : 0, optMonthGoal: optTag * days.length, margeMonthGoal: optTag * margeOpt * days.length
    };
    var tg = targetsFor(emp, globals, ownT, mk);
    function okVal(v, target) { if (v === null || target == null || target.val == null) return null; return target.dir === 'lte' ? v <= target.val : v >= target.val; }
    function okSoll(v, s) { return s > 0 ? v >= s : null; }
    var kpis = [
      { key: 'opt', label: 'Optimierungen', today: sT.opt, month: sM.opt, okToday: okSoll(sT.opt, soll.optToday), okMonth: okSoll(sM.opt, soll.optMonth), fmt: 'int', ziel: 'Soll bis jetzt' },
      { key: 'marge', label: 'Marge', today: sT.marge, month: sM.marge, okToday: okSoll(sT.marge, soll.margeToday), okMonth: okSoll(sM.marge, soll.margeMonth), fmt: 'eur', ziel: 'Soll bis jetzt' }
    ];
    [['crOEM', 'CR OEM'], ['crTW', 'CR TW'], ['crSyMy', 'CR SY/MY'], ['crMY', 'CR MY']].forEach(function (p) {
      var tv = cr(sT, p[0]), mv = cr(sM, p[0]), target = tg[p[0]];
      kpis.push({ key: p[0], label: p[1], today: tv, month: mv, okToday: okVal(tv, target), okMonth: okVal(mv, target), fmt: 'pct',
        ziel: target && target.val != null ? (target.dir === 'lte' ? '≤ ' : '≥ ') + Math.round(target.val) + '%' : '—' });
    });
    var prov = calcProvision(emp, mk, sM);
    var paceRatio = soll.optToday > 0 ? sT.opt / soll.optToday : null;
    var stale = !lastSync || (Date.now() - new Date(lastSync).getTime() > 2 * 3600 * 1000);
    return { emp: { id: emp.id, name: emp.name }, monthKey: mk, today: t, optToday: sT.opt, soll: soll, kpis: kpis, prov: prov, paceRatio: paceRatio, lastSync: lastSync, stale: stale };
  }

  // Stundenverlauf: Die Datenbank kennt nur Tagessummen. Die Erweiterung merkt sich deshalb bei jedem
  // Abruf den heutigen Stand und bildet daraus die Optimierungen je Stunde (ab Browserstart).
  async function recordSnapshot(model) {
    var st = await storageGet(['snapshots']); var s = st.snapshots;
    if (!s || s.date !== model.today || s.empId !== model.emp.id) s = { date: model.today, empId: model.emp.id, byHour: {} };
    var h = new Date().getHours(); s.byHour[h] = model.optToday;
    await storageSet({ snapshots: s });
  }
  function hourlyBars(snapshots, fromH, toH) {
    var out = [], prev = 0, has = false;
    for (var h = fromH; h <= toH; h++) {
      var v = snapshots && snapshots.byHour && snapshots.byHour[h];
      if (v != null) { out.push({ h: h, val: Math.max(0, v - prev), known: true }); prev = v; has = true; }
      else out.push({ h: h, val: 0, known: false });
    }
    return { bars: out, has: has };
  }

  return { load: load, login: login, logout: logout, getSession: getSession, hourlyBars: hourlyBars, storageGet: storageGet, storageSet: storageSet, config: C };
})();
