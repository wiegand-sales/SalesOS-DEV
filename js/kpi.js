// Sales OS – Kennzahlen: CR, Arbeitszeiten, Ziele, Feiertage
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

// Coach-Wirksamkeit: für jede abgeschlossene Session mit Coach + Ziel-KPI wird die
// Ø-Veränderung 14 Tage vor vs. nach der Session berechnet (in Zielrichtung normalisiert:
// positiv = Bewegung Richtung Ziel, unabhängig davon ob das KPI "mind." oder "max." ist).
// KPI über einen Zeitraum richtig berechnen (CR-Quoten aus den Summen, Opt./Std. über die Arbeitszeit, Rest als Tagesmittel)
function perfKpiWin(emp,rows,key){if(!rows||!rows.length)return null;var S=function(f){return rows.reduce(function(a,p){return a+(+p[f]||0);},0);};
  var oem=S('convOEM'),notS=S('notSuccessful'),tw=S('convTW'),yes=S('convYes'),sy=S('convSY'),my=S('convMY'),q=yes+sy+my;
  if(key==='crOEM')return (oem+notS)>0?oem/(oem+notS)*100:null;
  if(key==='crTeilweise')return (tw+q)>0?tw/(tw+q)*100:null;
  if(key==='crYes')return q>0?yes/q*100:null;
  if(key==='crSuperYes')return q>0?sy/q*100:null;
  if(key==='crMegaYes')return q>0?my/q*100:null;
  if(key==='optPerH'){var seen={},h=0;rows.forEach(function(p){if(!seen[p.date]){seen[p.date]=1;h+=(emp&&typeof workHoursForDate==='function')?(workHoursForDate(emp,p.date)||0):0;}});var o=rows.reduce(function(a,p){return a+(+p.optGesamt||((+p.convOEM||0)+(+p.ups_yes||0)+(+p.wka_gesamt_yes||0)));},0);return h>0?o/h:null;}
  var vals=rows.map(function(p){return p[key];}).filter(function(v){return v!==undefined&&v!==null;});return vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:null;}
