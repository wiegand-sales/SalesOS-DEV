// Sales OS – automatischer Testlauf (laeuft lokal und in GitHub Actions).
// Startet index.html im Browser mit Testdaten (keine echte Datenbank) und prueft die wichtigsten Ablaeufe.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { gesamtText, quellen } from './quellen.mjs';

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
  "selectSettingsSub('wizards')", "wizToggleOpen('daily')", "wizPreview('daily')", "closeLoginWizard()", "selectSettingsSub('general')", "selectSettingsSub('roles')", "selectSettingsSub('integrations')", "selectSettingsSub('data')", "selectKalender()"]) await step(s);

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

// 7b) Menü „Telefonate“: Banner-Folie + vier Boxen mit Testdaten (Prüfwerte 24.11.2026)
await page.evaluate(`(function(){
  var D={
    trichter:{erstanruf:25357,err1:11572,nicht_err:13785,rueck:2275,angen:1271,verloren:1004,gleich_1:1038,median_min:14},
    agenten:[{employee_id:'e1',wv:218,err:93,mb:67,ne:58,wg:20,klingel_ne:24,gz_aus:11280,ein_ang:5,gz_ein:360},
             {employee_id:'e2',wv:279,err:116,mb:64,ne:99,wg:30,klingel_ne:17,gz_aus:10260,ein_ang:22,gz_ein:2820}],
    versuche:{versuche:[{n:1,kunden:25357,err:11572,mb:6957,wg:3046,na:3782,rueck:1426,median_std:null,gespraech_avg:137},{n:2,kunden:9618,err:2242,mb:3506,wg:2008,na:1862,rueck:488,median_std:2.49,gespraech_avg:129}],
      ab4:{anrufe:5872,err:545,mb:1908,wg:2398,na:1021,median_std:2.39,gespraech_avg:115},gesamt:{kunden:25357,err:15251,err1:11572,err2:2242,err3:892,err4:545,nie:10106,nur_einmal:4167,rueckrufer:2275}},
    eingang:[{k:today(),n:448,a800:247,a831:4}],
    eingang_kacheln:{n:7229,ang:2872,gruppen:[{g:'800',n:7103,ang:2845},{g:'831',n:126,ang:27}],kern:{n:6673,ang:2856},von:[{employee_id:'e1',n:130}],gespraech_avg:134,warte_ang_avg:11,warte_auflegen_avg:42,
      gewartet:{u15:584,m15_59:2873,ab60:900},verpasst:{n:4357,angerufen:1497,durch:805,kein:1962,unbekannt:93},ausser:{n:556,ang:16,ab17:330,fr14:176,we:30,vor8:20},heute:{n:69,ueber2:55}},
    heatmap:[{wd:1,std:9,n:1673,ok:619},{wd:5,std:12,n:303,ok:127},{wd:2,std:10,n:12,ok:3}]};
  sb.rpc=function(name,args){return Promise.resolve({data:name==='telefonate_daten'?D[args.p_art]:[],error:null});};
  TEL.cache={};
})()`);
await step("selectTelefonate()"); await page.waitForTimeout(400);
check('Telefonate: Ansicht und Banner-Folie 8', await page.evaluate("view==='telefonate'&&bannerViewMode==='telefonate'&&_bannerRotationOrder.indexOf('telefonate')===7&&document.getElementById('gBan').textContent.indexOf('Erstanruf')>=0"));
check('Telefonate: vier Boxen', await page.evaluate("document.querySelectorAll('#mainArea section').length") === 4);
check('Telefonate: Box 1 zählt Wahlversuche + angenommene (218+5=223, 279+22=301)', await page.evaluate("document.getElementById('mainArea').textContent.indexOf('301')>=0&&document.getElementById('mainArea').textContent.indexOf('223')>=0"));
check('Telefonate: Eingehend „ohne Nummer“ sichtbar', await page.evaluate("document.getElementById('mainArea').textContent.indexOf('ohne Nummer')>=0"));
await step("telToggle('a')");
check('Telefonate: Box zuklappbar', await page.evaluate("!TEL.a&&document.getElementById('mainArea').textContent.indexOf('zum Aufklappen klicken')>=0"));
for (const s of ["telToggle('a')", "telSetPer('monat')", "telSetOrt('VLC')", "telSetOrt('')", "telSetHl('worst')", "telSetVper('jahr')", "telSetEper('wochen')", "telSetEper('monate')", "telSetDir('ein')", "telSetDir('aus')", "ddToggle('telVs')", "ddPick('telVs','telSetAtt','2')", "ddToggle('telAg')", "ddPick('telAg','telPickAgents','T:SE')", "ddPick('telAg','telPickAgents','E:e1')", "ddPick('telAg','telPickAgents','T:')", "selectSettingsSub('telefonate')"]) await step(s);
check('Telefonate: Einstellungen › Telefonate', await page.evaluate("settingsView==='telefonate'&&!!document.getElementById('tel-grenze')"));

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


// 10) Kalender: Ansichten, Regeln, Urlaubskonto, Genehmigen
await step("selectKalender()");
for (const v of ['woche', 'jahr', 'team', 'monat']) await step(`kalSetView('${v}')`);
await step("kalSetPane('gen')"); await step("kalSetPane('plan')"); await step("kalLocToggle('MUC')"); await step("kalLocToggle('MUC')");
const kal = await page.evaluate(`(function(){
  var t=today(),d=function(n){return addDaysUTC(t,n);},y=t.slice(0,4);
  var f30=d(30);while(![1,2,3,4].every(function(i){return kalWorkday(employees[i],f30);}))f30=addDaysUTC(f30,1); // Werktag für alle (z. B. nicht 24.12.)
  employees[0].urlaub={};employees[0].urlaub[y]={anspruch:28,flex:5,uebertrag:0,vorher_genommen:10};
  absences=[{id:'k1',employeeId:'e2',art:'urlaub',von:f30,bis:f30,halb:false,status:'genehmigt',eingereichtAm:d(-5)},
    {id:'k2',employeeId:'e3',art:'urlaub',von:f30,bis:f30,halb:false,status:'genehmigt',eingereichtAm:d(-5)},
    {id:'k3',employeeId:'e4',art:'urlaub',von:f30,bis:f30,halb:false,status:'offen',eingereichtAm:d(-5)},
    {id:'k4',employeeId:'e1',art:'urlaub',von:d(3),bis:d(3),halb:false,status:'offen',eingereichtAm:t}];
  renderKalender();
  var kurz=kalEval({employeeId:'e1',art:'urlaub',von:d(3),bis:d(3),halb:false}).H.some(function(h){return /Flex Day/.test(h.h);});
  var frei=kalEval({employeeId:'e5',art:'urlaub',von:f30,bis:f30,halb:false}).H.some(function(h){return /3 oder mehr andere frei/.test(h.h);});
  var wd=d(1);while(!kalWorkday(employees[4],wd))wd=addDaysUTC(wd,1);var kr=kalEval({employeeId:'e5',art:'krank',von:wd,bis:wd,halb:false}).H.some(function(h){return /50 %/.test(h.h);});
  var vor=kalKonto('e1').tk;
  kalDecide('k4',true);var fx=absences.find(function(a){return a.id==='k4';});
  var vlc=Object.values(valenciaFeiertage(+y)).indexOf('San José (Fallas)')>=0&&kalHol(y+'-12-08','VLC')!==''&&kalHol(y+'-12-08','MUC')==='';
  return {kurz:kurz,frei:frei,kr:kr,vor:vor,flex:fx.status+'/'+fx.art,vlc:vlc,html:!!document.querySelector('.kal-mg')};})()`);
