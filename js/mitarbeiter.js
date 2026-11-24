// Sales OS – Mitarbeiter: Detailansicht mit Reitern, Formulare, Ziele, Dokumente
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function findCoachingCategoryForType(typeValue){
  var cats=Object.keys(COACHING_CATEGORIES);
  for(var i=0;i<cats.length;i++){
    if(COACHING_CATEGORIES[cats[i]].indexOf(typeValue)>=0)return cats[i];
  }
  return COACHING_LEGACY_CAT[typeValue]||cats[0];
}
function populateCoachingCategorySelect(catSelId){
  var catEl=document.getElementById(catSelId);
  if(!catEl||catEl.options.length)return;
  Object.keys(COACHING_CATEGORIES).forEach(function(cat){
    var o=document.createElement('option');o.textContent=cat;catEl.appendChild(o);
  });
}
function populateCoachingTypeSelect(catSelId,typeSelId,preselectType){
  var catEl=document.getElementById(catSelId),typeEl=document.getElementById(typeSelId);
  if(!catEl||!typeEl)return;
  var cat=catEl.value||Object.keys(COACHING_CATEGORIES)[0];
  typeEl.innerHTML='';
  (COACHING_CATEGORIES[cat]||[]).forEach(function(t){
    var o=document.createElement('option');o.textContent=t;typeEl.appendChild(o);
  });
  if(preselectType){
    var _found=false;
    for(var i=0;i<typeEl.options.length;i++){
      if(typeEl.options[i].value===preselectType||typeEl.options[i].text===preselectType){typeEl.selectedIndex=i;_found=true;break;}
    }
    if(!_found){var _o=document.createElement('option');_o.textContent=preselectType;typeEl.appendChild(_o);typeEl.value=preselectType;}
  }
}
function onCoachingCategoryChange(catSelId,typeSelId){
  populateCoachingTypeSelect(catSelId,typeSelId,null);
}
function setCoachingTypeSelection(catSelId,typeSelId,typeValue){
  var catEl=document.getElementById(catSelId);
  if(!catEl)return;
  var cat=findCoachingCategoryForType(typeValue);
  for(var i=0;i<catEl.options.length;i++){
    if(catEl.options[i].text===cat){catEl.selectedIndex=i;break;}
  }
  populateCoachingTypeSelect(catSelId,typeSelId,typeValue);
}
function focusMetricLabel(key){if(key&&String(key).indexOf('dev:')===0){var k=String(key).slice(4),r=(typeof SF_REVIEW_KEYS!=='undefined'?SF_REVIEW_KEYS:[]).find(function(x){return x[0]===k;});return r?r[1]:k;}var m=FOCUS_METRICS.find(function(x){return x.key===key;});return m?m.label:key;}
function goalIsDev(key){return !!key&&String(key).indexOf('dev:')===0;}
function goalUnit(key){if(goalIsDev(key))return '';return /^cr|Yes|optPerH/i.test(String(key))?(String(key)==='optPerH'?'':' %'):'';}
function goalDevVal(empId,k,beforeDate){var L=(reviews[empId]||[]).filter(function(r){return r&&r.einwand!==undefined&&+r[k]>0&&(!beforeDate||String(r.date)<beforeDate);}).sort(function(a,b){return String(b.date).localeCompare(String(a.date));});return L.length?+L[0][k]:null;}
function sessionDuration(start,end){
  if(!start||!end)return null;
  var sp=start.split(':'),ep=end.split(':');
  var startMin=parseInt(sp[0])*60+parseInt(sp[1]);
  var endMin=parseInt(ep[0])*60+parseInt(ep[1]);
  var diff=endMin-startMin;
  if(diff<=0)return null;
  return diff;
}
function formatDuration(min){
  if(min===null||min===undefined)return '';
  if(min<60)return min+' Min.';
  var h=Math.floor(min/60),m=min%60;
  return h+' Std'+(m?' '+m+' Min.':'');
}

