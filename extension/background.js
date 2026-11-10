importScripts('config.js', 'data.js');

// Farbe der Zahl am Icon: im Plan / knapp dahinter / deutlich unter Plan / keine aktuellen Daten
function badgeFor(model) {
  if (!model || model.state !== 'ok') return { text: model && model.state === 'login' ? '' : '!', color: '#8A7F72' };
  if (model.stale) return { text: '!', color: '#8A7F72' };
  var text = String(Math.round(model.optToday || 0));
  var r = model.paceRatio;
  var color = r === null ? '#5C564F' : r >= 1 ? '#5C564F' : r >= 0.85 ? '#D94109' : '#BD2D29';
  return { text: text, color: color };
}

async function refresh() {
  var model;
  try { model = await SOS.load(); }
  catch (e) { model = { state: 'error', error: String(e.message || e) }; }
  try { if (model && model.state === 'ok' && model.forecast && model.crMy) await checkHints(model); } catch (e) { console.warn('Hinweise:', e); }
  var b = badgeFor(model);
  await chrome.action.setBadgeText({ text: b.text });
  await chrome.action.setBadgeBackgroundColor({ color: b.color });
  if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  return model;
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.create('sos-refresh', { periodInMinutes: SOS_CONFIG.refreshMinutes });
  refresh();
});
chrome.runtime.onStartup.addListener(function () {
  chrome.alarms.create('sos-refresh', { periodInMinutes: SOS_CONFIG.refreshMinutes });
  refresh();
});
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'sos-refresh') refresh(); });

// Das Popup fordert nach Login, Abmelden oder Vorschau-Wechsel einen Neuabruf an
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === 'refresh') { refresh().then(sendResponse); return true; }
});

// ── Hinweise: werden bei jedem Abruf geprueft, je Tag hoechstens einmal pro Art (Leerlauf: einmal pro Stunde)
var HINT_DEFAULTS = { prognose: true, record: true, idle: false, antrag: true, termin: true };
function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
async function addHint(day, imp, text, notify) {
  var st = await SOS.storageGet(['hints']);
  var h = st.hints && st.hints.date === day ? st.hints : { date: day, items: [] };
  h.items.unshift({ t: hhmm(new Date()), imp: imp, text: text });
  h.items = h.items.slice(0, 30);
  await SOS.storageSet({ hints: h });
  if (notify && chrome.notifications) {
    chrome.notifications.create('sos-' + Date.now(), { type: 'basic', iconUrl: 'icons/icon128.png', title: 'Sales OS', message: text, priority: imp ? 2 : 0 });
  }
}
async function checkHints(m) {
  var st = await SOS.storageGet(['hintSettings', 'hintFlags', 'snapshots']);
  var set = Object.assign({}, HINT_DEFAULTS, st.hintSettings || {});
  var flags = st.hintFlags && st.hintFlags.date === m.today ? st.hintFlags : { date: m.today };
  var f = m.forecast || {}, now = new Date();
  // 1) Prognose faellt unter das Tagesziel (erst nach mind. 2 Stunden Arbeitszeit aussagekraeftig)
  if (f.goal && f.perHour != null && m.todayDetail && m.todayDetail.opt > 0) {
    var startH = m.dayPlan ? m.dayPlan.startMin / 60 : 8.5;
    if (now.getHours() + now.getMinutes() / 60 - startH >= 2 && f.opt < f.goal && !flags.prognose) {
      flags.prognose = true;
      await addHint(m.today, true, 'Prognose unter Ziel (' + Math.round(f.opt) + ' von ' + Math.round(f.goal) + ')', set.prognose);
    }
  }
  // 2) Neuer Rekord an Optimierungen an einem Tag
  var rec = m.timeline ? m.timeline.recordOptBeforeToday : 0;
  if (rec > 0 && m.optToday > rec && !flags.record) {
    flags.record = true;
    await addHint(m.today, false, 'Rekord: ' + m.optToday + ' Opt. an einem Tag', set.record);
  }
  // 3) Eine volle Stunde ohne Optimierung (nur innerhalb der Arbeitszeit)
  var s = st.snapshots, h = now.getHours();
  if (s && s.date === m.today && s.byHour && s.byHour[h - 1] && s.byHour[h - 2]) {
    var a = s.byHour[h - 1].opt, b2 = s.byHour[h - 2].opt;
    var inWork = m.dayPlan && h * 60 > m.dayPlan.startMin + 60 && h * 60 <= m.dayPlan.endMin;
    if (inWork && a === b2 && flags.idle !== h) {
      flags.idle = h;
      await addHint(m.today, true, 'Eine Stunde ohne Optimierung (' + (h - 1) + '–' + h + ' Uhr)', set.idle);
    }
  }
  // 4) Info: CR MY heute ueber dem Monatsschnitt (nur im Verlauf, ohne Benachrichtigung)
  if (m.crMy && m.crMy.today != null && m.crMy.month != null && m.crMy.closers >= 5 && m.crMy.today > m.crMy.month && !flags.crmy) {
    flags.crmy = true;
    await addHint(m.today, false, 'CR MY über Monatsschnitt', false);
  }
  // 5) Urlaubsantrag wurde genehmigt oder abgelehnt (Vergleich mit dem letzten Abruf)
  if (m.urlaub && m.urlaub.ok && !m.preview) {
    var prev = (await SOS.storageGet(['absStatus'])).absStatus, cur = m.urlaub.statusById || {};
    if (prev && prev.emp === m.emp.id) {
      for (var id in cur) {
        if (prev.s[id] === 'offen' && (cur[id] === 'genehmigt' || cur[id] === 'abgelehnt')) {
          var x = (m.urlaub.items || []).find(function (i) { return i.id === id; });
          var wann = x ? (x.von === x.bis ? x.von.slice(8, 10) + '.' + x.von.slice(5, 7) + '.' : x.von.slice(8, 10) + '.' + x.von.slice(5, 7) + '.–' + x.bis.slice(8, 10) + '.' + x.bis.slice(5, 7) + '.') : '';
          await addHint(m.today, cur[id] === 'abgelehnt', 'Urlaubsantrag ' + (wann ? wann + ' ' : '') + cur[id], set.antrag);
        }
      }
    }
    await SOS.storageSet({ absStatus: { emp: m.emp.id, s: cur } });
  }
  // 6) Termin am naechsten Arbeitstag (einmal am Tag, ab 15 Uhr)
  if (m.termine && m.termine.items && now.getHours() >= 15 && !flags.termin) {
    var tm = new Date(now.getTime() + 86400000), nextD = tm.getFullYear() + '-' + ('0' + (tm.getMonth() + 1)).slice(-2) + '-' + ('0' + tm.getDate()).slice(-2);
    var nx = m.termine.items.filter(function (x) { return x.date === nextD && !x.due; });
    if (nx.length) { flags.termin = true; await addHint(m.today, false, 'Morgen: ' + nx.map(function (x) { return x.art + (x.time ? ' um ' + x.time : ''); }).join(', '), set.termin); }
  }
  await SOS.storageSet({ hintFlags: flags });
}
