// Sales OS – automatischer Testlauf (laeuft lokal und in GitHub Actions).
// Startet index.html im Browser mit Testdaten (keine echte Datenbank) und prueft die wichtigsten Ablaeufe.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(here, '..', 'index.html');
const results = []; let failed = 0;
function check(name, ok, info) { results.push((ok ? '✓ ' : '✗ ') + name + (info ? ' – ' + info : '')); if (!ok) failed++; }

// Supabase-Ersatz: jede Abfrage liefert leere Daten, Schreiben „klappt“
const MOCK = `(function(){
  function chain(){var c={};['select','eq','neq','order','limit','in','gte','lte','is','not','range','match','filter','or','single','maybeSingle','delete','insert','update','upsert'].forEach(function(k){c[k]=function(){return c;};});
    c.then=function(r,j){return Promise.resolve({data:[],error:null,count:0}).then(r,j);};c.catch=function(){return c;};return c;}
  var cl={from:chain,auth:{getSession:function(){return Promise.resolve({data:{session:null}});},onAuthStateChange:function(){return {data:{subscription:{unsubscribe(){}}}};},getUser:function(){return Promise.resolve({data:{user:null}});},signOut:function(){return Promise.resolve({});}},
    channel:function(){var o={on:function(){return o;},subscribe:function(){return o;}};return o;},rpc:function(){return chain();},functions:{invoke:function(){return Promise.resolve({data:null});}},
    storage:{from:function(){return {upload(){return Promise.resolve({})},getPublicUrl(){return {data:{}}},createSignedUrl(){return Promise.resolve({data:{signedUrl:'about:blank'}})},remove(){return Promise.resolve({})},download(){return Promise.resolve({data:new Blob(['%PDF-1.4'],{type:'application/octet-stream'}),error:null});}}}}};
  window.supabase={createClient:function(){return cl;}};
})();`;