function exportEmpSummary(empId){
  var emp=employees.find(function(e){return e.id===empId;});
  if(!emp)return;
  var t=empTargets(emp);
  var perf30=getPerf(emp.id,30);
  function avg(key){if(!perf30.length)return null;return perf30.reduce(function(a,x){return a+(x[key]||0);},0)/perf30.length;}
  function crAvg30(metric){
    var oem=0,notS=0,tw=0,yes=0,sy=0,my=0;
    perf30.forEach(function(x){
      oem+=x.convOEM||0;notS+=x.notSuccessful||0;
      tw+=x.convTW||0;yes+=x.convYes||0;sy+=x.convSY||0;my+=x.convMY||0;
    });
    if(metric==='crOEM'){var d=oem+notS;return d>0?(oem/d*100):null;}
    if(metric==='crTeilweise'){var d=tw+yes+sy+my;return d>0?(tw/d*100):null;}
    if(metric==='crSuperYes'){var d=yes+sy+my;return d>0?(sy/d*100):null;}
    if(metric==='crMegaYes'){var d=yes+sy+my;return d>0?(my/d*100):null;}
    return null;
  }
  var kpiRows=[
    {l:'CR OEM',v:crAvg30('crOEM'),tgt:t.crOEM},
    {l:'CR Teilweise',v:crAvg30('crTeilweise'),tgt:t.crTeilweise},
    {l:'CR Super Yes',v:crAvg30('crSuperYes'),tgt:t.crSuperYes},
    {l:'CR Mega Yes',v:crAvg30('crMegaYes'),tgt:t.crMegaYes}
  ];
  var kpiHtml=kpiRows.map(function(r){
    var bench=roleBenchmark(emp.id,{'CR OEM':'crOEM','CR Teilweise':'crTeilweise','CR Super Yes':'crSuperYes','CR Mega Yes':'crMegaYes'}[r.l],30);
    var vTxt=r.v!==null?Math.round(r.v)+'%':'—';
    var tgtTxt=r.tgt?(r.tgt.dir==='lte'?'≤':'≥')+r.tgt.val+'%':'—';
    var benchTxt=bench!==null?Math.round(bench)+'%':'—';
    var ok=r.v!==null&&r.tgt?(r.tgt.dir==='lte'?r.v<=r.tgt.val:r.v>=r.tgt.val):null;
    return '<tr><td>'+r.l+'</td><td>'+vTxt+'</td><td>'+tgtTxt+'</td><td>'+benchTxt+'</td><td>'+(ok===null?'—':ok?'✓ im Ziel':'unter Ziel')+'</td></tr>';
  }).join('');

  var callRat=(callRatings[emp.id]||[]);
  var qaAvg=callRat.length?Math.round(callRat.reduce(function(a,r){return a+totalScore(r);},0)/callRat.length):null;
  var weak=qaWeakSpots(emp.id,5);
  var weakHtml=weak.length?weak.map(function(w){return '<li>'+w.label+' (Ø '+w.avg.toFixed(1)+'/4 über die letzten '+w.n+' Calls)</li>';}).join(''):'<li>Keine auffälligen Muster</li>';

  var sessions=(protocols[emp.id]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var abgeschlossen=sessions.filter(function(s){return s.status!=='geplant';});
  var lastSessions=abgeschlossen.slice(0,5).map(function(s){
    var _dur=sessionDuration(s.uhrzeit,s.endUhrzeit);
    return '<tr><td>'+fd(s.date)+'</td><td>'+esc(s.type||'—')+'</td><td>'+(_dur?formatDuration(_dur):'—')+'</td><td>'+esc(s.topics&&s.topics.length?s.topics.join(', '):(s.focus||'—'))+'</td><td>'+esc(s.cont||'—')+'</td></tr>';
  }).join('');

  var milestones=kpiMilestones(emp.id);
  var empGoalsExp=(goals[emp.id]||[]).slice().sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  var goalsExpHtml=empGoalsExp.length?empGoalsExp.map(function(g){
    return '<tr><td>'+esc(g.description)+'</td><td>'+(g.metricKey?focusMetricLabel(g.metricKey)+' ≥ '+g.targetValue+'%':'—')+'</td><td>'+(g.targetDate?fd(g.targetDate):'—')+'</td><td>'+esc(g.status)+'</td></tr>';
  }).join(''):'';
  var milestonesHtml=milestones.length?milestones.map(function(m){return '<li>'+fd(m.date)+' – '+m.label+'</li>';}).join(''):'<li>Noch keine Meilensteine erreicht</li>';

  var html='<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Zusammenfassung – '+esc(emp.name)+'</title>'
    +'<style>'
    +'body{font-family:Arial,Helvetica,sans-serif;color:#1a1a18;margin:0;padding:32px;font-size:13px;line-height:1.5}'
    +'h1{font-size:20px;margin:0 0 4px}'
    +'h2{font-size:14px;margin:24px 0 8px;border-bottom:2px solid #F08566;padding-bottom:4px;color:#3a3833}'
    +'.meta{color:#666;font-size:12px;margin-bottom:16px}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:8px}'
    +'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px}'
    +'th{background:#f2f3f0;font-weight:700}'
    +'ul{margin:4px 0;padding-left:20px}'
    +'.notes-box{background:#f7f7f5;border:1px solid #ddd;border-radius:6px;padding:12px;white-space:pre-wrap}'
    +'@media print{body{padding:16px}}'
    +'</style></head><body>'
    +'<h1>Coaching-Zusammenfassung: '+esc(emp.name)+'</h1>'
    +'<div class="meta">'+esc(emp.role)+' · '+esc(emp.team||'')+' · '+esc(emp.phase)+(emp.startDate?' · Start '+fd(emp.startDate):'')+' · erstellt am '+fd(today())+'</div>'
    +'<h2>KPI-Übersicht (Ø letzte 30 Tage)</h2>'
    +'<table><tr><th>KPI</th><th>Aktuell</th><th>Ziel</th><th>Ø Rolle ('+emp.role+')</th><th>Status</th></tr>'+kpiHtml+'</table>'
    +'<h2>QA-Performance</h2>'
    +'<div>Durchschnittlicher QA-Score: <strong>'+(qaAvg!==null?qaAvg+'%':'—')+'</strong> ('+callRat.length+' bewertete Calls)</div>'
    +'<div style="margin-top:6px">Auffällige Muster:</div><ul>'+weakHtml+'</ul>'
    +'<h2>Coaching-Historie</h2>'
    +'<div style="margin-bottom:6px">'+abgeschlossen.length+' abgeschlossene Sessions insgesamt. Letzte 5:</div>'
    +'<table><tr><th>Datum</th><th>Art</th><th>Dauer</th><th>Thema</th><th>Continue (letzter Stand)</th></tr>'+(lastSessions||'<tr><td colspan="5">Keine Sessions vorhanden</td></tr>')+'</table>'
    +(empGoalsExp.length?('<h2>Zielvereinbarungen</h2>'
      +'<table><tr><th>Ziel</th><th>KPI-Ziel</th><th>Zieldatum</th><th>Status</th></tr>'+goalsExpHtml+'</table>'):'')
    +'<h2>Entwicklung & Meilensteine</h2>'
    +'<ul>'+milestonesHtml+'</ul>'
    +'<h2>Notizen</h2>'
    +'<div class="notes-box">'+(emp.notes?esc(emp.notes):'Keine Notizen vorhanden.')+'</div>'
    +'</body></html>';

  var w=window.open('','_blank');
  if(!w){alert('Popup wurde vom Browser blockiert. Bitte Popups für diese Seite erlauben.');return;}
  w.document.write(html);
  w.document.close();
  setTimeout(function(){w.print();},350);
}
function kalKlick(d){
  openSessionModal(0);
  setTimeout(function(){var el=document.getElementById('sessionDatum');if(el)el.value=d;},50);
}
function openPlannedSessionFromChip(el){
  var empId=el.dataset.eid,sessionId=el.dataset.sid,typ=el.dataset.typ,fokus=el.dataset.focus,datum=el.dataset.datum,uhrzeit=el.dataset.uhrzeit;
  var proto0=null;
  if(sessionId&&protocols[empId]){
    proto0=protocols[empId].find(function(p){return String(p.id)===String(sessionId);});
  }
  if(proto0&&proto0.groupId){openGroupSessionModal(proto0.groupId);return;}
  var proto=proto0;
  openNeuesCoachingModal(empId);
  _editingSessionId=sessionId||null;
  if(_editingSessionId&&typeof puColSet==='function')puColSet('ncSecNew',true); // Bereich „Neue Session“ direkt aufgeklappt, damit die geplante Session erfasst werden kann
  var dateEl=document.getElementById('sess-date');
  var timeEl=document.getElementById('sess-time');
  var endTimeEl=document.getElementById('sess-end-time');
  var topicEl=document.getElementById('sess-topic-sel');
  var noteEl=document.getElementById('sess-note');
  if(dateEl&&datum) dateEl.value=datum;
  if(timeEl&&uhrzeit) timeEl.value=uhrzeit;
  if(endTimeEl&&proto&&proto.endUhrzeit) endTimeEl.value=proto.endUhrzeit;
  if(typ)setCoachingTypeSelection('sess-category','sess-type',typ);
  if(topicEl&&fokus){
    for(var j=0;j<topicEl.options.length;j++){
      if(topicEl.options[j].value===fokus||topicEl.options[j].text===fokus){topicEl.selectedIndex=j;break;}
    }
  }
  if(noteEl&&proto&&proto.note) noteEl.value=proto.note;
  if(typeof sfFromSelects==='function')sfFromSelects(fokus);
}
function kalKlickMitZeit(d,hh){
  openSessionModal(0);
  setTimeout(function(){
    var elD=document.getElementById('sessionDatum');if(elD)elD.value=d;
    var elT=document.getElementById('sessionUhrzeit');if(elT)elT.value=('0'+hh).slice(-2)+':00';
  },50);
}



function emailSession(eid,datum,fokus){
  var emp=employees.find(function(e){return e.id===eid;});if(!emp)return;
  var dt=new Date(datum+'T00:00:00');
  var wt=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var mt=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var datTxt=wt[dt.getDay()]+', den '+dt.getDate()+'. '+mt[dt.getMonth()];
  var nl='%0A';
  var sub=encodeURIComponent('Coaching-Session: '+datTxt);
  var bod='Hallo '+encodeURIComponent(emp.name.split(' ')[0])+','+nl+nl+'Datum: '+encodeURIComponent(datTxt)+nl+(fokus?'Thema: '+encodeURIComponent(fokus)+nl:'')+nl+'Bitte bestätige den Termin.'+nl+nl+'Viele Grüße';
  window.location.href='mailto:?subject='+sub+'&body='+bod;
}
function setTlFilter(f){tlFilter=f;renderTab();}

function selectEmp(id){selectedEmp=id;view='emp';activeTab='performance';renderSidebar();renderMain();}
function buildEmpBannerHtml(emp){
  var dots='<div style="width:20px;height:7px;border-radius:4px;background:#F7B39A;cursor:pointer" title="Performance"></div>'
    +'<div style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:default" title="Weitere Slides folgen"></div>'
    +'<div style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:default" title="Weitere Slides folgen"></div>'
    +'<div style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:default" title="Weitere Slides folgen"></div>';
  return buildBannerSlide1Html([emp],dots,0);
}
function renderEmpDetail(){
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var c=COLORS[emp.color%COLORS.length];
  var p=protocols[emp.id]||[];
  var tc=openTaskCount(emp.id);
  // Kopf als Box: oben Name und Infos, darunter Reiter als Schalter und rechts zwei Symbol-Knöpfe auf einer Linie
  var _cc={};p.forEach(function(x){if(x.status!=='geplant'&&x.coachId)_cc[x.coachId]=(_cc[x.coachId]||0)+1;});
  var _mcId=Object.keys(_cc).sort(function(x,y){return _cc[y]-_cc[x];})[0];
  var _mc=_mcId?employees.find(function(e){return String(e.id)===String(_mcId);}):null;
  // Hinweise im Kopf: letzte Session und letzte QA-Bewertung (koralle, wenn überfällig)
  var _hT=today(),_dd=function(d){return Math.round((new Date(_hT+'T00:00:00')-new Date(d+'T00:00:00'))/86400000);};
  var _lastS=p.filter(function(x){return x.status!=='geplant'&&x.date<=_hT;}).map(function(x){return x.date;}).sort().pop();
  var _lastQ=(callRatings[emp.id]||[]).map(function(x){return x.date;}).sort().pop();
  function _hint(txt,warn){return '<span style="height:34px;display:flex;align-items:center;gap:7px;padding:0 12px;border-radius:10px;font-size:12.5px;white-space:nowrap;'+(warn?'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A':'background:#fff;border:1px solid #E4E0D6;color:var(--text2)')+'"><span style="width:8px;height:8px;border-radius:50%;background:'+(warn?'#F08566':'#3a3833')+'"></span>'+txt+'</span>';}
  var _hints='';
  if(_lastS){var _ds=_dd(_lastS);_hints+=_hint(_ds===0?'Letzte Session <b>heute</b>':'Letzte Session vor <b>'+_ds+' '+(_ds===1?'Tag':'Tagen')+'</b>',_ds>30);}
  else _hints+=_hint('<b>Noch keine Session</b>',true);
  if(_lastQ){var _dq=_dd(_lastQ),_wq=Math.round(_dq/7);_hints+=_hint(_dq<7?'QA-Bewertung <b>diese Woche</b>':'<b>'+_wq+' Wo.</b> ohne QA',_dq>60);}
  else _hints+=_hint('<b>Noch keine QA</b>',true);
  var _meta=[esc(emp.role||''),esc(emp.phase||''),emp.startDate?'seit '+emp.startDate.split('-').reverse().join('.'):'',_mc?'Coach '+esc(_mc.name.split(' ')[0]):''].filter(Boolean).join(' · ');
  document.getElementById('mainArea').innerHTML=
    '<div style="padding:22px 24px 8px;flex-shrink:0"><div style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:16px;padding:16px;box-shadow:0 12px 30px rgba(40,32,15,0.06)">'
    +'<div style="display:flex;align-items:center;gap:12px">'
    +'<div style="width:40px;height:40px;border-radius:11px;background:#EFECE5;border:1px solid #E4E0D6;color:var(--text);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+ini(emp.name)+'</div>'
    +'<div style="min-width:0"><div style="font-size:18px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(emp.name)+'</div><div style="font-size:12.5px;color:var(--text2);line-height:1.3">'+_meta+'</div></div></div>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-top:14px">'
    +'<div class="emp-seg" id="empTabBar">'
    +'<div class="tab" data-tab="performance" onclick="switchTab(\'performance\')">KPI Performance</div>'
    +'<div class="tab" data-tab="call-performance" onclick="switchTab(\'call-performance\')">QA Performance</div>'
    +'<div class="tab" data-tab="session" onclick="switchTab(\'session\')">Coaching Sessions</div>'
    +'<div class="tab" data-tab="coaching-eval" onclick="switchTab(\'coaching-eval\')">Development</div>'
    +'<div class="tab" data-tab="tasks" onclick="switchTab(\'tasks\')" id="tasksTabBtn">Task'+(tc>0?'<span class="emp-seg-badge">'+tc+'</span>':'')+'</div>'
    +'<div class="tab" data-tab="emp-settings" onclick="switchTab(\'emp-settings\')">Einstellungen</div>'
    +'</div>'
    +'<span style="margin-left:auto;display:flex;gap:6px">'+_hints+'</span>'
    +'<span style="display:flex;gap:8px">'
    +'<button class="btn btn-primary" title="Zusammenfassung (PDF)" aria-label="Zusammenfassung (PDF)" data-eid="'+emp.id+'" onclick="exportEmpSummary(this.dataset.eid)" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-file-description" style="font-size:16px"></i></button>'
    +'<button class="btn" title="Drucken" aria-label="Drucken" onclick="window.print()" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-printer" style="font-size:16px"></i></button>'
    +'</span></div></div></div>'
    +'<div class="content" id="tabContent"></div>';
  renderTabBar();
  renderTab();
}

function renderTabBar(){
  var bar=document.getElementById('empTabBar');
  if(!bar)return;
  var hid=typeof hiddenTabsForRole==='function'?hiddenTabsForRole():[];
  // Reiter Provision, Timeline und SolidRoad gibt es auf Mitarbeiterebene nicht mehr
  if(hid.indexOf(activeTab)>=0||['provision','timeline','solidroad'].indexOf(activeTab)>=0){ activeTab='performance'; setTimeout(renderTab,0); }
  bar.querySelectorAll('.tab').forEach(function(el){ el.style.display=hid.indexOf(el.dataset.tab)>=0?'none':''; });
  bar.querySelectorAll('.tab').forEach(function(el){
    el.classList.toggle('active',el.dataset.tab===activeTab);
  });
}

function switchTab(t){activeTab=t;renderTabBar();renderTab();}
// Neue Struktur, wenn ab dem Stichtag bewertet oder Produktwissen schon bewertet wurde
function qaCatsFor(rat){var sc=rat&&rat.scores||{};if(sc.produktnutzen||sc.produktfragen)return CALL_CATS;
  // Mit dem neuen Formular entstanden (keine der alten, entfallenen Punkte, mindestens ein Wert): neue Struktur
  var ks=Object.keys(sc).filter(function(k){return sc[k]>0;});if(ks.length&&!ks.some(function(k){return ['umgang','vertrauen','potenzial','klarheit','kaufsignale'].indexOf(k)>=0;}))return CALL_CATS;return rat&&rat.date&&String(rat.date)<QA_V2_FROM?CALL_CATS_V1:CALL_CATS;}
// ── „Aktuelle Bewertung im Detail“ (Entwurf C): Gesamt oben, je Kriterium ein vierstufiger Balken ──
function callDetailBodyHtml(call){
  var CATS=qaCatsFor(call);
  var sc=call.scores||{};
  function f1(x){return x.toFixed(1).replace('.',',');}
  function cAvg(cat){var v=cat.items.map(function(k){return sc[k]||0;}).filter(function(x){return x>0;});return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null;}
  var all=[];CATS.forEach(function(c){all=all.concat(c.items);});
  var rated=all.filter(function(k){return sc[k]>0;}).length;
  var ts=totalScore(call);
  var einw=CATS.find(function(c){return c.key==='einwand';}),absch=CATS.find(function(c){return c.key==='abschluss';});
  var h='<div style="display:flex;align-items:flex-end;gap:28px;flex-wrap:wrap;padding:14px 0 12px;margin-bottom:6px;border-bottom:1px solid var(--border)">'
    +'<div><div style="font-size:40px;font-weight:300;line-height:1">'+(rated?Math.round(ts)+' %':'–')+'</div><div style="font-size:12.5px;color:var(--text3);font-weight:600">Gesamtpunktzahl</div></div>';
  [einw,absch].forEach(function(c){if(!c)return;var a=cAvg(c);h+='<div><div style="font-size:28px;font-weight:300;line-height:1.05">'+(a!=null?f1(a):'–')+'</div><div style="font-size:12.5px;color:var(--text3);font-weight:600">'+esc(c.short||c.label)+' ('+Math.round(c.weight*100)+' %)</div></div>';});
  h+='<div style="margin-left:auto;display:flex;gap:14px;font-size:12px;color:var(--text2);flex-wrap:wrap">'
    +'<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#3a3833;margin-right:5px;vertical-align:-1px"></i>bewertet</span>'
    +'<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#F08566;margin-right:5px;vertical-align:-1px"></i>schwach (1)</span>'
    +'<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#E4E0D6;margin-right:5px;vertical-align:-1px"></i>offen bis 4</span>'
    +'<span style="font-weight:600">'+rated+' von '+all.length+' Kriterien bewertet</span></div></div>';
  if(!rated)h+='<div style="background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px">Für diesen Call wurden keine Einzelpunkte gespeichert. Über „Neuen Call bewerten“ bzw. Bearbeiten in der Historie kannst du die Punkte nachtragen.</div>';
  CATS.forEach(function(cat){
    var a=cAvg(cat);
    h+='<div style="display:flex;align-items:center;gap:8px;margin:14px 0 4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)">'+esc(cat.label)+' · '+Math.round(cat.weight*100)+' %'
      +'<span style="margin-left:auto;font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:10px;letter-spacing:0;text-transform:none;'+(a!=null&&a<2?'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A':'background:#fff;border:1px solid #E4E0D6;color:var(--text2)')+'">Ø '+(a!=null?f1(a):'–')+'</span></div>';
    cat.items.forEach(function(k){
      var v=sc[k]||0;
      h+='<div style="display:grid;grid-template-columns:minmax(180px,260px) 1fr 52px;align-items:center;gap:14px;height:34px;border-bottom:1px solid #eae7e0">'
        +'<span style="font-size:13.5px;color:var(--text)">'+esc(ITEM_LABELS[k]||k)+'</span>'
        +'<span style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">'+[1,2,3,4].map(function(n){return '<i style="display:block;height:10px;border-radius:5px;background:'+(v&&n<=v?(v===1?'#F08566':'#3a3833'):'#E4E0D6')+'"></i>';}).join('')+'</span>'
        +'<span style="text-align:right;font-size:14px;font-weight:600;color:'+(v===1?'#B5513A':v?'var(--text)':'var(--text3)')+'">'+(v?v+' / 4':'–')+'</span></div>';
    });
  });
  var meta=[];
  if(call.auftragsnr)meta.push('Auftrag '+esc(call.auftragsnr));
  if(call.bewertetVon)meta.push('bewertet von '+esc(call.bewertetVon));
  if(call.einwand)meta.push('Einwand: '+esc(call.einwand));
  if(call.hinweis)meta.push('Hinweis: '+esc(call.hinweis));
  if(meta.length)h+='<div style="padding:12px 0 0;font-size:12.5px;color:var(--text2)">'+meta.join(' · ')+'</div>';
  return h;
}
function catAvg(rat,cat){
  var vals=cat.items.map(function(k){return rat.scores&&rat.scores[k]?rat.scores[k]:0;}).filter(function(v){return v>0;});
  if(!vals.length)return 0;
  return vals.reduce(function(a,b){return a+b;},0)/vals.length;
}
function totalScore(rat){
  var cats=qaCatsFor(rat);
  if(cats===CALL_CATS_V1){var sum=0;cats.forEach(function(cat){sum+=catAvg(rat,cat)*cat.weight*25;});return sum;}
  var s2=0,w=0;cats.forEach(function(cat){var a=catAvg(rat,cat);if(a>0){s2+=a*cat.weight;w+=cat.weight;}});return w?s2/w*25:0;
}
// ── Bedarfserkennung: welche QA-Kategorie ist über mehrere Calls hinweg konstant schwach? ──
// Schwelle: Ø unter 2.0 von 4 (=unter 50%) UND mind. 60% der letzten Calls einzeln unter 2.0
function qaWeakSpots(empId,n){
  n=n||5;
  var callRat=(callRatings[empId]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,n);
  if(callRat.length<3)return [];
  var weak=[];
  CALL_CATS.forEach(function(cat){
    var vals=callRat.map(function(r){return catAvg(r,cat);}).filter(function(v){return v>0;});
    if(vals.length<3)return;
    var avg=vals.reduce(function(a,b){return a+b;},0)/vals.length;
    var belowCount=vals.filter(function(v){return v<2;}).length;
    if(avg<2&&belowCount>=Math.ceil(vals.length*0.6)){
      weak.push({key:cat.key,label:cat.label,avg:avg,n:vals.length,col:cat.col});
    }
  });
  return weak;
}
function qaCallsDue(empId){
  var target=QA_WEEK_TARGET;
  var t=today(),d=new Date(+t.slice(0,4),+t.slice(5,7)-1,+t.slice(8,10));d.setDate(d.getDate()-((d.getDay()+6)%7));
  var cutoff=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  var cnt=(callRatings[empId]||[]).filter(function(r){return r.date>=cutoff;}).length;
  // Neu: Ziel je Bewerter (4/Woche insgesamt). Für den Agent zählt nur, ob er diese Woche zur Bewertung vorgesehen ist.
  var open=qaOpenFor(empId);
  return {due:open,cnt:cnt,target:cnt+open};
}
function qaOpenFor(empId){if(typeof aufgAll!=='function')return 0;if(!_qaOpenC.m||Date.now()-_qaOpenC.at>1500){var m={};try{aufgAll().forEach(function(o){if(o.art==='QA-Bewertung')m[o.emp]=(m[o.emp]||0)+1;});}catch(e){}_qaOpenC={at:Date.now(),m:m};}return _qaOpenC.m[empId]||0;}

// ── RENDER TAB ──
function renderTab(){
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var tc2=document.getElementById('tabContent');
  if(!tc2)return;
  var p=protocols[emp.id]||[];
  var alerts=checkAlerts(emp.id);
  var html='';

  // ── TIMELINE TAB ──
  if(activeTab==='timeline'){

    // Kombinierte Timeline: Sessions + Reviews + KPI-Meilensteine + Highscores
    var tlEvents=[];
    (protocols[emp.id]||[]).forEach(function(s){
      var _dur=sessionDuration(s.uhrzeit,s.endUhrzeit);
      tlEvents.push({date:s.date,kind:'session',icon:'ti-message-circle',col:'#F08566',
        title:(s.type||'Session')+(s.status==='geplant'?' (geplant)':'')+(_dur?' · '+formatDuration(_dur):''),
        sub:(s.topics&&s.topics.length?s.topics.join(', '):(s.focus||''))});
    });
    (reviews[emp.id]||[]).forEach(function(r){
      var isEval=r.einwand!==undefined;
      tlEvents.push({date:r.date,kind:'review',icon:isEval?'ti-clipboard-check':'ti-calendar-event',col:'#F59A5B',
        title:isEval?'Mitarbeiterentwicklung bewertet':(r.type||'Review')+(r.status==='geplant'?' (geplant)':''),
        sub:isEval?(r.note||''):(r.rating||r.notes||'')});
    });
    kpiMilestones(emp.id).forEach(function(m){
      tlEvents.push({date:m.date,kind:'milestone',icon:'ti-trophy',col:'var(--amber-dark)',title:m.label,sub:''});
    });
    personalBestEvents(emp.id).forEach(function(p){
      tlEvents.push({date:p.date,kind:'record',icon:'ti-confetti',col:'#3a3833',title:p.label,sub:'Neuer persönlicher Bestwert 🎉'});
    });
    (employeeHistory[emp.id]||[]).forEach(function(h){
      var fieldLabel=h.field==='team'?'Team':'Rolle';
      tlEvents.push({date:h.changedAt?h.changedAt.slice(0,10):'',kind:'milestone',icon:'ti-arrows-exchange',col:'var(--text2)',
        title:fieldLabel+'-Wechsel',sub:(h.oldValue||'—')+' → '+(h.newValue||'—')});
    });
    (goals[emp.id]||[]).forEach(function(g){
      tlEvents.push({date:g.createdAt?g.createdAt.slice(0,10):'',kind:'milestone',icon:'ti-flag',col:'#F08566',
        title:'Ziel vereinbart',sub:esc(g.description)+(g.targetDate?' (bis '+fd(g.targetDate)+')':'')});
    });
    tlEvents.sort(function(a,b){return b.date.localeCompare(a.date);});

    // ── 5 Kacheln: Werdegang auf einen Blick (gleiches Format wie QA Performance: Trend + Sparkline) ──
    var tenureDays=emp.startDate?Math.floor((new Date(today()+'T00:00:00')-new Date(emp.startDate+'T00:00:00'))/86400000):null;
    var tenureTxt=tenureDays===null?'—':tenureDays<30?tenureDays+' Tage':tenureDays<365?Math.floor(tenureDays/30)+' Monate':(tenureDays/365).toFixed(1)+' Jahre';
    var sessAllDone=(protocols[emp.id]||[]).filter(function(p){return p.status!=='geplant';});
    var qaAll=(callRatings[emp.id]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
    var goalsAll=goals[emp.id]||[];
    var goalsDone=goalsAll.filter(function(g){return g.status==='done'||g.status==='erreicht';}).length;
    var perfSorted=(performance[emp.id]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
    var bestOptRow=perfSorted.reduce(function(a,r){return(r.optGesamt||0)>(a?a.optGesamt||0:-1)?r:a;},null);
    function monthKey(dateStr){return dateStr.slice(0,7);}
    function countByMonth(items,dateFn){
      var m={};items.forEach(function(it){var k=monthKey(dateFn(it));m[k]=(m[k]||0)+1;});return m;
    }
    function last6MonthsCounts(items,dateFn){
      var m=countByMonth(items,dateFn);
      var keys=Object.keys(m).sort();
      return keys.slice(-7).map(function(k){return m[k];});
    }
    var sessMonthCounts=last6MonthsCounts(sessAllDone,function(s){return s.date;});
    var qaMonthCounts=last6MonthsCounts(qaAll,function(r){return r.date;});
    function monthTrend(counts){
      if(counts.length<2)return {arrow:'',col:'var(--text3)'};
      var d=counts[counts.length-1]-counts[counts.length-2];
      return {arrow:d>0?'↑':d<0?'↓':'→',col:d>0?'var(--teal-dark)':d<0?'var(--red)':'var(--text2)'};
    }
    var sessTrend=monthTrend(sessMonthCounts),qaTrend=monthTrend(qaMonthCounts);
    var optSpark=perfSorted.slice(-7).map(function(r){return r.optGesamt;}).filter(function(v){return v!==undefined&&v!==null;});
    var LBL='font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    var SUB='font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px">';
    // Kachel 1: Bei Wiegand seit
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="'+LBL+'">DABEI SEIT</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:#F08566">'+tenureTxt+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="'+SUB+'">Start '+(emp.startDate?fd(emp.startDate):'—')+'</div>'
      +'<div style="'+SUB+';margin-top:2px">&nbsp;</div>'
      +'</div>';
    // Kachel 2: Sessions gesamt
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="'+LBL+'">SESSIONS</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="display:flex;align-items:baseline;gap:6px"><div style="font-size:20px;font-weight:700;color:#F59A5B">'+sessAllDone.length+'</div><div style="font-size:13px;font-weight:700;color:'+sessTrend.col+'">'+sessTrend.arrow+'</div></div>'
      +sparkline(sessMonthCounts,'#F59A5B',54,26)
      +'</div>'
      +'<div style="'+SUB+'">Ø/Monat '+(sessMonthCounts.length?(sessMonthCounts.reduce(function(a,b){return a+b;},0)/sessMonthCounts.length).toFixed(1):'—')+'</div>'
      +'<div style="'+SUB+';margin-top:2px">dies. Monat '+(sessMonthCounts.length?sessMonthCounts[sessMonthCounts.length-1]:0)+'</div>'
      +'</div>';
    // Kachel 3: Calls bewertet
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="'+LBL+'">QA CALLS</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="display:flex;align-items:baseline;gap:6px"><div style="font-size:20px;font-weight:700;color:#F7B39A">'+qaAll.length+'</div><div style="font-size:13px;font-weight:700;color:'+qaTrend.col+'">'+qaTrend.arrow+'</div></div>'
      +sparkline(qaMonthCounts,'#F08566',54,26)
      +'</div>'
      +'<div style="'+SUB+'">Ø/Monat '+(qaMonthCounts.length?(qaMonthCounts.reduce(function(a,b){return a+b;},0)/qaMonthCounts.length).toFixed(1):'—')+'</div>'
      +'<div style="'+SUB+';margin-top:2px">dies. Monat '+(qaMonthCounts.length?qaMonthCounts[qaMonthCounts.length-1]:0)+'</div>'
      +'</div>';
    // Kachel 4: Ziele erreicht
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="'+LBL+'">ZIELE</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:#F08566">'+goalsDone+'/'+goalsAll.length+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="'+SUB+'">'+(goalsAll.length?Math.round(goalsDone/goalsAll.length*100)+'% erreicht':'—')+'</div>'
      +'<div style="'+SUB+';margin-top:2px">offen '+(goalsAll.length-goalsDone)+'</div>'
      +'</div>';
    // Kachel 5: Bestwert Opt.
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="'+LBL+'">BESTWERT OPT.</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:#3a3833">'+(bestOptRow?Math.round(bestOptRow.optGesamt):'—')+'</div>'
      +sparkline(optSpark,'#3a3833',54,26)
      +'</div>'
      +'<div style="'+SUB+'">am '+(bestOptRow?fd(bestOptRow.date):'—')+'</div>'
      +'<div style="'+SUB+';margin-top:2px">höchster Tag</div>'
      +'</div>';
    html+='</div>';

    // ── Timeline: eine weiße Box mit Filter, Linie+Punkte im modernen Stil, Highscores türkis ──
    html+='<div class="card">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
    html+='<div class="card-title" style="margin:0"><i class="ti ti-timeline"></i> Timeline</div>';
    html+='<div class="chart-toggle">';
    [{k:'all',l:'Alle'},{k:'session',l:'Sessions'},{k:'review',l:'Reviews'},{k:'milestone',l:'Meilensteine'},{k:'record',l:'Highscores'}].forEach(function(it){
      html+='<button class="'+(tlFilter===it.k?'active':'')+'" data-f="'+it.k+'" onclick="setTlFilter(this.dataset.f)">'+it.l+'</button>';
    });
    html+='</div>';
    html+='</div>';
    var filteredEvents=tlFilter==='all'?tlEvents:tlEvents.filter(function(ev){return ev.kind===tlFilter;});
    if(!filteredEvents.length){
      html+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-timeline" style="font-size:26px;display:block;margin-bottom:8px"></i>Keine Ereignisse in dieser Ansicht</div>';
    } else {
      html+='<div style="position:relative;padding-left:22px">';
      html+='<div style="position:absolute;left:6px;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,var(--border2),var(--border))"></div>';
      filteredEvents.forEach(function(ev){
        var isRecord=ev.kind==='record';
        var rowBg=isRecord?'rgba(247,179,154,0.28)':'rgba(29,28,26,0.035)';
        var rowBorder=isRecord?'#F7B39A':'var(--border2)';
        html+='<div style="position:relative;margin-bottom:8px">';
        html+='<div style="position:absolute;left:-22px;top:13px;width:11px;height:11px;border-radius:50%;background:'+ev.col+';border:2px solid var(--bg-solid);box-shadow:0 0 0 2px '+(isRecord?'#F7B39A':'transparent')+'"></div>';
        html+='<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:'+rowBg+';border:1px solid '+rowBorder+';border-radius:var(--r-md);min-height:20px">';
        html+='<i class="ti '+ev.icon+'" style="font-size:15px;color:'+ev.col+';margin-top:1px;flex-shrink:0"></i>';
        html+='<div style="flex:1;min-width:0">';
        html+='<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span style="font-size:11px;font-weight:600;color:var(--text3)">'+fd(ev.date)+'</span><span style="font-size:14px;font-weight:600;color:var(--text)">'+esc(ev.title)+'</span></div>';
        html+='<div style="font-size:12px;color:var(--text2);margin-top:2px">'+(ev.sub||'\u00A0')+'</div>';
        html+='</div></div></div>';
      });
      html+='</div>';
    }
    html+='</div>'; // Ende Timeline-Karte
  }


  // ── PERFORMANCE TAB ──
  if(activeTab==='provision'){
    html+=buildProvisionTable(emp.id);
  }
  if(activeTab==='performance'){
    var empT=empTargets(emp);
    var perf7=getPerf(emp.id,7);
    var perfAll=(performance[emp.id]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
    var perfRangeData=empGetPerf(emp.id);
    // Chart
    html+='<div class="card" style="margin-bottom:22px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">'
      +'<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
      +'<div class="card-title" style="margin:0">Performance</div>'
      +'<div id="empChartLegend" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"></div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +'<div style="display:flex;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;height:34px">';
    [{k:'day',l:'Tag'},{k:'week',l:'Woche'},{k:'month',l:'Monat'}].forEach(function(it){
      html+='<button style="padding:0 12px;height:100%;font-size:12px;font-weight:500;border:none;cursor:pointer;font-family:inherit;background:'+(empChartGroup===it.k?'#F08566':'transparent')+';color:'+(empChartGroup===it.k?'#fff':'var(--text2)')+'" onclick="setEmpChartGroup(\''+it.k+'\')">'+it.l+'</button>';
    });
    html+='</div>'
      +'<select onchange="setEmpChartMetric(this.value)" style="width:auto;height:34px;font-size:12px;font-weight:500;padding:0 12px;border:1px solid var(--border2);border-radius:var(--r-md);background:var(--bg);color:var(--text);cursor:pointer">';
    [
      {k:'aktivitaeten',l:'Aktivitäten (NE+NM+NERR+Opt.Ges.)'},
      {k:'ne',l:'NE'},{k:'nm',l:'NM'},{k:'nerr',l:'NEF'},
      {k:'optGesamt',l:'Opt. Ges.'},
      {k:'convOEM',l:'OEM'},{k:'ups_yes',l:'UPS'},
      {k:'wka_gesamt_yes',l:'WKA (WKA OEM + WKA UPS)'},
      {k:'crOEM',l:'CR Ges.'},{k:'crTeilweise',l:'CR TW'},{k:'crYes',l:'CR YES'},
      {k:'crSyMy',l:'CR SY/MY'},{k:'crSuperYes',l:'CR SY'},{k:'crMegaYes',l:'CR MY'},
      {k:'margeGesamt',l:'Marge Gesamt'}
    ].forEach(function(it){
      html+='<option value="'+it.k+'"'+(empChartMetric===it.k?' selected':'')+'>'+it.l+'</option>';
    });
    html+='</select>'
      +'</div></div>'
      +'<div style="height:280px;position:relative"><canvas id="empPerfChart"></canvas></div>'
      +'<div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--text2)">'
      +'<span style="display:flex;align-items:center;gap:5px"><span style="width:14px;height:0;border-top:1.5px dashed rgba(29,28,26,0.35);display:inline-block"></span>Coaching zu diesem KPI (Kürzel = Coach)</span>'
      +'<span style="display:flex;align-items:center;gap:5px"><span style="width:14px;height:0;border-top:1.5px dashed rgba(140,140,140,0.6);display:inline-block"></span>Coaching zu anderem Thema</span>'
      +'</div></div>';
    html+='<div id="coachImpactPanel"></div>';
    // Tabelle: dieselbe Performance-Tabelle wie unter SFP Wiegand -> Performance, aber fest auf diesen einen Mitarbeiter eingestellt.
    // Der letzte Parameter (hideMemberCol=true) sorgt dafuer, dass buildOverviewTab hierfuer die globale
    // overviewSelectedIds-Variable komplett ignoriert - keine Interaktion mit der Team-Performance-Seite.
    // Eigener Container mit ID: Tabellen-Filter-Klicks aktualisieren NUR diesen Bereich (siehe rerenderEmpPerfTableOnly),
    // damit Banner, Diagramm und Impact-Panel dabei nicht unnoetig neu gerendert werden (kein Flackern/Neuladen-Eindruck).
    overviewRenderTarget='emp';
    html+='<div id="empPerfTableContainer">'+buildOverviewTab([emp],'performance',true,true,true)+'</div>';
  }




  // ── CALL PERFORMANCE TAB ──
  if(activeTab==='call-performance'){
    var callRat=(callRatings[emp.id]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
    var _sc=window._selCallId;
    var showCall=(_sc&&callRat.find(function(r){return r.id===_sc;}))||callRat[0]||null;
    var totalCalls=callRat.length;
    var abschlussCount=callRat.filter(function(r){return r.status==='ja';}).length;
    var avgScore=totalCalls?callRat.reduce(function(a,r){return a+totalScore(r);},0)/totalCalls:0;

    // ── Coaching-Bedarf-Banner: konstant schwache QA-Kategorien ──
    var weakSpots=qaWeakSpots(emp.id,5);
    if(weakSpots.length){
      html+='<div class="alert alert-danger" style="margin-bottom:16px">'
        +'<i class="ti ti-target-arrow" style="font-size:18px;color:var(--red);flex-shrink:0"></i>'
        +'<div><div style="font-size:13px;font-weight:600;color:var(--red)">Coaching-Bedarf erkannt</div>'
        +'<div style="font-size:12px;color:var(--red)">'+weakSpots.map(function(w){return w.label+' (Ø '+w.avg.toFixed(1)+'/4 über die letzten '+w.n+' Calls)';}).join(' · ')+'</div>'
        +'<div style="margin-top:8px"><button class="btn btn-sm btn-primary" data-eid="'+emp.id+'" data-focus="'+weakSpots[0].label+'" onclick="openSessionModalWithFocus(this.dataset.eid,this.dataset.focus)"><i class="ti ti-calendar-plus"></i> Session dazu planen</button></div>'
        +'</div></div>';
    }

    // ── QA-Übersicht: EINE Karte, links Radar, rechts Zusammenfassung, Button unten rechts ──
    html+='<div class="card" style="margin-bottom:22px">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
    html+='<div class="card-title" style="margin:0"><i class="ti ti-phone-calling"></i> QA-Übersicht <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+totalCalls+' bewertete Calls</span></div>';
    html+='</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:flex-start;margin-top:12px">';

    html+='<div>';
    html+='<div style="position:relative;height:340px"><canvas id="callRadar"></canvas></div>';
    html+='</div>';

    html+='<div>';
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    [{label:'Calls',val:totalCalls,sub:'bewertet',col:'#F08566',bg:'rgba(29,28,26,0.05)'},
     {label:'Ø Score',val:(totalCalls?avgScore.toFixed(0):0)+'/100',sub:'Gesamt',col:avgScore>=75?'#F08566':avgScore>=50?'#F59A5B':'#BD2D29',bg:avgScore>=75?'rgba(29,28,26,0.05)':avgScore>=50?'rgba(245,154,91,0.12)':'rgba(189,45,41,0.10)'},
     {label:'Abschluss',val:totalCalls?Math.round(abschlussCount/totalCalls*100)+'%':'—',sub:abschlussCount+' von '+totalCalls,col:'#F59A5B',bg:'rgba(245,154,91,0.12)'}
    ].forEach(function(k){
      html+='<div style="background:'+k.bg+';border:1px solid '+k.col+';border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between">';
      html+='<div><div style="font-size:11px;font-weight:700;color:'+k.col+'">'+k.label.toUpperCase()+'</div><div style="font-size:11px;color:'+k.col+';opacity:0.7;margin-top:1px">'+k.sub+'</div></div>';
      html+='<div style="font-size:20px;font-weight:700;color:'+k.col+'">'+k.val+'</div>';
      html+='</div>';
    });
    html+='</div>';
    html+='</div>';

    html+='</div>'; // Ende 2-Spalten-Grid

    html+='<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;align-items:center">';
    if(callRat.length>1){
      html+='<select onchange="window._selCallId=this.value;renderTab()" style="width:auto;font-size:13px;font-weight:500;padding:7px 13px;border:1px solid var(--border2);border-radius:var(--r-md);background:rgba(255,255,255,0.5);color:var(--text);cursor:pointer;font-family:inherit">';
      callRat.forEach(function(r,i){
        var sel=(showCall&&r.id===showCall.id)?' selected':'';
        html+='<option value="'+r.id+'"'+sel+'>'+r.date+(i===0?' ★':'')+'</option>';
      });
      html+='</select>';
    }
    html+='<button class="btn btn-primary" data-eid="'+emp.id+'" onclick="openQaBewertungModal(this.dataset.eid)"><i class="ti ti-phone-plus"></i> Neuen Call bewerten</button>';
    html+='</div>';
    html+='</div>'; // Ende Karte

    // ── Aktuelle Bewertung im Detail (einklappbar) ──
    html+='<div class="card" style="margin-bottom:22px;padding:0;overflow:hidden">';
    html+='<div onclick="var b=document.getElementById(\'callDetailBody\');var a=document.getElementById(\'callDetailArrow\');var open=b.style.display!==\'none\';b.style.display=open?\'none\':\'block\';a.style.transform=open?\'rotate(0deg)\':\'rotate(180deg)\';" style="padding:12px 17px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">';
    html+='<span class="card-title" style="margin:0"><i class="ti ti-list-details"></i> Aktuelle Bewertung im Detail'+(showCall?' <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+fd(showCall.date)+'</span>':'')+'</span>';
    html+='<span id="callDetailArrow" style="color:var(--text3);font-size:13px;transition:transform .2s">▾</span>';
    html+='</div>';
    html+='<div id="callDetailBody" style="display:none;border-top:1px solid var(--border);padding:0 17px 14px">';
    if(showCall){
      html+=callDetailBodyHtml(showCall);
    } else {
      html+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-phone" style="font-size:26px;display:block;margin-bottom:8px"></i>Noch keine Bewertung vorhanden</div>';
    }
    html+='</div></div>'; // Ende Body + Karte

    // ── Bewertungs-Historie ──
    html+='<div class="card">';
    html+='<div class="card-title"><i class="ti ti-history"></i> Bewertungs-Historie <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">('+callRat.length+')</span></div>';
    if(!callRat.length){
      html+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-phone-off" style="font-size:26px;display:block;margin-bottom:8px"></i>Noch keine Bewertungen<div style="margin-top:10px"><button class="btn btn-sm btn-primary" data-eid="'+emp.id+'" onclick="openQaBewertungModal(this.dataset.eid)"><i class="ti ti-plus"></i> Jetzt bewerten</button></div></div>';
    } else {
      html+='<div style="display:flex;flex-direction:column;gap:6px">';
      callRat.forEach(function(r,rdx){
        var cardId='cr'+emp.id+'x'+rdx;
        var hasPts=r.scores&&Object.keys(r.scores).some(function(k){return r.scores[k]>0;});
        var ts=totalScore(r),lo=hasPts&&ts<50;
        html+='<div>';
        html+='<div class="sess-hdr" data-eid="'+cardId+'" onclick="toggleSessCard(this.dataset.eid)" style="display:flex;align-items:center;gap:12px;height:52px;padding:0 12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5;cursor:pointer;user-select:none">';
        html+='<span style="width:110px;font-size:13.5px;white-space:nowrap">'+fd(r.date)+'</span>';
        html+='<span style="font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;background:#fff;border:1px solid #E4E0D6;color:var(--text2);white-space:nowrap">'+esc(r.b2b||'B2C')+'</span>';
        html+=(r.status==='ja'
          ?'<span style="font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;background:#fff;border:1px solid #E4E0D6;color:var(--text2);white-space:nowrap">✓ Abschluss'+(r.abschlussArt?' · Opt.: '+esc(r.abschlussArt):'')+'</span>'
          :'<span style="font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A;white-space:nowrap">✕ Kein Abschluss</span>');
        html+='<span style="margin-left:auto;display:flex;align-items:center;gap:10px">';
        if(hasPts)html+='<span style="width:120px;height:8px;border-radius:4px;background:#E4E0D6;overflow:hidden"><i style="display:block;height:100%;width:'+Math.max(2,Math.min(100,ts))+'%;border-radius:4px;background:'+(lo?'#F08566':'#3a3833')+'"></i></span>'
          +'<span style="width:48px;text-align:right;font-size:14px;font-weight:600;color:'+(lo?'#B5513A':'var(--text)')+'">'+Math.round(ts)+' %</span>';
        else html+='<span style="font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;background:#fff;border:1px solid #E4E0D6;color:var(--text2)">keine Punkte</span>';
        if(canEditHistorie())html+='<button class="btn btn-sm" title="Bearbeiten" data-eid="'+emp.id+'" data-rid="'+r.id+'" onclick="event.stopPropagation();openQaBewertungModal(this.dataset.eid,this.dataset.rid)" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-pencil"></i></button>';
        if(canEditHistorie())html+='<button class="btn btn-sm" title="Löschen" data-eid="'+emp.id+'" data-rid="'+r.id+'" onclick="event.stopPropagation();deleteHistorieCallRating(this.dataset.eid,this.dataset.rid)" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-trash"></i></button>';
        html+='<span id="arr-'+cardId+'" style="width:34px;height:34px;border-radius:var(--r-md);border:1px solid var(--border2);background:#F7F5F0;display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:12px;transition:transform .2s">▾</span></span></div>';
        html+='<div id="body-'+cardId+'" style="display:none;border:1px solid #E4E0D6;border-top:none;border-radius:0 0 10px 10px;background:#F7F5F0;margin:-1px 8px 0;padding:14px 14px 10px">';
        if(!hasPts)html+='<div style="font-size:13px;color:var(--text2);padding:2px 0 8px">Für diesen Call wurden keine Einzelpunkte gespeichert.</div>';
        else qaCatsFor(r).forEach(function(cat){ // B8: Kategorien passend zum Bewertungsstand (vor/nach 11.11.)
          var v=catAvg(r,cat);
          var rv=Math.round(v);
          html+='<div style="display:grid;grid-template-columns:minmax(170px,220px) 1fr 48px;align-items:center;gap:14px;height:30px;border-bottom:1px solid #eae7e0;font-size:13.5px">'
            +'<span>'+esc(cat.label)+' <span style="color:var(--text3);font-size:12px">'+Math.round(cat.weight*100)+' %</span></span>'
            +'<span style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">'+[1,2,3,4].map(function(n){return '<i style="display:block;height:9px;border-radius:5px;background:'+(v&&n<=rv?(v<1.5?'#F08566':'#3a3833'):'#E4E0D6')+'"></i>';}).join('')+'</span>'
            +'<span style="text-align:right;font-weight:600;color:'+(v&&v<1.5?'#B5513A':v?'var(--text)':'var(--text3)')+'">'+(v?v.toFixed(1).replace('.',','):'–')+'</span></div>';
        });
        var meta=['Bewertet von '+esc(r.bewertetVon||'—'),'Auftrag '+esc(r.auftragsnr||'—')];
        if(r.einwand)meta.push('Einwand: '+esc(r.einwand));
        if(r.hinweis)meta.push('Hinweis: '+esc(r.hinweis));
        html+='<div style="font-size:12.5px;color:var(--text2);margin-top:8px">'+meta.join(' · ')+'</div>';
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='</div>'; // Ende Historie-Karte

    // ── Chart.js Radar (exakt wie Coaching) ──
    (function(rats,cats){
      setTimeout(function(){
        var canvas=document.getElementById('callRadar');
        if(!canvas)return;
        if(canvas._ci){canvas._ci.destroy();}
        var avgData=cats.map(function(cat){
          if(!rats.length)return 0;
          return rats.reduce(function(a,r){return a+catAvg(r,cat);},0)/rats.length;
        });
        canvas._ci=new Chart(canvas,{
          type:'radar',
          data:{
            labels:cats.map(function(c){return c.short;}),
            datasets:[{
              data:avgData,
              backgroundColor:'rgba(60,60,100,0.07)',
              borderColor:'rgba(60,60,100,0.7)',
              borderWidth:2,
              pointBackgroundColor:cats.map(function(c){return c.col;}),
              pointBorderColor:'white',
              pointBorderWidth:1.5,
              pointRadius:5,
              pointHoverRadius:7,
              fill:true
            }]
          },
          options:{
            responsive:true,
            maintainAspectRatio:false,
            scales:{r:{
              min:0,max:4,
              ticks:{stepSize:1,font:{size:9},color:'rgba(0,0,0,0.3)',backdropColor:'transparent'},
              grid:{color:'rgba(0,0,0,0.06)'},
              angleLines:{color:'rgba(0,0,0,0.07)'},
              pointLabels:{font:{size:10,weight:'600'},color:function(ctx){return cats[ctx.index].col;}}
            }},
            plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.raw.toFixed(1)+' / 4';}}}}
          }
        });
      },120);
    })(showCall?[showCall]:[],qaCatsFor(showCall)); // B8
  }


  // ── COACHING EVAL TAB ──
  if(activeTab==='coaching-eval'){
    var DIMS=[
      {key:'opener',    label:'Einstieg',            short:'Einstieg',   cat:'skill'},
      {key:'einwand',   label:'Einwandsentkräftung', short:'Einwand',    cat:'skill'},
      {key:'loop',      label:'Loop',                short:'Loop',       cat:'skill'},
      {key:'bedarf',    label:'Bedarfserweiterung',  short:'Bedarf',     cat:'skill'},
      {key:'produkt',   label:'Produktwissen',       short:'Produktw.',  cat:'skill'},
      {key:'abschluss', label:'Abschluss',           short:'Abschluss',  cat:'skill'},
      {key:'gespraech', label:'Gesprächsführung',    short:'Gesprächsf.',cat:'skill'},
      {key:'zusammenfassung',label:'Zusammenfassung',short:'Zusammenf.', cat:'skill'},
      {key:'motivation',label:'Motivation',          short:'Motivation', cat:'will'},
      {key:'coach',     label:'Coachability',        short:'Coachab.',   cat:'will'},
      {key:'zuverl',    label:'Zuverlässigkeit',      short:'Zuverl.',    cat:'will'},
      {key:'team',      label:'Teamfähigkeit',        short:'Teamf.',     cat:'will'},
      {key:'crOEM',     label:'CR OEM',              short:'CR OEM',     cat:'result'},
      {key:'crTW',      label:'TW',                  short:'TW',         cat:'result'},
      {key:'crSY',      label:'SY',                  short:'SY',         cat:'result'},
      {key:'crMY',      label:'MY',                  short:'MY',         cat:'result'},
    ];
    var CCAT={
      skill: {col:'#F08566', fill:'rgba(29,28,26,0.05)',  l:'Skill'},
      will:  {col:'#F59A5B', fill:'rgba(245,154,91,0.12)', l:'Will'},
      result:{col:'#F7B39A', fill:'rgba(247,179,154,0.18)',  l:'Result'}
    };
    var evals=(reviews[emp.id]||[]).filter(function(r){return r.einwand!==undefined;})
                .slice().sort(function(a,b){return b.date.localeCompare(a.date);});
    var _selDate=window._evalDate;
    var showEval=(_selDate&&evals.find(function(e){return e.date===_selDate;}))||evals[0]||null;

    // ── Entwicklungsprofil: EINE Karte, links Radar, rechts Skill/Will/Result, Button+Auswahl unten rechts ──
    html+='<div class="card" style="margin-bottom:22px">';
    html+='<div class="card-title"><i class="ti ti-chart-radar"></i> Entwicklungsprofil <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+evals.length+' Bewertungen</span></div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:flex-start;margin-top:12px">';

    html+='<div>';
    html+='<div style="position:relative;height:340px"><canvas id="radarChart"></canvas></div>';
    html+='</div>';

    html+='<div>';
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    if(showEval){
      ['skill','will','result'].forEach(function(cat){
        var cdims=DIMS.filter(function(d){return d.cat===cat;});
        var avg=(cdims.reduce(function(a,d){return a+(showEval[d.key]||0);},0)/cdims.length).toFixed(1);
        html+='<div style="background:'+CCAT[cat].fill+';border:1px solid '+CCAT[cat].col+';border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between">';
        html+='<div><div style="font-size:11px;font-weight:700;color:'+CCAT[cat].col+'">'+CCAT[cat].l.toUpperCase()+'</div><div style="font-size:11px;color:'+CCAT[cat].col+';opacity:0.7;margin-top:1px">von 10</div></div>';
        html+='<div style="font-size:20px;font-weight:700;color:'+CCAT[cat].col+'">'+avg+'</div>';
        html+='</div>';
      });
    } else {
      html+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-chart-radar" style="font-size:26px;display:block;margin-bottom:8px"></i>Noch keine Bewertung</div>';
    }
    html+='</div>';
    html+='</div>';

    html+='</div>'; // Ende 2-Spalten-Grid

    html+='<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end;align-items:center">';
    if(evals.length>1){
      html+='<select onchange="setEvalDate(this.value)" style="width:auto;font-size:13px;font-weight:500;padding:7px 13px;border:1px solid var(--border2);border-radius:var(--r-md);background:rgba(255,255,255,0.5);color:var(--text);cursor:pointer;font-family:inherit">';
      evals.forEach(function(ev,i){
        var sel=(showEval&&ev.date===showEval.date)?' selected':'';
        html+='<option value="'+ev.date+'"'+sel+'>'+fd(ev.date)+(i===0?' ★':'')+'</option>';
      });
      html+='</select>';
    }
    html+='<button class="btn btn-primary" data-eid="'+emp.id+'" onclick="openCoachingEval(this.dataset.eid)"><i class="ti ti-clipboard-plus"></i> Mitarbeiterentwicklung bewerten</button>';
    html+='</div>';
    html+='</div>'; // Ende Entwicklungsprofil-Karte

    // ── Aktuelle Bewertung im Detail (einklappbar) ──
    html+='<div class="card" style="margin-bottom:22px;padding:0;overflow:hidden">';
    html+='<div onclick="var b=document.getElementById(\'evalDetailBody\');var a=document.getElementById(\'evalDetailArrow\');var open=b.style.display!==\'none\';b.style.display=open?\'none\':\'block\';a.style.transform=open?\'rotate(0deg)\':\'rotate(180deg)\';" style="padding:12px 17px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">';
    html+='<span class="card-title" style="margin:0"><i class="ti ti-list-details"></i> Aktuelle Bewertung im Detail'+(showEval?' <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+fd(showEval.date)+'</span>':'')+'</span>';
    html+='<span id="evalDetailArrow" style="color:var(--text3);font-size:13px;transition:transform .2s">▾</span>';
    html+='</div>';
    html+='<div id="evalDetailBody" style="display:none;border-top:1px solid var(--border)">';
    if(showEval){
      ['skill','will','result'].forEach(function(cat){
        var cdims=DIMS.filter(function(d){return d.cat===cat;});
        html+='<div style="padding:5px 17px;background:'+CCAT[cat].fill+'">';
        html+='<span style="font-size:10px;font-weight:700;color:'+CCAT[cat].col+'">'+CCAT[cat].l.toUpperCase()+'</span></div>';
        cdims.forEach(function(d){
          var v=showEval[d.key]||0;
          var bc=v>=7?'var(--teal-dark)':v>=4?CCAT[cat].col:'var(--amber-dark)';
          html+='<div style="padding:7px 17px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px">';
          html+='<div style="width:150px;font-size:12px;flex-shrink:0">'+d.label+'</div>';
          html+='<div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">';
          html+='<div style="height:100%;width:'+(v*10)+'%;background:'+bc+';border-radius:3px"></div></div>';
          html+='<div style="width:22px;text-align:right;font-size:13px;font-weight:700;color:'+bc+'">'+v+'</div>';
          html+='</div>';
        });
      });
      if(showEval.note){
        html+='<div style="padding:10px 17px;border-top:1px solid var(--border);font-size:12px;color:var(--text2);background:var(--bg2)"><i class="ti ti-notes" style="margin-right:5px"></i>'+esc(showEval.note)+'</div>';
      }
    } else {
      html+='<div style="text-align:center;color:var(--text3);padding:24px">Noch keine Bewertung vorhanden</div>';
    }
    html+='</div></div>'; // Ende Body + Karte

    // ── Ziele (strukturierte Zielvereinbarungen) ──
    (function(){
      var empGoals=(goals[emp.id]||[]).slice().sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
      html+='<div class="card" style="margin-bottom:22px">';
      html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
      html+='<div class="card-title" style="margin:0"><i class="ti ti-flag"></i> Zielvereinbarungen</div>';
      html+='<button class="btn btn-primary" data-eid="'+emp.id+'" onclick="openGoalInPopup(this.dataset.eid)"><i class="ti ti-plus"></i> Neues Ziel</button>';
      html+='</div>';
      if(!empGoals.length){
        html+='<div style="font-size:12px;color:var(--text3);text-align:center;padding:14px">Noch keine Ziele vereinbart</div>';
      } else {
        html+='<div style="display:flex;flex-direction:column;gap:8px">';
        empGoals.forEach(function(g){
          var statusCol={offen:'var(--text2)','in Arbeit':'var(--amber-dark)',erreicht:'var(--teal-dark)',verfehlt:'var(--red)'}[g.status]||'var(--text2)';
          var statusBg={offen:'var(--bg2)','in Arbeit':'var(--amber-bg)',erreicht:'var(--teal-bg)',verfehlt:'var(--red-bg)'}[g.status]||'var(--bg2)';
          var metaParts=[];
          if(g.targetDate)metaParts.push('Ziel-Datum: '+fd(g.targetDate));
          if(g.metricKey){
            var recentP=getPerf(emp.id,30);
            // B1: CR aus Rohzahlen der 30 Tage (erst summieren, dann teilen)
            var curVal=goalIsDev(g.metricKey)?goalDevVal(emp.id,String(g.metricKey).slice(4)):perfKpiWin(emp,recentP,g.metricKey);
            var _gu=goalUnit(g.metricKey);
            metaParts.push('Aktuell (Ø 30 Tage): '+(curVal!=null?(Math.round(curVal*10)/10).toString().replace('.',',')+_gu:'—')+' → Ziel: '+g.targetValue+_gu+' ('+focusMetricLabel(g.metricKey)+')');
          }
          html+='<div style="background:var(--s-tint);border:1px solid var(--border2);border-radius:var(--r-md);padding:12px 14px">'
            +'<div style="display:flex;align-items:center;gap:10px">'
            +'<div style="flex:1;font-size:13px;font-weight:600">'+esc(g.description)+'</div>'
            +'<select data-id="'+g.id+'" onchange="updateGoalStatus(this.dataset.id,this.value)" style="width:auto;flex-shrink:0;font-size:11px;font-weight:600;padding:4px 8px;border:none;border-radius:20px;background:'+statusBg+';color:'+statusCol+'">'
            +['offen','in Arbeit','erreicht','verfehlt'].map(function(s){return '<option'+(g.status===s?' selected':'')+'>'+s+'</option>';}).join('')
            +'</select>'
            +'<button class="btn btn-sm" data-id="'+g.id+'" onclick="deleteGoal(this.dataset.id)" style="color:var(--red);flex-shrink:0"><i class="ti ti-trash"></i></button>'
            +'</div>'
            +(metaParts.length?'<div style="font-size:11px;color:var(--text3);margin-top:6px">'+metaParts.join(' · ')+'</div>':'')
            +'</div>';
        });
        html+='</div>';
      }
      html+='</div>';
    })();

    // ── Bewertungs-Historie (weiße Box, aufklappbare Zeilen) ──
    var comments=(reviews[emp.id]||[]).filter(function(r){return r.isComment;});
    var historyItems=evals.map(function(ev){return {type:'eval',data:ev};})
      .concat(comments.map(function(c){return {type:'comment',data:c};}))
      .sort(function(a,b){return b.data.date.localeCompare(a.data.date);});
    html+='<div class="card" style="margin-bottom:22px">';
    html+='<div class="card-title"><i class="ti ti-history"></i> Bewertungs-Historie <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">('+historyItems.length+')</span></div>';
    if(!historyItems.length){
      html+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-clipboard-off" style="font-size:26px;display:block;margin-bottom:8px"></i>Noch keine Bewertungen</div>';
    } else {
      html+='<div style="display:flex;flex-direction:column;gap:6px">';
      var CHIP='font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;background:#fff;border:1px solid #E4E0D6;color:var(--text2)';
      var IB='width:34px;height:34px;padding:0;justify-content:center;flex-shrink:0';
      var ROW='display:flex;align-items:center;gap:12px;height:52px;padding:0 12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5';
      historyItems.forEach(function(item,idx){
        if(item.type==='comment'){
          var c=item.data;
          var cl=String(c.commentType||'diverses');cl=cl.charAt(0).toUpperCase()+cl.slice(1);
          html+='<div style="'+ROW+'" title="'+esc(c.note||'')+'">'
            +'<span style="width:110px;font-size:13.5px;white-space:nowrap;flex-shrink:0">'+fd(c.date)+'</span>'
            +'<span style="'+CHIP+'">Kommentar · '+esc(cl)+'</span>'
            +'<span style="flex:1;min-width:0;font-size:13.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.note||'')+'</span>'
            +(c.author?'<span style="font-size:12.5px;color:var(--text3);white-space:nowrap">'+esc(c.author)+'</span>':'')
            +(canEditHistorie()?'<button class="btn btn-sm" title="Löschen" data-eid="'+emp.id+'" data-cid="'+c.id+'" onclick="event.stopPropagation();deleteHistorieComment(this.dataset.eid,this.dataset.cid)" style="'+IB+'"><i class="ti ti-trash"></i></button>':'')
            +'<span style="width:34px;flex-shrink:0"></span>'
            +'</div>';
          return;
        }
        var ev=item.data;
        var eid='ev'+emp.id+'x'+idx;
        var ov=DIMS.reduce(function(a,d){return a+(ev[d.key]||0);},0)/DIMS.length;
        var lo=ov<4;
        html+='<div>';
        html+='<div class="sess-hdr" data-eid="'+eid+'" onclick="toggleSessCard(this.dataset.eid)" style="'+ROW+';cursor:pointer;user-select:none">';
        html+='<span style="width:110px;font-size:13.5px;white-space:nowrap;flex-shrink:0">'+fd(ev.date)+'</span>';
        html+='<span style="'+CHIP+'">Mitarbeiterentwicklung</span>';
        html+='<span style="margin-left:auto;display:flex;align-items:center;gap:10px">';
        html+='<span style="width:120px;height:8px;border-radius:4px;background:#E4E0D6;overflow:hidden"><i style="display:block;height:100%;width:'+Math.max(2,ov*10)+'%;border-radius:4px;background:'+(lo?'#F08566':'#3a3833')+'"></i></span>';
        html+='<span style="width:64px;text-align:right;font-size:14px;font-weight:600;white-space:nowrap;color:'+(lo?'#B5513A':'var(--text)')+'">Ø '+ov.toFixed(1).replace('.',',')+'</span>';
        if(canEditHistorie())html+='<button class="btn btn-sm" title="Bearbeiten" data-eid="'+emp.id+'" data-vid="'+ev.id+'" onclick="event.stopPropagation();openCoachingEval(this.dataset.eid,this.dataset.vid)" style="'+IB+'"><i class="ti ti-pencil"></i></button>';
        if(canEditHistorie())html+='<button class="btn btn-sm" title="Löschen" data-eid="'+emp.id+'" data-vid="'+ev.id+'" onclick="event.stopPropagation();deleteHistorieEval(this.dataset.eid,this.dataset.vid)" style="'+IB+'"><i class="ti ti-trash"></i></button>';
        html+='<span id="arr-'+eid+'" style="width:34px;height:34px;flex-shrink:0;border-radius:var(--r-md);border:1px solid var(--border2);background:#F7F5F0;display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:12px;transition:transform .2s">▾</span></span></div>';
        html+='<div id="body-'+eid+'" style="display:none;border:1px solid #E4E0D6;border-top:none;border-radius:0 0 10px 10px;background:#F7F5F0;margin:-1px 8px 0;padding:6px 14px 10px">';
        ['skill','will','result'].forEach(function(cat){
          var cdims=DIMS.filter(function(d){return d.cat===cat;});
          var cav=cdims.reduce(function(a,d){return a+(ev[d.key]||0);},0)/(cdims.length||1);
          html+='<div style="display:flex;align-items:center;gap:8px;margin:10px 0 4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)">'+esc(CCAT[cat].l)
            +'<span style="margin-left:auto;font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:10px;letter-spacing:0;text-transform:none;'+(cav<4?'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A':'background:#fff;border:1px solid #E4E0D6;color:var(--text2)')+'">Ø '+cav.toFixed(1).replace('.',',')+'</span></div>';
          cdims.forEach(function(d){
            var v=ev[d.key]||0;
            html+='<div style="display:grid;grid-template-columns:minmax(170px,220px) 1fr 56px;align-items:center;gap:14px;height:30px;border-bottom:1px solid #eae7e0;font-size:13.5px">'
              +'<span>'+esc(d.label)+'</span>'
              +'<span style="height:9px;border-radius:5px;background:#E4E0D6;overflow:hidden"><i style="display:block;height:100%;border-radius:5px;width:'+(v*10)+'%;background:'+(v&&v<4?'#F08566':'#3a3833')+'"></i></span>'
              +'<span style="text-align:right;font-weight:600;color:'+(v&&v<4?'#B5513A':v?'var(--text)':'var(--text3)')+'">'+(v?v+' / 10':'–')+'</span></div>';
          });
        });
        if(ev.note)html+='<div style="font-size:12.5px;color:var(--text2);margin-top:8px">Notiz: '+esc(ev.note)+'</div>';
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='</div>'; // Ende Bewertungs-Historie-Karte

    // ── Chart.js: NUR eine Linie, farbige Punkte ──
    if(showEval){
      (function(ev,dims,ccat){
        setTimeout(function(){
          var canvas=document.getElementById('radarChart');
          if(!canvas)return;
          if(canvas._ci){canvas._ci.destroy();}
          canvas._ci=new Chart(canvas,{
            type:'radar',
            data:{
              labels:dims.map(function(d){return d.short;}),
              datasets:[{
                data:dims.map(function(d){return ev[d.key]||0;}),
                backgroundColor:'rgba(60,60,100,0.07)',
                borderColor:'rgba(60,60,100,0.7)',
                borderWidth:2,
                pointBackgroundColor:dims.map(function(d){return ccat[d.cat].col;}),
                pointBorderColor:'white',
                pointBorderWidth:1.5,
                pointRadius:5,
                pointHoverRadius:7,
                fill:true
              }]
            },
            options:{
              responsive:true,
              maintainAspectRatio:false,
              scales:{r:{
                min:0,max:10,
                ticks:{stepSize:2,font:{size:9},color:'rgba(0,0,0,0.3)',backdropColor:'transparent'},
                grid:{color:'rgba(0,0,0,0.06)'},
                angleLines:{color:'rgba(0,0,0,0.07)'},
                pointLabels:{
                  font:{size:10,weight:'600'},
                  color:function(ctx){return ccat[dims[ctx.index].cat].col;}
                }
              }},
              plugins:{
                legend:{display:false},
                tooltip:{callbacks:{label:function(ctx){return ' '+ctx.raw+'/10';}}}
              }
            }
          });
        },120);
      })(showEval,DIMS,CCAT);
    }

  }


  // ── SESSION TAB ──
  // ── SESSION TAB ──
  if(activeTab==='session'){
    // SESSION_TYPES/SESSION_TOPICS sind jetzt global (siehe oben)
    // Gleiche DIMS wie Coaching Tab
    var SDIMS=[
      {key:'Einstieg',           short:'Einstieg',   cat:'skill'},
      {key:'Einwandsentkräftung',short:'Einwand',    cat:'skill'},
      {key:'Loop',               short:'Loop',       cat:'skill'},
      {key:'Bedarfserweiterung', short:'Bedarf',     cat:'skill'},
      {key:'Abschluss',          short:'Abschluss',  cat:'skill'},
      {key:'Gesprächsführung',   short:'Gesprächsf.',cat:'skill'},
      {key:'Zusammenfassung',    short:'Zusammenf.', cat:'skill'},
      {key:'Produktwissen',      short:'Produktw.',  cat:'skill'},
      {key:'Motivation',         short:'Motivation', cat:'will'},
      {key:'Coachability',       short:'Coachab.',   cat:'will'},
      {key:'Zuverlässigkeit',    short:'Zuverl.',    cat:'will'},
      {key:'Teamfähigkeit',      short:'Teamf.',     cat:'will'},
      {key:'CR OEM',             short:'CR OEM',     cat:'result'},
      {key:'CR TW',                 short:'CR TW',         cat:'result'},
      {key:'CR SY',                 short:'CR SY',         cat:'result'},
      {key:'CR MY',                 short:'CR MY',         cat:'result'},
    ];
    // Gleiche Farben wie Coaching Tab
    var SCCAT={
      skill: {col:'#F08566',fill:'rgba(29,28,26,0.075)',  bg:'rgba(29,28,26,0.05)', l:'Skill'},
      will:  {col:'#F59A5B',fill:'rgba(245,154,91,0.15)', bg:'rgba(245,154,91,0.12)', l:'Will'},
      result:{col:'#F7B39A',fill:'rgba(247,179,154,0.15)',  bg:'rgba(247,179,154,0.18)', l:'Result'}
    };
    var sessions=(protocols[emp.id]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
    var completedSessions=sessions.filter(function(s){return s.status!=='geplant'||s.date<=today();});
    var doneSessions=sessions.filter(function(s){return s.status!=='geplant';}); // B9: überfällige geplante zählen nicht als abgeschlossen
    var plannedSessions=sessions.filter(function(s){return s.status==='geplant'&&s.date>today();}).sort(function(a,b){return a.date.localeCompare(b.date);});

    // Zähle abgeschlossene Sessions pro Topic (geplante zählen noch nicht mit)
    var tc={};SDIMS.forEach(function(d){tc[d.key]=0;});
    doneSessions.forEach(function(s){(s.topics||[]).forEach(function(t){t=TOPIC_ALIAS[t]||t;if(tc[t]!==undefined)tc[t]++;});});
    var maxVal=Math.max(1,Math.max.apply(null,SDIMS.map(function(d){return tc[d.key];})));
    var catSum={skill:0,will:0,result:0};
    SDIMS.forEach(function(d){catSum[d.cat]+=tc[d.key];});

    // ── Coaching-Übersicht: EINE Karte, links Spinnendiagramm + Aktionen, rechts Zusammenfassung (oben) ──
    html+='<div class="card" style="margin-bottom:22px">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
    html+='<div class="card-title" style="margin:0"><i class="ti ti-chart-radar"></i> Coaching-Übersicht <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+doneSessions.length+' abgeschlossene Sessions</span></div>';
    html+='</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:flex-start;margin-top:12px">';

    html+='<div>';
    html+='<div style="position:relative;height:340px"><canvas id="sessRadar"></canvas></div>';
    html+='</div>';

    html+='<div>';
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    ['skill','will','result'].forEach(function(cat){
      var s=catSum[cat];
      var catDurMin=doneSessions.filter(function(sess){
        return (sess.topics||[]).some(function(t){t=TOPIC_ALIAS[t]||t;var dim=SDIMS.find(function(d){return d.key===t;});return dim&&dim.cat===cat;});
      }).reduce(function(sum,sess){return sum+(sessionDuration(sess.uhrzeit,sess.endUhrzeit)||0);},0);
      html+='<div style="background:'+SCCAT[cat].bg+';border:1px solid '+SCCAT[cat].col+';border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between">';
      html+='<div><div style="font-size:11px;font-weight:700;color:'+SCCAT[cat].col+'">'+SCCAT[cat].l.toUpperCase()+'</div><div style="font-size:11px;color:'+SCCAT[cat].col+';opacity:0.7;margin-top:1px">'+s+' Sessions'+(catDurMin?' · '+formatDuration(catDurMin):'')+'</div></div>';
      html+='<div style="font-size:20px;font-weight:700;color:'+SCCAT[cat].col+'">'+s+'</div>';
      html+='</div>';
    });
    (function(){
      var totalDurationMin=doneSessions.reduce(function(sum,s){return sum+(sessionDuration(s.uhrzeit,s.endUhrzeit)||0);},0);
      html+='<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between">';
      html+='<div><div style="font-size:11px;font-weight:700;color:var(--text)">GESAMT</div><div style="font-size:11px;color:var(--text2);opacity:0.8;margin-top:1px">'+doneSessions.length+' Sessions'+(totalDurationMin?' · '+formatDuration(totalDurationMin):'')+'</div></div>';
      html+='<div style="font-size:20px;font-weight:700;color:var(--text)">'+doneSessions.length+'</div>';
      html+='</div>';
    })();
    html+='</div>';
    html+='</div>';

    html+='</div>'; // Ende 2-Spalten-Grid

    html+='<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">';
    html+='<button class="btn" data-eid="'+emp.id+'" onclick="openSessionModal(this.dataset.eid)"><i class="ti ti-calendar-event"></i> Session planen</button>';
    html+='<button class="btn btn-primary" data-eid="'+emp.id+'" onclick="openNeuesCoachingModal(this.dataset.eid)"><i class="ti ti-calendar-plus"></i> Neue Session erfassen</button>';
    html+='</div>';

    html+='</div>'; // Ende Karte

    // ── Alle Coachings im Detail (Themen-Aufschlüsselung, einklappbar) ──
    html+='<div class="card" style="margin-bottom:22px;padding:0;overflow:hidden">';
    html+='<div onclick="var b=document.getElementById(\'topicDetailBody\');var a=document.getElementById(\'topicDetailArrow\');var open=b.style.display!==\'none\';b.style.display=open?\'none\':\'block\';a.style.transform=open?\'rotate(0deg)\':\'rotate(180deg)\';" style="padding:12px 17px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">';
    html+='<span class="card-title" style="margin:0"><i class="ti ti-list-details"></i> Alle Coachings im Detail</span>';
    html+='<span id="topicDetailArrow" style="color:var(--text3);font-size:13px;transition:transform .2s">▾</span>';
    html+='</div>';
    html+='<div id="topicDetailBody" style="display:none;border-top:1px solid var(--border);padding:0 17px 14px">';
    // Entwurf A: Skill, Will, Result nebeneinander, je Thema ein kurzer Balken mit Anzahl, Summe statt Ø
    var _tMax=1;SDIMS.forEach(function(d){_tMax=Math.max(_tMax,tc[d.key]||0);});
    html+='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px">';
    ['skill','will','result'].forEach(function(cat){
      var cdims=SDIMS.filter(function(d){return d.cat===cat;});
      var sum=cdims.reduce(function(a,d){return a+(tc[d.key]||0);},0);
      html+='<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:12px 14px">';
      html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:14px;font-weight:700">'+SCCAT[cat].l+'</b>'
        +'<span style="margin-left:auto;font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;background:#fff;border:1px solid #E4E0D6;color:var(--text2)">'+sum+' ×</span></div>';
      cdims.forEach(function(d){
        var v=tc[d.key]||0;
        html+='<div style="display:grid;grid-template-columns:minmax(110px,140px) 1fr 26px;align-items:center;gap:10px;height:32px;font-size:13.5px">'
          +'<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(d.key)+'</span>'
          +'<span style="height:10px;border-radius:5px;background:#E4E0D6;overflow:hidden"><i style="display:block;height:100%;border-radius:5px;background:#3a3833;width:'+(v/_tMax*100)+'%"></i></span>'
          +'<span style="text-align:right;font-weight:'+(v?600:500)+';color:'+(v?'var(--text)':'var(--text3)')+'">'+v+'</span></div>';
      });
      html+='</div>';
    });
    html+='</div>';
    html+='</div></div>';

    // ── Geplante Coachings ──
    if(plannedSessions.length){
      html+='<div class="card" style="margin-bottom:22px">';
      html+='<div class="card-title"><i class="ti ti-calendar-time"></i> Geplante Coachings <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">('+plannedSessions.length+')</span></div>';
      html+='<div style="display:flex;flex-direction:column;gap:6px">';
      plannedSessions.forEach(function(s){
        var dtP=new Date(s.date+'T00:00:00'),dfP=Math.round((dtP-new Date(today()+'T00:00:00'))/86400000);
        var whenTxt=dfP===0?'Heute':dfP===1?'Morgen':dfP<0?'Überfällig':'in '+dfP+' Tagen';
        var whenCol=dfP<0?'var(--red)':dfP<=1?'var(--amber-dark)':'var(--purple)';
        html+='<div style="background:var(--s-sub);border:1px solid var(--border2);border-radius:var(--r-md);padding:10px 14px;display:flex;align-items:center;gap:12px;cursor:pointer" data-eid="'+emp.id+'" data-sid="'+esc(s.id)+'" data-typ="'+esc(s.type||'')+'" data-fokus="'+esc(s.focus||'')+'" data-datum="'+esc(s.date)+'" data-uhrzeit="'+esc(s.uhrzeit||'')+'" onclick="openPlannedSession(this.dataset.eid,this.dataset.sid,this.dataset.typ,this.dataset.fokus,this.dataset.datum,this.dataset.uhrzeit)">';
        html+='<div style="width:8px;height:8px;border-radius:50%;background:'+whenCol+';flex-shrink:0"></div>';
        html+='<div style="font-size:12px;font-weight:700;white-space:nowrap">'+fd(s.date)+(s.uhrzeit?' · '+s.uhrzeit:'')+'</div>';
        html+='<span class="badge">'+esc(s.type||'Coaching')+'</span>';
        html+='<span style="font-size:12px;color:var(--purple);flex:1">'+esc(s.focus||'')+'</span>';
        html+='<span style="font-size:11px;font-weight:600;color:'+whenCol+'">'+whenTxt+'</span>';
        html+='<i class="ti ti-chevron-right" style="color:var(--text3)"></i>';
        html+='</div>';
      });
      html+='</div>';
      html+='</div>';
    }

    // ── Zone 4: Coaching-Historie (volle Breite, nur abgeschlossene) – als lesbare Tabelle ──
    html+='<div class="card">';
    html+='<div class="card-title"><i class="ti ti-history"></i> Coaching-Historie <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">('+completedSessions.length+')</span></div>';
    if(!completedSessions.length){
      html+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-calendar-off" style="font-size:26px;display:block;margin-bottom:8px"></i>Noch keine Coachings erfasst<div style="margin-top:10px"><button class="btn btn-sm btn-primary" data-eid="'+emp.id+'" onclick="openNeuesCoachingModal(this.dataset.eid)"><i class="ti ti-plus"></i> Jetzt erfassen</button></div></div>';
    } else {
      var _fullPerfHist=(performance[emp.id]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
      var empT=empTargets(emp);
      function _histImpactWindow(centerDate,daysBefore,daysAfter,fkey){
        var fromS=addDaysUTC(centerDate,-daysBefore),toS=addDaysUTC(centerDate,daysAfter);
        var rows=_fullPerfHist.filter(function(p){return p.date>=fromS&&p.date<toS;});
        return perfKpiWin(emp,rows,fkey);
      }
      var CHIP='font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;';
      html+='<div style="display:flex;flex-direction:column;gap:6px">';
      completedSessions.forEach(function(s,idx){
        var cid='chs'+emp.id+'x'+idx;
        var planned=s.status==='geplant';
        var _dur=sessionDuration(s.uhrzeit,s.endUhrzeit);
        var coach=s.coachId?employees.find(function(e){return e.id===s.coachId;}):null;
        var F=[['Start',s.start],['Stop',s.stop],['Continue',s.cont],['Notizen',s.notes]].map(function(f){return [f[0],(f[1]&&String(f[1]).trim())?String(f[1]).trim():''];});
        // Wirkung (Ziel-KPI: Ø 3 Arbeitstage vor/nach)
        var imp='';
        if(s.focusMetric){
          var im=planned?{state:'none'}:perfImpact(emp,_fullPerfHist,s.date,s.focusMetric);
          if(im.state!=='ok')imp='<span style="'+CHIP+'background:#fff;border:1px solid #E4E0D6;color:var(--text2)">Ziel: '+esc(focusMetricLabel(s.focusMetric))+(im.state==='wait'?' · Ergebnis nach '+IMPACT_DAYS+' Arbeitstagen ('+im.n+'/'+IMPACT_DAYS+')':'')+'</span>';
          else imp='<span style="'+CHIP+impactStyle(im.verdict)+'" title="Ø 3 Arbeitstage davor '+esc(String(Math.round(im.before*10)/10))+' · danach '+esc(String(Math.round(im.after*10)/10))+'">'+esc(focusMetricLabel(s.focusMetric))+' '+impactNum(s.focusMetric,im.raw)+' · '+impactWord(im.verdict)+'</span>';
        }
        html+='<div>';
        html+='<div onclick="toggleSessCard(\''+cid+'\')" style="display:flex;align-items:center;gap:12px;height:56px;padding:0 12px;border:1px solid '+(planned?'rgba(240,133,102,0.45)':'#E4E0D6')+';border-radius:10px;background:'+(planned?'#FDF0EB':'#EFECE5')+';cursor:pointer;user-select:none">';
        html+='<div style="width:150px;flex-shrink:0;line-height:1.25"><div style="font-size:13.5px;font-weight:600">'+fd(s.date)+'</div><div style="font-size:12px;color:var(--text3)">'+(s.uhrzeit?s.uhrzeit+(s.endUhrzeit?'–'+s.endUhrzeit:'')+(_dur?' · '+formatDuration(_dur):''):'ohne Uhrzeit')+'</div></div>';
        html+='<div style="flex:1;min-width:0;line-height:1.3"><div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(s.type||'Session')+(s.topics&&s.topics.length?' · '+esc(s.topics.join(', ')):'')+'</div>'
          +'<div style="font-size:12.5px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(coach?'Coach '+esc(coach.name):'')+(s.rating?(coach?' · ':'')+esc(s.rating):'')+'</div></div>';
        if(planned)html+='<span style="'+CHIP+'background:#fff;border:1px solid rgba(240,133,102,0.55);color:#B5513A">geplant</span>';
        html+=imp;
        html+='<span style="display:flex;gap:4px" title="Start · Stop · Continue · Notizen">'+F.map(function(f){var on=!!f[1];return '<i style="font-style:normal;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:1px solid '+(on?'#3a3833':'#E4E0D6')+';background:'+(on?'#3a3833':'#F7F5F0')+';color:'+(on?'#fff':'var(--text3)')+'" title="'+f[0]+(on?' ausgefüllt':' leer')+'">'+f[0].charAt(0)+'</i>';}).join('')+'</span>';
        html+='<span id="arr-'+cid+'" style="width:34px;height:34px;flex-shrink:0;border-radius:var(--r-md);border:1px solid var(--border2);background:#F7F5F0;display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:12px;transition:transform .2s">▾</span>';
        html+='</div>';
        var filled=F.filter(function(f){return f[1];});
        html+='<div id="body-'+cid+'" style="display:none;border:1px solid #E4E0D6;border-top:none;border-radius:0 0 10px 10px;background:#F7F5F0;margin:-1px 8px 0;padding:4px 14px">';
        if(!filled.length)html+='<div style="font-size:13px;color:var(--text3);min-height:44px;display:flex;align-items:center">Kein Rückblick und keine Notiz erfasst.</div>';
        filled.forEach(function(f,fi){
          html+='<div style="display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;min-height:44px;padding:6px 0;'+(fi<filled.length-1?'border-bottom:1px solid #eae7e0;':'')+'font-size:13.5px;line-height:1.5">'
            +'<span style="font-size:12.5px;font-weight:700;color:var(--text2)">'+f[0]+'</span><span style="color:var(--text);white-space:pre-wrap">'+esc(f[1])+'</span></div>';
        });
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='</div>'; // Ende Historie-Karte

    // ── Chart.js init – EXAKT gleiche Optionen wie Coaching Tab ──
    (function(tc,dims,ccat,maxVal){
      setTimeout(function(){
        var canvas=document.getElementById('sessRadar');
        if(!canvas)return;
        if(canvas._ci){canvas._ci.destroy();}
        canvas._ci=new Chart(canvas,{
          type:'radar',
          data:{
            labels:dims.map(function(d){return d.short;}),
            datasets:[{
              data:dims.map(function(d){return tc[d.key]||0;}),
              backgroundColor:'rgba(60,60,100,0.07)',
              borderColor:'rgba(60,60,100,0.7)',
              borderWidth:2,
              pointBackgroundColor:dims.map(function(d){return ccat[d.cat].col;}),
              pointBorderColor:'white',
              pointBorderWidth:1.5,
              pointRadius:5,
              pointHoverRadius:7,
              fill:true
            }]
          },
          options:{
            responsive:true,
            maintainAspectRatio:false,
            scales:{r:{
              min:0,
              max:maxVal,
              ticks:{stepSize:1,font:{size:9},color:'rgba(0,0,0,0.3)',backdropColor:'transparent'},
              grid:{color:'rgba(0,0,0,0.06)'},
              angleLines:{color:'rgba(0,0,0,0.07)'},
              pointLabels:{
                font:{size:10,weight:'600'},
                color:function(ctx){return ccat[dims[ctx.index].cat].col;}
              }
            }},
            plugins:{
              legend:{display:false},
              tooltip:{callbacks:{label:function(ctx){return ' '+ctx.raw+' Sessions';}}}
            }
          }
        });
      },150);
    })(tc,SDIMS,SCCAT,Math.max(maxVal,5));
  }



  // ── TASKS TAB ──
  if(activeTab==='tasks'){
    var empTasks=tasks[emp.id]||[];
    var todayStr=today();
    function isOD(t){return !t.done&&t.dueDate&&t.dueDate<todayStr;}
    var openTasks=empTasks.filter(function(t){return !isOD(t)&&(t.status||'open')==='open';});
    var inProgressTasks=empTasks.filter(function(t){return !isOD(t)&&t.status==='in_progress';});
    var overdueTasks=empTasks.filter(function(t){return isOD(t);});
    var doneTasks=empTasks.filter(function(t){return t.done||t.status==='done';});
    var prioStyle={high:{bg:'var(--red-bg)',color:'var(--red)'},medium:{bg:'var(--amber-bg)',color:'var(--amber-dark)'},low:{bg:'var(--bg2)',color:'var(--text2)'}};
    // ── Automatisch generierte Aufgabe: QA-Bewertungspflicht (Ziel 5 Calls / 60 Tage) ──
    var qaDue=qaCallsDue(emp.id);
    var qaTaskHtml='';
    if(qaDue.due>0){
      var qaHigh=qaDue.cnt===0;
      var ps=qaHigh?prioStyle.high:prioStyle.medium;
      qaTaskHtml='<div class="task-item">'
        +'<div class="task-row" style="cursor:default">'
        +'<div class="task-check" style="background:'+ps.bg+';border-color:'+ps.color+';cursor:default"><i class="ti ti-phone-plus" style="font-size:11px;color:'+ps.color+'"></i></div>'
        +'<div style="flex:1;min-width:0"><div class="task-title">QA-Bewertungen: noch '+qaDue.due+' Call'+(qaDue.due!==1?'s':'')+' bewerten</div>'
        +'<div class="task-meta"><span>Automatisch &middot; Ziel 4 Calls / Woche</span><span style="color:'+ps.color+'">'+qaDue.cnt+'/'+qaDue.target+' bewertet</span></div></div>'
        +'<span class="task-prio" style="background:'+ps.bg+';color:'+ps.color+'">'+(qaHigh?'high':'medium')+'</span>'
        +'<button class="btn btn-sm btn-primary" data-eid="'+emp.id+'" onclick="event.stopPropagation();openQaBewertungModal(this.dataset.eid)"><i class="ti ti-phone-plus"></i> Bewerten</button>'
        +'</div></div>';
    }
    var qaHighUrgent=qaDue.due>0&&qaDue.cnt===0;
    var qaLowUrgent=qaDue.due>0&&qaDue.cnt>0;
    var openCount=openTasks.length+(qaLowUrgent?1:0);
    var overdueCount=overdueTasks.length+(qaHighUrgent?1:0);

    // ── 5 Kacheln: DABEI SEIT + Open / Overdue / In Progress / Completed (reiches Format wie Coaching Sessions) ──
    var tenureDaysT=emp.startDate?Math.floor((new Date(today()+'T00:00:00')-new Date(emp.startDate+'T00:00:00'))/86400000):null;
    var tenureTxtT=tenureDaysT===null?'—':tenureDaysT<30?tenureDaysT+' Tage':tenureDaysT<365?Math.floor(tenureDaysT/30)+' Monate':(tenureDaysT/365).toFixed(1)+' Jahre';
    html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px">';
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px">DABEI SEIT</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:#F08566">'+tenureTxtT+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3)">Start '+(emp.startDate?fd(emp.startDate):'—')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">&nbsp;</div>'
      +'</div>';
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px">OPEN</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:var(--purple)">'+openCount+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3)">'+(openCount===0?'Alles erledigt':'zu erledigen')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">&nbsp;</div>'
      +'</div>';
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px">OVERDUE</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:'+(overdueCount>0?'var(--red)':'var(--teal-dark)')+'">'+overdueCount+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3)">'+(overdueCount>0?'Frist überschritten':'keine überfällig')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">&nbsp;</div>'
      +'</div>';
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px">IN PROGRESS</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:#F59A5B">'+inProgressTasks.length+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3)">in Bearbeitung</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">&nbsp;</div>'
      +'</div>';
    html+='<div class="card" style="padding:12px 14px;margin-bottom:0">'
      +'<div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px">COMPLETED</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
      +'<div style="font-size:20px;font-weight:700;color:var(--teal-dark)">'+doneTasks.length+'</div>'
      +sparkline([],'#F08566',54,26)
      +'</div>'
      +'<div style="font-size:11px;color:var(--text3)">'+(empTasks.length>0?Math.round(doneTasks.length/empTasks.length*100)+'% abgeschlossen':'noch keine Aufgaben')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:2px">&nbsp;</div>'
      +'</div>';
    html+='</div>';

    function taskCard(t){
      var ps=prioStyle[t.priority]||prioStyle.low;
      var od=isOD(t);
      var dueDays=t.dueDate&&!t.done?Math.ceil((new Date(t.dueDate)-new Date(todayStr))/86400000):null;
      var dueLabel='',dueColor='var(--text3)';
      if(t.dueDate){
        if(t.done){dueLabel='Abgeschlossen';}
        else if(dueDays<0){dueLabel='Überfällig seit '+Math.abs(dueDays)+'d';dueColor='var(--red)';}
        else if(dueDays===0){dueLabel='Heute fällig';dueColor='var(--amber)';}
        else if(dueDays===1){dueLabel='Morgen fällig';}
        else{dueLabel='Fällig in '+dueDays+'d';}
      }
      var statusBadge=t.status==='in_progress'?'<span style="font-size:10px;font-weight:700;color:#F59A5B;background:rgba(245,154,91,0.12);padding:2px 7px;border-radius:20px;margin-left:6px">in Arbeit</span>':'';
      return '<div class="task-item'+(od?' overdue':'')+(t.done?' done-item':'')+'" id="task-'+t.id+'">'
        +'<div class="task-row" onclick="toggleTaskDetail(\''+t.id+'\')">'
        +'<div class="task-check'+(t.done?' done':'')+'" onclick="event.stopPropagation();toggleTask(\''+t.id+'\')">'+(t.done?'<i class="ti ti-check" style="font-size:11px"></i>':'')+'</div>'
        +'<div style="flex:1;min-width:0"><div class="task-title'+(t.done?' done':'')+'">'+(od?'<i class="ti ti-alert-circle" style="font-size:13px;color:var(--red);margin-right:4px"></i>':'')+esc(t.text)+statusBadge+'</div>'
        +'<div class="task-meta">'+(t.source?'<span>'+esc(t.source)+'</span>':'')+( dueLabel?'<span style="color:'+dueColor+'">'+dueLabel+'</span>':'')+'</div></div>'
        +'<span class="task-prio" style="background:'+ps.bg+';color:'+ps.color+'">'+t.priority+'</span>'
        +'<button class="task-del" onclick="event.stopPropagation();deleteTask(\''+t.id+'\')"><i class="ti ti-x"></i></button>'
        +'</div>'
        +'<div class="task-detail" id="td-'+t.id+'">'+esc(t.description||'No description added.')
        +'<div class="task-actions">'
        +(!t.done&&(t.status||'open')==='open'?'<button class="btn btn-sm" onclick="setTaskStatus(\''+t.id+'\',\'in_progress\')"><i class="ti ti-player-play"></i> Start</button>':'')
        +(!t.done?'<button class="btn btn-sm btn-primary" onclick="toggleTask(\''+t.id+'\')"><i class="ti ti-check"></i> Mark as done</button>':'<button class="btn btn-sm" onclick="toggleTask(\''+t.id+'\')"><i class="ti ti-rotate-left"></i> Reopen</button>')
        +'<button class="btn btn-sm btn-danger" onclick="deleteTask(\''+t.id+'\')"><i class="ti ti-trash"></i> Delete</button>'
        +'</div></div></div>';
    }

    // ── Alle Aufgaben in einer weißen Box ──
    html+='<div class="card">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
    html+='<div class="card-title" style="margin:0"><i class="ti ti-checklist"></i> Aufgaben</div>';
    html+='<button class="btn btn-primary btn-sm" onclick="openAddTaskModal(selectedEmp)"><i class="ti ti-plus"></i> Add task</button>';
    html+='</div>';
    if(empTasks.length===0&&qaDue.due===0){
      html+='<div class="empty">No tasks yet. Add tasks manually or from a protocol.</div>';
    } else {
      if(overdueTasks.length>0||qaHighUrgent){
        html+='<div class="sec-title" style="color:var(--red)">Overdue ('+overdueCount+')</div>';
        if(qaHighUrgent)html+=qaTaskHtml;
        overdueTasks.forEach(function(t){html+=taskCard(t);});
      }
      if(openTasks.length>0||qaLowUrgent){
        html+='<div class="sec-title" style="margin-top:'+((overdueTasks.length||qaHighUrgent)?'16px':'0')+'">Open ('+openCount+')</div>';
        if(qaLowUrgent)html+=qaTaskHtml;
        openTasks.forEach(function(t){html+=taskCard(t);});
      }
      if(inProgressTasks.length>0){
        html+='<div class="sec-title" style="margin-top:16px;color:#F59A5B">In Progress ('+inProgressTasks.length+')</div>';
        inProgressTasks.forEach(function(t){html+=taskCard(t);});
      }
      if(doneTasks.length>0){
        html+='<div class="sec-title" style="margin-top:16px">Completed ('+doneTasks.length+')</div>';
        doneTasks.forEach(function(t){html+=taskCard(t);});
      }
    }
    html+='</div>'; // Ende Aufgaben-Karte
  }



  
  // ── EMP SETTINGS TAB ──
  if(activeTab==='emp-settings'){
    html=esBuildHtml(emp,false,html);setTimeout(function(){provLockForm(document.getElementById('mainArea'));},0);
    if(true){
      // ── Zugang zur Sales-OS-Erweiterung (nur Admins, nur fuer Agents) ──
      if(currentUserRole==='admin' && !(emp.isPureCoach||emp.role==='SDC'||emp.role==='SDM')){
        var hasLogin=!!emp.auth_user_id;
        html+='<div class="card" id="agentLoginCard"><div class="card-title"><i class="ti ti-puzzle"></i> Zugang zur Sales-OS-Erweiterung</div>';
        html+='<p style="font-size:12px;color:var(--text2);margin:0 0 12px;line-height:1.5">'+(hasLogin
          ?'<span class="badge" style="background:var(--s-tint-strong);color:var(--purple);padding:3px 9px;border-radius:20px;font-weight:600">Zugang aktiv</span> &nbsp;Anmeldung mit <b>'+esc(emp.email||'')+'</b>. Der Mitarbeiter sieht in der Erweiterung nur seine eigenen Zahlen und kommt nicht ins Board.'
          :(emp.email?'Noch kein Zugang. Der Login wird mit <b>'+esc(emp.email)+'</b> angelegt.':'<b style="color:var(--red)">Bitte zuerst oben unter Person eine E-Mail-Adresse hinterlegen und speichern.</b>'))+'</p>';
        if(emp.email||hasLogin){
          html+='<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">'
            +'<div style="flex:1;min-width:200px"><label>'+(hasLogin?'Neues Passwort':'Startpasswort')+'</label><div style="display:flex;gap:6px"><input type="text" id="al-pw" placeholder="mind. 10 Zeichen" autocomplete="off" style="font-family:monospace"><button class="btn" type="button" style="height:34px" onclick="document.getElementById(\'al-pw\').value=genAgentPassword()" title="Sicheres Passwort erzeugen"><i class="ti ti-wand"></i></button></div></div>'
            +(hasLogin
              ?'<button class="btn btn-primary" style="width:auto;height:34px" onclick="agentLogin(\'reset\',\''+emp.id+'\')"><i class="ti ti-key"></i> Passwort neu setzen</button>'
               +'<button class="btn" style="width:auto;height:34px;color:var(--red)" onclick="agentLogin(\'remove\',\''+emp.id+'\')"><i class="ti ti-user-x"></i> Zugang entfernen</button>'
              :'<button class="btn btn-primary" style="width:auto;height:34px" onclick="agentLogin(\'create\',\''+emp.id+'\')"><i class="ti ti-user-plus"></i> Zugang anlegen</button>')
            +'</div><div id="al-msg" style="font-size:12px;margin-top:10px;line-height:1.5"></div>';
        }
        html+='</div>';
      }

    }

    if(true){
      // ── Änderungshistorie: Kacheln je Speichervorgang ──
      html+='<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div class="card-title" style="margin:0"><i class="ti ti-history"></i> Änderungshistorie</div>'
        +'<div id="histFilterBar">'+buildHistFilterHtml()+'</div></div>'
        +'<div id="histTiles">'+buildHistTilesHtml(emp.id)+'</div></div>';
      window._histEmpId=emp.id;

      // ── Dokumente / Anhänge ──
      html+='<div class="card"><div class="card-title"><i class="ti ti-paperclip"></i> Dokumente</div>'
        +'<p style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.6">Zielvereinbarungen, Zertifikate oder sonstige Unterlagen zu '+esc(emp.name)+'.</p>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">'
        +'<label class="btn btn-sm btn-primary" style="cursor:pointer"><i class="ti ti-upload"></i> Datei hochladen<input type="file" id="doc-upload-input" style="display:none" onchange="uploadEmpDocument(this.files[0])"></label>'
        +'<span id="doc-upload-status" style="font-size:12px;color:var(--text2)"></span>'
        +'</div>';
      var docs=(employeeDocuments[emp.id]||[]);
      if(!docs.length){
        html+='<div style="font-size:12px;color:var(--text3);text-align:center;padding:16px"><i class="ti ti-file-off" style="font-size:20px;display:block;margin-bottom:6px"></i>Noch keine Dokumente hochgeladen</div>';
      } else {
        html+='<div style="display:flex;flex-direction:column;gap:6px">';
        docs.forEach(function(d){
          html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg2);border-radius:var(--r-md)">'
            +'<i class="ti ti-file-text" style="font-size:16px;color:var(--purple);flex-shrink:0"></i>'
            +'<div style="flex:1;min-width:0;cursor:pointer" data-id="'+d.id+'" onclick="openEmpDocument(this.dataset.id)" title="Öffnen"><div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.filename)+'</div>'
            +'<div style="font-size:11px;color:var(--text3)">'+fd(d.uploadedAt?d.uploadedAt.slice(0,10):'')+(d.description?' · '+esc(d.description):'')+'</div></div>'
            +'<button class="btn btn-sm" data-id="'+d.id+'" onclick="openEmpDocument(this.dataset.id)" title="Öffnen"><i class="ti ti-eye"></i></button>'
            +'<button class="btn btn-sm" data-id="'+d.id+'" onclick="downloadEmpDocument(this.dataset.id)" title="Herunterladen"><i class="ti ti-download"></i></button>'
            +'<button class="btn btn-sm" data-id="'+d.id+'" style="color:var(--red)" onclick="deleteEmpDocument(this.dataset.id)"><i class="ti ti-trash"></i></button>'
            +'</div>';
        });
        html+='</div>';
      }
      html+='</div>';
    } // Ende historie
  }

  tc2.innerHTML=buildEmpBannerHtml(emp)+html;

  // Render chart
  if(activeTab==='performance'){
    setTimeout(function(){
      var canvas=document.getElementById('empPerfChart');
      if(!canvas)return;
      if(activeChart){activeChart.destroy();activeChart=null;}
      var empObj=employees.find(function(x){return x.id===selectedEmp;});
      var year=+today().slice(0,4);
      var periods=buildChartPeriods(empChartGroup,year);
      var todayStr=today();
      var labels=periods.map(function(p){return p.label;});

      function metricValFromSums(key,s){
        if(key==='crOEM'){var d=s.oem+s.nerrOem;return d>0?s.oem/d*100:null;}
        if(key==='crTeilweise'){var dr=s.yes+s.sy+s.my;return (s.tw+dr)>0?s.tw/(s.tw+dr)*100:null;}
        if(key==='crYes'){var dr2=s.yes+s.sy+s.my;return dr2>0?s.yes/dr2*100:null;}
        if(key==='crSyMy'){var dr5=s.yes+s.sy+s.my;return dr5>0?(s.sy+s.my)/dr5*100:null;}
        if(key==='crSuperYes'){var dr3=s.yes+s.sy+s.my;return dr3>0?s.sy/dr3*100:null;}
        if(key==='crMegaYes'){var dr4=s.yes+s.sy+s.my;return dr4>0?s.my/dr4*100:null;}
        if(key==='ne')return s.ne;
        if(key==='nm')return s.nm;
        if(key==='nerr')return s.nerr;
        if(key==='aktivitaeten')return s.ne+s.nm+s.nerr+(s.oem+s.ups+s.wka);
        if(key==='convOEM')return s.oem;
        if(key==='ups_yes')return s.ups;
        if(key==='wka_gesamt_yes')return s.wka;
        if(key==='optGesamt')return s.oem+s.ups+s.wka;
        if(key==='margeGesamt')return s.margeGes;
        return 0;
      }
      var mLabels={aktivitaeten:'Aktivitäten',ne:'NE',nm:'NM',nerr:'NEF',convOEM:'OEM',ups_yes:'UPS',wka_gesamt_yes:'WKA',optGesamt:'Opt. Gesamt',crOEM:'CR OEM %',crTeilweise:'CR TW %',crYes:'CR YES %',crSyMy:'CR SY/MY %',crSuperYes:'CR SY %',crMegaYes:'CR MY %',margeGesamt:'Marge Gesamt €'};
      var m={f:empChartMetric,l:mLabels[empChartMetric]||empChartMetric,c:'#F08566'};

      var vals=periods.map(function(p){
        if(p.from>todayStr)return null; // Zukunft: offener Punkt
        return metricValFromSums(empChartMetric,chartSumsForRange([empObj],p.from,p.to));
      });

      var empT=empTargets(empObj||{});
      var tMap={crOEM:'crOEM',crTeilweise:'crTeilweise',crYes:'crYes',crSuperYes:'crSuperYes',crMegaYes:'crMegaYes',optPerH:'optPerH',oem_aktivitaeten:'oem_aktivitaeten',convOEM:'convOEM',optGesamt:'optGesamt',margeGesamt:'margeGesamt'};
      var tk=tMap[empChartMetric];
      var target=tk&&empT[tk]?empT[tk].val:null;

      // Team-Durchschnitt: alle Mitarbeiter gleicher Gruppe (Rolle), je Periode gemittelt
      var myTeam=empObj?empObj.team:null;
      var teamEmps=myTeam?employees.filter(function(e){return e.team===myTeam&&e.id!==selectedEmp&&e.active!==false;}):[];
      var teamAvgVals=periods.map(function(p){
        if(p.from>todayStr||!teamEmps.length)return null;
        // B1: CR-Kennzahlen aus den summierten Rohzahlen des Teams (nicht Ø der Einzel-CRs); Zählwerte bleiben Ø je Kopf
        if(/^cr/.test(empChartMetric)){var tv=metricValFromSums(empChartMetric,chartSumsForRange(teamEmps,p.from,p.to));return tv!=null?+tv.toFixed(1):null;}
        var dayVals=teamEmps.map(function(te){return metricValFromSums(empChartMetric,chartSumsForRange([te],p.from,p.to));}).filter(function(v){return v!==null;});
        return dayVals.length?+(dayVals.reduce(function(a,b){return a+b;},0)/dayVals.length).toFixed(1):null;
      });
      var hasTeamAvg=teamAvgVals.some(function(v){return v!==null;});

      var datasets;
      if(empChartMetric==='crOEM'){
        function crBreakdownFromSums(s){
          var oemD=s.oem+s.nerrOem, upsD=s.ups+s.nerrUps, wkaFail=s.nerrWkaOem+s.wkaOemBeendet+s.nerrWkaUps+s.wkaUpsBeendet;
          var optGesTotal=s.oem+s.ups+s.wka, gesFail=s.nerrOem+s.nerrUps+s.nerrWkaOem+s.nerrWkaUps;
          return {
            gesamt: (optGesTotal+gesFail)>0?optGesTotal/(optGesTotal+gesFail)*100:null,
            oem: oemD>0?s.oem/oemD*100:null,
            ups: upsD>0?s.ups/upsD*100:null,
            wka: (s.wka+wkaFail)>0?s.wka/(s.wka+wkaFail)*100:null
          };
        }
        var bd=periods.map(function(p){
          if(p.from>todayStr)return null;
          return crBreakdownFromSums(chartSumsForRange([empObj],p.from,p.to));
        });
        datasets=[
          {label:'CR Gesamt',data:bd.map(function(v){return v?v.gesamt:null;}),borderColor:'#1d1c1a',backgroundColor:'#0c3b4022',fill:false,tension:0.35,pointRadius:periods.length<=16?4:2,pointBackgroundColor:'#1d1c1a',borderWidth:2,order:1,spanGaps:false},
          {label:'CR OEM',data:bd.map(function(v){return v?v.oem:null;}),borderColor:'#F08566',backgroundColor:'#206A7222',fill:false,tension:0.35,pointRadius:periods.length<=16?4:2,pointBackgroundColor:'#F08566',borderWidth:2,order:1,spanGaps:false},
          {label:'CR Upsells',data:bd.map(function(v){return v?v.ups:null;}),borderColor:'#F08566',backgroundColor:'#4A90A422',fill:false,tension:0.35,pointRadius:periods.length<=16?4:2,pointBackgroundColor:'#F08566',borderWidth:2,order:1,spanGaps:false},
          {label:'CR WKA',data:bd.map(function(v){return v?v.wka:null;}),borderColor:'#F0B8A8',backgroundColor:'#8FBFC722',fill:false,tension:0.35,pointRadius:periods.length<=16?4:2,pointBackgroundColor:'#F0B8A8',borderWidth:2,order:1,spanGaps:false}
        ];
      } else {
        datasets=[{
          label:(empObj?empObj.name.split(' ')[0]:'')+' – '+m.l,data:vals,borderColor:m.c,backgroundColor:m.c+'22',fill:true,tension:0.35,
          pointRadius:periods.length<=16?4:2,pointBackgroundColor:m.c,borderWidth:2,order:1,spanGaps:false
        }];
      }

      if(hasTeamAvg){
        datasets.push({label:'Durch. Team',data:teamAvgVals,borderColor:'rgba(0,0,0,0.2)',backgroundColor:'transparent',
          fill:false,tension:0.35,pointRadius:0,borderWidth:1.5,borderDash:[4,3],order:2});
      }
      if(target!==null){
        datasets.push({label:'Ziel ('+target+')',data:periods.map(function(){return target;}),borderColor:'#E24B4A',
          borderDash:[4,3],borderWidth:1.5,pointRadius:0,fill:false,order:3});
      }

      // Y-Achse automatisch an die tatsaechlichen Datenwerte anpassen (gleiche Methode wie beim
      // Performance-Diagramm unter SFP Wiegand -> Performance), statt fester Werte je Metrik
      var allVals=[];
      datasets.forEach(function(ds){ds.data.forEach(function(v){if(v!==null&&v!==undefined)allVals.push(v);});});
      var yMin,yMax;
      if(!allVals.length){
        yMin=0;yMax=100;
      } else {
        var dataMin=Math.min.apply(null,allVals),dataMax=Math.max.apply(null,allVals);
        var range=dataMax-dataMin;
        if(range<=0)range=dataMax>0?dataMax:1;
        var pad=range*0.4;
        yMin=Math.max(0,dataMin-pad);yMax=dataMax+pad;
      }

      // ── Coaching-Marker je Periode: welche Sessions fielen in diesen Zeitraum? ──
      var sessMap={}; // periodIndex -> [sessions]
      var sessAll=(protocols[selectedEmp]||[]).filter(function(s){return s.status!=='geplant';});
      periods.forEach(function(p,i){
        sessMap[i]=sessAll.filter(function(s){return s.date>=p.from&&s.date<=p.to;});
      });
      function coachInitial(coachId){
        if(!coachId)return null;
        var c=employees.find(function(e){return e.id===coachId;});
        return c?c.name.split(' ')[0].charAt(0).toUpperCase():null;
      }
      var markMatch=periods.map(function(p,i){return (sessMap[i]||[]).some(function(s){return s.focusMetric===empChartMetric;})?yMax:null;});
      var markOther=periods.map(function(p,i){
        var matched=(sessMap[i]||[]).some(function(s){return s.focusMetric===empChartMetric;});
        var other=(sessMap[i]||[]).some(function(s){return s.focusMetric!==empChartMetric;});
        return (other&&!matched)?yMax:null;
      });
      if(markMatch.some(function(v){return v!==null;})){
        datasets.push({label:'Coaching (dieses KPI)',data:markMatch,showLine:false,pointRadius:7,pointHoverRadius:9,backgroundColor:'transparent',borderColor:'transparent',order:0});
      }
      if(markOther.some(function(v){return v!==null;})){
        datasets.push({label:'Anderes Coaching',data:markOther,showLine:false,pointRadius:7,pointHoverRadius:9,backgroundColor:'transparent',borderColor:'transparent',order:4});
      }

      // ── Plugin: zeichnet duenne gestrichelte Vertikallinie + Coach-Kuerzel je Periode mit Coaching ──
      var coachLinePlugin={
        id:'coachLines',
        afterDraw:function(chart){
          var ctx=chart.ctx,xScale=chart.scales.x,ya=chart.scales.y;
          if(!xScale||!ya)return;
          var top=ya.top,bottom=ya.bottom;
          periods.forEach(function(p,i){
            var sess=sessMap[i];
            if(!sess||!sess.length)return;
            var matched=sess.some(function(s){return s.focusMetric===empChartMetric;});
            var x=xScale.getPixelForValue(i);
            ctx.save();
            ctx.setLineDash([3,3]);
            ctx.lineWidth=1;
            ctx.strokeStyle=matched?'rgba(29,28,26,0.275)':'rgba(140,140,140,0.4)';
            ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();
            ctx.setLineDash([]);
            var initials=sess.map(function(s){return coachInitial(s.coachId);}).filter(Boolean);
            if(initials.length){
              ctx.fillStyle=matched?'rgba(29,28,26,0.425)':'rgba(120,120,120,0.75)';
              ctx.font='10px -apple-system,sans-serif';
              ctx.textAlign='center';
              ctx.fillText(initials.slice(0,2).join(','),x,top-10);
            }
            ctx.restore();
          });
        }
      };

      activeChart=new Chart(canvas,{
        type:'line',
        data:{labels:labels,datasets:datasets},
        plugins:[coachLinePlugin],
        options:{
          responsive:true,resizeDelay:200,maintainAspectRatio:false,layout:{padding:{top:24}},
          animation:CHART_DRAWIN_ANIMATION,interaction:{mode:'index',intersect:false},
          plugins:{
            legend:{display:false},
            tooltip:{callbacks:{label:function(ctx){
              if(ctx.dataset.label==='Coaching (dieses KPI)'||ctx.dataset.label==='Anderes Coaching'){
                var sess=sessMap[ctx.dataIndex]||[];
                if(!sess.length)return ctx.dataset.label;
                return sess.map(function(s){
                  var c=s.coachId?employees.find(function(e){return e.id===s.coachId;}):null;
                  return (s.type||'Coaching')+(s.focus?' – '+s.focus:'')+(c?' ('+esc(c.name)+')':'');
                });
              }
              return ctx.dataset.label+': '+formatMetricValue(empChartMetric,ctx.parsed.y);
            }}}
          },
          scales:{
            x:{ticks:{font:{size:11},maxTicksLimit:10},grid:{display:false}},
            y:{min:yMin,max:yMax,ticks:{font:{size:11}},grid:{color:'rgba(0,0,0,0.05)'}}
          }
        }
      });
      reapplyChartGradient(activeChart,canvas,0.55,0.05);
      // Eigene, klickbare Legende direkt neben dem Titel statt der nativen Chart.js-Legende
      var empLegendEl=document.getElementById('empChartLegend');
      if(empLegendEl){
        empLegendEl.innerHTML='';
        activeChart.data.datasets.forEach(function(ds,i){
          if(ds.label==='Coaching (dieses KPI)'||ds.label==='Anderes Coaching')return; // unsichtbare Hover-Marker nicht in der Legende zeigen
          var item=document.createElement('span');
          var meta=activeChart.getDatasetMeta(i);
          item.style.cssText='display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;cursor:pointer;user-select:none;color:'+(meta.hidden?'var(--text3)':'var(--text2)')+';opacity:'+(meta.hidden?'0.5':'1');
          item.innerHTML='<span style="width:9px;height:9px;border-radius:2px;background:'+ds.borderColor+';display:inline-block"></span>'+esc(ds.label);
          item.onclick=function(){
            meta.hidden=meta.hidden===null?!activeChart.data.datasets[i].hidden:!meta.hidden;
            activeChart.update();
            item.style.opacity=meta.hidden?'0.5':'1';
            item.style.color=meta.hidden?'var(--text3)':'var(--text2)';
          };
          empLegendEl.appendChild(item);
        });
      }

      // ── Impact Coaching: arbeitet direkt auf Rohdaten (unabhaengig von Tag/Woche/Monat) ──
      (function(){
        var panel=document.getElementById('coachImpactPanel');
        if(!panel)return;
        var relevant=(protocols[selectedEmp]||[]).filter(function(s){return s.status!=='geplant'&&s.focusMetric===empChartMetric;}); // B9
        var fullPerf=(performance[selectedEmp]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
        // Wirkung wie in der Coaching-Historie: Ø 3 Arbeitstage vor gegen nach der Session (perfImpact, CR aus Rohzahlen; Peter 24.11.)
        function impactOf(s){var im=perfImpact(empObj,fullPerf,s.date,empChartMetric);return im.state==='ok'?im:{before:null,after:null};}
        var sortedRelevant=relevant.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
        function buildRow(s){
          var im=impactOf(s),before=im.before,after=im.after;
          var delta=(before!==null&&after!==null)?(after-before):null;
          var good=delta!==null&&(target===null?delta>0:(tk&&empT[tk]&&empT[tk].dir==='lte'?delta<0:delta>0));
          var deltaTxt=delta===null?'—':(delta>0?'+':'')+delta.toFixed(1);
          var arrow=delta===null?'':(delta>0?'↑':delta<0?'↓':'→');
          return '<div style="display:flex;align-items:center;gap:14px;padding:10px 12px;margin-bottom:6px;background:var(--s-tint);border:1px solid var(--border2);border-radius:var(--r-md)">'
            +'<div style="width:80px;font-size:12px;font-weight:600;flex-shrink:0">'+fd(s.date)+'</div>'
            +'<div style="flex:1;font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(s.type||'Coaching')+(s.focus?' · '+esc(s.focus):'')+'</div>'
            +'<div style="font-size:11px;color:var(--text2);font-weight:600;width:70px;text-align:right">Ø vorher<br><b style="font-size:14px;color:var(--text)">'+(before!==null?before.toFixed(1):'—')+'</b></div>'
            +'<div style="font-size:11px;color:var(--text2);font-weight:600;width:70px;text-align:right">Ø nachher<br><b style="font-size:14px;color:var(--text)">'+(after!==null?after.toFixed(1):'—')+'</b></div>'
            +'<div style="width:70px;text-align:right;font-size:14px;font-weight:700;color:'+(delta===null?'var(--text3)':good?'var(--teal-dark)':'var(--red)')+'">'+arrow+' '+deltaTxt+'</div>'
            +'</div>';
        }
        function buildPlaceholderRow(){
          return '<div style="display:flex;align-items:center;gap:14px;padding:10px 12px;margin-bottom:6px;background:var(--s-tint);border:1px solid var(--border2);border-radius:var(--r-md)">'
            +'<div style="width:80px;font-size:12px;font-weight:600;flex-shrink:0;color:var(--text3)">—</div>'
            +'<div style="flex:1;font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Keine Coaching Session vorhanden</div>'
            +'<div style="font-size:11px;color:var(--text3);font-weight:600;width:70px;text-align:right">Ø vorher<br><b style="font-size:14px;color:var(--text3)">—</b></div>'
            +'<div style="font-size:11px;color:var(--text3);font-weight:600;width:70px;text-align:right">Ø nachher<br><b style="font-size:14px;color:var(--text3)">—</b></div>'
            +'<div style="width:70px;text-align:right;font-size:14px;font-weight:700;color:var(--text3)">—</div>'
            +'</div>';
        }
        var realVisible=sortedRelevant.slice(0,3).map(buildRow);
        var placeholdersNeeded=Math.max(0,3-realVisible.length);
        var visibleRows=realVisible.join('')+Array(placeholdersNeeded).fill(0).map(buildPlaceholderRow).join('');
        var restRows=sortedRelevant.slice(3);
        var restHtml=restRows.length?restRows.map(buildRow).join(''):'';
        var toggleHtml=restRows.length?(
          '<div onclick="var b=document.getElementById(\'vnRestBody\');var a=document.getElementById(\'vnArrow\');var open=b.style.display!==\'none\';b.style.display=open?\'none\':\'block\';a.style.transform=open?\'rotate(0deg)\':\'rotate(180deg)\';" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 0 0;cursor:pointer;user-select:none;font-size:12px;color:var(--purple-dark);font-weight:600">'
          +'+'+restRows.length+' weitere anzeigen <span id="vnArrow" style="font-size:12px;transition:transform .2s">▾</span>'
          +'</div><div id="vnRestBody" style="display:none">'+restHtml+'</div>'
        ):'';
        panel.innerHTML='<div class="card">'
          +'<div class="card-title"><i class="ti ti-arrows-diff"></i> Impact Coaching – '+m.l+' <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">(Ø 3 Arbeitstage vor gegen nach dem Coaching)</span></div>'
          +visibleRows+toggleHtml+'</div>';
      })();
      var scrollElAfterChart=document.getElementById('tabContent');
      if(scrollElAfterChart&&window._overviewScrollRestore!=null)scrollElAfterChart.scrollTop=window._overviewScrollRestore;
    },50);
  }
}

// ── ACTIONS ──
function setEvalDate(date){window._evalDate=date;renderTab();}

// Wer Bewertungen und Kommentare nachträglich ändern oder löschen darf, regelt „Rollen & Rechte“ (Zeile „Bewertungen & Kommentare …“).
// Admins dürfen es immer, Coaches standardmäßig auch, Betrachter nie.
function canEditHistorie(){
  return permFor('histEdit')==='E';
}
function deleteHistorieComment(empId,commentId){
  if(!canEditHistorie())return;
  if(!confirm('Diesen Kommentar wirklich löschen?'))return;
  var list=reviews[empId]||[];
  var idx=list.findIndex(function(r){return r.id===commentId;});
  if(idx<0)return;
  list.splice(idx,1);
  sb.from('employee_comments').delete().eq('id',commentId).then(function(res){if(res&&res.error)console.warn('Kommentar loeschen fehlgeschlagen:',res.error);renderTab();}).catch(function(){renderTab();});
}
function deleteHistorieEval(empId,evalId){
  if(!canEditHistorie())return;
  if(!confirm('Diese Bewertung wirklich löschen? Dies kann nicht rückgängig gemacht werden.'))return;
  var list=reviews[empId]||[];
  var idx=list.findIndex(function(r){return r.id===evalId;});
  if(idx<0)return;
  list.splice(idx,1);
  sb.from('reviews').delete().eq('id',evalId).then(function(res){if(res&&res.error)alert('Löschen fehlgeschlagen: '+res.error.message);renderTab();}).catch(function(err){alert('Löschen fehlgeschlagen: '+(err&&err.message||err));renderTab();});
}
function openCommentModal(empId,editCommentId){
  // Kommentar im gemeinsamen Popup: eine Kachel zum Schreiben, darunter die letzten fünf Kommentare
  var emp=employees.find(function(e){return String(e.id)===String(empId);});
  var old=document.getElementById('commentModal');if(old)old.remove();
  var curName='Admin';
  if(typeof currentCoach!=='undefined'&&currentCoach)curName=currentCoach.name;
  else if(typeof currentAuthUser!=='undefined'&&currentAuthUser){
    var mu=(typeof appUsers!=='undefined'?appUsers:[]).find(function(u){return u.email===currentAuthUser.email;});
    curName=mu?mu.name:((typeof resolveNonEmployeeName==='function'&&resolveNonEmployeeName(currentAuthUser.email))||'Admin');
  }
  var st={editId:null,type:'diverses'};
  var CARD='background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)';
  var ov=document.createElement('div');ov.id='commentModal';ov.dataset.puShell='1';
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:7vh 16px 16px';
  ov.innerHTML='<div style="background:#EEEDE9;border:1px solid #E4E0D6;border-radius:16px;width:860px;max-width:95vw;max-height:86vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.18);position:relative">'
    +'<div style="display:flex;align-items:center;padding:14px 16px 6px"><div style="min-width:0"><div id="cmKick" style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">Kommentar hinzufügen</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(emp?esc(emp.name)+(emp.role?' · '+esc(emp.role):''):'')+'</div></div>'
    +'<button class="btn" type="button" id="cmX" style="margin-left:auto;width:34px;height:34px;padding:0;justify-content:center" aria-label="Schließen"><i class="ti ti-x"></i></button></div>'
    +'<div style="display:flex;min-height:0;flex:1">'
    +'<div style="width:56px;flex-shrink:0;align-self:stretch;margin:6px 0 14px 14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;box-shadow:0 10px 24px rgba(40,32,15,.10);position:relative;z-index:3">'
    +'<button class="rl-btn on" type="button" aria-label="Neuer Kommentar" data-target="cmSec1" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'cmSec1\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-pencil"></i><span class="rl-tip" style="left:48px">Neuer Kommentar</span></button>'
    +'<button class="rl-btn" type="button" aria-label="Letzte Kommentare" data-target="cmSec2" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'cmSec2\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-list"></i><span class="rl-tip" style="left:48px">Letzte Kommentare</span></button>'
    +'</div>'
    +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0">'
    +'<div id="cmScroll" style="flex:1;overflow-y:auto;padding:6px 18px 12px 14px">'
    +'<div id="cmSec1" style="'+CARD+'"><div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;margin-bottom:10px"><span id="cmTitle">Neuer Kommentar</span><span style="margin-left:auto;font-size:12px;font-weight:500;color:var(--text3)">von '+esc(curName)+'</span></div>'
    +'<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:10px"><div style="width:170px;flex-shrink:0"><label>Datum</label><input type="date" id="comment-date" value="'+today()+'"></div>'
    +'<div style="flex:1;min-width:0"><label>Art</label><div id="cmArt" style="display:flex;gap:2px;background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;padding:2px;height:38px;align-items:center"></div></div></div>'
    +'<label>Kommentar</label><textarea id="comment-text" placeholder="z. B. Kommt regelmäßig zu spät zum Stand-up …" style="min-height:70px;resize:vertical"></textarea>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-top:12px"><label id="cmNoteWrap" style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;font-size:13px;color:var(--text2)"><input type="checkbox" id="comment-to-note" style="width:16px;height:16px;accent-color:#3a3833;margin:0"> In die Notiz zum Mitarbeiter übernehmen</label>'
    +'<span style="margin-left:auto;display:flex;gap:8px"><button class="btn" type="button" id="cmCancelEdit" style="height:36px;width:auto;display:none">Bearbeiten abbrechen</button>'
    +'<button class="btn btn-primary" type="button" id="cmSave" style="height:36px;width:auto"><i class="ti ti-check"></i> <span>Kommentar speichern</span></button></span></div></div>'
    +'<div id="cmSec2" style="'+CARD+';margin-bottom:4px"><div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;margin-bottom:10px">Letzte Kommentare <span id="cmN" style="font-weight:500;color:var(--text3);font-size:12.5px"></span>'
    +'<button class="btn" type="button" id="cmAll" style="margin-left:auto;height:28px;padding:0 10px;font-size:12px">Alle in Development</button></div><div id="cmList"></div></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:flex-end;gap:8px;padding:4px 18px 14px"><button class="btn" type="button" id="cmClose" style="height:36px;width:auto">Schließen</button></div>'
    +'</div></div>'
    +'<div id="cmToast" style="position:absolute;left:50%;bottom:64px;transform:translateX(-50%);background:#1d1c1a;color:#fff;font-size:13px;font-weight:600;padding:8px 14px;border-radius:10px;display:none;white-space:nowrap;-webkit-font-smoothing:antialiased"></div>'
    +'</div>';
  document.body.appendChild(ov);
  var $=function(id){return document.getElementById(id);};
  $('cmX').onclick=$('cmClose').onclick=function(){ov.remove();};
  $('cmAll').onclick=function(){ov.remove();selectedEmp=empId;view='emp';activeTab='coaching-eval';renderSidebar();renderMain();};
  function renderArt(){
    $('cmArt').innerHTML=['skill','will','result','diverses'].map(function(t){var on=t===st.type;
      return '<span data-t="'+t+'" style="flex:1;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;'+(on?'background:#fff;color:var(--text);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)':'color:var(--text2);font-weight:500')+'">'+t.charAt(0).toUpperCase()+t.slice(1)+'</span>';}).join('');
    [].slice.call($('cmArt').children).forEach(function(sp){sp.onclick=function(){st.type=sp.dataset.t;renderArt();};});
  }
  function toast(msg){var t=$('cmToast');if(!t)return;t.textContent=msg;t.style.display='block';clearTimeout(window._cmTT);window._cmTT=setTimeout(function(){t.style.display='none';},3000);}
  function setEdit(c){
    st.editId=c?c.id:null;st.type=c?(c.commentType||'diverses'):'diverses';
    $('comment-date').value=c?c.date:today();$('comment-text').value=c?c.note:'';$('comment-to-note').checked=false;
    $('cmTitle').textContent=c?'Kommentar bearbeiten':'Neuer Kommentar';$('cmKick').textContent=c?'Kommentar bearbeiten':'Kommentar hinzufügen';
    $('cmSave').lastElementChild.textContent=c?'Änderung speichern':'Kommentar speichern';
    $('cmCancelEdit').style.display=c?'':'none';$('cmNoteWrap').style.display=c?'none':'flex';
    renderArt();
    if(c){$('cmSec1').scrollIntoView({behavior:'smooth',block:'start'});$('comment-text').focus();}
  }
  function renderList(){
    var list=(reviews[empId]||[]).filter(function(r){return r.isComment;}).slice().sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
    $('cmN').textContent='('+list.length+')';
    var ed=canEditHistorie();
    $('cmList').innerHTML=list.length?list.slice(0,5).map(function(c){
      var art=String(c.commentType||'diverses');art=art.charAt(0).toUpperCase()+art.slice(1);
      var d=c.date?c.date.slice(8,10)+'.'+c.date.slice(5,7)+'.':'';
      return '<div title="'+esc(c.note||'')+'" style="display:flex;align-items:flex-start;gap:12px;height:84px;padding:12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5;margin-bottom:6px;overflow:hidden">'
        +'<div style="width:96px;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+d+'</span><span style="font-size:13.5px;font-weight:600;color:var(--text);line-height:19px">'+esc(art)+'</span></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.author||'')+'</div>'
        +'<div style="font-size:13.5px;line-height:19px;height:38px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--text)">'+esc(c.note||'')+'</div></div>'
        +(ed?'<span style="display:flex;gap:6px;flex-shrink:0;align-self:flex-start">'
          +'<button class="btn" type="button" title="Bearbeiten" data-cid="'+c.id+'" data-act="edit" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-pencil"></i></button>'
          +'<button class="btn" type="button" title="Löschen" data-cid="'+c.id+'" data-act="del" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-trash"></i></button></span>':'')
        +'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch keine Kommentare.</div>';
    [].slice.call($('cmList').querySelectorAll('button[data-act]')).forEach(function(b){
      b.onclick=function(){
        var c=(reviews[empId]||[]).find(function(r){return String(r.id)===String(b.dataset.cid);});if(!c)return;
        if(b.dataset.act==='edit')setEdit(c);
        else{var n0=(reviews[empId]||[]).length;deleteHistorieComment(empId,c.id);if((reviews[empId]||[]).length<n0){if(st.editId===c.id)setEdit(null);renderList();toast('Kommentar gelöscht');delete _puState['coachingInfoModal'];}}
      };
    });
  }
  $('cmCancelEdit').onclick=function(){setEdit(null);};
  $('cmSave').onclick=function(){
    var txt=$('comment-text').value.trim();
    if(!txt){alert('Bitte einen Kommentar eingeben.');$('comment-text').focus();return;}
    var dateVal=$('comment-date').value||today();
    if(!reviews[empId])reviews[empId]=[];
    if(st.editId){
      var ex=reviews[empId].find(function(r){return String(r.id)===String(st.editId);});
      if(ex){ex.date=dateVal;ex.commentType=st.type;ex.note=txt;saveCommentToDb(empId,ex,true);}
      toast('Änderung gespeichert');
    } else {
      var nc={id:newCommentId(),date:dateVal,isComment:true,commentType:st.type,note:txt,author:curName};
      reviews[empId].push(nc);saveCommentToDb(empId,nc,false);
      if($('comment-to-note').checked&&emp){
        var d=new Date();var stamp=('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.';
        var notiz=(emp.notes&&String(emp.notes).trim()?String(emp.notes).trim()+'\n':'')+stamp+' '+txt;
        emp.notes=notiz;
        sb.from('employees').update({notes:notiz}).eq('id',emp.id).then(function(res){if(res&&res.error)alert('Notiz konnte nicht gespeichert werden: '+res.error.message);});
      }
      toast('Kommentar gespeichert');
    }
    setEdit(null);renderList();
    delete _puState['coachingInfoModal'];
    if(view==='emp')renderTab();
  };
  var ex0=editCommentId?(reviews[empId]||[]).find(function(r){return String(r.id)===String(editCommentId);}):null;
  setEdit(ex0||null);renderList();
  if(!ex0)setTimeout(function(){var t=$('comment-text');if(t)t.focus();},50);
}
function openCoachingEval(empId,editEvalId){
  // Entwicklung im gemeinsamen Popup: neue Bewertung (untereinander, mit Vergleich zum letzten Mal) und die letzten Bewertungen
  var DIMS=[
    {key:'opener',label:'Einstieg',cat:'skill'},{key:'einwand',label:'Einwandsentkräftung',cat:'skill'},
    {key:'loop',label:'Loop',cat:'skill'},{key:'bedarf',label:'Bedarfserweiterung',cat:'skill'},
    {key:'produkt',label:'Produktwissen',cat:'skill'},{key:'abschluss',label:'Abschluss',cat:'skill'},
    {key:'gespraech',label:'Gesprächsführung',cat:'skill'},{key:'zusammenfassung',label:'Zusammenfassung',cat:'skill'},
    {key:'motivation',label:'Motivation',cat:'will'},{key:'coach',label:'Coachability',cat:'will'},
    {key:'zuverl',label:'Zuverlässigkeit',cat:'will'},{key:'team',label:'Teamfähigkeit',cat:'will'},
    {key:'crOEM',label:'CR OEM',cat:'result'},{key:'crTW',label:'CR TW',cat:'result'},
    {key:'crSY',label:'CR SY',cat:'result'},{key:'crMY',label:'CR MY',cat:'result'}
  ];
  var CATS=[['skill','Skill'],['will','Will'],['result','Result']];
  var emp=employees.find(function(e){return String(e.id)===String(empId);});
  var old=document.getElementById('cevModal');if(old)old.remove();
  var curName='Admin';
  if(typeof currentCoach!=='undefined'&&currentCoach)curName=currentCoach.name;
  else if(typeof currentAuthUser!=='undefined'&&currentAuthUser){
    var mu=(typeof appUsers!=='undefined'?appUsers:[]).find(function(u){return u.email===currentAuthUser.email;});
    curName=mu?mu.name:((typeof resolveNonEmployeeName==='function'&&resolveNonEmployeeName(currentAuthUser.email))||'Admin');
  }
  function evals(){return (reviews[empId]||[]).filter(function(r){return r.einwand!==undefined;}).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});}
  function avgOf(e,cat){var v=DIMS.filter(function(d){return !cat||d.cat===cat;}).map(function(d){return +e[d.key]||0;}).filter(function(x){return x>0;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:0;}
  function f1(x){return x.toFixed(1).replace('.',',');}
  var st={editId:null,cur:{},base:null};
  var CARD='background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)';
  var BAND='font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);background:#EFECE5;border-radius:8px;padding:5px 10px;display:flex;justify-content:space-between';
  var ov=document.createElement('div');ov.id='cevModal';ov.dataset.puShell='1';
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:7vh 16px 16px';
  var sl='';
  CATS.forEach(function(c,ci){
    sl+='<div style="'+BAND+';margin:'+(ci?12:0)+'px 0 4px"><span>'+c[1]+'</span><span id="cevg-'+c[0]+'" style="letter-spacing:0;text-transform:none;color:var(--text3)"></span></div>';
    DIMS.filter(function(d){return d.cat===c[0];}).forEach(function(d){
      sl+='<div style="display:flex;align-items:center;gap:12px;height:36px;padding:0 10px;border-bottom:1px solid #eae7e0">'
        +'<span style="width:150px;flex-shrink:0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+d.label+'</span>'
        +'<span id="cevl-'+d.key+'" style="width:66px;flex-shrink:0;font-size:12px;color:var(--text3)"></span>'
        +'<input type="range" min="1" max="10" id="cev-'+d.key+'" data-k="'+d.key+'" style="flex:1;min-width:0;accent-color:#3a3833;margin:0;padding:0;height:20px;border:none;background:transparent">'
        +'<b id="cevv-'+d.key+'" style="width:20px;text-align:right;font-size:13.5px"></b>'
        +'<span id="cevd-'+d.key+'" style="width:30px;text-align:right;font-size:12px;font-weight:700"></span></div>';
    });
  });
  sl+='<div style="'+BAND+';margin:12px 0 6px"><span>Notiz <span style="letter-spacing:0;text-transform:none;font-weight:600;color:var(--text3)">optional</span></span></div>'
    +'<textarea id="cev-note" placeholder="Beobachtungen, Begründung, nächste Schritte …" style="min-height:56px;resize:vertical"></textarea>';
  ov.innerHTML='<div style="background:#EEEDE9;border:1px solid #E4E0D6;border-radius:16px;width:860px;max-width:95vw;max-height:86vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.18);position:relative">'
    +'<div style="display:flex;align-items:center;padding:14px 16px 6px"><div style="min-width:0"><div id="cevKick" style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">Mitarbeiterentwicklung</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(emp?esc(emp.name)+(emp.role?' · '+esc(emp.role):''):'')+'</div></div>'
    +'<button class="btn" type="button" id="cevX" style="margin-left:auto;width:34px;height:34px;padding:0;justify-content:center" aria-label="Schließen"><i class="ti ti-x"></i></button></div>'
    +'<div style="display:flex;min-height:0;flex:1">'
    +'<div style="width:56px;flex-shrink:0;align-self:stretch;margin:6px 0 14px 14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;box-shadow:0 10px 24px rgba(40,32,15,.10);position:relative;z-index:3">'
    +'<button class="rl-btn on" type="button" aria-label="Neue Bewertung" data-target="cevSec1" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'cevSec1\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-pencil"></i><span class="rl-tip" style="left:48px">Neue Bewertung</span></button>'
    +'<button class="rl-btn" type="button" aria-label="Ziele" data-target="cevSec3" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'cevSec3\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-flag"></i><span class="rl-tip" style="left:48px">Ziele</span></button>'
    +'<button class="rl-btn" type="button" aria-label="Letzte Bewertungen" data-target="cevSec2" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'cevSec2\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-list"></i><span class="rl-tip" style="left:48px">Letzte Bewertungen</span></button>'
    +'</div>'
    +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0">'
    +'<div id="cevScroll" style="flex:1;overflow-y:auto;padding:6px 18px 12px 14px">'
    +'<div id="cevSec1" style="'+CARD+'"><div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;margin-bottom:10px"><span id="cevTitle">Neue Bewertung</span><span style="margin-left:auto;font-size:12px;font-weight:500;color:var(--text3)">von '+esc(curName)+'</span></div>'
    +'<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:12px"><div style="width:170px;flex-shrink:0"><label>Bewertungsdatum</label><input type="date" id="cev-date"></div>'
    +'</div>'
    +sl
    +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn" type="button" id="cevCancelEdit" style="height:36px;width:auto;display:none">Bearbeiten abbrechen</button>'
    +'<button class="btn btn-primary" type="button" id="cevSave" style="height:36px;width:auto"><i class="ti ti-check"></i> <span>Bewertung speichern</span></button></div></div>'
    +'<div id="cevSec3" style="'+CARD+'"><div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;margin-bottom:10px">Ziele <span id="cevGoalN" style="font-weight:500;color:var(--text3);font-size:12.5px"></span></div>'
    +'<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:10px 12px 12px;margin-bottom:12px"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);margin-bottom:8px">Neues Ziel</div>'
    +'<div style="margin-bottom:10px"><label>Zielbeschreibung</label><textarea id="cevg-desc" rows="2" placeholder="z. B. Super Yes Rate auf 18 % steigern bis Jahresende" style="min-height:52px;resize:vertical"></textarea></div>'
    +'<div id="cevgBezug" style="margin-bottom:10px"></div><select id="cevg-metric" style="display:none" aria-hidden="true"><option value=""></option></select>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label>Zielwert <span id="cevgUnit" style="color:var(--text3)"></span></label><input type="number" id="cevg-target" placeholder="z. B. 18"></div><div><label>Ziel-Datum</label><input type="date" id="cevg-date"></div></div>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" type="button" id="cevGoalSave" style="height:36px;width:auto"><i class="ti ti-check"></i> Ziel speichern</button></div></div>'
    +'<div id="cevGoalList"></div></div>'
    +'<div id="cevSec2" style="'+CARD+';margin-bottom:4px"><div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;margin-bottom:10px">Letzte Bewertungen <span id="cevN" style="font-weight:500;color:var(--text3);font-size:12.5px"></span>'
    +'<button class="btn" type="button" id="cevAll" style="margin-left:auto;height:28px;padding:0 10px;font-size:12px">Alle in Development</button></div><div id="cevList"></div></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:flex-end;gap:8px;padding:4px 18px 14px"><button class="btn" type="button" id="cevClose" style="height:36px;width:auto">Schließen</button></div>'
    +'</div></div>'
    +'<div id="cevToast" style="position:absolute;left:50%;bottom:64px;transform:translateX(-50%);background:#1d1c1a;color:#fff;font-size:13px;font-weight:600;padding:8px 14px;border-radius:10px;display:none;white-space:nowrap;-webkit-font-smoothing:antialiased"></div>'
    +'</div>';
  document.body.appendChild(ov);
  var $=function(id){return document.getElementById(id);};
  $('cevX').onclick=$('cevClose').onclick=function(){ov.remove();};
  $('cevAll').onclick=function(){ov.remove();selectedEmp=empId;view='emp';activeTab='coaching-eval';renderSidebar();renderMain();};
  function toast(m){var t=$('cevToast');if(!t)return;t.textContent=m;t.style.display='block';clearTimeout(window._cevTT);window._cevTT=setTimeout(function(){t.style.display='none';},3000);}
  function refreshTop(){
    var b=st.base;
    DIMS.forEach(function(d){
      var v=st.cur[d.key],lv=b&&(+b[d.key]>0)?+b[d.key]:null;
      $('cevv-'+d.key).textContent=v;
      $('cevl-'+d.key).textContent=lv!=null?'zuletzt '+lv:'';
      var de=$('cevd-'+d.key);
      if(lv==null){de.textContent='';}else{var dd=v-lv;de.textContent=dd>0?'+'+dd:dd<0?String(dd):'±0';de.style.color=dd>0?'#2f6b52':dd<0?'#B5513A':'var(--text3)';}
    });
    CATS.forEach(function(c){$('cevg-'+c[0]).textContent='Ø '+f1(avgOf(st.cur,c[0]));});
  }
  DIMS.forEach(function(d){$('cev-'+d.key).addEventListener('input',function(){st.cur[d.key]=+this.value;refreshTop();});});
  function setEdit(e){
    var list=evals();
    st.editId=e?e.id:null;
    if(e){var idx=list.indexOf(e);st.base=list[idx+1]||null;}else st.base=list[0]||null;
    var src=e||st.base;
    DIMS.forEach(function(d){st.cur[d.key]=src?(+src[d.key]||5):5;$('cev-'+d.key).value=st.cur[d.key];});
    $('cev-date').value=e?e.date:today();$('cev-note').value=e?(e.note||''):'';
    $('cevTitle').textContent=e?'Bewertung bearbeiten':'Neue Bewertung';$('cevKick').textContent=e?'Bewertung bearbeiten':'Mitarbeiterentwicklung';
    $('cevSave').lastElementChild.textContent=e?'Änderung speichern':'Bewertung speichern';$('cevCancelEdit').style.display=e?'':'none';
    refreshTop();
    if(e)$('cevSec1').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderList(){
    var list=evals();$('cevN').textContent='('+list.length+')';
    var ed=canEditHistorie();
    $('cevList').innerHTML=list.length?list.slice(0,5).map(function(e,i){
      var o=avgOf(e),prev=list[i+1]?avgOf(list[i+1]):null,dl=prev!=null?o-prev:0;
      var d=e.date?e.date.slice(8,10)+'.'+e.date.slice(5,7)+'.':'';
      return '<div title="'+esc(e.note||'')+'" style="display:flex;align-items:flex-start;gap:12px;height:84px;padding:12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5;margin-bottom:6px;overflow:hidden">'
        +'<div style="width:96px;flex-shrink:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+d+'</span><span style="font-size:13.5px;font-weight:600;line-height:19px;color:var(--text)">Ø '+f1(o)+(Math.abs(dl)>=0.05?' <span style="font-size:11.5px;font-weight:700;color:'+(dl>0?'#2f6b52':'#B5513A')+'">'+(dl>0?'▲':'▼')+'</span>':'')+'</span></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px">Skill '+f1(avgOf(e,'skill'))+' · Will '+f1(avgOf(e,'will'))+' · Result '+f1(avgOf(e,'result'))+'</div>'
        +'<div style="font-size:13.5px;line-height:19px;height:38px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:'+(e.note?'var(--text)':'var(--text3)')+'">'+(e.note?esc(e.note):'Keine Notiz')+'</div></div>'
        +(ed?'<span style="display:flex;gap:6px;flex-shrink:0;align-self:flex-start">'
          +'<button class="btn" type="button" title="Bearbeiten" data-vid="'+e.id+'" data-act="edit" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-pencil"></i></button>'
          +'<button class="btn" type="button" title="Löschen" data-vid="'+e.id+'" data-act="del" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-trash"></i></button></span>':'')
        +'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch keine Bewertungen.</div>';
    [].slice.call($('cevList').querySelectorAll('button[data-act]')).forEach(function(b){
      b.onclick=function(){
        var e=evals().find(function(r){return String(r.id)===String(b.dataset.vid);});if(!e)return;
        if(b.dataset.act==='edit')setEdit(e);
        else{var n0=(reviews[empId]||[]).length;deleteHistorieEval(empId,e.id);if((reviews[empId]||[]).length<n0){if(st.editId===e.id)setEdit(null);else if(!st.editId)setEdit(null);renderList();toast('Bewertung gelöscht');}}
      };
    });
  }
  window._cevAfterSave=function(){var wasEdit=!!st.editId;setEdit(null);renderList();toast(wasEdit?'Änderung gespeichert':'Bewertung gespeichert');};
  $('cevCancelEdit').onclick=function(){setEdit(null);};
  $('cevSave').onclick=function(){saveCoachEval(empId,st.editId);};
  var e0=editEvalId?evals().find(function(r){return String(r.id)===String(editEvalId);}):null;
  setEdit(e0||null);renderList();

  // ── Ziele ──
  function goalCur(g){if(!g.metricKey)return null;if(goalIsDev(g.metricKey))return goalDevVal(empId,String(g.metricKey).slice(4));var rp=getPerf(empId,30);if(!rp.length)return null;return perfKpiWin(employees.find(function(x){return x.id===empId;}),rp,g.metricKey);} // B1: CR aus Rohzahlen
  function goalStart(g){if(!g.metricKey||!g.createdAt)return null;if(goalIsDev(g.metricKey))return goalDevVal(empId,String(g.metricKey).slice(4),String(g.createdAt).slice(0,10));var c=localYmd(new Date(g.createdAt))||String(g.createdAt).slice(0,10);var f0=addDaysUTC(c,-30);
    var rs=(performance[empId]||[]).filter(function(x){return x.date>=f0&&x.date<c;});
    return rs.length?perfKpiWin(employees.find(function(x){return x.id===empId;}),rs,g.metricKey):null;}
  function renderGoals(){
    var el=$('cevGoalList');if(!el)return;
    var list=(goals[empId]||[]).slice().sort(function(a,b){var oa=(a.status==='erreicht'||a.status==='verfehlt')?1:0,ob=(b.status==='erreicht'||b.status==='verfehlt')?1:0;return oa-ob||String(a.targetDate||'9999').localeCompare(String(b.targetDate||'9999'));});
    var open=list.filter(function(g){return g.status!=='erreicht'&&g.status!=='verfehlt';}).length;
    $('cevGoalN').textContent='('+open+' offen · '+(list.length-open)+' abgeschlossen)';
    var ed=canEditHistorie();
    el.innerHTML=list.length?list.map(function(g){
      var done=g.status==='erreicht',fail=g.status==='verfehlt',closed=done||fail;
      var cur=goalCur(g),st=goalStart(g),tv=g.targetValue!=null?+g.targetValue:null,pc=null;
      if(tv!=null&&cur!=null){if(st!=null&&st!==tv)pc=Math.round((cur-st)/(tv-st)*100);else pc=Math.round(cur/tv*100);pc=Math.max(0,Math.min(100,pc));}
      if(done)pc=100;
      var lbl=g.metricKey?focusMetricLabel(g.metricKey):'Ziel';
      var _u=goalUnit(g.metricKey);var meta=g.metricKey?[st!=null?'Start '+Math.round(st*10)/10+_u:'',cur!=null?'jetzt '+Math.round(cur*10)/10+_u:'',tv!=null?'Ziel '+tv+_u:''].filter(Boolean).join(' · '):(g.status||'offen');
      var d=g.targetDate?'bis '+g.targetDate.slice(8,10)+'.'+g.targetDate.slice(5,7)+'.':'ohne Datum';
      return '<div style="display:flex;align-items:flex-start;gap:12px;height:98px;padding:12px;border:1px solid #E4E0D6;border-radius:10px;background:'+(closed?'#F7F5F0':'#EFECE5')+';margin-bottom:6px;overflow:hidden">'
        +'<div style="width:110px;flex-shrink:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+d+'</span><span style="font-size:13.5px;font-weight:600;line-height:19px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(lbl)+'</span></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(meta)+'</div>'
        +'<div title="'+esc(g.description)+'" style="font-size:13.5px;line-height:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:'+(closed?'var(--text3)':'var(--text)')+'">'+esc(g.description)+'</div>'
        +'<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span style="flex:1;height:6px;border-radius:3px;background:#E4E0D6;overflow:hidden"><i style="display:block;height:100%;width:'+(pc!=null?pc:0)+'%;background:'+(done?'#3a3833':'#F08566')+'"></i></span>'
        +'<span style="font-size:12px;font-weight:700;white-space:nowrap;color:'+(done?'#2f6b52':fail?'#B5513A':'var(--text2)')+'">'+(done?'erreicht':fail?'verfehlt':(pc!=null?pc+' %':esc(g.status||'offen')))+'</span></div></div>'
        +(ed?'<span style="display:flex;gap:6px;flex-shrink:0;align-self:flex-start"><select data-gid="'+g.id+'" class="cev-gstat" title="Status" style="height:34px;width:118px">'+['offen','in Arbeit','erreicht','verfehlt'].map(function(x){return '<option'+(g.status===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>'
          +'<button class="btn" type="button" title="Löschen" data-gid="'+g.id+'" data-act="gdel" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-trash"></i></button></span>':'')
        +'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch keine Ziele vereinbart.</div>';
    [].slice.call(el.querySelectorAll('select.cev-gstat')).forEach(function(sel){sel.onchange=function(){selectedEmp=emp.id;updateGoalStatus(sel.dataset.gid,sel.value);};});
    [].slice.call(el.querySelectorAll('button[data-act=gdel]')).forEach(function(b){b.onclick=function(){selectedEmp=emp.id;deleteGoal(b.dataset.gid);};});
  }
  window._cevGoalsRender=function(){if(document.getElementById('cevModal'))renderGoals();};
  window._cevGoalSaved=function(){if(!document.getElementById('cevModal'))return;$('cevg-desc').value='';$('cevg-metric').value='';GB={v:'',open:null};gbRender();var ms=$('cevg-metric');if(ms&&ms._uiBtn&&typeof ms._uiSync==='function')ms._uiSync();$('cevg-target').value='';$('cevg-date').value='';renderGoals();toast('Ziel gespeichert');};
  $('cevGoalSave').onclick=function(){
    var gd=document.getElementById('goal-desc'),gm=document.getElementById('goal-metric'),gt=document.getElementById('goal-target'),gdt=document.getElementById('goal-date');
    if(gm&&gm.options.length<=1)FOCUS_METRICS.forEach(function(m){var o=document.createElement('option');o.value=m.key;o.textContent=m.label;gm.appendChild(o);});
    gd.value=$('cevg-desc').value;var _mv=$('cevg-metric').value;if(gm&&_mv&&![].some.call(gm.options,function(o){return o.value===_mv;})){var _o=document.createElement('option');_o.value=_mv;_o.textContent=focusMetricLabel(_mv);gm.appendChild(_o);}gm.value=_mv;gt.value=$('cevg-target').value;gdt.value=$('cevg-date').value;
    selectedEmp=emp.id;saveNewGoal(emp.id);
  };
  GB={v:'',open:null};gbRender();
  renderGoals();
}
function gbItems(a){if(a==='Result')return sfKpiList().map(function(k){return [k[0],k[1]];});var L=a==='Skill'?SF_SKILL:SF_WILL;return L.map(function(t){var r=SF_REVIEW_KEYS.find(function(x){return x[1]===t;});return ['dev:'+(r?r[0]:t),t];});}
function gbRender(){var w=document.getElementById('cevgBezug');if(!w)return;
  var h='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'+['Skill','Will','Result'].map(function(a){var it=gbItems(a),sel=it.find(function(x){return x[0]===GB.v;});
    var c='<div class="sf-cell gb-cell" style="position:relative;min-width:0"><label>'+a+'</label><button type="button" class="btn" aria-expanded="'+(GB.open===a)+'" style="width:100%;height:38px;justify-content:space-between;gap:6px;font-weight:500" onclick="gbOpen(\''+a+'\')"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'+(sel?'':'color:var(--text3)')+'">'+(sel?esc(sel[1]):'—')+'</span><i class="ti ti-chevron-down" style="font-size:11px;flex-shrink:0"></i></button>';
    if(GB.open===a)c+='<div class="sf-panel">'+it.map(function(x){return '<label class="sf-opt"><input type="radio" name="gbsel"'+(x[0]===GB.v?' checked':'')+' onchange="gbPick(this.dataset.v)" data-v="'+esc(x[0])+'"> <span>'+esc(x[1])+'</span></label>';}).join('')+'</div>';
    return c+'</div>';}).join('')+'</div><div class="sf-sub" style="margin-bottom:0">optional · eine Auswahl'+(GB.v?' · <a href="#" onclick="gbPick(\'\');return false">entfernen</a>':'')+'</div>';
  w.innerHTML=h;
  var sel=document.getElementById('cevg-metric');if(sel){if(GB.v&&![].some.call(sel.options,function(o){return o.value===GB.v;})){var o=document.createElement('option');o.value=GB.v;o.textContent=focusMetricLabel(GB.v);sel.appendChild(o);}sel.value=GB.v;}
  var u=document.getElementById('cevgUnit');if(u)u.textContent=GB.v?(goalIsDev(GB.v)?'(Bewertung 1–10)':(goalUnit(GB.v)?'(%)':'')):'';
  var t=document.getElementById('cevg-target');if(t)t.placeholder=goalIsDev(GB.v)?'z. B. 7':'z. B. 18';}
function gbOpen(a){GB.open=GB.open===a?null:a;gbRender();}
function gbPick(v){GB.v=v||'';GB.open=null;gbRender();}
function openGoalInPopup(empId){
  openCoachingEval(empId);
  setTimeout(function(){var el=document.getElementById('cevSec3');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});var d=document.getElementById('cevg-desc');if(d)d.focus();},80);
}
function saveCoachEval(empId,editId){
  if(_savingCoachEval)return;
  var KEYS=['opener','einwand','loop','bedarf','abschluss','gespraech','zusammenfassung','produkt','motivation','coach','zuverl','team','crOEM','crTW','crSY','crMY'];
  var dateEl=document.getElementById('cev-date');
  var noteEl=document.getElementById('cev-note');
  if(!dateEl){alert('Fehler: Formular nicht gefunden.');return;}
  var date=dateEl.value;
  var note=noteEl?noteEl.value.trim():'';
  if(!date){alert('Bitte Datum eingeben.');return;}
  var entry={date:date,note:note};
  KEYS.forEach(function(k){
    var el=document.getElementById('cev-'+k);
    entry[k]=el?parseInt(el.value):5;
  });
  _savingCoachEval=true;
  sb.from('reviews').select('id').eq('employee_id',empId).eq('type','Mitarbeiterentwicklung').eq('date',date).then(function(existRes){
    if(existRes.error){_savingCoachEval=false;alert('Fehler beim Speichern: '+existRes.error.message);return;}
    // C8: Bearbeiten ersetzt die bearbeitete Zeile (auch bei neuem Datum); eine andere Bewertung am selben Tag nur nach Rückfrage ersetzen
    var other=(existRes.data||[]).map(function(r){return r.id;}).filter(function(id){return String(id)!==String(editId||'');});
    if(other.length&&!confirm('Am '+fd(date)+' gibt es schon eine Bewertung.\n\nOK = diese ersetzen\nAbbrechen = nicht speichern (z. B. anderes Datum wählen)')){_savingCoachEval=false;return;}
    var existingId=editId||other[0]||null,drop=other.filter(function(id){return String(id)!==String(existingId);});
    var payload={employee_id:empId,type:'Mitarbeiterentwicklung',date:date,status:'abgeschlossen',notes:note};
    var upsert=existingId
      ? sb.from('reviews').update(payload).eq('id',existingId).select().single()
      : sb.from('reviews').insert(payload).select().single();
    upsert.then(function(res){
      if(res.error){_savingCoachEval=false;alert('Fehler beim Speichern: '+res.error.message);return;}
      var reviewId=res.data.id;
      var kpiRows=KEYS.map(function(k){return {review_id:reviewId,metric_key:k,value:entry[k]};});
      sb.from('review_kpis').upsert(kpiRows,{onConflict:'review_id,metric_key'}).then(function(res2){
        _savingCoachEval=false;
        if(res2.error)alert('Bewertung gespeichert, aber die Einzel-Werte (12 Dimensionen) konnten NICHT gespeichert werden: '+res2.error.message);
        if(!reviews[empId])reviews[empId]=[];
        reviews[empId]=reviews[empId].filter(function(r){return String(r.id)!==String(reviewId)&&!(drop.some(function(id){return String(id)===String(r.id);}))&&!(r.date===date&&r.einwand!==undefined);});
        if(drop.length)sb.from('review_kpis').delete().in('review_id',drop).then(function(){return sb.from('reviews').delete().in('id',drop);}).then(function(rd){if(rd&&rd.error)alert('Die ersetzte Bewertung konnte nicht gelöscht werden: '+rd.error.message);});
        entry.id=reviewId;
        reviews[empId].push(entry);
        var e0=employees.find(function(x){return x.id===empId;});
        logActivity('eval',existingId?'updated':'created','Mitarbeiterentwicklung bewertet',empId,(e0?e0.name:'')+' · '+fd(date));
        var modal=document.getElementById('cevModal');
        if(modal&&typeof window._cevAfterSave==='function')window._cevAfterSave();else if(modal)modal.remove();
        if(view==='emp')renderTab();
      });
    }).catch(function(err){
      _savingCoachEval=false;
      alert('Unerwarteter Fehler: '+err.message);
    });
  }).catch(function(err){
    _savingCoachEval=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}

function toggleSessCard(eid){
  var body=document.getElementById('body-'+eid);
  var arr=document.getElementById('arr-'+eid);
  if(!body)return;
  var open=body.style.display==='none'||body.style.display==='';
  body.style.display=open?(body.tagName==='TR'?'table-row':'block'):'none';
  if(arr)arr.style.transform=open?'rotate(180deg)':'rotate(0deg)';
}
function syncSessFocusMetric(){
  var topicEl=document.getElementById('sess-topic-sel');
  var fmEl=document.getElementById('sess-focus-metric');
  if(!topicEl||!fmEl)return;
  var mapped=TOPIC_TO_METRIC[topicEl.value];
  fmEl.value=mapped||'';
}
// Result-KPIs: Schlüssel (wie im Feld focus_metric) und Beschriftung
function sfKpiList(){return KAL_KPIS.map(function(k){return [k[0],k[1]];}).concat([['margeGesamt','Marge']]);}
function sfKpiLabel(k){var x=sfKpiList().find(function(y){return y[0]===k;});return x?x[1]:k;}
function sfKpiKey(l){var x=sfKpiList().find(function(y){return y[1]===l;});return x?x[0]:null;}
function sfEmp(){var id=(ncSelectedEmpIds&&ncSelectedEmpIds.length===1)?ncSelectedEmpIds[0]:(ncSelectedEmpIds&&ncSelectedEmpIds.length?null:selectedEmp);return id?employees.find(function(e){return String(e.id)===String(id);}):null;}
function sfMissKeys(e){if(!e||typeof kalKpiMisses!=='function')return [];var t=today(),y=addDaysUTC(t,-1),from=t.slice(0,7)+'-01';if(from>y)from=addDaysUTC(t,-7);
  var lab=kalKpiMisses(e,from,y);return KAL_KPIS.filter(function(k){return lab.indexOf(k[1])>=0;}).map(function(k){return k[0];});}
// Schwächste bzw. nicht gewachsene Punkte der letzten Entwicklungsbewertung (für das Performance Review)
function sfReviewWeak(eid,n){var L=(reviews[eid]||[]).filter(function(r){return r&&r.einwand!==undefined;}).sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});if(!L.length)return [];
  var cur=L[L.length-1],prev=L.length>1?L[L.length-2]:null;
  return SF_REVIEW_KEYS.filter(function(k){return +cur[k[0]]>0;}).map(function(k){var v=+cur[k[0]]||0,d=prev&&+prev[k[0]]>0?v-(+prev[k[0]]):0;return {t:k[1],v:v,d:d};}).sort(function(a,b){return a.d-b.d||a.v-b.v;}).slice(0,n||2).map(function(x){return x.t;});}
function sfSyncHidden(){SF.metric=SF.metrics[0]||'';var c=document.getElementById('sess-category'),ty=document.getElementById('sess-type'),tp=document.getElementById('sess-topic-sel'),fm=document.getElementById('sess-focus-metric');
  if(c){for(var i=0;i<c.options.length;i++)if(c.options[i].text===SF.cat){c.selectedIndex=i;break;}}
  if(ty){var f=false;for(var j=0;j<ty.options.length;j++)if(ty.options[j].value===SF.art||ty.options[j].text===SF.art){ty.selectedIndex=j;f=true;break;}if(!f){var o=document.createElement('option');o.textContent=SF.art;ty.appendChild(o);ty.value=SF.art;}}
  if(tp)tp.value=SF.topics[0]&&SF_TOPICS.indexOf(SF.topics[0])>=0?SF.topics[0]:'';
  if(fm){var hit=false;for(var m=0;m<fm.options.length;m++)if(fm.options[m].value===SF.metric){hit=true;break;}fm.value=hit?SF.metric:'';}}
// Gespeichert werden alle Fokus-Punkte als Themen (Skill, Will und die Result-KPIs), die erste KPI zusätzlich als Ziel-KPI
function sfSaveTopics(){return SF.topics.concat(SF.metrics.map(sfKpiLabel));}
function sfRender(){var w=document.getElementById('sfWas'),f=document.getElementById('sfFokus');if(!w||!f)return;
  var h='<span class="dsh-seg">'+SF_ARTS.map(function(a){return '<button type="button" class="'+(a[0]===SF.art?'on':'')+'" onclick="sfArt(this.dataset.a)" data-a="'+esc(a[0])+'">'+esc(a[1])+'</button>';}).join('')
    +(SF.legacy?'<button type="button" class="'+(SF.art===SF.legacy?'on':'')+'" onclick="sfArt(this.dataset.a)" data-a="'+esc(SF.legacy)+'" title="Art aus der Zeit vor der Umstellung">'+esc(SF.legacy)+' (bisher)</button>':'')+'</span>';
  var n=(ncSelectedEmpIds||[]).length;if(n>1)h+='<div class="sf-sub" style="margin-bottom:0">Gruppensession mit '+n+' Mitarbeitern</div>';
  w.innerHTML=h;
  var e=sfEmp(),miss=sfMissKeys(e),kpis=sfKpiList().slice().sort(function(a,b){return (miss.indexOf(b[0])>=0)-(miss.indexOf(a[0])>=0);});
  var A={Skill:{items:SF_SKILL.map(function(t){return [t,t];}),sel:SF.topics.filter(function(t){return SF_SKILL.indexOf(t)>=0;})},
         Will:{items:SF_WILL.map(function(t){return [t,t];}),sel:SF.topics.filter(function(t){return SF_WILL.indexOf(t)>=0;})},
         Result:{items:kpis,sel:SF.metrics.slice()}};
  var g='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'+['Skill','Will','Result'].map(function(a){var o=A[a],lbl=o.sel.map(function(v){return a==='Result'?sfKpiLabel(v):v;});
    var cell='<div class="sf-cell" style="position:relative;min-width:0"><label>'+a+'</label><button type="button" class="btn" aria-expanded="'+(SF.open===a)+'" style="width:100%;height:38px;justify-content:space-between;gap:6px;font-weight:500" onclick="sfOpen(\''+a+'\')"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'+(lbl.length?'':'color:var(--text3)')+'">'+(lbl.length?esc(lbl.join(', ')):'— auswählen —')+'</span><i class="ti ti-chevron-down" style="font-size:11px;flex-shrink:0"></i></button>';
    if(SF.open===a)cell+='<div class="sf-panel">'+o.items.map(function(it){var on=o.sel.indexOf(it[0])>=0,u=a==='Result'&&miss.indexOf(it[0])>=0;return '<label class="sf-opt"><input type="checkbox"'+(on?' checked':'')+' onchange="sfPick(\''+a+'\',this.dataset.v)" data-v="'+esc(it[0])+'"> <span>'+esc(it[1])+'</span>'+(u?'<span class="sf-d" title="unter Ziel" style="margin:0 0 0 auto"></span>':'')+'</label>';}).join('')+'</div>';
    return cell+'</div>';}).join('')+'</div>';
  var _gE=sfEmp(),_G=_gE?(goals[_gE.id]||[]).filter(function(x){return x.status!=='erreicht'&&x.status!=='verfehlt'&&x.metricKey;}):[];
  var info=[];if(_G.length){var _gt=_G.slice(0,3).map(function(x){return focusMetricLabel(x.metricKey)+(x.targetValue!=null?' ≥ '+x.targetValue+goalUnit(x.metricKey):'')+(x.targetDate?' bis '+kalF(x.targetDate):'');});var _all=_G.every(function(x){return goalIsDev(x.metricKey)?SF.topics.indexOf(focusMetricLabel(x.metricKey))>=0:SF.metrics.indexOf(x.metricKey)>=0;});info.push('Ziele: '+esc(_gt.join(', '))+(_all?'':' · <a href="#" onclick="sfGoalsAdopt();return false">übernehmen</a>'));}
  if(miss.length)info.push('<span class="sf-d"></span>Result: '+esc(miss.map(sfKpiLabel).join(', '))+' unter Ziel im laufenden Monat');if(SF.hint)info.push(esc(SF.hint));
  if(info.length)g+='<div class="sf-sub" style="margin-bottom:0">'+info.join(' · ')+'</div>';
  f.innerHTML=g;sfSyncHidden();}
function sfGoalsAdopt(){var e=sfEmp();if(!e)return;(goals[e.id]||[]).forEach(function(x){if(x.status==='erreicht'||x.status==='verfehlt'||!x.metricKey)return;if(goalIsDev(x.metricKey)){var l=focusMetricLabel(x.metricKey);if(SF.topics.indexOf(l)<0)SF.topics.push(l);}else if(SF.metrics.indexOf(x.metricKey)<0)SF.metrics.push(x.metricKey);});sfRender();}
function sfOpen(a){SF.open=SF.open===a?null:a;sfRender();}
function sfPick(a,v){if(a==='Result'){var i=SF.metrics.indexOf(v);if(i>=0)SF.metrics.splice(i,1);else SF.metrics.push(v);}else{var j=SF.topics.indexOf(v);if(j>=0)SF.topics.splice(j,1);else SF.topics.push(v);}sfRender();}

function sfArt(a){SF.art=a;if(a!==SF.legacy)SF.cat=findCoachingCategoryForType(a);sfRender();}


function sfNew(){return {cat:'Coaching',art:'Einzelcoaching',legacy:null,topics:[],metrics:[],metric:'',hint:'',open:null};}
function sfReset(){SF=sfNew();sfRender();}
function sfSetType(t){if(!t)return;var inNew=Object.keys(COACHING_CATEGORIES).some(function(c){return COACHING_CATEGORIES[c].indexOf(t)>=0;});SF.art=t;SF.cat=findCoachingCategoryForType(t);SF.legacy=inNew?null:t;sfRender();}
// Aus den (versteckten) Feldern übernehmen, z. B. beim Erfassen einer geplanten Session
function sfFromSelects(fokusText){var ty=document.getElementById('sess-type'),fm=document.getElementById('sess-focus-metric'),tp=document.getElementById('sess-topic-sel');
  if(ty&&ty.value)sfSetType(ty.value);
  var tx=fokusText||(tp&&tp.value)||'',all=tx?tx.split(/\s*,\s*/).filter(function(x){return x;}).map(function(x){return TOPIC_ALIAS[x]||x;}):[];
  SF.metrics=[];SF.topics=[];all.forEach(function(x){var k=sfKpiKey(x);if(k){if(SF.metrics.indexOf(k)<0)SF.metrics.push(k);}else SF.topics.push(x);});
  if(fm&&fm.value){var i=SF.metrics.indexOf(fm.value);if(i>0)SF.metrics.splice(i,1);if(i!==0)SF.metrics.unshift(fm.value);}
  sfRender();}
// Aus einer Aufgabe: Art setzen, Fokus vorschlagen
function sfPreset(typ,eid){SF=sfNew();sfSetType(typ);var e=employees.find(function(x){return String(x.id)===String(eid);});
  var miss=sfMissKeys(e);if(miss.length)SF.metrics=[miss[0]];
  if(typ==='Performance Review'&&e){var w=sfReviewWeak(e.id,2);if(w.length){SF.topics=w;SF.hint='Skill/Will aus der Entwicklungsbewertung';}}
  sfRender();}
function saveSession(empId){
  if(_savingSession)return; // verhindert doppeltes Anlegen bei ungeduldigem Doppelklick
  var date=document.getElementById('sess-date').value;
  if(!date){alert('Bitte Datum eingeben.');return;}
  var timeEl=document.getElementById('sess-time');
  var uhrzeit=timeEl?timeEl.value:'';
  var endTimeEl=document.getElementById('sess-end-time');
  var endUhrzeit=endTimeEl?endTimeEl.value:'';
  if(uhrzeit&&endUhrzeit&&endUhrzeit<=uhrzeit){alert('Die Endzeit muss nach der Startzeit liegen.');return;}
  var _sf=!!document.getElementById('sfWas');
  var type=_sf?SF.art:document.getElementById('sess-type').value;
  var start=document.getElementById('sess-start').value.trim();
  var stop=document.getElementById('sess-stop').value.trim();
  var cont=document.getElementById('sess-cont').value.trim();
  var notes=document.getElementById('sess-note').value.trim();
  var topics=[];
  var sel=document.getElementById('sess-topic-sel');
  if(_sf)topics=sfSaveTopics();else if(sel&&sel.value)topics.push(sel.value);
  var focus=topics.join(', ');
  var fmEl=document.getElementById('sess-focus-metric');
  var focusMetric=_sf?(SF.metrics[0]||''):(fmEl?fmEl.value:'');
  var editId=_editingSessionId;
  var empIds=(!editId&&ncSelectedEmpIds.length)?ncSelectedEmpIds.slice():[empId];

  if(!editId&&empIds.length>1){
    // Gruppencoaching: eine verknuepfte Session je Mitarbeiter anlegen
    var groupId='grp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    var rows=empIds.map(function(eid){
      return {
        employee_id:eid,date:date,uhrzeit:uhrzeit||null,end_uhrzeit:endUhrzeit||null,art:type,rating:null,
        note:notes,focus:focus,status:'abgeschlossen',
        start_note:start,stop_note:stop,continue_note:cont,
        coach_id:currentCoach?currentCoach.id:null,
        focus_metric:focusMetric||null,group_id:groupId
      };
    });
    _savingSession=true;
    sb.from('protocols').insert(rows).select().then(function(res){
      _savingSession=false;
      if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
      (res.data||[]).forEach(function(r){
        var eid=r.employee_id;
        if(!protocols[eid])protocols[eid]=[];
        protocols[eid].unshift({
          id:r.id,date:date,uhrzeit:uhrzeit,endUhrzeit:endUhrzeit,type:type,rating:null,
          topics:topics,start:start,stop:stop,cont:cont,notes:notes,note:notes,focus:focus,status:'abgeschlossen',
          coachId:r.coach_id||null,focusMetric:r.focus_metric||null,groupId:groupId
        });
      });
      var namesTxt=empIds.map(function(id){var e=employees.find(function(x){return x.id===id;});return e?e.name:id;}).join(', ');
      logActivity('session','created','Gruppensession erfasst ('+empIds.length+' Mitarbeiter): '+(type||'Session'),null,namesTxt+(focus?' · '+focus:'')+' · '+fd(date));
      resetSessionFormFields();
      ncAfterSave(true);
      renderTab();
    }).catch(function(err){_savingSession=false;alert('Unerwarteter Fehler: '+err.message);});
    return;
  }

  var singleEmpId=empIds[0]||empId;
  var payload={
    employee_id:singleEmpId,date:date,uhrzeit:uhrzeit||null,end_uhrzeit:endUhrzeit||null,art:type,rating:null,
    note:notes,focus:focus,status:'abgeschlossen',
    start_note:start,stop_note:stop,continue_note:cont,
    coach_id:currentCoach?currentCoach.id:null,
    focus_metric:focusMetric||null
  };
  // C7: beim Bearbeiten Coach und Bewertung der bestehenden Session behalten
  var _old=editId?(protocols[singleEmpId]||[]).find(function(p){return String(p.id)===String(editId);}):null;
  if(editId){delete payload.rating;if(_old&&_old.coachId)delete payload.coach_id;}
  var dbCall=editId
    ? sb.from('protocols').update(payload).eq('id',editId).select().single()
    : sb.from('protocols').insert(payload).select().single();
  _savingSession=true;
  dbCall.then(function(res){
    _savingSession=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    var r=res.data;
    var entry={
      id:r.id,date:r.date,uhrzeit:uhrzeit,endUhrzeit:endUhrzeit,type:type,rating:r.rating!=null?r.rating:null,
      topics:topics,start:start,stop:stop,cont:cont,notes:notes,note:notes,focus:focus,status:'abgeschlossen',
      coachId:r.coach_id||null,focusMetric:r.focus_metric||null
    };
    if(!protocols[singleEmpId])protocols[singleEmpId]=[];
    if(editId){
      var idx=protocols[singleEmpId].findIndex(function(p){return String(p.id)===String(editId);});
      if(idx>=0){protocols[singleEmpId][idx]=Object.assign({},protocols[singleEmpId][idx],entry);}else{protocols[singleEmpId].unshift(entry);}
    } else {
      protocols[singleEmpId].unshift(entry);
    }
    var empForLog=employees.find(function(e){return e.id===singleEmpId;});
    logActivity('session',editId?'updated':'created',(editId?'Session bearbeitet':'Neue Session erfasst')+': '+(type||'Session'),singleEmpId,(empForLog?empForLog.name:'')+(focus?' · '+focus:'')+' · '+fd(date));
    _editingSessionId=null;
    resetSessionFormFields();
    ncAfterSave(false);
    renderTab();
  }).catch(function(err){
    _savingSession=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}
function resetSessionFormFields(){
  if(typeof sfReset==='function')setTimeout(sfReset,0);
  ['sess-start','sess-stop','sess-cont','sess-note'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  var tsel=document.getElementById('sess-topic-sel');
  if(tsel)tsel.value='';
  var fmsel=document.getElementById('sess-focus-metric');
  if(fmsel)fmsel.value='';
  var tel=document.getElementById('sess-time');
  if(tel)tel.value='';
  var etel=document.getElementById('sess-end-time');
  if(etel)etel.value='';
  ncSelectedEmpIds=[];
}
function saveRatingCriterion(){
  if(_savingRatingCriterion)return;
  var name=document.getElementById('rcName').value.trim();
  var cat=document.getElementById('rcCat').value;
  var target=parseInt(document.getElementById('rcTarget').value)||80;
  var desc=document.getElementById('rcDesc').value.trim();
  if(!name)return;
  _savingRatingCriterion=true;
  sb.from('rating_criteria').insert({name:name,category:cat,target:target,description:desc,sort_order:ratingCriteria.length}).select().single().then(function(res){
    _savingRatingCriterion=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    var r=res.data;
    ratingCriteria.push({id:r.id,name:r.name,cat:r.category,target:r.target,desc:r.description||''});
    logActivity('criteria','created','Neues QA-Bewertungskriterium angelegt: "'+name+'" ('+cat+')',null,'Ziel: '+target+'%');
    closeModal('ratingModal');
    renderTab();
  }).catch(function(err){
    _savingRatingCriterion=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}
function esBuildHtml(emp,asPopup,html){
  html=html||'';
    var t=empTargets(emp);
    var _tr=emp.targets||{};
    var tf={
      crOEM:_tr.crOEM!=null?_tr.crOEM:t.crOEM.val,crOEMDir:_tr.crOEMDir||t.crOEM.dir,
      crTW:_tr.crTW!=null?_tr.crTW:t.crTeilweise.val,crTWDir:_tr.crTWDir||t.crTeilweise.dir,
      crSuperYes:_tr.crSuperYes!=null?_tr.crSuperYes:t.crSuperYes.val,crSYDir:_tr.crSYDir||t.crSuperYes.dir,
      crMegaYes:_tr.crMegaYes!=null?_tr.crMegaYes:t.crMegaYes.val,crMYDir:_tr.crMYDir||t.crMegaYes.dir,
      optPerH:_tr.optPerH!=null?_tr.optPerH:t.optPerH.val,optPerHDir:_tr.optPerHDir||t.optPerH.dir,
      optPerDay:_tr.optPerDay!=null?_tr.optPerDay:t.optPerDay.val,optPerDayDir:_tr.optPerDayDir||t.optPerDay.dir
    };
    var swatches=COLORS.map(function(col,i){
      return '<div onclick="setEmpColor('+i+')" style="width:28px;height:28px;border-radius:50%;cursor:pointer;background:'+col.bg+';border:3px solid '+(emp.color===i?col.text:'transparent')+';display:inline-block;margin-right:6px;margin-bottom:6px;transition:all .15s"></div>';
    }).join('');
    var teamOpts=allTeams().map(function(tm){return '<option'+(tm===emp.team?' selected':'')+'>'+tm+'</option>';}).join('')+'<option value="__new__">+ Neues Team...</option>';
    var ROLLEN=['Vertriebsmitarbeiter','Senior Vertriebsmitarbeiter','Sales Coach'];

    if(true){

      // ── Provisionsvereinbarung (jetzt inkl. Stammdaten, mitarbeiterspezifisch) ──
      (function(){
        var pv=(emp.provisionSettings)||{};
        function pvNum(key,def){return pv[key]!=null?pv[key]:def;}
        var m1=pv.monat1||{}, m2=pv.monat2||{}, m3=pv.monat3plus||{};
        // Gespeichert leer (null) = bewusst kein Ziel → Feld bleibt leer; nie gespeichert → Standardwert vorschlagen
        function pvMonatNum(mObj,key,def){if(Object.prototype.hasOwnProperty.call(mObj,key))return mObj[key]==null||mObj[key]===''?'':mObj[key];return def;}
        // Box als nummerierte Abschnitte: Inhalte werden in Segmente gesammelt und unten zusammengesetzt.
        // Alle Eingabefelder bleiben (auch zugeklappt) im DOM, damit Speichern unveraendert alle Werte liest.
        var _esOuter=html; html=''; var SEG={};
        function cut(k){SEG[k]=(SEG[k]||'')+html; html='';}
        var isVlcModel=(emp.role==='VLC');
        var vpv=effectiveProvisionSettings(emp,'9999-12').vlc;
        var esWeekTotal=0, esWorkDaysTxt='';
        var esBm=emp.startDate?beschaeftigungsmonat(emp,today().slice(0,7)):null;
        var esCurIdx=esBm?Math.min(esBm,3)-1:-1;

        html+='<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px">';
        html+='<div><label>Vollständiger Name</label><input type="text" id="es-name" value="'+esc(emp.name)+'"></div>';
        (function(){var ad=currentUserRole==='admin'||(asPopup&&asPopup!=='panels'),dis=ad?'':' disabled title="Nur Admins"',fn=personFn(emp),st=personStufe(emp),ort=personOrt(emp);
          html+='<div><label>Funktion</label><select id="es-fn"'+dis+' onchange="esPersonSync()">'+PERSON_FN.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===fn?' selected':'')+(x[0]==='sdl'&&currentUserRole!=='admin'&&fn!=='sdl'?' disabled':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';
          html+='<div id="es-stufe-wrap"'+((fn==='agent'||fn==='coach')?'':' style="display:none"')+'><label>Stufe</label><select id="es-stufe"'+dis+' onchange="esPersonSync()">'+(fn==='coach'?['SDC','SDM']:['SR','SE']).map(function(x){return '<option'+(x===st?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div>';
          html+='<div><label>Standort</label><select id="es-ort"'+dis+' onchange="esPersonSync()"><option value="MUC"'+(ort==='MUC'?' selected':'')+'>MUC</option><option value="VLC"'+(ort==='VLC'?' selected':'')+'>VLC</option></select></div>';
          if(emp.id&&currentUserRole==='admin'){var br=emp.boardRole||'',pr=positionRole(emp);html+='<div><label>Zugang zum Board</label><select data-eid="'+emp.id+'" onchange="updateEmpBoardRole(this)"><option value=""'+(br?'':' selected')+'>Automatisch ('+pr+')</option>'+['admin','coach','viewer','agent','none'].map(function(k){return '<option value="'+k+'"'+(br===k?' selected':'')+'>'+BOARD_ROLE_LABEL[k]+'</option>';}).join('')+'</select></div>';}})();
        html+='<div style="display:none"><label>Position</label>'
          +'<select id="es-role"'+(currentUserRole!=='admin'&&(!asPopup||asPopup==='panels')?' disabled title="Position ändern nur Admins"':'')+' onchange="esSdlToggle(this.value);var cv=this.value;if(cv===\'__new__\'){var nv=prompt(\'Neue Position eingeben:\');if(nv&&nv.trim()){var opt=document.createElement(\'option\');opt.value=nv.trim();opt.text=nv.trim();this.add(opt);this.value=nv.trim();}}toggleProvisionModel(this.value);">'
          +'<option'+(emp.role==='SR'?' selected':'')+'>SR</option>'
          +'<option'+(emp.role==='SE'?' selected':'')+'>SE</option>'
          +'<option'+(emp.role==='VLC'?' selected':'')+'>VLC</option>'
          +'<option'+(emp.role==='SDM'?' selected':'')+'>SDM</option>'
          +'<option'+(emp.role==='SDC'?' selected':'')+'>SDC</option>'
          +'<option'+(emp.role==='SDL'?' selected':'')+(currentUserRole!=='admin'&&emp.role!=='SDL'?' disabled':'')+'>SDL</option>'
          +(emp.role==='KAL'?'<option value="KAL" selected>Ohne Board (nur Kalender)</option>':'')
          +'<option value="__new__">+ Neue Position hinzufügen</option>'
          +'</select></div>';
        html+='<div><label>Phase</label><select id="es-phase">'
          +'<option'+(emp.phase==='Onboarding'?' selected':'')+'>Onboarding</option>'
          +'<option'+(emp.phase==='Aktiv'?' selected':'')+'>Aktiv</option>'
          +'<option'+(emp.phase==='Inaktiv'?' selected':'')+'>Inaktiv</option>'
          +'</select></div>';
        html+='<div><label>Anstellung</label><select id="es-contract">'
          +'<option value="Vollzeit"'+(emp.contract==='Vollzeit'||emp.contract==='full'?' selected':'')+'>Vollzeit</option>'
          +'<option value="Teilzeit"'+(emp.contract==='Teilzeit'||emp.contract==='part'?' selected':'')+'>Teilzeit</option>'
          +'</select></div>';
        html+='</div>';
        html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
        html+='<div><label>E-Mail</label><input type="email" id="es-email" value="'+esc(emp.email||'')+'" placeholder="name@wiegand-gmbh.de"></div>';
        html+='<div><label>Avatar-Farbe</label><div style="margin-top:6px">'+swatches+'</div></div>';
        html+='</div>';

        (function(){var cands=teamTargetList().filter(function(x){return String(x.id)!==String(emp.id)&&x.role!=='SDL';}).sort(function(a,b){return a.name.localeCompare(b.name);});var mine=(emp.sdlTeam||[]),ro=currentUserRole!=='admin';
          html+='<div id="es-sdl-team" style="'+(emp.role==='SDL'?'':'display:none;')+'margin:6px 0 12px"><label>Team (Position SDL)</label><div class="kal-note" style="margin-bottom:8px">Diese Mitarbeiter sieht der SDL in der Provisionsübersicht, dazu sich selbst. Ihre Weeklys und QA-Bewertungen gehen an ihn.'+(ro?' Ändern nur Admins.':'')+'</div>'
            +'<div style="display:flex;flex-wrap:wrap;gap:6px 14px">'+cands.map(function(x){var on=mine.indexOf(String(x.id))>=0;return '<label style="display:inline-flex;align-items:center;gap:6px;margin:0;font-weight:400;cursor:pointer;font-size:13px"><input type="checkbox" class="es-sdl-cb" value="'+esc(String(x.id))+'" style="width:auto;margin:0" '+(on?'checked':'')+(ro?' disabled':'')+'>'+esc(x.name)+'</label>';}).join('')+'</div></div>';})();
        cut('person');
        html+='<p style="font-size:11.5px;color:var(--text3);margin-bottom:10px;line-height:1.5">Arbeitszeiten je Wochentag – ermöglicht präzise Teilzeit-Steuerung und eine korrekte Optimierungen/Std.-Berechnung (z.B. kürzerer Freitag, längerer Montag).</p>';
        (function(){
          var DEFAULT_WH={
            mo:{von:'08:30',bis:'18:00',pause:30},di:{von:'08:30',bis:'17:00',pause:30},mi:{von:'08:30',bis:'17:00',pause:30},
            do:{von:'08:30',bis:'17:00',pause:30},fr:{von:'08:30',bis:'16:00',pause:30},sa:{von:'',bis:'',pause:0},so:{von:'',bis:'',pause:0}
          };
          var wh=emp.workHours||{};
          var days=[{key:'mo',lbl:'Montag'},{key:'di',lbl:'Dienstag'},{key:'mi',lbl:'Mittwoch'},{key:'do',lbl:'Donnerstag'},{key:'fr',lbl:'Freitag'},{key:'sa',lbl:'Samstag'},{key:'so',lbl:'Sonntag'}];
          function calcNetHours(von,bis,pause){
            if(!von||!bis)return 0;
            var vp=von.split(':'),bp=bis.split(':');
            var mins=(+bp[0]*60+ +bp[1])-(+vp[0]*60+ +vp[1])-(pause||0);
            return Math.max(0,mins/60);
          }
          html+='<div class="std-wrap" style="margin-bottom:16px"><table class="std-table inputs" style="border-collapse:collapse;table-layout:fixed;min-width:100%">';
          html+='<thead><tr>'
            +'<th style="background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:left;padding-left:12px;width:240px">Wochentag</th>'
            +'<th style="background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:center;width:208px">Von</th>'
            +'<th style="background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:center;width:208px">Bis</th>'
            +'<th style="background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:center;width:208px">Pause (Min.)</th>'
            +'<th style="background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:center;width:130px">Arbeitszeit</th>'
            +'</tr></thead><tbody>';
          var weekTotal=0;
          days.forEach(function(d,ridx){
            var dv=wh[d.key]||DEFAULT_WH[d.key];
            var rowBg='';
            var netH=calcNetHours(dv.von,dv.bis,dv.pause);
            weekTotal+=netH;
            html+='<tr style="'+rowBg+'">'
              +'<td style="padding:9px 8px;padding-left:12px;font-weight:600;color:var(--text2);font-size:12.5px;border-bottom:1px solid #ebe9e3;width:240px">'+d.lbl+'</td>'
              +'<td style="padding:8px;text-align:center;border-bottom:1px solid #ebe9e3"><input type="time" id="es-wh-'+d.key+'-von" value="'+(dv.von||'')+'" oninput="updateWorkHoursRow(\''+d.key+'\')" style="width:100px;padding:6px;border:1px solid #d8d5cd;border-radius:6px;font-size:13px;font-weight:700;color:var(--text);text-align:center;background:var(--s-white)"></td>'
              +'<td style="padding:8px;text-align:center;border-bottom:1px solid #ebe9e3"><input type="time" id="es-wh-'+d.key+'-bis" value="'+(dv.bis||'')+'" oninput="updateWorkHoursRow(\''+d.key+'\')" style="width:100px;padding:6px;border:1px solid #d8d5cd;border-radius:6px;font-size:13px;font-weight:700;color:var(--text);text-align:center;background:var(--s-white)"></td>'
              +'<td style="padding:8px;text-align:center;border-bottom:1px solid #ebe9e3"><input type="number" id="es-wh-'+d.key+'-pause" value="'+(dv.pause!=null?dv.pause:30)+'" step="5" min="0" max="180" oninput="updateWorkHoursRow(\''+d.key+'\')" style="width:64px;padding:6px;border:1px solid #d8d5cd;border-radius:6px;font-size:13px;font-weight:700;color:var(--text);text-align:center;background:var(--s-white)"></td>'
              +'<td style="padding:8px;text-align:center;border-bottom:1px solid #ebe9e3"><span id="es-wh-'+d.key+'-result" style="font-size:13px;font-weight:700;color:var(--text)">'+netH.toFixed(1)+' Std.</span></td>'
              +'</tr>';
          });
          html+='<tr class="sum" style="background:#1d1c1a">'
            +'<td colspan="4" style="padding:9px 8px;padding-left:12px;font-weight:700;color:#fff;font-size:12.5px">Summe</td>'
            +'<td style="padding:8px;text-align:center"><span id="es-wh-summe-result" style="font-size:14px;font-weight:700;color:#fff">'+weekTotal.toFixed(1)+' Std.</span></td>'
            +'</tr>';
          html+='</tbody></table></div>';
          // C4: Änderungen gelten ab einem Datum; frühere Tage rechnen mit der damaligen Arbeitszeit
          html+='<div style="margin:-6px 0 12px"><label>Änderung gültig ab</label><input type="date" id="es-wh-ab" value="'+today()+'"'+(EV_OK?'':' disabled')+' style="width:auto"></div>';
          html+='<div id="es-wh-verlauf" style="margin-bottom:16px">'+esWhVerlaufHtml(emp)+'</div>';
          esWeekTotal=weekTotal;
          var wdIdx=[];days.forEach(function(d,ix){var dv=wh[d.key]||DEFAULT_WH[d.key];if(calcNetHours(dv.von,dv.bis,dv.pause)>0)wdIdx.push(ix);});
          var sh=['Mo','Di','Mi','Do','Fr','Sa','So'];
          var contiguous=wdIdx.length>1&&wdIdx[wdIdx.length-1]-wdIdx[0]===wdIdx.length-1;
          esWorkDaysTxt=!wdIdx.length?'keine Arbeitstage':contiguous?sh[wdIdx[0]]+'–'+sh[wdIdx[wdIdx.length-1]]:wdIdx.map(function(ix){return sh[ix];}).join(', ');
        })();
        cut('zeit');

        html+='<div style="margin-bottom:4px"><label>Notizen <span style="font-weight:400;color:var(--text3);font-size:11px">(Stärken, Motivation, Karriereziele – nicht Teil der QA-Bewertung)</span></label>'
          +'<textarea id="es-notes" data-orig="'+esc(emp.notes||'')+'" rows="3" style="width:100%;box-sizing:border-box;padding:7px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text);resize:vertical" placeholder="z. B. sehr motiviert, will perspektivisch ins Teamlead-Track, hat Stärken im Erstgespräch...">'+esc(emp.notes||'')+'</textarea></div>';

        cut('person');
        (function(){var mk=today().slice(0,7),nx=kalAdd(kalAdd(mk+'-28',4).slice(0,7)+'-01',0).slice(0,7),f=function(m){return m.slice(5,7)+'/'+m.slice(0,4);};
          html+='<div class="pv-ab-box"><div><b>Änderungen gelten ab</b><span class="pv-ab-hint">Vergangene Monate rechnen weiter mit der Version, die damals galt.</span></div>'
            +'<select id="pv-ab"><option value="'+nx+'" selected>nächstem Monat ('+f(nx)+')</option><option value="'+mk+'">laufendem Monat ('+f(mk)+')</option></select></div>'+provVersionListHtml(emp);})();

        function stripField(lbl,id,def,unit,step){
          return '<div style="padding:4px 16px;border-right:1px solid rgba(255,255,255,0.14)">'
            +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">'+lbl+'</div>'
            +'<div style="display:flex;align-items:baseline;gap:3px"><input type="number" id="'+id+'" value="'+pvNum(id.replace('pv-',''),def)+'" step="'+(step||1)+'" min="0" style="border:none;background:none;font-size:19px;font-weight:700;color:#fff;width:85px;padding:0"><span style="font-size:12px;color:#FFEDE6;font-weight:600">'+unit+'</span></div>'
            +'</div>';
        }
        html+='<div class="pv-de-block" style="'+(isVlcModel?'display:none':'')+'">';
        html+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);border-radius:12px;padding:16px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-bottom:16px">';
        if(canSeeSalary(emp)&&(currentUserRole==='admin'||canSeeArea('salary'))){
        html+=stripField('Grundgehalt/Mon.','pv-grundgehalt',2800,'€',10);
        html+=stripField('AG-Sozialabgaben','pv-agSozialabgaben',21,'%',1);
        } else {
          html+=stripField('Grundgehalt/Mon.','pv-grundgehalt-x','','€',10).replace('type="number"','type="text" disabled').replace('value=""','value="–"');
          html+=stripField('AG-Sozialabgaben','pv-agSozialabgaben-x','','%',1).replace('type="number"','type="text" disabled').replace('value=""','value="–"');
        }
        html+=stripField('Basisprov./Opt.','pv-basisProOpt',1.00,'€',0.10);
        html+=stripField('Mindestprov.','pv-mindestprovision',20,'%',5).replace('border-right:1px solid rgba(255,255,255,0.14)','');
        html+='</div>';
        html+='</div>'; // pv-de-block (Banner)
        // ── VLC: Bonusvereinbarung weWow – Banner ──
        function vlcStrip(lbl,id,val,unit,step,last,soon){
          return '<div style="padding:4px 16px;'+(last?'':'border-right:1px solid rgba(255,255,255,0.14)')+'">'
            +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">'+lbl+(soon?' <span style="font-size:9.5px;font-weight:700;color:#1d1c1a;background:#F7B39A;padding:1px 7px;border-radius:20px;margin-left:4px">folgt</span>':'')+'</div>'
            +'<div style="display:flex;align-items:baseline;gap:3px"><input type="number" id="'+id+'" value="'+(val!=null?val:'')+'" step="'+(step||1)+'" min="0" style="border:none;background:none;font-size:19px;font-weight:700;color:#fff;width:85px;padding:0"><span style="font-size:12px;color:#FFEDE6;font-weight:600">'+unit+'</span></div>'
            +'</div>';
        }
        html+='<div class="pv-vlc-block" style="'+(isVlcModel?'':'display:none')+'">';
        html+='<div style="font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.06em;margin-bottom:8px;display:flex;align-items:center;gap:8px">BONUSVEREINBARUNG WEWOW <span style="font-size:10px;font-weight:600;color:var(--purple-dark);background:var(--s-tint-strong);padding:2px 8px;border-radius:20px;letter-spacing:0">VLC · Valencia</span></div>';
        html+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);border-radius:12px;padding:16px 20px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-bottom:16px">';
        html+=vlcStrip('Service Rate/Mon. (netto)','pv-vlc-serviceRate',vpv.serviceRate,'€',10);
        html+=vlcStrip('Bonus/Opt.','pv-vlc-bonusProOpt',vpv.bonusProOpt,'€',0.05);
        html+=vlcStrip('Extra Pay','pv-vlc-extraPayPct',vpv.extraPayPct,'%',0.1,false,true);
        html+=vlcStrip('Extra Pay ab (pro Std.)','pv-vlc-extraPayAbH',vpv.extraPayAbH,'€',0.5,true);
        html+='</div>';
        html+='</div>'; // pv-vlc-block (Banner)
        cut('prov');
        html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">';
        html+='<div><label>Vertragsbeginn</label><input type="date" id="es-start" value="'+(emp.startDate||'')+'"></div>';
        html+='<div><label>Gültig ab (Provision)</label><input type="date" id="pv-gueltigAb" value="'+(pv.gueltigAb||'')+'"></div>';
        html+='<div><label>Vertragsende</label><input type="date" id="es-end" value="'+(emp.endDate||'')+'"></div>';
        html+='</div>';
        cut('vertrag');

        html+='<div class="pv-de-block" style="'+(isVlcModel?'display:none':'')+'">';
        html+='<div style="font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.06em;margin-bottom:8px;padding-top:4px;border-top:1px solid #ebe9e3">UMSATZABHÄNGIGE PROVISION (§2 ABS. 2) — DIVISOREN</div>';
        html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">';
        [{lbl:'OEM',id:'divOEM',def:10000},{lbl:'Upsells',id:'divUpsell',def:20000},{lbl:'WKA',id:'divWka',def:20000}].forEach(function(f){
          html+='<div><label>'+f.lbl+'</label><input type="number" id="pv-'+f.id+'" value="'+pvNum(f.id,f.def)+'" step="1000" min="1"></div>';
        });
        html+='</div>';

        html+='</div>'; cut('prov');
        html+='<div class="pv-de-block" style="'+(isVlcModel?'display:none':'')+'">';
        function buildKpiTable(fieldRows,defsKey1,defsKey2,defsKey3,zone){
          var monatSets=[{key:'monat1',label:'Monat 1',obj:m1,defs:defsKey1},
           {key:'monat2',label:'Monat 2',obj:m2,defs:defsKey2},
           {key:'monat3plus',label:'Ab Monat 3',obj:m3,defs:defsKey3}
          ];
          var tbl='<div class="std-wrap" style="margin-bottom:8px"><table class="std-table inputs" style="width:100%;border-collapse:collapse;table-layout:fixed">';
          tbl+='<thead><tr><th style="background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:left;padding-left:12px;width:240px">Kennzahl</th>';
          monatSets.forEach(function(mset,mi){tbl+='<th'+(mi===esCurIdx?' class="cur"':'')+' style="background:'+(mi===esCurIdx?'#F08566':'#1d1c1a')+';color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:center">'+mset.label+(mi===esCurIdx?' · aktuell':'')+'</th>';});
          tbl+='</tr></thead><tbody'+(zone?' data-pkzone="'+zone+'" ondragover="provKpiDragOver(event)" ondragleave="provKpiDragLeave(event)" ondrop="provKpiDrop(event,\''+zone+'\')"':'')+'>';
          fieldRows.forEach(function(fld,ridx){
            var rowBg='';
            if(fld.vlc){
              tbl+='<tr class="pv-vlc-block" style="'+rowBg+(isVlcModel?'':'display:none;')+'"><td style="padding:9px 8px;padding-left:12px;font-weight:600;color:var(--text2);font-size:12.5px;border-bottom:1px solid #ebe9e3;width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+fld.lbl+'</td>';
              monatSets.forEach(function(mset,mi){
                var vv=(vpv[mset.key]||{})[fld.f];
                tbl+='<td style="padding:8px;text-align:center;border-bottom:1px solid #ebe9e3;'+(mi===esCurIdx?'background:var(--band)':'')+'"><input type="number" id="pv-vlc-'+mset.key+'-'+fld.f+'" value="'+(vv!=null?vv:'')+'" placeholder="–" step="'+(fld.step||1)+'" min="0" style="width:64px;padding:6px;border:1px solid #d8d5cd;border-radius:6px;font-size:13.5px;font-weight:700;color:var(--text);text-align:center;background:var(--s-white)"></td>';
              });
              tbl+='</tr>';
              return;
            }
            var dz=!!zone&&!fld.vlc,moved=dz&&((zone==='prov')!==(PROV_KPI_DEFAULT.indexOf(fld.f)>=0));
            tbl+='<tr style="'+rowBg+'"'+(dz?' data-kpi="'+fld.f+'" draggable="true" ondragstart="provKpiDragStart(event,\''+fld.f+'\')"':'')+'><td style="padding:9px 8px;padding-left:12px;font-weight:600;color:var(--text2);font-size:12.5px;border-bottom:1px solid #ebe9e3;width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(dz?'<span class="pk-grip" title="Ziehen: zwischen Provisionsrelevant und Ergänzend verschieben">⋮⋮</span>':'')+fld.lbl+(dz?'<span class="pk-badge" style="'+(moved?'':'display:none')+'">'+(zone==='prov'?'eigene':'verschoben')+'</span>':'')+'</td>';
            monatSets.forEach(function(mset,mi){
              tbl+='<td style="padding:8px;text-align:center;border-bottom:1px solid #ebe9e3;'+(mi===esCurIdx?'background:var(--band)':'')+'"><input type="number" id="pv-'+mset.key+'-'+fld.f+'" value="'+pvMonatNum(mset.obj,fld.f,mset.defs[fld.f])+'" placeholder="–" step="'+(fld.step||1)+'" min="0" style="width:64px;padding:6px;border:1px solid #d8d5cd;border-radius:6px;font-size:13.5px;font-weight:700;color:var(--text);text-align:center;background:var(--s-white)"></td>';
            });
            tbl+='</tr>';
          });
          tbl+='</tbody></table></div>';
          return tbl;
        }
        var _pk=effectiveProvisionSettings(emp,'9999-12').kpis,_rows=function(L){return L.map(function(k){var c=provKpiCat(k);return {lbl:provKpiLabel(c),f:k,unit:c.unit,step:c.step};});};
        html+='<input type="hidden" id="pv-kpis" value="'+esc(JSON.stringify(_pk))+'"><p style="font-size:11.5px;color:var(--text3);margin:0 0 8px">Kennzahlen am Griff ⋮⋮ zwischen „Provisionsrelevant“ und „Ergänzend“ ziehen. Je verfehlter provisionsrelevanter KPI greift der Abzug.</p>';
        html+=buildKpiTable(_rows(_pk),PROVISION_DEFAULTS.monat1,PROVISION_DEFAULTS.monat2,PROVISION_DEFAULTS.monat3plus,'prov');

        html+='</div>'; cut('kpi');
        html+='<div class="pv-de-block" style="'+(isVlcModel?'display:none':'')+'">';
        html+='<div style="font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.06em;margin-bottom:8px;padding-top:12px;border-top:1px solid #ebe9e3">§4/§5 REDUZIERUNG</div>';
        html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
        html+='<div><label>Reduzierung je nicht erfüllter KPI</label><input type="number" id="pv-reduktionProKpi" value="'+pvNum('reduktionProKpi',20)+'" step="5" min="0" max="100"></div>';
        html+='<div><label>Mindestleistung ab Monat 2 (Opt/Std)</label><input type="number" id="pv-mindestleistungOptH" value="'+pvNum('mindestleistungOptH',2.50)+'" step="0.1" min="0"></div>';
        html+='</div>';

        html+='</div>'; // pv-de-block (§4/§5)
        cut('prov');
        // ── VLC: KPI-Vorgaben je Monat + Kuerzungsstufen ──
        html+='<div class="pv-vlc-block" style="'+(isVlcModel?'':'display:none')+'">';
        (function(){
          var TH='background:#1d1c1a;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:9px 8px;text-align:center';
          var TD0='padding:9px 8px;padding-left:12px;font-weight:600;color:var(--text2);font-size:12.5px;border-bottom:1px solid #ebe9e3;width:240px';
          var TD='padding:8px;text-align:center;border-bottom:1px solid #ebe9e3;font-size:12.5px;color:var(--text2)';
          var INP='width:64px;padding:6px;border:1px solid #d8d5cd;border-radius:6px;font-size:13.5px;font-weight:700;color:var(--text);text-align:center;background:var(--s-white)';
          function inp(id,v,step){return '<input type="number" id="'+id+'" value="'+(v!=null?v:'')+'" placeholder="–" step="'+(step||1)+'" min="0" style="'+INP+'">';}
          var rows=[{f:'optH',lbl:'Opt. Gesamt / Std. (Min.)'},{f:'crOem',lbl:'CR OEM (Min.) (%)'},{f:'syMy',lbl:'CR SY/MY (Min.) (%)'}];
          var months=[{k:'monat1',l:'Monat 1'},{k:'monat2',l:'Monat 2'},{k:'monat3plus',l:'Ab Monat 3'}];
          html+='<p style="font-size:11.5px;color:var(--text3);margin-bottom:10px;line-height:1.5">Leeres Feld = in diesem Monat keine Prüfung, der Bonus wird voll ausgezahlt.</p>';
          var t='<div class="std-wrap" style="margin-bottom:16px"><table class="std-table inputs" style="width:100%;border-collapse:collapse;table-layout:fixed">';
          t+='<thead><tr><th style="'+TH+';text-align:left;padding-left:12px;width:240px">Kennzahl</th>';
          months.forEach(function(m,mi){t+='<th'+(mi===esCurIdx?' class="cur"':'')+' style="'+TH+(mi===esCurIdx?';background:#F08566':'')+'">'+m.l+(mi===esCurIdx?' · aktuell':'')+'</th>';});
          t+='</tr></thead><tbody>';
          rows.forEach(function(r,ri){
            t+='<tr style="'+''+'"><td style="'+TD0+'">'+r.lbl+'</td>';
            months.forEach(function(m,mi){t+='<td style="'+TD+(mi===esCurIdx?';background:var(--band)':'')+'">'+inp('pv-vlc-'+m.k+'-'+r.f,(vpv[m.k]||{})[r.f],r.f==='optH'?0.1:1)+'</td>';});
            t+='</tr>';
          });
          t+='</tbody></table></div>';
          html+=t;
          html+='</div>'; cut('kpi');
          html+='<div class="pv-vlc-block" style="'+(isVlcModel?'':'display:none')+'">';
          html+='<div style="font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.06em;margin-bottom:8px;padding-top:12px;border-top:1px solid #ebe9e3">KÜRZUNGSSTUFEN</div>';
          var st=vpv.stufen||{};
          var t2='<div class="std-wrap" style="margin-bottom:10px"><table class="std-table inputs" style="width:100%;border-collapse:collapse;table-layout:fixed">';
          t2+='<thead><tr><th style="'+TH+';text-align:left;padding-left:12px;width:240px">Kennzahl</th><th style="'+TH+'">Ziel verfehlt → Auszahlung</th><th style="'+TH+'">Untergrenze</th><th style="'+TH+'">Unter Untergrenze → Auszahlung</th></tr></thead><tbody>';
          [{f:'optH',lbl:'Opt. Gesamt / Std.',unit:''},{f:'crOem',lbl:'CR OEM',unit:' %'},{f:'syMy',lbl:'CR SY/MY',unit:' %'}].forEach(function(r,ri){
            var o=st[r.f]||{};
            t2+='<tr style="'+''+'"><td style="'+TD0+'">'+r.lbl+'</td>'
              +'<td style="'+TD+'">'+inp('pv-vlc-st-'+r.f+'-aus1',o.aus1,5)+' %</td>'
              +'<td style="'+TD+'">'+inp('pv-vlc-st-'+r.f+'-grenze',o.grenze,1)+r.unit+'</td>'
              +'<td style="'+TD+'">'+inp('pv-vlc-st-'+r.f+'-aus2',o.aus2,5)+' %</td></tr>';
          });
          t2+='</tbody></table></div>';
          html+=t2;
          html+='<div style="font-size:12px;color:var(--text2);background:var(--s-tint);border-radius:8px;padding:9px 12px;margin-bottom:16px;line-height:1.5"><i class="ti ti-info-circle" style="color:var(--purple)"></i> Werden mehrere Ziele verfehlt, gilt <b style="color:var(--purple-dark)">nur die schlechteste Stufe</b>, die Kürzungen werden nicht multipliziert. Opt./Std. = Optimierungen gesamt geteilt durch die Arbeitsstunden im Monat (Wochenarbeitszeiten). Extra Pay wird noch nicht eingerechnet.</div>';
        })();
        html+='</div>'; // pv-vlc-block (Stufen)
        cut('prov');
        html+='<p style="font-size:11.5px;color:var(--text3);margin-bottom:10px;line-height:1.5">Diese Werte fließen nicht in die Provisionsberechnung ein, werden aber ebenfalls je Beschäftigungsmonat gestaffelt in Alerts und der Teamübersicht verwendet. Leeres Feld = kein Ziel, der Wert wird nicht geprüft.</p>';
        var _rest=PROV_KPI_CAT.map(function(c){return c.k;}).filter(function(k){return _pk.indexOf(k)<0;});
        html+=buildKpiTable(_rows(_rest).concat([{lbl:'CR TW (Max.) (%)',f:'tw',vlc:true},{lbl:'CR MY (Min.) (%)',f:'my',vlc:true},{lbl:'Anteil OEM (Min.) (%)',f:'oemAnteil',vlc:true}]),PROVISION_DEFAULTS.monat1,PROVISION_DEFAULTS.monat2,PROVISION_DEFAULTS.monat3plus,'erg');

        cut('erg');
        // ── Zusammensetzen: nummerierte Abschnitte ──
        function esD(d){if(!d)return '–';var p=d.split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:d;}
        function esN(v,dec){return v==null||v===''?'–':(+v).toLocaleString('de-DE',{minimumFractionDigits:dec||0,maximumFractionDigits:dec||0});}
        function deOnly(x){return '<span class="pv-de-block" style="'+(isVlcModel?'display:none':'')+'">'+x+'</span>';}
        function vlcOnly(x){return '<span class="pv-vlc-block" style="'+(isVlcModel?'':'display:none')+'">'+x+'</span>';}
        var mLabel=esCurIdx===0?'Monat 1':esCurIdx===1?'Monat 2':esCurIdx===2?'Ab Monat 3':null;
        var vst=vpv.stufen||{};
        var stufenTxt=[vst.optH&&vst.optH.aus1,vst.syMy&&vst.syMy.aus1,vst.syMy&&vst.syMy.aus2,vst.crOem&&vst.crOem.aus1,vst.crOem&&vst.crOem.aus2].filter(function(x){return x!=null;});
        var stufenUniq=stufenTxt.filter(function(x,i){return stufenTxt.indexOf(x)===i;}).sort(function(a,b){return b-a;});
        var vm3=vpv.monat3plus||{};
        var regelDe='<b style="color:var(--purple-dark)">Basis:</b> '+esN(pvNum('basisProOpt',1),2)+' € je qualifizierender Optimierung. <b style="color:var(--purple-dark)">Dazu</b> ein Prozentsatz der Marge (Marge gesamt ÷ Divisor) auf OEM, Upsells und WKA. <b style="color:var(--purple-dark)">Je verfehlter KPI</b> −'+esN(pvNum('reduktionProKpi',20))+' %, mindestens '+esN(pvNum('mindestprovision',20))+' % bleiben. <b style="color:var(--purple-dark)">Ab Monat 2</b> unter '+esN(pvNum('mindestleistungOptH',2.5),1)+' Opt./Std. nur noch die Mindestprovision.';
        var regelVlc='<b style="color:var(--purple-dark)">Bonus:</b> '+esN(vpv.bonusProOpt,2)+' € je Optimierung. <b style="color:var(--purple-dark)">Ab Monat 3</b> Opt./Std. unter '+esN(vm3.optH,1)+' → '+esN(vst.optH&&vst.optH.aus1)+' %, SY/MY unter '+esN(vm3.syMy)+' % → '+esN(vst.syMy&&vst.syMy.aus1)+' %, unter '+esN(vst.syMy&&vst.syMy.grenze)+' % → '+esN(vst.syMy&&vst.syMy.aus2)+' %, CR OEM unter '+esN(vm3.crOem)+' % → '+esN(vst.crOem&&vst.crOem.aus1)+' %, unter '+esN(vst.crOem&&vst.crOem.grenze)+' % → '+esN(vst.crOem&&vst.crOem.aus2)+' %. <b style="color:var(--purple-dark)">Es gilt die schlechteste Stufe.</b> Extra Pay folgt.';
        var sections=[
          {n:1,t:'Person',sum:esc(emp.role||'–')+' · '+esc(emp.phase||'–')+' · '+esc(emp.contract==='part'?'Teilzeit':emp.contract==='full'?'Vollzeit':(emp.contract||'–'))+' · '+(emp.email?esc(emp.email):'<span style="color:var(--red)">keine E-Mail</span>'),body:SEG.person},
          {n:2,t:'Vertrag',sum:'Beginn '+esD(emp.startDate)+' · Gültig ab '+esD(pv.gueltigAb)+' · '+(emp.endDate?'Ende '+esD(emp.endDate):'unbefristet')+(esBm?' · Beschäftigungsmonat '+esBm:''),body:SEG.vertrag},
          {n:3,t:'Arbeitszeit',sum:(esWorkDaysTxt?esWorkDaysTxt+' · ':'')+esN(esWeekTotal,1)+' Std. pro Woche',body:SEG.zeit},
          {n:4,t:deOnly('Provision')+vlcOnly('Bonus'),sum:deOnly((canSeeSalary(emp)?esN(pvNum('grundgehalt',2800))+' € Grundgehalt':'Gehalt nicht sichtbar')+' · '+esN(pvNum('basisProOpt',1),2)+' €/Opt. · −'+esN(pvNum('reduktionProKpi',20))+' % je KPI · Mindestprov. '+esN(pvNum('mindestprovision',20))+' %')+vlcOnly(esN(vpv.serviceRate)+' € Service Rate · '+esN(vpv.bonusProOpt,2)+' €/Opt. · Stufen '+stufenUniq.join('/')+' % · Extra Pay folgt'),body:SEG.prov},
          {n:5,t:'Provisionsrelevante KPIs',sum:deOnly('<span id="pk-count-prov">'+effectiveProvisionSettings(emp,'9999-12').kpis.length+' Kennzahlen</span>')+vlcOnly('3 Kennzahlen')+(mLabel?' · aktuell „'+mLabel+'“':''),body:SEG.kpi},
          {n:6,t:'Ergänzende KPI-Ziele',sum:deOnly('<span id="pk-count-erg">'+(PROV_KPI_CAT.length-effectiveProvisionSettings(emp,'9999-12').kpis.length)+' Kennzahlen</span>')+vlcOnly('12 Kennzahlen')+' · nicht provisionsrelevant',body:SEG.erg}
        ];
        // Provisionsvereinbarung (Abschnitte 4–6) für Coaches/Betrachter nur bei Sales Agents und SDL – gleiche Regel wie
        // Provisions-Übersicht und -Popup (Recht „Provision: auch Coaches sehen“). Wer sie ändern darf, sieht sie immer;
        // die eigene sieht jeder Coach (Peter 24.11.2026).
        if(emp.id&&currentUserRole!=='admin'&&!provCanEdit()&&!isAgentEmp(emp)&&!canSeeArea('provCoaches')&&!(currentCoach&&String(currentCoach.id)===String(emp.id)))sections=sections.filter(function(s){return s.n<4;});
        if(asPopup==='panels'){
          // Popup-Bereich „Einstellungen“: die sechs Abschnitte als getönte Flächen in einer Kachel
          var pp='';
          sections.forEach(function(sec){
            var extra=sec.n===3?'':(sec.n===4?deOnly('Olching')+vlcOnly('weWow'):'');
            pp+='<div id="esSec'+sec.n+'" style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:10px 12px 12px;margin-bottom:12px">'
              +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);margin-bottom:8px"><span>'+sec.t+'</span><span style="letter-spacing:0;text-transform:none;font-weight:600;color:var(--text3)">'+extra+'</span></div>'
              +(sec.n===4?'<div style="font-size:12.5px;color:var(--text);background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);border-radius:10px;padding:10px 12px;margin-bottom:10px;line-height:1.6"><div style="font-size:10.5px;font-weight:700;color:#C9502F;letter-spacing:.08em;margin-bottom:3px">SO WIRD GERECHNET</div>'+deOnly(regelDe)+vlcOnly(regelVlc)+'</div>':'')
              +(sec.body||'')+'</div>';
          });
          html=pp;
          return;
        }
        if(asPopup){
          // Popup „Mitarbeiter hinzufügen“: gleiche Felder, als Boxen untereinander, Titel nur als Text
          var pcard='';
          sections.forEach(function(sec){
            pcard+='<div id="aeSec'+sec.n+'" style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)">'
              +'<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:var(--text);margin-bottom:10px">'+sec.t+(sec.n===4?'<span style="margin-left:auto;font-size:12px;font-weight:600;color:var(--text3)">'+deOnly('Olching')+vlcOnly('weWow')+'</span>':(sec.n>=5?'<span style="margin-left:auto;font-size:12px;font-weight:600;color:var(--text3)">vorbelegt</span>':''))+'</div>'
              +(sec.n===4?'<div style="font-size:12.5px;color:var(--text);background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);border-radius:12px;padding:12px 14px;margin-bottom:12px;line-height:1.6"><div style="font-size:10.5px;font-weight:700;color:#C9502F;letter-spacing:.08em;margin-bottom:4px">SO WIRD GERECHNET</div>'+deOnly(regelDe)+vlcOnly(regelVlc)+'</div>':'')
              +(sec.body||'')+'</div>';
          });
          html=pcard;
          return;
        }
        var card='<div class="card"><div class="card-title"><i class="ti ti-user"></i> Stammdaten &amp; Provisionsvereinbarung '
          +deOnly('<span style="font-size:10.5px;font-weight:600;color:var(--purple-dark);background:var(--s-tint-strong);padding:2px 8px;border-radius:20px;margin-left:4px">Provisionsvereinbarung Olching</span>')
          +vlcOnly('<span style="font-size:10.5px;font-weight:600;color:var(--purple-dark);background:var(--s-tint-strong);padding:2px 8px;border-radius:20px;margin-left:4px">Bonusvereinbarung weWow · VLC</span>')+'</div>';
        card+='<div style="font-size:12.5px;color:var(--text);background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);border-radius:12px;padding:12px 14px;margin-bottom:12px;line-height:1.6"><div style="font-size:10.5px;font-weight:700;color:#C9502F;letter-spacing:.08em;margin-bottom:4px">SO WIRD GERECHNET</div>'+deOnly(regelDe)+vlcOnly(regelVlc)+'</div>';
        sections.forEach(function(sec){
          var open=!!esOpenSections[sec.n];
          card+='<div class="es-acc" data-sec="'+sec.n+'" style="background:var(--s-sub);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden">'
            +'<div onclick="esToggleSection('+sec.n+',this.parentNode)" style="display:flex;align-items:center;gap:14px;padding:15px 18px;cursor:pointer">'
            +'<span style="width:28px;height:28px;border-radius:7px;background:#1d1c1a;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+sec.n+'</span>'
            +'<span style="font-weight:700;font-size:14.5px;min-width:230px">'+sec.t+'</span>'
            +'<span style="font-size:13px;color:var(--text2);flex:1;min-width:0">'+sec.sum+'</span>'
            +'<i class="ti ti-chevron-right es-acc-ch" style="color:var(--text3);font-size:15px;transition:transform .15s;'+(open?'transform:rotate(90deg)':'')+'"></i></div>'
            +'<div class="es-acc-body" style="'+(open?'':'display:none;')+'padding:16px 18px 18px;border-top:1px solid var(--border)">'+(sec.body||'')+'</div></div>';
        });
        var esHist=(typeof employeeHistory!=='undefined'&&employeeHistory[emp.id])||[];
        var esLast=null; esHist.forEach(function(r){if(r.changedAt&&(!esLast||r.changedAt>esLast.changedAt))esLast=r;});
        var esLastTxt=esLast?'Zuletzt geändert am '+new Date(esLast.changedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+(esLast.changedByName?' von '+esc(esLast.changedByName):''):'Änderungen werden erst mit „Alles speichern“ übernommen.';
        card+='<div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;padding:13px 18px;background:var(--s-sub);border:1px solid var(--border);border-radius:10px">'
          +'<span id="pv-save-status" style="font-size:12.5px;color:var(--text3);margin-right:auto">'+esLastTxt+'</span>'
          +'<button class="btn" style="width:auto;height:34px" onclick="renderEmpDetail()"><i class="ti ti-arrow-back-up"></i> Verwerfen</button>'
          +'<button class="btn btn-primary" style="width:auto;height:34px" data-eid="'+emp.id+'" onclick="saveProvisionSettings(this.dataset.eid);saveEmpEinstellungen()"><i class="ti ti-check"></i> Alles speichern</button></div>';
        card+='</div>'; // close Provisionsvereinbarung card
        html=_esOuter+card;
      })();
  }
  return html;
}
function openAddEmpModal(){
  // Damit die Felder-IDs eindeutig bleiben: offene Stammdaten im Hauptbereich vorübergehend ausblenden
  _aeHidMain=false;
  var body=document.getElementById('aeBody');
  if(document.getElementById('es-name')&&!body.contains(document.getElementById('es-name'))){
    var ma=document.getElementById('mainArea');if(ma){ma.innerHTML='';_aeHidMain=true;}
  }
  var t0=today();
  _aeNew={id:'__new__',name:'',role:'SE',phase:'Onboarding',contract:'full',hours:40,startDate:t0,endDate:null,team:'Deutschland',email:'',notes:'',active:true,
    color:employees.length%COLORS.length,targets:{},provisionSettings:{gueltigAb:t0}};
  var h=esBuildHtml(_aeNew,true,'');
  h=h.replace(/setEmpColor\((\d+)\)/g,'aeSetColor($1,this)');
  body.innerHTML=h;
  body.scrollTop=0;
  var n=document.getElementById('es-name');
  if(n){n.value='';n.placeholder='z. B. Anna Bauer';n.addEventListener('input',function(){var sub=document.getElementById('aeHdSub');if(sub)sub.textContent=n.value.trim()||'Neuer Mitarbeiter';});}
  var sub=document.getElementById('aeHdSub');if(sub)sub.textContent='Neuer Mitarbeiter';
  openModal('addEmpModal');
  setTimeout(function(){if(n)n.focus();},50);
}
function closeAddEmpModal(){
  closeModal('addEmpModal');
  var b=document.getElementById('aeBody');if(b)b.innerHTML='';
  if(_aeHidMain){_aeHidMain=false;renderMain();}
}
function aeSetColor(i,el){
  if(_aeNew)_aeNew.color=i;
  var wrap=el&&el.parentNode;if(!wrap)return;
  Array.prototype.forEach.call(wrap.children,function(c,ci){var col=COLORS[ci];if(col)c.style.borderColor=(ci===i?col.text:'transparent');});
}
function saveNewEmpFull(){
  if(_savingNewEmpFull)return;
  function v(id){var el=document.getElementById(id);return el?el.value:'';}
  var name=v('es-name').trim();
  if(!name){alert('Bitte einen Namen eingeben.');var n=document.getElementById('es-name');if(n)n.focus();return;}
  var role=v('es-role')||'SE',phase=v('es-phase')||'Onboarding',contract=v('es-contract')||'full';
  var startDate=v('es-start')||null;
  var _fn=v('es-fn'),_st=v('es-stufe'),_or=v('es-ort');if(_fn)role=personRoleCode(_fn,_st,_or);
  var payload={name:name,role:role,phase:phase,start_date:startDate,team:'Deutschland',contract:contract,hours:40,active:phase!=='Inaktiv',
    color_index:_aeNew?_aeNew.color:employees.length%COLORS.length};
  _savingNewEmpFull=true;
  var btn=document.getElementById('aeSaveBtn');if(btn){btn.disabled=true;btn.style.opacity='.6';}
  sb.from('employees').insert(payload).select().single().then(function(res){
    _savingNewEmpFull=false;if(btn){btn.disabled=false;btn.style.opacity='';}
    if(res.error){alert('Fehler beim Anlegen in Supabase: '+res.error.message);return;}
    var e=res.data;
    logActivity('employee','created','Neuer Mitarbeiter angelegt: '+name,e.id,role+' · '+phase);
    var STANDARD_TARGETS=[
      {rk:'crOEM',val:55,dir:'gte'},{rk:'crTW',val:15,dir:'lte'},{rk:'crYes',val:40,dir:'lte'},{rk:'crSuperYes',val:40,dir:'gte'},{rk:'crMegaYes',val:20,dir:'gte'},
      {rk:'oem_aktivitaeten',val:100,dir:'gte'},{rk:'convOEM',val:24,dir:'gte'},{rk:'optGesamt',val:28,dir:'gte'},{rk:'optPerH',val:3.0,dir:'gte'},{rk:'margeGesamt',val:1500.00,dir:'gte'}
    ];
    var ne={id:e.id,name:e.name,role:e.role,phase:e.phase,color:e.color_index,startDate:e.start_date,team:e.team,contract:e.contract,hours:e.hours,active:e.active,targets:{}};
    STANDARD_TARGETS=[]; // Ziele kommen aus Stammdaten & Provisionsvereinbarung, keine versteckten Standard-Einzelwerte mehr
    employees.push(ne);
    protocols[ne.id]=[];performance[ne.id]=[];
    if(typeof tasks!=='undefined')tasks[ne.id]=[];
    (STANDARD_TARGETS.length?sb.from('employee_kpi_targets').insert(STANDARD_TARGETS.map(function(t){return {employee_id:e.id,metric_key:t.rk,val:t.val,dir:t.dir};})):Promise.resolve({})).then(function(r2){
      if(r2.error)console.warn('Standard-KPI-Ziele konnten nicht angelegt werden:',r2.error);
    });
    // Alle übrigen Stammdaten & die Provisionsvereinbarung mit den bestehenden Speicherfunktionen aus dem Popup übernehmen
    selectedEmp=ne.id;view='emp';activeTab='emp-settings';
    // Während beide Speicherfunktionen die Felder aus dem Popup lesen, darf der Hauptbereich nicht neu gezeichnet werden
    var _red=window.renderEmpDetail;window.renderEmpDetail=function(){};
    window._aeCreating=true;
    try{saveProvisionSettings(ne.id);saveEmpEinstellungen();}finally{window.renderEmpDetail=_red;window._aeCreating=false;}
    _aeHidMain=false;
    closeModal('addEmpModal');
    var b=document.getElementById('aeBody');if(b)b.innerHTML='';
    renderSidebar();renderMain();
  }).catch(function(err){
    _savingNewEmpFull=false;if(btn){btn.disabled=false;btn.style.opacity='';}
    alert('Unerwarteter Fehler beim Anlegen: '+err.message);
  });
}
// Wert eines Felds am Tag d: letzte Version mit gueltig_ab <= d; vor der ersten Version gilt die erste. undefined = kein Verlauf.
function empVerlaufWert(emp,feld,d){var L=emp&&employeeVerlauf[String(emp.id)];L=L&&L[feld];if(!L||!L.length)return undefined;var v=L[0];for(var i=1;i<L.length;i++){if(L[i].ab<=d)v=L[i];else break;}return v.wert;}
function empVerlaufSet(emp,feld,ab,wert,von){var k=String(emp.id);employeeVerlauf[k]=employeeVerlauf[k]||{};var L=employeeVerlauf[k][feld]=(employeeVerlauf[k][feld]||[]).filter(function(x){return x.ab!==ab;});L.push({ab:ab,wert:wert,von:von||null});L.sort(function(a,b){return a.ab<b.ab?-1:a.ab>b.ab?1:0;});}
// Wochensumme und Arbeitstage einer Arbeitszeit-Version (null = Standard)
function whWeekSum(w){w=w||DEFAULT_WORK_HOURS;return ['mo','di','mi','do','fr','sa','so'].reduce(function(s,k){var dv=w[k]||DEFAULT_WORK_HOURS[k];if(!dv||!dv.von||!dv.bis)return s;return s+Math.max(0,(timeStrToMin(dv.bis)-timeStrToMin(dv.von)-(+dv.pause||0))/60);},0);}
function whDaysTxt(w){w=w||DEFAULT_WORK_HOURS;var K=['mo','di','mi','do','fr','sa','so'],S=['Mo','Di','Mi','Do','Fr','Sa','So'],ix=[];K.forEach(function(k,i){var dv=w[k]||DEFAULT_WORK_HOURS[k];if(dv&&dv.von&&dv.bis&&timeStrToMin(dv.bis)>timeStrToMin(dv.von))ix.push(i);});
  if(!ix.length)return 'keine';return ix.length>1&&ix[ix.length-1]-ix[0]===ix.length-1?S[ix[0]]+'–'+S[ix[ix.length-1]]:ix.map(function(i){return S[i];}).join(', ');}
function whVerLabel(v){return 'ab '+fd(v.ab)+' · '+whWeekSum(v.wert).toFixed(1).replace('.',',')+' Std.';}
// Verlaufstabelle in Stammdaten › Arbeitszeit (Variante B, Peter 24.11.): erste Version nicht löschbar
function esWhVerlaufHtml(emp){
  var M='font-size:11.5px;color:var(--text3);line-height:1.5';
  if(!EV_OK)return '<div style="'+M+'">Verlauf nicht verfügbar (SQL 51 fehlt) – eine Änderung wirkt auf alle offenen Monate.</div>';
  var L=((employeeVerlauf[String(emp.id)]||{}).workHours)||[];
  if(!L.length)return '<div style="'+M+'">Noch kein Verlauf – die bisherige Arbeitszeit gilt ab Vertragsbeginn.</div>';
  var TH='font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--text2);padding:7px 10px;text-align:left',TD='padding:7px 10px;border-top:1px solid #e2dfd7;font-size:12.5px';
  return '<label>Verlauf der Arbeitszeit</label><div class="std-wrap"><table style="width:100%;border-collapse:collapse;background:#EFECE5;border-radius:8px;overflow:hidden;font-variant-numeric:tabular-nums">'
    +'<thead><tr><th style="'+TH+'">Gültig ab</th><th style="'+TH+';text-align:right">Std./Woche</th><th style="'+TH+'">Arbeitstage</th><th style="'+TH+'">Eingetragen von</th><th style="'+TH+'"></th></tr></thead><tbody>'
    +L.map(function(v,i){var von=v.von?(/^Startwert/.test(v.von)?'Startwert':v.von):'—';
      return '<tr><td style="'+TD+'">'+fd(v.ab)+'</td><td style="'+TD+';text-align:right">'+whWeekSum(v.wert).toFixed(1).replace('.',',')+'</td><td style="'+TD+'">'+whDaysTxt(v.wert)+'</td><td style="'+TD+'">'+esc(von)+'</td>'
        +'<td style="'+TD+';text-align:right">'+(i===0?'<span style="font-size:11.5px;color:var(--text3)">nicht löschbar</span>':'<button type="button" class="btn btn-sm btn-danger" style="display:inline-flex" onclick="esWhVerlaufDel(\''+esc(String(emp.id))+'\',\''+v.ab+'\')">Löschen</button>')+'</td></tr>';}).join('')
    +'</tbody></table></div>';
}
function esWhVerlaufDel(empId,ab){
  var emp=employees.find(function(e){return String(e.id)===String(empId);});if(!emp)return;
  var L=((employeeVerlauf[String(emp.id)]||{}).workHours)||[],i=-1;L.forEach(function(x,j){if(x.ab===ab)i=j;});if(i<1)return;
  var v=L[i],lbl=whVerLabel(v),wasLast=i===L.length-1;
  if(!confirm('Arbeitszeit-Version '+lbl+' löschen?\n\nFür diese Tage gilt dann wieder die vorherige Arbeitszeit.'+(wasLast?'\nDas Formular wird danach neu geladen; nicht gespeicherte Eingaben gehen verloren.':'')))return;
  sb.from('employee_verlauf').delete().eq('employee_id',emp.id).eq('feld','workHours').eq('gueltig_ab',ab).select().then(function(r){
    if(r&&r.error){alert('Löschen fehlgeschlagen: '+r.error.message);return;}
    if(r&&Array.isArray(r.data)&&!r.data.length){alert('Löschen fehlgeschlagen: keine Berechtigung oder Version nicht mehr vorhanden. Bitte Seite neu laden.');return;}
    L.splice(i,1);
    var who=(typeof currentCoach!=='undefined'&&currentCoach)?currentCoach.name:((typeof currentAuthUser!=='undefined'&&currentAuthUser&&currentAuthUser.email)||null);
    sb.from('employee_history').insert([{employee_id:emp.id,field:'workHours_version',old_value:lbl,new_value:'gelöscht',changed_by:currentCoach?currentCoach.id:null,changed_by_name:who}]).then(function(h){if(h&&h.error)console.warn('Historie konnte nicht gespeichert werden:',h.error);else loadEmployeeHistoryFromSupabase().then(function(){espRenderHist();});});
    if(wasLast){var nw=L[L.length-1].wert||null;emp.workHours=nw;emp.hours=whWeekSum(nw);
      sb.from('employees').update({work_hours:nw,hours:emp.hours}).eq('id',emp.id).then(function(u){if(u&&u.error)alert('Version gelöscht, aber die aktuelle Arbeitszeit in den Stammdaten nicht aktualisiert: '+u.error.message);});
    }
    lsSave();renderSidebar();renderEmpDetail();
    var pb=document.getElementById('espBody'),c=document.getElementById('es-wh-verlauf');
    if(wasLast&&pb&&c&&pb.contains(c))openEmpSetModal(emp.id); // Formular zeigt sonst noch die gelöschte Arbeitszeit
    else if(c)c.innerHTML=esWhVerlaufHtml(emp);
  });
}
function saveNewGoal(empId){
  if(_savingNewGoal)return;
  var desc=document.getElementById('goal-desc').value.trim();
  if(!desc){alert('Bitte eine Zielbeschreibung eingeben.');return;}
  var metricEl=document.getElementById('goal-metric');
  var metricKey=metricEl?metricEl.value:'';
  var targetEl=document.getElementById('goal-target');
  var targetValue=targetEl&&targetEl.value!==''?parseFloat(targetEl.value):null;
  var dateEl=document.getElementById('goal-date');
  var targetDate=dateEl?dateEl.value||null:null;
  if(metricKey&&targetValue===null){alert('Bitte einen Zielwert angeben, wenn Skill, Will oder Result gewählt ist.');return;}
  var payload={
    employee_id:empId,description:desc,metric_key:metricKey||null,target_value:targetValue,
    target_date:targetDate,status:'offen',created_by:currentCoach?currentCoach.id:null
  };
  _savingNewGoal=true;
  sb.from('goals').insert(payload).select().single().then(function(res){
    if(res.error){_savingNewGoal=false;alert('Fehler beim Speichern: '+res.error.message);return;}
    var r=res.data;
    if(!goals[empId])goals[empId]=[];
    goals[empId].unshift({id:r.id,description:r.description,metricKey:r.metric_key,targetValue:r.target_value,targetDate:r.target_date,status:r.status,createdAt:r.created_at,createdBy:r.created_by});
    var empForLog3=employees.find(function(e){return e.id===empId;});
    logActivity('goal','created','Neues Ziel angelegt: "'+desc+'"',empId,empForLog3?empForLog3.name:'');
    // Die Aufgabe „Ziel prüfen“ entsteht automatisch zur Frist (siehe aufgAll)
    closeModal('goalModal');
    renderTab();
    _savingNewGoal=false;
    if(typeof window._cevGoalSaved==='function')window._cevGoalSaved();
  }).catch(function(err){_savingNewGoal=false;alert('Unerwarteter Fehler: '+err.message);});
}
function updateGoalStatus(goalId,newStatus){
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var g=(goals[emp.id]||[]).find(function(x){return String(x.id)===String(goalId);});
  if(!g)return;
  var oldStatus=g.status;
  g.status=newStatus;
  sb.from('goals').update({status:newStatus}).eq('id',goalId).then(function(res){
    if(res.error)alert('Fehler beim Speichern: '+res.error.message);
    else logActivity('goal','status_changed','Ziel-Status geändert: '+oldStatus+' → '+newStatus+' · "'+g.description+'"',emp.id,emp.name);
  });
  renderTab();
  if(typeof window._cevGoalsRender==='function')window._cevGoalsRender();
}
function deleteGoal(goalId){
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  if(!confirm('Ziel wirklich löschen?'))return;
  var g0=(goals[emp.id]||[]).find(function(x){return String(x.id)===String(goalId);});
  sb.from('goals').delete().eq('id',goalId).then(function(res){
    if(res.error){alert('Fehler beim Löschen: '+res.error.message);return;}
    goals[emp.id]=(goals[emp.id]||[]).filter(function(g){return String(g.id)!==String(goalId);});
    logActivity('goal','deleted','Ziel gelöscht: "'+(g0?g0.description:'')+'"',emp.id,emp.name);
    renderTab();
    if(typeof window._cevGoalsRender==='function')window._cevGoalsRender();
  }).catch(function(err){alert('Unerwarteter Fehler: '+err.message);});
}
function uploadEmpDocument(file){
  if(!file||_uploadingDoc)return;
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var statusEl=document.getElementById('doc-upload-status');
  if(statusEl)statusEl.textContent='Lade hoch...';
  var path=emp.id+'/'+Date.now()+'_'+file.name;
  _uploadingDoc=true;
  sb.storage.from('employee-documents').upload(path,file).then(function(res){
    if(res.error){
      _uploadingDoc=false;
      if(statusEl)statusEl.textContent='';
      alert('Fehler beim Hochladen: '+res.error.message);
      return;
    }
    var payload={employee_id:emp.id,filename:file.name,storage_path:path,description:'',uploaded_by:currentCoach?currentCoach.id:null};
    return sb.from('employee_documents').insert(payload).select().single().then(function(res2){
      _uploadingDoc=false;
      if(res2.error){alert('Datei hochgeladen, aber Metadaten konnten nicht gespeichert werden: '+res2.error.message);return;}
      var r=res2.data;
      if(!employeeDocuments[emp.id])employeeDocuments[emp.id]=[];
      employeeDocuments[emp.id].unshift({id:r.id,filename:r.filename,storagePath:r.storage_path,description:r.description,uploadedBy:r.uploaded_by,uploadedAt:r.uploaded_at});
      logActivity('document','created','Dokument hochgeladen: "'+file.name+'"',emp.id,emp.name);
      if(statusEl)statusEl.textContent='';
      renderTab();
    });
  }).catch(function(err){
    _uploadingDoc=false;
    if(statusEl)statusEl.textContent='';
    alert('Unerwarteter Fehler: '+err.message);
  });
}
function _empDocFind(docId){
  var emp=employees.find(function(e){return e.id===selectedEmp;});if(!emp)return null;
  return (employeeDocuments[emp.id]||[]).find(function(d){return String(d.id)===String(docId);})||null;
}
function _empDocBlob(doc){
  return sb.storage.from('employee-documents').download(doc.storagePath).then(function(res){
    if(res.error)throw res.error;
    var ext=(doc.filename.split('.').pop()||'').toLowerCase(),type=DOC_MIME[ext]||res.data.type||'application/octet-stream';
    return new Blob([res.data],{type:type});
  });
}
function downloadEmpDocument(docId){
  var doc=_empDocFind(docId);if(!doc)return;
  _empDocBlob(doc).then(function(blob){
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=doc.filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},4000);
  }).catch(function(err){alert('Fehler beim Herunterladen: '+(err&&err.message||err));});
}
function closeDocPreview(){var o=document.getElementById('docPrevOv');if(o){if(o._url)URL.revokeObjectURL(o._url);o.remove();}}
function openEmpDocument(docId){
  var doc=_empDocFind(docId);if(!doc)return;
  var ext=(doc.filename.split('.').pop()||'').toLowerCase();
  if(!DOC_MIME[ext]){downloadEmpDocument(docId);return;} // z.B. Word/Excel: kann der Browser nicht anzeigen
  _empDocBlob(doc).then(function(blob){
    closeDocPreview();
    var url=URL.createObjectURL(blob),isImg=/^image\//.test(blob.type);
    var o=document.createElement('div');o.id='docPrevOv';o._url=url;
    o.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(29,28,26,.45);display:flex;align-items:center;justify-content:center;padding:24px';
    o.onclick=function(e){if(e.target===o)closeDocPreview();};
    o.innerHTML='<div style="background:#F7F5F0;border-radius:16px;width:min(1100px,94vw);height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden">'
      +'<div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #E4E0D6"><i class="ti ti-file-text" style="font-size:18px;color:var(--text2)"></i><div style="flex:1;min-width:0;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(doc.filename)+'</div>'
      +'<button class="btn" style="width:auto" onclick="downloadEmpDocument(\''+doc.id+'\')"><i class="ti ti-download"></i> Herunterladen</button>'
      +'<button class="btn" style="width:auto" onclick="closeDocPreview()"><i class="ti ti-x"></i> Schließen</button></div>'
      +'<div style="flex:1;min-height:0;background:#EEEDE9;display:flex;align-items:center;justify-content:center">'
      +(isImg?'<img src="'+url+'" alt="'+esc(doc.filename)+'" style="max-width:100%;max-height:100%;object-fit:contain">':'<iframe src="'+url+'" title="'+esc(doc.filename)+'" style="width:100%;height:100%;border:0;background:#fff"></iframe>')
      +'</div></div>';
    document.body.appendChild(o);
  }).catch(function(err){alert('Fehler beim Öffnen: '+(err&&err.message||err));});
}
function deleteEmpDocument(docId){
  if(_deletingEmpDoc)return;
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var doc=(employeeDocuments[emp.id]||[]).find(function(d){return String(d.id)===String(docId);});
  if(!doc)return;
  if(!confirm('Dokument "'+doc.filename+'" wirklich löschen?'))return;
  _deletingEmpDoc=true;
  sb.storage.from('employee-documents').remove([doc.storagePath]).then(function(){
    return sb.from('employee_documents').delete().eq('id',docId);
  }).then(function(res){
    _deletingEmpDoc=false;
    if(res&&res.error){alert('Fehler beim Löschen: '+res.error.message);return;}
    employeeDocuments[emp.id]=(employeeDocuments[emp.id]||[]).filter(function(d){return String(d.id)!==String(docId);});
    logActivity('document','deleted','Dokument gelöscht: "'+doc.filename+'"',emp.id,emp.name);
    renderTab();
  }).catch(function(err){_deletingEmpDoc=false;alert('Unerwarteter Fehler: '+err.message);});
}
function updateWorkHoursRow(dayKey){
  var whDaysAll=['mo','di','mi','do','fr','sa','so'];
  function timeToMinLocal(t){if(!t)return null;var p=t.split(':');return (+p[0])*60+(+p[1]);}
  function calcNet(von,bis,pause){
    if(!von||!bis)return 0;
    var mins=timeToMinLocal(bis)-timeToMinLocal(von)-(pause||0);
    return Math.max(0,mins/60);
  }
  var vonEl=document.getElementById('es-wh-'+dayKey+'-von');
  var bisEl=document.getElementById('es-wh-'+dayKey+'-bis');
  var pauseEl=document.getElementById('es-wh-'+dayKey+'-pause');
  var resultEl=document.getElementById('es-wh-'+dayKey+'-result');
  if(resultEl){
    var net=calcNet(vonEl?vonEl.value:'',bisEl?bisEl.value:'',pauseEl?parseInt(pauseEl.value)||0:0);
    resultEl.textContent=net.toFixed(1)+' Std.';
  }
  var weekTotal=0;
  whDaysAll.forEach(function(d){
    var v=document.getElementById('es-wh-'+d+'-von'), b=document.getElementById('es-wh-'+d+'-bis'), p=document.getElementById('es-wh-'+d+'-pause');
    weekTotal+=calcNet(v?v.value:'',b?b.value:'',p?parseInt(p.value)||0:0);
  });
  var summeEl=document.getElementById('es-wh-summe-result');
  if(summeEl)summeEl.textContent=weekTotal.toFixed(1)+' Std.';
}
function saveEmpEinstellungen(){
  if(_savingEmpEinstellungen)return;
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var teamEl=document.getElementById('es-team');
  var teamVal=teamEl?teamEl.value:'';
  if(teamVal==='__new__'){teamVal=prompt('Neuer Team-Name:','')||emp.team;}
  var oldTeam=emp.team, oldRole=emp.role;
  var oldSnapshot={name:emp.name,role:emp.role,phase:emp.phase,contract:emp.contract,hours:emp.hours,startDate:emp.startDate,endDate:emp.endDate,email:emp.email};
  emp.name=document.getElementById('es-name').value.trim()||emp.name;
  emp.role=document.getElementById('es-role').value;
  (function(){var f=document.getElementById('es-fn'),st=document.getElementById('es-stufe'),o=document.getElementById('es-ort');if(f){emp.funktion=f.value;emp.stufe=(f.value==='agent'||f.value==='coach')&&st?st.value:null;emp.standort=o?o.value:'MUC';}})();
  var oldSdlTeam=JSON.stringify(emp.sdlTeam||[]);
  if(emp.role==='SDL'){var cbs=document.querySelectorAll('#es-sdl-team .es-sdl-cb');if(cbs.length||document.getElementById('es-sdl-team'))emp.sdlTeam=Array.prototype.filter.call(cbs,function(c){return c.checked;}).map(function(c){return String(c.value);});}
  else emp.sdlTeam=[];
  var sdlTeamChanged=JSON.stringify(emp.sdlTeam||[])!==oldSdlTeam;
  emp.phase=document.getElementById('es-phase').value;
  var wasActive=oldSnapshot.phase!=='Inaktiv';
  var nowActive=emp.phase!=='Inaktiv';
  emp.active=nowActive;
  emp.team=teamVal||emp.team;
  var locEl=document.getElementById('es-location');
  if(locEl)emp.location=locEl.value.trim()||emp.team;
  emp.startDate=document.getElementById('es-start').value;
  emp.endDate=document.getElementById('es-end').value||null;
  emp.contract=document.getElementById('es-contract').value;
  var whDays=['mo','di','mi','do','fr','sa','so'];
  var newWorkHours={};
  function timeToMin(t){if(!t)return null;var p=t.split(':');return (+p[0])*60+(+p[1]);}
  whDays.forEach(function(d){
    var vonEl=document.getElementById('es-wh-'+d+'-von');
    var bisEl=document.getElementById('es-wh-'+d+'-bis');
    var pauseEl=document.getElementById('es-wh-'+d+'-pause');
    var von=vonEl?vonEl.value:'', bis=bisEl?bisEl.value:'', pause=pauseEl?(parseInt(pauseEl.value)||0):0;
    newWorkHours[d]={von:von,bis:bis,pause:pause};
  });
  // C4: geänderte Arbeitszeit gilt erst ab „Änderung gültig ab“ (Verlauf employee_verlauf, SQL 51)
  var oldWorkHours=emp.workHours||null,whNorm=function(w){var o={};whDays.forEach(function(d){var dv=(w&&w[d])||DEFAULT_WORK_HOURS[d]||{};var on=!!(dv.von&&dv.bis);o[d]=[dv.von||'',dv.bis||'',on?(dv.pause!=null&&dv.pause!==''?(+dv.pause||0):30):0];});return JSON.stringify(o);};
  var whAb=null,whRows=null;
  if(EV_OK&&whNorm(oldWorkHours)!==whNorm(newWorkHours)){
    var _abEl=document.getElementById('es-wh-ab'),_who=(typeof currentCoach!=='undefined'&&currentCoach)?currentCoach.name:((typeof currentAuthUser!=='undefined'&&currentAuthUser&&currentAuthUser.email)||null);
    whAb=(_abEl&&/^\d{4}-\d{2}-\d{2}$/.test(_abEl.value))?_abEl.value:today();whRows=[];
    if(!(((employeeVerlauf[String(emp.id)]||{}).workHours)||[]).length){var _a0=oldSnapshot.startDate||'2000-01-01';
      if(_a0<whAb){whRows.push({employee_id:emp.id,feld:'workHours',gueltig_ab:_a0,wert:oldWorkHours,geaendert_von:'Startwert'});empVerlaufSet(emp,'workHours',_a0,oldWorkHours,'Startwert');}}
    whRows.push({employee_id:emp.id,feld:'workHours',gueltig_ab:whAb,wert:newWorkHours,geaendert_von:_who});empVerlaufSet(emp,'workHours',whAb,newWorkHours,_who);
  }
  emp.workHours=newWorkHours;
  emp.hours=whDays.reduce(function(sum,d){
    var dv=newWorkHours[d];
    if(!dv.von||!dv.bis)return sum;
    var mins=timeToMin(dv.bis)-timeToMin(dv.von)-(dv.pause||0);
    return sum+Math.max(0,mins/60);
  },0);
  var emailEl=document.getElementById('es-email');
  if(emailEl)emp.email=emailEl.value.trim()||null;
  var notesEl=document.getElementById('es-notes');
  if(notesEl){var _nl=function(v){return String(v==null?'':v).replace(/\r\n/g,'\n');},_no=notesEl.getAttribute('data-orig'),_nv=_nl(notesEl.value),_nc=_nl(emp.notes);
    // C10: Notiz nur übernehmen, wenn sie im Formular geändert wurde; ist sie inzwischen neuer (z. B. Kommentar „zur Notiz“), nachfragen
    if(_no===null||_nv!==_nl(_no)){if(_no===null||_nc===_nl(_no)||_nc===_nv||confirm('Die Notiz wurde inzwischen an anderer Stelle geändert.\n\nOK = deine Fassung aus diesem Formular speichern (die neuere geht verloren)\nAbbrechen = neuere Notiz behalten'))emp.notes=notesEl.value;}
    notesEl.value=emp.notes||'';notesEl.setAttribute('data-orig',emp.notes||'');}
  renderSidebar();renderEmpDetail();  lsSave();
  _savingEmpEinstellungen=true;
  var empUpd={
    name:emp.name,role:emp.role,phase:emp.phase,team:emp.team,active:emp.active,
    start_date:emp.startDate||null,end_date:emp.endDate||null,
    contract:emp.contract,hours:emp.hours,notes:emp.notes||null,color_index:emp.color,email:emp.email||null,work_hours:emp.workHours||null
  };
  if(sdlTeamChanged)empUpd.sdl_team=emp.sdlTeam||[];
  if(emp.funktion){empUpd.funktion=emp.funktion;empUpd.stufe=emp.stufe;empUpd.standort=emp.standort;}
  sb.from('employees').update(empUpd).eq('id',emp.id).then(function(res){
    if(res&&res.error&&/funktion|stufe|standort/.test(res.error.message||'')){delete empUpd.funktion;delete empUpd.stufe;delete empUpd.standort;return sb.from('employees').update(empUpd).eq('id',emp.id);}return res;}).then(function(res){
    _savingEmpEinstellungen=false;
    if(res.error){alert('Fehler beim Speichern in Supabase: '+res.error.message+'\n\nDie Änderung ist lokal sichtbar, aber NICHT gespeichert -- bitte nochmal versuchen.');return;}
    if(whRows&&whRows.length)sb.from('employee_verlauf').upsert(whRows,{onConflict:'employee_id,feld,gueltig_ab'}).then(function(r){if(r&&r.error)alert('Die Arbeitszeit ist gespeichert, aber der Verlauf („gültig ab“) nicht: '+r.error.message+'\n\nBitte die Seite neu laden und die Arbeitszeit noch einmal speichern.');});
    var stammChanges=[];
    if(oldSnapshot.name!==emp.name)stammChanges.push('Name: '+oldSnapshot.name+' → '+emp.name);
    if(oldSnapshot.role!==emp.role)stammChanges.push('Rolle: '+oldSnapshot.role+' → '+emp.role);
    if(sdlTeamChanged)stammChanges.push('Team: '+((emp.sdlTeam||[]).map(function(i){var x=kalEmp(i);return x?x.name:i;}).join(', ')||'keins'));
    if(oldSnapshot.phase!==emp.phase)stammChanges.push('Phase: '+oldSnapshot.phase+' → '+emp.phase);
    if(oldSnapshot.contract!==emp.contract)stammChanges.push('Anstellung: '+oldSnapshot.contract+' → '+emp.contract);
    if(oldSnapshot.hours!==emp.hours)stammChanges.push('Stunden: '+oldSnapshot.hours+' → '+emp.hours+(whAb?' (gültig ab '+fd(whAb)+')':''));
    if(oldSnapshot.startDate!==emp.startDate)stammChanges.push('Vertragsbeginn: '+(oldSnapshot.startDate||'—')+' → '+(emp.startDate||'—'));
    if(oldSnapshot.endDate!==emp.endDate)stammChanges.push('Vertragsende: '+(oldSnapshot.endDate||'—')+' → '+(emp.endDate||'—'));
    if(stammChanges.length)logActivity('stammdaten','updated','Stammdaten geändert: '+stammChanges.join(' · '),emp.id,emp.name);
    if(wasActive&&!nowActive){logAdminAction('employee_deactivated','Mitarbeiter: '+emp.name);logActivity('employee','deleted','Mitarbeiter deaktiviert (Phase: Inaktiv): '+emp.name,emp.id,emp.role);}
    else if(!wasActive&&nowActive){logActivity('employee','updated','Mitarbeiter reaktiviert (Phase: '+emp.phase+'): '+emp.name,emp.id,emp.role);}
  });
  // Änderungshistorie protokollieren (alle Stammdaten-Felder)
  var actorName=null;
  if(typeof currentCoach!=='undefined'&&currentCoach)actorName=currentCoach.name;
  else if(typeof currentAuthUser!=='undefined'&&currentAuthUser&&typeof appUsers!=='undefined'){
    var _mu=appUserByEmail(currentAuthUser.email);
    if(_mu)actorName=_mu.name;
  }
  var histRows=[];
  function pushHist(field,ov,nv){
    if(ov===nv)return;
    if((ov==null||ov==='')&&(nv==null||nv===''))return; // leer -> leer ist keine Aenderung
    if(ov!=null&&nv!=null&&String(ov)===String(nv))return;
    histRows.push({employee_id:emp.id,field:field,old_value:ov!=null?String(ov):null,new_value:nv!=null?String(nv):null,changed_by:currentCoach?currentCoach.id:null,changed_by_name:actorName});
  }
  pushHist('team',oldTeam,emp.team);
  pushHist('role',oldRole,emp.role);
  pushHist('name',oldSnapshot.name,emp.name);
  pushHist('phase',oldSnapshot.phase,emp.phase);
  pushHist('contract',oldSnapshot.contract,emp.contract);
  pushHist('hours',oldSnapshot.hours,emp.hours);
  pushHist('startDate',oldSnapshot.startDate,emp.startDate);
  pushHist('endDate',oldSnapshot.endDate,emp.endDate);
  pushHist('email',oldSnapshot.email,emp.email);
  if(histRows.length){
    sb.from('employee_history').insert(histRows).then(function(res){
      if(res.error)console.warn('Historie konnte nicht gespeichert werden:',res.error);
      else renderEmpDetail();
    });
  }
  // Hinweis: "location" wird aktuell nur lokal gehalten (kein Feld in employees-Tabelle)
}
function histFieldInfo(field){
  var FL={team:'Team',role:'Position',name:'Name',phase:'Phase',contract:'Anstellung',hours:'Stunden/Woche',startDate:'Vertragsbeginn',endDate:'Vertragsende',email:'E-Mail',workHours_version:'Arbeitszeit-Version',
    provision_gueltigAb:'Gültig ab',provision_grundgehalt:'Grundgehalt',provision_agSozialabgaben:'AG-Sozialabgaben',provision_basisProOpt:'Basisprovision/Opt.',
    provision_divOEM:'Divisor OEM',provision_divUpsell:'Divisor Upsells',provision_divWka:'Divisor WKA',provision_reduktionProKpi:'Reduzierung je KPI',
    provision_mindestprovision:'Mindestprovision',provision_mindestleistungOptH:'Mindestleistung Opt./Std.',
    provision_vlc_serviceRate:'Service Rate (VLC)',provision_vlc_bonusProOpt:'Bonus/Opt. (VLC)',provision_vlc_extraPayPct:'Extra Pay % (VLC)',provision_vlc_extraPayAbH:'Extra Pay ab/Std. (VLC)'};
  var SUB={optH:'Opt. Gesamt / Std.',crOem:'CR OEM',tw:'CR TW',sy:'CR SY',my:'CR MY',syMy:'CR SY/MY',oemAnteil:'Anteil OEM',crYes:'CR YES',notReached:'NE - Nicht Erreicht',notPossible:'NM - Nicht Möglich',notSuccessful:'NEF - Nicht Erfolgreich',aktivitaeten:'Aktivitäten / Std.',convOEM:'Conv. OEM / Tag',optGesamt:'Opt. Gesamt / Tag',margeZiel:'Marge Ziel'};
  var MON={monat1:'Monat 1',monat2:'Monat 2',monat3plus:'Ab Monat 3'};
  var PCT={crOem:1,tw:1,sy:1,my:1,syMy:1,oemAnteil:1,crYes:1,notReached:1,notPossible:1,notSuccessful:1};
  var EUR={provision_grundgehalt:1,provision_basisProOpt:2,provision_vlc_serviceRate:1,provision_vlc_bonusProOpt:2,provision_vlc_extraPayAbH:2};
  var PCTF={provision_agSozialabgaben:1,provision_reduktionProKpi:1,provision_mindestprovision:1,provision_vlc_extraPayPct:1};
  var m;
  if(FL[field]){
    var area=/^provision_/.test(field)?'prov':(field==='hours'||field==='workHours_version'?'zeit':'stamm');
    return {label:FL[field],area:area,fmt:EUR[field]?('eur'+(EUR[field]===2?'2':'')):PCTF[field]?'pct':(/Date$|gueltigAb$/.test(field)?'date':'')};
  }
  if((m=field.match(/^provision_kpis?_(monat1|monat2|monat3plus)$/)))return {label:'KPI-Vorgaben '+MON[m[1]],area:'kpi',legacy:true};
  if((m=field.match(/^provision_kpi_(monat1|monat2|monat3plus)_(.+)$/)))return {label:(SUB[m[2]]||m[2])+' · '+MON[m[1]],area:'kpi',fmt:PCT[m[2]]?'pct':(m[2]==='margeZiel'?'eur':'')};
  if((m=field.match(/^provision_vlc_(monat1|monat2|monat3plus)_(.+)$/)))return {label:(SUB[m[2]]||m[2])+' · '+MON[m[1]]+' (VLC)',area:'kpi',fmt:PCT[m[2]]?'pct':''};
  if((m=field.match(/^provision_vlc_stufe_(optH|syMy|crOem)_(aus1|grenze|aus2)$/)))return {label:SUB[m[1]]+' · '+({aus1:'Stufe 1',grenze:'Untergrenze',aus2:'Stufe 2'})[m[2]]+' (VLC)',area:'prov',fmt:(m[2]==='grenze'&&m[1]==='optH')?'':'pct'};
  if(/^provision_/.test(field))return {label:field.replace(/^provision_/,'').replace(/_/g,' '),area:'prov'};
  return {label:field,area:'stamm'};
}
function histFmt(v,fmt){
  if(v==null||v==='')return null;
  if(fmt==='date'){var p=String(v).slice(0,10).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:String(v);}
  var n=parseFloat(String(v).replace(',','.'));
  if(fmt&&!isNaN(n)&&/^-?[0-9.,]+$/.test(String(v))){
    if(fmt==='eur')return n.toLocaleString('de-DE',{maximumFractionDigits:0})+' €';
    if(fmt==='eur2')return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
    if(fmt==='pct')return n.toLocaleString('de-DE',{maximumFractionDigits:1})+' %';
  }
  if(!isNaN(n)&&/^-?[0-9]+\.[0-9]+$/.test(String(v)))return n.toLocaleString('de-DE',{maximumFractionDigits:2});
  return String(v);
}
function histEvents(empId){
  var rows=((typeof employeeHistory!=='undefined'&&employeeHistory[empId])||[]).slice().sort(function(a,b){return (b.changedAt||'')<(a.changedAt||'')?-1:1;});
  var evs=[];
  rows.forEach(function(r){
    var info=histFieldInfo(r.field||'');
    var ov=r.oldValue, nv=r.newValue;
    var legacy=info.legacy||(ov==='geändert'&&nv==='geändert');
    if(!legacy&&(ov==null||ov===''||ov==='—')&&(nv==null||nv===''||nv==='—'))return; // leere Eintraege
    if(!legacy&&String(ov)===String(nv))return;
    var t=r.changedAt?new Date(r.changedAt).getTime():0, who=r.changedByName||'Unbekannt';
    var ev=evs.length?evs[evs.length-1]:null;
    if(!ev||ev.who!==who||Math.abs(ev.t0-t)>120000){ev={who:who,t:t,t0:t,items:[],keys:{}};evs.push(ev);}
    ev.t0=t;
    var key=info.label+'|'+ov+'|'+nv;
    if(ev.keys[key])return; ev.keys[key]=1; // Duplikate
    ev.items.push({label:info.label,area:info.area,legacy:legacy,ov:histFmt(ov,info.fmt),nv:histFmt(nv,info.fmt)});
  });
  return evs;
}
function buildHistFilterHtml(){
  return '<div style="display:inline-flex;height:34px;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;background:var(--s-white)">'
    +[['all','Alle']].concat(Object.keys(HIST_AREAS).map(function(a){return [a,HIST_AREAS[a]];})).map(function(x){
      var on=histFilter===x[0];
      return '<button onclick="setHistFilter(\''+x[0]+'\')" style="padding:0 13px;font-size:12px;font-weight:500;border:none;background:'+(on?'#F08566':'transparent')+';color:'+(on?'#fff':'var(--text2)')+';font-family:inherit;cursor:pointer">'+x[1]+'</button>';
    }).join('')+'</div>';
}
function histAreaBadge(a){
  var st={stamm:'background:var(--s-tint-strong);color:var(--purple-dark)',prov:'background:#1d1c1a;color:#fff',kpi:'background:rgba(247,179,154,.35);color:var(--purple-dark)',zeit:'background:var(--s-white);color:var(--text2);border:1px solid var(--border)'}[a];
  return '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap;'+st+'">'+HIST_AREAS[a]+'</span>';
}
function buildHistTilesHtml(empId){
  var evs=histEvents(empId).map(function(e){return Object.assign({},e,{items:e.items.filter(function(i){return histFilter==='all'||i.area===histFilter;})});}).filter(function(e){return e.items.length;});
  if(!evs.length)return '<div style="font-size:12px;color:var(--text3);text-align:center;padding:16px">'+(histFilter==='all'?'Noch keine Änderungen protokolliert':'Keine Änderungen in diesem Bereich')+'</div>';
  var LIMIT=5, shown=histShowAll?evs:evs.slice(0,LIMIT);
  var h='';
  function valHtml(i,short){
    if(i.legacy)return '<span style="color:var(--text3);font-style:italic">geändert'+(short?'':' · Werte nicht protokolliert')+'</span>';
    if(short)return (i.ov==null?'neu ':esc(i.ov)+' → ')+(i.nv==null?'leer':esc(i.nv));
    return null;
  }
  shown.forEach(function(e,ix){
    var key=String(e.who+'|'+e.t).replace(/'/g,'');
    var open=(histExpanded[key]!=null)?histExpanded[key]:(ix===0);
    var ini=e.who.split(/\s+/).map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase();
    var d=new Date(e.t), dTxt=d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})+' · '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+' Uhr';
    var areas=Object.keys(HIST_AREAS).filter(function(a){return e.items.some(function(i){return i.area===a;});});
    var sum=e.items.slice(0,3).map(function(i){return '<b style="color:var(--text);font-weight:600">'+esc(i.label)+'</b> '+valHtml(i,true);}).join(' · ')+(e.items.length>3?' · +'+(e.items.length-3)+' weitere':'');
    h+='<div style="background:var(--s-sub);border:1px solid var(--border);border-radius:10px;margin-bottom:10px">'
      +'<div onclick="toggleHistTile(\''+empId+'\',\''+key+'\','+(open?'true':'false')+')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;min-height:62px;cursor:pointer">'
      +'<div style="display:flex;align-items:center;gap:10px;width:260px;flex-shrink:0"><span style="width:30px;height:30px;border-radius:7px;background:var(--s-tint-strong);color:var(--purple-dark);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+esc(ini)+'</span>'
      +'<div style="min-width:0"><div style="font-weight:700;font-size:13px;white-space:nowrap">'+esc(e.who)+'</div><div style="font-size:11.5px;color:var(--text2);white-space:nowrap">'+dTxt+'</div></div></div>'
      +'<div style="display:flex;gap:4px;width:220px;flex-shrink:0;flex-wrap:wrap">'+areas.map(histAreaBadge).join('')+'</div>'
      +'<div style="flex:1;min-width:0;font-size:12.5px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+sum+'</div>'
      +'<div style="text-align:right;flex-shrink:0"><div style="font-size:20px;font-weight:700;color:var(--purple-dark);line-height:1.1">'+e.items.length+'</div><div style="font-size:11.5px;color:var(--text2)">Änderung'+(e.items.length===1?'':'en')+'</div></div>'
      +'<i class="ti ti-chevron-right" style="color:var(--text3);font-size:15px;transition:transform .15s;'+(open?'transform:rotate(90deg)':'')+'"></i>'
      +'</div>';
    if(open){
      h+='<div style="border-top:1px solid var(--border);padding:10px 16px 14px"><div class="std-wrap"><table class="std-table">'
        +'<thead><tr><th style="width:34%">Feld</th><th style="width:16%">Bereich</th><th class="r" style="width:22%">Vorher</th><th class="r">Nachher</th></tr></thead><tbody>';
      e.items.forEach(function(i){
        var parts=String(i.label).split(' · '), main=parts.shift(), sub=i.legacy?'alter Eintrag':parts.join(' · ');
        h+='<tr><td class="f">'+esc(main)+(sub?'<span class="s">'+esc(sub)+'</span>':'<span class="s" style="visibility:hidden">–</span>')+'</td><td>'+histAreaBadge(i.area)+'</td>'
          +(i.legacy?'<td colspan="2" class="r" style="color:var(--text3);font-style:italic">geändert · Werte damals nicht protokolliert</td>'
            :'<td class="r">'+(i.ov==null?'<span style="color:var(--text3)">leer</span>':'<span style="color:var(--text3);text-decoration:line-through">'+esc(i.ov)+'</span>')+'</td><td class="r" style="font-weight:700;word-break:break-all">'+(i.nv==null?'<span style="color:var(--text3);font-weight:400">leer</span>':esc(i.nv))+'</td>')
          +'</tr>';
      });
      h+='</tbody></table></div></div>';
    }
    h+='</div>';
  });
  if(evs.length>LIMIT)h+='<div style="margin-top:12px"><button class="btn" style="width:auto;height:34px" onclick="histShowAll=!histShowAll;refreshHistTiles(\''+empId+'\')"><i class="ti ti-'+(histShowAll?'chevron-up':'chevron-down')+'"></i> '+(histShowAll?'Weniger anzeigen':'Ältere anzeigen ('+(evs.length-LIMIT)+')')+'</button></div>';
  return h;
}
function refreshHistTiles(empId){
  var t=document.getElementById('histTiles'); if(t)t.innerHTML=buildHistTilesHtml(empId);
  var f=document.getElementById('histFilterBar'); if(f)f.innerHTML=buildHistFilterHtml();
}
function setHistFilter(f){histFilter=f;var emp=(typeof selectedEmpId!=='undefined')?selectedEmpId:null;refreshHistTiles(window._histEmpId);}
function toggleHistTile(empId,key,wasOpen){
  histExpanded[key]=!wasOpen;refreshHistTiles(empId);
}

function esToggleSection(n,el){
  esOpenSections[n]=!esOpenSections[n];
  var b=el.querySelector('.es-acc-body'), ch=el.querySelector('.es-acc-ch');
  if(b)b.style.display=esOpenSections[n]?'':'none';
  if(ch)ch.style.transform=esOpenSections[n]?'rotate(90deg)':'';
}


// ── REVIEW ACTIONS ──

// ── EMP SETTINGS ACTIONS ──

function setEmpColor(colorIdx){
  var emp=employees.find(function(e){return e.id===selectedEmp;});
  if(!emp)return;
  var oldColor=emp.color;
  emp.color=colorIdx;
  renderTab();
  lsSave();
  sb.from('employees').update({color_index:colorIdx}).eq('id',emp.id).then(function(res){
    if(res.error){
      alert('Fehler beim Speichern der Avatar-Farbe: '+res.error.message+'\n\nDie Änderung ist lokal sichtbar, aber NICHT gespeichert.');
      emp.color=oldColor;renderTab();
    } else {
      logActivity('stammdaten','updated','Avatar-Farbe geändert',emp.id,emp.name);
    }
  });
}
function zieleSpeichern(){
  if(_savingZieleGlobal)return;
  var keys=['crOEM','crTeilweise','crSuperYes','crMegaYes','optPerH'];
  var updates=[];
  var changes=[];
  keys.forEach(function(k){
    var dirEl=document.getElementById('dir-'+k);
    var valEl=document.getElementById('val-'+k);
    if(dirEl&&valEl&&KPI_TARGETS[k]){
      var oldVal=KPI_TARGETS[k].val,oldDir=KPI_TARGETS[k].dir;
      var newVal=parseFloat(valEl.value)||KPI_TARGETS[k].val;
      var newDir=dirEl.value;
      if(oldVal!==newVal||oldDir!==newDir){
        changes.push(KPI_TARGETS[k].label+': '+oldDir+' '+oldVal+' → '+newDir+' '+newVal);
      }
      KPI_TARGETS[k].dir=newDir;
      KPI_TARGETS[k].val=newVal;
      updates.push({metric_key:k,label:KPI_TARGETS[k].label,val:KPI_TARGETS[k].val,dir:KPI_TARGETS[k].dir});
    }
  });
  CR_GOOD=KPI_TARGETS.crOEM.val;
  renderTeam();
  _savingZieleGlobal=true;
  sb.from('kpi_targets').upsert(updates,{onConflict:'metric_key'}).then(function(res){
    _savingZieleGlobal=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    if(changes.length){logAdminAction('kpi_target_global',changes.join(' · '));logActivity('kpi_target','updated','Globale KPI-Ziele geändert: '+changes.join(' · '),null,null);}
    var zs=document.getElementById('ziele-status');if(zs){zs.textContent='✓ Gespeichert';setTimeout(function(){zs.textContent='';},3000);}
    var btn=document.querySelector('[onclick="zieleSpeichern()"]');
    if(btn){
      btn.innerHTML='<i class="ti ti-check"></i> Gespeichert!';
      btn.style.background='var(--teal)';
      setTimeout(function(){
      btn.innerHTML='<i class="ti ti-check"></i> Zielwerte speichern';
      btn.style.background='';
    },2000);
  }
  }).catch(function(err){
    _savingZieleGlobal=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}
