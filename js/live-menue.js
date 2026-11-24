// Sales OS – Live-Menü: Live-Ansicht, Power Hour, Figuren-Auswahl, Zeitplan
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function liveCfg(){var c=settings.liveConfig||{};return {crOEM:c.crOEM!=null&&c.crOEM!==''?+c.crOEM:55,crMY:c.crMY!=null&&c.crMY!==''?+c.crMY:20,optProStd:c.optProStd?+c.optProStd:3.5,knappOEM:c.knappOEM!=null&&c.knappOEM!==''?+c.knappOEM:5,knappMY:c.knappMY!=null&&c.knappMY!==''?+c.knappMY:3};}
function liveBase(){return location.href.split('#')[0].split('?')[0].replace(/index\.html$/,'').replace(/\/?$/,'/')+'live.html';}
function liveUrl(embed){var k=settings.liveKey||'';if(!k)return '';return liveBase()+'?k='+encodeURIComponent(k)+(LIVE.ort?'&s='+LIVE.ort:'')+(embed?'&embed=1':'');}
function liveSetOrt(o){LIVE.ort=o;LIVE.msg='';renderLive();}
function liveCopy(){var u=liveUrl(false);if(!u)return;var done=function(){LIVE.msg='Adresse kopiert.';renderLive();};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(done,function(){var i=document.getElementById('liveUrlField');if(i){i.select();document.execCommand('copy');done();}});
  else{var i=document.getElementById('liveUrlField');if(i){i.select();document.execCommand('copy');done();}}}
function liveOpen(){var u=liveUrl(false);if(u)window.open(u,'_blank','noopener');}
function liveNewKey(){if(currentUserRole!=='admin')return;
  if(settings.liveKey&&!confirm('Neue Adresse erzeugen?\n\nDie bisherige Adresse funktioniert danach auf keinem Fernseher mehr. Du musst dort die neue Adresse öffnen.'))return;
  var a=new Uint8Array(18);crypto.getRandomValues(a);var k=Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
  sb.from('settings').upsert({key:'liveKey',value:k},{onConflict:'key'}).then(function(res){
    if(res&&res.error){alert('Speichern fehlgeschlagen: '+res.error.message);return;}
    settings.liveKey=k;LIVE.msg='Neue Adresse erzeugt. Bitte auf den Fernsehern neu öffnen.';
    if(typeof logActivity==='function'){try{logActivity('employee','updated','Live-Ansicht: neue Adresse erzeugt');}catch(e){}}
    renderLive();});}
// C12: liveConfig nie blind überschreiben – nur geänderte Schlüssel (bei Objekten je Unterschlüssel) auf den frisch geladenen Stand setzen
function liveCfgDiff(base,next){base=base||{};var p={},J=JSON.stringify,isO=function(v){return v&&typeof v==='object'&&!Array.isArray(v);};
  Object.keys(next||{}).forEach(function(k){var a=base[k],b=next[k];if(J(a)===J(b))return;
    if(isO(a)&&isO(b)){var sub={},del=[];Object.keys(b).forEach(function(j){if(J(a[j])!==J(b[j]))sub[j]=b[j];});Object.keys(a).forEach(function(j){if(!(j in b))del.push(j);});p[k]={sub:sub,del:del};}else p[k]={v:b};});return p;}
function liveCfgApply(cur,p){var c=Object.assign({},cur||{});Object.keys(p).forEach(function(k){var x=p[k];if(x.sub){var o=Object.assign({},(c[k]&&typeof c[k]==='object'&&!Array.isArray(c[k]))?c[k]:{},x.sub);x.del.forEach(function(j){delete o[j];});c[k]=o;}else c[k]=x.v;});return c;}
function liveCfgSave(next,cb){var p=liveCfgDiff(settings.liveConfig,next);if(!Object.keys(p).length){cb({error:null});return;}
  sb.from('settings').select('value').eq('key','liveConfig').maybeSingle().then(function(r){if(r&&r.error){cb(r);return;}
    var v=r&&r.data&&!Array.isArray(r.data)?r.data.value:null,cur={};try{cur=typeof v==='string'?(JSON.parse(v||'{}')||{}):(v||{});}catch(e){cur={};}
    var c=liveCfgApply(cur,p);return sb.from('settings').upsert({key:'liveConfig',value:JSON.stringify(c)},{onConflict:'key'}).then(function(res){if(!(res&&res.error))settings.liveConfig=c;cb(res||{error:null});});
  }).catch(function(err){cb({error:{message:(err&&err.message)||String(err)}});});}
function liveSaveCfg(){if(currentUserRole!=='admin')return;var g=function(id){var el=document.getElementById(id);return el?el.value.replace(',','.'):'';};
  var c={crOEM:g('liveCrOem'),crMY:g('liveCrMy'),knappOEM:g('liveKnOem'),knappMY:g('liveKnMy'),optProStd:g('liveOph')};
  Object.keys(c).forEach(function(k){c[k]=c[k]===''?null:+c[k];if(c[k]!=null&&isNaN(c[k]))c[k]=null;});c=Object.assign({},settings.liveConfig||{},c);
  liveCfgSave(c,function(res){
    if(res&&res.error){alert('Speichern fehlgeschlagen: '+res.error.message);return;}
    LIVE.msg='Einstellungen gespeichert. Die Fernseher übernehmen sie innerhalb einer Minute.';renderLive();});}