check('Kalender: Monatsansicht wird gezeichnet', kal.html);
check('Kalender: weniger als 15 Arbeitstage Vorlauf = Flex Day', kal.kurz);
check('Kalender: Hinweis bei 3 anderen frei', kal.frei);
check('Kalender: Krank mit 50-%-Hinweis', kal.kr);
check('Kalender: „vor dem Kalender genommen“ zählt ins Konto', kal.vor === 10, kal.vor);
check('Kalender: Genehmigen bei kurzem Vorlauf zählt als Flex Day', kal.flex === 'genehmigt/flex', kal.flex);
check('Kalender: Feiertage Valencia nur für VLC', kal.vlc);
const kalF = await page.evaluate(`(function(){
  view='coaching';renderMain();var coach=!!document.querySelector('#mainArea .kal-wv,#mainArea .kal-mg');
  view='kalender';KAL.view='monat';KAL.hide={};renderMain();KAL.cur=today();renderKalender();var vor=document.querySelectorAll('#mainArea .kal-mg .kal-ch.kal-f').length;
  kalFilt('flex');var nach=document.querySelectorAll('#mainArea .kal-mg .kal-ch.kal-f').length;kalFilt('*');
  return {coach:coach,vor:vor,nach:nach};})()`);
const kalR = await page.evaluate(`(function(){var t=today();protocols['e1']=(protocols['e1']||[]).concat([{id:'rz1',date:kalRef(),uhrzeit:'10:00',endUhrzeit:'11:00',type:'Weekly',status:'geplant'}]);
  KAL.view='team';KAL.cur=t;renderKalender();var team=document.querySelectorAll('#mainArea .kal-tl [data-krz]').length;
  KAL.view='woche';KAL.cur=kalRef();renderKalender();var wk=document.querySelectorAll('#mainArea .kal-wv [data-sid="rz1"] [data-krz]').length;return {team:team,wk:wk};})()`);
check('Kalender: Griffe zum Verlängern an Sessions', kalR.wk === 2, kalR.wk);
const kalG = await page.evaluate(`(function(){var d=kalRef();['e1','e2','e3'].forEach(function(id){protocols[id]=(protocols[id]||[]).concat([{id:'g_'+id,date:d,uhrzeit:'14:00',endUhrzeit:'15:00',type:'Product Training',status:'geplant',groupId:'GX'}]);});
  view='kalender';var ent=kalSess(d).filter(function(o){return o.p.groupId==='GX';});kalMoveSes('e1','g_e1',d,'16:00');
  var moved=['e1','e2','e3'].every(function(id){return protocols[id].find(function(p){return p.id==='g_'+id;}).uhrzeit==='16:00';});
  return {n:ent.length,cnt:ent[0]?ent[0].n:0,moved:moved};})()`);
check('Kalender: Gruppencoaching ist ein Termin', kalG.n === 1 && kalG.cnt === 3, kalG.n + '/' + kalG.cnt);
check('Kalender: Gruppencoaching verschiebt alle Teilnehmer', kalG.moved);
const kalRg = await page.evaluate(`(function(){var t=today(),d=function(n){return addDaysUTC(t,n);};
  var halb=kalHalb({halb:true,halbTeil:'nm'})===' ½ NM';
  var wd=d(40);while(!kalWorkday(employees[4],wd))wd=addDaysUTC(wd,1);
  absences=absences.concat([{id:'r1',employeeId:'e2',art:'urlaub',von:wd,bis:wd,halb:false,status:'genehmigt',eingereichtAm:d(-5)},{id:'r2',employeeId:'e3',art:'urlaub',von:wd,bis:wd,halb:false,status:'genehmigt',eingereichtAm:d(-5)}]);
  _kalOnIdx=null;settings.kalenderRules={freiGrenze:2};var g2=kalEval({employeeId:'e5',art:'urlaub',von:wd,bis:wd,halb:false}).H.some(function(h){return /2 oder mehr andere frei/.test(h.h);});
  settings.kalenderRules={freiGrenze:5};var g5=kalEval({employeeId:'e5',art:'urlaub',von:wd,bis:wd,halb:false}).H.some(function(h){return /andere frei/.test(h.h);});
  settings.kalenderRules={weekly:{auto:false},routinen:[{id:'rx',art:'Weekly',rhythmus:'monat',empIds:['e4']}]};_kalTC.v=null;var T=kalTasks();
  var noWk=!T.some(function(x){return /^wk/.test(x.id);}),rt=T.some(function(x){return /^rtrx/.test(x.id);});
  settings.kalenderRules={verschieben:'antrag'};kalMoveAbs('r1',wd,addDaysUTC(wd,7));var mv=absences.find(function(a){return a.id==='r1';}).status;
  settings.kalenderRules={};view='settings';settingsView='kalender';renderMain();var page=!!document.querySelector('#mainArea')&&/Weekly automatisch vorschlagen/.test(document.getElementById('mainArea').innerHTML);view='kalender';renderMain();
  return {halb:halb,g2:g2,g5:g5,noWk:noWk,rt:rt,mv:mv,page:page};})()`);