// Testdaten: 20 Mitarbeiter in SE/SR/OB/VLC, 120 Tage Performance, Protokolle, QA, Ziele
const SETUP = `()=>{
  var g=document.getElementById('auth-gate');if(g)g.style.display='none';
  currentUserRole='admin';
  var roles=[['SE',8,''],['SR',5,''],['SE',2,'Onboarding'],['SR',1,'Onboarding'],['VLC',4,'']],id=0,seed=5;
  function r(){seed=(seed*9301+49297)%233280;return seed/233280;}
  employees=[];performance={};protocols={};callRatings={};
  roles.forEach(function(gr){for(var i=0;i<gr[1];i++){id++;var e={id:'e'+id,name:'MA '+id,role:gr[0],phase:gr[2]||'Aktiv',active:true,color:0,hours:40,startDate:'2025-01-01',targets:{},provisionSettings:{monat3plus:{aktivitaeten:20}}};employees.push(e);
    var rows=[];for(var d=0;d<120;d++){var dt=addDaysUTC(today(),-d),dw=new Date(dt+'T00:00:00Z').getUTCDay();if(dw===0||dw===6)continue;
      var ob=gr[2]?0.75:1,vl=gr[0]==='VLC',oem=Math.round((6+r()*6)*ob),my=Math.round(oem*(0.12+r()*0.15)*ob),sy=Math.round(oem*0.35),yes=Math.max(0,oem-my-sy-1);
      var x={date:dt,convOEM:oem,notSuccessful:Math.round(4+r()*5),ups_yes:vl?0:Math.round((2+r()*3)*ob),upsNichtErfolgreich:vl?0:Math.round(4+r()*4),wka_gesamt_yes:vl?0:Math.round(1+r()*3),wkaOemNichtErfolgreich:vl?0:1,wkaUpsNichtErfolgreich:0,wkaOemBeendet:0,wkaUpsBeendet:0,
        convMY:my,convSY:sy,convYes:yes,convTW:1,margeOEM:Math.round(oem*24*ob),margeUpsell:vl?0:60,margeWKA:vl?0:40,gesamtAktivitaeten:Math.round(40+r()*30),oem_aktivitaeten:50,optGesamt:oem+3};
      x.margeGesamt=x.margeOEM+x.margeUpsell+x.margeWKA;rows.push(x);}
    performance[e.id]=rows;protocols[e.id]=[{date:addDaysUTC(today(),-Math.floor(r()*40)-1),status:'abgeschlossen',coachId:'c1'}];callRatings[e.id]=[{date:addDaysUTC(today(),-5)}];}});
  employees[16].provisionSettings={vlc:{monat3plus:{syMy:70}}};
  zielStore={};for(var m=1;m<=12;m++){var mk=today().slice(0,4)+'-'+('0'+m).slice(-2);zielStore[mk]={};employees.forEach(function(e){zielStore[mk][e.id]={optTag:14,margeOpt:24,weeks:null};});}
  employeeDocuments={e1:[{id:'d1',filename:'Test.pdf',storagePath:'e1/t.pdf',uploadedAt:'2026-01-01'}]};
}`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
await page.route('**/*', r => {
  const u = r.request().url();
  if (u.includes('supabase')) return r.fulfill({ body: '/*supabase-stub*/', contentType: 'application/javascript' });
  // Chart.js aus dem lokalen Paket (gleiche Version wie im Board) statt vom CDN
  if (/chart(\.umd)?(\.min)?\.js/i.test(u)) return r.fulfill({ body: fs.readFileSync(path.join(here, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'), 'utf8'), contentType: 'application/javascript' });
  if (u.startsWith('file:') || u.startsWith('blob:') || u.includes('cdnjs') || u.includes('jsdelivr')) return r.continue();
  return r.fulfill({ body: '', status: 200 });
});
await page.addInitScript(MOCK);
await page.goto('file://' + path.resolve(file));
await page.waitForTimeout(1000);
await page.evaluate(new Function('return (' + SETUP + ')()'));

async function step(code) { try { await page.evaluate(code); await page.waitForTimeout(120); } catch (e) { errors.push('Schritt „' + code + '“: ' + e.message); } }

// 1) Rundgang durch alle Bereiche
for (const s of ["selectDashboard()", "dshSetPeriod('weeks')", "dshSetPeriod('years')", "dshSetTP('day')", "dshSetTP('month')", "dshSetCP('week')", "dshSetCK('qa')",
  "selectWiegandSub('overview')", "selectWiegandSub('ziel')", "selectProvisionTeam()", "selectEmp('e1')", "activeTab='coaching';renderMain()", "activeTab='qa';renderMain()",
  "openPerfPopup('e1')", "closeModal('perfPopModal')", "openEmpSetModal('e1')", "closeEmpSetModal()", "view='coaching';renderSidebar();renderMain()", "view='activity';renderMain()",
  "selectSettingsSub('wizards')", "wizToggleOpen('daily')", "wizPreview('daily')", "closeLoginWizard()", "selectSettingsSub('general')", "selectSettingsSub('roles')", "selectSettingsSub('integrations')", "selectSettingsSub('data')"]) await step(s);

// 2) Dashboard: alle Kacheln gleich hoch, Filter rechts auf Höhe der Überschrift
await step("selectDashboard()");
const hs = new Set();
for (const tp of ['day', 'week', 'month']) for (const k of ['ze', 'crO', 'crU', 'akt', 'tw']) {
  await page.evaluate(`dshKpi='${k}';dshSetTP('${tp}')`); await page.waitForTimeout(40);
  (await page.evaluate("Array.from(document.querySelectorAll('.dsh-tcs:not(.co) .dsh-tc')).map(e=>Math.round(e.getBoundingClientRect().height))")).forEach(h => hs.add(h));
}
check('Dashboard: Team-Kacheln immer gleich hoch', hs.size === 1, [...hs].join('/'));
const al = await page.evaluate("Array.from(document.querySelectorAll('#mainArea .card-title')).slice(0,3).map(c=>{var t=c.getBoundingClientRect(),s=c.querySelector('.dsh-seg').getBoundingClientRect();return Math.abs((s.top+s.bottom)/2-(t.top+t.bottom)/2);})");
check('Dashboard: Filter auf Höhe der Überschriften', al.length === 3 && al.every(x => x < 2), al.join(','));

// 3) Ziele aus Stammdaten & Provisionsvereinbarung
const tg = await page.evaluate("(function(){var v=employees[16],t=empTargets(v),s=empTargets(employees[0]);return [t.crSyMy.val,s.oem_aktivitaeten.val,s.crYes.dir];})()");
check('Ziele: VLC-SY/MY aus der Vereinbarung', tg[0] === 70, tg[0]);
check('Ziele: Aktivitäten aus der Vereinbarung', tg[1] === 20, tg[1]);
check('Ziele: CR YES ist ein Max.-Wert', tg[2] === 'lte', tg[2]);
await step("openEmpSetModal('e1')");
await page.evaluate("document.getElementById('pv-monat3plus-crYes').value='';saveProvisionSettings('e1')");
check('Ziele: leeres Feld = kein Ziel', await page.evaluate("empTargets(employees[0]).crYes.val") === null);
await step("closeEmpSetModal()");

// 4) Performance-Tabelle: Akt./Std. wird gegen das Ziel geprüft
await step("selectWiegandSub('overview')");
const red = await page.evaluate("Array.from(document.querySelectorAll('td')).filter(td=>(td.getAttribute('onmouseenter')||'').indexOf('Akt./Std.')>=0).slice(0,3).map(td=>td.style.color)");
check('Performance: Akt./Std. unter Ziel ist rot', red.length > 0 && red.every(c => c.includes('red')), red.join(','));

// 5) Namensklick öffnet das Popup, Ansicht bleibt
const nm = await page.$('td[onclick^="openPerfPopup"]');
if (nm) { await nm.click(); await page.waitForTimeout(200); }
check('Performance: Namensklick öffnet das Popup', await page.evaluate("!document.getElementById('perfPopModal').classList.contains('hidden')&&view==='team'"));
await step("closeModal('perfPopModal')");

// 6) Browser-Zurück springt in die vorherige Maske
for (const s of ["selectDashboard()", "selectWiegandSub('overview')", "selectEmp('e1')"]) await step(s);
await page.evaluate('history.back()'); await page.waitForTimeout(400);
check('Navigation: Zurück führt zur Performance', await page.evaluate("view==='team'&&wiegandView==='overview'"));

// 7) Dokument öffnen (PDF-Vorschau im Board)
await step("selectEmp('e1')"); await step("openEmpDocument('d1')"); await page.waitForTimeout(300);
check('Dokumente: PDF öffnet im Board', await page.evaluate("!!document.querySelector('#docPrevOv iframe')"));
await step("closeDocPreview()");

// 8) Paralleles Laden: alle Zeilen vollstaendig und ohne Doppelte
const par = await page.evaluate(`(async function(){
  var rows=[];for(var i=0;i<2500;i++)rows.push({employee_id:'e'+(i%20),date:'d'+String(i).padStart(5,'0')});
  var real=sb;
  sb={from:function(){var q={_c:false,_r:null,select:function(c,o){if(o&&o.head)q._c=true;return q;},order:function(){return q;},range:function(a,b){q._r=[a,b];return q;},
    then:function(res,rej){return Promise.resolve(q._c?{count:rows.length,data:null,error:null}:{data:rows.slice(q._r[0],q._r[1]+1),error:null}).then(res,rej);}};return q;}};
  try{var r=await selectAllParallel('performance','*',['employee_id','date']);}finally{sb=real;}
  var keys=new Set(r.data.map(function(x){return x.date;}));return [r.data.length,keys.size];
})()`);
check('Laden: parallel vollständig (2500 Zeilen)', par[0] === 2500 && par[1] === 2500, par.join('/'));

// 9) Sitzung: Anmeldung gilt nur heute (max. 12 h), Abmeldung nach 4 h Inaktivität mit Vorwarnung
const sess = await page.evaluate(`(async function(){
  function S(h){return {user:{last_sign_in_at:new Date(Date.now()-h*3600000).toISOString()}};}
  var y=new Date();y.setDate(y.getDate()-1);y.setHours(12,0,0,0);
  var res={heute:_sessExpired(S(0.1)),gestern:_sessExpired({user:{last_sign_in_at:y.toISOString()}}),zwoelf:_sessExpired(S(12.5))};
  var realGet=sb.auth.getSession,realOut=sb.auth.signOut,out=0;
  sb.auth.getSession=function(){return Promise.resolve({data:{session:S(0.1)}});};
  sb.auth.signOut=function(){out++;return new Promise(function(){});};
  localStorage.setItem('sos_lastActivity',String(Date.now()-239*60000));_sessionWatch();await new Promise(r=>setTimeout(r,50));
  res.warnung=!!document.getElementById('idleWarn');
  localStorage.setItem('sos_lastActivity',String(Date.now()-241*60000));_sessionWatch();await new Promise(r=>setTimeout(r,50));
  res.abgemeldet=out>0;
  sb.auth.getSession=realGet;sb.auth.signOut=realOut;var w=document.getElementById('idleWarn');if(w)w.remove();localStorage.setItem('sos_lastActivity',String(Date.now()));
  return res;})()`);
check('Sitzung: heutige Anmeldung bleibt gültig', sess.heute === false);
check('Sitzung: Anmeldung von gestern läuft ab', sess.gestern === true);
check('Sitzung: nach 12 Stunden läuft sie ab', sess.zwoelf === true);
check('Sitzung: Vorwarnung kurz vor 4 Stunden Inaktivität', sess.warnung === true);
check('Sitzung: Abmeldung nach 4 Stunden Inaktivität', sess.abgemeldet === true);

check('Chart.js mit Prüfsumme geladen', await page.evaluate("typeof Chart==='function'"));
check('Keine Skriptfehler', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed ? 1 : 0);