function liveTab(t){LIVE_TAB=t;renderLive();}
function liveTest(k){LIVE.test=k;LIVE.testN=(LIVE.testN||0)+1;var f=document.getElementById('liveFrame');if(f)f.src=liveUrl(true)+'&test='+encodeURIComponent(k)+'&r='+LIVE.testN;}
function liveTodayList(){var L=[],wd=new Date().getDay(),t=today();
  ZPB_ROWS.forEach(function(r){var z=zpbGet(r[0]);if(!z.on)return;if(z.wd!=null&&+z.wd!==wd)return;if(wd===0||wd===6)return;
    var test={dori:'dori12',woche:'woche',monat:'woche',top3:'top3',do:'donnerstag',fr:'freitag'}[r[0]];L.push({t:z.t,txt:r[1]+(z.bis?' bis '+z.bis:''),test:test});});
  (PHB.all||[]).filter(function(h){return h.datum===t;}).forEach(function(h){L.push({t:phbHM(h.start_zeit),txt:'Power Hour · '+PHB_KPI[h.kpi]+' bis '+phbHM(h.end_zeit),test:'intro'});});
  return L.sort(function(a,b){return a.t<b.t?-1:1;});}
function liveSettingsSave(){if(currentUserRole!=='admin')return;var g=function(id){var el=document.getElementById(id);return el?el.value.replace(',','.'):'';},n=function(id){var v=g(id);return v===''?null:+v;},cb=function(id){var el=document.getElementById(id);return !!(el&&el.checked);};
  var fo={};figPeople().forEach(function(e){var el=document.getElementById('set_fokus_'+e.id);fo[e.id]=el?el.value:figFokus(e);});
  var c=Object.assign({},settings.liveConfig||{},{crOEM:n('ls_fo'),knappOEM:n('ls_fok'),crMY:n('ls_my'),knappMY:n('ls_myk'),crTW:n('ls_tw'),knappTW:n('ls_twk'),crSM:n('ls_sm'),knappSM:n('ls_smk'),crAO:n('ls_ao'),knappAO:n('ls_aok'),optProStd:n('ls_oph'),fokus:fo,
    feiern:{aufstieg:cb('lf_auf'),ziel:cb('lf_ziel'),marge:cb('lf_marge'),margeSchwelle:n('lf_margeS')||2000,auftrag:cb('lf_auftrag'),auftragSchwelle:n('lf_auftragS')||500,team:cb('lf_team'),teamSchritt:n('lf_teamS')||100,zaehlen:cb('lf_zaehl'),kippen:cb('lf_kipp')},dori:{cameo:cb('ld_cameo')}});
  liveCfgSave(c,function(res){if(res&&res.error){alert('Speichern fehlgeschlagen: '+res.error.message);return;}LIVE.msg='Einstellungen gespeichert. Die Fernseher übernehmen sie innerhalb einer Minute.';renderLive();});}
function liveFokusSet(id,v){var el=document.getElementById('set_fokus_'+id);if(el)el.value=v;var g=document.getElementById('fk_'+id);if(g)g.querySelectorAll('button').forEach(function(x){x.className=x.textContent===v?'on':'';});}
function liveSettingsHtml(){var adm=currentUserRole==='admin',dis=adm?'':' disabled',c=settings.liveConfig||{},F=c.feiern||{},Dr=c.dori||{};
  var inp='height:32px;box-sizing:border-box;font-size:13px;padding:0 8px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);width:80px';
  var num=function(id,v,ph){return '<input type="number" step="any" id="'+id+'" value="'+(v==null?'':v)+'" placeholder="'+(ph||'')+'"'+dis+' style="'+inp+'">';};
  var on=function(v){return v!==false;};
  var cbx=function(id,v,l){return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;min-width:0"><input type="checkbox" id="'+id+'"'+(on(v)?' checked':'')+dis+' style="width:16px;height:16px;margin:0;flex-shrink:0"><span>'+l+'</span></label>';};
  var R='display:grid;grid-template-columns:1fr 80px 80px;gap:8px 14px;align-items:center;min-height:32px';
  var line=function(l,a,b){return '<div style="'+R+'"><span style="font-size:13px">'+l+'</span>'+(a||'<span></span>')+(b||'<span></span>')+'</div>';};
  var CARD='class="card card-static" style="margin:0;height:100%;box-sizing:border-box;display:flex;flex-direction:column"';
  var h='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span class="kal-note">Gilt für alle Fernseher · Änderungen kommen innerhalb einer Minute an</span>'+(adm?'<button class="btn btn-primary" type="button" onclick="liveSettingsSave()"><i class="ti ti-device-floppy"></i> Einstellungen speichern</button>':'')+'</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch;margin-bottom:16px">';
  h+='<div '+CARD+'><div class="card-title"><i class="ti ti-target"></i> Ziele und Farben</div><div class="kal-note" style="margin-bottom:12px">Es gelten die <b>persönlichen Ziele aus der Provisionsvereinbarung</b> (inkl. Onboarding). Die Ersatz-Ziele nur für Personen ohne eigene Vereinbarung. Ziele erscheinen nicht auf den Fernsehern.</div>'
    +'<div style="display:flex;flex-direction:column;gap:6px"><div style="'+R+'"><b style="font-size:11px;color:var(--text3)">KENNZAHL</b><b style="font-size:11px;color:var(--text3)">ERSATZ-ZIEL</b><b style="font-size:11px;color:var(--text3)">„KNAPP“</b></div>'
    +line('CR Fokus (%)',num('ls_fo',c.crOEM,'55'),num('ls_fok',c.knappOEM,'5'))+line('CR MY (%)',num('ls_my',c.crMY,'20'),num('ls_myk',c.knappMY,'3'))
    +line('CR TW (%, max.)',num('ls_tw',c.crTW,'25'),num('ls_twk',c.knappTW,'5'))+line('CR SY/MY (%)',num('ls_sm',c.crSM,'60'),num('ls_smk',c.knappSM,'5'))
    +line('Anteil OEM (%)',num('ls_ao',c.crAO,'–'),num('ls_aok',c.knappAO,'5'))+line('Opt. je Stunde (Soll-Linie)',num('ls_oph',c.optProStd,'3,5'))+'</div></div>';
  h+='<div '+CARD+'><div class="card-title"><i class="ti ti-confetti"></i> Feiern und Dori</div><div class="kal-note" style="margin-bottom:12px">was eine Animation auslöst · Schwellen in € bzw. Optimierungen</div>'
    +'<div style="display:flex;flex-direction:column;gap:6px">'
    +line(cbx('lf_auf',F.aufstieg,'Aufstieg im Ranking'))+line(cbx('lf_ziel',F.ziel,'Tages- / Wochen- / Monatsziel erreicht'))
    +line(cbx('lf_marge',F.marge,'Marge am Tag über'),num('lf_margeS',F.margeSchwelle,'2000'))+line(cbx('lf_auftrag',F.auftrag,'Top-Auftrag über'),num('lf_auftragS',F.auftragSchwelle,'500'))
    +line(cbx('lf_team',F.team,'Team-Meilenstein alle'),num('lf_teamS',F.teamSchritt,'100'))+line(cbx('lf_zaehl',F.zaehlen,'Zahlen im Banner zählen hoch'))
    +line(cbx('lf_kipp',F.kippen,'CR-Kästchen kippen bei Farbwechsel'))+line(cbx('ld_cameo',Dr.cameo,'Dori schaut in große Animationen rein'))+'</div></div>';
  h+='</div>';
  var P=figPeople();
  h+='<div class="card card-static" style="margin:0"><div class="card-title"><i class="ti ti-focus-2"></i> CR Fokus je Agent</div><div class="kal-note" style="margin-bottom:10px">welche CR in der Zeile „CR Fokus“ zählt</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px 18px">'
    +P.map(function(e){var f=figFokus(e);return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--border);min-width:0"><span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(e.name)+'</span><input type="hidden" id="set_fokus_'+e.id+'" value="'+f+'"><span class="dsh-seg" id="fk_'+e.id+'" style="height:28px;margin:0;flex-shrink:0">'+['OEM','UPS','WKA'].map(function(o){return '<button type="button" class="'+(o===f?'on':'')+'"'+(adm?' onclick="liveFokusSet(\''+e.id+'\',\''+o+'\')"':' disabled')+' style="padding:0 8px;font-size:11.5px">'+o+'</button>';}).join('')+'</span></div>';}).join('')
    +'</div></div>';
  return h;}
