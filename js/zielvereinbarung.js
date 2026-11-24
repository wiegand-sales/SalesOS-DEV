// Sales OS – Zielvereinbarung
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

// Liefert je Kalenderwoche im Monat: KW-Nummer, Standard-Werktage (Mo-Fr im Monat, abzgl. Feiertage), Feiertagsnamen fuer Tooltip
function getMonthWeeksZiel(monthKey){
  var year=+monthKey.slice(0,4),month=+monthKey.slice(5,7);
  var firstDay=new Date(Date.UTC(year,month-1,1));
  var lastDay=new Date(Date.UTC(year,month,0));
  var feiertage=bayernFeiertage(year);
  if(month===12)Object.assign(feiertage,bayernFeiertage(year+1));
  if(month===1)Object.assign(feiertage,bayernFeiertage(year-1));
  var d=new Date(firstDay);
  var dow=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()-(dow-1));
  var weeks=[];
  while(d<=lastDay){
    var weekStart=new Date(d);
    var days=0,holidayNames=[];
    for(var i=0;i<5;i++){
      var day=new Date(weekStart);day.setUTCDate(day.getUTCDate()+i);
      if(day.getUTCFullYear()===year&&day.getUTCMonth()+1===month){
        var key=day.toISOString().slice(0,10);
        if(feiertage[key])holidayNames.push(feiertage[key]);
        else days++;
      }
    }
    weeks.push({kw:isoWeekNum(weekStart),defaultDays:days,holidayNames:holidayNames,from:weekStart.toISOString().slice(0,10),to:(function(){var e=new Date(weekStart);e.setUTCDate(e.getUTCDate()+4);return e.toISOString().slice(0,10);})()});
    d.setUTCDate(d.getUTCDate()+7);
  }
  return weeks;
}
function zielW6Row(row,wk){if(ZIEL_W6)row.week6=wk[5]!=null?wk[5]:0;return row;}
function loadZielvereinbarungFromSupabase(){
  return selectAllPaginated('zielvereinbarung').then(function(res){
    if(res.error){console.warn('zielvereinbarung load failed:',res.error);return false;}
    zielStore={};ZIEL_W6=res.data.some(function(r){return 'week6' in r;});
    res.data.forEach(function(r){
      if(!zielStore[r.month])zielStore[r.month]={};
      zielStore[r.month][r.employee_id]={weeks:[r.week1,r.week2,r.week3,r.week4,r.week5].concat(ZIEL_W6&&r.week6!=null?[r.week6]:[]),optTag:r.opt_per_tag,margeOpt:r.marge_per_opt,arbeitstage:r.arbeitstage||null};
    });
    return true;
  });
}
function setZielYearView(delta){zielYearView=(+zielYearView+delta)+'';renderTeam();}
function updateZielNlTarget(monthKey,value){
  var num=parseFloat(value);if(isNaN(num))num=0;
  zielNlTargets[monthKey]=num;
  sb.from('settings').upsert({key:'ziel_nl_'+monthKey,value:String(num)},{onConflict:'key'}).then(function(res){
    if(res.error)console.warn('Ziel NL Marge speichern fehlgeschlagen:',res.error);
  });
  renderTeam();
}
// Farbe fuer KPI-Werte OHNE hinterlegten Zielwert: nur Petrol (besser/gleich Vormonat) oder Rot
// (schlechter als Vormonat) - nie neutral schwarz. Ohne Vormonatswert (z.B. neuer Mitarbeiter) faellt
// die Farbe auf Petrol zurueck, da kein Vergleich moeglich ist.
function empActiveInZielMonth(e,monthKey){
  var b=monthBoundsUTC(monthKey+'-01',0);
  if(e.startDate&&e.startDate>b.to)return false;
  if(e.endDate&&e.endDate<b.from)return false;
  return true;
}
// ── Wochenziel-Kacheln: automatisch berechnetes Ziel pro Woche (Tage x Opt./Tag x Marge/Opt.),
// aus denselben Werten, die ohnehin schon in der Zielvereinbarung hinterlegt sind - keine
// zusaetzliche Eingabe noetig. Zeigt den aktuellen Monat, vergangene Wochen mit echtem Ist,
// kommende Wochen als offen/blass.
function wochenzielKachelnHtml(){
  var curMk=today().slice(0,7);
  var prevDate=new Date(curMk+'-01T00:00:00Z');
  prevDate.setUTCMonth(prevDate.getUTCMonth()-1);
  var prevMk=prevDate.toISOString().slice(0,7);
  var todayStr=today();
  var curKw=isoWeekNum(new Date(todayStr+'T00:00:00Z'));

  // Soll eines Monatsanteils einer KW (Tage des Monats in dieser Woche x Opt./Tag x Marge/Opt.)
  function portion(mk2,from){
    var wi=-1;getMonthWeeksZiel(mk2).forEach(function(w,i){if(w.from===from)wi=i;});if(wi<0)return 0;
    var wm2=getMonthWeeksZiel(mk2)[wi],rec2=zielStore[mk2]||{},z=0;
    employees.filter(function(e){return empActiveInZielMonth(e,mk2)&&!e.isPureCoach;}).forEach(function(e){
      var r=rec2[e.id]||{};
      var days=(r.weeks&&r.weeks[wi]!=null)?r.weeks[wi]:wm2.defaultDays;
      if(typeof ztEmpMonth==='function'){var zx=ztEmpMonth(e,mk2);if(zx.weeks[wi])days=zx.weeks[wi].n;}
      z+=days*(r.optTag!=null?r.optTag:0)*(r.margeOpt!=null?r.margeOpt:0);
    });
    return z;
  }
  function tileFor(mk,seenKw){
    var weeks=getMonthWeeksZiel(mk);
    var visible=employees.filter(function(e){return empActiveInZielMonth(e,mk)&&!e.isPureCoach;});
    var out='';
    weeks.forEach(function(wm,wi){
      if(seenKw[wm.kw])return;
      seenKw[wm.kw]=true;
      var target=0,ist=0;
      var isFuture=wm.from>todayStr;
      // B5: KW über den Monatswechsel – Ist zählt die ganze Woche, also auch das Soll beider Monatsanteile
      var m1=wm.from.slice(0,7),m2=wm.to.slice(0,7);
      target=portion(m1,wm.from)+(m2!==m1?portion(m2,wm.from):0);
      if(!isFuture){var vis={};visible.forEach(function(e){vis[e.id]=e;});
        if(m2!==m1)employees.forEach(function(e){if(!e.isPureCoach&&(empActiveInZielMonth(e,m1)||empActiveInZielMonth(e,m2)))vis[e.id]=e;});
        Object.keys(vis).forEach(function(id){ist+=istForEmpWeek(vis[id].id,wm.from,wm.to);});}
      var pct=target>0?Math.round(ist/target*100):(ist>0?100:0);
      var isCur=wm.kw===curKw;
      if(isFuture){
        out+='<div style="flex:1 1 120px;min-width:0;border:1px dashed var(--border2);background:var(--s-tint);border-radius:12px;padding:12px;opacity:0.6">'
          +'<div style="font-size:11px;color:var(--text3);margin-bottom:6px">KW '+wm.kw+'</div>'
          +'<div style="font-size:16px;font-weight:700;color:var(--text3)">–</div>'
          +'<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Ziel: € '+Math.round(target).toLocaleString('de-DE')+'</div>'
          +'<div style="height:5px;background:var(--bg2);border-radius:3px"></div>'
          +'<div style="font-size:11px;color:var(--text3);margin-top:6px">Noch offen</div>'
          +'</div>';
      } else {
        var barColor=pct>=100?'#F08566':'#B23A3A';
        out+='<div style="flex:1 1 120px;min-width:0;border:'+(isCur?'2px solid #F08566;background:var(--s-tint-strong)':'1px solid var(--border2);background:var(--s-tint)')+';border-radius:12px;padding:12px">'
          +'<div style="font-size:11px;color:'+(isCur?'#F08566;font-weight:700':'var(--text3)')+';margin-bottom:6px">KW '+wm.kw+(isCur?' · Heute':'')+'</div>'
          +'<div style="font-size:16px;font-weight:700;color:#1d1c1a">€ '+Math.round(ist).toLocaleString('de-DE')+'</div>'
          +'<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Ziel: € '+Math.round(target).toLocaleString('de-DE')+'</div>'
          +'<div style="height:5px;background:var(--bg2);border-radius:3px;overflow:hidden"><div style="width:'+Math.min(pct,100)+'%;height:100%;background:'+barColor+'"></div></div>'
          +'<div style="font-size:11px;font-weight:700;color:'+barColor+';margin-top:6px">'+pct+'%</div>'
          +'</div>';
      }
    });
    return out;
  }

  var monthDivider='<div style="min-width:1px;border-left:1px dashed var(--border2);align-self:stretch;margin:4px 2px"></div>';
  var seenKw={};
  var prevHtml=tileFor(prevMk,seenKw);
  var curHtml=tileFor(curMk,seenKw);
  var html='<div class="card card-static" style="margin-bottom:16px">'
    +'<div class="card-title" style="margin-bottom:12px"><i class="ti ti-calendar-stats"></i> Wochenziel · '+MONTH_NAMES_ZIEL[+prevMk.slice(5,7)-1]+'–'+MONTH_NAMES_ZIEL[+curMk.slice(5,7)-1]+' '+curMk.slice(0,4)+' <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">(automatisch aus Tage × Opt./Tag × Marge/Opt.)</span></div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
    +prevHtml
    +monthDivider
    +curHtml
    +'</div></div>';
  return html;
}
// ── Zielvereinbarung — Jahresverlauf: Ziel NL (gestrichelte Referenzlinie) vs. Ziel/Erzielte Marge (Balken) ──
// Eigenstaendige Funktion, damit dasselbe Diagramm sowohl in Overview als auch in Zielvereinbarung genutzt werden kann.
// ── Zielwerte & Richtung (ehemals Settings > KPI-Ziele, jetzt unter Zielvereinbarung) ──
function kpiZieleHtml(){
  function zRow(key,label,einheit,step){
    var t=KPI_TARGETS[key];
    return '<div style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:170px;font-size:13px;font-weight:500">'+label+'</div>'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +'<select id="dir-'+key+'" style="width:64px;height:34px;box-sizing:border-box;font-size:13px;padding:0 8px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text)">'
      +'<option value="gte"'+(t.dir==='gte'?' selected':'')+'>≥</option>'
      +'<option value="lte"'+(t.dir==='lte'?' selected':'')+'>≤</option>'
      +'</select>'
      +'<input type="number" id="val-'+key+'" value="'+t.val+'" step="'+(step||1)+'" min="0" max="100" style="width:80px;height:34px;box-sizing:border-box;font-size:13px;padding:0 8px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text)">'
      +(einheit?'<span style="font-size:12px;color:var(--text2)">'+einheit+'</span>':'')
      +'</div>'
      +'<div style="margin-left:auto;font-size:11px;color:var(--text3)">Aktuell: '+t.dir+' '+t.val+(einheit||'')+'</div>'
      +'</div>';
  }
  return '<div class="card">'
    +'<div class="card-title"><i class="ti ti-target"></i> Allgemeine KPIs</div>'
    +'<p style="font-size:12px;color:var(--text2);margin-bottom:6px;line-height:1.6">Lege fest ob ein Wert <strong>größer (≥)</strong> oder <strong>kleiner (≤)</strong> als der Zielwert sein soll. Gilt als globaler Standard für alle Mitarbeiter.</p>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px">'
    +zRow('crOEM','CR OEM','%',1)
    +zRow('crSuperYes','CR SY (Super Yes)','%',1)
    +zRow('crTeilweise','CR TW (Teilweise)','%',1)
    +zRow('crMegaYes','CR MY (Mega Yes)','%',1)
    +zRow('optPerH','Opt./Stunde','',0.1)
    +'</div>'
    +'<div style="margin-top:16px;display:flex;align-items:center;gap:12px">'
    +'<button class="btn btn-primary" style="width:auto;height:34px" onclick="zieleSpeichern()"><i class="ti ti-check"></i> Zielwerte speichern</button>'
    +'<span id="ziele-status" style="font-size:12px;color:var(--teal)"></span>'
    +'</div></div>';
}
// ── Zielvereinbarung: volle Jahres-/Wochenansicht (unter SFP Wiegand > Zielvereinbarung) ──
// ── Zielvereinbarung: Petrol-Infobox (Zeitraum, Jahr, Monat, Ø/Monat, Ist/Soll Monat, Ist/Soll Jahr) ──
// Nutzt dieselben .month-bar/.mb-stat-Klassen wie die Overview-Monatsleiste (buildMonthBar) - keine neuen CSS-Regeln noetig.
function istForEmpMonth(empId,mkey){
  var sum=0;
  (performance[empId]||[]).forEach(function(x){
    if((x.date||'').slice(0,7)!==mkey)return;
    sum+=x.margeGesamt||x.margin||0;
  });
  return sum;
}
function istForEmpWeek(empId,from,to){
  var sum=0;
  (performance[empId]||[]).forEach(function(x){
    if(!x.date||x.date<from||x.date>to)return;
    sum+=x.margeGesamt||x.margin||0;
  });
  return sum;
}
function zielInfoBoxHtml(){
  var HIDDEN=[];
  var liste=employees.filter(function(e){return HIDDEN.indexOf(e.role)<0&&!e.isPureCoach;});
  var year=today().slice(0,4);
  var curMonthNum=+today().slice(5,7);
  var mk=today().slice(0,7);
  var monthLabel=MONTH_NAMES_ZIEL[curMonthNum-1]+' '+year;
  var eur=function(v){return '€ '+Math.round(v).toLocaleString('de-DE');};

  function istForMonth(mkey){
    var sum=0;
    liste.forEach(function(e){
      (performance[e.id]||[]).forEach(function(x){
        if((x.date||'').slice(0,7)!==mkey)return;
        sum+=x.margeGesamt||x.margin||0;
      });
    });
    return sum;
  }
  function zielForMonth(mkey){
    var wMeta=getMonthWeeksZiel(mkey);
    var mRec=zielStore[mkey]||{};
    var mVisible=liste.filter(function(e){return empActiveInZielMonth(e,mkey);});
    var sum=0;
    mVisible.forEach(function(e){
      var r=mRec[e.id]||{};
      var weeks=wMeta.map(function(wm,i){return(r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays;});
      var monthSum=weeks.reduce(function(a,b){return a+b;},0);
      var optTag=r.optTag!=null?r.optTag:0;
      var margeOpt=r.margeOpt!=null?r.margeOpt:0;
      sum+=monthSum*optTag*margeOpt;
    });
    return sum;
  }

  var monatIst=istForMonth(mk);
  var monatZiel=zielForMonth(mk);

  var jahrIst=0,jahrZiel=0,monthsCount=0;
  for(var m=1;m<=curMonthNum;m++){
    var mkey=year+'-'+(m<10?'0'+m:m);
    jahrIst+=istForMonth(mkey);
    jahrZiel+=zielForMonth(mkey);
    monthsCount++;
  }
  var avgIst=monthsCount?jahrIst/monthsCount:0;
  var avgZiel=monthsCount?jahrZiel/monthsCount:0;
  var pctMonat=monatZiel>0?Math.round(monatIst/monatZiel*100):(monatIst>0?100:0);
  var pctJahr=jahrZiel>0?Math.round(jahrIst/jahrZiel*100):(jahrIst>0?100:0);

  return '<div class="month-bar">'
    +'<div class="mb-month"><div class="l">Zeitraum</div><div class="v">'+monthLabel+'</div></div>'
    +'<div class="mb-stat"><div class="l">Jahr</div><div class="row"><span class="n">'+eur(jahrIst)+'</span></div><div class="m">Ziel: '+eur(jahrZiel)+'</div></div>'
    +'<div class="mb-stat"><div class="l">Monat</div><div class="row"><span class="n">'+eur(monatIst)+'</span></div><div class="m">Ziel: '+eur(monatZiel)+'/Mon.</div></div>'
    +'<div class="mb-stat"><div class="l">Ø pro Monat</div><div class="row"><span class="n">'+eur(avgIst)+'</span></div><div class="m">Ziel: '+eur(avgZiel)+'/Mon.</div></div>'
    +'<div class="mb-stat"><div class="l">Ist/Soll Monat</div><div class="row"><span class="n">'+pctMonat+'%</span></div><div class="m">'+eur(monatIst)+' / '+eur(monatZiel)+'</div></div>'
    +'<div class="mb-stat"><div class="l">Ist/Soll Jahr</div><div class="row"><span class="n">'+pctJahr+'%</span></div><div class="m">'+eur(jahrIst)+' / '+eur(jahrZiel)+'</div></div>'
    +'</div>';
}
function loadZielLocksFromSupabase(){
  return Promise.all([sb.from('ziel_festschreibung').select('*'),sb.from('ziel_protokoll').select('*')]).then(function(r){
    zielLocks={};zielProtokoll=[];
    if(r[0]&&!r[0].error)(r[0].data||[]).forEach(function(x){zielLocks[x.month]=x;});else console.warn('ziel_festschreibung (Tabelle angelegt?)',r[0]&&r[0].error);
    if(r[1]&&!r[1].error)zielProtokoll=(r[1].data||[]).slice().sort(function(a,b){return (b.am||'').localeCompare(a.am||'');});
    return true;}).catch(function(e){console.warn('ziel locks',e);return false;});
}
function ztKeep(mk){if(!ZT.saved[mk])ZT.saved[mk]=JSON.parse(JSON.stringify(zielStore[mk]||{}));}
function ztIsAdmin(){return currentUserRole==='admin';}
function ztCalMonth(mk){return mk>=ZT_KAL_START;}
function ztEmps(mk){var R={SDM:0,SDC:1,SDL:2,SE:3,SR:4,VLC:5};return employees.filter(function(e){return empActiveInZielMonth(e,mk)&&!e.isPureCoach;}).sort(function(a,b){var ra=R[a.role]!=null?R[a.role]:99,rb=R[b.role]!=null?R[b.role]:99;return ra!==rb?ra-rb:a.name.localeCompare(b.name);});}
function ztDaysOfMonth(mk){var r=[],d=mk+'-01';while(d.slice(0,7)===mk){r.push(d);d=kalAdd(d,1);}return r;}
function ztWeeks(mk){return getMonthWeeksZiel(mk);}
// geplante Tage eines Mitarbeiters in einer KW (nur Tage im Monat)
function ztPlanDays(e,mk,wm){var r=[],d=wm.from;for(var i=0;i<5;i++){var x=kalAdd(wm.from,i);if(x.slice(0,7)===mk&&kalWorkday(e,x)){var a=kalOn(e.id,x);if(!a||a.art==='krank'||(a.masked&&a.art!=='urlaub'))r.push(x);}}return r;}
// Gewicht eines geplanten Tages: Krank zählt halb (50 % der Stunden)
function ztDayW(e,d){var a=kalOn(e.id,d);return a&&a.art==='krank'?0.5:1;}
function ztAbsCount(e,mk){var u=0,k=0;ztDaysOfMonth(mk).forEach(function(d){if(!kalWorkday(e,d))return;var a=kalOn(e.id,d);if(!a||a.fixed)return;var f=a.halb?0.5:1;if(a.art==='krank'||(a.masked&&a.art==='abwesend'))k+=f;else if(a.art==='urlaub'||a.art==='flex')u+=f;});return {u:u,k:k};}
function ztEmpMonth(e,mk){var W=ztWeeks(mk),r=(zielStore[mk]||{})[e.id]||{},cal=ztCalMonth(mk),lk=zielLocks[mk],snap=lk&&lk.snapshot&&lk.snapshot[e.id];
  var weeks=W.map(function(wm,i){if(snap&&snap.weeks)return {n:+snap.weeks[i]||0,ds:null,red:false};if(cal){var ds=ztPlanDays(e,mk,wm),full=0;for(var j=0;j<5;j++){var x=kalAdd(wm.from,j);if(x.slice(0,7)===mk&&kalWorkday(e,x))full++;}var nn=ds.reduce(function(a,x){return a+ztDayW(e,x);},0);return {n:nn,ds:ds,red:nn<full};}
    return {n:(r.weeks&&r.weeks[i]!=null)?+r.weeks[i]:wm.defaultDays,ds:null,red:false};});
  var tage=weeks.reduce(function(a,w){return a+w.n;},0),opt=r.optTag!=null?+r.optTag:0,mo=r.margeOpt!=null?+r.margeOpt:0;
  return {weeks:weeks,tage:tage,opt:opt,mo:mo,zielOpt:tage*opt,ziel:tage*opt*mo};}
function ztHistory(e,mk){var k=e.id+mk;if(_ztHist[k])return _ztHist[k];var to=kalAdd(mk+'-01',-1),f=new Date(+mk.slice(0,4),+mk.slice(5,7)-4,1),from=kalI(f);
  var rows=(performance[e.id]||[]).filter(function(x){return x.date&&x.date>=from&&x.date<=to;}),byDate={};rows.forEach(function(x){if(!byDate[x.date])byDate[x.date]={o:0,m:0};byDate[x.date].o+=x.optGesamt||0;byDate[x.date].m+=x.margeGesamt||x.margin||0;});
  var wdS=[0,0,0,0,0,0,0],wdN=[0,0,0,0,0,0,0],so=0,sm=0,dates=Object.keys(byDate);dates.forEach(function(d){var w=kalP(d).getDay();wdS[w]+=byDate[d].o;wdN[w]++;so+=byDate[d].o;sm+=byDate[d].m;});
  return (_ztHist[k]={n:dates.length,wd:wdS.map(function(s,i){return wdN[i]?s/wdN[i]:null;}),avg:dates.length?so/dates.length:0,mpo:so?sm/so:0});}
function ztStartValues(bm){if(_ztStart[bm])return _ztStart[bm];var so=0,sm=0,nd=0;employees.forEach(function(e){if(!e.startDate)return;var byM={};(performance[e.id]||[]).forEach(function(x){if(!x.date)return;if(beschaeftigungsmonat(e,x.date.slice(0,7))!==bm)return;so+=x.optGesamt||0;sm+=x.margeGesamt||x.margin||0;byM[x.date]=1;});nd+=Object.keys(byM).length;});
  return (_ztStart[bm]={avg:nd?so/nd:0,mpo:so?sm/so:0});}
function ztOS(e,mk){var h=ztHistory(e,mk),bm=beschaeftigungsmonat(e,mk),src,avg,mpo,wd;
  if(bm<=3||h.n<20){var s=ztStartValues(Math.min(bm,3));avg=s.avg;mpo=s.mpo;wd=null;src='Startwerte früherer Starter in Monat '+Math.min(bm,3);if(!avg){avg=h.avg;mpo=h.mpo;wd=h.wd;src='Ø der letzten 3 Monate (wenig Daten)';}}
  else{avg=h.avg;mpo=h.mpo;wd=h.wd;src='Ø der letzten 3 Monate';}
  var x=ztEmpMonth(e,mk),per=[0,0,0,0,0],W=ztWeeks(mk);
  W.forEach(function(wm,i){var ds=x.weeks[i].ds;if(ds)ds.forEach(function(d){per[kalP(d).getDay()-1]++;});else{var n=x.weeks[i].n;for(var j=0;j<5&&n>0;j++){var dd=kalAdd(wm.from,j);if(dd.slice(0,7)===mk&&!kalWknd(dd)){per[kalP(dd).getDay()-1]++;n--;}}}});
  var opw=[1,2,3,4,5].map(function(w){return wd&&wd[w]!=null?wd[w]:avg;}),opt=per.reduce(function(a,n,i){return a+n*opw[i];},0);
  return {sum:opt*mpo,opt:opt,per:per,opw:opw,mpo:mpo,src:src};}
// ── Werte je Monat ──
function ztMonth(mk){var L=ztEmps(mk),z=0,os=0,t=0,zo=0,ist=0,u=0,k=0,ov=[],mv=[];L.forEach(function(e){var x=ztEmpMonth(e,mk);z+=x.ziel;t+=x.tage;zo+=x.zielOpt;if(x.opt)ov.push(x.opt);if(x.mo)mv.push(x.mo);var a=ztAbsCount(e,mk);u+=a.u;k+=a.k;ist+=istForEmpMonth(e.id,mk);os+=ztOS(e,mk).sum;});
  var avg=function(a){return a.length?a.reduce(function(s,v){return s+v;},0)/a.length:0;};
  return {n:L.length,u:u,k:k,t:t,opt:avg(ov),mo:avg(mv),zielOpt:zo,nl:zielNlTargets[mk]!=null?+zielNlTargets[mk]:0,ziel:z,os:os,ist:ist};}
function ztEur(v){return '€ '+Math.round(v||0).toLocaleString('de-DE');}
function ztPct(a,b){if(!b)return '';var p=Math.round(a/b*100);return '<span class="zt-pct'+(p<97?' lo':'')+'">'+p+' %</span>';}
function ztDelta(a,b){if(!a||!b)return '';var p=Math.round((a-b)/b*100);return ' <span class="zt-d '+(p>=0?'up':'dn')+'">'+(p>=0?'+':'−')+Math.abs(p)+' %</span>';}
function ztCnt(n,cls){return n?'<span class="zt-cnt '+cls+'">'+kalNf(n)+'</span>':'<span class="zt-cnt z">0</span>';}
function ztTog(k){ZT.open[k]=!ZT.open[k];renderTeam();}

function ztCanEditMonth(mk){if(kalIsViewer())return false;if(zielLocks[mk])return ztIsAdmin()&&!!ZT.edit[mk];return true;}
// ── Tabelle ──
function zielTreeHtml(){var year=zielYearView,cur=today().slice(0,7),h='',Y={nl:0,z:0,ist:0,u:0,k:0,t:0},acc=[0,0];_ztHist={};_ztStart={};_kalOnIdx=null;
  var head='<tr><th>Monat / Mitarbeiter</th><th>MA</th><th>Urlaub</th><th>Krank</th><th>Einsatztage</th><th>Opt./Tag</th><th>Marge/Opt.</th><th>Ziel Opt.</th><th class="eq">Ziel NL</th><th class="eq">Ziel Marge</th><th class="eq os">Ziel OS</th><th class="eq">Ist Marge</th><th data-ktip="Ist Marge im Verhältnis zur Zielvereinbarung (Ziel Marge)">% Ziel</th><th data-ktip="Ist Marge im Verhältnis zum Ziel NL">% NL</th></tr>';
  for(var m=1;m<=12;m++){var mk=year+'-'+('0'+m).slice(-2),M=ztMonth(mk),lk=zielLocks[mk],op=ZT.open['m'+mk],next=!lk&&(mk===cur||mk===kalI(new Date(+cur.slice(0,4),+cur.slice(5,7),1)).slice(0,7));
    Y.nl+=M.nl;Y.z+=M.ziel;Y.ist+=M.ist;Y.u+=M.u;Y.k+=M.k;Y.t+=M.t;
    if(mk<cur&&M.ist&&M.os&&M.ziel){acc[1]++;if(Math.abs(M.os-M.ist)<Math.abs(M.ziel-M.ist))acc[0]++;}
    var lkTip=lk?'festgeschrieben am '+fd((lk.festgeschrieben_am||'').slice(0,10))+(lk.festgeschrieben_von?' von '+lk.festgeschrieben_von:''):'';
    h+='<tr class="m'+(op?' open':'')+'" onclick="if(!event.target.closest(\'input,button\'))ztTog(\'m'+mk+'\')"><td><span class="zt-l1"><i class="ti ti-chevron-right zt-chev"></i>'+MONTH_NAMES_ZIEL[m-1]+(lk?' <span class="zt-lk" data-ktip="'+esc(lkTip)+'"><i class="ti ti-lock"></i></span>':'')
      +(next&&ztIsAdmin()?'<button class="btn btn-primary btn-sm zt-fs" onclick="ztFestschreiben(\''+mk+'\')">Festschreiben bis '+ztFsDeadline(mk)+'</button>':'')+(lk&&ztIsAdmin()?'<button class="btn btn-sm zt-fs" onclick="ZT.edit[\''+mk+'\']=!ZT.edit[\''+mk+'\'];ZT.open[\'m'+mk+'\']=true;renderTeam()">'+(ZT.edit[mk]?'Ändern beenden':'Ändern')+'</button>':'')+'</span></td>'
      +'<td>'+M.n+'</td><td>'+ztCnt(M.u,'u')+'</td><td>'+ztCnt(M.k,'k')+'</td><td>'+kalNf(M.t)+'</td><td>'+(M.opt?Math.round(M.opt):'–')+'</td><td>'+(M.mo?'€ '+Math.round(M.mo):'–')+'</td><td>'+Math.round(M.zielOpt).toLocaleString('de-DE')+'</td>'
      +'<td><input type="number" class="zt-num nl" value="'+Math.round(M.nl)+'" onchange="ztSetNl(\''+mk+'\',this.value)"'+(kalIsViewer()?' disabled':'')+'></td><td>'+ztEur(M.ziel)+(mk>=cur?ztDelta(M.ziel,M.nl).replace('class="zt-d','data-ktip="zum Ziel NL" class="zt-d'):'')+'</td><td class="os">'+(M.os?ztEur(M.os):'<span class="zt-dim">–</span>')+'</td><td>'+(M.ist?ztEur(M.ist):'<span class="zt-dim">–</span>')+'</td><td>'+ztPct(M.ist,M.ziel)+'</td><td>'+ztPct(M.ist,M.nl)+'</td></tr>';
    if(op)h+=ztEmpRows(mk);}
  h+='<tr class="y"><td>Jahresergebnis</td><td></td><td>'+kalNf(Y.u)+'</td><td>'+kalNf(Y.k)+'</td><td>'+kalNf(Y.t)+'</td><td></td><td></td><td></td><td>'+ztEur(Y.nl)+'</td><td>'+ztEur(Y.z)+'</td><td class="os">'+(acc[1]?'<span class="zt-acc" data-ktip="Monate, in denen Ziel OS näher am Ist lag als die Zielvereinbarung">OS genauer: '+acc[0]+' von '+acc[1]+'</span>':'')+'</td><td>'+ztEur(Y.ist)+'</td><td>'+ztPct(Y.ist,Y.z)+'</td><td>'+ztPct(Y.ist,Y.nl)+'</td></tr>';
  var prot=ZT.prot?ztProtHtml():'';
  return buildGlobalBannerHtml(employees.filter(function(e){return !e.isPureCoach;}))+wochenzielKachelnHtml()
    +'<div class="card card-static"><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap"><div class="card-title" style="margin:0"><i class="ti ti-target"></i> Zielvereinbarung</div><span class="kal-note">Jahr → Monat → Mitarbeiter → KW → Tag · Klick klappt auf</span>'
    +'<span style="margin-left:auto;display:flex;gap:8px;align-items:center"><span class="dsh-seg"><button type="button" class="'+(ZT.zv!=='w'?'on':'')+'" onclick="ZT.zv=\'m\';renderTeam()">Monat</button><button type="button" class="'+(ZT.zv==='w'?'on':'')+'" onclick="ZT.zv=\'w\';renderTeam()">Woche</button></span><button class="btn" onclick="ZT.prot=!ZT.prot;renderTeam()"><i class="ti ti-history"></i> Protokoll</button><button class="btn" onclick="setZielYearView(-1)">◀</button><b style="min-width:52px;text-align:center">'+year+'</b><button class="btn" onclick="setZielYearView(1)">▶</button></span></div>'+prot
    +(ZT.zv==='w'?ztWeekTable(year,cur):'<div class="std-wrap" style="overflow-x:auto"><table class="zt-t"><colgroup><col class="zt-c1">'+new Array(14).join('<col>')+'</colgroup><thead>'+head+'</thead><tbody>'+h+'</tbody></table></div>')
    +'<div style="margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+(kalIsViewer()?'':'<button class="btn btn-primary" onclick="ztSave()"><i class="ti ti-check"></i> Zielvereinbarung speichern</button>')+'<span id="ziel-status" class="kal-note"></span>'
    +'<span class="kal-legend" style="margin:0 0 0 auto"><span><span class="zt-red">umrandet</span> weniger Tage wegen Abwesenheit</span><span><span class="zt-osk">Ziel OS</span> Vorschlag, Klick zeigt die Rechnung</span><span>Einsatztage ab '+MONTH_NAMES_ZIEL[+ZT_KAL_START.slice(5)-1]+' '+ZT_KAL_START.slice(0,4)+' aus dem Kalender</span></span></div></div>'+ztAccHtml(year,cur);}
function ztAccEmp(e,mk){var x=ztEmpMonth(e,mk),ist=istForEmpMonth(e.id,mk),os=ztOS(e,mk).sum,ab=ztAbsCount(e,mk),bm=beschaeftigungsmonat(e,mk),lk=zielLocks[mk],snap=lk&&lk.snapshot&&lk.snapshot[e.id],G=[];
  if(ab.k)G.push({k:'krank',t:kalNf(ab.k)+' krank',n:ab.k});
  var ung=0;if(snap&&snap.weeks&&ztCalMonth(mk)){var sd=snap.weeks.reduce(function(s,v){return s+(+v||0);},0),cd=ztWeeks(mk).reduce(function(s,wm){return s+ztPlanDays(e,mk,wm).length;},0);if(cd<sd)ung=sd-cd;}
  if(ung)G.push({k:'ungeplant',t:'Urlaub ungeplant',n:ung});else if(ab.u)G.push({k:'urlaub',t:kalNf(ab.u)+' Urlaub',n:ab.u});
  if(bm<=3)G.push({k:'start',t:'Startwert',n:1});
  return {e:e,ist:ist,ziel:x.ziel,os:os,d1:ist?(x.ziel-ist)/ist*100:null,d2:ist?(os-ist)/ist*100:null,G:G};}
function ztPf(v){return v==null?'–':(v>0?'+':v<0?'−':'')+kalNf(Math.abs(Math.round(v*10)/10))+' %';}
function ztAccHtml(year,cur){if(ZT.accView==='e')return ztAccEmpHtml(year,cur);var rows='',n=0,win=0;
  for(var m=1;m<=12;m++){var mk=year+'-'+('0'+m).slice(-2);if(mk>cur)break;var M=ztMonth(mk);if(!M.ziel&&!M.os)continue;if(mk!==cur&&!M.ist)continue;
    var run=mk===cur,dp=M.ziel&&M.ist?(M.ziel-M.ist)/M.ist*100:null,dq=M.os&&M.ist?(M.os-M.ist)/M.ist*100:null,osW=dp!=null&&dq!=null&&Math.abs(dq)<Math.abs(dp),op=ZT.open['a'+mk];
    if(!run&&dp!=null&&dq!=null){n++;if(osW)win++;}
    var L=op||!run?ztEmps(mk).map(function(e){return ztAccEmp(e,mk);}).filter(function(o){return o.ist||o.ziel;}):[],big=L.filter(function(o){return o.d1!=null&&Math.abs(o.d1)>=20;}).length;
    var cl=function(v){return v==null?'':(v>0?' hi':' lo');};
    rows+='<tr class="m'+(op?' open':'')+'" onclick="ztTog(\'a'+mk+'\')"><td><span class="zt-l1"><i class="ti ti-chevron-right zt-chev"></i>'+MONTH_NAMES_ZIEL[m-1]+(run?' <span class="kal-tag">läuft</span>':'')+'</span></td><td>'+(run?'<span class="zt-dim">'+ztEur(M.ist)+'</span>':ztEur(M.ist))+'</td><td>'+ztEur(M.ziel)+'</td><td><span class="zt-ab'+cl(run?null:dp)+'">'+(run?'–':ztPf(dp))+'</span></td><td class="os">'+ztEur(M.os)+'</td><td class="os"><span class="zt-ab'+cl(run?null:dq)+'">'+(run?'–':ztPf(dq))+'</span></td><td>'+(run||dp==null?'–':'<span class="zt-win'+(osW?' os':'')+'">'+(osW?'Ziel OS':'Zielvereinb.')+'</span>')+'</td><td class="zt-gr">'+(!run&&big?'<span class="kal-tag warn">'+big+' MA über 20 %</span>':'')+'</td></tr>';
    if(op){L.sort(function(a,b){return Math.abs(b.d1||0)-Math.abs(a.d1||0);});rows+='<tr class="k"><td colspan="8" class="zt-osrow">'+ztAccBoxes(mk,M,dp,dq,L)+'</td></tr>';
      L.forEach(function(o){var w=o.d1!=null&&o.d2!=null&&Math.abs(o.d2)<Math.abs(o.d1);
        rows+='<tr class="e"><td><span class="zt-l2"><span class="kal-av">'+kalIni(o.e.name)+'</span><span>'+esc(o.e.name)+'<small>'+esc(o.e.role||'')+' · '+kalVzTz(o.e)+'</small></span></span></td><td>'+(o.ist?ztEur(o.ist):'<span class="zt-dim">–</span>')+'</td><td>'+ztEur(o.ziel)+'</td><td><span class="zt-ab'+(o.d1!=null&&Math.abs(o.d1)>=20?cl(o.d1):'')+'">'+ztPf(o.d1)+'</span></td><td class="os">'+ztEur(o.os)+'</td><td class="os">'+ztPf(o.d2)+'</td><td>'+(o.d1==null||run?'–':'<span class="zt-win'+(w?' os':'')+'">'+(w?'Ziel OS':'Zielvereinb.')+'</span>')+'</td><td class="zt-gr">'+o.G.map(function(g){return '<span class="kal-tag warn">'+esc(g.t)+'</span>';}).join(' ')+'</td></tr>';});}}
  if(!rows)return '';
  return '<div class="card card-static">'+ztAccHead('Klick auf einen Monat zeigt Mitarbeiter und Gründe')
    +'<div class="std-wrap" style="overflow-x:auto"><table class="zt-t zt-acc2"><colgroup><col class="zt-c1">'+new Array(7).join('<col>')+'<col style="width:300px"></colgroup><thead><tr><th>Monat / Mitarbeiter</th><th>Ist Marge</th><th>Zielvereinbarung</th><th>Abweichung</th><th class="os">Ziel OS</th><th class="os">Abweichung</th><th>Genauer</th><th style="text-align:left">Gründe</th></tr></thead><tbody>'+rows
    +'<tr class="y"><td>Bilanz</td><td></td><td></td><td></td><td class="os"></td><td class="os"></td><td>'+(n?'<span class="zt-win os">Ziel OS '+win+' von '+n+'</span>':'')+'</td><td></td></tr></tbody></table></div>'
    +'<div class="kal-legend"><span>Abweichung = Ziel im Verhältnis zum Ist · <b style="color:#9A3F22">+</b> Ziel lag zu hoch · <b style="color:#2F6B4F">−</b> Ziel lag zu niedrig</span><span><span class="kal-tag warn">Grund</span> aus Kalender und Daten erkannt</span></div></div>';}
function ztAccHead(t){return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap"><div class="card-title" style="margin:0">Wer lag genauer?</div><span class="kal-note">Abweichung vom Ist · '+t+'</span><span class="dsh-seg" style="margin-left:auto"><button type="button" class="'+(ZT.accView!=='e'?'on':'')+'" onclick="ZT.accView=\'m\';renderTeam()">Nach Monat</button><button type="button" class="'+(ZT.accView==='e'?'on':'')+'" onclick="ZT.accView=\'e\';renderTeam()">Nach Mitarbeiter</button></span></div>';}
function ztAccEmpHtml(year,cur){var mks=[];for(var m=1;m<=12;m++){var mk=year+'-'+('0'+m).slice(-2);if(mk>=cur)break;mks.push(mk);}
  var byE={};mks.forEach(function(mk){ztEmps(mk).forEach(function(e){var o=ztAccEmp(e,mk);if(!o.ist||!o.ziel)return;o.mk=mk;(byE[e.id]=byE[e.id]||{e:e,L:[]}).L.push(o);});});
  var R=Object.keys(byE).map(function(k){var x=byE[k],ist=0,zl=0,os=0,w=0,big=0,cnt={};x.L.forEach(function(o){ist+=o.ist;zl+=o.ziel;os+=o.os;if(Math.abs(o.d2)<Math.abs(o.d1))w++;if(Math.abs(o.d1)>=20)big++;o.G.forEach(function(g){cnt[g.k]=(cnt[g.k]||0)+1;});});
    x.ist=ist;x.ziel=zl;x.os=os;x.w=w;x.big=big;x.cnt=cnt;x.d1=(zl-ist)/ist*100;x.d2=(os-ist)/ist*100;x.avg=x.L.reduce(function(s,o){return s+Math.abs(o.d1);},0)/x.L.length;return x;}).sort(function(a,b){return b.avg-a.avg;});
  if(!R.length)return '';var cl=function(v){return Math.abs(v)>=10?(v>0?' hi':' lo'):'';},GN={krank:'krank',urlaub:'Urlaub',ungeplant:'ungeplant',start:'Startwert'};
  var rows=R.map(function(x){var op=ZT.open['ae'+x.e.id],h='<tr class="m'+(op?' open':'')+'" onclick="ztTog(\'ae'+x.e.id+'\')"><td><span class="zt-l1"><i class="ti ti-chevron-right zt-chev"></i><span class="kal-av" style="width:26px;height:26px;font-size:10px">'+kalIni(x.e.name)+'</span>'+esc(x.e.name)+' <span class="kal-note" style="font-weight:400">· '+esc(x.e.role||'')+'</span></span></td><td>'+ztEur(x.ist)+'</td><td>'+ztEur(x.ziel)+'</td><td><span class="zt-ab'+cl(x.d1)+'">'+ztPf(x.d1)+'</span></td><td class="os">'+ztEur(x.os)+'</td><td class="os">'+ztPf(x.d2)+'</td><td><span class="zt-win'+(x.w*2>x.L.length?' os':'')+'">OS '+x.w+' von '+x.L.length+'</span></td><td class="zt-gr">'+(x.big?'<span class="kal-tag warn">'+x.big+(x.big===1?' Monat':' Monate')+' über 20 %</span> ':'')+Object.keys(x.cnt).map(function(k){return '<span class="kal-tag">'+x.cnt[k]+'× '+GN[k]+'</span>';}).join(' ')+'</td></tr>';
    if(op){h+='<tr class="k"><td colspan="8" class="zt-osrow">'+ztAccEmpBoxes(x)+'</td></tr>';
      x.L.forEach(function(o){var w=Math.abs(o.d2)<Math.abs(o.d1);h+='<tr class="e"><td><span class="zt-l2" style="padding-left:58px">'+MONTH_NAMES_ZIEL[+o.mk.slice(5)-1]+' '+o.mk.slice(0,4)+'</span></td><td>'+ztEur(o.ist)+'</td><td>'+ztEur(o.ziel)+'</td><td><span class="zt-ab'+(Math.abs(o.d1)>=20?cl(o.d1):'')+'">'+ztPf(o.d1)+'</span></td><td class="os">'+ztEur(o.os)+'</td><td class="os">'+ztPf(o.d2)+'</td><td><span class="zt-win'+(w?' os':'')+'">'+(w?'Ziel OS':'Zielvereinb.')+'</span></td><td class="zt-gr">'+o.G.map(function(g){return '<span class="kal-tag warn">'+esc(g.t)+'</span>';}).join(' ')+'</td></tr>';});}
    return h;}).join('');
  return '<div class="card card-static">'+ztAccHead('Klick auf einen Mitarbeiter zeigt alle Monate untereinander')
    +'<div class="std-wrap" style="overflow-x:auto"><table class="zt-t zt-acc2"><colgroup><col class="zt-c1">'+new Array(7).join('<col>')+'<col style="width:300px"></colgroup><thead><tr><th>Mitarbeiter / Monat</th><th>Ist Marge</th><th>Zielvereinbarung</th><th>Abweichung</th><th class="os">Ziel OS</th><th class="os">Abweichung</th><th>Genauer</th><th style="text-align:left">Gründe</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div class="kal-legend"><span>Summen über alle abgeschlossenen Monate '+year+' · sortiert nach der größten Ø-Abweichung</span><span><span class="kal-tag warn">Grund</span> aus Kalender und Daten erkannt</span></div></div>';}
function ztAccEmpBoxes(x){var L=x.L,n=L.length,t=function(l,v){return '<div><small>'+l+'</small><b>'+v+'</b></div>';},avgA=L.reduce(function(s,o){return s+o.d1;},0)/n,avgB=L.reduce(function(s,o){return s+o.d2;},0)/n;
  var tr=n>1?(Math.abs(L[n-1].d1)<Math.abs(L[0].d1)?'besser':'schlechter'):'–';
  var b1='<div class="zt-osb"><div class="zt-osh">Auf einen Blick</div><div class="zt-dim" style="margin-bottom:8px">'+esc(x.e.name)+' · '+n+' Monate</div><div class="zt-k3">'+t('Ø Abweichung Ziel',ztPf(avgA))+t('Ø Abweichung OS',ztPf(avgB))+t('OS genauer',x.w+' / '+n)+'</div><div class="zt-k3" style="margin-top:8px">'+t('Monate über 20 %',x.big)+t('Ziel zu hoch',L.filter(function(o){return o.d1>10;}).length)+t('Trend',tr)+'</div></div>';
  var mx=Math.max.apply(null,L.map(function(o){return Math.max(Math.abs(o.d1),Math.abs(o.d2));}).concat([20])),bar=function(d,c,tp){return '<i style="background:'+c+';top:'+tp+'px;'+(d>=0?'left:50%;width:'+(d/mx*50)+'%':'right:50%;width:'+(-d/mx*50)+'%')+'"></i>';};
  var b2='<div class="zt-osb"><div class="zt-osh">Abweichung je Monat</div><div class="zt-dim" style="margin-bottom:8px"><i class="zt-lg" style="background:#F08566"></i>Zielvereinbarung <i class="zt-lg" style="background:#C9A77E;margin-left:8px"></i>Ziel OS · Mitte = Ist</div>'
    +L.map(function(o){return '<div class="zt-crow"><span>'+MONTH_NAMES_ZIEL[+o.mk.slice(5)-1].slice(0,3)+'</span><div class="zt-cbx"><u></u>'+bar(o.d1,'#F08566',2)+bar(o.d2,'#C9A77E',10)+'</div><span>'+ztPf(o.d1)+'</span></div>';}).join('')+'</div>';
  var sel=function(f){var M=L.filter(f);return {n:M.length,l:M.map(function(o){return MONTH_NAMES_ZIEL[+o.mk.slice(5)-1].slice(0,3);}).join(', ')};},has=function(k){return function(o){return o.G.some(function(g){return g.k===k;});};};
  var gt=function(l,r){return '<div'+(r.n?'':' class="z"')+'><small>'+l+'</small><b>'+r.n+'</b> <span class="zt-u">Mon.</span><em>'+(r.l||'–')+'</em></div>';};
  var b3='<div class="zt-osb"><div class="zt-osh">Gründe</div><div class="zt-dim" style="margin-bottom:8px">in wie vielen Monaten</div><div class="zt-k3 zt-g6">'+gt('Krankheit',sel(has('krank')))+gt('Urlaub im Monat',sel(has('urlaub')))+gt('Urlaub ungeplant',sel(has('ungeplant')))+'</div><div class="zt-k3 zt-g6" style="margin-top:8px">'+gt('Startwerte',sel(has('start')))+gt('ohne Grund (≥10 %)',sel(function(o){return !o.G.length&&Math.abs(o.d1)>=10;}))+gt('im Ziel (±10 %)',sel(function(o){return Math.abs(o.d1)<10;}))+'</div></div>';
  return '<div class="zt-osgrid">'+b1+b2+b3+'</div>';}
function ztAccBoxes(mk,M,dp,dq,L){var V=L.filter(function(o){return o.d1!=null;}),hi=V.filter(function(o){return o.d1>10;}).length,lo=V.filter(function(o){return o.d1<-10;}).length,b20=V.filter(function(o){return Math.abs(o.d1)>=20;}).length,ob=V.filter(function(o){return Math.abs(o.d2)<Math.abs(o.d1);}).length;
  var t=function(l,v){return '<div><small>'+l+'</small><b>'+v+'</b></div>';};
  var b1='<div class="zt-osb"><div class="zt-osh">Auf einen Blick</div><div class="zt-dim" style="margin-bottom:8px">'+MONTH_NAMES_ZIEL[+mk.slice(5)-1]+' · '+L.length+' Mitarbeiter</div><div class="zt-k3">'+t('Abweichung Team',ztPf(dp))+t('Ziel OS Team',ztPf(dq))+t('OS genauer',ob+' / '+V.length)+'</div><div class="zt-k3" style="margin-top:8px">'+t('Ziele zu hoch (&gt;10 %)',hi)+t('über 20 %',b20)+t('Ziele zu niedrig',lo)+'</div></div>';
  var mx=Math.max.apply(null,V.map(function(o){return Math.max(Math.abs(o.d1),Math.abs(o.d2||0));}).concat([20])),S=V.slice().sort(function(a,b){return Math.abs(b.d1)-Math.abs(a.d1);}).slice(0,12).sort(function(a,b){return b.d1-a.d1;}),more=V.length-S.length;
  var bar=function(d,c,tp){return '<i style="background:'+c+';top:'+tp+'px;'+(d>=0?'left:50%;width:'+(d/mx*50)+'%':'right:50%;width:'+(-d/mx*50)+'%')+'"></i>';};
  var b2='<div class="zt-osb"><div class="zt-osh">Abweichung je Mitarbeiter</div><div class="zt-dim" style="margin-bottom:8px"><i class="zt-lg" style="background:#F08566"></i>Zielvereinbarung <i class="zt-lg" style="background:#C9A77E;margin-left:8px"></i>Ziel OS · Mitte = Ist</div>'
    +S.map(function(o){return '<div class="zt-crow"><span>'+esc(kalFirst(o.e.name))+'</span><div class="zt-cbx"><u></u>'+bar(o.d1,'#F08566',2)+bar(o.d2||0,'#C9A77E',10)+'</div><span>'+ztPf(o.d1)+'</span></div>';}).join('')+(more>0?'<div class="zt-dim" style="margin-top:6px">die 12 größten Abweichungen · '+more+' weitere in der Liste darunter</div>':'')+'</div>';
  var grp=function(k){return L.filter(function(o){return o.G.some(function(g){return g.k===k;});});},kr=grp('krank'),kt=kr.reduce(function(s,o){return s+o.G.filter(function(g){return g.k==='krank';})[0].n;},0),ohne=V.filter(function(o){return !o.G.length&&Math.abs(o.d1)>=10;});
  var ok=V.filter(function(o){return Math.abs(o.d1)<10;}),ur=grp('urlaub'),ut=ur.reduce(function(s,o){return s+o.G.filter(function(g){return g.k==='urlaub';})[0].n;},0),ug=grp('ungeplant'),ugt=ug.reduce(function(s,o){return s+o.G.filter(function(g){return g.k==='ungeplant';})[0].n;},0);
  var gt=function(l,L2,extra){var nm=L2.map(function(o){return kalFirst(o.e.name);}).join(', ');return '<div'+(L2.length?'':' class="z"')+' data-ktip="'+esc(nm||'niemand')+'"><small>'+l+'</small><b>'+L2.length+'</b> <span class="zt-u">MA</span><em>'+(L2.length?(extra?extra+' · ':'')+esc(nm):'–')+'</em></div>';};
  var b3='<div class="zt-osb"><div class="zt-osh">Gründe</div><div class="zt-dim" style="margin-bottom:8px">aus Kalender und Daten erkannt</div><div class="zt-k3 zt-g6">'
    +gt('Krankheit',kr,kalNf(kt)+' Tage')+gt('Urlaub im Monat',ur,kalNf(ut)+' Tage')+gt('Urlaub ungeplant',ug,ugt?kalNf(ugt)+' Tage':'')+'</div><div class="zt-k3 zt-g6" style="margin-top:8px">'
    +gt('Startwerte (Monat 1–3)',grp('start'),'')+gt('ohne Grund (≥10 %)',ohne,'')+gt('im Ziel (±10 %)',ok,'')+'</div></div>';
  return '<div class="zt-osgrid">'+b1+b2+b3+'</div>';}
// ── Wochenansicht: jede Zeile eine KW (Teil im Monat), Klick zeigt die Wochenziele aller Mitarbeiter ──
function ztWeekRows(mk){var W=ztWeeks(mk),L=ztEmps(mk),last=kalI(new Date(+mk.slice(0,4),+mk.slice(5,7),0)),t=today();
  var pre=L.map(function(e){return {e:e,x:ztEmpMonth(e,mk),os:ztOS(e,mk)};});
  return W.map(function(wm,i){var from=wm.from<mk+'-01'?mk+'-01':wm.from,to=wm.to>last?last:wm.to,cur=t>=wm.from&&t<=wm.to,fut=from>t,wd=0;for(var d=from;d<=to;d=kalAdd(d,1))if(!kalWknd(d)&&!bayernFeiertage(+d.slice(0,4))[d]&&!kalFixDay(d))wd++;
    var R=pre.map(function(o){var w=o.x.weeks[i]||{n:0},zop=w.n*o.x.opt,zm=zop*o.x.mo,osW=o.x.tage?o.os.sum*w.n/o.x.tage:0,u=0,k=0,io=0;
      for(var d=from;d<=to;d=kalAdd(d,1)){if(!kalWorkday(o.e,d))continue;var a=kalOn(o.e.id,d);if(a&&!a.fixed){var f=a.halb?0.5:1;if(a.art==='krank')k+=f;else if(a.art==='urlaub'||a.art==='flex')u+=f;}}
      var ist=fut?null:istForEmpWeek(o.e.id,from,to);if(!fut)(performance[o.e.id]||[]).forEach(function(r){if(r.date>=from&&r.date<=to)io+=r.optGesamt||0;});
      var soll=zm;if(cur&&w.n){var done=w.ds?w.ds.filter(function(d){return d<=t;}).length:Math.min(w.n,Math.max(0,kalDiff(from,t)+1));soll=zm*done/w.n;}
      return {e:o.e,n:w.n,red:!!w.red,zop:zop,zm:zm,os:osW,u:u,k:k,ist:ist,io:fut?null:io,soll:soll};}).filter(function(r){return r.n||r.ist;});
    var S={n:0,zop:0,zm:0,os:0,u:0,k:0,ist:0,io:0,soll:0};R.forEach(function(r){S.n+=r.n;S.zop+=r.zop;S.zm+=r.zm;S.os+=r.os;S.u+=r.u;S.k+=r.k;S.ist+=r.ist||0;S.io+=r.io||0;S.soll+=r.soll;});
    return {mk:mk,i:i,kw:wm.kw,from:from,to:to,wd:wd,cur:cur,fut:fut,R:R,S:S};});}
function ztWeekTable(year,cur){var rows=[],h='';for(var m=1;m<=12;m++){var mk=year+'-'+('0'+m).slice(-2);rows.push({mk:mk,W:ztWeekRows(mk)});}
  var all=[];rows.forEach(function(r){r.W.forEach(function(w){if(w.S.zm>0&&w.wd>=4)all.push(w.S.zm/w.wd);});});var perDay=all.length?all.reduce(function(a,b){return a+b;},0)/all.length:0;
  var T={zm:0,ist:0,zi:0};
  rows.forEach(function(r){if(!r.W.some(function(w){return w.S.zm||w.S.ist;}))return;h+='<tr class="zt-mh"><td colspan="11">'+MONTH_NAMES_ZIEL[+r.mk.slice(5)-1]+' '+r.mk.slice(0,4)+(zielLocks[r.mk]?' <i class="ti ti-lock"></i>':'')+'</td></tr>';
    r.W.forEach(function(w){if(w.from>w.to||(!w.wd&&!w.S.zm&&!w.S.ist))return;var S=w.S,key='w'+w.mk+w.i,op=ZT.open[key],exp=perDay*w.wd,dip=exp?(S.zm-exp)/exp*100:0;T.zm+=S.zm;if(!w.fut){T.ist+=S.ist;T.zi+=w.cur?S.soll:S.zm;}
      h+='<tr class="m'+(op?' open':'')+(w.cur?' zt-cur':'')+(w.fut?' zt-fut':'')+'" onclick="ztTog(\''+key+'\')"><td><span class="zt-l1"><i class="ti ti-chevron-right zt-chev"></i>KW '+w.kw+' <span class="kal-note" style="font-weight:400;margin-left:4px">'+kalF(w.from)+'–'+kalF(w.to)+'</span>'+(w.cur?' <span class="zt-today">heute</span>':'')+(S.zm&&dip<-25?' <span class="zt-dip" data-ktip="Wochenziel deutlich unter dem Ø je Arbeitstag der übrigen Wochen">'+Math.round(dip)+' %</span>':'')+'</span></td>'
        +'<td>'+w.R.length+'</td><td>'+ztCnt(S.u,'u')+'</td><td>'+ztCnt(S.k,'k')+'</td><td>'+kalNf(S.n)+'</td><td>'+Math.round(S.zop).toLocaleString('de-DE')+'</td><td>'+(w.fut?'<span class="zt-dim">–</span>':Math.round(S.io).toLocaleString('de-DE'))+'</td><td>'+ztEur(S.zm)+'</td><td class="os">'+ztEur(S.os)+'</td><td>'+(w.fut?'<span class="zt-dim">–</span>':ztEur(S.ist))+'</td><td>'+(w.fut?'':(w.cur?'<span data-ktip="Ist gegen das anteilige Ziel bis heute">'+ztPct(S.ist,S.soll)+'</span>':ztPct(S.ist,S.zm)))+'</td></tr>';
      if(op)w.R.forEach(function(x){var pc=x.ist==null?null:(w.cur?(x.soll?x.ist/x.soll:0):(x.zm?x.ist/x.zm:0));
        h+='<tr class="e"><td><span class="zt-l2"><span class="kal-av">'+kalIni(x.e.name)+'</span><span>'+esc(x.e.name)+'<small>'+esc(x.e.role||'')+' · '+kalVzTz(x.e)+'</small></span></span></td><td></td><td>'+ztCnt(x.u,'u')+'</td><td>'+ztCnt(x.k,'k')+'</td><td>'+(x.red?'<span class="zt-red">'+x.n+'</span>':x.n)+'</td><td>'+Math.round(x.zop)+'</td><td>'+(x.io==null?'<span class="zt-dim">–</span>':Math.round(x.io))+'</td><td>'+ztEur(x.zm)+'</td><td class="os">'+ztEur(x.os)+'</td><td>'+(x.ist==null?'<span class="zt-dim">–</span>':'<span class="zt-wb"><i style="width:'+Math.min(100,(pc||0)*100)+'%"></i></span>'+ztEur(x.ist))+'</td><td>'+(x.ist==null?'':(w.cur?ztPct(x.ist,x.soll):ztPct(x.ist,x.zm)))+'</td></tr>';});});});
  return '<div class="std-wrap" style="overflow-x:auto"><table class="zt-t"><colgroup><col class="zt-c1">'+new Array(11).join('<col>')+'</colgroup><thead><tr><th>KW / Mitarbeiter</th><th>MA</th><th>Urlaub</th><th>Krank</th><th>Einsatztage</th><th>Ziel Opt.</th><th>Ist Opt.</th><th>Ziel Marge</th><th class="os">Ziel OS</th><th>Ist Marge</th><th data-ktip="laufende Woche: gegen das anteilige Ziel bis heute">% Ziel</th></tr></thead><tbody>'+h
    +'<tr class="y"><td>Jahr '+year+'</td><td></td><td></td><td></td><td></td><td></td><td></td><td>'+ztEur(T.zm)+'</td><td class="os"></td><td>'+ztEur(T.ist)+'</td><td>'+ztPct(T.ist,T.zi)+'</td></tr></tbody></table></div>';}
function ztEmpRows(mk){var h='',W=ztWeeks(mk),ed=ztCanEditMonth(mk),cal=ztCalMonth(mk)&&!zielLocks[mk];
  ztEmps(mk).forEach(function(e){var x=ztEmpMonth(e,mk),a=ztAbsCount(e,mk),os=ztOS(e,mk),ist=istForEmpMonth(e.id,mk),eo=ZT.open['e'+mk+e.id],bm=beschaeftigungsmonat(e,mk);
    h+='<tr class="e'+(eo?' open':'')+'" onclick="if(!event.target.closest(\'input,.zt-oslink\'))ztTog(\'e'+mk+e.id+'\')"><td><span class="zt-l2"><i class="ti ti-chevron-right zt-chev"></i><span class="kal-av">'+kalIni(e.name)+'</span><span>'+esc(e.name)+(bm<=3?' <span class="zt-new">Monat '+bm+'</span>':'')+'<small>'+esc(kalRoleLbl(e))+' · '+kalVzTz(e)+'</small></span><button class="btn btn-sm zt-calbtn" type="button" title="Urlaub und Krank eintragen" onclick="event.stopPropagation();openAbsPopup(\''+e.id+'\',\''+mk+'\')"><i class="ti ti-calendar"></i></button></span></td><td></td><td>'+ztCnt(a.u,'u')+'</td><td>'+ztCnt(a.k,'k')+'</td><td>'+kalNf(x.tage)+'</td>'
      +'<td><input type="number" class="zt-num" value="'+x.opt+'" onchange="ztSetField(\''+mk+'\',\''+e.id+'\',\'optTag\',this.value)"'+(ed?'':' disabled')+'></td><td><input type="number" class="zt-num" value="'+x.mo+'" onchange="ztSetField(\''+mk+'\',\''+e.id+'\',\'margeOpt\',this.value)"'+(ed?'':' disabled')+'></td>'
      +'<td>'+Math.round(x.zielOpt).toLocaleString('de-DE')+'</td><td></td><td>'+ztEur(x.ziel)+'</td><td class="os"><span class="zt-oslink" onclick="event.stopPropagation();ztTog(\'o'+mk+e.id+'\')">'+ztEur(os.sum)+'</span>'+ztDelta(os.sum,x.ziel)+'</td><td>'+(ist?ztEur(ist):'<span class="zt-dim">–</span>')+'</td><td>'+ztPct(ist,x.ziel)+'</td><td></td></tr>';
    if(ZT.open['o'+mk+e.id])h+='<tr class="k"><td colspan="14" class="zt-osrow">'+ztOsBox(e,mk,os,x)+'</td></tr>';
    if(eo)W.forEach(function(wm,i){var w=x.weeks[i],ko=ZT.open['k'+mk+e.id+i],wo=Math.round(w.n*x.opt),wz=w.n*x.opt*x.mo,wi=istForEmpWeek(e.id,wm.from,wm.to);
      var osW=0;if(w.ds)w.ds.forEach(function(d){osW+=os.opw[kalP(d).getDay()-1]*os.mpo;});
      h+='<tr class="k kw'+(ko?' open':'')+'"'+(w.ds?' onclick="ztTog(\'k'+mk+e.id+i+'\')"':'')+'><td><span class="zt-l3">'+(w.ds?'<i class="ti ti-chevron-right zt-chev"></i>':'')+'KW '+wm.kw+' · '+kalF(wm.from>mk+'-01'?wm.from:mk+'-01')+'–'+kalF(wm.to.slice(0,7)===mk?wm.to:kalI(new Date(+mk.slice(0,4),+mk.slice(5,7),0)))+'</span></td><td></td><td></td><td></td><td>'+(w.red?'<span class="zt-red">'+w.n+'</span>':w.n)+'</td><td></td><td></td><td>'+wo+' Opt.</td><td></td><td>'+ztEur(wz)+'</td><td class="os">'+(w.ds?ztEur(osW):'')+'</td><td>'+(wi?ztEur(wi):'<span class="zt-dim">–</span>')+'</td><td>'+ztPct(wi,wz)+'</td><td></td></tr>';
      if(ko&&w.ds)h+=ztDayRows(e,mk,x,os,wm);});});
  return h;}
function ztDayRows(e,mk,x,os,wm){var h='',wsum=0,all=[];x.weeks.forEach(function(w){if(w.ds)w.ds.forEach(function(d){all.push(d);wsum+=os.opw[kalP(d).getDay()-1]||1;});});
  for(var j=0;j<5;j++){var d=kalAdd(wm.from,j);if(d.slice(0,7)!==mk)continue;var lab='',o='',z='',ist=(performance[e.id]||[]).filter(function(r){return r.date===d;}).reduce(function(s,r){return s+(r.margeGesamt||r.margin||0);},0);
    if(!kalWorkday(e,d)){var hn=kalHolE(e,d);lab='<span class="zt-dim">'+(hn?esc(hn):kalFixDay(d)?'frei für alle':'frei lt. Arbeitszeit')+'</span>';}
    else{var a=kalOn(e.id,d);if(a&&a.art!=='krank'&&!(a.masked&&a.art==='abwesend')){lab='<span class="zt-red">'+KAL_ART[kalShowArt(a)]+'</span>';}else{var f=(os.opw[kalP(d).getDay()-1]||1)/(wsum||1)*(a&&a.art==='krank'?0.5:1);o=Math.round(x.zielOpt*f)+' Opt.';z=ztEur(x.ziel*f);lab=a?'<span class="zt-dim">krank · 50 %</span>':'1';}}
    h+='<tr class="k dd"><td><span class="zt-l4">'+KAL_WD[kalP(d).getDay()]+', '+kalF(d)+'</span></td><td></td><td></td><td></td><td>'+lab+'</td><td></td><td></td><td>'+o+'</td><td></td><td>'+z+'</td><td class="os"></td><td>'+(ist?ztEur(ist):'')+'</td><td></td><td></td></tr>';}
  return h;}
function ztOsBox(e,mk,os,x){var D=['Mo','Di','Mi','Do','Fr'];
  var tbl='<table><tr><th></th>'+D.map(function(d){return '<th>'+d+'</th>';}).join('')+'<th>Summe</th></tr>'
    +'<tr><td>geplante Tage</td>'+os.per.map(function(n){return '<td>'+n+'</td>';}).join('')+'<td>'+os.per.reduce(function(a,b){return a+b;},0)+'</td></tr>'
    +'<tr><td>Ø Opt. am Tag</td>'+os.opw.map(function(v){return '<td>'+kalNf(Math.round(v*10)/10)+'</td>';}).join('')+'<td></td></tr>'
    +'<tr><td>Opt.</td>'+os.per.map(function(n,i){return '<td>'+Math.round(n*os.opw[i])+'</td>';}).join('')+'<td><b>'+Math.round(os.opt)+'</b></td></tr></table>'
    +'<div class="zt-osf">'+Math.round(os.opt)+' Opt. × Ø € '+kalNf(Math.round(os.mpo*10)/10)+' Marge/Opt. = <b>'+ztEur(os.sum)+'</b></div>';
  // Diagramm 1: Ø Opt. je Wochentag (Säule) und geplante Tage (Zahl darunter)
  var mx=Math.max.apply(null,os.opw.concat([1])),W=260,H=96,bw=30,gap=(W-5*bw)/5,svg='<svg viewBox="0 -14 '+W+' '+(H+48)+'" style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto">';
  os.opw.forEach(function(v,i){var hh=v/mx*(H-6),xx=i*(bw+gap)+gap/2;svg+='<rect x="'+xx+'" y="'+(H-hh)+'" width="'+bw+'" height="'+hh+'" rx="4" fill="'+(os.per[i]?'#CDBB9E':'#E4E0D6')+'"/><text x="'+(xx+bw/2)+'" y="'+(H-hh-4)+'" text-anchor="middle" font-size="11" fill="#5C554C">'+kalNf(Math.round(v*10)/10)+'</text>'
    +'<text x="'+(xx+bw/2)+'" y="'+(H+14)+'" text-anchor="middle" font-size="11" fill="#1d1c1a" font-weight="600">'+D[i]+'</text><text x="'+(xx+bw/2)+'" y="'+(H+27)+'" text-anchor="middle" font-size="10" fill="#7A7268">'+os.per[i]+' T</text>';});
  svg+='</svg>';
  // Diagramm 2: Ist der letzten 3 Monate gegen Ziel OS und Zielvereinbarung
  var ms=[3,2,1].map(function(k){var d=new Date(+mk.slice(0,4),+mk.slice(5,7)-1-k,1),m=kalI(d).slice(0,7);return {l:MONTH_NAMES_ZIEL[d.getMonth()].slice(0,3)+' Ist',v:istForEmpMonth(e.id,m),c:'#8A7F72'};});
  ms.push({l:'Ziel OS',v:os.sum,c:'#C9A77E',b:1});ms.push({l:'Zielvereinb.',v:x.ziel,c:'#F08566',b:1});
  var mv=Math.max.apply(null,ms.map(function(o){return o.v;}).concat([1])),bars=ms.map(function(o){return '<div class="zt-hb"><span>'+o.l+'</span><div><i style="width:'+(o.v/mv*100)+'%;background:'+o.c+'"></i></div><b'+(o.b?'':' style="font-weight:400"')+'>'+ztEur(o.v)+'</b></div>';}).join('');
  return '<div class="zt-osgrid"><div class="zt-osb"><div class="zt-osh">So rechnet Ziel OS</div><div class="zt-dim" style="margin-bottom:4px">'+esc(os.src)+'</div>'+tbl+'</div>'
    +'<div class="zt-osb"><div class="zt-osh">Ø Optimierungen je Wochentag</div><div class="zt-dim" style="margin-bottom:6px">Säule = Ø Opt., darunter die geplanten Tage im Monat</div>'+svg+'</div>'
    +'<div class="zt-osb"><div class="zt-osh">Einordnung</div><div class="zt-dim" style="margin-bottom:8px">Marge der letzten 3 Monate gegen die Ziele</div>'+bars+'</div></div>';}
function ztProtHtml(){var y=zielYearView,L=zielProtokoll.filter(function(p){return (p.month||'').slice(0,4)===y;});
  return '<div class="zt-prot"><div class="zt-pr"><b>Datum</b><b>Person</b><b>Änderung</b></div>'+(L.length?L.slice(0,200).map(function(p){var e=p.employee_id?kalEmp(p.employee_id):null,mn=MONTH_NAMES_ZIEL[+p.month.slice(5,7)-1];
    return '<div class="zt-pr"><span>'+(p.am?new Date(p.am).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'')+'</span><span>'+esc(p.von||'')+'</span><span>'+mn+(e?' · '+esc(e.name):'')+' · '+esc(p.feld)+(p.alt!=null||p.neu!=null?': <b>'+esc(p.alt==null?'–':p.alt)+' → '+esc(p.neu==null?'–':p.neu)+'</b>':'')+(p.grund?' · '+esc(p.grund):'')+'</span></div>';}).join(''):'<div class="kal-note" style="padding:8px 0">Noch keine Einträge.</div>')+'</div>';}
function ztFsDeadline(mk){var d=mk+'-01',n=0;while(true){if(!kalWknd(d)&&!bayernFeiertage(+d.slice(0,4))[d]){n++;if(n===3)break;}d=kalAdd(d,1);}return kalF(d);}
// ── Schreiben ──
function ztLog(mk,eid,feld,alt,neu,grund){var row={month:mk,employee_id:eid||null,feld:feld,alt:alt==null?null:String(alt),neu:neu==null?null:String(neu),grund:grund||null,von:kalActor()};row.am=new Date().toISOString();zielProtokoll.unshift(row);
  var ins=Object.assign({},row);delete ins.am;sb.from('ziel_protokoll').insert(ins).then(function(res){if(res&&res.error)console.warn('Protokoll',res.error);});}
function ztSetNl(mk,v){var n=parseFloat(v);if(isNaN(n))n=0;var old=zielNlTargets[mk]!=null?zielNlTargets[mk]:0;if(n===old)return;ztLog(mk,null,'Ziel NL',Math.round(old),Math.round(n));updateZielNlTarget(mk,n);}
function ztSetField(mk,eid,f,v){if(!ztCanEditMonth(mk))return;ztKeep(mk);if(!zielStore[mk])zielStore[mk]={};if(!zielStore[mk][eid])zielStore[mk][eid]={};var n=parseFloat(v);if(isNaN(n))n=0;zielStore[mk][eid][f]=n;ZT.dirty=ZT.dirty||{};ZT.dirty[mk]=1;renderTeam();}
function ztRowsFor(mk,useCal){var W=ztWeeks(mk),rec=zielStore[mk]||{};return ztEmps(mk).map(function(e){var r=rec[e.id]||{},x=ztEmpMonth(e,mk),wk=W.map(function(wm,i){return (useCal&&x.weeks[i])?x.weeks[i].n:((r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays);});while(wk.length<5)wk.push(0);
  return zielW6Row({employee_id:e.id,month:mk,week1:wk[0],week2:wk[1],week3:wk[2],week4:wk[3],week5:wk[4],opt_per_tag:r.optTag!=null?r.optTag:0,marge_per_opt:r.margeOpt!=null?r.margeOpt:0,arbeitstage:r.arbeitstage||[]},wk);});}
function ztSave(){var st=document.getElementById('ziel-status'),D=Object.keys(ZT.dirty||{});if(!D.length){if(st)st.textContent='Nichts geändert.';return;}
  var grund=null;if(D.some(function(mk){return zielLocks[mk];})){grund=prompt('Grund für die Änderung am festgeschriebenen Monat (steht im Protokoll):','');if(grund===null)return;}
  if(st)st.textContent='Speichere …';
  var all=[];D.forEach(function(mk){var old=ZT.saved[mk]||{},cur=zielStore[mk]||{};Object.keys(cur).forEach(function(eid){['optTag','margeOpt'].forEach(function(f){var a=old[eid]&&old[eid][f]!=null?+old[eid][f]:null,b=cur[eid][f]!=null?+cur[eid][f]:null;
      if(a!==b&&zielLocks[mk])ztLog(mk,eid,f==='optTag'?'Opt./Tag':'Marge/Opt.',a,b,grund);});});
    all=all.concat(ztRowsFor(mk,!!zielLocks[mk]||false));});
  sb.from('zielvereinbarung').upsert(all,{onConflict:'employee_id,month'}).then(function(res){if(res&&res.error){if(st)st.textContent='Fehler: '+res.error.message;alert('Speichern fehlgeschlagen: '+res.error.message);return;}
    D.forEach(function(mk){delete ZT.saved[mk];});ZT.dirty={};if(st)st.textContent='Gespeichert · '+new Date().toLocaleTimeString('de-DE');logActivity('ziel','updated','Zielvereinbarung gespeichert',null,D.join(', '));});}
function ztFestschreiben(mk){if(!ztIsAdmin())return;if(ZT.dirty&&ZT.dirty[mk]){alert('Bitte zuerst speichern.');return;}
  var L=ztEmps(mk),M=ztMonth(mk),snap={};L.forEach(function(e){var x=ztEmpMonth(e,mk),os=ztOS(e,mk);snap[e.id]={weeks:x.weeks.map(function(w){return w.n;}),optTag:x.opt,margeOpt:x.mo,ziel:Math.round(x.ziel),zielOS:Math.round(os.sum)};});
  if(!confirm(MONTH_NAMES_ZIEL[+mk.slice(5)-1]+' festschreiben?\n\nZiel Marge '+ztEur(M.ziel)+' · Ziel NL '+ztEur(M.nl)+'\nDie Einsatztage aus dem Kalender werden übernommen. Danach können nur Admins ändern, jede Änderung wird protokolliert.'))return;
  var rows=ztRowsFor(mk,true);var oldRec=zielStore[mk]||{};
  rows.forEach(function(r){var o=oldRec[r.employee_id];var nwA=[r.week1,r.week2,r.week3,r.week4,r.week5].concat(r.week6!=null?[r.week6]:[]),ow=o&&o.weeks?o.weeks.slice(0,nwA.length).join('/'):null,nw=nwA.join('/');if(ow&&ow!==nw)ztLog(mk,r.employee_id,'Einsatztage je KW (vorher gespeichert)',ow,nw,'beim Festschreiben aus dem Kalender übernommen');});
  sb.from('zielvereinbarung').upsert(rows,{onConflict:'employee_id,month'}).then(function(res){if(res&&res.error){alert('Festschreiben abgebrochen, nichts gesperrt: '+res.error.message);return;}
    rows.forEach(function(r){if(!zielStore[mk])zielStore[mk]={};if(!zielStore[mk][r.employee_id])zielStore[mk][r.employee_id]={};zielStore[mk][r.employee_id].weeks=[r.week1,r.week2,r.week3,r.week4,r.week5].concat(r.week6!=null?[r.week6]:[]);});
    var lk={month:mk,festgeschrieben_von:kalActor(),ziel_nl:M.nl,ziel_marge:Math.round(M.ziel),ziel_os:Math.round(M.os),snapshot:snap};
    sb.from('ziel_festschreibung').upsert(lk,{onConflict:'month'}).then(function(r2){if(r2&&r2.error){alert('Sperre konnte nicht gespeichert werden: '+r2.error.message+'\nDie Werte sind gespeichert, der Monat ist aber nicht gesperrt.');return;}
      lk.festgeschrieben_am=new Date().toISOString();zielLocks[mk]=lk;ztLog(mk,null,'Monat festgeschrieben',null,'Ziel Marge '+Math.round(M.ziel)+' · Ziel OS '+Math.round(M.os));logActivity('ziel','locked','Zielvereinbarung festgeschrieben',null,mk);renderTeam();});});}
