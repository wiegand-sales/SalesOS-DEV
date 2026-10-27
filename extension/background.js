importScripts('config.js', 'data.js');

// Farbe der Zahl am Icon: im Plan / knapp dahinter / deutlich unter Plan / keine aktuellen Daten
function badgeFor(model) {
  if (!model || model.state !== 'ok') return { text: model && model.state === 'login' ? '' : '!', color: '#56676a' };
  if (model.stale) return { text: '!', color: '#56676a' };
  var text = String(Math.round(model.optToday || 0));
  var r = model.paceRatio;
  var color = r === null ? '#136c72' : r >= 1 ? '#136c72' : r >= 0.85 ? '#b07a1f' : '#a8501c';
  return { text: text, color: color };
}

async function refresh() {
  var model;
  try { model = await SOS.load(); }
  catch (e) { model = { state: 'error', error: String(e.message || e) }; }
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
