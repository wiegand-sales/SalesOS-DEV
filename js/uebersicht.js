// Sales OS – Übersicht: Team, Overview, Performance-Tabelle
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function rerenderOverviewContext(){
  if(overviewRenderTarget==='emp'){
    // Nur die eingebettete Tabelle aktualisieren - Banner, Diagramm und Impact-Panel bleiben unangetastet
    var container=document.getElementById('empPerfTableContainer');
    var emp=employees.find(function(e){return e.id===selectedEmp;});
    if(container&&emp){
      var scrollEl=document.getElementById('tabContent');
      var scrollTop=scrollEl?scrollEl.scrollTop:0;
      container.innerHTML=buildOverviewTab([emp],'performance',true,true,true);
      if(scrollEl)scrollEl.scrollTop=scrollTop;
    } else {
      renderTab();
    }
    return;
  }
  var scrollEl=document.getElementById('tabContent');
  window._overviewScrollRestore=scrollEl?scrollEl.scrollTop:0;
  renderTeam();
  var scrollElAfter=document.getElementById('tabContent');
  if(scrollElAfter)scrollElAfter.scrollTop=window._overviewScrollRestore;
}
function setOverviewDisplayMode(m){overviewDisplayMode=m;rerenderOverviewContext();}
function setOverviewTeamGroup(visibleIds,groupKey){
  var ids=visibleIds.filter(function(id){
    var e=employees.find(function(x){return x.id===id;});
    if(!e)return false;
    if(groupKey==='DE')return e.role!=='VLC';
    if(groupKey==='VLC')return e.role==='VLC';
    if(groupKey==='SR')return e.role==='SR';
    if(groupKey==='SE')return e.role==='SE';
    if(groupKey==='OB')return e.phase==='Onboarding'&&e.role!=='VLC';
    return true;
  });
  overviewSelectedIds=ids;
  rerenderOverviewContext();
}
function toggleOverviewEmpDropdown(){overviewEmpDropdownOpen=!overviewEmpDropdownOpen;if(!overviewEmpDropdownOpen)overviewEmpSearchQuery='';rerenderOverviewContext();}
function toggleOverviewEmpId(id){
  if(!overviewSelectedIds)overviewSelectedIds=[];
  var idx=overviewSelectedIds.indexOf(id);
  if(idx>=0)overviewSelectedIds.splice(idx,1);else overviewSelectedIds.push(id);
  var scrollEl=document.getElementById('overviewEmpScrollList');
  window._overviewEmpScrollTop=scrollEl?scrollEl.scrollTop:null;
  rerenderOverviewContext();
}
function setOverviewSelectAll(allIds){overviewSelectedIds=allIds.slice();rerenderOverviewContext();}
function setOverviewSelectNone(){overviewSelectedIds=[];rerenderOverviewContext();}
function filterOverviewEmpList(q){
  q=(q||'').toLowerCase().trim();
  var wrap=document.getElementById('overviewEmpDropdownWrap');
  if(!wrap)return;
  var anyVisible=false;
  wrap.querySelectorAll('.emp-opt-row').forEach(function(row){
    var match=!q||row.dataset.search.indexOf(q)>=0;
    row.style.display=match?'grid':'none';
    if(match)anyVisible=true;
  });
  var noRes=document.getElementById('overviewEmpNoResults');
  if(noRes)noRes.style.display=anyVisible?'none':'block';
}
function setOverviewPerfSort(key){
  if(overviewPerfSortKey===key){overviewPerfSortDir=overviewPerfSortDir==='asc'?'desc':'asc';}
  else{overviewPerfSortKey=key;overviewPerfSortDir='asc';}
  rerenderOverviewContext();
}
function setOverviewChartGroup(g){overviewChartGroup=g;renderTeam();}
function setEmpChartMetric(v){empChartMetric=v;renderTab();}
function setEmpChartGroup(g){empChartGroup=g;renderTab();}
function setOverviewDateRange(from,to){overviewFromDate=from||null;overviewToDate=to||null;rerenderOverviewContext();}
function setOverviewQuickRange(type){
  var t=today();
  if(type==='today'){setOverviewDateRange(t,t);}
  else if(type==='week'){
    var dToday=new Date(t+'T00:00:00Z');
    var dow=dToday.getUTCDay()||7;
    var monday=new Date(dToday);monday.setUTCDate(dToday.getUTCDate()-(dow-1));
    var sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
    setOverviewDateRange(monday.toISOString().slice(0,10),sunday.toISOString().slice(0,10));
  }
  else if(type==='month'){var mb=monthBoundsUTC(t,0);setOverviewDateRange(mb.from,mb.to);}
  else if(type==='year'){var y=t.slice(0,4);setOverviewDateRange(y+'-01-01',y+'-12-31');}
}
function applyOverviewWeek(){
  var el=document.getElementById('overviewWeekInput');
  if(!el||!el.value)return;
  var parts=el.value.split('-W'); // "2026-W29"
  var year=parseInt(parts[0],10),week=parseInt(parts[1],10);
  // Montag der ISO-Woche berechnen
  // C6: KW 1 ist die Woche mit dem 4. Januar (sonst z. B. 2027 um eine Woche verschoben)
  var jan4=new Date(Date.UTC(year,0,4));
  var dow=jan4.getUTCDay()||7; // Sonntag=0 -> 7
  var monday=new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate()-dow+1+(week-1)*7);
  var sunday=new Date(monday);
  sunday.setUTCDate(monday.getUTCDate()+6);
  setOverviewDateRange(monday.toISOString().slice(0,10),sunday.toISOString().slice(0,10));
}
function applyOverviewMonth(){
  var el=document.getElementById('overviewMonthInput');
  if(!el||!el.value)return;
  var parts=el.value.split('-'); // "2026-07"
  var year=parseInt(parts[0],10),month=parseInt(parts[1],10);
  var from=year+'-'+('0'+month).slice(-2)+'-01';
  var lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
  var to=year+'-'+('0'+month).slice(-2)+'-'+('0'+lastDay).slice(-2);
  setOverviewDateRange(from,to);
}
function setOverviewPerfGroup(g){overviewPerfGroup=g;rerenderOverviewContext();}

function setCoachFilterView(v){coachFilterView='overview';if(v&&v!=='overview'&&v!=='coverage'&&typeof kalCoachOpts==='function'){KAL.chf={};kalCoachOpts().forEach(function(o){if(o[0]!==String(v))KAL.chf[o[0]]=1;});}selectKalender();}
function perfImpact(emp,rows,date,key){var R=(rows||[]).filter(function(p){return p&&p.date;});
  var b=R.filter(function(p){return p.date<date;}).sort(function(x,y){return y.date.localeCompare(x.date);}).slice(0,IMPACT_DAYS);
  var a=R.filter(function(p){return p.date>date;}).sort(function(x,y){return x.date.localeCompare(y.date);}).slice(0,IMPACT_DAYS);
  if(!b.length)return {state:'none'};if(a.length<IMPACT_DAYS)return {state:'wait',n:a.length};
  var bv=perfKpiWin(emp,b,key),av=perfKpiWin(emp,a,key);if(bv==null||av==null)return {state:'none'};
  var t=emp?empTargets(emp):{},dir=(t[key]&&t[key].dir)||'gte',d=(av-bv)*(dir==='lte'?-1:1);
  var thr=/^cr/i.test(key)?1:key==='optPerH'?0.05:Math.max(Math.abs(bv)*0.03,0.01);
  return {state:'ok',before:bv,after:av,raw:av-bv,delta:d,verdict:d>thr?'ja':d<-thr?'nein':'neutral'};}
function impactWord(v){return v==='ja'?'hat geholfen':v==='nein'?'verschlechtert':'keine Veränderung';}
function impactStyle(v){return v==='ja'?'background:#3a3833;border:1px solid #3a3833;color:#fff':v==='nein'?'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A':'background:#fff;border:1px solid #E4E0D6;color:var(--text2)';}
function impactNum(key,v){var u=/^cr/i.test(key)?' %-P.':'';return (v>0?'+':'')+(Math.abs(v)<10?v.toFixed(1):Math.round(v)).toString().replace('.',',')+u;}

function setTeamRange(d){teamRange=d;teamCustomFrom=null;teamCustomTo=null;renderTeam();}
function applyTeamCustomRange(){
  var f=document.getElementById('teamFromDate').value;
  var t=document.getElementById('teamToDate').value;
  if(!f||!t){alert('Bitte Von- und Bis-Datum auswählen.');return;}
  if(f>t){alert('Das Von-Datum muss vor dem Bis-Datum liegen.');return;}
  teamCustomFrom=f;teamCustomTo=t;
  renderTeam();
}
function clearTeamCustomRange(){teamCustomFrom=null;teamCustomTo=null;renderTeam();}
function setTeamMetric(m){teamPerfMetric=m;renderTeam();}

// ── TEAM VIEW ──

// ── COACHING HELPERS ──
function letzteSessionMA(id){
  var p=protocols[id]||[];
  return p.length?p.slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0]:null;
}