check('Kalender: halber Tag mit Vormittag/Nachmittag', kalRg.halb);
check('Kalender: Grenze für „andere frei“ einstellbar', kalRg.g2 && !kalRg.g5);
check('Kalender: Weekly-Vorschlag abschaltbar', kalRg.noWk);
check('Kalender: Routine erzeugt Aufgabe unter Planen', kalRg.rt);
check('Kalender: Verschieben als Antrag', kalRg.mv === 'offen', kalRg.mv);
check('Einstellungen: Reiter Kalender', kalRg.page);
const kalFs = await page.evaluate(`(function(){var y=today().slice(0,4),wd=y+'-03-02';while(!kalWorkday(employees[5],wd))wd=addDaysUTC(wd,1);var vor=kalKonto('e6').tk;
  absences.push({id:'fs1',employeeId:'e6',art:'freistellung',von:wd,bis:wd,halb:false,status:'genehmigt',eingereichtAm:wd});_kalOnIdx=null;var k=kalKonto('e6');return {gleich:k.tk===vor,fs:k.fs||0};})()`);
check('Kalender: Freistellung kostet keinen Urlaub', kalFs.gleich && kalFs.fs === 1, kalFs.fs);
const jw = await page.evaluate(`(function(){var py=String(+today().slice(0,4)-1),e=kalEmp('e6');e.urlaub=e.urlaub||{};e.urlaub[py]={anspruch:28,flex:5,uebertrag:5};_kalOnIdx=null;var k=kalKonto('e6',py);
  var el=document.createElement('input');el.id='overviewWeekInput';el.value='2027-W01';document.body.appendChild(el);var f0=overviewFromDate,t0=overviewToDate,r={};try{applyOverviewWeek();}catch(x){}r.von=overviewFromDate;r.bis=overviewToDate;el.value='2026-W48';try{applyOverviewWeek();}catch(x){}r.von2=overviewFromDate;el.remove();overviewFromDate=f0;overviewToDate=t0;
  delete e.urlaub[py];return {ueb:k.uebEff,von:r.von,bis:r.bis,von2:r.von2};})()`);
check('Urlaub: Übertrag im Vorjahr nach 31.03. verfallen', jw.ueb === 0, jw.ueb);
check('Wochenauswahl: KW 1/2027 = 04.01.–10.01.2027', jw.von === '2027-01-04' && jw.bis === '2027-01-10' && jw.von2 === '2026-11-23', jw.von + '–' + jw.bis + ' / ' + jw.von2);
const ua = await page.evaluate(`(function(){var y=today().slice(0,4),e=kalEmp('e6'),sv={s:e.startDate,x:e.endDate,u:e.urlaub};e.urlaub={};
  e.startDate=y+'-02-01';e.endDate=null;var a=kalKonto('e6',y).ans;
  e.startDate=y+'-02-15';e.urlaub[y]={anspruch:30};var b=kalKonto('e6',y).ans;
  e.startDate=null;e.endDate=y+'-08-31';e.urlaub={};var c=kalKonto('e6',y).ans;
  e.startDate=String(+y-3)+'-05-01';e.endDate=null;var d=kalKonto('e6',y).ans;
  e.startDate=sv.s;e.endDate=sv.x;e.urlaub=sv.u;return [a,b,c,d].join('/');})()`);
check('Urlaub: anteiliger Anspruch bei Eintritt/Austritt (28÷12, 30÷12)', ua === '26/25/19/28', ua);
const ub = await page.evaluate(`(function(){var y=today().slice(0,4),e=kalEmp('e6'),sv={s:e.startDate,x:e.endDate,u:e.urlaub,a:absences.slice()};e.urlaub={};e.urlaub[y]={uebertrag:0};e.startDate=null;e.endDate=y+'-06-30';
  absences=absences.filter(function(x){return x.employeeId!=='e6';});var w=y+'-07-01';while(!kalWorkday(e,w))w=addDaysUTC(w,1);absences.push({id:'aus1',employeeId:'e6',art:'urlaub',von:w,bis:w,halb:false,status:'genehmigt',eingereichtAm:y+'-01-02'});_kalOnIdx=null;
  var k=kalKonto('e6',y);e.startDate=sv.s;e.endDate=sv.x;e.urlaub=sv.u;absences=sv.a;_kalOnIdx=null;return k.ans+'/'+(k.tk+k.pl);})()`);
check('Urlaub: Austritt 30.06. = 14 Tage, Urlaub danach zählt nicht', ub === '14/0', ub);
const c9 = await page.evaluate(`(function(){var e=kalEmp('e6'),sv=absences.slice(),t=today(),w=function(n){var d=addDaysUTC(t,n);while(!kalWorkday(e,d))d=addDaysUTC(d,1);return d;},a=w(4),b=w(40);
  absences=absences.filter(function(x){return x.employeeId!=='e6';});absences.push({id:'c9u',employeeId:'e6',art:'urlaub',von:a,bis:a,halb:false,status:'genehmigt',eingereichtAm:t},{id:'c9f',employeeId:'e6',art:'flex',von:b,bis:b,halb:false,status:'genehmigt',eingereichtAm:addDaysUTC(t,-60)});_kalOnIdx=null;
  openAbsPopup('e6',a.slice(0,7));AB.f=null;abPick(a);abSave();AB.f=null;abPick(b);abSave();var r=['c9u','c9f'].map(function(i){return absences.find(function(x){return x.id===i;}).art;}).join('/');absences=sv;_kalOnIdx=null;AB.f=null;closeModal('absPopModal');return r;})()`);
check('Urlaub: Bearbeiten im Popup behält die Art (Urlaub/Flex Day)', c9 === 'urlaub/flex', c9);
const c10 = await page.evaluate(`(async function(){var e=kalEmp('e1'),sv=e.notes,cf=window.confirm,w=function(){return new Promise(function(r){setTimeout(r,30);});},r=[];
  e.notes='alt';openEmpSetModal('e1');e.notes='neu';saveEmpEinstellungen();r.push(e.notes);await w();
  e.notes='alt2';closeEmpSetModal();openEmpSetModal('e1');e.notes='neu2';document.getElementById('es-notes').value='meins';window.confirm=function(){return false;};saveEmpEinstellungen();r.push(e.notes);await w();
  window.confirm=cf;closeEmpSetModal();e.notes=sv;return r.join('/');})()`);