function renderLive(){var ma=document.getElementById('mainArea');if(!ma)return;setTimeout(liveZieleSync,500);if(!PHB.loaded)phbLoad();
  var adm=currentUserRole==='admin',k=settings.liveKey||'',u=liveUrl(false),c=settings.liveConfig||{};
  var TABS=[['uebersicht','Übersicht'],['zeitplan','Zeitplan'],['powerhour','Power Hour'],['figuren','Figuren'],['einstellungen','Einstellungen']];
  var last=settings.ftpLastSync?new Date(settings.ftpLastSync):null,ago=last?Math.round((Date.now()-last.getTime())/60000):null;
  var hint=function(txt,warn){return '<span style="height:34px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border-radius:10px;font-size:12.5px;white-space:nowrap;'+(warn?'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A':'background:#fff;border:1px solid #E4E0D6;color:var(--text2)')+'"><span style="width:8px;height:8px;border-radius:50%;background:'+(warn?'#F08566':'#3a3833')+'"></span>'+txt+'</span>';};
  var hints=hint('Daten '+(ago==null?'unbekannt':ago<60?'vor '+ago+' Min.':last.toLocaleDateString('de-DE')),ago==null||ago>30)+hint('Ziele '+(c.zieleStand===today()?'aktuell':'nicht übergeben'),c.zieleStand!==today());
  var h='<div style="padding:22px 24px 8px;flex-shrink:0"><div style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:16px;padding:16px;box-shadow:0 12px 30px rgba(40,32,15,0.06)">'
    +'<div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;border-radius:11px;background:#EFECE5;border:1px solid #E4E0D6;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;color:var(--text)"><i class="ti ti-device-tv"></i></div>'
    +'<div style="min-width:0"><div style="font-size:18px;font-weight:800;line-height:1.2">Live</div><div style="font-size:12.5px;color:var(--text2);line-height:1.3">Was auf den Fernsehern läuft · Vorschau, Zeitplan, Power Hours und Figuren</div></div></div>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-top:14px"><div class="emp-seg" id="liveTabBar">'+TABS.map(function(t){return '<div class="tab'+(t[0]===LIVE_TAB?' active':'')+'" onclick="liveTab(\''+t[0]+'\')">'+t[1]+'</div>';}).join('')+'</div><span style="margin-left:auto;display:flex;gap:6px">'+hints+'</span></div></div></div>'
    +'<div class="content" style="max-width:100%;padding-top:6px">';
  if(LIVE.msg)h+='<div class="kal-note" style="margin:0 0 10px;color:var(--text)"><i class="ti ti-check"></i> '+esc(LIVE.msg)+'</div>';
  if(LIVE_TAB==='uebersicht'){
    h+='<div class="card card-static"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><div class="card-title" style="margin:0"><i class="ti ti-device-tv"></i> Vorschau</div><span class="kal-note">genau wie auf dem Fernseher · aktualisiert sich jede Minute</span>'
      +'<span style="margin-left:auto;display:flex;gap:8px;align-items:center"><span class="dsh-seg">'+[['','Alle'],['MUC','Olching'],['VLC','Valencia']].map(function(o){return '<button type="button" class="'+(LIVE.ort===o[0]?'on':'')+'" onclick="liveSetOrt(\''+o[0]+'\')">'+o[1]+'</button>';}).join('')+'</span>'
      +'<button class="btn" type="button" onclick="liveOpen()"'+(u?'':' disabled')+'><i class="ti ti-arrows-maximize"></i> Vollbild</button><button class="btn" type="button" onclick="'+(u?'window.open(\''+esc(liveUrl(false))+'&demo=1\',\'_blank\',\'noopener\')':'')+'"'+(u?'':' disabled')+'><i class="ti ti-player-play"></i> Vorführ-Modus</button></span></div>';
    h+=k?'<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#EEEDE9;border:1px solid var(--border)"><iframe id="liveFrame" src="'+esc(liveUrl(true))+'" title="Live-Ansicht" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>'
      :'<div class="kal-note" style="padding:30px;text-align:center">Noch keine Adresse vorhanden.'+(adm?' Unten „Adresse erzeugen“ klicken.':' Ein Admin muss die Adresse zuerst erzeugen.')+'</div>';
    h+='</div><div style="display:flex;flex-direction:column;gap:16px">';
    var TL=liveTodayList();
    h+='<div class="card card-static" style="margin:0"><div class="card-title"><i class="ti ti-clock"></i> Heute auf den Fernsehern</div><div class="kal-note" style="margin-bottom:6px">aus Zeitplan und Power Hours · „Testen“ zeigt es sofort oben in der Vorschau</div>'
      +(TL.length?TL.map(function(x){return '<div style="display:grid;grid-template-columns:56px 1fr auto;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--border)"><b style="font-size:13px">'+esc(x.t)+'</b><span style="font-size:13px">'+esc(x.txt)+'</span><button class="btn" type="button" style="height:28px;padding:0 10px;font-size:12px" onclick="liveTest(\''+x.test+'\')">Testen</button></div>';}).join(''):'<div class="kal-note">Heute ist nichts geplant.</div>')
      +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)"><span class="kal-note">Weitere testen:</span>'
      +[['aufstieg','Aufstieg'],['ziel','Tagesziel'],['marge','€-Marge'],['auftrag','Top-Auftrag'],['team','Team'],['halbzeit','Zwischenstand'],['endspurt','Endspurt'],['sieger','Siegerehrung']].map(function(x){return '<button class="btn" type="button" style="height:28px;padding:0 10px;font-size:12px" onclick="liveTest(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div></div>';
    h+='<div class="card card-static" style="margin:0"><div class="card-title"><i class="ti ti-link"></i> Adresse für die Fernseher</div><div class="kal-note" style="margin-bottom:10px">im Browser des Fernsehers öffnen und auf Vollbild stellen · keine Anmeldung nötig · nur auf den Fernsehern verwenden</div>'
      +'<div style="display:flex;gap:8px;align-items:center"><input id="liveUrlField" readonly value="'+esc(u)+'" onclick="this.select()" style="flex:1;min-width:0;height:34px;box-sizing:border-box;font-size:13px;padding:0 10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text)">'
      +'<button class="btn btn-primary" type="button" onclick="liveCopy()"'+(u?'':' disabled')+'><i class="ti ti-copy"></i> Kopieren</button>'
      +(adm?'<button class="btn" type="button" onclick="liveNewKey()"><i class="ti ti-refresh"></i> '+(k?'Neue Adresse erzeugen':'Adresse erzeugen')+'</button>':'')+'</div></div>';
    h+='</div>';
  } else if(LIVE_TAB==='zeitplan')h+=zpbHtml();
  else if(LIVE_TAB==='powerhour')h+=phbHtml();
  else if(LIVE_TAB==='figuren')h+=figHtml();
  else h+=liveSettingsHtml();
  h+='</div>';
  ma.innerHTML=h;}
function phbHM(t){return t?String(t).slice(0,5):'';}
function phbTs(d,hm){var p=hm.split(':'),x=new Date(d+'T00:00:00');x.setHours(+p[0],+p[1],0,0);return x.getTime();}
function phbLoad(){if(PHB.loading)return;PHB.loading=true;PHB.date=PHB.date||today();
  sb.from('power_hours').select('*').order('datum',{ascending:false}).order('start_zeit').then(function(res){
    PHB.loading=false;PHB.loaded=true;
    if(res.error){PHB.err=/power_hours/.test(res.error.message||'')||res.error.code==='42P01'?'Für die Power Hour bitte zuerst 46_power_hour.sql in Supabase ausführen.':'Power Hours konnten nicht geladen werden: '+res.error.message;renderLiveIfOpen();return;}
    PHB.err='';PHB.all=res.data||[];phbLoadTicks();renderLiveIfOpen();});}
function renderLiveIfOpen(){if(view==='live')renderLive();}
function phbLoadTicks(){var now=Date.now(),dates={};PHB.all.forEach(function(h){if(phbTs(h.datum,phbHM(h.end_zeit))<now&&!PHB.ticks[h.datum])dates[h.datum]=1;});
  Object.keys(dates).slice(0,40).forEach(function(d){PHB.ticks[d]='lädt';var out=[];
    (function page(from){sb.from('performance_ticks').select('employee_id,ts,d_oem,d_my,d_yes,d_sy,d_nicht,d_ups,d_wka,d_oem_marge,d_marge').eq('date',d).order('ts').range(from,from+999).then(function(r){
      if(r.error){PHB.ticks[d]=[];renderLiveIfOpen();return;}out=out.concat(r.data||[]);if((r.data||[]).length===1000)page(from+1000);else{PHB.ticks[d]=out;renderLiveIfOpen();}});})(0);});}
function phbResult(h){var tk=PHB.ticks[h.datum];if(!Array.isArray(tk))return null;var S=phbTs(h.datum,phbHM(h.start_zeit)),E=phbTs(h.datum,phbHM(h.end_zeit));
  var after=tk.map(function(k){return new Date(k.ts).getTime();}).filter(function(x){return x>E;})[0],cut=after!=null?after+60000:E,agg={};
  tk.forEach(function(k){var ts=new Date(k.ts).getTime();if(ts<=S||ts>cut)return;var a=agg[k.employee_id]||(agg[k.employee_id]={opt:0,my:0,marge:0,marge_my:0});
    a.opt+=(k.d_oem||0)+(k.d_ups||0)+(k.d_wka||0);a.my+=k.d_my||0;a.marge+=+k.d_marge||0;if((k.d_my||0)>0&&(k.d_oem||0)>0)a.marge_my+=(+k.d_oem_marge||0)*Math.min(1,k.d_my/k.d_oem);});
  var L=Object.keys(agg).map(function(id){var e=(employees||[]).find(function(x){return String(x.id)===String(id);});return {name:e?e.name:'?',v:agg[id][h.kpi]||0};}).filter(function(x){return x.v>0;}).sort(function(a,b){return b.v-a.v;});
  return {list:L,total:L.reduce(function(a,x){return a+x.v;},0)};}
function phbFmt(h,v){return (h.kpi==='marge'||h.kpi==='marge_my')?'€'+Math.round(v).toLocaleString('de-DE'):Math.round(v).toLocaleString('de-DE');}
function phbStatus(h){var now=Date.now(),S=phbTs(h.datum,phbHM(h.start_zeit)),E=phbTs(h.datum,phbHM(h.end_zeit));
  if(now<S)return {t:'geplant',c:'background:#FBE3DA;color:#9A3F22'};
  if(now<E){var m=Math.ceil((E-now)/60000);return {t:'läuft · noch '+m+' Min.',c:'background:#F08566;color:#fff'};}
  var r=phbResult(h);return {t:r&&r.list.length?'vorbei · Sieger '+r.list[0].name.split(' ')[0]+' ('+phbFmt(h,r.list[0].v)+')':'vorbei',c:'background:#EFECE5;color:#5f594e'};}
function phbSetDate(d){PHB.date=d||today();PHB.msg='';renderLive();}
function phbSave(){if(currentUserRole!=='admin')return;var d=PHB.date,jobs=[],err=null,ex=PHB.all.filter(function(h){return h.datum===d;});
  for(var i=0;i<3;i++){var st=(document.getElementById('phS'+i)||{}).value||'',en=(document.getElementById('phE'+i)||{}).value||'',kp=(document.getElementById('phK'+i)||{}).value||'opt',id=(document.getElementById('phS'+i)||{dataset:{}}).dataset.id||'';
    var old=id?ex.find(function(h){return String(h.id)===id;}):null;
    if(old&&Date.now()>phbTs(old.datum,phbHM(old.end_zeit))){continue;} // vorbei = gesperrt
    if(st&&en){if(en<=st){err='Bei Zeile '+(i+1)+' liegt das Ende vor dem Start.';break;}
      var row={datum:d,start_zeit:st,end_zeit:en,kpi:kp,updated_at:new Date().toISOString()};
      jobs.push(id?sb.from('power_hours').update(row).eq('id',id):sb.from('power_hours').insert(row));}
    else if(id){jobs.push(sb.from('power_hours').delete().eq('id',id));}}
  if(err){PHB.msg=err;renderLive();return;}
  var c={halbMin:(document.getElementById('phHalf')||{}).value||'',popupMin:(document.getElementById('phPop')||{}).value||'2'};c.halbMin=c.halbMin===''?null:+c.halbMin;c.popupMin=+c.popupMin||2;
  jobs.push(sb.from('settings').upsert({key:'powerHourConfig',value:JSON.stringify(c)},{onConflict:'key'}));
  Promise.all(jobs).then(function(rs){var bad=rs.find(function(r){return r&&r.error;});
    if(bad){PHB.msg='Speichern fehlgeschlagen: '+bad.error.message;renderLive();return;}
    settings.powerHourConfig=c;PHB.msg='Gespeichert. Die Fernseher übernehmen es innerhalb einer Minute.';PHB.loaded=false;phbLoad();});}
function phbToggle(id){PHB.open=PHB.open===id?null:id;renderLive();}
function phbHtml(){
  if(!PHB.loaded){phbLoad();return '<div class="card card-static"><div class="card-title"><i class="ti ti-bolt"></i> Power Hours</div><div class="kal-note">Lädt …</div></div>';}
  if(PHB.err)return '<div class="card card-static"><div class="card-title"><i class="ti ti-bolt"></i> Power Hours</div><div class="kal-note">'+esc(PHB.err)+'</div></div>';
  var adm=currentUserRole==='admin',d=PHB.date||today(),rows=PHB.all.filter(function(h){return h.datum===d;}).slice(0,3),c=settings.powerHourConfig||{};
  var inp='height:34px;box-sizing:border-box;font-size:13px;padding:0 8px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text)';
  var h='<div class="card card-static"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="card-title" style="margin:0"><i class="ti ti-bolt"></i> Power Hours</div><span class="kal-note">bis zu drei am Tag · Banner, Säulen und CR zählen in der Zeit nur ab Start · Zwischenstand und Siegerehrung auf den Fernsehern</span>'
    +'<span style="margin-left:auto;display:flex;gap:8px;align-items:center"><span class="kal-note">Tag</span><input type="date" value="'+d+'" onchange="phbSetDate(this.value)" style="'+inp+'"></span></div>';
  h+='<div style="display:grid;grid-template-columns:30px 120px 120px 210px 90px 1fr;gap:12px;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--text3);text-transform:uppercase;padding-bottom:6px"><span></span><span>Start</span><span>Ende</span><span>Gezählt wird</span><span>Dauer</span><span>Status</span></div>';
  for(var i=0;i<3;i++){var r=rows[i]||null,st=r?phbHM(r.start_zeit):'',en=r?phbHM(r.end_zeit):'',past=r&&Date.now()>phbTs(r.datum,en),dis=(!adm||past)?' disabled':'',ss=r?phbStatus(r):null;
    var du=st&&en?Math.round((phbTs(d,en)-phbTs(d,st))/60000)+' Min.':'';
    h+='<div style="display:grid;grid-template-columns:30px 120px 120px 210px 90px 1fr;gap:12px;align-items:center;padding:7px 0;border-top:1px solid var(--border)"><b style="font-size:18px;font-weight:300;color:var(--text3)">'+(i+1)+'</b>'
      +'<input type="time" id="phS'+i+'" data-id="'+(r?r.id:'')+'" value="'+st+'"'+dis+' style="'+inp+'"><input type="time" id="phE'+i+'" value="'+en+'"'+dis+' style="'+inp+'">'
      +'<select id="phK'+i+'"'+dis+' style="'+inp+'">'+Object.keys(PHB_KPI).map(function(k){return '<option value="'+k+'"'+(r&&r.kpi===k?' selected':'')+'>'+PHB_KPI[k]+'</option>';}).join('')+'</select>'
      +'<span class="kal-note">'+du+'</span><span>'+(ss?'<span style="font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;'+ss.c+'">'+esc(ss.t)+'</span>':'<span class="kal-note">frei</span>')+'</span></div>';}
  h+='<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">'
    +'<label style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text3)">Zwischenstand nach (Min.)<input type="number" id="phHalf" min="1" placeholder="Hälfte" value="'+(c.halbMin||'')+'"'+(adm?'':' disabled')+' style="'+inp+';width:120px"></label>'
    +'<label style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text3)">Popups stehen (Min.)<input type="number" id="phPop" min="1" value="'+(c.popupMin||2)+'"'+(adm?'':' disabled')+' style="'+inp+';width:110px"></label>'
    +'<span class="kal-note" style="flex:1">Zeile leeren und speichern = Power Hour löschen. Vorbei ist vorbei: abgelaufene Power Hours lassen sich nicht mehr ändern.</span>'
    +(adm?'<button class="btn btn-primary" type="button" onclick="phbSave()"><i class="ti ti-device-floppy"></i> Speichern</button>':'')+'</div>'
    +(PHB.msg?'<div class="kal-note" style="margin-top:10px;color:var(--text)">'+esc(PHB.msg)+'</div>':'')+'</div>';
  // Historie
  var now=Date.now(),past=PHB.all.filter(function(x){return phbTs(x.datum,phbHM(x.end_zeit))<now;});
  h+='<div class="card card-static"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="card-title" style="margin:0"><i class="ti ti-trophy"></i> Historie</div><span class="kal-note">alle bisherigen Power Hours · Klick auf eine Zeile zeigt die ganze Rangliste</span></div>';
  if(!past.length)h+='<div class="kal-note">Noch keine Power Hour vorbei.</div>';
  else{var th='text-align:left;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--text3);text-transform:uppercase;padding:8px 10px;background:#EFECE5',td='padding:8px 10px;border-bottom:1px solid var(--border);font-size:13px';
    h+='<table style="width:100%;border-collapse:collapse"><tr><th style="'+th+'">Tag</th><th style="'+th+'">Zeit</th><th style="'+th+'">Dauer</th><th style="'+th+'">Kennzahl</th><th style="'+th+'">Sieger</th><th style="'+th+'">Ergebnis</th><th style="'+th+'">Platz 2 · 3</th><th style="'+th+';text-align:right">Team gesamt</th></tr>';
    past.forEach(function(x){var R=phbResult(x),s1=phbHM(x.start_zeit),e1=phbHM(x.end_zeit),L=R?R.list:[];
      h+='<tr style="cursor:pointer" onclick="phbToggle('+x.id+')"><td style="'+td+'">'+x.datum.split('-').reverse().join('.')+'</td><td style="'+td+'">'+s1+'–'+e1+'</td><td style="'+td+'">'+Math.round((phbTs(x.datum,e1)-phbTs(x.datum,s1))/60000)+' Min.</td><td style="'+td+'">'+PHB_KPI[x.kpi]+'</td>'
        +'<td style="'+td+';font-weight:700">'+(R?(L[0]?'🏆 '+esc(L[0].name):'–'):'lädt …')+'</td><td style="'+td+';font-weight:700">'+(L[0]?phbFmt(x,L[0].v):'')+'</td><td style="'+td+';color:var(--text3)">'+(L[1]?esc(L[1].name.split(' ')[0])+' '+phbFmt(x,L[1].v):'')+(L[2]?' · '+esc(L[2].name.split(' ')[0])+' '+phbFmt(x,L[2].v):'')+'</td><td style="'+td+';text-align:right">'+(R?phbFmt(x,R.total):'')+'</td></tr>';
      if(PHB.open===x.id&&L.length)h+='<tr><td colspan="8" style="padding:8px 10px 14px;background:var(--bg)">'+L.map(function(y,i){return '<div style="display:flex;gap:12px;font-size:13px;padding:3px 0"><b style="width:26px;color:var(--text3);font-weight:400">'+(i+1)+'.</b><span style="flex:1">'+esc(y.name)+'</span><b>'+phbFmt(x,y.v)+'</b></div>';}).join('')+'</td></tr>';});
    h+='</table>';}
  return h+'</div>';
}
function figPeople(){var L=(employees||[]).filter(function(e){return e.active!==false&&(isAgentEmp(e)||/^(dori|dogoro)$/i.test(String(e.name||'').split(' ')[0]));});return L.slice().sort(function(a,b){return String(a.name).localeCompare(String(b.name));});}
function figOf(e,i){var f=((settings.liveConfig||{}).figuren||{})[e.id];return Object.assign({letter:String(e.name||'').charAt(0)},f||kidDefault(e,i));}
function figRead(){var out={};figPeople().forEach(function(e,i){var g=function(k){return document.getElementById('fig_'+k+'_'+e.id);},o={};
    o.g=(g('g')||{}).value||'m';o.skin=(g('s')||{}).value||'hell';o.hair=(g('h')||{}).value||'kurz';o.shirt=(g('c')||{}).value||'#F2884F';
    ['hc','eye','unten','muster','brille','hut'].forEach(function(k){var el=g(k);if(el&&el.value)o[k]=el.value;});
    ['hose','schuh'].forEach(function(k){var el=g(k);if(el&&el.dataset.set==='1')o[k]=el.value;});
    ['headset','freck','ohrringe','bart'].forEach(function(k){var el=g(k);if(el&&el.checked)o[k]=true;});
    out[e.id]=o;});return out;}
function figPreview(id){var all=figRead(),el=document.getElementById('fig_p_'+id),e=figPeople().find(function(x){return String(x.id)===String(id);});if(el&&all[id])el.innerHTML=kidSvg(Object.assign({letter:e?String(e.name||'').charAt(0):''},all[id]));}
function figFokus(e){var f=((settings.liveConfig||{}).fokus||{})[e.id];if(f)return f;var n=String(e.name||'').split(' ')[0];return /^bianca$/i.test(n)?'UPS':/^abenezer$/i.test(n)?'WKA':'OEM';}
function figSave(){if(currentUserRole!=='admin')return;var fo={};figPeople().forEach(function(e){var el=document.getElementById('fig_fokus_'+e.id);fo[e.id]=el?el.value:figFokus(e);});var c=Object.assign({},settings.liveConfig||{},{figuren:figRead(),fokus:fo});
  liveCfgSave(c,function(res){
    if(res&&res.error){alert('Speichern fehlgeschlagen: '+res.error.message);return;}FIG.msg='Figuren gespeichert. Die Fernseher übernehmen sie innerhalb einer Minute.';renderLive();});}
function figMore(id){var d=document.getElementById('fig_m_'+id);if(d){var op=d.style.display==='none';d.style.display=op?'grid':'none';FIG.open=FIG.open||{};FIG.open[id]=op;}}
function figHtml(){var adm=currentUserRole==='admin',dis=adm?'':' disabled',P=figPeople();
  var inp='height:30px;box-sizing:border-box;font-size:12px;padding:0 6px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);min-width:0';
  var sel=function(k,id,val,opts){return '<select id="fig_'+k+'_'+id+'"'+dis+' style="'+inp+'" onchange="figPreview(\''+id+'\')">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(String(o[0])===String(val==null?'':val)?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';};
  var col=function(k,id,val,set){return '<input type="color" id="fig_'+k+'_'+id+'" value="'+(val||'#3E5C8A')+'" data-set="'+(set?'1':'0')+'"'+dis+' onchange="this.dataset.set=\'1\';figPreview(\''+id+'\')" style="width:30px;height:30px;padding:0;border:1px solid var(--border);border-radius:8px;background:none">';};
  var chk=function(k,id,val,l){return '<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text2)"><input type="checkbox" id="fig_'+k+'_'+id+'"'+(val?' checked':'')+dis+' onchange="figPreview(\''+id+'\')">'+l+'</label>';};
  var lab=function(t,x){return '<label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--text3);min-width:0">'+t+x+'</label>';};
  var h='<style>.kidp svg .mh,.kidp svg .mw,.kidp svg .ba,.kidp svg .mg{display:none}</style><div class="card card-static"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="card-title" style="margin:0"><i class="ti ti-mood-kid"></i> Figuren</div><span class="kal-note">So erscheint jede Person in den Animationen · „Mehr“ öffnet weitere Einstellungen</span>'+(adm?'<button class="btn btn-primary" type="button" style="margin-left:auto" onclick="figSave()"><i class="ti ti-device-floppy"></i> Figuren speichern</button>':'')+'</div>';
  h+='<div style="display:flex;flex-direction:column;gap:0">';
  P.forEach(function(e,i){var f=figOf(e,i),id=e.id;
    h+='<div style="border-top:1px solid var(--border);padding:4px 0"><div style="display:grid;grid-template-columns:36px minmax(150px,220px) 110px 130px 150px 34px 1fr;gap:10px;align-items:center"><div class="kidp" id="fig_p_'+id+'" style="width:30px;height:60px">'+kidSvg(f)+'</div><b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(e.name)+'</b>'
      +sel('g',id,f.g,[['m','Junge'],['w','Mädchen']])+sel('s',id,f.skin,[['hell','Haut hell'],['mittel','Haut mittel'],['dunkel','Haut dunkel']])
      +sel('h',id,f.hair,[['kurz','kurze Haare'],['scheitel','Seitenscheitel'],['igel','Igel'],['locken','Locken'],['zopf','Pferdeschwanz'],['zoepfe','zwei Zöpfe'],['lang','lange Haare'],['bob','Bob'],['dutt','Dutt'],['puffs','Puffs'],['glatze','Glatze']])+col('c',id,f.shirt||'#F2884F',true)
      +'<span style="justify-self:end"><button type="button" class="btn" style="height:30px;padding:0 10px;font-size:12px" onclick="figMore(\''+id+'\')">Mehr</button></span></div>'
      +'<div id="fig_m_'+id+'" style="display:'+(FIG.open&&FIG.open[id]?'grid':'none')+';grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:6px 0 6px 46px;padding:10px;border-radius:10px;background:#EFECE5">'
      +lab('Haarfarbe',sel('hc',id,f.hc||'',[['','automatisch'],['schwarz','schwarz'],['dunkelbraun','dunkelbraun'],['braun','braun'],['blond','blond'],['rot','rot'],['grau','grau']]))
      +lab('Augen',sel('eye',id,f.eye||'',[['','braun'],['blau','blau'],['gruen','grün']]))
      +lab('Unten',sel('unten',id,f.unten||'',[['','automatisch'],['hose','Hose'],['rock','Rock/Kleid']]))
      +lab('Muster aufs Shirt',sel('muster',id,f.muster||'',[['','keins'],['streifen','Streifen'],['punkte','Punkte'],['buchstabe','Anfangsbuchstabe']]))
      +lab('Brille',sel('brille',id,f.brille||'',[['','keine'],['rund','rund'],['eckig','eckig']]))
      +lab('Kopfbedeckung',sel('hut',id,f.hut||'',[['','keine'],['cap','Cap'],['muetze','Mütze'],['kopftuch','Kopftuch'],['stirnband','Stirnband']]))
      +lab('Hose/Rock · Schuhe','<div style="display:flex;gap:6px">'+col('hose',id,f.hose||'#3E5C8A',!!f.hose)+col('schuh',id,f.schuh||'#7A4A2A',!!f.schuh)+'</div>')
      +'<div style="display:flex;flex-direction:column;gap:3px">'+chk('headset',id,f.headset,'Headset')+chk('freck',id,f.freck,'Sommersprossen')+chk('ohrringe',id,f.ohrringe,'Ohrringe')+chk('bart',id,f.bart,'Bärtchen')+'</div>'
      +'</div></div>';});
  h+='</div>'+(FIG.msg?'<div class="kal-note" style="margin-top:10px;color:var(--text)">'+esc(FIG.msg)+'</div>':'')+'</div>';return h;}
function zpbGet(k){var z=((settings.liveConfig||{}).zeitplan||{})[k]||{},o={};Object.keys(ZPB_DEF[k]).forEach(function(x){o[x]=z[x]!=null&&z[x]!==''?z[x]:ZPB_DEF[k][x];});return o;}
function zpbSave(){if(currentUserRole!=='admin')return;var zpl={};
  ZPB_ROWS.forEach(function(r){var k=r[0],g=function(id){return document.getElementById('zp_'+id+'_'+k);};var o={on:!!(g('on')&&g('on').checked),t:(g('t')&&g('t').value)||ZPB_DEF[k].t};
    if(g('wd'))o.wd=g('wd').value===''?null:+g('wd').value;if(g('min'))o.min=Math.max(1,+g('min').value||2);if(g('bis'))o.bis=g('bis').value||'13:00';zpl[k]=o;});
  var c=Object.assign({},settings.liveConfig||{},{zeitplan:zpl});
  liveCfgSave(c,function(res){
    if(res&&res.error){alert('Speichern fehlgeschlagen: '+res.error.message);return;}ZPB.msg='Zeitplan gespeichert. Die Fernseher übernehmen ihn innerhalb einer Minute.';renderLive();});}
function zpbHtml(){var adm=currentUserRole==='admin',dis=adm?'':' disabled';
  var inp='height:34px;box-sizing:border-box;font-size:13px;padding:0 8px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text)';
  var WD=[['','täglich'],['1','Montag'],['2','Dienstag'],['3','Mittwoch'],['4','Donnerstag'],['5','Freitag']];
  var h='<div class="card card-static"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div class="card-title" style="margin:0"><i class="ti ti-clock-play"></i> Zeitplan der Popups</div><span class="kal-note">wann die Animationen und Karten auf den Fernsehern erscheinen · Power Hours stellst du oben extra ein</span>'+(adm?'<button class="btn btn-primary" type="button" style="margin-left:auto" onclick="zpbSave()"><i class="ti ti-device-floppy"></i> Zeitplan speichern</button>':'')+'</div>';
  h+='<div style="display:grid;grid-template-columns:60px minmax(0,1fr) 140px 120px 110px;gap:12px;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--text3);text-transform:uppercase;padding-bottom:6px"><span>An</span><span>Popup</span><span>Tag</span><span>Uhrzeit</span><span>Dauer (Min.)</span></div>';
  ZPB_ROWS.forEach(function(r){var k=r[0],z=zpbGet(k);
    h+='<div style="display:grid;grid-template-columns:60px minmax(0,1fr) 140px 120px 110px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--border)">'
      +'<label style="display:flex;align-items:center"><input type="checkbox" id="zp_on_'+k+'"'+(z.on?' checked':'')+dis+' style="width:18px;height:18px"></label>'
      +'<div style="min-width:0"><b style="font-size:13px">'+r[1]+'</b><div class="kal-note">'+r[2]+'</div></div>'
      +(k==='do'||k==='fr'?'<select id="zp_wd_'+k+'"'+dis+' style="'+inp+'">'+WD.map(function(w){return '<option value="'+w[0]+'"'+(String(z.wd==null?'':z.wd)===w[0]?' selected':'')+'>'+w[1]+'</option>';}).join('')+'</select>':'<span class="kal-note">täglich</span>')
      +'<input type="time" id="zp_t_'+k+'" value="'+esc(z.t)+'"'+dis+' style="'+inp+'">'
      +(r[3]?'<input type="number" min="1" id="zp_min_'+k+'" value="'+(z.min||2)+'"'+dis+' style="'+inp+';width:80px">':(k==='woche'||k==='monat'?'<label class="kal-note" style="display:flex;flex-direction:column;gap:2px">bis<input type="time" id="zp_bis_'+k+'" value="'+esc(z.bis||'13:00')+'"'+dis+' style="'+inp+'"></label>':'<span class="kal-note">ca. 17 Sek.</span>'))+'</div>';});
  h+=(ZPB.msg?'<div class="kal-note" style="margin-top:10px;color:var(--text)">'+esc(ZPB.msg)+'</div>':'')+'</div>';return h;}

// ── Persönliche KPI-Ziele für die Live-Ansicht (Fernseher sehen keine Provisionsdaten) ──
function liveZieleCalc(){var out={};(employees||[]).forEach(function(e){if(e.active===false||!isAgentEmp(e))return;var t=empTargets(e);
  out[e.id]={fo:t.crOEM&&t.crOEM.val,my:t.crMegaYes&&t.crMegaYes.val,tw:t.crTeilweise&&t.crTeilweise.val,sm:t.crSyMy&&t.crSyMy.val,ao:t.anteilOEM&&t.anteilOEM.val,oph:t.optPerH&&t.optPerH.val};});return out;}
function liveZieleSync(){try{if(currentUserRole!=='admin'||!employees||!employees.length||typeof sb==='undefined')return;var z=liveZieleCalc(),c=settings.liveConfig||{};
  if(JSON.stringify(c.ziele||{})===JSON.stringify(z))return;var n=Object.assign({},c,{ziele:z,zieleStand:today()});
  liveCfgSave(n,function(){});}catch(e){}}