// Persönliche Bestwerte (Highscores) über die gesamte Performance-Historie
function personalBestEvents(empId){
  var rows=(performance[empId]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  var fields=[
    {key:'optGesamt',label:'Optimierungen gesamt',fmt:function(v){return Math.round(v);}},
    {key:'oem_aktivitaeten',label:'Aktivitäten',fmt:function(v){return Math.round(v);}},
    {key:'crOEM',label:'CR OEM',fmt:function(v){return Math.round(v)+'%';}},
    {key:'margeGesamt',label:'Marge Gesamt',fmt:function(v){return '€'+Math.round(v).toLocaleString('de-DE');}},
    {key:'convOEM',label:'Conv. OEM',fmt:function(v){return Math.round(v);}}
  ];
  var events=[];
  fields.forEach(function(f){
    var max=null;
    rows.forEach(function(r){
      var v=/^cr/.test(f.key)?perfKpiWin(null,[r],f.key):r[f.key]; // B1: CR je Tag aus Rohzahlen
      if(v===undefined||v===null)return;
      if(max!==null&&v>max){
        events.push({date:r.date,label:'Bestwert '+f.label+': '+f.fmt(v)+' (bisher: '+f.fmt(max)+')'});
      }
      if(max===null||v>max)max=v;
    });
  });
  return events;
}
function kpiMilestones(empId){
  var perf=(performance[empId]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  var emp=employees.find(function(e){return e.id===empId;});
  if(!emp)return [];
  var t=empTargets(emp);
  var defs=[{k:'crOEM',l:'CR OEM'},{k:'crSuperYes',l:'CR Super Yes'},{k:'crMegaYes',l:'CR Mega Yes'}];
  var out=[];
  defs.forEach(function(d){
    var tgt=t[d.k];
    if(!tgt||tgt.val==null)return;
    var hv=null;
    var hit=perf.find(function(p){
      var v=perfKpiWin(emp,[p],d.k); // B1: CR je Tag aus Rohzahlen
      if(v===undefined||v===null)return false;
      hv=v;return tgt.dir==='lte'?v<=tgt.val:v>=tgt.val;
    });
    if(hit)out.push({date:hit.date,label:d.l+'-Ziel erstmals erreicht ('+Math.round(hv)+'%)'});
  });
  return out;
}
// Team-/Rollen-Benchmark: Ø der letzten 30 Tage für alle aktiven Kollegen der gleichen Rolle
function roleBenchmark(empId,metricKey,days){
  days=days||30;
  var emp=employees.find(function(e){return e.id===empId;});
  if(!emp)return null;
  var peers=employees.filter(function(e){return e.role===emp.role&&e.active!==false;});
  var vals=[],pool=[];
  peers.forEach(function(e){
    var p=getPerf(e.id,days);
    if(!p.length)return;
    pool=pool.concat(p);
    var avg=p.reduce(function(a,x){return a+(x[metricKey]||0);},0)/p.length;
    vals.push(avg);
  });
  // B1: CR aus den summierten Rohzahlen aller Kollegen der Rolle (erst summieren, dann teilen)
  if(/^cr/.test(metricKey))return pool.length?perfKpiWin(null,pool,metricKey):null;
  if(!vals.length)return null;
  return vals.reduce(function(a,b){return a+b;},0)/vals.length;
}

function tageSeitLetzterSession(id){
  var ls=letzteSessionMA(id);
  if(!ls)return null;
  var diff=new Date(today()+'T00:00:00Z')-new Date(ls.date+'T00:00:00Z');
  return Math.floor(diff/86400000);
}
function aufmerksamkeitFarbe(tage){
  if(tage===null)return 'var(--red)';
  if(tage>14)return 'var(--red)';
  if(tage>7)return 'var(--amber)';
  return 'var(--teal)';
}




function setTeamFilter(k){teamFilter=k;renderMain();}
// Anzahl der bereits verstrichenen Arbeitstage in einem beliebigen Datumsbereich (Mo-Fr, ohne
// bayerische Feiertage), begrenzt auf "heute" falls das Range-Ende in der Zukunft liegt
function elapsedWorkDaysInRange(from,to){
  var t=today();
  var effTo=to<t?to:t;
  if(effTo<from)return 0;
  var d0=new Date(from+'T00:00:00Z'),d1=new Date(effTo+'T00:00:00Z');
  var count=0;
  var feiertageCache={};
  for(var d=new Date(d0);d<=d1;d.setUTCDate(d.getUTCDate()+1)){
    var dow=d.getUTCDay();
    if(dow===0||dow===6)continue;
    var y=d.getUTCFullYear();
    if(!feiertageCache[y])feiertageCache[y]=bayernFeiertage(y);
    if(feiertageCache[y][d.toISOString().slice(0,10)])continue;
    count++;
  }
  return count;
}
// Anzahl der bereits verstrichenen Arbeitstage im aktuellen Monat (Mo-Fr, ohne bayerische Feiertage), inkl. heute
function elapsedWorkDaysThisMonth(){
  var t=today();
  var year=+t.slice(0,4),month=+t.slice(5,7),todayDate=+t.slice(8,10);
  var feiertage=bayernFeiertage(year);
  var count=0;
  for(var day=1;day<=todayDate;day++){
    var d=new Date(Date.UTC(year,month-1,day));
    var dow=d.getUTCDay();
    if(dow===0||dow===6)continue;
    if(feiertage[d.toISOString().slice(0,10)])continue;
    count++;
  }
  return count;
}
// Team-Ziel (Optimierungen bzw. Margenerhoehung) fuer einen Kalendermonat, gleiche Berechnung
// wie die Zielvereinbarung (Einsatztage x Opt./Tag [x Marge/Opt.]), ueber alle aktiven Mitarbeiter summiert
function teamMonthZiel(liste,mk,withMarge){
  var wMeta=getMonthWeeksZiel(mk);
  var rec=zielStore[mk]||{};
  var vis=liste.filter(function(e){return empActiveInZielMonth(e,mk);});
  var sum=0;
  vis.forEach(function(e){
    var r=rec[e.id]||{};
    var weeks=wMeta.map(function(wm,i){return(r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays;});
    var monthSum=weeks.reduce(function(a,b){return a+b;},0);
    var optTag=r.optTag!=null?r.optTag:0;
    var margeOpt=r.margeOpt!=null?r.margeOpt:0;
    sum+=withMarge?monthSum*optTag*margeOpt:monthSum*optTag;
  });
  return sum;
}
// Taegliche Summenreihe (ueber alle Mitarbeiter in liste) fuer den aktuellen Monat, z.B. fuer Sparklines im Hero-Bereich
// Balkendiagramm fuer den Hero-Bereich: alle Balken gedeckt, nur der letzte (aktuellste) Tag hervorgehoben
function barsHighlightLast(values,color,w,h,labels,fmtFn){
  w=w||110;h=h||34;
  var pairs=(values||[]).map(function(v,i){return {v:v,lbl:labels?labels[i]:null};}).filter(function(p){return p.v!==undefined&&p.v!==null;});
  if(!pairs.length)return '<svg width="'+w+'" height="'+h+'"></svg>';
  var vals=pairs.map(function(p){return p.v;});
  var min=Math.min.apply(null,vals.concat([0])),max=Math.max.apply(null,vals);
  var range=(max-min)||1;
  var n=pairs.length,gap=4,barW=(w-gap*(n-1))/n;
  var fmt=fmtFn||function(v){return Math.round(v).toLocaleString('de-DE');};
  var bars=pairs.map(function(p,i){
    var v=p.v;
    var barH=Math.max(2,(v-min)/range*h);
    var x=i*(barW+gap);
    var y=h-barH;
    var op=(i===n-1)?1:0.35;
    var titleTxt=(p.lbl?fd(p.lbl)+': ':'')+fmt(v);
    return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+barH.toFixed(1)+'" fill="'+color+'" opacity="'+op+'" rx="2"><title>'+esc(titleTxt)+'</title></rect>';
  }).join('');
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+bars+'</svg>';
}
// Sparkline mit gefuellter Flaeche darunter (fuer den Hero-Bereich auf dunklem Hintergrund)
// Marge (Ist) und Ziel fuer die aktuelle Kalenderwoche - gleiche Berechnung wie die Wochenziel-Kacheln in der Zielvereinbarung
// Berechnet fuer einen Mitarbeiterkreis das Wochenziel-Tagekontingent eines bestimmten Monats-Anteils einer KW
function weekTargetPortion(mk,curKw,withMarge,visibleList){
  if(withMarge===undefined)withMarge=true;
  var weeks=getMonthWeeksZiel(mk);
  var wi=-1,wm=null;
  weeks.forEach(function(w,i){if(w.kw===curKw){wm=w;wi=i;}});
  if(!wm)return 0;
  var rec=zielStore[mk]||{};
  var visible=visibleList||employees.filter(function(e){return empActiveInZielMonth(e,mk)&&!e.isPureCoach;});
  var target=0;
  visible.forEach(function(e){
    var r=rec[e.id]||{};
    var days=(r.weeks&&r.weeks[wi]!=null)?r.weeks[wi]:wm.defaultDays;
    var optTag=r.optTag!=null?r.optTag:0;
    var margeOpt=r.margeOpt!=null?r.margeOpt:0;
    target+=withMarge?days*optTag*margeOpt:days*optTag;
  });
  return target;
}
function currentWeekStat(kind,visibleList){
  // kind: 'marge' oder 'opt'
  var withMarge=(kind==='marge');
  var mk=today().slice(0,7);
  var weeks=getMonthWeeksZiel(mk);
  var todayStr=today();
  var curKw=isoWeekNum(new Date(todayStr+'T00:00:00Z'));
  var wi=-1,wm=null;
  weeks.forEach(function(w,i){if(w.kw===curKw){wm=w;wi=i;}});
  if(!wm)return {ist:0,target:0,kw:curKw,from:null,to:null};
  // Sonderfall: die KW kann in den Vormonat (z.B. KW36 Ende August/Anfang September) oder in
  // den Folgemonat hineinreichen. wm.from/wm.to spannen bereits die komplette Mo-Fr-Woche auf,
  // daher ist "ist" (Performance-Daten) automatisch korrekt. Das Wochenziel wird jedoch pro
  // Monat separat in der Zielvereinbarung gepflegt - daher hier die Anteile aus beiden Monaten
  // zusammenzaehlen, falls die Woche ueber eine Monatsgrenze reicht.
  var target=weekTargetPortion(mk,curKw,withMarge,visibleList);
  var fromMk=wm.from.slice(0,7),toMk=wm.to.slice(0,7);
  if(fromMk!==mk)target+=weekTargetPortion(fromMk,curKw,withMarge,visibleList);
  if(toMk!==mk)target+=weekTargetPortion(toMk,curKw,withMarge,visibleList);
  var visible=visibleList||employees.filter(function(e){return empActiveInZielMonth(e,mk)&&!e.isPureCoach;});
  var ist=0;
  visible.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if(!x.date||x.date<wm.from||x.date>wm.to)return;
      ist+=withMarge?(x.margeGesamt||x.margin||0):((x.convOEM||0)+(x.ups_yes||0)+(x.wka_gesamt_yes||0));
    });
  });
  return {ist:ist,target:target,kw:curKw,from:wm.from,to:wm.to};
}
function currentWeekMargin(visibleList){ return currentWeekStat('marge',visibleList); }
// Tagesziel (heute): Summe optTag bzw. optTag*margeOpt ueber alle heute aktiven Mitarbeiter
function todayTargetStat(kind){
  var withMarge=(kind==='marge');
  var mk=today().slice(0,7);
  var t=today();
  var rec=zielStore[mk]||{};
  var visible=employees.filter(function(e){return empActiveInZielMonth(e,mk)&&!e.isPureCoach;});
  var target=0;
  visible.forEach(function(e){
    var r=rec[e.id]||{};
    // Wenn fuer diesen Mitarbeiter/Monat bereits konkrete Arbeitstage hinterlegt sind (Kalender-Auswahl),
    // zaehlt das Tagesziel nur, wenn er laut Kalender heute tatsaechlich arbeitet - sonst (Altbestand
    // ohne Tagesdaten) faellt es wie bisher auf "immer mitzaehlen" zurueck. Neues Format ist ein Objekt
    // {datum:'work'|'urlaub'|'krank'}, altes Format war ein reines Array von Arbeitstagen.
    var at=r.arbeitstage;
    var hatArbeitstage=(Array.isArray(at)&&at.length>0)||(at&&typeof at==='object'&&!Array.isArray(at)&&Object.keys(at).length>0);
    if(hatArbeitstage){
      var arbeitetHeute=Array.isArray(at)?(at.indexOf(t)>=0):(at[t]==='work');
      if(!arbeitetHeute)return;
    }
    var optTag=r.optTag!=null?r.optTag:0;
    var margeOpt=r.margeOpt!=null?r.margeOpt:0;
    target+=withMarge?optTag*margeOpt:optTag;
  });
  return target;
}
function todayActualStat(kind,liste){
  var t=today();
  var sum=0;
  liste.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if(x.date!==t)return;
      sum+=(kind==='marge')?(x.margeGesamt||x.margin||0):((x.convOEM||0)+(x.ups_yes||0)+(x.wka_gesamt_yes||0));
    });
  });
  return sum;
}
function buildMonthBar(liste){
  var mk=today().slice(0,7);
  var sums={convOEM:0,margeOEM:0,ups_yes:0,margeUpsell:0,wka_gesamt_yes:0,margeWKA:0,margeGesamt:0};
  liste.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if((x.date||'').slice(0,7)!==mk)return;
      sums.convOEM+=x.convOEM||0; sums.margeOEM+=x.margeOEM||0;
      sums.ups_yes+=x.ups_yes||0; sums.margeUpsell+=x.margeUpsell||0;
      sums.wka_gesamt_yes+=x.wka_gesamt_yes||0; sums.margeWKA+=x.margeWKA||0;
      sums.margeGesamt+=x.margeGesamt||x.margin||0;
    });
  });
  var gesamtAnzahl=sums.convOEM+sums.ups_yes+sums.wka_gesamt_yes;
  // Ziel Marge/Mon. team-weit fuer den aktuellen Kalendermonat (gleiche Berechnung wie Zielvereinbarung-Jahresverlauf)
  var wMeta=getMonthWeeksZiel(mk);
  var mRec=zielStore[mk]||{};
  var mVisible=liste.filter(function(e){return empActiveInZielMonth(e,mk);});
  var zielMargeSum=0;
  mVisible.forEach(function(e){
    var r=mRec[e.id]||{};
    var weeks=wMeta.map(function(wm,i){return(r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays;});
    var monthSum=weeks.reduce(function(a,b){return a+b;},0);
    var optTag=r.optTag!=null?r.optTag:0;
    var margeOpt=r.margeOpt!=null?r.margeOpt:0;
    zielMargeSum+=monthSum*optTag*margeOpt;
  });
  var eur=function(v){return '€ '+Math.round(v).toLocaleString('de-DE');};
  var monthLabel=MONTH_NAMES_DE[new Date(today()+'T00:00:00Z').getUTCMonth()]+' '+today().slice(0,4);
  return '<div class="month-bar">'
    +'<div class="mb-month"><div class="l">Zeitraum</div><div class="v">'+monthLabel+'</div></div>'
    +'<div class="mb-stat"><div class="l">Conv. OEM</div><div class="row"><span class="n">'+sums.convOEM+'</span><span class="n-unit">Stk.</span></div><div class="m">'+eur(sums.margeOEM)+' Marge</div></div>'
    +'<div class="mb-stat"><div class="l">Upsells</div><div class="row"><span class="n">'+sums.ups_yes+'</span><span class="n-unit">Stk.</span></div><div class="m">'+eur(sums.margeUpsell)+' Marge</div></div>'
    +'<div class="mb-stat"><div class="l">WKA</div><div class="row"><span class="n">'+sums.wka_gesamt_yes+'</span><span class="n-unit">Stk.</span></div><div class="m">'+eur(sums.margeWKA)+' Marge</div></div>'
    +'<div class="mb-stat mb-total"><div class="l">Gesamt</div><div class="row"><span class="n">'+gesamtAnzahl+'</span><span class="n-unit">Stk.</span></div><div class="m">'+eur(sums.margeGesamt)+' Marge</div></div>'
    +'<div class="mb-stat mb-margin"><div class="l">Margenerhöhung</div><div class="row"><span class="n">'+eur(sums.margeGesamt)+'</span></div><div class="m">Ziel: '+eur(zielMargeSum)+'/Mon.</div></div>'
    +'</div>';
}
// Wiederverwendbare Kachel: OEM (Anzahl, Margenerhoehung, Oe EUR/Lead) - identischer Code fuer Slide 2 und Slide 3
function renderOemTileHtml(visible){
  var _mk=today().slice(0,7);
  var count=0,marge=0;
  visible.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if((x.date||'').slice(0,7)!==_mk)return;
      count+=x.convOEM||0;marge+=x.margeOEM||0;
    });
  });
  var proLead=count>0?marge/count:0;
  return '<div><div style="font-size:11px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">OEM</div>'
    +'<div style="font-size:30px;font-weight:700;line-height:1">'+count+' <span style="font-size:15px;font-weight:500;color:#FFEDE6">Stk.</span></div>'
    +'<div style="font-size:11px;color:#E9B2A6;margin-top:4px">Margenerhöhung '+Math.round(marge).toLocaleString('de-DE')+' EUR</div>'
    +'<div style="font-size:11px;color:#E9B2A6">Ø '+Math.round(proLead).toLocaleString('de-DE')+' EUR/Lead</div>'
    +'</div>';
}
// Wiederverwendbare Kachel: Opt. Ges. (Heute) Ist/Ziel/Abweichung - identischer Code fuer Slide 2 und Slide 3
// Slide 1 (Performance) des Banners - wiederverwendbar fuer den globalen Banner UND den
// eigenstaendigen Mitarbeiter-Banner. 'visible' kann das gesamte Team oder ein einzelner
// Mitarbeiter (als Array mit einem Eintrag) sein, 'dotsHtml' ist der jeweilige Karussell-Switcher.
function buildBannerSlide1Html(visible,dotsHtml,marginTop){
  if(marginTop===undefined)marginTop=16; // Banner beginnt bündig mit der Menüleiste (6 px Content-Abstand + 16 px = 22 px)
  var h='';
  var mk=today().slice(0,7);
  var heroSums={optGesamt:0,margeGesamt:0};
  visible.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if((x.date||'').slice(0,7)!==mk)return;
      heroSums.optGesamt+=(x.convOEM||0)+(x.ups_yes||0)+(x.wka_gesamt_yes||0);
      heroSums.margeGesamt+=x.margeGesamt||x.margin||0;
    });
  });
  var elapsedWD=elapsedWorkDaysThisMonth();
  var optProTag=elapsedWD>0?heroSums.optGesamt/elapsedWD:0;
  var margeProTag=elapsedWD>0?heroSums.margeGesamt/elapsedWD:0;
  function lastNWorkdayDates(n){
    var dates=[],feiertageCache={};
    var d=new Date(today()+'T00:00:00Z');
    while(dates.length<n){
      var dow=d.getUTCDay();
      var y=d.getUTCFullYear();
      if(!feiertageCache[y])feiertageCache[y]=bayernFeiertage(y);
      var ds=d.toISOString().slice(0,10);
      if(dow!==0&&dow!==6&&!feiertageCache[y][ds])dates.unshift(ds);
      d.setUTCDate(d.getUTCDate()-1);
    }
    return dates;
  }
  var _last7WD=lastNWorkdayDates(7);
  var _last14WD=lastNWorkdayDates(14);
  function crSumsForDate(dateStr){
    var s={tw:0,yes:0,sy:0,my:0,oem:0,nerrOem:0,ups:0,wka:0,marge:0};
    visible.forEach(function(e){
      (performance[e.id]||[]).forEach(function(x){
        if(x.date!==dateStr)return;
        s.tw+=x.convTW||0; s.yes+=x.convYes||0; s.sy+=x.convSY||0; s.my+=x.convMY||0;
        s.oem+=x.convOEM||0; s.nerrOem+=x.notSuccessful||0;
        s.ups+=x.ups_yes||0; s.wka+=x.wka_gesamt_yes||0; s.marge+=x.margeGesamt||x.margin||0;
      });
    });
    return s;
  }
  var optSeries=_last14WD.map(function(d){var s=crSumsForDate(d);return s.oem+s.ups+s.wka;});
  var margeSeries=_last14WD.map(function(d){return crSumsForDate(d).marge;});
  var eurH=function(v){return '€ '+Math.round(v).toLocaleString('de-DE');};
  var eurUnit=function(v){return Math.round(v).toLocaleString('de-DE')+' <span style="font-size:15px;font-weight:500;color:#FFEDE6">EUR</span>';};
  var optZielMonat=teamMonthZiel(visible,mk,false);
  var margeZielMonat=teamMonthZiel(visible,mk,true);
  function avgOptTagZielvereinbarungLocal(){
    var zmk=today().slice(0,7);
    var zRec=zielStore[zmk]||{};
    var zVisible=visible.filter(function(e){return empActiveInZielMonth(e,zmk);});
    var zVals=[];
    zVisible.forEach(function(e){
      var r=zRec[e.id]||{};
      if(r.optTag!=null)zVals.push(r.optTag);
    });
    return zVals.length?zVals.reduce(function(a,b){return a+b;},0)/zVals.length:null;
  }
  var optOemZiel=avgOptTagZielvereinbarungLocal();

  h+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px;color:#fff;margin-bottom:22px;margin-top:'+marginTop+'px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
  h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);min-height:118px;align-items:center">';
  h+='<div style="grid-column:span 1;padding-left:14px">'
    +'<div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">OPT. GESAMT</div>'
    +'<div style="font-size:30px;font-weight:700;line-height:1">'+heroSums.optGesamt+' <span style="font-size:15px;font-weight:500;color:#FFEDE6">Stk.</span></div>'
    +'<div style="font-size:11px;color:#E9B2A6;margin-top:4px">Ø '+optProTag.toFixed(1)+' Opt./Tag</div>'
    +'<div style="font-size:11px;color:#E9B2A6">Ziel '+Math.round(optZielMonat).toLocaleString('de-DE')+' Stk./Mon.</div>'
    +'</div>'
    +'<div style="grid-column:span 1;display:flex;align-items:center;height:100%;padding:4px 14px">'+barsHighlightLast(optSeries,'#F7B39A',300,34,_last14WD,function(v){return Math.round(v).toLocaleString('de-DE')+' Stk.';})+'</div>';
  var weekMarge=currentWeekMargin(visible);
  var weekElapsedWD=weekMarge.from?elapsedWorkDaysInRange(weekMarge.from,weekMarge.to):0;
  var weekProTag=weekElapsedWD>0?weekMarge.ist/weekElapsedWD:0;
  h+='<div style="grid-column:span 1;padding-left:14px">'
    +'<div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">WOCHE (KW '+weekMarge.kw+')</div>'
    +'<div style="font-size:30px;font-weight:700;line-height:1">'+eurUnit(weekMarge.ist)+'</div>'
    +'<div style="font-size:11px;color:#E9B2A6;margin-top:4px">Ø '+eurH(weekProTag)+'/Arbeitstag</div>'
    +'<div style="font-size:11px;color:#E9B2A6">Ziel '+eurH(weekMarge.target)+'/Woche</div>'
    +'</div>'
    +'<div style="grid-column:span 1;display:flex;align-items:center;height:100%;padding:4px 14px">'+barsHighlightLast(margeSeries,'#F7B39A',300,34,_last14WD,function(v){return '€ '+Math.round(v).toLocaleString('de-DE');})+'</div>';
  var monthLabelHero=MONTH_NAMES_DE[new Date(today()+'T00:00:00Z').getUTCMonth()].toUpperCase();
  h+='<div style="grid-column:span 1;padding-left:14px">'
    +'<div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">'+monthLabelHero+'</div>'
    +'<div style="font-size:30px;font-weight:700;line-height:1">'+eurUnit(heroSums.margeGesamt)+'</div>'
    +'<div style="font-size:11px;color:#E9B2A6;margin-top:4px">Ø '+eurH(margeProTag)+'/Arbeitstag</div>'
    +'<div style="font-size:11px;color:#E9B2A6">Ziel '+eurH(margeZielMonat)+'/Mon.</div>'
    +'</div>'
    +'<div style="grid-column:span 1;display:flex;align-items:center;height:100%;padding:4px 14px">'+barsHighlightLast(margeSeries,'#F7B39A',300,34,_last14WD,function(v){return '€ '+Math.round(v).toLocaleString('de-DE');})+'</div>';
  h+='</div>'; // Ende Hero-Zeile

  h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;min-height:60px;align-items:center">';
  function heroKpiCell(k,cur,prev,spark7K){
    var vR=cur!==null?(k.pct?Math.round(cur):+cur.toFixed(1)):null;
    var hit=cur!==null&&k.target!==null&&(k.dir==='lte'?cur<=k.target:cur>=k.target);
    var colLight=cur===null?'#FFE1D6':(k.target!==null?(hit?'#fff':'#fff'):'#fff');
    var trend=(cur!==null&&prev!==null)?cur-prev:null;
    var trendArrow=trend===null?'':(trend>0.5?'\u2191':trend<-0.5?'\u2193':'\u2192');
    var targetTxt=k.target!==null?('Ziel '+(k.dir==='gte'?'\u2265':'\u2264')+k.target+(k.pct?'%':'')):(k.fallbackLabel||'Team-Durchschnitt');
    return '<div style="padding:4px 14px;position:relative">'
      +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">'+k.label.toUpperCase()+'</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">'
      +'<div style="font-size:19px;font-weight:700;color:'+colLight+'">'+(vR!==null?vR+(k.pct?'%':''):'\u2014')+' '+trendArrow+'</div>'
      +sparkline(spark7K,colLight,90,18)
      +'</div>'
      +'<div style="font-size:10px;color:#E9B2A6;margin-top:3px">Vormonat '+(prev!==null?Math.round(prev)+(k.pct?'%':''):'\u2014')+' \u00b7 '+targetTxt+'</div>'
      +'</div>';
  }
    function teamMonthAvg(key,monthsAgo){
      var ym=monthBoundsUTC(today(),monthsAgo).ym;
      var vals=[];
      visible.forEach(function(e){
        (performance[e.id]||[]).forEach(function(x){
          if(x.date.slice(0,7)===ym&&x[key]!==undefined&&x[key]!==null)vals.push(x[key]);
        });
      });
      return vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:null;
    }
    function crSumsForMonth(ym){
      var s={tw:0,yes:0,sy:0,my:0,oem:0,nerrOem:0};
      visible.forEach(function(e){
        (performance[e.id]||[]).forEach(function(x){
          if(x.date.slice(0,7)!==ym)return;
          s.tw+=x.convTW||0; s.yes+=x.convYes||0; s.sy+=x.convSY||0; s.my+=x.convMY||0;
          s.oem+=x.convOEM||0; s.nerrOem+=x.notSuccessful||0;
        });
      });
      return s;
    }
    function crFromSums(kind,s){
      var denomOEM=s.oem+s.nerrOem, denomRest=s.yes+s.sy+s.my;
      if(kind==='crOEM')return denomOEM>0?s.oem/denomOEM*100:null;
      if(kind==='crTeilweise')return (s.tw+denomRest)>0?s.tw/(s.tw+denomRest)*100:null;
      if(kind==='crSyMy')return denomRest>0?(s.sy+s.my)/denomRest*100:null;
      if(kind==='crSuperYes')return denomRest>0?s.sy/denomRest*100:null;
      if(kind==='crMegaYes')return denomRest>0?s.my/denomRest*100:null;
      return null;
    }
    function teamMonthCR(kind,monthsAgo){
      var ym=monthBoundsUTC(today(),monthsAgo).ym;
      return crFromSums(kind,crSumsForMonth(ym));
    }
    function weightedCRSeries(kind){
      return _last7WD.map(function(d){return crFromSums(kind,crSumsForDate(d));}).filter(function(v){return v!==null;});
    }
    function teamSumSeries(sumFn){
      return _last7WD.map(function(d){return sumFn(crSumsForDate(d));});
    }
    var kpisAll=[
      {label:'CR OEM', key:'crOEM',      target:CR_GOOD, dir:'gte', pct:true, cr:true},
      {label:'CR TW',  key:'crTeilweise', target:KPI_TARGETS.crTeilweise.val, dir:KPI_TARGETS.crTeilweise.dir, pct:true, cr:true},
      {label:'CR SY/MY',key:'crSyMy',     target:KPI_TARGETS.crSyMy?KPI_TARGETS.crSyMy.val:null, dir:KPI_TARGETS.crSyMy?KPI_TARGETS.crSyMy.dir:'gte', pct:true, cr:true},
      {label:'CR SY',  key:'crSuperYes',  target:KPI_TARGETS.crSuperYes.val,  dir:KPI_TARGETS.crSuperYes.dir,  pct:true, cr:true},
      {label:'CR MY',  key:'crMegaYes',   target:KPI_TARGETS.crMegaYes.val,   dir:KPI_TARGETS.crMegaYes.dir,   pct:true, cr:true},
      {label:'Opt. OEM',key:'convOEM',   target:optOemZiel!=null?Math.round(optOemZiel*10)/10:null, dir:'gte', pct:false},
    ];
    kpisAll.forEach(function(k){
      var cur=k.cr?teamMonthCR(k.key,0):teamMonthAvg(k.key,0);
      var prev=k.cr?teamMonthCR(k.key,1):teamMonthAvg(k.key,1);
      var spark=k.cr?weightedCRSeries(k.key):teamSumSeries(function(s){return s.oem+s.ups+s.wka;});
      h+=heroKpiCell(k,cur,prev,spark);
    });
  h+='</div>'; // Ende KPI-Zeile
  h+='<div style="display:flex;justify-content:center;gap:8px;position:absolute;bottom:16px;left:0;right:0">'+dotsHtml+'</div>';
  h+='</div>'; // Ende Hero-Panel
  return h;
}
function buildGlobalBannerHtml(visible){return '<div id="gBan">'+buildGlobalBannerInner(visible)+'</div>';}
function buildGlobalBannerInner(visible){
  ensureBannerRotation();
  var _bm=bannerViewMode||'overview';
  if(_bm==='kalender'){if(!KAL.cur)KAL.cur=kalRef();_kalOnIdx=null;return kalBanner();}
  if(_bm==='aufgaben')return aufgBannerHtml(aufgAll());
  if(_bm==='telefonate')return telBannerHtml();
  function avgOptTagZielvereinbarungLocal(){
    var zmk=today().slice(0,7);
    var zRec=zielStore[zmk]||{};
    var zVisible=visible.filter(function(e){return empActiveInZielMonth(e,zmk);});
    var zVals=[];
    zVisible.forEach(function(e){
      var r=zRec[e.id]||{};
      if(r.optTag!=null)zVals.push(r.optTag);
    });
    return zVals.length?zVals.reduce(function(a,b){return a+b;},0)/zVals.length:null;
  }
  var optOemZiel=avgOptTagZielvereinbarungLocal();
  var h='';
  var _bvMode=bannerViewMode||'overview';
  if(_bvMode==='ziel'){
    var yr=today().slice(0,4);
    var MONTH_SHORT_DE=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    var zielNlArr=[],zielMargeArr=[],erzieltArr=[];
    function barTile(label,ist,ziel,big){
      var pct=ziel>0?Math.min(100,Math.round(ist/ziel*100)):(ist>0?100:0);
      var diff=ist-ziel;
      var diffTxt=(diff>=0?'+':'')+Math.round(diff).toLocaleString('de-DE')+' €';
      var barCol='#fff'; // im Banner immer weiss; ueber/unter Ziel zeigt der Text
      var diffPill='<span style="display:inline-block;background:'+(diff>=0?'rgba(255,255,255,0.22)':'rgba(0,0,0,0.22)')+';color:#fff;font-weight:600;padding:0 6px;border-radius:5px">'+(diff>=0?'▲ ':'▼ ')+diffTxt+'</span>';
      var fs=big?30:18;
      return '<div style="padding:4px 14px;width:100%">'
        +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:6px">'+label.toUpperCase()+'</div>'
        +'<div style="font-size:'+fs+'px;font-weight:700;line-height:1;margin-bottom:5px">'+Math.round(ist).toLocaleString('de-DE')+' <span style="font-size:'+(big?15:11)+'px;font-weight:500;color:#FFEDE6">€</span></div>'
        +'<div style="height:9px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.15);border-radius:5px;position:relative;overflow:visible">'
        +'<div style="height:100%;border-radius:5px;width:'+pct+'%;background:'+barCol+'"></div>'
        +'<div style="position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff;left:100%"></div>'
        +'</div>'
        +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:5px">Ziel '+Math.round(ziel).toLocaleString('de-DE')+' € · '+diffPill+' '+(diff>=0?'über':'unter')+' Ziel</div>'
        +'</div>';
    }
    for(var m=1;m<=12;m++){
      var zmk2=yr+'-'+(m<10?'0'+m:m);
      var wMeta2=getMonthWeeksZiel(zmk2);
      var mRec2=zielStore[zmk2]||{};
      var mVisible2=visible.filter(function(e){return empActiveInZielMonth(e,zmk2);});
      var mTargetSum2=0;
      mVisible2.forEach(function(e){
        var r=mRec2[e.id]||{};
        var weeks2=wMeta2.map(function(wm,i){return(r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays;});
        var monthSum2=weeks2.reduce(function(a,b){return a+b;},0);
        var optTag2=r.optTag!=null?r.optTag:0;
        var margeOpt2=r.margeOpt!=null?r.margeOpt:0;
        mTargetSum2+=monthSum2*optTag2*margeOpt2;
      });
      var erzieltSum2=0,hasData2=false;
      mVisible2.forEach(function(e){
        (performance[e.id]||[]).forEach(function(x){
          if((x.date||'').slice(0,7)!==zmk2)return;
          erzieltSum2+=x.margeGesamt||x.margin||0; hasData2=true;
        });
      });
      zielNlArr.push(zielNlTargets[zmk2]!=null?zielNlTargets[zmk2]:0);
      zielMargeArr.push(Math.round(mTargetSum2));
      erzieltArr.push(hasData2?Math.round(erzieltSum2):null);
    }
    var maxV2=Math.max.apply(null,zielNlArr.concat(zielMargeArr).concat(erzieltArr.filter(function(v){return v!=null;})).concat([1]));
    var CH2=195;
    function pct2(v){return v==null?0:Math.max(v>0?2:0,Math.round(v/maxV2*100));}
    var curMonthIdx=+today().slice(5,7)-1;
    var istMargeMon=erzieltArr[curMonthIdx]!=null?erzieltArr[curMonthIdx]:0;
    var zielNlMon=zielNlArr[curMonthIdx]||0;
    var ovMkZiel=yr+'-'+today().slice(5,7);
    var margeMonatIst=0;
    visible.forEach(function(e){
      (performance[e.id]||[]).forEach(function(x){
        if((x.date||'').slice(0,7)!==ovMkZiel)return;
        margeMonatIst+=x.margeGesamt||x.margin||0;
      });
    });
    var margeMonatZiel=teamMonthZiel(visible,ovMkZiel,true);
    h+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px 10px;color:#fff;margin-bottom:22px;margin-top:16px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
    h+='<div style="display:flex;height:'+CH2+'px">';
    h+='<div style="width:16.6667%;flex-shrink:0;display:flex;flex-direction:column">';
    h+='<div style="min-height:118px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);display:flex;align-items:center">'
      +barTile('Ist Marge/Mon.',istMargeMon,zielNlMon,true)
      +'</div>';
    h+='<div style="min-height:60px;display:flex;align-items:center">'
      +barTile('Margenerhöhung (Monat)',margeMonatIst,margeMonatZiel,false)
      +'</div>';
    h+='</div>'; // Ende linke Spalte
    h+='<div style="flex:1;display:flex;align-items:flex-end;gap:10px;padding:0 4px 0 18px">';
    for(var i=0;i<12;i++){
      var pctNl2=pct2(zielNlArr[i]),pctZiel2=pct2(zielMargeArr[i]),pctErz2=erzieltArr[i]!=null?pct2(erzieltArr[i]):null;
      var tipTxt2='Ziel NL Marge/Mon.: €'+zielNlArr[i].toLocaleString('de-DE')
        +'\nZiel DE Marge/Mon.: €'+zielMargeArr[i].toLocaleString('de-DE')
        +'\nErzielte Marge: '+(erzieltArr[i]!=null?'€'+erzieltArr[i].toLocaleString('de-DE'):'—');
      h+='<div style="flex:1;position:relative;height:'+CH2+'px;display:flex;align-items:flex-end;justify-content:center;cursor:default" title="'+tipTxt2+'">'
        +'<div style="position:absolute;left:8px;right:8px;bottom:'+pctNl2+'%;border-top:2px dashed #fff;z-index:2;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.25))"></div>'
        +'<div style="display:flex;align-items:flex-end;gap:4px;height:100%">'
        +'<div style="width:24px;height:'+pctZiel2+'%;background:rgba(255,255,255,0.2);border-radius:3px 3px 0 0"></div>'
        +(pctErz2!=null?'<div style="width:24px;height:'+pctErz2+'%;background:'+(i===parseInt(today().slice(5,7),10)-1?'#fff':'rgba(255,255,255,0.45)')+';border-radius:3px 3px 0 0"></div>':'<div style="width:24px"></div>')
        +'</div>'
        +'</div>';
    }
    h+='</div>';
    h+='</div>'; // Ende Flex-Zeile (linke Spalte + Diagramm)
    h+='<div style="display:flex;margin-top:8px">';
    h+='<div style="width:16.6667%;flex-shrink:0"></div>';
    h+='<div style="flex:1;display:flex;gap:10px;padding:0 4px 0 18px">';
    for(var i=0;i<12;i++){h+='<div style="flex:1;text-align:center;font-size:10px;color:#E9B2A6">'+MONTH_SHORT_DE[i]+'</div>';}
    h+='</div>';
    h+='</div>';
    h+='<div style="display:flex;justify-content:center;gap:8px;position:absolute;bottom:16px;left:0;right:0">'
    +bannerDots('ziel')
      +'</div>';
    h+='</div>';
    return h;
  }
  if(_bvMode==='coaching'){
    var _heute=today();
    var _coachDays=[];
    var _allSess=[];
    employees.forEach(function(e){
      (protocols[e.id]||[]).forEach(function(p){_allSess.push({d:p.date,s:p.status||'abgeschlossen'});});
    });
    for(var _i=-45;_i<=45;_i++){
      var _ds=addDaysUTC(_heute,_i);
      var _cnt=_i>0
        ?_allSess.filter(function(x){return x.d===_ds&&x.s==='geplant';}).length
        :_allSess.filter(function(x){return x.d===_ds&&x.s!=='geplant';}).length;
      _coachDays.push(_cnt);
    }
    var _maxN=Math.max.apply(null,_coachDays.concat([1]));
    var _CW=900,_CHh=195,_nD=_coachDays.length,_hIdx=45;
    function _xP(idx){return Math.round(idx/(_nD-1)*_CW);}
    function _yP(n){return _CHh-Math.round(n/_maxN*_CHh);}
    // Weiche Bezier-Kurve statt eckiger Linie (gleiche Technik wie beim Performance-Diagramm)
    // Aufgeteilt in Vergangenheit (durchgezogen, bis inkl. Heute) und Zukunft (gestrichelt)
    function _buildSmoothPath(vals,startIdx,endIdx){
      var p='M '+_xP(startIdx)+' '+_yP(vals[startIdx]);
      for(var i=startIdx+1;i<=endIdx;i++){
        var px=_xP(i-1),py=_yP(vals[i-1]),cx=_xP(i),cy=_yP(vals[i]),mx=px+(cx-px)*0.5;
        p+=' C '+mx+' '+py+','+mx+' '+cy+','+cx+' '+cy;
      }
      return p;
    }
    var _pastPath=_buildSmoothPath(_coachDays,0,_hIdx);
    var _futurePath=_buildSmoothPath(_coachDays,_hIdx,_nD-1);
    var _linePath=_buildSmoothPath(_coachDays,0,_nD-1);
    var _areaPath=_linePath+' L '+_xP(_nD-1)+' '+_CHh+' L '+_xP(0)+' '+_CHh+' Z';
    var _hX=_xP(_hIdx);
    var _curMk=today().slice(0,7);
    var _sessionsMonat=_allSess.filter(function(x){return x.s!=='geplant'&&(x.d||'').slice(0,7)===_curMk;}).length;
    var _sessionsZiel=visible.length; // Annahme: 1 Session pro aktivem Mitarbeiter/Monat
    var _sessTagePro=[];
    visible.forEach(function(e){
      var last=(protocols[e.id]||[]).filter(function(p){return (p.status||'abgeschlossen')!=='geplant';}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
      if(last)_sessTagePro.push(Math.round((new Date(_heute+'T00:00:00Z')-new Date(last.date+'T00:00:00Z'))/86400000));
    });
    var _oeTageSeitLetzter=_sessTagePro.length?(_sessTagePro.reduce(function(a,b){return a+b;},0)/_sessTagePro.length):null;
    var _sessPct=_sessionsZiel>0?Math.min(100,Math.round(_sessionsMonat/_sessionsZiel*100)):0;
    var _sessDiff=_sessionsMonat-_sessionsZiel;
    var _sessBarCol='#fff';
    h+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px 10px;color:#fff;margin-bottom:22px;margin-top:16px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
    h+='<div style="display:flex;height:195px">';
    h+='<div style="width:16.6667%;flex-shrink:0;display:flex;flex-direction:column">';
    h+='<div style="min-height:118px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);display:flex;align-items:center">'
      +'<div style="padding:4px 14px;width:100%">'
      +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:6px">SESSIONS (MONAT)</div>'
      +'<div style="font-size:30px;font-weight:700;line-height:1;margin-bottom:5px">'+_sessionsMonat+' <span style="font-size:15px;font-weight:500;color:#FFEDE6">/ '+_sessionsZiel+'</span></div>'
      +'<div style="height:9px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.15);border-radius:5px;position:relative;overflow:visible">'
      +'<div style="height:100%;border-radius:5px;width:'+_sessPct+'%;background:'+_sessBarCol+'"></div>'
      +'<div style="position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff;left:100%"></div>'
      +'</div>'
      +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:5px">Ziel: <span style="color:'+_sessBarCol+';font-weight:600">'+(_sessDiff>=0?'+':'')+_sessDiff+'</span> '+(_sessDiff>=0?'über':'unter')+' Ziel</div>'
      +'</div>'
      +'</div>';
    h+='<div style="min-height:60px;display:flex;align-items:center">'
      +'<div style="padding:4px 14px;width:100%">'
      +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">Ø TAGE SEIT LETZTER SESSION</div>'
      +'<div style="font-size:18px;font-weight:700;margin-top:4px">'+(_oeTageSeitLetzter!=null?_oeTageSeitLetzter.toFixed(1):'—')+' <span style="font-size:11px;font-weight:400;color:#FFE1D6">Tage</span></div>'
      +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:3px">Team-Durchschnitt über alle Mitarbeiter</div>'
      +'</div>'
      +'</div>';
    h+='</div>';

    // Wochenbalken mit Wochenziel: 7 Vorwochen, aktuelle Woche, 4 Folgewochen (geplant als Umriss)
    (function(){
      var d0=new Date(_heute+'T00:00:00Z'), dow=(d0.getUTCDay()+6)%7, mon=addDaysUTC(_heute,-dow);
      var wks=[];
      for(var w=-7;w<=4;w++){
        var ws=addDaysUTC(mon,7*w), we=addDaysUTC(ws,6);
        var done=_allSess.filter(function(x){return x.d>=ws&&x.d<=we&&x.s!=='geplant';}).length;
        var plan=_allSess.filter(function(x){return x.d>=ws&&x.d<=we&&x.s==='geplant'&&x.d>=_heute;}).length;
        wks.push({kw:isoWeekNum(new Date(ws+'T00:00:00Z')),done:done,plan:plan,cur:w===0,fut:w>0});
      }
      var wkZiel=Math.round((_sessionsZiel*12/52)*10)/10;
      var mx=Math.max(wkZiel,1);wks.forEach(function(x){mx=Math.max(mx,x.fut?x.plan:x.done);});mx=mx*1.15;
      var BH=140;
      var g='<div style="flex:1;padding:0 4px 0 18px;position:relative;height:195px;display:flex;flex-direction:column;justify-content:flex-end">'
        +'<div style="position:relative;height:'+(BH+22)+'px;display:flex;align-items:flex-end;gap:10px">';
      if(wkZiel>0)g+='<div style="position:absolute;left:0;right:0;bottom:'+Math.round(wkZiel/mx*BH)+'px;border-top:1.5px dashed rgba(255,255,255,0.85);z-index:1"><span style="position:absolute;right:0;top:-18px;font-size:11px;font-weight:600;color:#fff">Wochenziel '+wkZiel.toLocaleString('de-DE')+'</span></div>';
      wks.forEach(function(x){
        var v=x.fut?x.plan:x.done, hpx=Math.max(3,Math.round(v/mx*BH));
        var bar=x.fut
          ?'<div style="width:56%;max-width:46px;height:'+hpx+'px;border-radius:4px;background:rgba(255,255,255,0.08);border:1.5px dashed rgba(255,255,255,0.7)"></div>'
          :'<div style="width:56%;max-width:46px;height:'+hpx+'px;border-radius:4px;background:'+(x.cur?'#fff':'rgba(255,255,255,0.42)')+'"></div>';
        g+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="KW '+x.kw+': '+(x.fut?v+' geplant':v+' Sessions'+(x.cur&&x.plan?' · '+x.plan+' noch geplant':''))+'">'
          +'<div style="font-size:13px;font-weight:'+(x.cur?700:500)+';color:#fff;margin-bottom:4px">'+v+'</div>'+bar+'</div>';
      });
      g+='</div><div style="display:flex;gap:10px;margin-top:6px">';
      wks.forEach(function(x){g+='<div style="flex:1;text-align:center;font-size:11px;font-weight:'+(x.cur?700:500)+';color:'+(x.cur?'#fff':'rgba(255,255,255,0.8)')+';white-space:nowrap">KW '+x.kw+(x.fut?' · geplant':'')+'</div>';});
      g+='</div></div>';
      h+=g;
    })();
    h+='</div>';
    h+='<div style="display:flex;justify-content:center;gap:8px;position:absolute;bottom:16px;left:0;right:0">'
    +bannerDots('coaching')
      +'</div>';
    h+='</div>';
    return h;
  }
  if(_bvMode==='activity'){
    var _actHeute=today();
    var _actAuditAsActivity=(typeof adminAuditLog!=='undefined'?(adminAuditLog||[]):[]).map(function(a){return {createdAt:a.changedAt};});
    var _actCombined=(typeof activityLog!=='undefined'?(activityLog||[]):[]).filter(function(a){return a.category!=='login';}).concat(_actAuditAsActivity);
    var _actByDate={};
    _actCombined.forEach(function(a){var d=(a.createdAt||'').slice(0,10);if(d)_actByDate[d]=(_actByDate[d]||0)+1;});
    var _actDays=[];
    for(var _ai=29;_ai>=0;_ai--){
      var _ads=addDaysUTC(_actHeute,-_ai);
      _actDays.push(_actByDate[_ads]||0);
    }
    var _actMax=Math.max.apply(null,_actDays.concat([1]));
    var _act30Sum=_actDays.reduce(function(a,b){return a+b;},0);
    var _actPrev30Sum=0;
    for(var _pi=59;_pi>=30;_pi--){
      var _pds=addDaysUTC(_actHeute,-_pi);
      _actPrev30Sum+=_actByDate[_pds]||0;
    }
    var _actTrendPct=_actPrev30Sum>0?Math.round((_act30Sum-_actPrev30Sum)/_actPrev30Sum*100):null;
    var _actTrendArrow=_actTrendPct===null?'':(_actTrendPct>0?' ↑':_actTrendPct<0?' ↓':'');
    var _actTrendCol='#fff';
    var _actAvgPerDay=(_act30Sum/30).toFixed(1);
    h+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px 10px;color:#fff;margin-bottom:22px;margin-top:16px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
    h+='<div style="display:flex;height:195px">';
    h+='<div style="width:16.6667%;flex-shrink:0;display:flex;flex-direction:column">';
    h+='<div style="min-height:118px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);display:flex;align-items:center">'
      +'<div style="padding:4px 14px;width:100%">'
      +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:6px">AKTIVITÄTEN (30 TAGE)</div>'
      +'<div style="font-size:30px;font-weight:700;line-height:1">'+_act30Sum+' <span style="font-size:15px;font-weight:700;color:'+_actTrendCol+'">'+_actTrendArrow+'</span></div>'
      +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:5px">vs. Vormonat ('+_actPrev30Sum+')'+(_actTrendPct!==null?': <span style="color:'+_actTrendCol+';font-weight:600">'+(_actTrendPct>=0?'+':'')+_actTrendPct+'%</span>':'')+'</div>'
      +'</div>'
      +'</div>';
    h+='<div style="min-height:60px;display:flex;align-items:center">'
      +'<div style="padding:4px 14px;width:100%">'
      +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">Ø AKTIVITÄTEN/TAG</div>'
      +'<div style="font-size:18px;font-weight:700;margin-top:4px">'+_actAvgPerDay+'</div>'
      +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:3px">Ø der letzten 30 Tage</div>'
      +'</div>'
      +'</div>';
    h+='</div>';
    h+='<div style="flex:1;padding:0 4px 0 18px;display:flex;align-items:flex-end;gap:3px;height:195px">';
    _actDays.forEach(function(n,ix){
      var pct=Math.max(2,Math.round(n/_actMax*100));
      var bcol=ix===_actDays.length-1?'#fff':'rgba(255,255,255,0.42)'; // letzter Tag kraeftig weiss
      h+='<div style="flex:1;height:100%;display:flex;align-items:flex-end"><div style="width:100%;height:'+pct+'%;background:'+bcol+';border-radius:2px 2px 0 0" title="'+n+' Aktivitäten"></div></div>';
    });
    h+='</div>';
    h+='</div>';
    h+='<div style="display:flex;justify-content:center;gap:8px;position:absolute;bottom:16px;left:0;right:0">'
    +bannerDots('activity')
      +'</div>';
    h+='</div>';
    return h;
  }
  if(_bvMode==='performance'){
  h+=buildBannerSlide1Html(visible,
    bannerDots('performance')
  );
  } else {
  // ── NEUE, eigenstaendige Overview-Hero-Panel-Version (gleiche Optik wie Performance, andere Kennzahlen) ──
  var ovMk=today().slice(0,7);
  function ovMonthSums(kind){
    // kind: 'oem' | 'ups' | 'wka'
    var count=0,marge=0;
    visible.forEach(function(e){
      (performance[e.id]||[]).forEach(function(x){
        if((x.date||'').slice(0,7)!==ovMk)return;
        if(kind==='oem'){count+=x.convOEM||0;marge+=x.margeOEM||0;}
        else if(kind==='ups'){count+=x.ups_yes||0;marge+=x.margeUpsell||0;}
        else if(kind==='wka'){count+=x.wka_gesamt_yes||0;marge+=x.margeWKA||0;}
      });
    });
    return {count:count,marge:marge};
  }
  function ovLastNWorkdayDates(n){
    var dates=[],feiertageCache={};
    var d=new Date(today()+'T00:00:00Z');
    while(dates.length<n){
      var dow=d.getUTCDay();
      var y=d.getUTCFullYear();
      if(!feiertageCache[y])feiertageCache[y]=bayernFeiertage(y);
      var ds=d.toISOString().slice(0,10);
      if(dow!==0&&dow!==6&&!feiertageCache[y][ds])dates.unshift(ds);
      d.setUTCDate(d.getUTCDate()-1);
    }
    return dates;
  }
  var ovLast14WD=ovLastNWorkdayDates(14);
  var ovLast7WD=ovLastNWorkdayDates(7);
  function ovCountsForDate(dateStr,kind){
    var count=0;
    visible.forEach(function(e){
      (performance[e.id]||[]).forEach(function(x){
        if(x.date!==dateStr)return;
        if(kind==='oem')count+=x.convOEM||0;
        else if(kind==='ups')count+=x.ups_yes||0;
        else if(kind==='wka')count+=x.wka_gesamt_yes||0;
      });
    });
    return count;
  }
  h+='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px;color:#fff;margin-bottom:22px;margin-top:16px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
  h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);min-height:118px;align-items:center">';
  h+='<div style="grid-column:span 1;padding-left:14px">'+renderOemTileHtml(visible)+'</div>'
    +'<div style="grid-column:span 1;display:flex;align-items:center;height:100%;padding:4px 14px">'+barsHighlightLast(ovLast14WD.map(function(d){return ovCountsForDate(d,'oem');}),'#F7B39A',300,34,ovLast14WD,function(v){return Math.round(v).toLocaleString('de-DE')+' Stk.';})+'</div>';
  [['ups','UPSELLS'],['wka','WKA']].forEach(function(kk){
    var kind=kk[0],label=kk[1];
    var s=ovMonthSums(kind);
    var proLead=s.count>0?s.marge/s.count:0;
    var series=ovLast14WD.map(function(d){return ovCountsForDate(d,kind);});
    h+='<div style="grid-column:span 1;padding-left:14px">'
      +'<div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">'+label+'</div>'
      +'<div style="font-size:30px;font-weight:700;line-height:1">'+s.count+' <span style="font-size:15px;font-weight:500;color:#FFEDE6">Stk.</span></div>'
      +'<div style="font-size:11px;color:#E9B2A6;margin-top:4px">Margenerhöhung '+Math.round(s.marge).toLocaleString('de-DE')+' EUR</div>'
      +'<div style="font-size:11px;color:#E9B2A6">Ø '+Math.round(proLead).toLocaleString('de-DE')+' EUR/Lead</div>'
      +'</div>'
      +'<div style="grid-column:span 1;display:flex;align-items:center;height:100%;padding:4px 14px">'+barsHighlightLast(series,'#F7B39A',300,34,ovLast14WD,function(v){return Math.round(v).toLocaleString('de-DE')+' Stk.';})+'</div>';
  });
  h+='</div>'; // Ende Hero-Zeile

  var ovOptGesamtNeu=0, ovMargeGesamtNeu=0;
  visible.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if((x.date||'').slice(0,7)!==ovMk)return;
      ovOptGesamtNeu+=(x.convOEM||0)+(x.ups_yes||0)+(x.wka_gesamt_yes||0);
      ovMargeGesamtNeu+=x.margeGesamt||x.margin||0;
    });
  });
  var ovOptZielMonatNeu=teamMonthZiel(visible,ovMk,false);
  var ovMargeZielMonatNeu=teamMonthZiel(visible,ovMk,true);
  h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;min-height:60px;align-items:center">';
  // Ring-Kachel: Ist/Ziel als Donut-Ring, optional mit weissem "Soll heute"-Strich (Woche/Monat)
  function ovRingTile(label,ist,ziel,sollFrac,unitSuffix,fmtFn){
    var fmt=fmtFn||function(v){return Math.round(v).toLocaleString('de-DE');};
    var pct=ziel>0?ist/ziel:(ist>0?1:0);
    var pctShown=Math.round(pct*100);
    var circumference=94.2;
    var offset=circumference*(1-Math.min(pct,1));
    var color=(ziel>0&&pct>=1)?'#F7B39A':(ziel>0&&pct<1&&sollFrac!=null&&pct<sollFrac?'#fff':'#F7B39A');
    var diff=ist-(ziel*(sollFrac!=null?sollFrac:1));
    var diffTxt=(diff>=0?'+':'')+fmt(diff);
    var restTxt=fmt(Math.max(0,ziel-ist));
    var sollMarker='';
    if(sollFrac!=null){
      var angle=230+sollFrac*360*0.766; // grober Bogenversatz passend zur dasharray-Geometrie (siehe Entwurf)
      sollMarker='<line x1="19" y1="4" x2="19" y2="7.5" stroke="#fff" stroke-width="1.6" transform="rotate('+(sollFrac*288)+' 19 19)"/>';
    }
    return '<div style="padding:4px 14px;display:flex;justify-content:space-between;align-items:center">'
      +'<div>'
      +'<div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">'+label.toUpperCase()+'</div>'
      +'<div style="font-size:18px;font-weight:700;margin-top:4px">'+fmt(ist)+' <span style="font-size:10.5px;font-weight:400;color:#FFE1D6">/ '+fmt(ziel)+(unitSuffix?' '+unitSuffix:'')+'</span></div>'
      +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:3px">'+(sollFrac!=null?('Abw. <span style="color:'+(diff<0?'#fff':'#F7B39A')+';font-weight:600">'+diffTxt+'</span> · Rest '+restTxt):('Abw. <span style="color:'+(diff<0?'#fff':'#F7B39A')+';font-weight:600">'+diffTxt+'</span>'))+'</div>'
      +'</div>'
      +'<svg width="38" height="38" viewBox="0 0 38 38" style="flex-shrink:0">'
      +'<circle cx="19" cy="19" r="15" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="5"/>'
      +'<circle cx="19" cy="19" r="15" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+circumference+'" stroke-dashoffset="'+offset.toFixed(1)+'" transform="rotate(-90 19 19)"/>'
      +sollMarker
      +'</svg>'
      +'</div>';
  }
  var todayWD=elapsedWorkDaysInRange(today(),today())>0; // ist heute ein Arbeitstag?
  var optHeuteIst=todayActualStat('opt',visible), optHeuteZiel=todayTargetStat('opt');
  var margeHeuteIst=todayActualStat('marge',visible), margeHeuteZiel=todayTargetStat('marge');
  h+=ovRingTile('Opt. Ges. (Heute)',optHeuteIst,optHeuteZiel,null,'Stk.');
  h+=ovRingTile('Margenerhöhung (Heute)',margeHeuteIst,margeHeuteZiel,null,'€',function(v){return Math.round(v).toLocaleString('de-DE');});
  var woOpt=currentWeekStat('opt'), woMarge=currentWeekStat('marge');
  var woElapsedWD=woOpt.from?elapsedWorkDaysInRange(woOpt.from,today()):0;
  var woTotalWD=woOpt.from?elapsedWorkDaysInRange(woOpt.from,woOpt.to):1;
  var woSollFrac=woTotalWD>0?woElapsedWD/woTotalWD:null;
  h+=ovRingTile('Opt. Ges. (Woche)',woOpt.ist,woOpt.target,woSollFrac,'Stk.');
  h+=ovRingTile('Margenerhöhung (Woche)',woMarge.ist,woMarge.target,woSollFrac,'€');
  var moElapsedWD=elapsedWorkDaysThisMonth();
  var moTotalWD=elapsedWorkDaysInRange(ovMk+'-01',monthBoundsUTC(today(),0).to);
  var moSollFrac=moTotalWD>0?moElapsedWD/moTotalWD:null;
  h+=ovRingTile('Opt. Ges. (Monat)',ovOptGesamtNeu,ovOptZielMonatNeu,moSollFrac,'Stk.');
  h+=ovRingTile('Margenerhöhung (Monat)',ovMargeGesamtNeu,ovMargeZielMonatNeu,moSollFrac,'€');
  h+='</div>'; // Ende KPI-Zeile
  h+='<div style="display:flex;justify-content:center;gap:8px;position:absolute;bottom:16px;left:0;right:0">'
    +bannerDots('overview')
    +'</div>';
  h+='</div>'; // Ende Hero-Panel
  } // Ende else (Overview)
  return h;

}