check('Einstellungen: veraltetes Formular überschreibt neuere Notiz nicht', c10 === 'neu/neu2', c10);
const c4 = await page.evaluate(`(async function(){var e=kalEmp('e1'),svV=employeeVerlauf,svOk=EV_OK,svW=e.workHours,svH=e.hours,svS=e.startDate,w=function(){return new Promise(function(r){setTimeout(r,30);});},r=[];
  var kurz=JSON.parse(JSON.stringify(DEFAULT_WORK_HOURS));kurz.mo={von:'08:30',bis:'12:30',pause:0};
  EV_OK=true;employeeVerlauf={};employeeVerlauf[String(e.id)]={workHours:[{ab:'2026-01-01',wert:null},{ab:'2026-11-02',wert:kurz}]};
  r.push(workHoursForDate(e,'2025-12-29'),workHoursForDate(e,'2026-10-26'),workHoursForDate(e,'2026-11-09'));
  employeeVerlauf={};e.workHours=null;e.startDate='2026-01-01';openEmpSetModal('e1');document.getElementById('es-wh-mo-bis').value='12:30';document.getElementById('es-wh-ab').value='2026-11-02';saveEmpEinstellungen();await w();
  var L=(employeeVerlauf[String(e.id)]||{}).workHours||[];r.push(L.map(function(x){return x.ab;}).join('+'),workHoursForDate(e,'2026-10-26'),workHoursForDate(e,'2026-11-09'));
  closeEmpSetModal();employeeVerlauf=svV;EV_OK=svOk;e.workHours=svW;e.hours=svH;e.startDate=svS;return r.join('/');})()`);
check('Arbeitszeit: Änderung gilt erst ab „gültig ab“, Vormonate rechnen mit alter Zeit (C4)', c4 === '9/9/4/2026-01-01+2026-11-02/9/3.5', c4);
const c4b = await page.evaluate(`(async function(){var e=kalEmp('e1'),sv=sb,svV=employeeVerlauf,svOk=EV_OK,svW=e.workHours,svH=e.hours,cf=window.confirm,log=[],w=function(){return new Promise(function(r){setTimeout(r,40);});},r=[];
  function ch(t){var o={t:t,op:'select'};var c={};['select','eq','order','range'].forEach(function(k){c[k]=function(){return c;};});['update','insert','upsert','delete'].forEach(function(k){c[k]=function(){o.op=k;return c;};});
    c.then=function(a,b){log.push(o.t+':'+o.op);return Promise.resolve({data:o.op==='delete'?[{}]:[],error:null}).then(a,b);};return c;}
  var kurz=JSON.parse(JSON.stringify(DEFAULT_WORK_HOURS));kurz.mo={von:'08:30',bis:'12:30',pause:0};
  EV_OK=true;employeeVerlauf={};employeeVerlauf[String(e.id)]={workHours:[{ab:'2025-05-01',wert:null,von:'Startwert (SQL 51)'},{ab:'2025-12-01',wert:kurz,von:'Test'},{ab:'2026-11-01',wert:kurz,von:'Test'}]};e.workHours=kurz;
  sb={from:ch};window.confirm=function(){return true;};openEmpSetModal('e1');
  var t=document.getElementById('es-wh-verlauf');r.push(t.querySelectorAll('tbody tr').length+'z'+t.querySelectorAll('button').length+'b');
  esWhVerlaufDel(String(e.id),'2025-12-01');await w();r.push(employeeVerlauf[String(e.id)].workHours.map(function(x){return x.ab;}).join('+'),log.join(','));
  log=[];esWhVerlaufDel(String(e.id),'2026-11-01');await w();r.push(employeeVerlauf[String(e.id)].workHours.length+'/'+(e.workHours===null)+'/'+log.join(','),document.getElementById('es-wh-verlauf').querySelectorAll('button').length);
  esWhVerlaufDel(String(e.id),'2025-05-01');await w();r.push(employeeVerlauf[String(e.id)].workHours.length);
  closeEmpSetModal();sb=sv;window.confirm=cf;employeeVerlauf=svV;EV_OK=svOk;e.workHours=svW;e.hours=svH;return r.join(' | ');})()`);
check('Arbeitszeit: Verlaufstabelle, Version löschen, erste nicht löschbar (C4)', c4b === '3z2b | 2025-05-01+2026-11-01 | employee_verlauf:delete,employee_history:insert,employee_history:select | 1/true/employee_verlauf:delete,employee_history:insert,employees:update,employee_history:select | 0 | 1', c4b);
const c8 = await page.evaluate(`(async function(){var sv=sb,svR=reviews.e1,cf=window.confirm,log=[],day=null,w=function(){return new Promise(function(r){setTimeout(r,40);});};
  function ch(t){var o={t:t,op:'select',args:[]};var c={};['select','eq','in','order','limit','single','maybeSingle'].forEach(function(k){c[k]=function(){if(k==='eq'||k==='in')o.args.push([].slice.call(arguments));return c;};});
    ['update','insert','upsert','delete'].forEach(function(k){c[k]=function(){o.op=k;return c;};});
    c.then=function(r,j){log.push(o.t+':'+o.op+(o.op==='delete'?':'+JSON.stringify(o.args[0][1]):''));var d=o.op==='select'?(day||[]):o.op==='update'?{id:o.args[0][1]}:o.op==='insert'?{id:'neu'}:null;return Promise.resolve({data:d,error:null}).then(r,j);};return c;}
  var t=today(),d1=addDaysUTC(t,-20),d2=addDaysUTC(t,-10),base={opener:5,einwand:5,note:''};
  reviews.e1=[Object.assign({id:'r1',date:d1},base),Object.assign({id:'r2',date:d2},base)];sb={from:ch};var r=[];
  openCoachingEval('e1','r1');document.getElementById('cev-date').value=addDaysUTC(t,-15);day=[];saveCoachEval('e1','r1');await w();
  r.push(reviews.e1.filter(function(x){return x.id==='r1';}).length+'x'+reviews.e1.find(function(x){return x.id==='r1';}).date.slice(5)+'/'+reviews.e1.length);
  log=[];window.confirm=function(){return false;};document.getElementById('cev-date').value=d2;day=[{id:'r2'}];saveCoachEval('e1',null);await w();r.push(log.join(','));
  log=[];window.confirm=function(){return true;};saveCoachEval('e1',null);await w();r.push(log.filter(function(x){return /reviews:(update|insert)/.test(x);}).join(','));
  window.confirm=cf;sb=sv;reviews.e1=svR;var m=document.getElementById('cevModal');if(m)m.remove();try{puResetAll();}catch(x){}
  return {r:r,soll:'1x'+addDaysUTC(t,-15).slice(5)+'/2'};})()`);