function isoWeekOf(d){
  var dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  var dayNum=(dt.getUTCDay()+6)%7;
  dt.setUTCDate(dt.getUTCDate()-dayNum+3);
  var firstThursday=new Date(Date.UTC(dt.getUTCFullYear(),0,4));
  var week=1+Math.round(((dt-firstThursday)/86400000-3+((firstThursday.getUTCDay()+6)%7))/7);
  return {year:dt.getUTCFullYear(),week:week};
}
// Alle ISO-Kalenderwochen eines Jahres (Mo-So), inkl. korrekter Randbehandlung an Jahresgrenzen
function buildYearWeeksForChart(year){
  var jan4=new Date(Date.UTC(year,0,4)); // 4. Januar liegt laut ISO 8601 immer in KW1
  var dow=jan4.getUTCDay()||7;
  var monday=new Date(jan4);monday.setUTCDate(jan4.getUTCDate()-(dow-1));
  var weeks=[];
  var cur=new Date(monday);
  for(var i=0;i<54;i++){
    var iw=isoWeekOf(cur);
    if(iw.year!==year)break;
    var sunday=new Date(cur);sunday.setUTCDate(cur.getUTCDate()+6);
    weeks.push({kw:iw.week,from:cur.toISOString().slice(0,10),to:sunday.toISOString().slice(0,10)});
    cur.setUTCDate(cur.getUTCDate()+7);
  }
  return weeks;
}
// Monate des Jahres fuer den Trend-Chart (12 Perioden)
function buildYearMonthsForChart(year){
  var mNamesShort=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  var months=[];
  for(var m=0;m<12;m++){
    var from=new Date(Date.UTC(year,m,1));
    var to=new Date(Date.UTC(year,m+1,0));
    months.push({label:mNamesShort[m],from:from.toISOString().slice(0,10),to:to.toISOString().slice(0,10)});
  }
  return months;
}
// Tage des aktuellen Monats fuer den Trend-Chart (ca. 28-31 Perioden)
function buildMonthDaysForChart(year){
  var todayD=new Date(today()+'T00:00:00Z');
  var m=todayD.getUTCMonth();
  var daysInMonth=new Date(Date.UTC(year,m+1,0)).getUTCDate();
  var days=[];
  for(var d=1;d<=daysInMonth;d++){
    var ds=new Date(Date.UTC(year,m,d)).toISOString().slice(0,10);
    days.push({label:('0'+d).slice(-2)+'.',from:ds,to:ds});
  }
  return days;
}
// Liefert je nach overviewChartGroup die passenden Perioden mit einheitlichem {label,from,to}
function buildChartPeriods(group,year){
  if(group==='day')return buildMonthDaysForChart(year).map(function(p){return {label:p.label,from:p.from,to:p.to};});
  if(group==='month')return buildYearMonthsForChart(year).map(function(p){return {label:p.label,from:p.from,to:p.to};});
  return buildYearWeeksForChart(year).map(function(p){return {label:'KW '+p.kw,from:p.from,to:p.to};});
}
// Rohzahlen-Summen (ueber eine Mitarbeiterliste) fuer einen Datumsbereich - Basis fuer den Jahres-Trendchart
function chartSumsForRange(liste,from,to){
  var s={akt:0,ne:0,nm:0,nerr:0,oem:0,ups:0,wka:0,margeOEM:0,margeUps:0,margeWka:0,margeGes:0,
         tw:0,yes:0,sy:0,my:0,nerrOem:0,nerrUps:0,nerrWkaOem:0,nerrWkaUps:0,wkaOemBeendet:0,wkaUpsBeendet:0};
  liste.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if(!x.date||x.date<from||x.date>to)return;
      s.akt+=x.gesamtAktivitaeten!=null?x.gesamtAktivitaeten:0;
      s.ne+=x.gesamtNichtErreicht!=null?x.gesamtNichtErreicht:0;
      s.nm+=x.gesamtNichtMoeglich!=null?x.gesamtNichtMoeglich:0;
      s.nerr+=x.gesamtNichtErfolgreich!=null?x.gesamtNichtErfolgreich:0;
      s.oem+=x.convOEM||0; s.ups+=x.ups_yes||0; s.wka+=x.wka_gesamt_yes||0;
      s.margeOEM+=x.margeOEM||0; s.margeUps+=x.margeUpsell||0; s.margeWka+=x.margeWKA||0;
      s.margeGes+=x.margeGesamt||x.margin||0;
      s.tw+=x.convTW||0; s.yes+=x.convYes||0; s.sy+=x.convSY||0; s.my+=x.convMY||0;
      s.nerrOem+=x.notSuccessful||0;
      s.nerrUps+=x.upsNichtErfolgreich||0; s.nerrWkaOem+=x.wkaOemNichtErfolgreich||0; s.nerrWkaUps+=x.wkaUpsNichtErfolgreich||0;
      s.wkaOemBeendet+=x.wkaOemBeendet||0; s.wkaUpsBeendet+=x.wkaUpsBeendet||0;
    });
  });
  return s;
}
function chartCrFromSums(kind,s){
  var denomOEM=s.oem+s.nerrOem, denomRest=s.yes+s.sy+s.my;
  if(kind==='crOEM')return denomOEM>0?s.oem/denomOEM*100:null;
  if(kind==='crTeilweise')return (s.tw+denomRest)>0?s.tw/(s.tw+denomRest)*100:null;
  if(kind==='crYes')return denomRest>0?s.yes/denomRest*100:null;
  if(kind==='crSyMy')return denomRest>0?(s.sy+s.my)/denomRest*100:null;
  if(kind==='crSuperYes')return denomRest>0?s.sy/denomRest*100:null;
  if(kind==='crMegaYes')return denomRest>0?s.my/denomRest*100:null;
  return null;
}
function groupPerfRows(rows,mode){
  if(mode==='day')return rows.map(function(r){return {label:fd(r.date),key:r.date,count:1,row:r,dates:[r.date]};});
  var groups={},order=[];
  rows.forEach(function(r){
    var d=new Date(r.date+'T00:00:00'),key,label;
    if(mode==='week'){
      var iw=isoWeekOf(d);
      key=iw.year+'-W'+(iw.week<10?'0':'')+iw.week;
      label='KW '+iw.week+' · '+iw.year;
    } else {
      key=r.date.slice(0,7);
      var mNames=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
      label=mNames[d.getMonth()]+' '+d.getFullYear();
    }
    if(!groups[key]){groups[key]={label:label,items:[]};order.push(key);}
    groups[key].items.push(r);
  });
  var sumFields=['oem_aktivitaeten','calls','notReached','notPossible','notSuccessful','convOEM','convTW','convYes','convSY','convMY','ups_yes','wka_gesamt_yes','optGesamt','margeGesamt','margin','margeOEM','margeUpsell','margeWKA','gesamtAktivitaeten','gesamtNichtErreicht','gesamtNichtMoeglich','gesamtNichtErfolgreich','upsNichtErfolgreich','wkaOemNichtErfolgreich','wkaUpsNichtErfolgreich','wkaOemBeendet','wkaUpsBeendet'];
  var avgFields=[]; // Quoten werden immer aus Rohzahlen berechnet, keine gespeicherten Prozentwerte mehr
  return order.sort().reverse().map(function(key){
    var g=groups[key],agg={};
    sumFields.forEach(function(f){agg[f]=g.items.reduce(function(a,x){return a+(x[f]||0);},0);});
    avgFields.forEach(function(f){
      var vals=g.items.map(function(x){return x[f];}).filter(function(v){return v!==undefined&&v!==null;});
      agg[f]=vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:0;
    });
    return {label:g.label,key:key,count:g.items.length,row:agg,dates:g.items.map(function(x){return x.date;})};
  });
}
function empGetPerf(id){
  if(perfCustomFrom&&perfCustomTo){
    var p=performance[id]||[];
    return p.filter(function(x){return x.date>=perfCustomFrom&&x.date<=perfCustomTo;}).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  }
  return getPerf(id,perfRange);
}