// ── SFP Wiegand > Overview: 5 Kacheln + Performance-Tabelle für einen wählbaren Mitarbeiter ──
function showInfoTooltip(ev,title){
  var el=document.getElementById('crBreakdownTooltip');
  if(!el){
    el=document.createElement('div');
    el.id='crBreakdownTooltip';
    el.style.cssText='position:fixed;z-index:99999;background:#1d1c1a;color:#fff;border-radius:8px;padding:10px 14px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,0.25);pointer-events:none;white-space:nowrap;line-height:1.7';
    document.body.appendChild(el);
  }
  var body='';
  for(var i=2;i<arguments.length;i+=2){
    body+='<div><span style="color:#FFEDE6">'+arguments[i]+':</span> <b>'+arguments[i+1]+'</b></div>';
  }
  el.innerHTML='<div style="font-weight:700;margin-bottom:4px;color:#FFE1D6;font-size:10.5px;letter-spacing:.03em;text-transform:uppercase">'+title+'</div>'+body;
  el.style.display='block';
  positionCrTooltip(ev);
}
function showBreakdownTooltip(ev,title,v1,v2,v3){
  var el=document.getElementById('crBreakdownTooltip');
  if(!el){
    el=document.createElement('div');
    el.id='crBreakdownTooltip';
    el.style.cssText='position:fixed;z-index:99999;background:#1d1c1a;color:#fff;border-radius:8px;padding:10px 14px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,0.25);pointer-events:none;white-space:nowrap;line-height:1.7';
    document.body.appendChild(el);
  }
  el.innerHTML='<div style="font-weight:700;margin-bottom:4px;color:#FFE1D6;font-size:10.5px;letter-spacing:.03em;text-transform:uppercase">'+title+'</div>'
    +'<div><span style="color:#FFEDE6">OEM:</span> <b>'+v1+'</b></div>'
    +'<div><span style="color:#FFEDE6">Upsells:</span> <b>'+v2+'</b></div>'
    +'<div><span style="color:#FFEDE6">WKA:</span> <b>'+v3+'</b></div>';
  el.style.display='block';
  positionCrTooltip(ev);
}
function showCrTooltip(ev,crGesamt,crOem,crUps,crWka){
  var el=document.getElementById('crBreakdownTooltip');
  if(!el){
    el=document.createElement('div');
    el.id='crBreakdownTooltip';
    el.style.cssText='position:fixed;z-index:99999;background:#1d1c1a;color:#fff;border-radius:8px;padding:10px 14px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,0.25);pointer-events:none;white-space:nowrap;line-height:1.7';
    document.body.appendChild(el);
  }
  el.innerHTML='<div style="font-weight:700;margin-bottom:4px;color:#FFE1D6;font-size:10.5px;letter-spacing:.03em;text-transform:uppercase">CR-Aufschlüsselung</div>'
    +'<div><span style="color:#FFEDE6">CR Gesamt:</span> <b>'+crGesamt+'%</b></div>'
    +'<div><span style="color:#FFEDE6">CR OEM:</span> <b>'+crOem+'%</b></div>'
    +'<div><span style="color:#FFEDE6">CR Upsells:</span> <b>'+crUps+'%</b></div>'
    +'<div><span style="color:#FFEDE6">CR WKA:</span> <b>'+crWka+'%</b></div>';
  el.style.display='block';
  positionCrTooltip(ev);
}
function positionCrTooltip(ev){
  var el=document.getElementById('crBreakdownTooltip');
  if(!el)return;
  var x=ev.clientX+14, y=ev.clientY+14;
  var rect=el.getBoundingClientRect();
  if(x+rect.width>window.innerWidth-8)x=ev.clientX-rect.width-14;
  if(y+rect.height>window.innerHeight-8)y=ev.clientY-rect.height-14;
  el.style.left=Math.round(x)+'px';
  el.style.top=Math.round(y)+'px';
}
function hideCrTooltip(){
  var el=document.getElementById('crBreakdownTooltip');
  if(el)el.style.display='none';
}
function buildOverviewTab(liste,section,skipBanner,skipChart,hideMemberCol){
  // section: undefined = komplettes Overview wie bisher, UNVERAENDERT (Banner+Kacheln+Rest+Tabelle).
  // 'performance' = nur Banner + Kacheln + Performance-Tabelle (fuer den neuen Performance-Reiter, zeigt dieselben Daten 1:1, keine Aufteilung von Overview).
  var showRest=(section!=='performance');
  var HIDDEN=[];
  var visible=liste.filter(function(e){return HIDDEN.indexOf(e.role)<0&&!e.isPureCoach;}).slice().sort(function(a,b){return a.name.localeCompare(b.name);});
  if(!visible.length)return '<div class="card" style="text-align:center;color:var(--text3);padding:40px">Keine Mitarbeiter vorhanden</div>';
  var selectedEmps;
  if(hideMemberCol){
    // Eingebettete Mitarbeiteransicht: komplett unabhaengig von der globalen Team-Auswahl (overviewSelectedIds).
    // Sonst wuerde ein Besuch der Mitarbeiterseite die Auswahl auf der Team-Performance-Seite veraendern und umgekehrt.
    selectedEmps=visible.slice();
  } else {
    if(!overviewSelectedIds){overviewSelectedIds=visible.map(function(e){return e.id;});}
    overviewSelectedIds=overviewSelectedIds.filter(function(id){return visible.some(function(e){return e.id===id;});});
    selectedEmps=visible.filter(function(e){return overviewSelectedIds.indexOf(e.id)>=0;});
  }
  var isAll=selectedEmps.length!==1;
  var emp=isAll?null:selectedEmps[0];
  var empT=isAll?null:empTargets(emp);
  var currentMonthKey=today().slice(0,7); // z.B. "2026-07"
  var monthStart=currentMonthKey+'-01';
  var monthEnd=monthBoundsUTC(today(),0).to;
  var effFrom=overviewFromDate||monthStart;
  var effTo=overviewToDate||monthEnd;
  var perfAll=isAll?[]:(performance[emp.id]||[]).filter(function(x){return x.date>=effFrom&&x.date<=effTo;}).slice().sort(function(a,b){return b.date.localeCompare(a.date);});

  // Ziel fuer Opt. OEM-Kachel: Durchschnitt aller eingetragenen "Opt./Tag"-Werte aus der Zielvereinbarung (aktueller Monat)
  function avgOptTagZielvereinbarung(){
    var zmk=today().slice(0,7);
    var zRec=zielStore[zmk]||{};
    var zVisible=visible.filter(function(e){return empActiveInZielMonth(e,zmk);});
    var zVals=[];
    zVisible.forEach(function(e){
      var r=zRec[e.id]||{};
      if(r.optTag!=null)zVals.push(r.optTag);
    });
    return zVals.length?zVals.reduce(function(a,b){return a+b;},0)/zVals.length:null;
  }
  var optOemZiel=avgOptTagZielvereinbarung();
  var h='';

  if(!skipBanner)h+=buildGlobalBannerHtml(visible);

  // ── Performance Trend Chart (unter dem Banner) ──
  if(!skipChart){
  var chartRows=isAll
    ? selectedEmps.reduce(function(acc,e){return acc.concat((performance[e.id]||[]).filter(function(x){return x.date>=effFrom&&x.date<=effTo;}));},[])
    : (performance[emp.id]||[]).filter(function(x){return x.date>=effFrom&&x.date<=effTo;});
  h+='<div class="card" style="margin-bottom:22px">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">';
  h+='<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">';
  h+='<div class="card-title" style="margin:0">Performance <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+today().slice(0,4)+'</span></div>';
  h+='<div id="overviewChartLegend" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"></div>';
  h+='</div>';
  h+='<div style="display:flex;align-items:center;gap:8px">';
  (function(){
    var items=[{v:'',l:'Team (alle)'},{head:'Teams'}];
    [['group:Onboarding','Onboarding'],['group:VLC','VLC'],['group:SR','SR'],['group:SE','SE']].forEach(function(g){items.push({v:g[0],l:g[1]});});
    items.push({head:'Mitarbeiter'});
    visible.filter(function(e){return e.active!==false;}).forEach(function(e){items.push({v:e.id,l:e.name,role:e.role});});
    var ina=visible.filter(function(e){return e.active===false;});
    if(ina.length){items.push({head:'Inaktiv'});ina.forEach(function(e){items.push({v:e.id,l:e.name,role:e.role});});}
    var cur=items.find(function(it){return it.v!==undefined&&it.v===(overviewChartEmpId||'');});
    h+=ddSelectHtml('ovChartEmp','ti-users',cur?cur.l:'Team (alle)',items,overviewChartEmpId||'','setOverviewChartEmp',true);
  })();
  h+='<div style="display:flex;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;height:34px">';
  [{k:'day',l:'Tag'},{k:'week',l:'Woche'},{k:'month',l:'Monat'}].forEach(function(it){
    h+='<button style="padding:0 12px;height:100%;font-size:12px;font-weight:500;border:none;cursor:pointer;font-family:inherit;background:'+(overviewChartGroup===it.k?'#F08566':'transparent')+';color:'+(overviewChartGroup===it.k?'#fff':'var(--text2)')+'" onclick="setOverviewChartGroup(\''+it.k+'\')">'+it.l+'</button>';
  });
  h+='</div>';
  (function(){
    var items=[{k:'akt',l:'Aktivitäten'},{k:'optGesamt',l:'Opt. Ges. (Anzahl)'},{k:'crOEM',l:'CR Ges.'},{k:'crTeilweise',l:'CR TW'},{k:'crYes',l:'CR Yes'},{k:'crSyMy',l:'CR SY/MY'},{k:'margeGesamt',l:'Margenerhöhung (Gesamt)'}].map(function(it){return {v:it.k,l:it.l};});
    var cur=items.find(function(it){return it.v===overviewChartMetric;});
    h+=ddSelectHtml('ovChartMetric','ti-chart-line',cur?cur.l:'Kennzahl',items,overviewChartMetric,'setOverviewChartMetric',false);
  })();
  h+='</div>';
  h+='</div>';
  h+='<div style="height:280px;position:relative"><canvas id="overviewPerfChart"></canvas></div>';
  h+='</div>';

  // Chart.js Init - immer aktuelles Jahr (bzw. aktueller Monat bei Tagesansicht), X-Achse je nach overviewChartGroup, Zukunft = offene Punkte (null)
  (function(metric){
    window._overviewChartData=null;
    var year=+today().slice(0,4);
    var weeks=buildChartPeriods(overviewChartGroup,year);
    var todayStr=today();
    var liste;
    // Inaktive Mitarbeiter bewusst mitzaehlen: das Diagramm muss dieselbe Mitarbeitermenge abbilden wie die Performance-Tabelle
    if(!overviewChartEmpId){
      liste=visible.slice();
    } else if(overviewChartEmpId.indexOf('group:')===0){
      var grp=overviewChartEmpId.slice(6);
      // B2: Onboarding ohne VLC (VLC immer getrennt vom Onboarding)
      liste=visible.filter(function(e){return grp==='Onboarding'?(e.phase==='Onboarding'&&e.role!=='VLC'):(e.role===grp||e.phase===grp);});
    } else {
      liste=visible.filter(function(e){return e.id===overviewChartEmpId;});
    }
    var labels=weeks.map(function(w){return w.label;});
    var colors={gesamt:'#F08566',oem:'#8C8577',ups:'#B4AC9C',wka:'#D3CCBD'}; // Diagramm in den Hintergrundfarben (Entwurf C)

    function seriesFor(valFn,color,label,fillOrder){
      var data=weeks.map(function(w){
        if(w.from>todayStr)return null; // Zukunft: offener Punkt
        return valFn(chartSumsForRange(liste,w.from,w.to));
      });
      return {label:label,data:data,borderColor:color,backgroundColor:color+'22',
        fill:!!fillOrder,tension:0.35,pointRadius:labels.length<=16?3:0,
        pointBackgroundColor:color,borderWidth:fillOrder?2.5:2,spanGaps:false,order:fillOrder||2,borderDash:color===colors.wka?[5,4]:[]};
    }

    var datasets=[];
    var tk=null;
    if(metric==='akt'){
      datasets=[
        seriesFor(function(s){return s.akt;},colors.gesamt,'Aktivitäten (Gesamt)',1),
        seriesFor(function(s){return s.ne;},colors.oem,'Nicht Erreicht (Gesamt)'),
        seriesFor(function(s){return s.nm;},colors.ups,'Nicht Möglich (Gesamt)'),
        seriesFor(function(s){return s.nerr;},colors.wka,'Nicht Erfolgreich (Gesamt)')
      ];
    }
    else if(metric==='optGesamt'){
      datasets=[
        seriesFor(function(s){return s.oem+s.ups+s.wka;},colors.gesamt,'Opt. Ges. (Gesamt)',1),
        seriesFor(function(s){return s.oem;},colors.oem,'OEM (Anzahl)'),
        seriesFor(function(s){return s.ups;},colors.ups,'Upsells (Anzahl)'),
        seriesFor(function(s){return s.wka;},colors.wka,'WKA (Anzahl)')
      ];
    }
    else if(metric==='margeGesamt'){
      datasets=[
        seriesFor(function(s){return s.margeGes;},colors.gesamt,'Margenerhöhung (Gesamt)',1),
        seriesFor(function(s){return s.margeOEM;},colors.oem,'OEM (Summe)'),
        seriesFor(function(s){return s.margeUps;},colors.ups,'Upsells (Summe)'),
        seriesFor(function(s){return s.margeWka;},colors.wka,'WKA (Summe)')
      ];
    }
    else if(metric==='crSyMy'){
      datasets=[
        seriesFor(function(s){return chartCrFromSums('crSyMy',s);},colors.gesamt,'CR SY/MY',1),
        seriesFor(function(s){return chartCrFromSums('crSuperYes',s);},colors.oem,'CR SY'),
        seriesFor(function(s){return chartCrFromSums('crMegaYes',s);},colors.ups,'CR MY')
      ];
    }
    else if(['crOEM','crTeilweise','crYes'].indexOf(metric)>=0){
      var crLabels={crOEM:'CR OEM',crTeilweise:'CR TW',crYes:'CR Yes'};
      datasets=[seriesFor(function(s){return chartCrFromSums(metric,s);},colors.gesamt,crLabels[metric],1)];
      var tKeys={crOEM:'crOEM',crTeilweise:'crTeilweise',crYes:'crYes'};
      tk=tKeys[metric];
    }

    var allVals=[];
    datasets.forEach(function(ds){ds.data.forEach(function(v){if(v!==null&&v!==undefined)allVals.push(v);});});
    var target=(tk&&KPI_TARGETS[tk])?KPI_TARGETS[tk].val:null;
    var yS;
    if(!allVals.length){
      yS={min:0};
    } else {
      var dataMin=Math.min.apply(null,allVals),dataMax=Math.max.apply(null,allVals);
      var range=dataMax-dataMin;
      if(range<=0)range=dataMax>0?dataMax:1;
      var pad=range*0.4;
      yS={min:Math.max(0,dataMin-pad),max:dataMax+pad};
    }
    if(target!==null){
      datasets.push({
        label:'Ziel ('+target+')',
        data:labels.map(function(){return target;}),
        borderColor:'#3a3833',borderDash:[5,4],borderWidth:1.5,
        pointRadius:0,fill:false,order:99
      });
    }
    window._overviewChartData={labels:labels,datasets:datasets,yS:yS};
  })(overviewChartMetric);

  requestAnimationFrame(function(){requestAnimationFrame(function(){
    if(!window._overviewChartData)return;
    var d=window._overviewChartData;
    var canvas=document.getElementById('overviewPerfChart');
    if(!canvas)return;
    if(canvas._ci){try{canvas._ci.destroy();}catch(e){}}
    if(d.datasets[0])d.datasets[0].backgroundColor=vGradient(canvas,d.datasets[0].borderColor,0.55,0.05);
    canvas._ci=new Chart(canvas,{
      type:'line',
      data:{labels:d.labels,datasets:d.datasets},
      options:{
        responsive:true,
        resizeDelay:200,
        maintainAspectRatio:false,
        animation:CHART_DRAWIN_ANIMATION,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+formatMetricValue(overviewChartMetric,ctx.parsed.y);}}}
        },
        scales:{
          x:{ticks:{font:{size:11},maxTicksLimit:12},grid:{display:false}},
          y:{min:d.yS.min,max:d.yS.max,ticks:{font:{size:11},stepSize:d.yS.step},grid:{color:'rgba(0,0,0,0.05)'}}
        }
      }
    });
    reapplyChartGradient(canvas._ci,canvas,0.55,0.05);
    // Eigene, linksbuendige klickbare Legende direkt neben dem Titel statt der nativen Chart.js-Legende
    var legendEl=document.getElementById('overviewChartLegend');
    if(legendEl){
      legendEl.innerHTML='';
      canvas._ci.data.datasets.forEach(function(ds,i){
        var item=document.createElement('span');
        var meta=canvas._ci.getDatasetMeta(i);
        item.style.cssText='display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;cursor:pointer;user-select:none;color:'+(meta.hidden?'var(--text3)':'var(--text2)')+';opacity:'+(meta.hidden?'0.5':'1');
        item.innerHTML='<span style="width:9px;height:9px;border-radius:2px;background:'+ds.borderColor+';display:inline-block"></span>'+ds.label;
        item.onclick=function(){
          meta.hidden=meta.hidden===null?!canvas._ci.data.datasets[i].hidden:!meta.hidden;
          canvas._ci.update();
          item.style.opacity=meta.hidden?'0.5':'1';
          item.style.color=meta.hidden?'var(--text3)':'var(--text2)';
        };
        legendEl.appendChild(item);
      });
    }
  });});
  } // Ende if(!skipChart)


  var selLabel=overviewDisplayMode==='gesamt'?'Team gesamt ('+selectedEmps.length+')':overviewDisplayMode==='durchschnitt_mitarbeiter'?'Ø pro Mitarbeiter ('+selectedEmps.length+')':overviewDisplayMode==='durchschnitt_tag'?'Ø pro Einsatztag ('+selectedEmps.length+')':(!isAll?emp.name:(selectedEmps.length===visible.length?'Alle Mitarbeiter':selectedEmps.length+' Mitarbeiter ausgewählt'));
  if(showRest){
  } // Ende if(showRest)

  // Performance-Tabelle (Tag/Woche/Monat) für den gewählten Mitarbeiter
  h+='<div class="card">';
  var monthNames=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var currentMonthLabel=monthNames[parseInt(currentMonthKey.slice(5,7),10)-1]+' '+currentMonthKey.slice(0,4);
  h+='<div class="card-title" style="margin-bottom:14px"><i class="ti ti-table"></i> Performance <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+selLabel+' · '+fd(effFrom)+'–'+fd(effTo)+'</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
  if(!hideMemberCol){
  h+='<div style="position:relative" id="overviewEmpDropdownWrap">';
  h+='<button class="btn btn-sm" style="height:34px;padding:0 12px;font-weight:500" onclick="toggleOverviewEmpDropdown()"><i class="ti ti-users"></i> '+selLabel+' <i class="ti ti-chevron-down" style="font-size:11px"></i></button>';
  if(overviewEmpDropdownOpen){
    h+='<div style="position:absolute;top:38px;left:0;z-index:20;background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;box-shadow:0 10px 24px rgba(40,32,15,0.14);width:260px;padding:10px 4px;display:flex;flex-direction:column">';
    // Mitarbeiter-Suche + Liste
    h+='<div style="padding:0 8px 6px"><div style="display:flex;align-items:center;gap:6px;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:8px;padding:6px 8px">'
      +'<i class="ti ti-search" style="font-size:13px;color:var(--text3)"></i>'
      +'<input id="overviewEmpSearchInput" placeholder="Mitarbeiter suchen…" value="'+esc(overviewEmpSearchQuery)+'" oninput="overviewEmpSearchQuery=this.value;filterOverviewEmpList(this.value)" style="border:none;background:none;outline:none;font-size:12.5px;width:100%;color:var(--text)">'
      +'</div></div>';
    h+='<div id="overviewEmpScrollList" style="max-height:160px;overflow-y:auto;padding-top:4px">';
    var ROLE_ORDER={SDM:0,SDC:1,SDL:2,SE:3,SR:4,VLC:5};
    var sortedVisible=visible.slice().sort(function(a,b){
      var ra=ROLE_ORDER[a.role]!=null?ROLE_ORDER[a.role]:99,rb=ROLE_ORDER[b.role]!=null?ROLE_ORDER[b.role]:99;
      return ra-rb||a.name.localeCompare(b.name);
    });
    sortedVisible.forEach(function(e){
      var checked=overviewSelectedIds.indexOf(e.id)>=0;
      h+='<label class="emp-opt-row" data-search="'+esc(e.name).toLowerCase()+'" style="display:grid;grid-template-columns:20px 38px 1fr;align-items:center;gap:8px;padding:5px 12px;font-size:12.5px;cursor:pointer;border-radius:6px;white-space:nowrap" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'
        +'<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleOverviewEmpId(\''+e.id+'\')" style="cursor:pointer;margin:0">'
        +'<span style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.02em">'+e.role+'</span>'
        +'<span>'+esc(e.name)+'</span>'
        +'</label>';
    });
    h+='<div id="overviewEmpNoResults" style="display:none;padding:14px 12px;text-align:center;font-size:12px;color:var(--text3)">Keine Treffer</div>';
    h+='</div>';
    var _visIds=visible.map(function(e){return e.id;});
    h+='<div style="padding:6px 12px 2px;font-size:11px;color:var(--text3)">Team</div>';
    h+='<div style="padding:0 8px 6px;display:flex;flex-wrap:wrap;gap:2px 6px">';
    [{k:'DE',l:'DE'},{k:'VLC',l:'VLC'},{k:'SR',l:'SR'},{k:'SE',l:'SE'},{k:'OB',l:'OB'}].forEach(function(tg){
      h+='<span onclick="setOverviewTeamGroup(['+_visIds.map(function(id){return '\''+id+'\'';}).join(',')+'],\''+tg.k+'\')" style="font-size:11px;font-weight:600;color:#F08566;padding:3px 6px;cursor:pointer;border-radius:5px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'+tg.l+'</span>';
    });
    h+='<span onclick="setOverviewSelectAll(['+_visIds.map(function(id){return '\''+id+'\'';}).join(',')+'])" style="font-size:11px;font-weight:600;color:var(--text2);padding:3px 6px;cursor:pointer;border-radius:5px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">Alle</span>';
    h+='<span onclick="setOverviewSelectNone()" style="font-size:11px;font-weight:600;color:var(--text2);padding:3px 6px;cursor:pointer;border-radius:5px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">Keine</span>';
    h+='</div>';
    // Anzeige-Modus ganz unten
    h+='<div style="border-top:1px solid var(--border);margin:4px 0 4px"></div>';
    [{k:'individual',l:'Einzeln'},{k:'gesamt',l:'Gesamt'},{k:'durchschnitt_mitarbeiter',l:'Ø Mitarbeiter'},{k:'durchschnitt_tag',l:'Ø Einsatztag'}].forEach(function(dm){
      var active=overviewDisplayMode===dm.k;
      h+='<button onclick="setOverviewDisplayMode(\''+dm.k+'\')" style="display:block;width:100%;text-align:left;background:none;border:none;padding:6px 12px;font-size:12.5px;font-family:inherit;cursor:pointer;border-radius:6px;color:'+(active?'#F08566':'var(--text2)')+';font-weight:'+(active?'700':'500')+'" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'+dm.l+'</button>';
    });
    h+='</div>';
  }
  h+='</div>';
  }
  h+='<div class="chart-toggle">';
  [{k:'day',l:'Tag'},{k:'week',l:'Woche'},{k:'month',l:'Monat'}].forEach(function(it){
    h+='<button class="'+(overviewPerfGroup===it.k?'active':'')+'" data-g="'+it.k+'" onclick="setOverviewPerfGroup(this.dataset.g)">'+it.l+'</button>';
  });
  h+='</div>';
  h+='<div class="chart-toggle">';
  (function(){
    var tToday=today();
    var mb=monthBoundsUTC(tToday,0);
    var yFrom=tToday.slice(0,4)+'-01-01',yTo=tToday.slice(0,4)+'-12-31';
    var _dToday=new Date(tToday+'T00:00:00Z');
    var _dow=_dToday.getUTCDay()||7; // Sonntag als 7 statt 0, damit Montag=1
    var _monday=new Date(_dToday);_monday.setUTCDate(_dToday.getUTCDate()-(_dow-1));
    var _sunday=new Date(_monday);_sunday.setUTCDate(_monday.getUTCDate()+6);
    var weekFrom=_monday.toISOString().slice(0,10),weekTo=_sunday.toISOString().slice(0,10);
    var quickRanges={today:{from:tToday,to:tToday},week:{from:weekFrom,to:weekTo},month:{from:mb.from,to:mb.to},year:{from:yFrom,to:yTo}};
    [{k:'today',l:'Heute'},{k:'week',l:'Aktuelle Woche'},{k:'month',l:'Aktueller Monat'},{k:'year',l:'Aktuelles Jahr'}].forEach(function(it){
      var qr=quickRanges[it.k];
      var isActive=(effFrom===qr.from&&effTo===qr.to);
      h+='<button class="'+(isActive?'active':'')+'" data-q="'+it.k+'" onclick="setOverviewQuickRange(this.dataset.q)">'+it.l+'</button>';
    });
  })();
  h+='</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;padding:0 10px;height:34px;border:1px solid var(--border2);border-radius:var(--r-md)">';
  h+='<span style="font-size:11px;color:var(--text2)">Von</span>';
  h+='<input type="date" id="overviewFromDate" value="'+effFrom+'" style="border:none;background:transparent;font-size:12px;font-family:inherit;color:var(--text);padding:0;width:112px">';
  h+='<span style="font-size:11px;color:var(--text2)">Bis</span>';
  h+='<input type="date" id="overviewToDate" value="'+effTo+'" style="border:none;background:transparent;font-size:12px;font-family:inherit;color:var(--text);padding:0;width:112px">';
  h+='<button class="btn btn-sm" style="padding:4px 8px" onclick="setOverviewDateRange(document.getElementById(\'overviewFromDate\').value,document.getElementById(\'overviewToDate\').value)"><i class="ti ti-check"></i></button>';
  h+=((overviewFromDate||overviewToDate)?'<button class="btn btn-sm" style="padding:4px 8px" onclick="setOverviewDateRange(null,null)" title="Zurück zum aktuellen Monat"><i class="ti ti-x"></i></button>':'');
  h+='</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;padding:0 10px;height:34px;border:1px solid var(--border2);border-radius:var(--r-md);margin-left:auto">';
  h+='<span style="font-size:11px;color:var(--text2)">KW</span>';
  h+='<input type="week" id="overviewWeekInput" style="border:none;background:transparent;font-size:12px;font-family:inherit;color:var(--text);padding:0;width:118px">';
  h+='<button class="btn btn-sm" style="padding:4px 8px" onclick="applyOverviewWeek()"><i class="ti ti-check"></i></button>';
  h+='</div>';
  h+='<div style="display:flex;align-items:center;gap:6px;padding:0 10px;height:34px;border:1px solid var(--border2);border-radius:var(--r-md)">';
  h+='<span style="font-size:11px;color:var(--text2)">Monat</span>';
  h+='<input type="month" id="overviewMonthInput" style="border:none;background:transparent;font-size:12px;font-family:inherit;color:var(--text);padding:0;width:118px">';
  h+='<button class="btn btn-sm" style="padding:4px 8px" onclick="applyOverviewMonth()"><i class="ti ti-check"></i></button>';
  h+='</div>';
  h+='</div>';
  var combinedGroupedRows=[];
  if(isAll){
    selectedEmps.forEach(function(e){
      var ePerf=(performance[e.id]||[]).filter(function(x){return x.date>=effFrom&&x.date<=effTo;});
      if(!ePerf.length)return;
      var eGrouped=groupPerfRows(ePerf,overviewPerfGroup);
      eGrouped.forEach(function(g){combinedGroupedRows.push({g:g,emp:e,empT:empTargets(e),hours:perfHoursForDates(e,g.dates)});});
    });
    combinedGroupedRows.sort(function(a,b){return a.emp.name.localeCompare(b.emp.name)||b.g.label.localeCompare(a.g.label);});
    // Gesamt/Durchschnitt: statt einer Zeile je (Mitarbeiter,Zeitraum) eine Zeile je Zeitraum,
    // mit summierten bzw. gemittelten Rohwerten ueber alle ausgewaehlten Mitarbeiter
    if(overviewDisplayMode!=='individual'){
      var byPeriod={};
      var periodOrder=[];
      combinedGroupedRows.forEach(function(item){
        var key=item.g.label;
        if(!byPeriod[key]){byPeriod[key]={label:key,sortKey:item.g.label,periodKey:item.g.key,rows:[],totalTage:0,totalHours:0};periodOrder.push(key);}
        byPeriod[key].rows.push(item.g.row);
        byPeriod[key].totalTage+=(item.g.count||0);
        byPeriod[key].totalHours+=(item.hours||0);
      });
      var aggGroupedRows=periodOrder.map(function(key){
        var pd=byPeriod[key];
        var nEmp=pd.rows.length;
        var nTage=pd.totalTage||1;
        var divisor=overviewDisplayMode==='durchschnitt_tag'?nTage:nEmp;
        var aggRow={};
        pd.rows.forEach(function(r){
          Object.keys(r).forEach(function(k){
            var v=r[k];
            if(typeof v!=='number')return;
            aggRow[k]=(aggRow[k]||0)+v;
          });
        });
        if(overviewDisplayMode==='durchschnitt_mitarbeiter'||overviewDisplayMode==='durchschnitt_tag'){
          Object.keys(aggRow).forEach(function(k){aggRow[k]=aggRow[k]/divisor;});
        }
        // Stunden genauso skalieren wie die Rohwerte, sonst stimmen Akt./Std. und Opt./Std. in den Ø-Modi nicht
        var aggHours=(overviewDisplayMode==='durchschnitt_mitarbeiter'||overviewDisplayMode==='durchschnitt_tag')?pd.totalHours/divisor:pd.totalHours;
        var aggName=overviewDisplayMode==='gesamt'?'Team gesamt':overviewDisplayMode==='durchschnitt_tag'?'Ø pro Einsatztag':'Ø pro Mitarbeiter';
        return {g:{label:pd.label,key:pd.periodKey,row:aggRow,count:nTage},emp:{id:'__agg__',name:aggName,role:''},empT:empTargets({}),hours:aggHours}; // D7: Standard-Ziele (Peter 24.11.), nicht die des ersten Mitarbeiters
      });
      combinedGroupedRows=aggGroupedRows;
    }
  }
  var hasAnyData=isAll?combinedGroupedRows.length>0:perfAll.length>0;
  if(!hasAnyData){
    h+='<div style="text-align:center;color:var(--text3);padding:24px">'
      +'<i class="ti ti-file-upload" style="font-size:26px;display:block;margin-bottom:8px"></i>'
      +'Noch keine Daten für '+selLabel+' im Zeitraum '+fd(effFrom)+'–'+fd(effTo)+'</div>';
  } else {
    var firstColLabel=overviewPerfGroup==='day'?'Datum':overviewPerfGroup==='week'?'Woche':'Monat';
    var rowsToRender=isAll?combinedGroupedRows:groupPerfRows(perfAll,overviewPerfGroup).map(function(g){return {g:g,emp:emp,empT:empT,hours:perfHoursForDates(emp,g.dates)};});
    // Werte je Zeile einmal vorab berechnen, damit Sortierung und Rendering dieselben Werte nutzen
    var sortableRows=rowsToRender.map(function(item){
      var g=item.g,rowEmp=item.emp,rowEmpT=item.empT;
      var row=g.row;
      var akt=row.gesamtAktivitaeten!=null?row.gesamtAktivitaeten:(row.oem_aktivitaeten||row.calls||0);
      var convOEM=row.convOEM||0;
      var tw=row.convTW||0,yes=row.convYes||0,sy=row.convSY||0,my=row.convMY||0;
      var notR=row.gesamtNichtErreicht!=null?row.gesamtNichtErreicht:(row.notReached||0);
      var notP=row.gesamtNichtMoeglich!=null?row.gesamtNichtMoeglich:(row.notPossible||0);
      var notS=row.gesamtNichtErfolgreich!=null?row.gesamtNichtErfolgreich:(row.notSuccessful||0);
      var notROem=row.notReached||0,notPOem=row.notPossible||0,notSOem=row.notSuccessful||0; // OEM-spezifisch, nur fuer CR-OEM-Formel (Ziel/(NE+NM+NErr))
      var ups=row.ups_yes||0,wka_gesamt_yes=row.wka_gesamt_yes||0;
      var optGes=row.optGesamt||(convOEM+ups+wka_gesamt_yes)||0;
      var marge=row.margeGesamt||row.margin||0;
      var margeOEMVal=row.margeOEM||0, margeUpsVal=row.margeUpsell||0, margeWkaVal=row.margeWKA||0;
      var oemDenom=notSOem+convOEM;
      var crOEM=oemDenom>0?Math.round(convOEM/oemDenom*100):0;
      var crTW=(tw+yes+sy+my)>0?Math.round(tw/(tw+yes+sy+my)*100):0;
      var crSY=(yes+sy+my)>0?Math.round(sy/(yes+sy+my)*100):0;
      var crMY=(yes+sy+my)>0?Math.round(my/(yes+sy+my)*100):0;
      var crYes=(yes+sy+my)>0?Math.round(yes/(yes+sy+my)*100):0;
      var crSyMy=(yes+sy+my)>0?Math.round((sy+my)/(yes+sy+my)*100):0;
      // CR-Aufschlüsselung fuer den Hover-Tooltip (CR Gesamt/OEM/Upsells/WKA)
      var upsNerf=row.upsNichtErfolgreich||0, wkaOemNerf=row.wkaOemNichtErfolgreich||0, wkaUpsNerf=row.wkaUpsNichtErfolgreich||0;
      var wkaOemBeendet=row.wkaOemBeendet||0, wkaUpsBeendet=row.wkaUpsBeendet||0;
      var crUpsTooltip=(ups+upsNerf)>0?Math.round(ups/(ups+upsNerf)*100):0;
      var crWkaDenomFail=wkaOemNerf+wkaOemBeendet+wkaUpsNerf+wkaUpsBeendet;
      var crWkaTooltip=(wka_gesamt_yes+crWkaDenomFail)>0?Math.round(wka_gesamt_yes/(wka_gesamt_yes+crWkaDenomFail)*100):0;
      var crGesamtDenomFail=notSOem+upsNerf+wkaOemNerf+wkaUpsNerf;
      var crGesamtTooltip=(optGes+crGesamtDenomFail)>0?Math.round(optGes/(optGes+crGesamtDenomFail)*100):0;
      var rowTotalHours=item.hours||0;
      var aktPerH=rowTotalHours>0?akt/rowTotalHours:0;
      var optPerH2=rowTotalHours>0?optGes/rowTotalHours:0;
      var anteilOEM=optGes>0?convOEM/optGes*100:0;
      return {rowTotalHours:rowTotalHours,aktPerH:aktPerH,optPerH2:optPerH2,anteilOEM:anteilOEM,item:item,rowEmp:rowEmp,rowEmpT:rowEmpT,g:g,name:rowEmp.name,period:g.label,periodKey:g.key,akt:akt,notR:notR,notP:notP,notS:notS,notROem:notROem,notPOem:notPOem,notSOem:notSOem,
        convOEM:convOEM,tw:tw,yes:yes,sy:sy,my:my,crOEM:crOEM,crTW:crTW,crYes:crYes,crSY:crSY,crMY:crMY,crSyMy:crSyMy,ups:ups,wka_gesamt_yes:wka_gesamt_yes,optGes:optGes,marge:marge,
        crGesamtTooltip:crGesamtTooltip,crUpsTooltip:crUpsTooltip,crWkaTooltip:crWkaTooltip,
        margeOEMVal:margeOEMVal,margeUpsVal:margeUpsVal,margeWkaVal:margeWkaVal};
    });
    if(overviewPerfSortKey){
      var sortField=overviewPerfSortKey==='period'?'periodKey':overviewPerfSortKey;
      sortableRows.sort(function(a,b){
        var av=a[sortField],bv=b[sortField];
        var cmp=(typeof av==='string'||typeof bv==='string')?(''+av).localeCompare(''+bv,'de'):((av||0)-(bv||0));
        return overviewPerfSortDir==='asc'?cmp:-cmp;
      });
    }
    function sortTh(label,key,extraStyle){
      var active=overviewPerfSortKey===key;
      var arrow=active?(overviewPerfSortDir==='asc'?' ▲':' ▼'):'';
      return '<th style="background:#EFECE5;padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:'+(active?'#F7B39A':'#fff')+';text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);white-space:nowrap;cursor:pointer;user-select:none'+(extraStyle||'')+'" onclick="setOverviewPerfSort(\''+key+'\')">'+label+arrow+'</th>';
    }
    h+='<div style="overflow-x:auto;border-radius:var(--r-md);border:1px solid var(--border2)"><table class="perf-tbl" style="width:100%;min-width:1400px;border-collapse:collapse;table-layout:fixed"><thead><tr>'
      +sortTh('Mitarbeiter','name',';width:160px')
      +sortTh(firstColLabel,'period',';width:120px')
      +[['Akt./Std.','aktPerH'],['NE','notR'],['NM','notP'],['NEF','notS'],['OEM','convOEM'],['Upsells','ups'],['WKA','wka_gesamt_yes'],['Opt. Ges.','optGes'],['Opt./Std.','optPerH2'],['CR (Fokus)','crOEM'],['CR TW','crTW'],['CR Yes','crYes'],['CR SY/MY','crSyMy'],['CR SY','crSY'],['CR MY','crMY'],['Anteil (Fokus)','anteilOEM']].map(function(cc){
        return sortTh(cc[0],cc[1],';text-align:right');
      }).join('')
      +[['Marge Ges.','marge']].map(function(cc){
        return sortTh(cc[0],cc[1],';text-align:right');
      }).join('')
      +'<th style="background:#EFECE5;padding:9px 10px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);white-space:nowrap;width:150px">Aktion</th>'
      +'</tr></thead><tbody>';
    // Zwei Werte gestapelt (Hauptwert oben, Anzahl klein darunter) statt "Wert (Anzahl)" in einer Zeile.
    // Rendert die zweite Zeile IMMER (auch als unsichtbaren Platzhalter), damit alle Zellen einer
    // Zeile an derselben Hoehe beginnen, egal ob sie einen Unterwert haben oder nicht.
    function stackCell(main,sub,extraStyle,align){
      var hasSubValue=(sub!==null&&sub!==undefined&&sub!=='');
      return '<div style="display:flex;flex-direction:column;align-items:'+(align==='left'?'flex-start':'flex-end')+';line-height:1.15">'
        +'<span>'+main+'</span>'
        +'<span style="font-size:11px;color:var(--text3);margin-top:1px;'+(hasSubValue?'':'visibility:hidden;')+(extraStyle||'')+'">'+(hasSubValue?sub:'0')+'</span>'
        +'</div>';
    }
    var sumAkt=0,sumNotR=0,sumNotP=0,sumNotS=0,sumNotROem=0,sumNotPOem=0,sumNotSOem=0,sumConvOEM=0,sumTw=0,sumYes=0,sumSy=0,sumMy=0,sumUps=0,sumWka=0,sumOptGes=0,sumMarge=0,sumCrOEM=0,sumCrTW=0,sumCrSY=0,sumCrMY=0,sumTotalHours=0;
    sortableRows.forEach(function(sr,ridx){
      var rowEmp=sr.rowEmp,rowEmpT=sr.rowEmpT,g=sr.g;var _pmk=((g.dates&&g.dates.length?g.dates[g.dates.length-1]:g.key)||today()).slice(0,7),_fc=provFocus(rowEmp,_pmk);
      var akt=sr.akt,convOEM=sr.convOEM,tw=sr.tw,yes=sr.yes,sy=sr.sy,my=sr.my,notR=sr.notR,notP=sr.notP,notS=sr.notS,notROem=sr.notROem,notPOem=sr.notPOem,notSOem=sr.notSOem,ups=sr.ups,wka_gesamt_yes=sr.wka_gesamt_yes,optGes=sr.optGes,marge=sr.marge,crOEM=sr.crOEM,crTW=sr.crTW,crYes=sr.crYes,crSY=sr.crSY,crMY=sr.crMY,crSyMy=sr.crSyMy,crGesamtTooltip=sr.crGesamtTooltip,crUpsTooltip=sr.crUpsTooltip,crWkaTooltip=sr.crWkaTooltip,margeOEMVal=sr.margeOEMVal,margeUpsVal=sr.margeUpsVal,margeWkaVal=sr.margeWkaVal;
      // Stunden tagesgenau aus den Wochenarbeitszeiten der tatsaechlichen Datentage (perfHoursForDates);
      // heute zaehlt nur die bereits verstrichene Arbeitszeit. In Gesamt/Ø-Modi bereits passend aggregiert.
      var rowTotalHours=sr.rowTotalHours;
      var aktPerHour=sr.aktPerH;
      function fc(v,t,dir){if(!t&&t!==0)return '';return(dir==='lte'?v<=t:v>=t)?'color:var(--text)':'color:var(--red);font-weight:700';}
      var rowBg=ridx%2===1?'background:var(--s-tint);':'';
      h+='<tr class="perf-data-row" style="'+rowBg+'">'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);font-weight:600;white-space:nowrap;cursor:pointer" onclick="'+(rowEmp.id==='__agg__'?'':'openPerfPopup(\''+rowEmp.id+'\')')+'">'+stackCell(rowEmp.name,rowEmp.role||'',null,'left')+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);font-weight:600;white-space:nowrap">'+stackCell(g.label,(overviewPerfGroup!=='day'?g.count+' Tage':''),null,'left')+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;'+(akt>0?fc(+aktPerHour.toFixed(1),rowEmpT.oem_aktivitaeten.val,rowEmpT.oem_aktivitaeten.dir):'')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Akt./Std. = Aktivitäten / Stunden\',\'Aktivitäten\','+akt+',\'Stunden\','+rowTotalHours.toFixed(1)+',\'Akt./Std.\','+aktPerHour.toFixed(1)+')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(aktPerHour.toFixed(1),akt)+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;'+(akt>0?fc(Math.round(notR/akt*100),rowEmpT.notReached.val,rowEmpT.notReached.dir):'color:var(--text2)')+';cursor:help" onmouseenter="showInfoTooltip(event,\'NE = NE / Aktivitäten\',\'NE\','+notR+',\'Aktivitäten\','+akt+',\'NE-Quote\',\''+(akt>0?Math.round(notR/akt*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((akt>0?Math.round(notR/akt*100)+'%':'—'),(akt>0?notR:'—'))+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;'+(akt>0?fc(Math.round(notP/akt*100),rowEmpT.notPossible.val,rowEmpT.notPossible.dir):'color:var(--text2)')+';cursor:help" onmouseenter="showInfoTooltip(event,\'NM = NM / Aktivitäten\',\'NM\','+notP+',\'Aktivitäten\','+akt+',\'NM-Quote\',\''+(akt>0?Math.round(notP/akt*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((akt>0?Math.round(notP/akt*100)+'%':'—'),(akt>0?notP:'—'))+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;'+((notS+optGes)>0?fc(Math.round(notS/(notS+optGes)*100),rowEmpT.notSuccessful.val,rowEmpT.notSuccessful.dir):'color:var(--text2)')+';cursor:help" onmouseenter="showInfoTooltip(event,\'NEF = NEF / (NEF + Opt.Ges.)\',\'NEF\','+notS+',\'Opt.Ges.\','+optGes+',\'NEF-Quote\',\''+((notS+optGes)>0?Math.round(notS/(notS+optGes)*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(((notS+optGes)>0?Math.round(notS/(notS+optGes)*100)+'%':'—'),((notS+optGes)>0?notS:'—'))+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'OEM = Opt.OEM / Opt.Ges.\',\'Opt.OEM\','+convOEM+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(convOEM/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(convOEM/optGes*100)+'%':'—'),(optGes>0?convOEM:'—'))+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'Upsells = Opt.Upsells / Opt.Ges.\',\'Opt.Upsells\','+ups+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(ups/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(ups/optGes*100)+'%':'—'),(optGes>0?ups:'—'))+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'WKA = Opt.WKA / Opt.Ges.\',\'Opt.WKA\','+wka_gesamt_yes+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(wka_gesamt_yes/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(wka_gesamt_yes/optGes*100)+'%':'—'),(optGes>0?wka_gesamt_yes:'—'))+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;cursor:help" onmouseenter="showBreakdownTooltip(event,\'Opt. Ges. Aufschlüsselung\','+convOEM+','+ups+','+wka_gesamt_yes+')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(optGes,null)+'</td>'
        +(function(){
          var optPerHVal=rowTotalHours>0?optGes/rowTotalHours:0;
          var colStyle=rowTotalHours>0?fc(Math.round(optPerHVal*10)/10,rowEmpT.optPerH.val,rowEmpT.optPerH.dir):'';
          return '<td style="padding:16px 10px;border-bottom:1px solid var(--border);border-left:2px solid var(--border2);background:var(--s-tint);text-align:right;'+colStyle+';cursor:help" onmouseenter="showInfoTooltip(event,\'Opt./Std. = Opt.Ges. / Stunden\',\'Opt.Ges.\','+optGes+',\'Stunden\','+rowTotalHours.toFixed(1)+',\'Opt./Std.\','+(rowTotalHours>0?optPerHVal.toFixed(1):'—')+')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((rowTotalHours>0?optPerHVal.toFixed(1):'—'),null)+'</td>';
        })()
        +(_fc.cr!=='crOem'?provFocusTd('cr',_fc.cr,rowEmp,_pmk,g.row,rowTotalHours,g.count,'16px 10px'):('<td style="padding:16px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crOEM,rowEmpT.crOEM.val,rowEmpT.crOEM.dir)+';cursor:help" onmouseenter="showCrTooltip(event,'+crGesamtTooltip+','+crOEM+','+crUpsTooltip+','+crWkaTooltip+')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crOEM+'%',null)+'</td>'))
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crTW,rowEmpT.crTeilweise.val,rowEmpT.crTeilweise.dir)+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR TW = TW / (TW+Yes+SY+MY)\',\'TW\','+tw+',\'TW+Yes+SY+MY\','+(tw+yes+sy+my)+',\'CR TW\',\''+crTW+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crTW+'%',tw)+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crYes,rowEmpT.crYes.val,rowEmpT.crYes.dir)+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR Yes = Yes / (Yes+SY+MY)\',\'Yes\','+yes+',\'Yes+SY+MY\','+(yes+sy+my)+',\'CR Yes\',\''+crYes+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crYes+'%',yes)+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crSyMy,rowEmpT.crSyMy.val,rowEmpT.crSyMy.dir)+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR SY/MY = (SY+MY) / (Yes+SY+MY)\',\'SY+MY\','+(sy+my)+',\'Yes+SY+MY\','+(yes+sy+my)+',\'CR SY/MY\',\''+crSyMy+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crSyMy+'%',sy+my)+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crSY,rowEmpT.crSuperYes.val,rowEmpT.crSuperYes.dir)+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR SY = SY / (Yes+SY+MY)\',\'SY\','+sy+',\'Yes+SY+MY\','+(yes+sy+my)+',\'CR SY\',\''+crSY+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crSY+'%',sy)+'</td>'
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crMY,rowEmpT.crMegaYes.val,rowEmpT.crMegaYes.dir)+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR MY = MY / (Yes+SY+MY)\',\'MY\','+my+',\'Yes+SY+MY\','+(yes+sy+my)+',\'CR MY\',\''+crMY+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crMY+'%',my)+'</td>'
        +(_fc.an!=='oemAnteil'?provFocusTd('an',_fc.an,rowEmp,_pmk,g.row,rowTotalHours,g.count,'16px 10px').replace('border-bottom:1px solid var(--border);','border-bottom:1px solid var(--border);border-right:2px solid var(--border2);'):('<td style="padding:16px 10px;border-bottom:1px solid var(--border);border-right:2px solid var(--border2);background:var(--s-tint);text-align:right;'+fc(Math.round(optGes>0?convOEM/optGes*100:0),rowEmpT.anteilOEM.val,rowEmpT.anteilOEM.dir)+';cursor:help" onmouseenter="showInfoTooltip(event,\'Anteil OEM = Opt.OEM / Opt.Ges.\',\'Opt.OEM\','+convOEM+',\'Opt.Ges.\','+optGes+',\'Anteil OEM\',\''+(optGes>0?Math.round(convOEM/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(convOEM/optGes*100):0)+'%',null)+'</td>'))
        +'<td style="padding:16px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;color:var(--text);cursor:help" onmouseenter="showBreakdownTooltip(event,\'Marge Ges. Aufschlüsselung\',\'€'+Math.round(margeOEMVal).toLocaleString('de-DE')+'\',\'€'+Math.round(margeUpsVal).toLocaleString('de-DE')+'\',\'€'+Math.round(margeWkaVal).toLocaleString('de-DE')+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell('€'+Math.round(marge).toLocaleString('de-DE'),(optGes>0?'€'+Math.round(marge/optGes).toLocaleString('de-DE'):'—'))+'</td>'
        +(rowEmp.id==='__agg__'?'<td style="padding:16px 10px;border-bottom:1px solid var(--border)"></td>':'<td style="padding:16px 10px;border-bottom:1px solid var(--border);white-space:nowrap"><div style="display:flex;gap:6px;justify-content:flex-end">'+(hideMemberCol?'':'<button class="btn btn-sm btn-primary" style="height:34px;padding:0 12px" onclick="event.stopPropagation();openSessionModal(\''+rowEmp.id+'\')"><i class="ti ti-calendar-plus"></i> Planen</button>')+'<button class="btn btn-sm" title="Info" aria-label="Info" style="width:34px;height:34px;padding:0;justify-content:center" onclick="event.stopPropagation();openPerfPopup(\''+rowEmp.id+'\')"><i class="ti ti-info-circle"></i></button></div></td>')
        +'</tr>';
      sumAkt+=akt;sumNotR+=notR;sumNotP+=notP;sumNotS+=notS;sumNotROem+=notROem;sumNotPOem+=notPOem;sumNotSOem+=notSOem;sumConvOEM+=convOEM;sumTw+=tw;sumYes+=yes;sumSy+=sy;sumMy+=my;sumTotalHours+=rowTotalHours;
      sumUps+=ups;sumWka+=wka_gesamt_yes;sumOptGes+=optGes;sumMarge+=marge;
      sumCrOEM+=crOEM;sumCrTW+=crTW;sumCrSY+=crSY;sumCrMY+=crMY;
    });
    // ── Summe & Durchschnitt (nur sinnvoll bei mehreren Zeilen) ──
    var rowCount=sortableRows.length;
    if(rowCount>1){
      function sumTd(v,fmt,align){return '<td style="padding:9px 10px;text-align:'+(align||'right')+';font-weight:700;color:#fff">'+(fmt?fmt(v):v)+'</td>';}
      function avgTd(v,fmt,align){return '<td style="padding:9px 10px;text-align:'+(align||'right')+';font-weight:700;color:#1d1c1a">'+(fmt?fmt(v):v)+'</td>';}
      var eur=function(v){return '€'+Math.round(v).toLocaleString('de-DE');};
      var pct=function(v){return Math.round(v)+'%';};
      var pctStack=function(v){return stackCell(Math.round(v)+'%',null);};
      var rnd1=function(v){return (Math.round(v*10)/10).toLocaleString('de-DE');};
      // CR-Werte fuer die Summe/Durchschnitt-Zeile werden aus den summierten Rohzahlen
      // berechnet (echte Gesamt-CR), nicht aus dem Mittelwert der einzelnen Zeilen-CRs -
      // sonst verzerren Zeilen mit wenigen Aktivitaeten das Bild unverhaeltnismaessig.
      var divSafe=function(a,b){return b>0?(a/b*100):0;};
      var crOEMcalc=divSafe(sumConvOEM,sumNotSOem+sumConvOEM);
      var crTWcalc=divSafe(sumTw,sumTw+sumYes+sumSy+sumMy);
      var crYescalc=divSafe(sumYes,sumYes+sumSy+sumMy);
      var crSYcalc=divSafe(sumSy,sumYes+sumSy+sumMy);
      var crMYcalc=divSafe(sumMy,sumYes+sumSy+sumMy);
      var crSyMycalc=divSafe(sumSy+sumMy,sumYes+sumSy+sumMy);
      var anteilOEMcalc=divSafe(sumConvOEM,sumOptGes);
      var anteilUpsCalc=divSafe(sumUps,sumOptGes);
      var anteilWkaCalc=divSafe(sumWka,sumOptGes);
      var notRpct=divSafe(sumNotR,sumAkt),notPpct=divSafe(sumNotP,sumAkt),notSpct=divSafe(sumNotS,sumNotS+sumOptGes);
      var margeDurchCalc=sumOptGes>0?sumMarge/sumOptGes:0;
      var aktPerHourCalc=sumTotalHours>0?sumAkt/sumTotalHours:0;
      var optPerHourCalc=sumTotalHours>0?sumOptGes/sumTotalHours:0;
      function cntPct(v,p){return stackCell(Math.round(p)+'%',v,'opacity:.75');}
      function decCnt(dec,cnt){return stackCell(dec.toFixed(1),cnt,'opacity:.75');}
      // Highlight-Varianten fuer Summe (dunkler Hintergrund -> helle Aufhellung) und Durchschnitt (heller Hintergrund -> Petrol-Toenung)
      function sumTdH(v,fmt,align,edge){return '<td style="padding:9px 10px;text-align:'+(align||'right')+';font-weight:700;color:#fff;background:rgba(255,255,255,0.06)'+(edge==='l'?';border-left:2px solid rgba(255,255,255,0.3)':'')+(edge==='r'?';border-right:2px solid rgba(255,255,255,0.3)':'')+'">'+(fmt?fmt(v):v)+'</td>';}
      function avgTdH(v,fmt,align,edge){return '<td style="padding:9px 10px;text-align:'+(align||'right')+';font-weight:700;color:#1d1c1a;background:var(--s-tint-strong)'+(edge==='l'?';border-left:2px solid var(--border2)':'')+(edge==='r'?';border-right:2px solid var(--border2)':'')+'">'+(fmt?fmt(v):v)+'</td>';}
      // Trennzeile: kleiner visueller Abstand zwischen Mitarbeiter-Zeilen und Summe/Durchschnitt
      h+='<tr class="perf-sum-row" style="background:#1d1c1a">'
        +'<td style="padding:9px 10px;font-weight:700;color:#fff" colspan="2">Σ Summe</td>'
        +sumTd(decCnt(aktPerHourCalc,sumAkt))+sumTd(cntPct(sumNotR,notRpct))+sumTd(cntPct(sumNotP,notPpct))+sumTd(cntPct(sumNotS,notSpct))+sumTd(cntPct(sumConvOEM,anteilOEMcalc))
        +sumTd(cntPct(sumUps,anteilUpsCalc))+sumTd(cntPct(sumWka,anteilWkaCalc))+sumTd(stackCell(sumOptGes,null))
        +sumTdH(stackCell(optPerHourCalc.toFixed(1),null),null,'right','l')
        +sumTdH(crOEMcalc,pctStack)+sumTdH(cntPct(sumTw,crTWcalc))+sumTdH(cntPct(sumYes,crYescalc))+sumTdH(cntPct(sumSy+sumMy,crSyMycalc))+sumTdH(cntPct(sumSy,crSYcalc))+sumTdH(cntPct(sumMy,crMYcalc))
        +sumTdH(anteilOEMcalc,pctStack,'right','r')
        +sumTd(stackCell(eur(sumMarge),'€'+Math.round(margeDurchCalc).toLocaleString('de-DE'),'opacity:.75'),null,'right')
        +'<td style="padding:9px 10px"></td>'
        +'</tr>';
      h+='<tr class="perf-avg-row" style="background:var(--s-tint-strong)">'
        +'<td style="padding:9px 10px;font-weight:700;color:#1d1c1a" colspan="2">Ø Durchschnitt</td>'
        +avgTd(decCnt(aktPerHourCalc,rnd1(sumAkt/rowCount)))+avgTd(cntPct(rnd1(sumNotR/rowCount),notRpct))+avgTd(cntPct(rnd1(sumNotP/rowCount),notPpct))+avgTd(cntPct(rnd1(sumNotS/rowCount),notSpct))
        +avgTd(cntPct(rnd1(sumConvOEM/rowCount),anteilOEMcalc))
        +avgTd(cntPct(rnd1(sumUps/rowCount),anteilUpsCalc))+avgTd(cntPct(rnd1(sumWka/rowCount),anteilWkaCalc))+avgTd(stackCell(rnd1(sumOptGes/rowCount),null))
        +avgTdH(stackCell(optPerHourCalc.toFixed(1),null),null,'right','l')
        +avgTdH(crOEMcalc,pctStack)+avgTdH(cntPct(rnd1(sumTw/rowCount),crTWcalc))+avgTdH(cntPct(rnd1(sumYes/rowCount),crYescalc))+avgTdH(cntPct(rnd1((sumSy+sumMy)/rowCount),crSyMycalc))+avgTdH(cntPct(rnd1(sumSy/rowCount),crSYcalc))+avgTdH(cntPct(rnd1(sumMy/rowCount),crMYcalc))
        +avgTdH(anteilOEMcalc,pctStack,'right','r')
        +avgTd(stackCell(eur(sumMarge/rowCount),'€'+Math.round(margeDurchCalc).toLocaleString('de-DE'),'opacity:.75'),null,'right')
        +'<td style="padding:9px 10px"></td>'
        +'</tr>';
    }
    h+='</tbody></table></div>';
  }
  h+='</div>'; // Ende Performance-Karte

  return h;
}