const c12 = await page.evaluate(`(async function(){var sv=sb,svC=settings.liveConfig,out=null,db={crOEM:20,feiern:{a:1,b:2},zeitplan:{x:1}};
  sb={from:function(){var c={},up=null;['select','eq'].forEach(function(k){c[k]=function(){return c;};});c.maybeSingle=function(){return Promise.resolve({data:{value:JSON.stringify(db)},error:null});};
    c.upsert=function(row){out=JSON.parse(row.value);return Promise.resolve({error:null});};return c;}};
  settings.liveConfig={crOEM:20,feiern:{a:1,b:1}};await new Promise(function(r){liveCfgSave({crOEM:25,feiern:{a:0,b:1}},r);});
  var res=JSON.stringify(out),loc=JSON.stringify(settings.liveConfig);sb=sv;settings.liveConfig=svC;return res+'|'+loc;})()`);
check('Live-Einstellungen: nur Geändertes auf frischen Stand schreiben', c12 === '{"crOEM":25,"feiern":{"a":0,"b":2},"zeitplan":{"x":1}}|{"crOEM":25,"feiern":{"a":0,"b":2},"zeitplan":{"x":1}}', c12);
check('Entwicklung: Datum ändern ersetzt, zweite am Tag nur nach Rückfrage', c8.r[0] === c8.soll && c8.r[1] === 'reviews:select' && c8.r[2] === 'reviews:update', JSON.stringify(c8.r));
const zt = await page.evaluate(`(function(){var mk=today().slice(0,7);var nx=kalI(new Date(+mk.slice(0,4),+mk.slice(5,7),1)).slice(0,7);var e=employees[0];
  zielStore[nx]=zielStore[nx]||{};zielStore[nx][e.id]={optTag:20,margeOpt:50,weeks:[1,1,1,1,1]};
  var calOld=ZT_KAL_START;ZT_KAL_START=nx;var x=ztEmpMonth(e,nx);var wd=0;ztDaysOfMonth(nx).forEach(function(d){if(kalWorkday(e,d)&&!(kalOn(e.id,d)&&kalOn(e.id,d).art!=='krank'))wd++;});
  var os=ztOS(e,nx);wiegandView='ziel';view='team';ZT.open['m'+nx]=true;var html=zielTreeHtml();ZT_KAL_START=calOld;
  return {tage:x.tage,wd:wd,ziel:x.ziel===x.tage*20*50,os:os.sum>=0,html:/zt-t/.test(html)&&/Jahresergebnis/.test(html)};})()`);
check('Zielvereinbarung: Einsatztage aus dem Kalender', zt.tage === zt.wd, zt.tage + '/' + zt.wd);
check('Zielvereinbarung: Ziel = Tage × Opt./Tag × Marge/Opt.', zt.ziel);
check('Zielvereinbarung: Tabelle Jahr/Monat/Mitarbeiter', zt.html && zt.os);
const zw = await page.evaluate(`(function(){ZT.zv='w';var h=zielTreeHtml();ZT.zv='m';return {ok:/KW \\d+/.test(h)&&/Jahr \\d{4}/.test(h),leer:/01\\.11\\.–30\\.10\\./.test(h)};})()`);
check('Zielvereinbarung: Wochenansicht', zw.ok && !zw.leer);
check('Zielvereinbarung: keine alte Ansicht ohne Monatssperre mehr', await page.evaluate("typeof zielvereinbarungHtml==='undefined'&&typeof saveZielvereinbarung==='undefined'&&!/alte Ansicht/.test(zielTreeHtml())"));
const au = await page.evaluate(`(function(){AU.view='k';selectAufgaben();var n=document.querySelectorAll('#mainArea .au-col').length,L=aufgAll(),k=L.length?L[0].key:null;if(k){var to=aufgStaff()[aufgStaff().length-1].key;aufgAssign(k,to);}var moved=k?aufgAll().find(function(o){return o.key===k;}).assignee===aufgStaff()[aufgStaff().length-1].key:true;AU.view='l';renderAufgaben();var list=!!document.querySelector('#mainArea .au-mine');AU.view='k';view='kalender';return {n:n,moved:moved,list:list};})()`);
check('Aufgaben: Kanban mit Spalten je Person', au.n >= 1, au.n);
check('Aufgaben: Neu zuweisen', au.moved);
check('Aufgaben: Liste mit „Meine Aufgaben“', au.list);
check('Coaching: zeigt den neuen Kalender', kalF.coach);
check('Kalender: Filter blendet Flex Days aus', kalF.vor > 0 && kalF.nach === 0, kalF.vor + '→' + kalF.nach);
await step("kalOpenForm('e1')"); await step("kalCloseForm()"); await step("KAL.open='e1';renderKalender()");

// D6: Rolle wie in der Datenbank – app_users zuerst, Mail ohne Groß-/Kleinschreibung
const d6 = await page.evaluate(`(async function(){
  var keep={r:currentUserRole,c:currentCoach,f:coachFilterView,au:appUsers,gu:sb.auth.getUser,e0:employees[0].auth_user_id};
  var res={};
  sb.auth.getUser=function(){return Promise.resolve({data:{user:{id:'u1',email:'Chef@Firma.de'}}});};
  employees[0].auth_user_id='u1';employees[0].boardRole='coach';
  appUsers=[{id:'a1',authUserId:null,email:'chef@firma.de',name:'Chef',role:'admin'}];
  await resolveCurrentCoach(); res.beide=currentUserRole;
  appUsers=[];await resolveCurrentCoach(); res.nurMa=currentUserRole;
  employees[0].auth_user_id=keep.e0;delete employees[0].boardRole;
  appUsers=[{id:'a2',authUserId:null,email:'leser@firma.de',name:'Leser',role:'viewer'}];
  sb.auth.getUser=function(){return Promise.resolve({data:{user:{id:'u9',email:'LESER@firma.de'}}});};
  await resolveCurrentCoach(); res.gross=currentUserRole; res.name=resolveNonEmployeeName('Leser@Firma.de');
  sb.auth.getUser=keep.gu;appUsers=keep.au;currentUserRole=keep.r;currentCoach=keep.c;coachFilterView=keep.f;
  return res;})()`);