// ── HELPERS ──
// ── Zielvereinbarung: Feiertagsberechnung Bayern (Gauss-Osterformel + fixe/bewegliche Feiertage) ──
function easterSundayUTC(year){
  var a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,
      f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
      i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
      month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(Date.UTC(year,month-1,day));
}
function addUTCDaysToDate(d,n){var r=new Date(d);r.setUTCDate(r.getUTCDate()+n);return r;}
function bayernFeiertage(year){
  var ostern=easterSundayUTC(year);
  var liste=[
    {d:new Date(Date.UTC(year,0,1)),n:'Neujahr'},
    {d:new Date(Date.UTC(year,0,6)),n:'Heilige Drei Könige'},
    {d:addUTCDaysToDate(ostern,-2),n:'Karfreitag'},
    {d:addUTCDaysToDate(ostern,1),n:'Ostermontag'},
    {d:new Date(Date.UTC(year,4,1)),n:'Tag der Arbeit'},
    {d:addUTCDaysToDate(ostern,39),n:'Christi Himmelfahrt'},
    {d:addUTCDaysToDate(ostern,50),n:'Pfingstmontag'},
    {d:addUTCDaysToDate(ostern,60),n:'Fronleichnam'},
    {d:new Date(Date.UTC(year,7,15)),n:'Mariä Himmelfahrt'},
    {d:new Date(Date.UTC(year,9,3)),n:'Tag der Deutschen Einheit'},
    {d:new Date(Date.UTC(year,10,1)),n:'Allerheiligen'},
    {d:new Date(Date.UTC(year,11,25)),n:'1. Weihnachtsfeiertag'},
    {d:new Date(Date.UTC(year,11,26)),n:'2. Weihnachtsfeiertag'}
  ];
  var map={};
  liste.forEach(function(h){map[h.d.toISOString().slice(0,10)]=h.n;});
  return map;
}
function isoWeekNum(d){
  var dt=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
  var dayNum=dt.getUTCDay()||7;
  dt.setUTCDate(dt.getUTCDate()+4-dayNum);
  var yearStart=new Date(Date.UTC(dt.getUTCFullYear(),0,1));
  return Math.ceil((((dt-yearStart)/86400000)+1)/7);
}