function renderTeam(){
  overviewRenderTarget='team';
  var ma=document.getElementById('mainArea');
  if(!ma)return;
  var days=teamRange||7;
  var customActive=!!(teamCustomFrom&&teamCustomTo);
  var fromBound,toBound;
  if(customActive){fromBound=teamCustomFrom;toBound=teamCustomTo;}
  else{fromBound=addDaysUTC(today(),-days);toBound=today();}
  var periodLabel=customActive?(fd(fromBound)+' – '+fd(toBound)):(days+' Tage');
  function getPerfRange(id,from,to){
    var p=performance[id]||[];
    return p.filter(function(x){return x.date>=from&&x.date<=to;}).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  }
  function teamGetPerf(id){return customActive?getPerfRange(id,fromBound,toBound):getPerf(id,days);}
  var HIDDEN=[];
  var allVisible=activeOrRecentlyEndedEmployees().filter(function(e){return HIDDEN.indexOf(e.role)<0&&!e.isPureCoach;});
  var allVisibleActive=employees.filter(function(e){return e.active!==false&&HIDDEN.indexOf(e.role)<0&&!e.isPureCoach;});
  var inactiveAll=employees.filter(function(e){return e.active===false&&HIDDEN.indexOf(e.role)<0&&!e.isPureCoach;});
  var onboardingEmpsT=allVisibleActive.filter(function(e){return e.phase==='Onboarding'&&e.role!=='VLC';});
  var FDEFS=[
    {key:'ALL',    label:'Alle',       n:allVisibleActive.length},
    {key:'SE',     label:'SE',         n:allVisibleActive.filter(function(e){return e.role==='SE'&&e.phase!=='Onboarding';}).length},
    {key:'SR',     label:'SR',         n:allVisibleActive.filter(function(e){return e.role==='SR'&&e.phase!=='Onboarding';}).length},
    {key:'VLC',    label:'VLC',        n:allVisibleActive.filter(function(e){return e.role==='VLC';}).length},
    {key:'OB',     label:'Onboarding', n:onboardingEmpsT.length},
    {key:'INAKTIV',label:'Inaktiv',    n:inactiveAll.length},
  ];
  var list=teamFilter==='INAKTIV'?inactiveAll:teamFilter==='ALL'?allVisibleActive:teamFilter==='OB'?allVisibleActive.filter(function(e){return e.phase==='Onboarding'&&e.role!=='VLC';}):teamFilter==='VLC'?allVisibleActive.filter(function(e){return e.role==='VLC';}):allVisibleActive.filter(function(e){return e.role===teamFilter&&e.phase!=='Onboarding';});
  var allP=list.map(function(e){return teamGetPerf(e.id);}).reduce(function(a,b){return a.concat(b);},[]);
  function crFromRows(rows,metric){
    var oem=0,notS=0,tw=0,yes=0,sy=0,my=0;
    rows.forEach(function(x){
      oem+=x.convOEM||0;notS+=x.notSuccessful||0;
      tw+=x.convTW||0;yes+=x.convYes||0;sy+=x.convSY||0;my+=x.convMY||0;
    });
    if(metric==='crOEM'){var d=oem+notS;return d>0?(oem/d*100):null;}
    if(metric==='crTeilweise'){var d=tw+yes+sy+my;return d>0?(tw/d*100):null;}
    if(metric==='crSuperYes'){var d=yes+sy+my;return d>0?(sy/d*100):null;}
    if(metric==='crMegaYes'){var d=yes+sy+my;return d>0?(my/d*100):null;}
    return null;
  }
  var totalAlerts=list.reduce(function(a,e){return a+checkAlerts(e.id).length;},0);
  var totalMargin=list.reduce(function(a,e){return a+teamGetPerf(e.id).reduce(function(b,x){return b+(x.margeGesamt||x.margin||0);},0);},0);
  var oem7=crFromRows(allP,'crOEM'),sy7=crFromRows(allP,'crSuperYes'),my7=crFromRows(allP,'crMegaYes');
  // Für Zeitraum-Vergleich: immer auch 7d berechnen (nur relevant im Quick-Filter-Modus)
  var allP7=(!customActive&&days===7)?allP:list.map(function(e){return getPerf(e.id,7);}).reduce(function(a,b){return a.concat(b);},[]);
  var oemD=crFromRows(allP,'crOEM'),syD=crFromRows(allP,'crSuperYes'),myD=crFromRows(allP,'crMegaYes');
  var totalMargin7=(!customActive&&days===7)?totalMargin:list.reduce(function(a,e){return a+getPerf(e.id,7).reduce(function(b,x){return b+(x.margeGesamt||x.margin||0);},0);},0);
  var showTrend=!customActive&&days!==7;
  function delta(vD,v7){
    if(!showTrend||vD===null||v7===null)return null;
    return Math.round(vD)-Math.round(v7);
  }

  function crCell(val,target,dir){
    // dir: 'gte' = gut wenn >= target (grün), 'lte' = gut wenn <= target
    if(val===null)return '<td style="padding:10px 14px;border-bottom:1px solid var(--border);width:95px;min-width:95px;max-width:95px">—</td>';
    var v=Math.round(val);
    var ok=target===null?true:(dir==='lte'?v<=target:v>=target);
    var near=target===null?true:(dir==='lte'?v<=target*1.15:v>=target*0.85);
    var col=target===null
      ?(v>=CR_GOOD?'var(--teal)':v>=45?'var(--amber)':'var(--red)')
      :(ok?'var(--teal)':near?'var(--amber)':'var(--red)');
    return '<td style="padding:10px 14px;border-bottom:1px solid var(--border);width:95px;min-width:95px;max-width:95px">'      +'<span style="font-size:13px;font-weight:600;color:'+col+'">'+v+'%</span>'      +'<div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;position:relative;margin-top:4px">'      +'<div style="height:100%;width:'+Math.min(v,100)+'%;background:'+col+';border-radius:3px"></div>'      +(target?'<div style="position:absolute;top:0;left:'+Math.min(target,100)+'%;height:100%;width:2px;background:rgba(0,0,0,.2)"></div>':'')      +'</div></td>';
  }

  // ── TABLE ROWS ──
  var rows='';
  list.forEach(function(e,rowIdx){
    var c=COLORS[e.color%COLORS.length];
    var r=lastRating(e.id); var rs=r?RS[r]:null;
    var al=checkAlerts(e.id);
    var ep=teamGetPerf(e.id);
    function ea(key){
      var crMetrics={crOEM:1,crTeilweise:1,crSuperYes:1,crMegaYes:1};
      if(crMetrics[key]){
        var oem=0,notS=0,tw=0,yes=0,sy=0,my=0;
        ep.forEach(function(x){
          oem+=x.convOEM||0;notS+=x.notSuccessful||0;
          tw+=x.convTW||0;yes+=x.convYes||0;sy+=x.convSY||0;my+=x.convMY||0;
        });
        if(key==='crOEM'){var d=oem+notS;return d>0?(oem/d*100):null;}
        if(key==='crTeilweise'){var d=tw+yes+sy+my;return d>0?(tw/d*100):null;}
        if(key==='crSuperYes'){var d=yes+sy+my;return d>0?(sy/d*100):null;}
        if(key==='crMegaYes'){var d=yes+sy+my;return d>0?(my/d*100):null;}
      }
      if(key==='optPerH'){var og=ep.reduce(function(a,x){return a+(x.optGesamt||0);},0),hrs=totalWorkHoursForMonth(e,null,ep.map(function(x){return x.date;}));return hrs>0?og/hrs:null;}
      return ep.length?ep.reduce(function(a,x){return a+(x[key]||0);},0)/ep.length:null;
    }
    var em=ep.reduce(function(a,x){return a+(x.margeGesamt||x.margin||0);},0);
    var sCount=(protocols[e.id]||[]).length;
    var tage=tageSeitLetzterSession(e.id);
    var aFarbe=aufmerksamkeitFarbe(tage);
    var _ss=(protocols[e.id]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
    var _ls=_ss[0]||null;
    var lsType=_ls?(_ls.type||'—'):'—';
    var lsTopics=_ls&&_ls.topics&&_ls.topics.length?_ls.topics.slice(0,2).join(', '):'—';

    rows+='<tr style="cursor:pointer;'+(rowIdx%2===1?'background:var(--s-tint);':'')+'" onclick="selectEmp(\''+e.id+'\')">'
      // Mitarbeiter
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;align-items:center;gap:9px">'
      +'<div class="av" style="width:26px;height:26px;font-size:10px;background:'+c.bg+';color:'+c.text+'">'+ini(e.name)+'</div>'
      +'<div><div style="font-weight:500">'+esc(e.name)+(al.length?'<i class="ti ti-alert-triangle" style="font-size:12px;color:var(--amber);margin-left:4px"></i>':'')+'</div>'
      +'<div style="font-size:11px;color:var(--text2)">'+esc(e.phase)+'</div></div></div></td>'
      // CR Spalten
      +crCell(ea('crOEM'),empTargets(e).crOEM.val,empTargets(e).crOEM.dir)
      +crCell(ea('crTeilweise'),empTargets(e).crTeilweise.val,empTargets(e).crTeilweise.dir)
      +crCell(ea('crYes'),empTargets(e).crYes?empTargets(e).crYes.val:null,empTargets(e).crYes?empTargets(e).crYes.dir:'lte')
      +crCell(ea('crSuperYes'),empTargets(e).crSuperYes.val,empTargets(e).crSuperYes.dir)
      +crCell(ea('crMegaYes'),empTargets(e).crMegaYes.val,empTargets(e).crMegaYes.dir)
      // Marge
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border)">'
      +'<div style="font-size:13px;font-weight:600;color:var(--blue)">€'+em.toLocaleString('de-DE')+'</div>'
      +'<div style="font-size:11px;color:var(--text3)">'+days+'d</div></td>'
      // Opt/h
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border)">'+(ea('optPerH')!==null?ea('optPerH').toFixed(1):'—')+'</td>'
      // Alerts
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border)">'+(al.length?'<span style="color:var(--amber);font-weight:600;font-size:12px">⚠ '+al.length+'</span>':'<span style="color:var(--teal)">✓</span>')+'</td>'
      // Sessions
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border);font-weight:600;color:var(--purple)">'+sCount+'</td>'
      // Letzte Session
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border);font-weight:600;color:'+aFarbe+'">'+(tage===null?'Keine':tage===0?'Heute':tage+'d')+'</td>'
      // Art des Coachings
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text2)">'+esc(lsType)+'</td>'
      // Inhalt des Coachings
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text2)">'+esc(lsTopics)+'</td>'
      // Aktion
      +'<td style="padding:10px 14px;border-bottom:1px solid var(--border)"><button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openSessionModal(\''+e.id+'\')"><i class="ti ti-calendar-plus"></i> Planen</button></td>'
      +'</tr>';
  });

  // ── Coaching-Abdeckung: überfällig, Verteilung über Coaches, QA/Session/Sim-Verhältnis ──
  var ueberfaellig=list.filter(function(e){var t=tageSeitLetzterSession(e.id);return t===null||t>30;});
  var coachCounts={}; // coachId -> Anzahl abgeschlossener Sessions im Zeitraum
  var noCoachCount=0;
  list.forEach(function(e){
    (protocols[e.id]||[]).forEach(function(p){
      if(p.status==='geplant')return;
      if(p.date<fromBound||p.date>toBound)return;
      if(p.coachId){coachCounts[p.coachId]=(coachCounts[p.coachId]||0)+1;}
      else{noCoachCount++;}
    });
  });
  var coachEmps=employees.filter(function(e){return (e.role==='SDM'||e.role==='SDC');});
  var coachDistRows=coachEmps.map(function(c){return {name:c.name,n:coachCounts[c.id]||0};});
  if(noCoachCount>0)coachDistRows.push({name:'Ohne Zuordnung (Altdaten)',n:noCoachCount});
  var maxCoachN=Math.max.apply(null,coachDistRows.map(function(x){return x.n;}).concat([1]));

  var coverageHtml='<div class="card" style="margin-bottom:22px">'
    +'<div class="card-title">Coaching-Abdeckung <span style="font-weight:400;color:var(--text3);font-size:11px">· '+(customActive?periodLabel:'letzte '+days+' Tage')+'</span></div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px">';

  // Spalte 1: Überfällig
  coverageHtml+='<div>'
    +'<div class="sec-title" style="margin-bottom:8px">Überfällig <span style="font-weight:400;text-transform:none;letter-spacing:0">(>30 Tage kein Coaching)</span></div>';
  if(!ueberfaellig.length){
    coverageHtml+='<div style="font-size:12px;color:var(--teal-dark);display:flex;align-items:center;gap:6px"><i class="ti ti-check"></i> Niemand überfällig</div>';
  } else {
    coverageHtml+='<div style="display:flex;flex-direction:column;gap:6px">';
    ueberfaellig.slice(0,6).forEach(function(e){
      var t=tageSeitLetzterSession(e.id);
      coverageHtml+='<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">'
        +'<span style="cursor:pointer" onclick="selectEmp(\''+e.id+'\')">'+esc(e.name)+'</span>'
        +'<span style="font-weight:700;color:var(--red)">'+(t===null?'nie':t+'d')+'</span></div>';
    });
    if(ueberfaellig.length>6)coverageHtml+='<div style="font-size:11px;color:var(--text3)">+'+(ueberfaellig.length-6)+' weitere</div>';
    coverageHtml+='</div>';
  }
  coverageHtml+='</div>';

  // Spalte 2: Verteilung über Coaches
  coverageHtml+='<div><div class="sec-title" style="margin-bottom:8px">Verteilung über Coaches</div>';
  if(!coachDistRows.some(function(x){return x.n>0;})){
    coverageHtml+='<div style="font-size:12px;color:var(--text3)">Noch keine zugeordneten Coachings im Zeitraum</div>';
  } else {
    coverageHtml+='<div style="display:flex;flex-direction:column;gap:8px">';
    coachDistRows.forEach(function(r){
      var pct=maxCoachN?Math.round(r.n/maxCoachN*100):0;
      coverageHtml+='<div>'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>'+esc(r.name)+'</span><span style="font-weight:700">'+r.n+'</span></div>'
        +'<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--purple);border-radius:3px"></div></div>'
        +'</div>';
    });
    coverageHtml+='</div>';
  }
  coverageHtml+='</div>';

  // Spalte 3: QA-Calls vs Sessions (gesamt, nicht nur Zeitraum)
  var totQA=0,totSess=0;
  list.forEach(function(e){
    totQA+=(callRatings[e.id]||[]).length;
    totSess+=(protocols[e.id]||[]).filter(function(p){return p.status!=='geplant';}).length;
  });
  var maxRatio=Math.max(totQA,totSess,1);
  coverageHtml+='<div><div class="sec-title" style="margin-bottom:8px">QA-Calls · Sessions <span style="font-weight:400;text-transform:none;letter-spacing:0">(gesamt, Team)</span></div>';
  [{l:'QA-Calls',n:totQA,c:'var(--blue)'},{l:'Sessions',n:totSess,c:'var(--purple)'}].forEach(function(r){
    var pct=Math.round(r.n/maxRatio*100);
    coverageHtml+='<div style="margin-bottom:8px">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>'+r.l+'</span><span style="font-weight:700">'+r.n+'</span></div>'
      +'<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+r.c+';border-radius:3px"></div></div>'
      +'</div>';
  });
  coverageHtml+='</div>';

  // Spalte 4: QA-Bedarf – wer hat konstant schwache QA-Kategorien?
  var bedarfListe=list.map(function(e){return {e:e,weak:qaWeakSpots(e.id,5)};}).filter(function(x){return x.weak.length>0;});
  coverageHtml+='<div><div class="sec-title" style="margin-bottom:8px">QA-Bedarf <span style="font-weight:400;text-transform:none;letter-spacing:0">(konstant schwache Kategorie)</span></div>';
  if(!bedarfListe.length){
    coverageHtml+='<div style="font-size:12px;color:var(--teal-dark);display:flex;align-items:center;gap:6px"><i class="ti ti-check"></i> Keine auffälligen Muster</div>';
  } else {
    coverageHtml+='<div style="display:flex;flex-direction:column;gap:6px">';
    bedarfListe.slice(0,6).forEach(function(x){
      coverageHtml+='<div style="font-size:12px;cursor:pointer" onclick="selectEmp(\''+x.e.id+'\')">'
        +'<span style="font-weight:600">'+x.e.name+'</span>'
        +'<div style="font-size:11px;color:var(--red)">'+x.weak.map(function(w){return w.label;}).join(', ')+'</div></div>';
    });
    if(bedarfListe.length>6)coverageHtml+='<div style="font-size:11px;color:var(--text3)">+'+(bedarfListe.length-6)+' weitere</div>';
    coverageHtml+='</div>';
  }
  coverageHtml+='</div>';

  // Spalte 5: QA-Bewertungen fällig – Ziel: mind. 5 bewertete Calls pro 60 Tage
  var qaCutoff60=addDaysUTC(today(),-60);
  var qaDueListe=list.map(function(e){
    var cnt=(callRatings[e.id]||[]).filter(function(r){return r.date>=qaCutoff60;}).length;
    return {e:e,cnt:cnt};
  }).filter(function(x){return x.cnt<5;}).sort(function(a,b){return a.cnt-b.cnt;});
  coverageHtml+='<div><div class="sec-title" style="margin-bottom:8px">QA-Bewertungen fällig <span style="font-weight:400;text-transform:none;letter-spacing:0">(Ziel: 4 / Woche)</span></div>';
  if(!qaDueListe.length){
    coverageHtml+='<div style="font-size:12px;color:var(--teal-dark);display:flex;align-items:center;gap:6px"><i class="ti ti-check"></i> Alle im Ziel</div>';
  } else {
    coverageHtml+='<div style="display:flex;flex-direction:column;gap:6px">';
    qaDueListe.slice(0,6).forEach(function(x){
      var col=x.cnt===0?'var(--red)':'var(--amber-dark)';
      coverageHtml+='<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">'
        +'<span style="cursor:pointer" onclick="selectEmp(\''+x.e.id+'\')">'+x.e.name+'</span>'
        +'<span style="font-weight:700;color:'+col+'">'+x.cnt+'/5</span></div>';
    });
    if(qaDueListe.length>6)coverageHtml+='<div style="font-size:11px;color:var(--text3)">+'+(qaDueListe.length-6)+' weitere</div>';
    coverageHtml+='</div>';
  }
  coverageHtml+='</div>';

  coverageHtml+='</div></div>';

  // ── RENDER ──
  var _prevContentEl=ma.querySelector('.content');
  var _prevScrollTop=_prevContentEl?_prevContentEl.scrollTop:0;
  ma.innerHTML=''
    +'<div class="content">'
    +(wiegandView==='team'?(''
    +zielInfoBoxHtml()
    // KPI Kacheln (reiches Format wie Coaching Sessions: Trend-Pfeil + Sparkline)
    +(function(){
      var oemOk2=KPI_TARGETS.crOEM.dir==='lte'?(oemD!==null&&oemD<=KPI_TARGETS.crOEM.val):(oemD!==null&&oemD>=KPI_TARGETS.crOEM.val);var oemCol=oemD!==null&&oemOk2?'#F08566':'var(--amber-dark)';
      function teamDailySeries(key,n,mode){
        var crMetrics={crOEM:1,crTeilweise:1,crSuperYes:1,crMegaYes:1};
        if(crMetrics[key]){
          var byDateRaw={};
          allP.forEach(function(r){
            if(!byDateRaw[r.date])byDateRaw[r.date]={oem:0,notS:0,tw:0,yes:0,sy:0,my:0};
            var b=byDateRaw[r.date];
            b.oem+=r.convOEM||0;b.notS+=r.notSuccessful||0;
            b.tw+=r.convTW||0;b.yes+=r.convYes||0;b.sy+=r.convSY||0;b.my+=r.convMY||0;
          });
          var dates2=Object.keys(byDateRaw).sort();
          var series2=dates2.map(function(d){
            var b=byDateRaw[d];
            if(key==='crOEM'){var den=b.oem+b.notS;return den>0?b.oem/den*100:null;}
            if(key==='crTeilweise'){var den=b.tw+b.yes+b.sy+b.my;return den>0?b.tw/den*100:null;}
            if(key==='crSuperYes'){var den=b.yes+b.sy+b.my;return den>0?b.sy/den*100:null;}
            if(key==='crMegaYes'){var den=b.yes+b.sy+b.my;return den>0?b.my/den*100:null;}
            return null;
          }).filter(function(v){return v!==null;});
          return series2.slice(-(n||7));
        }
        var byDate={};
        allP.forEach(function(r){if(!byDate[r.date])byDate[r.date]=[];if(r[key]!==undefined&&r[key]!==null)byDate[r.date].push(r[key]);});
        var dates=Object.keys(byDate).sort();
        var series=dates.map(function(d){
          var arr=byDate[d];if(!arr.length)return null;
          if(mode==='sum')return arr.reduce(function(a,b){return a+b;},0);
          return arr.reduce(function(a,b){return a+b;},0)/arr.length;
        }).filter(function(v){return v!==null;});
        return series.slice(-(n||7));
      }
      function trendArrowCol(d){
        if(d===null||d===undefined)return {arrow:'',col:'var(--text3)'};
        return {arrow:d>0?'↑':d<0?'↓':'→',col:d>0?'var(--teal-dark)':d<0?'var(--red)':'var(--text2)'};
      }
      function tile(label,col,wert,unterzeile1,unterzeile2,spark){
        return '<div class="card" style="padding:12px 14px;margin-bottom:0">'
          +'<div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.04em;margin-bottom:4px">'+label+'</div>'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">'
          +wert
          +sparkline(spark,col,54,26)
          +'</div>'
          +'<div style="font-size:11px;color:var(--text3)">'+unterzeile1+'</div>'
          +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+unterzeile2+'</div>'
          +'</div>';
      }
      var oemVal=oemD!==null?Math.round(oemD)+'%':'—';
      var syVal=syD!==null?Math.round(syD)+'%':'—';
      var myVal=myD!==null?Math.round(myD)+'%':'—';
      var dOEM=showTrend&&oemD!==null&&crFromRows(allP7,'crOEM')!==null?Math.round(oemD)-Math.round(crFromRows(allP7,'crOEM')):null;
      var dSY=showTrend&&syD!==null&&crFromRows(allP7,'crSuperYes')!==null?Math.round(syD)-Math.round(crFromRows(allP7,'crSuperYes')):null;
      var dMY=showTrend&&myD!==null&&crFromRows(allP7,'crMegaYes')!==null?Math.round(myD)-Math.round(crFromRows(allP7,'crMegaYes')):null;
      var dMargin=showTrend?(totalMargin-totalMargin7):null;
      var twD=crFromRows(allP,'crTeilweise');
      var twTarget=KPI_TARGETS.crTeilweise?KPI_TARGETS.crTeilweise.val:25;
      var twDir=KPI_TARGETS.crTeilweise?KPI_TARGETS.crTeilweise.dir:'lte';
      var twOk=twD!==null&&(twDir==='lte'?twD<=twTarget:twD>=twTarget);
      var twFarbe=twD!==null?(twOk?'#F08566':'var(--red)'):'var(--amber-dark)';
      var twVal=twD!==null?Math.round(twD)+'%':'—';
      var dTW=showTrend&&twD!==null&&crFromRows(allP7,'crTeilweise')!==null?Math.round(twD)-Math.round(crFromRows(allP7,'crTeilweise')):null;
      var syTarget=KPI_TARGETS.crSuperYes.val;
      var myTarget=KPI_TARGETS.crMegaYes.val;
      var syOk=syD!==null&&(KPI_TARGETS.crSuperYes.dir==='lte'?syD<=syTarget:syD>=syTarget);
      var myOk=myD!==null&&(KPI_TARGETS.crMegaYes.dir==='lte'?myD<=myTarget:myD>=myTarget);
      var syFarbe=syD!==null?(syOk?'#F08566':'var(--red)'):'#F59A5B';
      var myFarbe=myD!==null?(myOk?'#F08566':'var(--red)'):'#F7B39A';
      var tOEM=trendArrowCol(dOEM),tTW=trendArrowCol(dTW),tSY=trendArrowCol(dSY),tMY=trendArrowCol(dMY),tMG=trendArrowCol(dMargin);
      function valArrow(val,t,col2){
        return '<div style="display:flex;align-items:baseline;gap:6px"><div style="font-size:20px;font-weight:700;color:'+col2+'">'+val+'</div><div style="font-size:13px;font-weight:700;color:'+t.col+'">'+t.arrow+'</div></div>';
      }
      var html5='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px">';
      html5+=tile('TEAM CR OEM',oemCol,valArrow(oemVal,tOEM,oemCol),'Ziel ≥ '+CR_GOOD+'%'+(oemD!==null?(oemOk2?' ✓':' ↓'):''),(showTrend?'Vormonat: '+(crFromRows(allP7,'crOEM')!==null?Math.round(crFromRows(allP7,'crOEM'))+'%':'—'):'\u00A0'),teamDailySeries('crOEM',7));
      html5+=tile('TEAM TW',twFarbe,valArrow(twVal,tTW,twFarbe),'Ziel '+(twDir==='gte'?'≥':'≤')+twTarget+'%'+(twD!==null?(twOk?' ✓':' ↓'):''),(showTrend?'Vormonat: '+(crFromRows(allP7,'crTeilweise')!==null?Math.round(crFromRows(allP7,'crTeilweise'))+'%':'—'):'\u00A0'),teamDailySeries('crTeilweise',7));
      html5+=tile('TEAM SY',syFarbe,valArrow(syVal,tSY,syFarbe),'Ziel '+(KPI_TARGETS.crSuperYes.dir==='gte'?'≥':'≤')+syTarget+'%'+(syD!==null?(syOk?' ✓':' ↓'):''),(showTrend?'Vormonat: '+(crFromRows(allP7,'crSuperYes')!==null?Math.round(crFromRows(allP7,'crSuperYes'))+'%':'—'):'\u00A0'),teamDailySeries('crSuperYes',7));
      html5+=tile('TEAM MY',myFarbe,valArrow(myVal,tMY,myFarbe),'Ziel '+(KPI_TARGETS.crMegaYes.dir==='gte'?'≥':'≤')+myTarget+'%'+(myD!==null?(myOk?' ✓':' ↓'):''),(showTrend?'Vormonat: '+(crFromRows(allP7,'crMegaYes')!==null?Math.round(crFromRows(allP7,'crMegaYes'))+'%':'—'):'\u00A0'),teamDailySeries('crMegaYes',7));
      html5+=tile('MARGE','#F7B39A',valArrow('€'+totalMargin.toLocaleString('de-DE'),tMG,'#F7B39A'),periodLabel+' gesamt',(showTrend?'Vormonat: €'+totalMargin7.toLocaleString('de-DE'):'\u00A0'),teamDailySeries('margeGesamt',7,'sum'));
      html5+='</div>';
      return html5;
    })()
    // Team Performance Trend Chart (inkl. kombinierter Filter-Zeile)
    +(function(){
      var TMETRICS=[
        {k:'margeGesamt',l:'Marge Gesamt',c:'#F08566'},
        {k:'oem_aktivitaeten',l:'Aktivitäten',c:'#F08566'},
        {k:'optGesamt',  l:'Opt. Gesamt', c:'#F08566'},
        {k:'convOEM',    l:'Opt. OEM',    c:'#F08566'},
        {k:'ups_yes',    l:'Opt. Upsell', c:'#F08566'},
        {k:'wka_gesamt_yes',        l:'Opt. WKA',    c:'#F08566'},
        {k:'crOEM',      l:'CR Ges.',      c:'#F08566'},
        {k:'crTeilweise',l:'CR TW',       c:'#F08566'},
        {k:'crYes',      l:'CR Yes',      c:'#F08566'},
        {k:'crSuperYes', l:'CR SY',       c:'#F08566'},
        {k:'crMegaYes',  l:'CR MY',       c:'#F08566'},
      ];
      var s='<div class="card" style="margin-bottom:22px">';
      s+='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px">';
      s+='<div class="card-title" style="margin:0">Team Performance Trend</div>';
      // Filter-Zeile: Team-Auswahl → KPI → Zeitraum-Schnellwahl → Von-Bis (rechtsbündig, gleiche Höhe wie Titel)
      s+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">';
      s+='<select onchange="setTeamFilter(this.value)" style="width:auto;height:34px;font-size:12px;font-weight:500;padding:0 12px;border:1px solid var(--border2);border-radius:var(--r-md);background:var(--bg);color:var(--text);cursor:pointer">';
      FDEFS.forEach(function(fd){
        if(!fd.n&&fd.key!=='ALL')return;
        s+='<option value="'+fd.key+'"'+(teamFilter===fd.key?' selected':'')+'>'+(fd.key==='ALL'?'Anzeigen: Alle':fd.label)+' ('+fd.n+')</option>';
      });
      s+='</select>';
      s+='<select onchange="setTeamMetric(this.value)" style="width:auto;height:34px;font-size:12px;font-weight:500;padding:0 12px;border:1px solid var(--border2);border-radius:var(--r-md);background:var(--bg);color:var(--text);cursor:pointer">';
      TMETRICS.forEach(function(it){
        s+='<option value="'+it.k+'"'+(teamPerfMetric===it.k?' selected':'')+'>'+it.l+'</option>';
      });
      s+='</select>';
      s+='<div style="display:flex;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;height:34px">';
      [7,14,30,90].forEach(function(dd){
        s+='<button style="padding:0 14px;height:100%;font-size:12px;font-weight:500;border:none;cursor:pointer;font-family:inherit;background:'+(!customActive&&days===dd?'var(--purple)':'transparent')+';color:'+(!customActive&&days===dd?'#fff':'var(--text2)')+'" onclick="setTeamRange('+dd+')">'+dd+' Tage</button>';
      });
      s+='</div>';
      s+='<div style="display:flex;align-items:center;gap:6px;padding:0 10px;height:34px;border:1px solid '+(customActive?'var(--purple)':'var(--border2)')+';border-radius:var(--r-md);background:'+(customActive?'var(--purple-bg)':'transparent')+'">';
      s+='<span style="font-size:11px;color:var(--text2)">Von</span>';
      s+='<input type="date" id="teamFromDate" value="'+(teamCustomFrom||'')+'" style="border:none;background:transparent;font-size:12px;font-family:inherit;color:var(--text);padding:0;width:112px">';
      s+='<span style="font-size:11px;color:var(--text2)">Bis</span>';
      s+='<input type="date" id="teamToDate" value="'+(teamCustomTo||'')+'" style="border:none;background:transparent;font-size:12px;font-family:inherit;color:var(--text);padding:0;width:112px">';
      s+='<button class="btn btn-sm'+(customActive?' btn-primary':'')+'" style="padding:4px 8px" onclick="applyTeamCustomRange()"><i class="ti ti-check"></i></button>';
      s+=(customActive?'<button class="btn btn-sm" style="padding:4px 8px" onclick="clearTeamCustomRange()" title="Custom-Zeitraum zurücksetzen"><i class="ti ti-x"></i></button>':'');
      s+='</div>';
      s+='</div>';
      s+='</div>';
      s+='<div style="height:280px;position:relative"><canvas id="teamPerfChart"></canvas></div></div>';
      return s;
    })()
    // ── Alert Banner + Coaching-Abdeckung + SFP Performance Tabelle (alles unter Team) ──
    // Alert Banner
    +(totalAlerts>0?'<div class="alert alert-warn" style="margin-bottom:18px"><i class="ti ti-alert-triangle" style="font-size:18px;color:var(--amber);flex-shrink:0"></i><div><div style="font-size:13px;font-weight:600;color:var(--amber-dark)">'+totalAlerts+' Performance-Alert'+(totalAlerts!==1?'s':'')+' im Team</div><div style="font-size:12px;color:var(--amber-dark)">'+list.filter(function(e){return checkAlerts(e.id).length>0;}).map(function(e){return e.name;}).join(', ')+'</div></div></div>':'')
    +'<div class="card">'
    +'<div class="card-title"><i class="ti ti-table"></i> SFP Performance <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· CR als % aller Gespräche · Gut ≥ '+CR_GOOD+'%'+(showTrend?' · Pfeil = Trend vs. 7-Tage-Ø':'')+'</span></div>'
    +'<div style="overflow-x:auto;border-radius:var(--r-md);border:1px solid var(--border2)"><table style="width:100%;border-collapse:collapse"><thead><tr>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);min-width:160px">Mitarbeiter</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);width:105px;min-width:105px">CR OEM</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);width:95px;min-width:95px">TW</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);width:95px;min-width:95px">Yes</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);width:95px;min-width:95px">SY</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);width:95px;min-width:95px">MY</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Marge</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Opt./h</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Alerts</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Sessions</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Letzte Session</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Art des Coachings</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Inhalt des Coachings</th>'
    +'<th style="background:#EFECE5;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2)">Aktion</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'</div>'
    ):(wiegandView==='ziel'?zielTreeHtml():(wiegandView==='performance'?buildOverviewTab(allVisible,'performance'):buildOverviewTab(allVisible))))
    +'</div>';
  var _newContentEl=ma.querySelector('.content');
  if(_newContentEl&&_prevScrollTop)_newContentEl.scrollTop=_prevScrollTop;
  // ── Team Performance Trend Chart.js ──
  window._teamChartData=null;
  (function(allRows,metric,days,kpiTargets){
    var mMap={
      crOEM:      {f:'crOEM',      l:'CR OEM %', c:'#F08566'},
      crTeilweise:{f:'crTeilweise',l:'CR TW %',  c:'#F08566'},
      crYes:      {f:'crYes',      l:'CR Yes %', c:'#F08566'},
      crSuperYes: {f:'crSuperYes', l:'CR SY %',  c:'#F08566'},
      crMegaYes:  {f:'crMegaYes',  l:'CR MY %',  c:'#F08566'},
      oem_aktivitaeten:{f:'oem_aktivitaeten',l:'Aktivitäten',c:'#F08566'},
      optGesamt:  {f:'optGesamt',  l:'Opt. Gesamt',c:'#F08566'},
      convOEM:    {f:'convOEM',    l:'Opt. OEM', c:'#F08566'},
      ups_yes:    {f:'ups_yes',    l:'Opt. Upsell',c:'#F08566'},
      wka_gesamt_yes:        {f:'wka_gesamt_yes',        l:'Opt. WKA', c:'#F08566'},
      margeGesamt:{f:'margeGesamt',l:'Marge Gesamt €',  c:'#F08566'}
    };
    var m=mMap[metric]||mMap.crOEM;
    if(!allRows||!allRows.length){return;}
    var byDate={};
    allRows.forEach(function(row){
      if(!byDate[row.date])byDate[row.date]=[];
      var v=row[m.f];
      if(v!==undefined&&v!==null)byDate[row.date].push(v);
    });
    var dates=Object.keys(byDate).sort();
    if(!dates.length){return;}
    var labels=dates.map(function(d){return fd(d);});
    var tKeys={crOEM:'crOEM',crTeilweise:'crTeilweise',crYes:'crYes',crSuperYes:'crSuperYes',crMegaYes:'crMegaYes'};
    var tk=tKeys[metric];
    var target=tk&&kpiTargets[tk]?kpiTargets[tk].val:null;
    var yScales={
      crOEM:{min:0,max:100,step:20},crTeilweise:{min:0,max:100,step:20},
      crYes:{min:0,max:100,step:20},crSuperYes:{min:0,max:100,step:20},
      crMegaYes:{min:0,max:100,step:20},oem_aktivitaeten:{min:0,max:300,step:50},
      optGesamt:{min:0,max:50,step:10},convOEM:{min:0,max:50,step:10},
      ups_yes:{min:0,max:30,step:5},wka_gesamt_yes:{min:0,max:15,step:5},
      margeGesamt:{min:0,max:5000,step:1000}
    };
    var yS=yScales[metric]||{min:0,max:100,step:20};
    var datasets;
    if(metric==='crOEM'){
      var byDateRaw={};
      allRows.forEach(function(row){
        if(!byDateRaw[row.date])byDateRaw[row.date]={oem:0,nerrOem:0,ups:0,nerrUps:0,wka:0,nerrWkaOem:0,nerrWkaUps:0,wkaOemBeendet:0,wkaUpsBeendet:0};
        var b=byDateRaw[row.date];
        b.oem+=row.convOEM||0; b.nerrOem+=row.notSuccessful||0;
        b.ups+=row.ups_yes||0; b.nerrUps+=row.upsNichtErfolgreich||0;
        b.wka+=row.wka_gesamt_yes||0; b.nerrWkaOem+=row.wkaOemNichtErfolgreich||0; b.nerrWkaUps+=row.wkaUpsNichtErfolgreich||0;
        b.wkaOemBeendet+=row.wkaOemBeendet||0; b.wkaUpsBeendet+=row.wkaUpsBeendet||0;
      });
      var bdVals=dates.map(function(d){
        var b=byDateRaw[d];
        var oemD=b.oem+b.nerrOem, upsD=b.ups+b.nerrUps, wkaFail=b.nerrWkaOem+b.wkaOemBeendet+b.nerrWkaUps+b.wkaUpsBeendet;
        var optGesTotal=b.oem+b.ups+b.wka, gesFail=b.nerrOem+b.nerrUps+b.nerrWkaOem+b.nerrWkaUps;
        return {
          gesamt:(optGesTotal+gesFail)>0?+(optGesTotal/(optGesTotal+gesFail)*100).toFixed(1):null,
          oem:oemD>0?+(b.oem/oemD*100).toFixed(1):null,
          ups:upsD>0?+(b.ups/upsD*100).toFixed(1):null,
          wka:(b.wka+wkaFail)>0?+(b.wka/(b.wka+wkaFail)*100).toFixed(1):null
        };
      });
      datasets=[
        {label:'CR Gesamt',data:bdVals.map(function(v){return v.gesamt;}),borderColor:'#1d1c1a',backgroundColor:'#0c3b4022',fill:false,tension:0.35,pointRadius:dates.length<=10?4:2,pointBackgroundColor:'#1d1c1a',borderWidth:2,order:1},
        {label:'CR OEM',data:bdVals.map(function(v){return v.oem;}),borderColor:'#F08566',backgroundColor:'#206A7222',fill:false,tension:0.35,pointRadius:dates.length<=10?4:2,pointBackgroundColor:'#F08566',borderWidth:2,order:1},
        {label:'CR Upsells',data:bdVals.map(function(v){return v.ups;}),borderColor:'#F08566',backgroundColor:'#4A90A422',fill:false,tension:0.35,pointRadius:dates.length<=10?4:2,pointBackgroundColor:'#F08566',borderWidth:2,order:1},
        {label:'CR WKA',data:bdVals.map(function(v){return v.wka;}),borderColor:'#F0B8A8',backgroundColor:'#8FBFC722',fill:false,tension:0.35,pointRadius:dates.length<=10?4:2,pointBackgroundColor:'#F0B8A8',borderWidth:2,order:1}
      ];
    } else {
      var vals=dates.map(function(d){
        var arr=byDate[d];
        if(!arr.length)return null;
        return +(arr.reduce(function(a,b){return a+b;},0)/arr.length).toFixed(1);
      });
      datasets=[{
        label:m.l,data:vals,borderColor:m.c,backgroundColor:m.c+'22',
        fill:true,tension:0.35,pointRadius:dates.length<=10?4:2,
        pointBackgroundColor:m.c,borderWidth:2,order:1
      }];
    }
    if(target!==null){
      datasets.push({
        label:'Ziel ('+target+')',
        data:dates.map(function(){return target;}),
        borderColor:'#3a3833',borderDash:[5,4],borderWidth:1.5,
        pointRadius:0,fill:false,order:2
      });
    }
    window._teamChartData={labels:labels,datasets:datasets,yS:yS};
  })(allP, teamPerfMetric, teamRange||7, KPI_TARGETS);

  setTimeout(function(){
    if(!window._teamChartData)return;
    var d=window._teamChartData;
    var canvas=document.getElementById('teamPerfChart');
    if(!canvas)return;
    if(canvas._ci){try{canvas._ci.destroy();}catch(e){}}
    if(d.datasets[0])d.datasets[0].backgroundColor=vGradient(canvas,d.datasets[0].borderColor,0.55,0.05);
    canvas._ci=new Chart(canvas,{
      type:'line',
      data:{labels:d.labels,datasets:d.datasets},
      options:{
        responsive:true,
        resizeDelay:200,
        maintainAspectRatio:false,
        animation:CHART_DRAWIN_ANIMATION,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{display:true,position:'top',labels:{font:{size:11},boxWidth:20,padding:12}},
          tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+formatMetricValue(teamPerfMetric,ctx.parsed.y);}}}
        },
        scales:{
          x:{ticks:{font:{size:11},maxTicksLimit:12},grid:{display:false}},
          y:{min:d.yS.min,max:d.yS.max,ticks:{font:{size:11},stepSize:d.yS.step},grid:{color:'rgba(0,0,0,0.05)'}}
        }
      }
    });
    reapplyChartGradient(canvas._ci,canvas,0.55,0.05);
    if(overviewEmpDropdownOpen&&overviewEmpSearchQuery)filterOverviewEmpList(overviewEmpSearchQuery);
  },150);
  setTimeout(function(){
    if(window._zielFocusNextId){
      var nextEl=document.getElementById(window._zielFocusNextId);
      if(nextEl){nextEl.focus();nextEl.select();}
      window._zielFocusNextId=null;
    }
    if(window._overviewEmpScrollTop!=null){
      var scrollElAfter=document.getElementById('overviewEmpScrollList');
      if(scrollElAfter)scrollElAfter.scrollTop=window._overviewEmpScrollTop;
      window._overviewEmpScrollTop=null;
    }
  },150);
}