check('D6: Benutzerliste vor Mitarbeiterliste (wie Datenbank)', d6.beide === 'admin' && d6.nurMa === 'coach', d6.beide + '/' + d6.nurMa);
check('D6: Mail ohne Groß-/Kleinschreibung', d6.gross === 'viewer' && d6.name === 'Leser', d6.gross + '/' + d6.name);
// D5: fehlgeschlagener Ladevorgang → Meldung, Nachladen per Knopf, Meldung verschwindet
const d5 = await page.evaluate(`(async function(){
  var orig=loadPerformanceFromSupabase,res={};
  res.fehl=await startLoad('Test',function(){return Promise.reject(new Error('Netz'));});
  res.falsch=await startLoad('Test',function(){return Promise.resolve(false);});
  res.ok=await startLoad('Test',function(){return Promise.resolve(true);});
  window.loadPerformanceFromSupabase=function(){return Promise.resolve(false);};
  startRetryData(['Leistungsdaten'],1);
  var t=document.getElementById('startRetry');res.zeigt=!!t&&/Leistungsdaten nicht geladen/.test(t.textContent)&&/Versuch 1 von 3/.test(t.textContent);
  window.loadPerformanceFromSupabase=function(){return Promise.resolve(true);};
  t.querySelector('button').click(); await new Promise(function(r){setTimeout(r,300);});
  res.weg=!document.getElementById('startRetry');
  startRetryData(['Leistungsdaten'],4); res.ende=/Seite neu laden/.test(document.getElementById('startRetry').textContent);
  startRetryHide(); window.loadPerformanceFromSupabase=orig;
  return res;})()`);
check('D5: Startlader meldet Fehler statt abzubrechen', d5.fehl === 'Test' && d5.falsch === 'Test' && d5.ok === null);
check('D5: Meldung mit automatischem Nachladen', d5.zeigt && d5.weg, JSON.stringify(d5));
check('D5: nach 3 Versuchen „Seite neu laden“', d5.ende);