function empTargets(emp){
  var g=KPI_TARGETS||{};
  var t=(emp&&emp.targets)||{};
  function val(key,fallback){return t[key]!=null?t[key]:((g[key]&&g[key].val!=null)?g[key].val:fallback);}
  function dir(dirKey,valKey,fallback){return t[dirKey]||((g[valKey]&&g[valKey].dir)?g[valKey].dir:fallback);}
  // Fuer Mitarbeiter mit Provisionsvereinbarung gelten die dort hinterlegten, nach Beschaeftigungsmonat
  // gestaffelten Werte als "individuelles Ziel" fuer die ueberlappenden Kennzahlen (CR OEM/TW/SY/MY/SyMy/Anteil OEM/Opt.Std.),
  // sofern kein manueller Mitarbeiter-Override (t[key]) gesetzt wurde
  var provKpi=null;
  if(emp&&emp.startDate){
    // Ziele für Alerts/Coaching: immer der neueste Stand (die Provision selbst rechnet je Monat mit der gültigen Version)
    var pv=typeof effectiveProvisionSettings!=='undefined'?effectiveProvisionSettings(emp,'9999-12'):null;
    if(pv){
      var bm=beschaeftigungsmonat(emp,today().slice(0,7));
      provKpi=provisionKpiSetFor(pv,bm);
      if(isVlcProvision(emp)){
        // VLC: Ziele kommen aus der weWow-Vereinbarung (provisionsrelevant: Opt./Std., SY/MY, CR OEM;
        // ergaenzend: TW-, MY- und OEM-Anteil); die Olching-Werte gelten hier nicht
        var vm=bm===1?pv.vlc.monat1:bm===2?pv.vlc.monat2:pv.vlc.monat3plus;
        provKpi=Object.assign({},provKpi,{optH:vm.optH,tw:vm.tw,my:vm.my,oemAnteil:vm.oemAnteil,crOem:vm.crOem,syMy:vm.syMy});
      }
    }
  }
  // Massgeblich sind die individuellen Ziele aus „Stammdaten & Provisionsvereinbarung“ (provisionsrelevante und
  // ergaenzende KPIs, gestaffelt nach Beschaeftigungsmonat). Alte Einzelwerte aus employee_kpi_targets
  // (frueher automatisch beim Anlegen gesetzt, in der Oberflaeche nicht mehr pflegbar) gelten nur noch,
  // wenn es fuer den Mitarbeiter keine Vereinbarung gibt (kein Eintrittsdatum). Leeres Feld = keine Pruefung.
  function pval(key,provKey,fallback){
    if(provKpi&&provKey&&Object.prototype.hasOwnProperty.call(provKpi,provKey))return provKpi[provKey]!=null&&provKpi[provKey]!==''?+provKpi[provKey]:null;
    if(t[key]!=null)return t[key];
    if(provKpi&&provKpi[provKey]!=null)return provKpi[provKey];
    var gk=key==='crTW'?'crTeilweise':key; // B4: Team-Ziel CR TW heißt crTeilweise
    return (g[gk]&&g[gk].val!=null)?g[gk].val:fallback;
  }
  return {
    crOEM:      {val:pval('crOEM','crOem',55),          dir:dir('crOEMDir','crOEM','gte')},
    crTeilweise:{val:pval('crTW','tw',25),            dir:dir('crTWDir','crTeilweise','lte')},
    crSuperYes: {val:pval('crSuperYes','sy',12),      dir:dir('crSYDir','crSuperYes','gte')},
    crMegaYes:  {val:pval('crMegaYes','my',8),        dir:dir('crMYDir','crMegaYes','gte')},
    optPerH:     {val:pval('optPerH','optH',3.5),         dir:dir('optPerHDir','optPerH','gte')},
    optPerDay:   {val:val('optPerDay',16),          dir:dir('optPerDayDir','optPerDay','gte')},
    crYes:       {val:pval('crYes','crYes',null),             dir:provKpi?'lte':dir('crYesDir','crYes','lte')}, // CR YES ist ein Max.-Wert
    crSyMy:      {val:pval('crSyMy','syMy',null),             dir:dir('crSyMyDir','crSyMy','gte')},
    anteilOEM:   {val:pval('anteilOEM','oemAnteil',null),          dir:dir('anteilOEMDir','anteilOEM','gte')},
    notReached:  {val:pval('notReached','notReached',null),         dir:dir('notReachedDir','notReached','lte')},
    notPossible: {val:pval('notPossible','notPossible',null),        dir:dir('notPossibleDir','notPossible','lte')},
    notSuccessful:{val:pval('notSuccessful','notSuccessful',null),     dir:dir('notSuccessfulDir','notSuccessful','lte')},
    oem_aktivitaeten:{val:pval('oem_aktivitaeten','aktivitaeten',null),       dir:dir('aktivDir','oem_aktivitaeten','gte')},
    convOEM:     {val:pval('convOEM','convOEM',null),            dir:dir('convOEMDir','convOEM','gte')},
    optGesamt:   {val:pval('optGesamt','optGesamt',null)!=null?pval('optGesamt','optGesamt',null):val('optPerDay',null), dir:dir('optGesamtDir','optGesamt','gte')},
    margeGesamt: {val:pval('margeGesamt','margeZiel',null),        dir:dir('margeDir','margeGesamt','gte')}
  };
}
function teamTargetList(){return employees.filter(function(e){return e.active!==false&&!e.isPureCoach&&e.role!=='SDC'&&e.role!=='SDM';});}
function teamTargetFor(list,key){
  var vals=[],dirs={};
  (list||[]).forEach(function(e){if(!e||!e.startDate)return;var t=empTargets(e)[key];if(t&&t.val!=null&&t.val!==''&&!isNaN(+t.val)){vals.push(+t.val);dirs[t.dir||'gte']=1;}});
  if(!vals.length)return null;
  var avg=vals.reduce(function(a,b){return a+b;},0)/vals.length;
  return {val:key==='optPerH'?Math.round(avg*10)/10:Math.round(avg),dir:Object.keys(dirs)[0]||'gte'};
}
function recomputeTeamTargets(){
  if(typeof KPI_TARGETS==='undefined'||!employees)return;
  var list=teamTargetList();
  TEAM_TARGET_KEYS.forEach(function(k){var t=teamTargetFor(list,k);if(t){KPI_TARGETS[k]=KPI_TARGETS[k]||{};KPI_TARGETS[k].val=t.val;KPI_TARGETS[k].dir=t.dir;}});
  if(KPI_TARGETS.crOEM)CR_GOOD=KPI_TARGETS.crOEM.val;
}
function timeStrToMin(t){if(!t)return null;var p=t.split(':');return (+p[0])*60+(+p[1]);}
function workHoursForDate(emp,dateStr){
  var wh=workHoursPlanFor(emp,dateStr); // C4: Arbeitszeit, die an diesem Tag galt
  var d=new Date(dateStr+'T00:00:00');
  var key=WEEKDAY_KEYS[d.getDay()];
  var dv=wh[key]||DEFAULT_WORK_HOURS[key];
  if(!dv||!dv.von||!dv.bis)return 0;
  var mins=timeStrToMin(dv.bis)-timeStrToMin(dv.von)-(dv.pause||0);
  // Krank zählt als Arbeitstag mit 50 % der vereinbarten Stunden. Verspätungen kürzen nicht – die Zeit wird nachgeholt.
  if(typeof kalOn==='function'&&emp&&emp.id){var _a=kalOn(emp.id,dateStr);if(_a&&(_a.art==='krank'||(_a.masked&&_a.art==='abwesend')))mins*=0.5;}
  return Math.max(0,mins/60);
}
// Heute: nur die seit Arbeitsbeginn (lt. Wochenarbeitszeit) verstrichene Zeit, max. die geplanten Tagesstunden
function elapsedWorkHoursTodayFor(emp){
  var planned=workHoursForDate(emp,today());
  var wh=workHoursPlanFor(emp,today());
  var key=WEEKDAY_KEYS[new Date(today()+'T00:00:00').getDay()];
  var dv=wh[key]||DEFAULT_WORK_HOURS[key];
  var startMin=(dv&&dv.von)?timeStrToMin(dv.von):510;
  var now=new Date(),refTime=now;
  if(settings.ftpLastSync){
    var syncDate=new Date(settings.ftpLastSync);
    if(!isNaN(syncDate.getTime())&&localYmd(syncDate)===today()&&syncDate<now)refTime=syncDate;
  }
  var elapsed=(refTime.getHours()*60+refTime.getMinutes()-startMin)/60;
  elapsed=Math.max(elapsed,0.5);
  return planned>0?Math.min(elapsed,planned):elapsed;
}
// Kranktage ohne Leistungsdaten zählen mit 50 % der Tagesstunden zur Arbeitszeit (wie in der SFP).
// workHoursForDate liefert an Kranktagen bereits die halben Stunden.
function krankExtraHours(emp,from,to,seen){if(!emp||!from||!to||typeof kalOn!=='function')return 0;var t=today(),h=0,d=from;if(to>t)to=t;
  while(d<=to){if(!seen[d]){var a=kalOn(emp.id,d);if(a&&!a.masked&&a.art==='krank'&&a.status!=='abgelehnt'&&a.status!=='storniert'&&kalWorkday(emp,d))h+=workHoursForDate(emp,d)||0;}d=kalAdd(d,1);}return h;}