{ const src = gesamtText(path.resolve(file));
  check('D7: Gesamtzeile nutzt Standard-Ziele, nicht die des ersten Mitarbeiters', /empT:empTargets\(\{\}\),hours:aggHours/.test(src) && !/empTargets\(selectedEmps\[0\]/.test(src)); }

check('D7: Tagesdatum in Ortszeit (kurz nach Mitternacht)', await page.evaluate("localYmd(new Date(2026,10,24,0,30))==='2026-11-24'&&localYmd(new Date('x'))===''"));

// B1: CR-Werte immer aus Rohzahlen (erst summieren, dann teilen) – Leistungszeilen haben keine CR-Felder
const b1 = await page.evaluate(`(async function(){var e=kalEmp('e1'),w=function(ms){return new Promise(function(r){setTimeout(r,ms||300);});},r={},svP=protocols.e1,svG=goals.e1,svM=empChartMetric,svT=employees.map(function(x){return x.team;});
  function S(rows,k){var s=0;rows.forEach(function(x){s+=x[k]||0;});return s;}
  function myCr(rows){var q=S(rows,'convYes')+S(rows,'convSY')+S(rows,'convMY');return q>0?S(rows,'convMY')/q*100:null;}
  var peers=employees.filter(function(x){return x.role===e.role&&x.active!==false;}),pool=[];peers.forEach(function(x){pool=pool.concat(getPerf(x.id,30));});
  r.bench=Math.abs(roleBenchmark('e1','crMegaYes',30)-myCr(pool))<1e-9;
  r.best=personalBestEvents('e1').some(function(x){return /Bestwert CR OEM/.test(x.label);});
  r.meil=kpiMilestones('e1').length>0;
  var d=addDaysUTC(today(),-20);protocols.e1=[{date:d,status:'abgeschlossen',focusMetric:'crMegaYes',type:'Coaching'}];
  goals.e1=[{id:'g1',metricKey:'crMegaYes',targetValue:30,status:'offen',createdAt:addDaysUTC(today(),-40)}];
  employees.forEach(function(x){x.team=x.role;});empChartMetric='crMegaYes';
  selectEmp('e1');switchTab('coaching-eval');await w(100);
  var soll=myCr(getPerf('e1',30));r.ziel=(document.getElementById('tabContent').textContent.match(/Aktuell \\(Ø 30 Tage\\): ([0-9,]+) %/)||[])[1]===(Math.round(soll*10)/10).toString().replace('.',',');
  switchTab('performance');await w(400);
  var vor=(performance.e1||[]).filter(function(p){return p.date<d;}).sort(function(x,y){return y.date.localeCompare(x.date);}).slice(0,3); // 3 Arbeitstage wie Historie
  r.impact=(document.getElementById('coachImpactPanel').textContent.indexOf('Ø vorher'+myCr(vor).toFixed(1))>=0);
  var ds=activeChart&&activeChart.data.datasets.find(function(x){return x.label==='Durch. Team';}),te=employees.filter(function(x){return x.team===e.team&&x.id!=='e1'&&x.active!==false;});
  var lastIdx=ds?ds.data.map(function(v,i){return v!=null?i:-1;}).filter(function(i){return i>=0;}).pop():-1,pp=buildChartPeriods(empChartGroup,+today().slice(0,4))[lastIdx];
  var tr=[];if(pp)te.forEach(function(x){tr=tr.concat((performance[x.id]||[]).filter(function(p){return p.date>=pp.from&&p.date<=pp.to;}));});
  r.team=!!ds&&lastIdx>=0&&ds.data[lastIdx]===+myCr(tr).toFixed(1);
  protocols.e1=svP;goals.e1=svG;empChartMetric=svM;employees.forEach(function(x,i){x.team=svT[i];});selectWiegandSub('overview');
  return r;})()`);
check('B1: CR aus Rohzahlen (Benchmark, Bestwert, Meilenstein, Ziel, Impact, Team-Linie)', Object.values(b1).every(Boolean), JSON.stringify(b1));

// B2: Diagramm-Auswahl „Onboarding“ ohne VLC
const b2 = await page.evaluate(`(function(){var v=employees.find(function(e){return e.role==='VLC';}),sv=v.phase;v.phase='Onboarding';
  selectWiegandSub('overview');setOverviewChartMetric('margeGesamt');setOverviewChartEmp('group:Onboarding');
  var d=window._overviewChartData.datasets[0].data,i=d.map(function(x,j){return x!=null?j:-1;}).filter(function(j){return j>=0;}).pop(),w=buildChartPeriods(overviewChartGroup,+today().slice(0,4))[i];
  var ob=employees.filter(function(e){return e.phase==='Onboarding'&&e.role!=='VLC';}),soll=chartSumsForRange(ob,w.from,w.to).margeGes;
  var ist=d[i];v.phase=sv;setOverviewChartEmp('');return ist===soll?'ok':ist+'≠'+soll;})()`);
check('B2: Diagramm „Onboarding“ ohne VLC', b2 === 'ok', b2);
// B3: Warnungen am persönlichen Ziel, nicht am Team-Durchschnitt
const b3 = await page.evaluate(`(function(){var sv=window.empTargets,kv=KPI_TARGETS.crOEM.val,r=[];
  KPI_TARGETS.crOEM.val=0;window.empTargets=function(){return {crOEM:{val:100,dir:'gte'}};};
  r.push(checkAlerts('e1').filter(function(a){return a.key==='CR OEM'&&a.ziel==='100%';}).length);
  KPI_TARGETS.crOEM.val=100;window.empTargets=function(){return {crOEM:{val:null,dir:'gte'}};};
  r.push(checkAlerts('e1').filter(function(a){return a.key==='CR OEM';}).length);
  window.empTargets=sv;KPI_TARGETS.crOEM.val=kv;return r.join('/');})()`);
check('B3: Warnung nach persönlichem Ziel (leer = keine Prüfung)', b3 === '1/0', b3);
// B4: Ersatzwert Opt./Std. 3,5 und CR TW aus dem Team-Ziel crTeilweise
const b4 = await page.evaluate(`(function(){var sv=KPI_TARGETS,r=[];KPI_TARGETS={};r.push(empTargets({}).optPerH.val);
  KPI_TARGETS={crTeilweise:{val:33,dir:'lte'}};r.push(empTargets({}).crTeilweise.val);KPI_TARGETS=sv;return r.join('/');})()`);
check('B4: Opt./Std.-Ersatzwert 3,5, CR TW aus Team-Ziel', b4 === '3.5/33', b4);
// B5: Wochenziel-Kachel einer KW über den Monatswechsel = Soll beider Monatsanteile
const b5 = await page.evaluate(`(function(){var cur=today().slice(0,7),d=new Date(cur+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);var prev=d.toISOString().slice(0,7);
  var wm=null;[prev,cur].forEach(function(mk){getMonthWeeksZiel(mk).forEach(function(w){if(!wm&&w.from.slice(0,7)!==w.to.slice(0,7)&&(w.from.slice(0,7)===mk))wm=w;});});
  if(!wm)return 'keine Monatswechsel-KW';
  function part(mk){var wi=-1;getMonthWeeksZiel(mk).forEach(function(w,i){if(w.from===wm.from)wi=i;});if(wi<0)return 0;var z=0;
    employees.filter(function(e){return empActiveInZielMonth(e,mk)&&!e.isPureCoach;}).forEach(function(e){var r=(zielStore[mk]||{})[e.id]||{},n=getMonthWeeksZiel(mk)[wi].defaultDays;var x=ztEmpMonth(e,mk);if(x.weeks[wi])n=x.weeks[wi].n;z+=n*(r.optTag||0)*(r.margeOpt||0);});return z;}
  var soll=Math.round(part(wm.from.slice(0,7))+part(wm.to.slice(0,7))).toLocaleString('de-DE');
  var h=wochenzielKachelnHtml(),m=h.match(new RegExp('KW '+wm.kw+'[^€]*?€[^€]*?Ziel: € ([0-9.]+)'))||h.match(new RegExp('KW '+wm.kw+'[\\\\s\\\\S]*?Ziel: € ([0-9.]+)'));
  return m&&m[1]===soll?'ok':(m?m[1]:'?')+'≠'+soll;})()`);
check('B5: Wochenziel über den Monatswechsel zählt beide Monatsanteile', b5 === 'ok' || b5 === 'keine Monatswechsel-KW', b5);
// B6: ohne Zielvereinbarung NL-Ziel anteilig nach Arbeitsstunden auf die Teams
const b6 = await page.evaluate(`(function(){var mk=(+today().slice(0,4)+1)+'-03',svZ=zielStore[mk],svN=zielNlTargets[mk];zielStore[mk]={};zielNlTargets[mk]=100000;_dshPlanCache={};
  function sum(L){var p=dshPlanMonth(L,mk).days,s=0;Object.keys(p).forEach(function(d){s+=p[d];});return s;}
  var all=sum(dshAll()),teams=DSH_TEAMS.reduce(function(a,t){return a+sum(dshTeam(t));},0),se=sum(dshTeam('SE'));
  zielStore[mk]=svZ;if(svN===undefined)delete zielNlTargets[mk];else zielNlTargets[mk]=svN;_dshPlanCache={};
  return Math.round(all)+'/'+Math.round(teams)+'/'+(se>0&&se<all);})()`);
check('B6: NL-Ziel anteilig auf Teams (Summe = NL-Ziel)', b6 === '100000/100000/true', b6);

// B8: alte QA-Bewertung (vor 11.11.) wird in den alten Kategorien aufgeschlüsselt (Historie + Netzdiagramm)
const b8 = await page.evaluate(`(async function(){var sv=callRatings.e1;window._selCallId=null;
  callRatings.e1=[{id:'q1',date:'2026-10-01',status:'ja',scores:{intro:3,umgang:4,vertrauen:3,potenzial:2,kaufsignale:4,klarheit:3}}];
  selectEmp('e1');switchTab('call-performance');await new Promise(function(r){setTimeout(r,400);});
  var t=document.getElementById('tabContent').textContent,c=document.getElementById('callRadar'),n=c&&c._ci?c._ci.data.labels.length:-1;
  callRatings.e1=sv;selectWiegandSub('overview');return /Einwandsentkräftung\\s*35 %/.test(t)+'/'+n;})()`);
check('B8: alte QA-Bewertung in alten Kategorien', b8 === 'true/7', b8);
// B9: überfällige geplante Session zählt nicht als abgeschlossen
const b9 = await page.evaluate(`(function(){var sv=protocols.e1;
  protocols.e1=[{id:'p1',date:addDaysUTC(today(),-3),status:'geplant',topics:['Einwand']},{id:'p2',date:addDaysUTC(today(),-10),status:'abgeschlossen'}];
  selectEmp('e1');switchTab('session');var t=document.getElementById('tabContent').textContent;
  protocols.e1=sv;selectWiegandSub('overview');var m=t.match(/· (\\d+) abgeschlossene Sessions/);return m?m[1]:'?';})()`);
check('B9: überfällige geplante Session zählt nicht als abgeschlossen', b9 === '1', b9);
{ const ext = fs.readFileSync(path.join(here, '..', 'extension', 'data.js'), 'utf8');
  check('B10: Erweiterung erkennt SDC als Coach', /ownRow\.role === 'SDC'/.test(ext) && /e\.role !== 'SDC'/.test(ext)); }

{ const py = fs.readFileSync(path.join(here, '..', 'scripts', 'sync_user_activity.py'), 'utf8');
  check('B12: Sync ordnet doppelte Namen nicht still zu (aktive bevorzugt, sonst mehrdeutig)', /"select": "id,name,active"/.test(py) && /if emp_id == AMBIGUOUS:/.test(py) && !/by_name = \{normalize_name\(row\["name"\]\): row\["id"\] for row in rows\}/.test(py)); }

// QA: alte Bewertung im Formular mit den alten Punkten bearbeiten (nichts geht beim Speichern verloren)
const qaf = await page.evaluate(`(function(){var sv=callRatings.e1;callRatings.e1=[{id:'q9',date:'2026-10-01',status:'ja',scores:{umgang:4,vertrauen:3,potenzial:2,kaufsignale:4,klarheit:3,intro:3}}];
  selectEmp('e1');openQaBewertungModal('e1','q9');var r=[Object.keys(_cbScores).sort().join(','),!!document.getElementById('qas_umgang')];
  openQaBewertungModal('e1');r.push(!document.getElementById('qas_umgang')&&!!document.getElementById('qas_produktnutzen'));
  closeModal('qaBewertungModal');callRatings.e1=sv;selectWiegandSub('overview');return r.join('/');})()`);
check('QA: alte Bewertung behält beim Bearbeiten ihre alten Punkte', qaf === 'intro,kaufsignale,klarheit,potenzial,umgang,vertrauen/true/true', qaf);

// Provisionsvereinbarung in der Mitarbeiterkarte: Coach sieht sie nur bei Sales Agents und SDL, Admin immer
const pvc = await page.evaluate(`(function(){var sv=currentUserRole,e=employees[0],svR=e.role,r=[];
  function hat(rolle,role){currentUserRole=rolle;e.role=role;return /id="esSec4"/.test(esBuildHtml(e,'panels','')||'')&&/id="esSec1"/.test(esBuildHtml(e,'panels','')||'');}
  var svC=currentCoach;
  try{r=[hat('admin','SDC'),hat('coach','SDC'),hat('coach','SDM'),hat('coach','SE'),hat('coach','SDL'),hat('viewer','SDC')];currentCoach=e;r.push(hat('coach','SDC'));}
  finally{currentUserRole=sv;e.role=svR;currentCoach=svC;}return r.join('/');})()`);
check('Provisionsvereinbarung: Coach/Betrachter nur bei Sales Agents und SDL, eigene immer', pvc === 'true/false/false/true/true/false/true', pvc);

// Soll „bisher gearbeitet“: beim Nachladen wird auch die Abgleich-Zeit neu gelesen (sonst bleibt das Soll auf dem Stand vom Seitenstart)
const fls = await page.evaluate(`(async function(){var o=sb.from,sv=settings.ftpLastSync;settings.ftpLastSync='2026-01-01T08:00:00Z';
  sb.from=function(t){if(t==='settings')return {select:function(){return {eq:function(){return Promise.resolve({data:[{value:'2026-11-24T15:20:00Z'}],error:null});}};}};return o.apply(this,arguments);};
  try{await ftpLastSyncNachladen();return settings.ftpLastSync;}finally{sb.from=o;settings.ftpLastSync=sv;}})()`);
{ const src = gesamtText(path.resolve(file));
  check('Soll heute: Nachladen holt auch die Abgleich-Zeit', fls === '2026-11-24T15:20:00Z' && /Promise\.all\(\[page\(0\),ftpLastSyncNachladen\(\)\]\)/.test(src) && /_perfTodayT=Date\.now\(\);ftpLastSyncNachladen\(\);/.test(src), fls); }

check('Chart.js mit Prüfsumme geladen', await page.evaluate("typeof Chart==='function'"));
check('Keine Skriptfehler', errors.length === 0, errors.slice(0, 5).join(' | '));

// Aufteilung in Dateien: Netz-Tests (nur wenn das Board aus mehreren lokalen Skriptdateien besteht)
const dateien = quellen(path.resolve(file)).filter(q => !q.datei.includes('(inline)')).map(q => q.datei);
if (dateien.includes('js/start.js')) {
  // angemeldete Sitzung, damit der Start (initAppAfterLogin → alle Lader) wirklich läuft
  const MOCK_ANGEMELDET = MOCK.replace('getSession:function(){return Promise.resolve({data:{session:null}});}',
    "getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'t@example.org',last_sign_in_at:new Date().toISOString()}}}});}");
  async function laden(behandle) {
    const pg = await browser.newPage(); const fe = [];
    pg.on('pageerror', e => fe.push(String(e.message || e)));
    await pg.route('**/*', async r => {
      const u = r.request().url();
      if (u.includes('supabase')) return r.fulfill({ body: '/*supabase-stub*/', contentType: 'application/javascript' });
      if (/chart(\.umd)?(\.min)?\.js/i.test(u)) return r.fulfill({ body: fs.readFileSync(path.join(here, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'), 'utf8'), contentType: 'application/javascript' });
      if (u.startsWith('file:') && /\.js(\?|$)/.test(u)) return behandle(r, u);
      if (u.startsWith('file:') || u.startsWith('blob:') || u.includes('cdnjs') || u.includes('jsdelivr')) return r.continue();
      return r.fulfill({ body: '', status: 200 });
    });
    await pg.addInitScript(MOCK_ANGEMELDET);
    await pg.goto('file://' + path.resolve(file));
    await pg.waitForTimeout(2500);
    const st = await pg.evaluate("({gestartet:typeof _appInitStarted!=='undefined'&&_appInitStarted===true,retry:!!document.getElementById('startRetry'),waechter:!!document.getElementById('sosLadeFehler')})");
    await pg.close(); return { ...st, fe };
  }
  // Verzögerung: jede Skriptdatei kommt 300–800 ms verspätet, die Datenbank antwortet sofort
  let n = 0;
  const v = await laden((r) => new Promise(ok => setTimeout(() => ok(r.continue()), 300 + (n++ * 137) % 500)));
  check('Aufteilung: Start mit verzögerten Skriptdateien ohne Fehler', v.gestartet && !v.retry && !v.waechter && v.fe.length === 0, JSON.stringify(v));
  // Ausfall: fehlt eine Datei, zeigt der Wächter den Hinweis und das Board startet nicht halb
  if (fs.readFileSync(path.join(path.dirname(path.resolve(file)), 'js', 'start.js'), 'utf8').includes('sosLadeFehler')) {
    const schlecht = [];
    for (const d of dateien.filter(x => x !== 'js/start.js')) {
      const a = await laden((r, u) => u.includes('/' + d) ? r.abort() : r.continue());
      if (!(a.waechter && !a.gestartet)) schlecht.push(d + ' ' + JSON.stringify(a));
    }
    check(`Aufteilung: Wächter meldet jede fehlende Datei (${dateien.length - 1} geprüft)`, schlecht.length === 0, schlecht.join(' | '));
  }
}
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed ? 1 : 0);