function krankRangeOf(dates){var L=(dates||[]).slice().sort();return L.length?[L[0],L[L.length-1]]:null;}
// Summe der Arbeitsstunden ueber die tatsaechlichen Datentage (Performance-Tabelle) + halbe Stunden für Kranktage dazwischen
function perfHoursForDates(emp,dates){
  var t=today(),sum=0,seen={};
  (dates||[]).forEach(function(ds){seen[ds]=1;sum+=(ds===t)?elapsedWorkHoursTodayFor(emp):workHoursForDate(emp,ds);});
  var r=krankRangeOf(dates);if(r){var mf=r[0].slice(0,7),ml=r[1].slice(0,7),from=mf===ml&&dates.length>7?mf+'-01':r[0],to=mf===ml&&dates.length>7?kalAdd(kalAdd(ml+'-28',4).slice(0,7)+'-01',-1):r[1];sum+=krankExtraHours(emp,from,to,seen);}
  return sum;
}
function totalWorkHoursForMonth(emp,monthKey,dateList){
  // dateList: Array der tatsaechlichen Datums-Strings (YYYY-MM-DD) mit Performance-Daten in diesem Monat
  var sum=0,seen={};
  (dateList||[]).forEach(function(ds){seen[ds]=1;sum+=workHoursForDate(emp,ds);});
  // Kranktage des Monats (bzw. der Monate der Liste) ohne Daten: halbe Tagesstunden
  var months={};if(monthKey)months[monthKey]=1;else (dateList||[]).forEach(function(ds){months[ds.slice(0,7)]=1;});
  Object.keys(months).forEach(function(mk){sum+=krankExtraHours(emp,mk+'-01',kalAdd(kalAdd(mk+'-28',4).slice(0,7)+'-01',-1),seen);});
  return sum;
}
function beschaeftigungsmonat(emp,monthKey){
  if(!emp.startDate)return 1;
  var start=new Date(emp.startDate+'T00:00:00');
  var target=new Date(monthKey+'-01T00:00:00');
  var diff=(target.getFullYear()-start.getFullYear())*12+(target.getMonth()-start.getMonth())+1;
  return Math.max(1,diff);
}
// Arbeitszeit je Wochentag, die am Tag d galt
function workHoursPlanFor(emp,d){var w=empVerlaufWert(emp,'workHours',d||today());if(w===undefined)w=emp&&emp.workHours;return w||DEFAULT_WORK_HOURS;}
