// Sales OS – Provision: Berechnung, Vereinbarung, Monatsabschluss, Provisions-Popup
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function toggleProvisionTeamDropdown(){provisionTeamDropdownOpen=!provisionTeamDropdownOpen;if(!provisionTeamDropdownOpen)provisionTeamSearchQuery='';renderProvisionTeam();}
function toggleProvisionTeamEmpId(id){
  var visIds=employees.filter(function(e){return provFlag(e)&&canSeeSalary(e)&&(currentUserRole==='admin'||isAgentEmp(e)||canSeeArea('provCoaches'));}).map(function(e){return e.id;});
  if(!provisionTeamSelectedIds)provisionTeamSelectedIds=visIds.slice();
  var idx=provisionTeamSelectedIds.indexOf(id);
  if(idx>=0)provisionTeamSelectedIds.splice(idx,1);else provisionTeamSelectedIds.push(id);
  renderProvisionTeam();
}
function setProvisionTeamSelectAll(allIds){provisionTeamSelectedIds=allIds.slice();renderProvisionTeam();}
function setProvisionTeamSelectNone(){provisionTeamSelectedIds=[];renderProvisionTeam();}
function filterProvisionTeamEmpList(q){
  q=(q||'').toLowerCase();
  document.querySelectorAll('#provisionTeamEmpScrollList .emp-opt-row').forEach(function(row){
    row.style.display=row.dataset.search.indexOf(q)>=0?'grid':'none';
  });
}
function setProvisionCustomMonth(val){provisionMode='custom';provisionCustomMonth=val;if(document.getElementById('ppSecP'))ppRenderProv();if(view==='provisionTeam')renderMain();else renderTab();}
function setProvisionMode(m){provisionMode=m;if(document.getElementById('ppSecP'))ppRenderProv();if(view==='provisionTeam')renderMain();else renderTab();}
function provKpiCat(k){for(var i=0;i<PROV_KPI_CAT.length;i++)if(PROV_KPI_CAT[i].k===k)return PROV_KPI_CAT[i];return null;}
function provKpiLabel(c){return c.lbl+' ('+(c.dir==='lte'?'Max.':'Min.')+')'+(c.unit?' ('+c.unit+')':'');}
// Ist-Wert einer Kennzahl aus einer Monatszeile (Rohsummen), Stunden und Tagen
function provKpiIst(k,row,hours,days){var n=function(f){return +row[f]||0;},oem=n('convOEM'),tw=n('convTW'),yes=n('convYes'),sy=n('convSY'),my=n('convMY'),ups=n('ups_yes'),wka=n('wka_gesamt_yes'),opt=row.optGesamt||(oem+ups+wka)||0,q=yes+sy+my,akt=n('gesamtAktivitaeten')||n('oem_aktivitaeten'),pct=function(a,b){return b>0?a/b*100:0;};
  switch(k){case 'optH':return hours>0?opt/hours:0;case 'crOem':return pct(oem,oem+n('notSuccessful'));case 'tw':return pct(tw,tw+q);case 'my':return pct(my,q);case 'syMy':return pct(sy+my,q);case 'oemAnteil':return pct(oem,opt);
    case 'crGes':return pct(opt,opt+n('gesamtNichtErfolgreich'));case 'crUps':return pct(ups,ups+n('upsNichtErfolgreich'));case 'crWka':return pct(wka,wka+n('wkaOemNichtErfolgreich')+n('wkaUpsNichtErfolgreich'));
    case 'anteilUps':return pct(ups,opt);case 'anteilWka':return pct(wka,opt);case 'aktivitaeten':return hours>0?akt/hours:0;
    case 'notReached':return pct(n('gesamtNichtErreicht'),akt);case 'notPossible':return pct(n('gesamtNichtMoeglich'),akt);case 'notSuccessful':return pct(n('gesamtNichtErfolgreich'),akt);
    case 'crYes':return pct(yes,q);case 'sy':return pct(sy,q);case 'optGesamt':return days>0?opt/days:0;case 'convOEM':return days>0?oem/days:0;case 'margeZiel':return days>0?(n('margeGesamt')||n('margin'))/days:0;}
  return 0;}
// Ziehen zwischen „Provisionsrelevant“ und „Ergänzend“ im Einstellungsformular
function provKpiDragStart(ev,k){try{ev.dataTransfer.setData('text/plain','kpi:'+k);ev.dataTransfer.effectAllowed='move';}catch(e){}window._provKpiDrag=k;}
function provKpiDragOver(ev){if(window._provKpiDrag){ev.preventDefault();ev.currentTarget.classList.add('pk-over');}}
function provKpiDragLeave(ev){ev.currentTarget.classList.remove('pk-over');}
function provKpiDrop(ev,zone){ev.preventDefault();var tb=ev.currentTarget;tb.classList.remove('pk-over');var k=window._provKpiDrag;window._provKpiDrag=null;if(!k)return;
  var tr=document.querySelector('tr[data-kpi="'+k+'"]');if(!tr)return;var target=tb.tagName==='TBODY'?tb:tb.querySelector('tbody');if(!target)return;
  var over=ev.target.closest&&ev.target.closest('tr[data-kpi]');if(over&&over!==tr&&over.parentNode===target)target.insertBefore(tr,over);else target.appendChild(tr);provKpiSync();}
function provKpiSync(){var prov=document.querySelector('tbody[data-pkzone="prov"]'),erg=document.querySelector('tbody[data-pkzone="erg"]');if(!prov)return;
  var L=[].map.call(prov.querySelectorAll('tr[data-kpi]'),function(t){return t.dataset.kpi;});var h=document.getElementById('pv-kpis');if(h)h.value=JSON.stringify(L);
  var c5=document.getElementById('pk-count-prov');if(c5)c5.textContent=L.length+' Kennzahlen';var c6=document.getElementById('pk-count-erg');if(c6&&erg)c6.textContent=erg.querySelectorAll('tr[data-kpi]').length+' Kennzahlen';
  [].forEach.call(prov.querySelectorAll('tr[data-kpi]'),function(t){var b=t.querySelector('.pk-badge');var std=PROV_KPI_DEFAULT.indexOf(t.dataset.kpi)>=0;if(b){b.style.display=std?'none':'';b.textContent='eigene';}});
  if(erg)[].forEach.call(erg.querySelectorAll('tr[data-kpi]'),function(t){var b=t.querySelector('.pk-badge');var std=PROV_KPI_DEFAULT.indexOf(t.dataset.kpi)<0;if(b){b.style.display=std?'none':'';b.textContent='verschoben';}});}
function provisionKpiSetFor(pv,bm){
  if(bm===1)return pv.monat1||{};
  if(bm===2)return pv.monat2||{};
  return pv.monat3plus||{};
}
// Versionen: provisionSettings.versionen = [{ab:'YYYY-MM', s:{…Einstellungen…}, am, von}]. Jeder Monat rechnet mit der Version, die in ihm galt.
function provVersionFor(emp,mk){var ps=emp&&emp.provisionSettings;if(!ps||!Array.isArray(ps.versionen)||!ps.versionen.length)return null;mk=mk||today().slice(0,7);
  var best=null;ps.versionen.forEach(function(v){if(v&&v.ab&&v.ab<=mk&&(!best||v.ab>best.ab))best=v;});return best;}
function effectiveProvisionSettings(emp,monthKey){
  var _v=provVersionFor(emp,monthKey);if(_v){emp=Object.assign({},emp,{provisionSettings:Object.assign({},_v.s||{})});}
  var pv=Object.assign({},PROVISION_DEFAULTS,(emp&&emp.provisionSettings)||{});
  ['monat1','monat2','monat3plus'].forEach(function(mk){
    pv[mk]=Object.assign({},PROVISION_DEFAULTS[mk],(emp&&emp.provisionSettings&&emp.provisionSettings[mk])||{});
  });
  var sv=(emp&&emp.provisionSettings&&emp.provisionSettings.vlc)||{};
  var v=Object.assign({},VLC_PROVISION_DEFAULTS,sv);
  ['monat1','monat2','monat3plus'].forEach(function(mk){v[mk]=Object.assign({},VLC_PROVISION_DEFAULTS[mk],sv[mk]||{});});
  v.stufen={};
  ['optH','syMy','crOem'].forEach(function(k){v.stufen[k]=Object.assign({},VLC_PROVISION_DEFAULTS.stufen[k],(sv.stufen&&sv.stufen[k])||{});});
  pv.vlc=v;
  var ks=(emp&&emp.provisionSettings&&Array.isArray(emp.provisionSettings.kpis))?emp.provisionSettings.kpis.filter(function(k){return !!provKpiCat(k);}):null;
  pv.kpis=ks&&ks.length?ks:PROV_KPI_DEFAULT.slice();
  return pv;
}
function isVlcProvision(emp){return !!(emp&&emp.role==='VLC');}
// KPI-Ziele, die in den Provisionstabellen farblich geprueft werden (VLC: nur CR OEM und SY/MY)
function provisionRowKpiSet(emp,pv,bm){
  if(isVlcProvision(emp)){
    var vm=bm===1?pv.vlc.monat1:bm===2?pv.vlc.monat2:pv.vlc.monat3plus;
    return {optH:vm.optH,crOem:vm.crOem,syMy:vm.syMy,tw:vm.tw,my:vm.my,oemAnteil:vm.oemAnteil};
  }
  var ks=provisionKpiSetFor(pv,bm),o={};PROV_KPI_DEFAULT.forEach(function(k){o[k]=(pv.kpis||PROV_KPI_DEFAULT).indexOf(k)>=0?ks[k]:null;});return o;
}
function calculateVlcProvision(emp,monthKey,row,dayCount,pv){
  var v=pv.vlc;
  var convTW=row.convTW||0, convYes=row.convYes||0, convSY=row.convSY||0, convMY=row.convMY||0;
  var ups=row.ups_yes||0, wka=row.wka_gesamt_yes||0, convOEM=row.convOEM||0;
  var optGes=row.optGesamt||(convOEM+ups+wka)||0;
  var qualifizierendeOpt=convTW+convYes+convSY+convMY+ups+wka;
  var basis=qualifizierendeOpt*(v.bonusProOpt||0);
  var monthDatesV=(performance[emp.id]||[]).filter(function(x){return (x.date||'').slice(0,7)===monthKey;}).map(function(x){return x.date;});
  var stundenV=totalWorkHoursForMonth(emp,monthKey,monthDatesV);
  var optPerH=stundenV>0?optGes/stundenV:0;
  var oemDen=convOEM+(row.notSuccessful||0);
  var crOEM=oemDen>0?convOEM/oemDen*100:0;
  var yd=convYes+convSY+convMY;
  var crSyMy=yd>0?(convSY+convMY)/yd*100:0;
  var bm=beschaeftigungsmonat(emp,monthKey);
  var vm=bm===1?v.monat1:bm===2?v.monat2:v.monat3plus;
  var checks=[{k:'optH',label:'Opt./Std.',ist:optPerH},{k:'syMy',label:'SY/MY-Anteil',ist:crSyMy},{k:'crOem',label:'CR OEM',ist:crOEM}];
  var faktor=100, fehlend=[];
  checks.forEach(function(c){
    var ziel=vm[c.k]; if(ziel==null||ziel==='')return;
    if(c.ist>=ziel)return;
    var s=v.stufen[c.k]||{};
    var f=(s.aus1!=null?s.aus1:100), stufe=1;
    if(s.grenze!=null&&s.grenze!==''&&c.ist<s.grenze&&s.aus2!=null){f=s.aus2;stufe=2;}
    fehlend.push(c.label+' (Stufe '+stufe+' · '+f+' %)');
    if(f<faktor)faktor=f;
  });
  var provision=basis*faktor/100;
  return {basis:basis,umsatz:0,regulaer:basis,abzug:basis-provision,provision:provision,fehlendeKpis:fehlend,mindestleistungGreift:false,beschaeftigungsmonat:bm,vlc:true,auszahlungPct:faktor,optPerH:optPerH,qualifizierendeOpt:qualifizierendeOpt,bonusProOpt:v.bonusProOpt||0};
}
function calculateProvision(emp,monthKey,row,dayCount){
  var pv=effectiveProvisionSettings(emp,monthKey);
  if(isVlcProvision(emp))return calculateVlcProvision(emp,monthKey,row,dayCount,pv);
  var convTW=row.convTW||0, convYes=row.convYes||0, convSY=row.convSY||0, convMY=row.convMY||0;
  var ups=row.ups_yes||0, wka=row.wka_gesamt_yes||0;
  var convOEM=row.convOEM||0, optGes=row.optGesamt||(convOEM+ups+wka)||0;
  var margeOEM=row.margeOEM||0, margeUpsell=row.margeUpsell||0, margeWKA=row.margeWKA||0;
  var margeGesamt=row.margeGesamt||row.margin||0;
  // Opt./Std. konsistent mit der Tabelle berechnen: echte tagesgenaue Arbeitsstunden
  // (Wochenarbeitszeiten je Wochentag), nicht die grobe "Stunden/5 * Tage"-Naeherung
  var monthDatesCalc=(performance[emp.id]||[]).filter(function(x){return (x.date||'').slice(0,7)===monthKey;}).map(function(x){return x.date;});
  var totalHoursCalc=totalWorkHoursForMonth(emp,monthKey,monthDatesCalc);
  var optPerH=totalHoursCalc>0?optGes/totalHoursCalc:0;
  var notSOemCalc=row.notSuccessful||0;
  var oemDenomCalc=convOEM+notSOemCalc;
  var crOEM=oemDenomCalc>0?(convOEM/oemDenomCalc*100):0;
  var crTW=(convTW+convYes+convSY+convMY)>0?(convTW/(convTW+convYes+convSY+convMY)*100):0;
  var crSY=(convYes+convSY+convMY)>0?(convSY/(convYes+convSY+convMY)*100):0;
  var crMY=(convYes+convSY+convMY)>0?(convMY/(convYes+convSY+convMY)*100):0;
  var crSyMy=(convYes+convSY+convMY)>0?((convSY+convMY)/(convYes+convSY+convMY)*100):0;
  var anteilOem=optGes>0?(convOEM/optGes*100):0;

  // §2 Abs. 1 - Basisprovision (Convertible Hardware existiert aktuell nicht im System, daher nicht enthalten)
  var qualifizierendeOpt=convTW+convYes+convSY+convMY+ups+wka;
  var basis=qualifizierendeOpt*(pv.basisProOpt||0);

  // §2 Abs. 2 - Umsatzabhaengige Provision
  // "Prozentsatz X" ist eine Prozent-ZAHL (z.B. 3 = 3%), daher fuer die Multiplikation durch 100 teilen
  var pctOem=pv.divOEM?(margeGesamt/pv.divOEM)/100:0;
  var pctUps=pv.divUpsell?(margeGesamt/pv.divUpsell)/100:0;
  var pctWka=pv.divWka?(margeGesamt/pv.divWka)/100:0;
  var provOem=margeOEM*pctOem;
  var provUps=margeUpsell*pctUps;
  var provWka=margeWKA*pctWka;
  var umsatz=provOem+provUps+provWka;

  var regulaer=basis+umsatz;

  // §3/§4 - KPI-Pruefung je Beschaeftigungsmonat
  var bm=beschaeftigungsmonat(emp,monthKey);
  var kpiSet=provisionKpiSetFor(pv,bm);
  // Geprüft werden die provisionsrelevanten KPIs dieses Mitarbeiters (Standard: Opt./Std., CR OEM, CR TW, CR MY, CR SY/MY, Anteil OEM)
  var LBL={optH:'Opt./Std.',tw:'TW-Anteil',syMy:'SY/MY-Anteil',my:'MY-Anteil',oemAnteil:'OEM-Anteil'};
  var checks=(pv.kpis||PROV_KPI_DEFAULT).map(function(k){var c=provKpiCat(k);if(!c)return null;var ist=k==='optH'?optPerH:provKpiIst(k,row,totalHoursCalc,dayCount);return {label:LBL[k]||c.lbl,ist:ist,ziel:kpiSet[k],dir:c.dir};}).filter(Boolean);
  var fehlendeKpis=checks.filter(function(c){
    if(c.ziel==null)return false;
    return c.dir==='gte'?c.ist<c.ziel:c.ist>c.ziel;
  });

  var reduktionProKpi=(pv.reduktionProKpi!=null?pv.reduktionProKpi:20)/100;
  var mindestprovisionPct=(pv.mindestprovision!=null?pv.mindestprovision:20)/100;
  var reduktionGesamt=Math.min(fehlendeKpis.length*reduktionProKpi,1-mindestprovisionPct);
  var provisionNachKpi=regulaer*(1-reduktionGesamt);

  // §5 - Mindestleistung ab Beschaeftigungsmonat 2
  var mindestleistung=pv.mindestleistungOptH!=null?pv.mindestleistungOptH:2.5;
  var finalProvision=provisionNachKpi;
  var mindestleistungGreift=(bm>=2&&optPerH<mindestleistung);
  if(mindestleistungGreift){
    finalProvision=regulaer*mindestprovisionPct;
  }

  var abzug=regulaer-finalProvision;
  return {checks:checks,mindestleistung:mindestleistung,reduktionProKpi:reduktionProKpi,basis:basis,umsatz:umsatz,regulaer:regulaer,abzug:abzug,provision:finalProvision,fehlendeKpis:fehlendeKpis.map(function(c){return c.label;}),mindestleistungGreift:mindestleistungGreift,beschaeftigungsmonat:bm};
}
function renderProvisionTeam(){
  var ma=document.getElementById('mainArea');if(!ma)return;
  var h='<div class="content">';
  h+=buildGlobalBannerHtml(employees.filter(function(e){return !e.isPureCoach;}));
  h+=buildProvisionTeamTable();
  h+='</div>';
  ma.innerHTML=h;
}
function loadProvExtra(){return sb.from('provision_extra').select('employee_id,monat,betrag').then(function(res){
  if(res&&res.error){PROV_EXTRA_TABLE=false;PROV_EXTRA=JSON.parse(JSON.stringify(settings.provisionExtra||{}));return true;}
  PROV_EXTRA_TABLE=true;PROV_EXTRA={};(res.data||[]).forEach(function(r){(PROV_EXTRA[r.monat]=PROV_EXTRA[r.monat]||{})[String(r.employee_id)]=+r.betrag||0;});return true;}).catch(function(){PROV_EXTRA_TABLE=false;return true;});}
function provExtraGet(eid,mk){var x=PROV_EXTRA[mk]||(PROV_EXTRA_TABLE?{}:((settings.provisionExtra||{})[mk]||{}));return +x[String(eid)]||0;}
function provExtraSet(eid,mk,v){if(currentUserRole!=='admin')return;var n=Math.max(0,Math.round(+String(v).replace(',','.')||0)),e=kalEmp(eid),log='Provision Optional: '+(e?e.name:eid)+' · '+mk+' · €'+n;
  (PROV_EXTRA[mk]=PROV_EXTRA[mk]||{});if(n)PROV_EXTRA[mk][String(eid)]=n;else delete PROV_EXTRA[mk][String(eid)];
  if(PROV_EXTRA_TABLE){var q=n?sb.from('provision_extra').upsert({employee_id:eid,monat:mk,betrag:n,geaendert_von:qaCurrentName()||null,geaendert_am:new Date().toISOString()},{onConflict:'employee_id,monat'}):sb.from('provision_extra').delete().eq('employee_id',eid).eq('monat',mk);
    q.then(function(r){if(r&&r.error)alert('Speichern fehlgeschlagen: '+r.error.message);else logActivity('employee','updated',log);});}
  else{settings.provisionExtra=JSON.parse(JSON.stringify(PROV_EXTRA));saveSettingJson('provisionExtra',settings.provisionExtra,log);}
  renderMain();if(document.getElementById('ppSecP'))ppRenderProv();if(document.getElementById('pvpBody'))pvpRender();}
// Aus der Provision in den Kalender: Team-Ansicht des Monats, nur Abwesenheiten, Zeile des Mitarbeiters markiert
function provGoKal(eid,mk){var f=kalFilterCats();KAL.hide={};f.ses.forEach(function(o){KAL.hide[o[0]]=1;});KAL.loc='ALL';KAL.chf={};KAL.view='team';KAL.cur=mk+'-01';KAL.focusEmp=String(eid);selectKalender();
  setTimeout(function(){var n=document.querySelector('.kal-tl .kal-nmc[data-eid="'+eid+'"]');if(n){n.scrollIntoView({block:'center',behavior:'smooth'});n.classList.add('kal-focus');setTimeout(function(){n.classList.remove('kal-focus');},2500);}},80);}
function loadProvClosed(){return sb.from('provision_monat').select('*').then(function(res){if(res&&res.error){PROV_CLOSED_TABLE=false;return true;}PROV_CLOSED_TABLE=true;PROV_CLOSED={};
  (res.data||[]).forEach(function(m){PROV_CLOSED[m.monat]={von:m.abgeschlossen_von||'',am:(m.abgeschlossen_am||'').slice(0,10),rows:{}};});
  return sb.from('provision_abschluss').select('monat,employee_id,werte').then(function(r2){(r2&&r2.data||[]).forEach(function(x){if(PROV_CLOSED[x.monat])PROV_CLOSED[x.monat].rows[String(x.employee_id)]=typeof x.werte==='string'?JSON.parse(x.werte):x.werte;});
    // C3: gesperrter Monat ohne eingefrorene Werte (alter Abbruch) rechnet weiter live statt 0 € zu zeigen
    if(r2&&!r2.error)Object.keys(PROV_CLOSED).forEach(function(mk){if(!Object.keys(PROV_CLOSED[mk].rows).length){console.warn('Provision '+mk+': abgeschlossen, aber ohne Werte – wird live berechnet');delete PROV_CLOSED[mk];}});return true;});}).catch(function(){PROV_CLOSED_TABLE=false;return true;});}
function provCloseMonth(mk){if(currentUserRole!=='admin')return;var ml=KAL_MON[+mk.slice(5,7)-1]+' '+mk.slice(0,4);
  // Werte aller Mitarbeiter mit Daten in diesem Monat einsammeln (gleiche Berechnung wie die Tabelle)
  var sv={m:provisionMode,c:provisionCustomMonth,sel:provisionTeamSelectedIds};provisionMode='custom';provisionCustomMonth=mk;provisionTeamSelectedIds=null;window._provSnap={};
  try{buildProvisionTeamTable();}finally{var snap=window._provSnap;window._provSnap=null;provisionMode=sv.m;provisionCustomMonth=sv.c;provisionTeamSelectedIds=sv.sel;}
  var ids=Object.keys(snap),warn=ids.filter(function(id){var p=snap[id].pt;return p&&p.sum!==p.at;}).map(function(id){var e=kalEmp(id);return e?e.name:id;});
  if(!ids.length){alert('Für '+ml+' gibt es keine Provisionsdaten.');return;}
  if(!confirm(ml+' abschließen?\n\n'+ids.length+' Mitarbeiter werden mit den aktuellen Werten eingefroren. Danach ändern Datenkorrekturen und geänderte Einstellungen diesen Monat nicht mehr.'+(warn.length?'\n\nAchtung, Tage stimmen noch nicht (x von X ⚠) bei: '+warn.join(', '):'')+'\n\nWurde der Monat mit der SFP abgeglichen?'))return;
  var who=(typeof qaCurrentName==='function'&&qaCurrentName())||'';
  // C3: provision_abschluss hängt per Fremdschlüssel an provision_monat, daher erst den Monat anlegen.
  // Scheitert das Schreiben der Werte, wird der Monat wieder gelöscht (nie „abgeschlossen mit 0 €“).
  var rows=ids.map(function(id){return {monat:mk,employee_id:id,werte:snap[id]};});
  function undo(msg){sb.from('provision_monat').delete().eq('monat',mk).then(function(r3){alert('Abschluss fehlgeschlagen: '+msg+(r3&&r3.error?'\n\nDer Monat konnte nicht wieder geöffnet werden ('+r3.error.message+'). Bitte neu laden und „Wieder öffnen“ klicken.':'\n\nDer Monat bleibt offen.'));},function(){alert('Abschluss fehlgeschlagen: '+msg+'\n\nBitte neu laden und prüfen, ob der Monat offen ist.');});}
  sb.from('provision_monat').upsert({monat:mk,abgeschlossen_von:who,abgeschlossen_am:new Date().toISOString()},{onConflict:'monat'}).then(function(r){if(r&&r.error){alert('Abschluss fehlgeschlagen: '+r.error.message);return;}
    sb.from('provision_abschluss').upsert(rows,{onConflict:'monat,employee_id'}).then(function(r2){if(r2&&r2.error){undo(r2.error.message);return;}
      PROV_CLOSED[mk]={von:who,am:today(),rows:snap};logActivity('employee','updated','Provision '+ml+' abgeschlossen ('+ids.length+' Mitarbeiter)');renderMain();},function(e){undo(e&&e.message||String(e));});},function(e){alert('Abschluss fehlgeschlagen: '+(e&&e.message||e));});}
function provReopenMonth(mk){if(currentUserRole!=='admin')return;var ml=KAL_MON[+mk.slice(5,7)-1]+' '+mk.slice(0,4);
  if(!confirm(ml+' wieder öffnen?\n\nDie eingefrorenen Werte werden gelöscht, der Monat rechnet wieder mit den aktuellen Daten und Einstellungen.'))return;
  sb.from('provision_monat').delete().eq('monat',mk).then(function(r){if(r&&r.error){alert('Öffnen fehlgeschlagen: '+r.error.message);return;}delete PROV_CLOSED[mk];logActivity('employee','updated','Provision '+ml+' wieder geöffnet');renderMain();});}
// ── Fokus-Spalten: „CR (Fokus)“ / „Anteil (Fokus)“ zeigen je Person die provisionsrelevante Kennzahl (OEM, UPS, WKA)
function provFocus(emp,mk){var none={cr:'crOem',an:'oemAnteil'};if(!emp||!emp.id||emp.id==='__agg__'||isVlcProvision(emp))return none;var ks=effectiveProvisionSettings(emp,mk).kpis||PROV_KPI_DEFAULT;
  var cr=['crOem','crUps','crWka','crGes'].filter(function(k){return ks.indexOf(k)>=0;})[0]||'crOem',an=['oemAnteil','anteilUps','anteilWka'].filter(function(k){return ks.indexOf(k)>=0;})[0]||'oemAnteil';return {cr:cr,an:an};}
function provFocusTd(kind,key,emp,mk,row,hours,days,padding){var n=function(f){return +row[f]||0;},oem=n('convOEM'),ups=n('ups_yes'),wka=n('wka_gesamt_yes'),opt=row.optGesamt||(oem+ups+wka)||0;
  var cnt={crOem:oem,crUps:ups,crWka:wka,crGes:opt,oemAnteil:oem,anteilUps:ups,anteilWka:wka}[key];var v=Math.round(provKpiIst(key,row,hours,days));
  var pv=effectiveProvisionSettings(emp,mk),bm=beschaeftigungsmonat(emp,mk),z=(pv.kpis||[]).indexOf(key)>=0?provisionKpiSetFor(pv,bm)[key]:null,c=provKpiCat(key),bad=z!=null&&(c.dir==='lte'?v>z:v<z);
  var fam=kind==='cr'?['crOem','crUps','crWka']:['oemAnteil','anteilUps','anteilWka'],tip='<b>'+(kind==='cr'?'CR (Fokus)':'Anteil (Fokus)')+': '+c.lbl+'</b>'+fam.map(function(k){var x=Math.round(provKpiIst(k,row,hours,days));return '<br>'+(k===key?'<b>':'')+provKpiCat(k).lbl+' '+x+' %'+(k===key?'</b>':'');}).join('')+(z!=null?'<br>Ziel: '+(c.dir==='lte'?'≤ ':'≥ ')+z+' % · '+(bad?'verfehlt':'erfüllt'):'');
  return '<td style="padding:'+(padding||'13px 10px')+';border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;font-weight:600;'+(bad?'color:var(--red);font-weight:700':'color:var(--text)')+';cursor:help" data-ktip="'+esc(tip)+'"><div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.15"><span>'+v+'%</span><span style="font-size:11px;color:var(--text3);margin-top:1px"><span class="pf-tag pf-'+PROV_FOCUS_TAG[key].toLowerCase()+'">'+PROV_FOCUS_TAG[key]+'</span>'+cnt+'</span></div></td>';}
function provTageFor(emp,mk){var r={at:0,url:0,aus:0,fs:0,kra:0,ein:0,leer:[],doppelt:[]},d=mk+'-01',dd={};(performance[emp.id]||[]).forEach(function(x){if((x.date||'').slice(0,7)===mk)dd[x.date]=1;});
  var end=null;
  while(d.slice(0,7)===mk){if((!end||d<=end)&&(!emp.startDate||d>=emp.startDate)&&(!emp.endDate||d<=emp.endDate)&&kalWorkday(emp,d)){r.at++;var a=kalOn(emp.id,d),f=0;if(a&&!a.fixed&&a.status!=='abgelehnt'&&a.status!=='storniert'){f=a.halb?0.5:1;var k=a.art;if(k==='urlaub'||k==='flex')r.url+=f;else if(k==='ausgleich')r.aus+=f;else if(k==='freistellung')r.fs+=f;else r.kra+=f;}var e=dd[d]?(f===0.5?0.5:1):0;r.ein+=e;}d=kalAdd(d,1);}
  r.sum=r.ein+r.url+r.aus+r.fs+r.kra;return r;}
function buildProvisionTeamTable(){
  function stackCell(main,sub){
    var hasSubValue=(sub!==null&&sub!==undefined&&sub!=='');
    return '<div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.15">'
      +'<span>'+main+'</span>'
      +'<span style="font-size:11px;color:var(--text3);margin-top:1px;'+(hasSubValue?'':'visibility:hidden;')+'">'+(hasSubValue?sub:'0')+'</span>'
      +'</div>';
  }
  function stackCellLeft(main,sub){
    var hasSubValue=(sub!==null&&sub!==undefined&&sub!=='');
    return '<div style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.15">'
      +'<span>'+main+'</span>'
      +'<span style="font-size:11px;font-weight:400;color:var(--text3);margin-top:1px;'+(hasSubValue?'':'visibility:hidden;')+'">'+(hasSubValue?sub:'0')+'</span>'
      +'</div>';
  }
  function fc(v,t,dir){if(t==null)return '';return(dir==='lte'?v<=t:v>=t)?'color:var(--text)':'color:var(--red);font-weight:700';}
  // Jede Zahl aus ihrer Quelle: Ein. T. = Tage mit Leistungsdaten, Aus./Url./Kra. = Einträge im Kalender.
  // Die Summe wird gegen die möglichen Arbeitstage geprüft – stimmt sie nicht, fehlt ein Eintrag oder es gibt eine Überschneidung.
  function provTage(emp,mk){var r={at:0,url:0,aus:0,fs:0,kra:0,ein:0,leer:[],doppelt:[]},d=mk+'-01',dd={};
    (performance[emp.id]||[]).forEach(function(x){if((x.date||'').slice(0,7)===mk)dd[x.date]=1;});
    while(d.slice(0,7)===mk){if((!emp.startDate||d>=emp.startDate)&&(!emp.endDate||d<=emp.endDate)&&kalWorkday(emp,d)){r.at++;var a=kalOn(emp.id,d),f=0;
      if(a&&!a.fixed&&a.status!=='abgelehnt'&&a.status!=='storniert'){f=a.halb?0.5:1;var k=a.masked?(a.art==='urlaub'?'urlaub':'abwesend'):a.art;
        if(k==='urlaub'||k==='flex')r.url+=f;else if(k==='ausgleich')r.aus+=f;else if(k==='freistellung')r.fs+=f;else r.kra+=f;}
      var e=dd[d]?(f===0.5?0.5:1):0;r.ein+=e;
      if(f+e<1)r.leer.push(d);else if(f+e>1)r.doppelt.push(d);}d=kalAdd(d,1);}
    r.sum=r.ein+r.url+r.aus+r.fs+r.kra;return r;}
  function urlaubKrankTage(empId,monthKey){
    var rec=(zielStore[monthKey]||{})[empId];
    var urlaub=0,krank=0;
    if(rec&&rec.arbeitstage){
      Object.keys(rec.arbeitstage).forEach(function(ds){
        if(rec.arbeitstage[ds]==='urlaub')urlaub++;
        else if(rec.arbeitstage[ds]==='krank')krank++;
      });
    }
    return {urlaub:urlaub,krank:krank};
  }
  // Coaches (SDC/SDM) mit eigener Provision sehen nur Admins
  var visible=employees.filter(function(e){return provFlag(e)&&canSeeSalary(e)&&(currentUserRole==='admin'||isAgentEmp(e)||canSeeArea('provCoaches'));});
  var selectedEmps=provisionTeamSelectedIds?visible.filter(function(e){return provisionTeamSelectedIds.indexOf(e.id)>=0;}):visible;
  var isAll=!provisionTeamSelectedIds||provisionTeamSelectedIds.length===visible.length;
  var selLabel=isAll?'Alle Mitarbeiter':(selectedEmps.length===1?selectedEmps[0].name:selectedEmps.length+' Mitarbeiter ausgewählt');
  // Mitarbeiterkarte: dieselbe Tabelle, nur für diese Person
  if(window._provOnly){selectedEmps=employees.filter(function(e){return String(e.id)===window._provOnly&&canSeeSalary(e);});selLabel=selectedEmps.length?selectedEmps[0].name:'';isAll=false;}
  var curMk=today().slice(0,7), yr=(provisionMode==='custom'&&provisionCustomMonth?provisionCustomMonth:curMk).slice(0,4); // C2: gewählter Monat kann im Vorjahr liegen

  var h='<div class="card">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">';
  h+='<div class="card-title" style="margin:0"><i class="ti ti-cash"></i> Provision <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">· '+selLabel+'</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  h+='<div style="position:relative'+(window._provOnly?';display:none':'')+'" id="provisionTeamEmpDropdownWrap">';
  h+='<button class="btn btn-sm" style="height:34px;padding:0 12px;font-weight:500" onclick="toggleProvisionTeamDropdown()"><i class="ti ti-users"></i> '+selLabel+' <i class="ti ti-chevron-down" style="font-size:11px"></i></button>';
  if(provisionTeamDropdownOpen){
    h+='<div style="position:absolute;top:38px;left:0;z-index:20;background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;box-shadow:0 10px 24px rgba(40,32,15,0.14);width:260px;padding:10px 4px;display:flex;flex-direction:column">';
    h+='<div style="padding:0 8px 6px"><div style="display:flex;align-items:center;gap:6px;background:var(--bg2);border-radius:6px;padding:6px 8px">'
      +'<i class="ti ti-search" style="font-size:13px;color:var(--text3)"></i>'
      +'<input placeholder="Mitarbeiter suchen…" value="'+esc(provisionTeamSearchQuery)+'" oninput="provisionTeamSearchQuery=this.value;filterProvisionTeamEmpList(this.value)" style="border:none;background:none;outline:none;font-size:12.5px;width:100%;color:var(--text)">'
      +'</div></div>';
    h+='<div id="provisionTeamEmpScrollList" style="max-height:160px;overflow-y:auto;padding-top:4px">';
    var ROLE_ORDER={SDM:0,SDC:1,SDL:2,SE:3,SR:4,VLC:5};
    var sortedVisible=visible.slice().sort(function(a,b){
      var ra=ROLE_ORDER[a.role]!=null?ROLE_ORDER[a.role]:99,rb=ROLE_ORDER[b.role]!=null?ROLE_ORDER[b.role]:99;
      return ra-rb||a.name.localeCompare(b.name);
    });
    sortedVisible.forEach(function(e){
      var checked=isAll||selectedEmps.indexOf(e)>=0;
      h+='<label class="emp-opt-row" data-search="'+esc(e.name).toLowerCase()+'" style="display:grid;grid-template-columns:20px 38px 1fr;align-items:center;gap:8px;padding:5px 12px;font-size:12.5px;cursor:pointer;border-radius:6px;white-space:nowrap" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'
        +'<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleProvisionTeamEmpId(\''+e.id+'\')" style="cursor:pointer;margin:0">'
        +'<span style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.02em">'+e.role+'</span>'
        +'<span>'+esc(e.name)+'</span>'
        +'</label>';
    });
    h+='</div>';
    var _visIds=visible.map(function(e){return e.id;});
    h+='<div style="border-top:1px solid var(--border);margin:4px 0"></div>';
    h+='<div style="padding:2px 8px 2px;display:flex;flex-wrap:wrap;gap:2px 6px">';
    h+='<span onclick="setProvisionTeamSelectAll(['+_visIds.map(function(id){return '\''+id+'\'';}).join(',')+'])" style="font-size:11px;font-weight:600;color:var(--text2);padding:3px 6px;cursor:pointer;border-radius:5px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">Alle</span>';
    h+='<span onclick="setProvisionTeamSelectNone()" style="font-size:11px;font-weight:600;color:var(--text2);padding:3px 6px;cursor:pointer;border-radius:5px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">Keine</span>';
    h+='</div></div>';
  }
  h+='</div>';
  h+='<div style="display:flex;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;height:34px">';
  [{k:'month',l:'Aktueller Monat'},{k:'year',l:'Aktuelles Jahr'}].forEach(function(it){
    h+='<button style="padding:0 10px;height:100%;font-size:11.5px;font-weight:500;border:none;cursor:pointer;font-family:inherit;white-space:nowrap;background:'+(provisionMode===it.k?'#F08566':'transparent')+';color:'+(provisionMode===it.k?'#fff':'var(--text2)')+'" onclick="setProvisionMode(\''+it.k+'\')">'+it.l+'</button>';
  });
  h+='</div>';
  h+='<input type="month" value="'+provisionCustomMonth+'" onchange="setProvisionCustomMonth(this.value)" style="height:34px;width:128px;padding:0 8px;border:1px solid '+(provisionMode==='custom'?'#F08566':'var(--border2)')+';border-radius:var(--r-md);font-size:11.5px;font-family:inherit;color:var(--text);background:#fff;cursor:pointer">';
  h+='</div></div>';
  // Monatsabschluss (nur bei einem einzelnen Monat)
  (function(){if(provisionMode==='year'||!PROV_CLOSED_TABLE)return;var mk=provisionMode==='month'?curMk:provisionCustomMonth,cl=PROV_CLOSED[mk],ad=currentUserRole==='admin',ml=KAL_MON[+mk.slice(5,7)-1]+' '+mk.slice(0,4);
    if(cl)h+='<div class="pv-close on"><span class="lock"><i class="ti ti-lock"></i> '+ml+' abgeschlossen'+(cl.am?' am '+esc(cl.am.slice(8,10)+'.'+cl.am.slice(5,7)+'.'+cl.am.slice(0,4)):'')+(cl.von?' · '+esc(cl.von):'')+'</span><span class="kal-note">Eingefrorene Werte: spätere Datenkorrekturen oder geänderte Einstellungen wirken nicht mehr.</span>'+(ad?'<button class="btn btn-sm" style="margin-left:auto" onclick="provReopenMonth(\''+mk+'\')"><i class="ti ti-lock-open"></i> Wieder öffnen</button>':'')+'</div>';
    else h+='<div class="pv-close"><span class="pv-open-tag">offen · rechnet live</span><span class="kal-note">'+ml+' wird mit den aktuellen Daten und Einstellungen berechnet.</span>'+(ad?'<button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="provCloseMonth(\''+mk+'\')"><i class="ti ti-lock"></i> Monat abschließen</button>':'')+'</div>';})();

  // Alle Zeilen aller ausgewaehlten Mitarbeiter zusammenstellen (Mitarbeiter + Monat je Zeile)
  var allRows=[];
  selectedEmps.forEach(function(emp){
    var rowsAll=(performance[emp.id]||[]).filter(function(x){return (x.date||'').slice(0,4)===yr;});
    var grouped=groupPerfRows(rowsAll,'month');
    var rows=provisionMode==='month'?grouped.filter(function(g){return g.key===curMk;}):(provisionMode==='custom'?grouped.filter(function(g){return g.key===provisionCustomMonth;}):grouped);
    rows.forEach(function(g){if(PROV_CLOSED[g.key])return;allRows.push({emp:emp,g:g});});
    // abgeschlossene Monate: eingefrorene Werte statt Live-Daten
    Object.keys(PROV_CLOSED).forEach(function(mk){if(mk.slice(0,4)!==yr)return;if(provisionMode==='month'&&mk!==curMk)return;if(provisionMode==='custom'&&mk!==provisionCustomMonth)return;
      var fz=PROV_CLOSED[mk].rows[String(emp.id)];if(fz)allRows.push({emp:emp,g:{key:mk,label:fz.label,count:fz.count,row:fz.row},frozen:fz});});
  });
  if(provisionMode!=='year'){var _mk=provisionMode==='month'?curMk:provisionCustomMonth,_f=_mk+'-01',_l=kalAdd(kalAdd(_mk+'-28',4).slice(0,7)+'-01',-1);
    selectedEmps.forEach(function(emp){if(allRows.some(function(r){return r.emp.id===emp.id&&r.g.key===_mk;}))return;if((emp.endDate&&emp.endDate<_f)||(emp.startDate&&emp.startDate>_l))return;
      allRows.push({emp:emp,g:{key:_mk,label:KAL_MON[+_mk.slice(5,7)-1]+' '+_mk.slice(0,4),count:0,row:{}},empty:true});});}
  allRows.sort(function(a,b){return (a.empty?1:0)-(b.empty?1:0)||a.emp.name.localeCompare(b.emp.name)||b.g.key.localeCompare(a.g.key);});
  var sumKrank=0,sumUrlaub=0,sumAus=0,sumEin=0,sumAt=0,sumExtra=0,sumOEM=0,sumUps=0,sumWka=0,sumOptGes=0,sumRawTw=0,sumRawYes=0,sumRawSy=0,sumRawMy=0,sumMarge=0,sumAbzug=0,sumProvision=0,sumGesamtAkt=0,sumTotalHoursAll=0,sumNotSOem=0;

  if(!allRows.length){
    h+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-file-upload" style="font-size:26px;display:block;margin-bottom:8px"></i>Keine Daten für diesen Zeitraum</div>';
  } else {
    h+='<div style="overflow-x:auto;border-radius:var(--r-md);border:1px solid var(--border2)"><table style="width:100%;border-collapse:collapse;table-layout:fixed"><thead><tr>';
    ['Mitarbeiter','Monat','Aus. T.','Url. T.','Kra. T.','Ein. T.','Akt./Std.','OEM','UPS','WKA','Opt. Ges.','Opt./Std.','CR (Fokus)','CR TW','CR SY/MY','CR MY','Anteil (Fokus)','Marge Ges.','Abzug','Optional','Provision'].forEach(function(lbl,i){
      h+='<th style="background:#EFECE5;padding:9px 14px;text-align:'+(i<=1?'left':'right')+';font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);white-space:nowrap;width:'+(i===0?'150px':i===1?'130px':'80px')+'">'+lbl+'</th>';
    });
    h+='</tr></thead><tbody>';
    allRows.forEach(function(item,ridx){
      var emp=item.emp, g=item.g, row=g.row, _h0=h.length;

      var convOEM=row.convOEM||0, ups=row.ups_yes||0, wka=row.wka_gesamt_yes||0;
      var optGes=row.optGesamt||(convOEM+ups+wka)||0;
      var marge=row.margeGesamt||row.margin||0;
      var rawTw=row.convTW||0, rawYes=row.convYes||0, rawSy=row.convSY||0, rawMy=row.convMY||0;
      var notSOemVal=row.notSuccessful||0;
      var oemDenomVal=convOEM+notSOemVal;
      var crOEM=oemDenomVal>0?Math.round(convOEM/oemDenomVal*100):0;
      var crTW=(rawTw+rawYes+rawSy+rawMy)>0?Math.round(rawTw/(rawTw+rawYes+rawSy+rawMy)*100):0;
      var crSY=(rawYes+rawSy+rawMy)>0?Math.round(rawSy/(rawYes+rawSy+rawMy)*100):0;
      var crMY=(rawYes+rawSy+rawMy)>0?Math.round(rawMy/(rawYes+rawSy+rawMy)*100):0;
      var crSyMy=(rawYes+rawSy+rawMy)>0?Math.round((rawSy+rawMy)/(rawYes+rawSy+rawMy)*100):0;
      var anteilOem=optGes>0?Math.round(convOEM/optGes*100):0;
      var abwTage=urlaubKrankTage(emp.id,g.key),pt=provTage(emp,g.key);if(item.frozen&&item.frozen.pt)pt=item.frozen.pt;abwTage={krank:pt.kra,urlaub:pt.url,aus:pt.aus+pt.fs};
      var monthDates=(performance[emp.id]||[]).filter(function(x){return (x.date||'').slice(0,7)===g.key;}).map(function(x){return x.date;});
      var rowTotalHours=totalWorkHoursForMonth(emp,g.key,monthDates);if(item.frozen)rowTotalHours=item.frozen.hours||0;
      var gesamtAktivitaeten=row.gesamtAktivitaeten||row.oem_aktivitaeten||0;
      var aktPerHour_num=rowTotalHours>0?gesamtAktivitaeten/rowTotalHours:0;
      var aktProStd=aktPerHour_num.toFixed(1);
      var optPerH_num=rowTotalHours>0?optGes/rowTotalHours:0;
      var optProStd=optPerH_num.toFixed(1);
      var calc=calculateProvision(emp,g.key,row,g.count);if(item.frozen&&item.frozen.calc)calc=item.frozen.calc;
      var rowPv=effectiveProvisionSettings(emp,g.key);
      var rowBm=beschaeftigungsmonat(emp,g.key);
      var rowKpiSet=provisionRowKpiSet(emp,rowPv,rowBm);if(item.frozen&&item.frozen.kpiSet)rowKpiSet=item.frozen.kpiSet;if(item.empty){rowKpiSet={};}
      var _fc=provFocus(emp,g.key);
      var abzug, provision, provisionTitle='', abzugPct=null, provisionPct=null;
      if(calc.provision===null){
        abzug='—';provision='<span style="font-size:10.5px;color:var(--text3);font-weight:400">Keine Vereinbarung</span>';
      } else {
        abzug='−€'+Math.round(calc.abzug).toLocaleString('de-DE');
        provision='€'+Math.round(calc.provision).toLocaleString('de-DE');
        provisionPct=calc.regulaer>0?Math.round(calc.provision/calc.regulaer*100):100;
        abzugPct=100-provisionPct;
        provisionTitle=calc.vlc?' title="Bonus weWow: '+calc.qualifizierendeOpt+' Opt. × '+calc.bonusProOpt.toFixed(2).replace('.',',')+' € = €'+Math.round(calc.regulaer).toLocaleString('de-DE')
          +' · Opt./Std. '+calc.optPerH.toFixed(2).replace('.',',')+' · Auszahlung '+calc.auszahlungPct+' %'
          +(calc.fehlendeKpis.length?' · Nicht erfüllt: '+calc.fehlendeKpis.join(', '):' · Alle KPIs erfüllt')+' · Extra Pay noch nicht eingerechnet"'
          :' title="Regulär: €'+Math.round(calc.regulaer).toLocaleString('de-DE')
          +' (Basis €'+Math.round(calc.basis).toLocaleString('de-DE')+' + Umsatz €'+Math.round(calc.umsatz).toLocaleString('de-DE')+')'
          +(calc.mindestleistungGreift?' · Mindestleistung unterschritten (§5)':'')
          +(calc.fehlendeKpis.length?' · Nicht erfüllte KPIs: '+calc.fehlendeKpis.join(', '):' · Alle KPIs erfüllt')+'"';
      }
      var extra=item.frozen?(+item.frozen.extra||0):provExtraGet(emp.id,g.key);
      if(window._provSnap&&!item.frozen&&!item.empty)window._provSnap[String(emp.id)]={label:g.label,count:g.count,row:row,pt:pt,hours:rowTotalHours,calc:calc,kpiSet:rowKpiSet,extra:extra};if(calc.provision!==null&&extra){provision='€'+Math.round(calc.provision+extra).toLocaleString('de-DE');}
      // Erklärung als schwarze Info-Box (wie überall im Board) statt Browser-Tooltip
      if(provisionTitle){provisionTitle=provisionTitle.replace(' title="',' data-ktip="').split(' · ').join('<br>');if(extra)provisionTitle=provisionTitle.replace(/"$/,'<br>inkl. €'+Math.round(extra).toLocaleString('de-DE')+' Optional (ohne Abzug)"');}
      sumExtra+=extra;
      sumKrank+=abwTage.krank;sumUrlaub+=abwTage.urlaub;sumAus+=abwTage.aus;sumEin+=pt.ein;sumAt+=pt.at;sumOEM+=convOEM;sumUps+=ups;sumWka+=wka;sumOptGes+=optGes;sumNotSOem+=notSOemVal;
      sumRawTw+=rawTw;sumRawYes+=rawYes;sumRawSy+=rawSy;sumRawMy+=rawMy;sumMarge+=marge;
      sumAbzug+=(calc.abzug||0);sumProvision+=(calc.provision||0)+(calc.provision!==null?extra:0);
      sumGesamtAkt+=gesamtAktivitaeten;sumTotalHoursAll+=rowTotalHours;
      var rowBg=ridx%2===1?'background:var(--s-tint);':'';
      h+='<tr class="perf-data-row'+(item.frozen?' pv-frozen':'')+(item.empty?' pv-empty':'')+'" style="'+rowBg+'">'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);font-weight:600;white-space:nowrap;cursor:pointer" onclick="openPerfPopup(\''+emp.id+'\')" title="Popup öffnen">'+esc(emp.name)+'<div style="font-size:11px;color:var(--text3);font-weight:400">'+emp.role+'</div></td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);font-weight:600;white-space:nowrap">'+(function(){var ok=pt.sum===pt.at,fm=function(L){return L.map(function(x){return kalF(x);}).join(', ');};
          var tip='<b>'+kalNf(pt.sum)+' von '+pt.at+' Arbeitstagen belegt</b><br>'+kalNf(pt.ein)+' Einsatz (Tage mit Daten) + '+kalNf(pt.aus+pt.fs)+' Ausgleich'+(pt.fs?' (davon '+kalNf(pt.fs)+' Freistellung)':'')+' + '+kalNf(pt.url)+' Urlaub + '+kalNf(pt.kra)+' Krank'
            +(pt.leer.length?'<br><br><b>Ohne Daten und ohne Eintrag:</b><br>'+fm(pt.leer):'')+(pt.doppelt.length?'<br><br><b>Daten und Abwesenheit am selben Tag:</b><br>'+fm(pt.doppelt):'');
          return '<span data-ktip="'+esc(tip)+'">'+stackCellLeft(g.label,'<span style="'+(ok?'':'color:var(--red);font-weight:700')+'">'+kalNf(pt.sum)+' von '+pt.at+' Tagen'+(ok?'':' ⚠')+'</span>')+'</span>';})()+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;cursor:pointer" title="Im Kalender ansehen (Team, nur Abwesenheiten)" onclick="provGoKal(\''+emp.id+'\',\''+g.key+'\')">'+stackCell('<span style="text-decoration:underline dotted;text-underline-offset:3px">'+kalNf(abwTage.aus)+'</span>',null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;cursor:pointer" title="Im Kalender ansehen (Team, nur Abwesenheiten)" onclick="provGoKal(\''+emp.id+'\',\''+g.key+'\')">'+stackCell('<span style="text-decoration:underline dotted;text-underline-offset:3px">'+kalNf(abwTage.urlaub)+'</span>',null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;cursor:pointer" title="Im Kalender ansehen (Team, nur Abwesenheiten)" onclick="provGoKal(\''+emp.id+'\',\''+g.key+'\')">'+stackCell('<span style="text-decoration:underline dotted;text-underline-offset:3px">'+kalNf(abwTage.krank)+'</span>',null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600">'+stackCell(kalNf(pt.ein),'von '+pt.at)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;'+(gesamtAktivitaeten>0?fc(+aktPerHour_num.toFixed(1),rowKpiSet.aktivitaeten,'gte'):'')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Akt./Std. = Aktivitäten / Stunden\',\'Aktivitäten\','+gesamtAktivitaeten+',\'Stunden\','+rowTotalHours.toFixed(1)+',\'Akt./Std.\',\''+aktProStd+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(aktProStd,gesamtAktivitaeten)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'OEM = Opt.OEM / Opt.Ges.\',\'Opt.OEM\','+convOEM+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(convOEM/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?convOEM:'—'),(optGes>0?Math.round(convOEM/optGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'Upsells = Opt.Upsells / Opt.Ges.\',\'Opt.Upsells\','+ups+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(ups/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?ups:'—'),(optGes>0?Math.round(ups/optGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'WKA = Opt.WKA / Opt.Ges.\',\'Opt.WKA\','+wka+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(wka/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?wka:'—'),(optGes>0?Math.round(wka/optGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;cursor:help" onmouseenter="showBreakdownTooltip(event,\'Opt. Ges. Aufschlüsselung\','+convOEM+','+ups+','+wka+')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(optGes,null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);border-left:2px solid var(--border2);background:var(--s-tint);text-align:right;'+fc(optPerH_num,rowKpiSet.optH,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Opt./Std. = Opt.Ges. / Stunden\',\'Opt.Ges.\','+optGes+',\'Stunden\','+rowTotalHours.toFixed(1)+',\'Opt./Std.\',\''+optProStd+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(optProStd,null)+'</td>'
        +(_fc.cr!=='crOem'?provFocusTd('cr',_fc.cr,emp,g.key,row,rowTotalHours,g.count):('<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;font-weight:600;'+fc(crOEM,rowKpiSet.crOem,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR OEM = Opt.OEM / (Opt.OEM + NERR OEM)\',\'Opt.OEM\','+convOEM+',\'Opt.OEM + NERR OEM\','+oemDenomVal+',\'CR OEM\',\''+crOEM+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crOEM+'%',convOEM)+'</td>'))
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crTW,rowKpiSet.tw,'lte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR TW = TW / (TW+Yes+SY+MY)\',\'TW\','+rawTw+',\'CR TW\',\''+crTW+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crTW+'%',rawTw)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crSyMy,rowKpiSet.syMy,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR SY/MY = (SY+MY) / (Yes+SY+MY)\',\'SY+MY\','+(rawSy+rawMy)+',\'CR SY/MY\',\''+crSyMy+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crSyMy+'%',rawSy+rawMy)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crMY,rowKpiSet.my,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR MY = MY / (Yes+SY+MY)\',\'MY\','+rawMy+',\'CR MY\',\''+crMY+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crMY+'%',rawMy)+'</td>'
        +(_fc.an!=='oemAnteil'?provFocusTd('an',_fc.an,emp,g.key,row,rowTotalHours,g.count).replace('border-bottom:1px solid var(--border);','border-bottom:1px solid var(--border);border-right:2px solid var(--border2);'):('<td style="padding:13px 10px;border-bottom:1px solid var(--border);border-right:2px solid var(--border2);background:var(--s-tint);text-align:right;'+fc(anteilOem,rowKpiSet.oemAnteil,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Anteil OEM = Opt.OEM / Opt.Ges.\',\'Opt.OEM\','+convOEM+',\'Opt.Ges.\','+optGes+',\'Anteil OEM\',\''+anteilOem+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(anteilOem+'%',convOEM)+'</td>'))
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;color:var(--text);cursor:help" onmouseenter="showBreakdownTooltip(event,\'Marge Ges. Aufschlüsselung\',\'€'+Math.round(row.margeOEM||0).toLocaleString('de-DE')+'\',\'€'+Math.round(row.margeUpsell||0).toLocaleString('de-DE')+'\',\'€'+Math.round(row.margeWKA||0).toLocaleString('de-DE')+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell('€'+Math.round(marge).toLocaleString('de-DE'),(optGes>0?'€'+(marge/optGes).toFixed(0)+' Ø/Opt.':null))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--red)"'+provisionTitle+'>'+stackCell(abzug,(abzugPct!==null?abzugPct+'%':null))+'</td>'
        +'<td style="padding:8px 8px;border-bottom:1px solid var(--border);text-align:right">'+(currentUserRole==='admin'&&!item.frozen?'<input type="number" step="1" min="0" placeholder="0" value="'+(extra||'')+'" title="Zusatzbetrag in €, wird ohne Abzug auf die Provision gerechnet" style="width:100%;max-width:90px;height:30px;padding:0 6px;text-align:right;font-size:12.5px" data-e="'+esc(String(emp.id))+'" data-m="'+g.key+'" onchange="provExtraSet(this.dataset.e,this.dataset.m,this.value)">':stackCell(extra?'€'+Math.round(extra).toLocaleString('de-DE'):'—',null))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:700;color:var(--teal-dark)"'+provisionTitle+'>'+stackCell(provision,(provisionPct!==null?provisionPct+'%':null))+'</td>'
        +'</tr>';
      if(item.empty)h=h.slice(0,_h0)+h.slice(_h0).replace(/>—</g,'>0<');
    });
    if(allRows.length>=1){
      var n=allRows.filter(function(r){return !r.empty;}).length||1;
      var sumCrOEM=(sumOEM+sumNotSOem)>0?Math.round(sumOEM/(sumOEM+sumNotSOem)*100):0;
      var sumCrTW=(sumRawTw+sumRawYes+sumRawSy+sumRawMy)>0?Math.round(sumRawTw/(sumRawTw+sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumCrSY=(sumRawYes+sumRawSy+sumRawMy)>0?Math.round(sumRawSy/(sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumCrMY=(sumRawYes+sumRawSy+sumRawMy)>0?Math.round(sumRawMy/(sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumCrSyMy=(sumRawYes+sumRawSy+sumRawMy)>0?Math.round((sumRawSy+sumRawMy)/(sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumAnteilOem=sumOptGes>0?Math.round(sumOEM/sumOptGes*100):0;
      var sumAktPerStd=sumTotalHoursAll>0?(sumGesamtAkt/sumTotalHoursAll):0;
      var sumOptPerStd=sumTotalHoursAll>0?(sumOptGes/sumTotalHoursAll):0;
      var sumMargeProOpt=sumOptGes>0?(sumMarge/sumOptGes):0;
      var sumAbzugPct=(sumAbzug+sumProvision)>0?Math.round(sumAbzug/(sumAbzug+sumProvision)*100):0;
      var sumProvisionPct=100-sumAbzugPct;
      h+='<tr class="perf-sum-row" style="background:#1d1c1a;color:#fff">'
        +'<td style="padding:13px 14px;font-weight:700" colspan="2">Σ Summe</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(kalNf(sumAus),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(kalNf(sumUrlaub),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(kalNf(sumKrank),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(kalNf(sumEin),'von '+sumAt)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAktPerStd.toFixed(1),sumGesamtAkt)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?sumOEM:'—'),(sumOptGes>0?Math.round(sumOEM/sumOptGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?sumUps:'—'),(sumOptGes>0?Math.round(sumUps/sumOptGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?sumWka:'—'),(sumOptGes>0?Math.round(sumWka/sumOptGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumOptGes,null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumOptPerStd.toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrOEM+'%',sumOEM)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrTW+'%',sumRawTw)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrSyMy+'%',sumRawSy+sumRawMy)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrMY+'%',sumRawMy)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAnteilOem+'%',sumOEM)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell('€'+Math.round(sumMarge).toLocaleString('de-DE'),(sumOptGes>0?'€'+sumMargeProOpt.toFixed(0)+' Ø/Opt.':null))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:#ffb3b3">'+stackCell('−€'+Math.round(sumAbzug).toLocaleString('de-DE'),sumAbzugPct+'%')+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumExtra?'€'+Math.round(sumExtra).toLocaleString('de-DE'):'—',null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:#F7B39A">'+stackCell('€'+Math.round(sumProvision).toLocaleString('de-DE'),sumProvisionPct+'%')+'</td>'
        +'</tr>';
      h+='<tr class="perf-avg-row" style="background:var(--s-tint-strong)">'
        +'<td style="padding:13px 14px;font-weight:700" colspan="2">Ø Durchschnitt</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumAus/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumUrlaub/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumKrank/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumEin/n).toFixed(1),'von '+(sumAt/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAktPerStd.toFixed(1),Math.round(sumGesamtAkt/n))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((n>0?(sumOEM/n).toFixed(1):'—'),(sumOptGes>0?Math.round(sumOEM/sumOptGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((n>0?(sumUps/n).toFixed(1):'—'),(sumOptGes>0?Math.round(sumUps/sumOptGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((n>0?(sumWka/n).toFixed(1):'—'),(sumOptGes>0?Math.round(sumWka/sumOptGes*100)+'%':'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumOptPerStd.toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrOEM+'%',(sumOEM/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrTW+'%',(sumRawTw/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrSyMy+'%',((sumRawSy+sumRawMy)/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrMY+'%',(sumRawMy/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAnteilOem+'%',(sumOEM/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell('€'+Math.round(sumMarge/n).toLocaleString('de-DE'),(sumOptGes>0?'€'+sumMargeProOpt.toFixed(0)+' Ø/Opt.':null))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:var(--red)">'+stackCell('−€'+Math.round(sumAbzug/n).toLocaleString('de-DE'),sumAbzugPct+'%')+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumExtra?'€'+Math.round(sumExtra/n).toLocaleString('de-DE'):'—',null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:var(--teal-dark)">'+stackCell('€'+Math.round(sumProvision/n).toLocaleString('de-DE'),sumProvisionPct+'%')+'</td>'
        +'</tr>';
    }
    h+='</tbody></table></div>';
  }
  h+='</div>';
  return h;
}
function buildProvisionTable(empId){
  var _e=employees.find(function(e){return String(e.id)===String(empId);});
  if(_e&&!canSeeSalary(_e))return '<div class="card"><div class="kal-note">Provision ist für dich nur bei deinem Team sichtbar.</div></div>';
  if(_e&&!provFlag(_e))return '<div class="card"><div class="kal-note">Diese Person ist nicht provisionsrelevant (Einstellungen › Personen).</div></div>';
  window._provOnly=String(empId);try{return buildProvisionTeamTable();}finally{window._provOnly=null;}
}
function buildProvisionTableAlt(empId){
  if(!canSeeSalary(employees.find(function(e){return String(e.id)===String(empId);})))return '<div class="card"><div class="kal-note">Provision ist für dich nur bei deinem Team sichtbar.</div></div>';
  var emp=employees.find(function(e){return e.id===empId;});
  if(!emp)return '<div class="card">Mitarbeiter nicht gefunden</div>';
  function stackCell(main,sub){
    var hasSubValue=(sub!==null&&sub!==undefined&&sub!=='');
    return '<div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.15">'
      +'<span>'+main+'</span>'
      +'<span style="font-size:11px;color:var(--text3);margin-top:1px;'+(hasSubValue?'':'visibility:hidden;')+'">'+(hasSubValue?sub:'0')+'</span>'
      +'</div>';
  }
  function stackCellLeft(main,sub){
    var hasSubValue=(sub!==null&&sub!==undefined&&sub!=='');
    return '<div style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.15">'
      +'<span>'+main+'</span>'
      +'<span style="font-size:11px;font-weight:400;color:var(--text3);margin-top:1px;'+(hasSubValue?'':'visibility:hidden;')+'">'+(hasSubValue?sub:'0')+'</span>'
      +'</div>';
  }
  function fc(v,t,dir){if(t==null)return '';return(dir==='lte'?v<=t:v>=t)?'color:var(--text)':'color:var(--red);font-weight:700';}
  function urlaubKrankTage(empId,monthKey){
    var rec=(zielStore[monthKey]||{})[empId];
    var urlaub=0,krank=0;
    if(rec&&rec.arbeitstage){
      Object.keys(rec.arbeitstage).forEach(function(ds){
        if(rec.arbeitstage[ds]==='urlaub')urlaub++;
        else if(rec.arbeitstage[ds]==='krank')krank++;
      });
    }
    return {urlaub:urlaub,krank:krank};
  }
  var curMk=today().slice(0,7), yr=(provisionMode==='custom'&&provisionCustomMonth?provisionCustomMonth:curMk).slice(0,4); // C2: gewählter Monat kann im Vorjahr liegen
  var rowsAll=(performance[empId]||[]).filter(function(x){return (x.date||'').slice(0,4)===yr;});
  var grouped=groupPerfRows(rowsAll,'month'); // ein Eintrag je Monat, neueste zuerst
  var rows=provisionMode==='month'?grouped.filter(function(g){return g.key===curMk;}):(provisionMode==='custom'?grouped.filter(function(g){return g.key===provisionCustomMonth;}):grouped);
  var sumKrank=0,sumUrlaub=0,sumOEM=0,sumUps=0,sumWka=0,sumOptGes=0,sumRawTw=0,sumRawYes=0,sumRawSy=0,sumRawMy=0,sumMarge=0,sumAbzug=0,sumProvision=0,sumAktivitaeten=0,sumGesamtAkt=0,sumTotalHoursAll=0,sumNotSOem=0;

  var h='<div class="card">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">';
  h+='<div class="card-title" style="margin:0"><i class="ti ti-cash"></i> Provision</div>';
  h+='<div style="display:flex;align-items:center;gap:8px">';
  h+='<div style="display:flex;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;height:34px">';
  [{k:'month',l:'Aktueller Monat'},{k:'year',l:'Aktuelles Jahr'}].forEach(function(it){
    h+='<button style="padding:0 10px;height:100%;font-size:11.5px;font-weight:500;border:none;cursor:pointer;font-family:inherit;white-space:nowrap;background:'+(provisionMode===it.k?'#F08566':'transparent')+';color:'+(provisionMode===it.k?'#fff':'var(--text2)')+'" onclick="setProvisionMode(\''+it.k+'\')">'+it.l+'</button>';
  });
  h+='</div>';
  h+='<input type="month" value="'+provisionCustomMonth+'" onchange="setProvisionCustomMonth(this.value)" style="height:34px;width:128px;padding:0 8px;border:1px solid '+(provisionMode==='custom'?'#F08566':'var(--border2)')+';border-radius:var(--r-md);font-size:11.5px;font-family:inherit;color:var(--text);background:#fff;cursor:pointer">';
  h+='</div></div>';

  if(!rows.length){
    h+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-file-upload" style="font-size:26px;display:block;margin-bottom:8px"></i>Keine Daten für diesen Zeitraum</div>';
  } else {
    h+='<div style="overflow-x:auto;border-radius:var(--r-md);border:1px solid var(--border2)"><table style="width:100%;border-collapse:collapse;table-layout:fixed"><thead><tr>';
    ['Monat','Krankheitstage','Urlaubstage','Akt./Std.','OEM','Upsells','WKA','Opt. Ges.','Opt./Std.','CR OEM','CR TW','CR SY/MY','CR SY','CR MY','Anteil OEM','Marge Ges.','Abzug','Provision'].forEach(function(lbl,i){
      h+='<th style="background:#EFECE5;padding:9px 14px;text-align:'+(i===0?'left':'right')+';font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border2);white-space:nowrap;width:'+(i===0?'150px':'80px')+'">'+lbl+'</th>';
    });
    h+='</tr></thead><tbody>';
    rows.forEach(function(g,ridx){
      var row=g.row;
      var convOEM=row.convOEM||0, ups=row.ups_yes||0, wka=row.wka_gesamt_yes||0;
      var optGes=row.optGesamt||(convOEM+ups+wka)||0;
      var marge=row.margeGesamt||row.margin||0;
      var rawTw=row.convTW||0, rawYes=row.convYes||0, rawSy=row.convSY||0, rawMy=row.convMY||0;
      var notSOemVal=row.notSuccessful||0;
      var oemDenomVal=convOEM+notSOemVal;
      var crOEM=oemDenomVal>0?Math.round(convOEM/oemDenomVal*100):0;
      var crTW=(rawTw+rawYes+rawSy+rawMy)>0?Math.round(rawTw/(rawTw+rawYes+rawSy+rawMy)*100):0;
      var crSY=(rawYes+rawSy+rawMy)>0?Math.round(rawSy/(rawYes+rawSy+rawMy)*100):0;
      var crMY=(rawYes+rawSy+rawMy)>0?Math.round(rawMy/(rawYes+rawSy+rawMy)*100):0;
      var crSyMy=(rawYes+rawSy+rawMy)>0?Math.round((rawSy+rawMy)/(rawYes+rawSy+rawMy)*100):0;
      var anteilOem=optGes>0?Math.round(convOEM/optGes*100):0;
      var abwTage=urlaubKrankTage(empId,g.key);
      var monthDates=rowsAll.filter(function(x){return (x.date||'').slice(0,7)===g.key;}).map(function(x){return x.date;});
      var rowTotalHours=totalWorkHoursForMonth(emp,g.key,monthDates);
      var gesamtAktivitaeten=row.gesamtAktivitaeten||row.oem_aktivitaeten||0;
      var aktPerHour_num=rowTotalHours>0?gesamtAktivitaeten/rowTotalHours:0;
      var aktProStd=aktPerHour_num.toFixed(1);
      var optPerH_num=rowTotalHours>0?optGes/rowTotalHours:0;
      var optProStd=optPerH_num.toFixed(1);
      var calc=calculateProvision(emp,g.key,row,g.count);
      var rowPv=effectiveProvisionSettings(emp,g.key);
      var rowBm=beschaeftigungsmonat(emp,g.key);
      var rowKpiSet=provisionRowKpiSet(emp,rowPv,rowBm);
      var abzug, provision, provisionTitle='', abzugPct=null, provisionPct=null;
      if(calc.provision===null){
        abzug='—';provision='<span style="font-size:10.5px;color:var(--text3);font-weight:400">Keine Vereinbarung</span>';
      } else {
        abzug='−€'+Math.round(calc.abzug).toLocaleString('de-DE');
        provision='€'+Math.round(calc.provision).toLocaleString('de-DE');
        provisionPct=calc.regulaer>0?Math.round(calc.provision/calc.regulaer*100):100;
        abzugPct=100-provisionPct;
        provisionTitle=calc.vlc?' title="Bonus weWow: '+calc.qualifizierendeOpt+' Opt. × '+calc.bonusProOpt.toFixed(2).replace('.',',')+' € = €'+Math.round(calc.regulaer).toLocaleString('de-DE')
          +' · Opt./Std. '+calc.optPerH.toFixed(2).replace('.',',')+' · Auszahlung '+calc.auszahlungPct+' %'
          +(calc.fehlendeKpis.length?' · Nicht erfüllt: '+calc.fehlendeKpis.join(', '):' · Alle KPIs erfüllt')+' · Extra Pay noch nicht eingerechnet"'
          :' title="Regulär: €'+Math.round(calc.regulaer).toLocaleString('de-DE')
          +' (Basis €'+Math.round(calc.basis).toLocaleString('de-DE')+' + Umsatz €'+Math.round(calc.umsatz).toLocaleString('de-DE')+')'
          +(calc.mindestleistungGreift?' · Mindestleistung unterschritten (§5)':'')
          +(calc.fehlendeKpis.length?' · Nicht erfüllte KPIs: '+calc.fehlendeKpis.join(', '):' · Alle KPIs erfüllt')+'"';
      }
      var margeOEM=row.margeOEM||0;
      sumKrank+=abwTage.krank;sumUrlaub+=abwTage.urlaub;sumOEM+=convOEM;sumUps+=ups;sumWka+=wka;sumOptGes+=optGes;sumNotSOem+=notSOemVal;
      sumRawTw+=rawTw;sumRawYes+=rawYes;sumRawSy+=rawSy;sumRawMy+=rawMy;sumMarge+=marge;
      sumAbzug+=(calc.abzug||0);sumProvision+=(calc.provision||0);sumAktivitaeten+=optPerH_num;
      sumGesamtAkt+=gesamtAktivitaeten;sumTotalHoursAll+=rowTotalHours;
      var rowBg=ridx%2===1?'background:var(--s-tint);':'';
      h+='<tr class="perf-data-row" style="'+rowBg+'">'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);font-weight:600;white-space:nowrap">'+stackCellLeft(g.label,g.count+' Einsatztage')+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right">'+stackCell(abwTage.krank,null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right">'+stackCell(abwTage.urlaub,null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;'+(gesamtAktivitaeten>0?fc(+aktPerHour_num.toFixed(1),rowKpiSet.aktivitaeten,'gte'):'')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Akt./Std. = Aktivitäten / Stunden\',\'Aktivitäten\','+gesamtAktivitaeten+',\'Stunden\','+rowTotalHours.toFixed(1)+',\'Akt./Std.\',\''+aktProStd+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(aktProStd,gesamtAktivitaeten)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'OEM = Opt.OEM / Opt.Ges.\',\'Opt.OEM\','+convOEM+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(convOEM/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(convOEM/optGes*100)+'%':'—'),(optGes>0?convOEM:'—'))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'Upsells = Opt.Upsells / Opt.Ges.\',\'Opt.Upsells\','+ups+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(ups/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(ups/optGes*100)+'%':'—'),(optGes>0?ups:'—'))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--text);cursor:help" onmouseenter="showInfoTooltip(event,\'WKA = Opt.WKA / Opt.Ges.\',\'Opt.WKA\','+wka+',\'Opt.Ges.\','+optGes+',\'Anteil\',\''+(optGes>0?Math.round(wka/optGes*100):0)+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell((optGes>0?Math.round(wka/optGes*100)+'%':'—'),(optGes>0?wka:'—'))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;cursor:help" onmouseenter="showBreakdownTooltip(event,\'Opt. Ges. Aufschlüsselung\','+convOEM+','+ups+','+wka+')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(optGes,null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);border-left:2px solid var(--border2);background:var(--s-tint);text-align:right;'+fc(optPerH_num,rowKpiSet.optH,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Opt./Std. = Opt.Ges. / Stunden\',\'Opt.Ges.\','+optGes+',\'Stunden\','+rowTotalHours.toFixed(1)+',\'Opt./Std.\',\''+optProStd+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(optProStd,null)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;font-weight:600;'+fc(crOEM,rowKpiSet.crOem,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR OEM = Opt.OEM / (Opt.OEM + NERR OEM)\',\'Opt.OEM\','+convOEM+',\'Opt.OEM + NERR OEM\','+oemDenomVal+',\'CR OEM\',\''+crOEM+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crOEM+'%',convOEM)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crTW,rowKpiSet.tw,'lte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR TW = TW / (TW+Yes+SY+MY)\',\'TW\','+rawTw+',\'CR TW\',\''+crTW+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crTW+'%',rawTw)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crSyMy,rowKpiSet.syMy,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR SY/MY = (SY+MY) / (Yes+SY+MY)\',\'SY+MY\','+(rawSy+rawMy)+',\'CR SY/MY\',\''+crSyMy+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crSyMy+'%',rawSy+rawMy)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;cursor:help" onmouseenter="showInfoTooltip(event,\'CR SY = SY / (Yes+SY+MY)\',\'SY\','+rawSy+',\'CR SY\',\''+crSY+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crSY+'%',rawSy)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);background:var(--s-tint);text-align:right;'+fc(crMY,rowKpiSet.my,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'CR MY = MY / (Yes+SY+MY)\',\'MY\','+rawMy+',\'CR MY\',\''+crMY+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(crMY+'%',rawMy)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);border-right:2px solid var(--border2);background:var(--s-tint);text-align:right;'+fc(anteilOem,rowKpiSet.oemAnteil,'gte')+';cursor:help" onmouseenter="showInfoTooltip(event,\'Anteil OEM = Opt.OEM / Opt.Ges.\',\'Opt.OEM\','+convOEM+',\'Opt.Ges.\','+optGes+',\'Anteil OEM\',\''+anteilOem+'%\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell(anteilOem+'%',convOEM)+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;color:var(--text);cursor:help" onmouseenter="showBreakdownTooltip(event,\'Marge Ges. Aufschlüsselung\',\'€'+Math.round(row.margeOEM||0).toLocaleString('de-DE')+'\',\'€'+Math.round(row.margeUpsell||0).toLocaleString('de-DE')+'\',\'€'+Math.round(row.margeWKA||0).toLocaleString('de-DE')+'\')" onmousemove="positionCrTooltip(event)" onmouseleave="hideCrTooltip()">'+stackCell('€'+Math.round(marge).toLocaleString('de-DE'),(optGes>0?'€'+(marge/optGes).toFixed(0)+' Ø/Opt.':null))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;color:var(--red)"'+provisionTitle+'>'+stackCell(abzug,(abzugPct!==null?abzugPct+'%':null))+'</td>'
        +'<td style="padding:13px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:700;color:var(--teal-dark)"'+provisionTitle+'>'+stackCell(provision,(provisionPct!==null?provisionPct+'%':null))+'</td>'
        +'</tr>';
    });
    if(rows.length>1){
      var n=rows.length;
      var sumCrOEM=(sumOEM+sumNotSOem)>0?Math.round(sumOEM/(sumOEM+sumNotSOem)*100):0;
      var sumCrTW=(sumRawTw+sumRawYes+sumRawSy+sumRawMy)>0?Math.round(sumRawTw/(sumRawTw+sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumCrSY=(sumRawYes+sumRawSy+sumRawMy)>0?Math.round(sumRawSy/(sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumCrMY=(sumRawYes+sumRawSy+sumRawMy)>0?Math.round(sumRawMy/(sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumCrSyMy=(sumRawYes+sumRawSy+sumRawMy)>0?Math.round((sumRawSy+sumRawMy)/(sumRawYes+sumRawSy+sumRawMy)*100):0;
      var sumAnteilOem=sumOptGes>0?Math.round(sumOEM/sumOptGes*100):0;
      var sumAktPerStd=sumTotalHoursAll>0?(sumGesamtAkt/sumTotalHoursAll):0;
      var sumOptPerStd=sumTotalHoursAll>0?(sumOptGes/sumTotalHoursAll):0;
      var sumMargeProOpt=sumOptGes>0?(sumMarge/sumOptGes):0;
      var sumAbzugPct=(sumAbzug+sumProvision)>0?Math.round(sumAbzug/(sumAbzug+sumProvision)*100):0;
      var sumProvisionPct=100-sumAbzugPct;
      h+='<tr class="perf-sum-row" style="background:#1d1c1a;color:#fff">'
        +'<td style="padding:13px 14px;font-weight:700" colspan="1">Σ Summe</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumKrank,null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumUrlaub,null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAktPerStd.toFixed(1),sumGesamtAkt)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?Math.round(sumOEM/sumOptGes*100)+'%':'—'),(sumOptGes>0?sumOEM:'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?Math.round(sumUps/sumOptGes*100)+'%':'—'),(sumOptGes>0?sumUps:'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?Math.round(sumWka/sumOptGes*100)+'%':'—'),(sumOptGes>0?sumWka:'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumOptGes,null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumOptPerStd.toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrOEM+'%',sumOEM)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrTW+'%',sumRawTw)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrSyMy+'%',sumRawSy+sumRawMy)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrSY+'%',sumRawSy)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrMY+'%',sumRawMy)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAnteilOem+'%',sumOEM)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell('€'+Math.round(sumMarge).toLocaleString('de-DE'),(sumOptGes>0?'€'+sumMargeProOpt.toFixed(0)+' Ø/Opt.':null))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:#ffb3b3">'+stackCell('−€'+Math.round(sumAbzug).toLocaleString('de-DE'),sumAbzugPct+'%')+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:#F7B39A">'+stackCell('€'+Math.round(sumProvision).toLocaleString('de-DE'),sumProvisionPct+'%')+'</td>'
        +'</tr>';
      h+='<tr class="perf-avg-row" style="background:var(--s-tint-strong)">'
        +'<td style="padding:13px 14px;font-weight:700">Ø Durchschnitt</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumKrank/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumUrlaub/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAktPerStd.toFixed(1),Math.round(sumGesamtAkt/n))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?Math.round(sumOEM/sumOptGes*100)+'%':'—'),(n>0?(sumOEM/n).toFixed(1):'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?Math.round(sumUps/sumOptGes*100)+'%':'—'),(n>0?(sumUps/n).toFixed(1):'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes>0?Math.round(sumWka/sumOptGes*100)+'%':'—'),(n>0?(sumWka/n).toFixed(1):'—'))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell((sumOptGes/n).toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumOptPerStd.toFixed(1),null)+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrOEM+'%',(sumOEM/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrTW+'%',(sumRawTw/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrSyMy+'%',((sumRawSy+sumRawMy)/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrSY+'%',(sumRawSy/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumCrMY+'%',(sumRawMy/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell(sumAnteilOem+'%',(sumOEM/n).toFixed(1))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700">'+stackCell('€'+Math.round(sumMarge/n).toLocaleString('de-DE'),(sumOptGes>0?'€'+sumMargeProOpt.toFixed(0)+' Ø/Opt.':null))+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:var(--red)">'+stackCell('−€'+Math.round(sumAbzug/n).toLocaleString('de-DE'),sumAbzugPct+'%')+'</td>'
        +'<td style="padding:13px 14px;text-align:right;font-weight:700;color:var(--teal-dark)">'+stackCell('€'+Math.round(sumProvision/n).toLocaleString('de-DE'),sumProvisionPct+'%')+'</td>'
        +'</tr>';
    }
    h+='</tbody></table></div>';
  }
  h+='</div>';
  return h;
}
// Verlauf der Provisions-Einstellungen eines Mitarbeiters
function provVersionDiff(a,b){a=effectiveProvisionSettings({provisionSettings:a||{}});b=effectiveProvisionSettings({provisionSettings:b||{}});var out=[],ka=(a.kpis&&a.kpis.length?a.kpis:PROV_KPI_DEFAULT),kb=(b.kpis&&b.kpis.length?b.kpis:PROV_KPI_DEFAULT),lab=function(k){var c=provKpiCat(k);return c?c.lbl:k;};
  var add=kb.filter(function(k){return ka.indexOf(k)<0;}),rem=ka.filter(function(k){return kb.indexOf(k)<0;});
  if(add.length||rem.length)out.push('KPIs: '+(add.length?'+'+add.map(lab).join(', +'):'')+(add.length&&rem.length?' · ':'')+(rem.length?'−'+rem.map(lab).join(', −'):''));
  var n=0;['monat1','monat2','monat3plus'].forEach(function(m){var x=a[m]||{},y=b[m]||{};Object.keys(Object.assign({},x,y)).forEach(function(k){if(String(x[k]==null?'':x[k])!==String(y[k]==null?'':y[k]))n++;});});
  if(n)out.push(n+' Zielwert'+(n===1?'':'e')+' geändert');
  ['basisProOpt','divOEM','divUpsell','divWka','reduktionProKpi','mindestprovision','mindestleistungOptH'].forEach(function(k){if(String(a[k]==null?'':a[k])!==String(b[k]==null?'':b[k]))out.push(k.replace('div','Teiler ').replace('basisProOpt','Basis/Opt.').replace('reduktionProKpi','Abzug je KPI').replace('mindestprovision','Mindestprovision').replace('mindestleistungOptH','Mindestleistung'));});
  return out.join(' · ')||'unverändert';}
function provVersionListHtml(emp){var ps=emp&&emp.provisionSettings,V=(ps&&Array.isArray(ps.versionen))?ps.versionen.slice().sort(function(a,b){return b.ab.localeCompare(a.ab);}):[];if(!V.length)return '';
  var cur=today().slice(0,7),f=function(m){return m==='2000-01'?'Beginn':m.slice(5,7)+'/'+m.slice(0,4);};
  return '<div class="pv-vers"><div class="pv-vers-h">Versionen der Provisions-Einstellungen</div>'+V.map(function(v,i){var bis=i>0?V[i-1].ab:null,akt=v.ab<=cur&&(!bis||bis>cur),fut=v.ab>cur;
    var dl=i<V.length-1?provVersionDiff(V[i+1].s,v.s):'Ausgangsstand';
    return '<div class="pv-vers-r'+(akt?' cur':'')+'"><span class="p">'+(v.ab==='2000-01'?'bis '+(bis?f(kalAdd(bis+'-01',-1).slice(0,7)):'heute'):'ab '+f(v.ab))+(bis&&v.ab!=='2000-01'?' – '+f(kalAdd(bis+'-01',-1).slice(0,7)):'')+'</span><span>'+esc(dl)+'</span><span class="m">'+(akt?'<b>aktuell</b>':fut?'geplant':'')+(v.von?' · '+esc(v.von):'')+(v.am?' · '+esc(v.am.slice(8,10)+'.'+v.am.slice(5,7)+'.'):'')+'</span></div>';}).join('')+'</div>';}
function toggleProvisionModel(role){
  var vlc=(role==='VLC');
  document.querySelectorAll('.pv-de-block').forEach(function(el){el.style.display=vlc?'none':'';});
  document.querySelectorAll('.pv-vlc-block').forEach(function(el){el.style.display=vlc?'':'none';});
}
function provCanEdit(){return currentUserRole==='admin'||permFor('provEdit')==='E';}
// Formular: ohne Recht „Provisionsvereinbarung ändern“ nur ansehen
function provLockForm(root){if(provCanEdit()||!root)return;root.querySelectorAll('[id^="pv-"]').forEach(function(el){if('disabled' in el)el.disabled=true;});root.querySelectorAll('tr[data-kpi]').forEach(function(tr){tr.removeAttribute('draggable');});var b=root.querySelector('.pv-ab-box');if(b)b.outerHTML='<div class="pv-ab-box"><div><b>Nur ansehen</b><span class="pv-ab-hint">Provisionsvereinbarungen ändern dürfen Admins und Personen, denen das Recht gegeben wurde (Rollen &amp; Rechte).</span></div></div>';}
function saveProvisionSettings(empId){
  if(_savingProvisionSettings)return;
  if(!provCanEdit())return;
  var emp=employees.find(function(e){return e.id===empId;});
  if(!emp)return;
  var oldSettings=JSON.parse(JSON.stringify(emp.provisionSettings||{}));
  function val(id){var el=document.getElementById(id);return el?parseFloat(el.value)||0:0;}
  function dateVal(id){var el=document.getElementById(id);return el?el.value:null;}
  function provKpiCollect(mk){var o={};PROV_KPI_CAT.forEach(function(c){o[c.k]=nval('pv-'+mk+'-'+c.k);});return o;}
  var settings={
    gueltigAb:dateVal('pv-gueltigAb'),
    grundgehalt:val('pv-grundgehalt'),
    agSozialabgaben:val('pv-agSozialabgaben'),
    basisProOpt:val('pv-basisProOpt'),
    divOEM:val('pv-divOEM'),
    divUpsell:val('pv-divUpsell'),
    divWka:val('pv-divWka'),
    reduktionProKpi:val('pv-reduktionProKpi'),
    mindestprovision:val('pv-mindestprovision'),
    mindestleistungOptH:val('pv-mindestleistungOptH'),
    monat1:provKpiCollect('monat1'),
    monat2:provKpiCollect('monat2'),
    monat3plus:provKpiCollect('monat3plus')
  };
  // Bonusvereinbarung weWow (VLC) – leere Felder bleiben null (= keine Pruefung)
  function nval(id){var el=document.getElementById(id);if(!el||el.value==='')return null;var n=parseFloat(el.value);return isNaN(n)?null:n;}
  if(document.getElementById('pv-vlc-bonusProOpt')){
    var vlcS={serviceRate:nval('pv-vlc-serviceRate'),bonusProOpt:nval('pv-vlc-bonusProOpt'),extraPayPct:nval('pv-vlc-extraPayPct'),extraPayAbH:nval('pv-vlc-extraPayAbH'),stufen:{}};
    ['monat1','monat2','monat3plus'].forEach(function(mk){vlcS[mk]={optH:nval('pv-vlc-'+mk+'-optH'),syMy:nval('pv-vlc-'+mk+'-syMy'),crOem:nval('pv-vlc-'+mk+'-crOem'),tw:nval('pv-vlc-'+mk+'-tw'),my:nval('pv-vlc-'+mk+'-my'),oemAnteil:nval('pv-vlc-'+mk+'-oemAnteil')};});
    ['optH','syMy','crOem'].forEach(function(k){vlcS.stufen[k]={aus1:nval('pv-vlc-st-'+k+'-aus1'),grenze:nval('pv-vlc-st-'+k+'-grenze'),aus2:nval('pv-vlc-st-'+k+'-aus2')};});
    settings.vlc=vlcS;
  } else if(oldSettings.vlc){settings.vlc=oldSettings.vlc;}
  (function(){var h=document.getElementById('pv-kpis');var L=null;try{L=h?JSON.parse(h.value):null;}catch(e){}if(L&&L.length&&JSON.stringify(L)!==JSON.stringify(PROV_KPI_DEFAULT))settings.kpis=L;else if(!h&&oldSettings.kpis)settings.kpis=oldSettings.kpis;})();
  var salaryVisible=canSeeSalary(emp);
  if(!salaryVisible){settings.grundgehalt=oldSettings.grundgehalt;settings.agSozialabgaben=oldSettings.agSozialabgaben;if(settings.grundgehalt==null)delete settings.grundgehalt;if(settings.agSozialabgaben==null)delete settings.agSozialabgaben;}
  (function(){var ab=document.getElementById('pv-ab');ab=ab?ab.value:null;var core=function(o){var c=JSON.parse(JSON.stringify(o||{}));delete c.versionen;delete c.grundgehalt;delete c.agSozialabgaben;return c;};
    var oc=core(oldSettings),nc=core(settings),norm=function(o){return JSON.stringify(o,Object.keys(o).sort());},vers=(oldSettings.versionen||[]).slice();
    var same=JSON.stringify(effectiveProvisionSettings({provisionSettings:oc}))===JSON.stringify(effectiveProvisionSettings({provisionSettings:nc}));
    if(!same&&ab){var who=(typeof qaCurrentName==='function'&&qaCurrentName())||'';if(!vers.length)vers.push({ab:'2000-01',s:oc,am:today(),von:''});vers=vers.filter(function(v){return v.ab<ab;});vers.push({ab:ab,s:nc,am:today(),von:who});}
    if(vers.length)settings.versionen=vers;})();
  emp.provisionSettings=settings;
  // Aenderungshistorie fuer Provisionseinstellungen
  var actorNamePv=null;
  if(typeof currentCoach!=='undefined'&&currentCoach)actorNamePv=currentCoach.name;
  else if(typeof currentAuthUser!=='undefined'&&currentAuthUser&&typeof appUsers!=='undefined'){
    var _mu2=appUserByEmail(currentAuthUser.email);
    if(_mu2)actorNamePv=_mu2.name;
  }
  var pvHistRows=[];
  var TOPFIELD_LABELS={gueltigAb:'Gültig ab',grundgehalt:'Grundgehalt',agSozialabgaben:'AG-Sozialabgaben',basisProOpt:'Basisprovision/Opt.',divOEM:'Divisor OEM',divUpsell:'Divisor Upsells',divWka:'Divisor WKA',reduktionProKpi:'Reduzierung je KPI',mindestprovision:'Mindestprovision',mindestleistungOptH:'Mindestleistung Opt/Std'};
  Object.keys(TOPFIELD_LABELS).forEach(function(k){
    var ov=oldSettings[k], nv=settings[k];
    var ovNorm=(ov==null||ov==='')?null:ov, nvNorm=(nv==null||nv==='')?null:nv;
    if(!salaryVisible&&(k==='grundgehalt'||k==='agSozialabgaben'))return;
    if(String(ovNorm)!==String(nvNorm))pvHistRows.push({employee_id:empId,field:'provision_'+k,old_value:ovNorm!=null?String(ovNorm):null,new_value:nvNorm!=null?String(nvNorm):null,changed_by:currentCoach?currentCoach.id:null,changed_by_name:actorNamePv});
  });
  var MONAT_SUBFIELD_LABELS={optH:'Opt. Gesamt / Std.',crOem:'CR OEM',tw:'CR TW',sy:'CR SY',my:'CR MY',syMy:'CR SY/MY',oemAnteil:'Anteil OEM',crYes:'CR YES',notReached:'NE - Nicht Erreicht',notPossible:'NM - Nicht Möglich',notSuccessful:'NEF - Nicht Erfolgreich',aktivitaeten:'Aktivitäten / Std.',convOEM:'Conv. OEM / Tag',optGesamt:'Opt. Gesamt / Tag',margeZiel:'Marge Ziel'};
  var MONAT_LABELS={monat1:'Monat 1',monat2:'Monat 2',monat3plus:'Ab Monat 3'};
  ['monat1','monat2','monat3plus'].forEach(function(mk){
    var oldM=oldSettings[mk]||{}, newM=settings[mk]||{};
    Object.keys(MONAT_SUBFIELD_LABELS).forEach(function(sk){
      var ov=oldM[sk], nv=newM[sk];
      var ovNorm=(ov==null||ov==='')?null:ov, nvNorm=(nv==null||nv==='')?null:nv;
      if(String(ovNorm)!==String(nvNorm)){
        pvHistRows.push({employee_id:empId,field:'provision_kpi_'+mk+'_'+sk,old_value:ovNorm!=null?String(ovNorm):null,new_value:nvNorm!=null?String(nvNorm):null,changed_by:currentCoach?currentCoach.id:null,changed_by_name:actorNamePv});
      }
    });
  });
  (function(){
    var ov=oldSettings.vlc||{}, nv=settings.vlc||{};
    if(!settings.vlc)return;
    var flat=[['serviceRate','VLC Service Rate'],['bonusProOpt','VLC Bonus/Opt.'],['extraPayPct','VLC Extra Pay %'],['extraPayAbH','VLC Extra Pay ab/Std.']];
    function push(field,o,n){var on=(o==null||o==='')?null:o, nn=(n==null||n==='')?null:n;if(String(on)!==String(nn))pvHistRows.push({employee_id:empId,field:field,old_value:on!=null?String(on):null,new_value:nn!=null?String(nn):null,changed_by:currentCoach?currentCoach.id:null,changed_by_name:actorNamePv});}
    flat.forEach(function(f){push('provision_vlc_'+f[0],ov[f[0]],nv[f[0]]);});
    ['monat1','monat2','monat3plus'].forEach(function(mk){['optH','syMy','crOem','tw','my','oemAnteil'].forEach(function(k){push('provision_vlc_'+mk+'_'+k,(ov[mk]||{})[k],(nv[mk]||{})[k]);});});
    ['optH','syMy','crOem'].forEach(function(k){['aus1','grenze','aus2'].forEach(function(x){push('provision_vlc_stufe_'+k+'_'+x,((ov.stufen||{})[k]||{})[x],((nv.stufen||{})[k]||{})[x]);});});
  })();
  if(pvHistRows.length&&!window._aeCreating){
    sb.from('employee_history').insert(pvHistRows).then(function(res){
      if(res.error)console.warn('Provisions-Historie konnte nicht gespeichert werden:',res.error);
      else renderEmpDetail();
    });
  }
  _savingProvisionSettings=true;
  var statusEl=document.getElementById('pv-save-status');
  if(statusEl)statusEl.textContent='Speichere...';
  var dbSettings=settings;
  if(SALARY_TABLE){
    dbSettings=JSON.parse(JSON.stringify(settings));delete dbSettings.grundgehalt;delete dbSettings.agSozialabgaben;
    if(salaryVisible)sb.from('employee_salary').upsert({employee_id:empId,grundgehalt:settings.grundgehalt!=null?settings.grundgehalt:null,ag_sozialabgaben:settings.agSozialabgaben!=null?settings.agSozialabgaben:null,updated_at:new Date().toISOString()},{onConflict:'employee_id'}).then(function(r){if(r.error){console.error('employee_salary',r.error);alert('Gehalt konnte nicht gespeichert werden: '+r.error.message);}});
  }
  sb.from('employees').update({provision_settings:dbSettings}).eq('id',empId).then(function(res){
    _savingProvisionSettings=false;
    if(res.error){
      if(statusEl)statusEl.textContent='Fehler: Spalte "provision_settings" fehlt evtl. in der employees-Tabelle (siehe Konsole)';
      console.error('saveProvisionSettings error:',res.error);
    } else {
      if(statusEl){statusEl.textContent='Gespeichert ✓';setTimeout(function(){statusEl.textContent='';},2500);}
      logAdminAction&&logAdminAction('provision_settings','Provisionsvereinbarung geändert: '+emp.name);
    }
  }).catch(function(err){
    _savingProvisionSettings=false;
    if(statusEl)statusEl.textContent='Fehler beim Speichern';
    console.error('saveProvisionSettings exception:',err);
  });
}
function pvpMonth(emp,mk){var cl=PROV_CLOSED[mk],fz=cl&&cl.rows[String(emp.id)];if(fz)return {mk:mk,calc:fz.calc,extra:+fz.extra||0,pt:fz.pt,closed:true,data:true};
  var rows=(performance[emp.id]||[]).filter(function(x){return (x.date||'').slice(0,7)===mk;});var g=rows.length?groupPerfRows(rows,'month')[0]:{row:{},count:0};
  var calc=calculateProvision(emp,mk,g.row,g.count);return {mk:mk,calc:calc,extra:provExtraGet(emp.id,mk),pt:null,closed:false,data:rows.length>0};}
function pvpEur(v){return '€'+Math.round(v||0).toLocaleString('de-DE');}
function pvpVal(c,v){if(v==null)return '–';return c.k==='optH'||c.unit===''?(Math.round(v*100)/100).toLocaleString('de-DE'):Math.round(v)+' %';}
function openProvPopup(empId){var emp=employees.find(function(e){return String(e.id)===String(empId);});if(!emp)return;_pvpEmp=emp.id;
  var m=document.getElementById('provPopModal');
  if(!m){m=document.createElement('div');m.className='modal-ov hidden';m.id='provPopModal';
    m.innerHTML='<div class="modal" style="padding:0;display:flex;flex-direction:column;background:#EEEDE9;overflow:hidden">'
      +'<div style="display:flex;align-items:center;padding:14px 16px 6px"><div style="min-width:0"><div style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">Provision</div><div id="pvpHdSub" style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div></div><button class="btn" type="button" style="margin-left:auto;width:34px;height:34px;padding:0;justify-content:center" onclick="closeModal(\'provPopModal\')" aria-label="Schließen"><i class="ti ti-x"></i></button></div>'
      +'<div style="display:flex;min-height:0;flex:1"><div style="width:56px;flex-shrink:0;align-self:stretch;margin:6px 0 14px 14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;box-shadow:0 10px 24px rgba(40,32,15,.10);position:relative;z-index:3">'
      +'<button class="rl-btn on" type="button" aria-label="Provision und Verlauf" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'pvpSec1\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-chart-line"></i><span class="rl-tip" style="left:48px">Provision und Verlauf</span></button>'
      +'<button class="rl-btn" type="button" aria-label="KPIs und Abzug" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'pvpSec2\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-target"></i><span class="rl-tip" style="left:48px">KPIs und Abzug</span></button></div>'
      +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0"><div id="pvpBody" style="flex:1;overflow-y:auto;padding:6px 18px 12px 14px"></div>'
      +'<div style="display:flex;justify-content:flex-end;gap:8px;padding:4px 18px 14px"><button class="btn" type="button" style="height:36px;width:auto" onclick="var e=_pvpEmp;closeModal(\'provPopModal\');provisionTeamSelectedIds=[e];provisionMode=\'year\';selectProvisionTeam();"><i class="ti ti-arrow-right"></i> Zur Provisionsübersicht</button><button class="btn" type="button" style="height:36px;width:auto" onclick="closeModal(\'provPopModal\')">Schließen</button></div></div></div></div>';
    document.body.appendChild(m);}
  var sub=document.getElementById('pvpHdSub');if(sub)sub.textContent=emp.name+(emp.role?' · '+emp.role:'');
  pvpRender();openModal('provPopModal');}
function pvpRender(){var emp=kalEmp(_pvpEmp),body=document.getElementById('pvpBody');if(!emp||!body)return;
  var y=today().slice(0,4),cm=today().slice(0,7),M=[];for(var i=1;i<=12;i++){var mk=y+'-'+('0'+i).slice(-2);if(mk>cm)break;if(emp.startDate&&mk<emp.startDate.slice(0,7))continue;if(emp.endDate&&mk>emp.endDate.slice(0,7))continue;M.push(pvpMonth(emp,mk));}
  var cur=M.filter(function(x){return x.mk===cm;})[0]||pvpMonth(emp,cm),c=cur.calc||{},ad=currentUserRole==='admin',ML=KAL_MON,mn=ML[+cm.slice(5,7)-1];
  var pv=function(x){return (x.calc&&x.calc.provision||0)+(x.extra||0);},rg=function(x){return (x.calc&&x.calc.regulaer||0)+(x.extra||0);};
  var pt=cur.pt||provTageFor(emp,cm),fail=(c.fehlendeKpis||[]),abzP=rg(cur)>0?Math.round((c.abzug||0)/rg(cur)*100):0;
  var CARD='background:#F7F5F0;border:1px solid #E4E0D6;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)',PAN='background:#EFECE5;border-radius:12px;padding:10px 14px 8px';
  var H=function(t,r){return '<div style="display:flex;align-items:baseline;margin-bottom:12px"><b style="font-size:15px">'+t+'</b><span style="margin-left:auto;font-size:12px;color:var(--text3)">'+r+'</span></div>';};
  // 1) Banner wie in der Übersicht
  var tile=function(lbl,val,sub,first){return '<div style="padding:0 14px;min-width:0;'+(first?'padding-left:0;':'border-left:1px solid rgba(255,255,255,.25);')+'"><div style="font-size:11px;font-weight:700;letter-spacing:.08em">'+lbl+'</div><div style="font-size:30px;font-weight:300;line-height:1.15;white-space:nowrap">'+val+'</div><div style="font-size:12px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+sub+'</div></div>';};
  var h='<div style="border-radius:14px;padding:14px 18px;margin-bottom:14px;color:#fff;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%)"><div style="font-size:11px;font-weight:700;letter-spacing:.09em;margin-bottom:10px">'+esc(emp.name.toUpperCase())+' · '+esc((emp.role||'').toUpperCase())+' · '+mn.toUpperCase()+(cur.closed?' · ABGESCHLOSSEN':'')+'</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr))">'
    +tile('PROVISION',pvpEur(pv(cur)),'nach Abzug',true)+tile('REGULÄR',pvpEur(rg(cur)),'Basis '+pvpEur(c.basis)+' + Umsatz '+pvpEur(c.umsatz))+tile('ABZUG','−'+abzP+' %',fail.length?fail.length+' KPI'+(fail.length>1?'s':'')+' verfehlt':'alle KPIs erfüllt')+tile('OPTIONAL',pvpEur(cur.extra),'ohne Abzug')+tile('TAGE',kalNf(pt.sum)+'/'+pt.at,pt.sum===pt.at?'alle belegt':'⚠ prüfen')+'</div></div>';
  // 2) Verlauf, kompakt
  var W=640,Hh=150,L=40,B=20,cw=(W-L-6)/12,vals=M.map(rg).concat(M.map(pv)),mx=Math.max.apply(null,vals.concat([100]));
  var st=[100,250,500,1000,2500,5000].filter(function(s){return mx/s<=4;})[0]||5000;mx=Math.ceil(mx/st)*st;
  var yy=function(v){return Hh-B-(v/mx)*(Hh-B-8);},xx=function(mk){return L+cw*(+mk.slice(5,7)-1)+cw/2;},svg='';
  for(var v=0;v<=mx+1;v+=st){svg+='<line x1="'+L+'" x2="'+(W-4)+'" y1="'+yy(v).toFixed(1)+'" y2="'+yy(v).toFixed(1)+'" stroke="#E4E0D6"/><text x="'+(L-6)+'" y="'+(yy(v)+3).toFixed(1)+'" font-size="10" fill="#8a8478" text-anchor="end">€'+v.toLocaleString('de-DE')+'</text>';}
  ML.forEach(function(n,i){var c_=(y+'-'+('0'+(i+1)).slice(-2))===cm;svg+='<text x="'+(L+cw*i+cw/2).toFixed(1)+'" y="'+(Hh-5)+'" font-size="10" text-anchor="middle" fill="'+(c_?'#1d1c1a':'#8a8478')+'" font-weight="'+(c_?700:500)+'">'+n.slice(0,3)+'</text>';});
  var D=M.filter(function(x){return x.data||x.closed;});
  if(D.length){svg+='<polygon points="'+D.map(function(x){return xx(x.mk).toFixed(1)+','+yy(rg(x)).toFixed(1);}).join(' ')+' '+D.slice().reverse().map(function(x){return xx(x.mk).toFixed(1)+','+yy(pv(x)).toFixed(1);}).join(' ')+'" fill="#FBE3DA" opacity=".85"/>';
    var path=function(f,col,dash){var s2='<path d="M'+D.map(function(x){return xx(x.mk).toFixed(1)+','+yy(f(x)).toFixed(1);}).join(' L')+'" fill="none" stroke="'+col+'" stroke-width="2.2"'+(dash?' stroke-dasharray="5 4"':'')+'/>';D.forEach(function(x){s2+='<circle cx="'+xx(x.mk).toFixed(1)+'" cy="'+yy(f(x)).toFixed(1)+'" r="3.2" fill="#fff" stroke="'+col+'" stroke-width="2"><title>'+ML[+x.mk.slice(5,7)-1]+': '+pvpEur(f(x))+'</title></circle>';});return s2;};
    svg+=path(rg,'#C9B9A3',true)+path(pv,'#3a3833',false);
    if(cur.data||cur.closed)svg+='<circle cx="'+xx(cm).toFixed(1)+'" cy="'+yy(pv(cur)).toFixed(1)+'" r="4.5" fill="#F08566"/>';}
  var leg='<div style="display:flex;gap:12px;justify-content:flex-end;font-size:11.5px;color:var(--text2);margin-bottom:2px">'+[['#3a3833','Provision'],['#C9B9A3','Regulär'],['#FBE3DA','Abzug']].map(function(l){return '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+l[0]+';margin-right:5px;vertical-align:-1px"></i>'+l[1]+'</span>';}).join('')+'</div>';
  var prev=M.filter(function(x){return x.mk<cm;}).slice(-4);
  var mBox=function(x,i){var r=rg(x),ap=r>0?Math.round((x.calc&&x.calc.abzug||0)/r*100):0,hot=i===prev.length-1;return '<div style="'+(hot?'background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);color:#fff;':'background:#EFECE5;')+'border-radius:12px;padding:9px 12px;min-width:0"><div style="display:flex;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase"><span>'+ML[+x.mk.slice(5,7)-1]+'</span><span style="margin-left:auto">'+(x.closed?'🔒':'')+'</span></div><div style="font-size:22px;font-weight:300;line-height:1.2;margin-top:2px">'+pvpEur(pv(x))+'</div><div style="font-size:11.5px;color:'+(hot?'rgba(255,255,255,.9)':'var(--text3)')+'">'+(x.data||x.closed?'Abzug −'+ap+' %':'keine Daten')+(x.extra?' · Opt. '+pvpEur(x.extra):'')+'</div></div>';};
  var sumP=M.reduce(function(a,x){return a+pv(x);},0),sumR=M.reduce(function(a,x){return a+rg(x);},0);
  h+='<div id="pvpSec1" style="'+CARD+'">'+H('Verlauf',y)+'<div style="'+PAN+'">'+leg+'<svg viewBox="0 0 '+W+' '+Hh+'" width="100%" style="display:block;max-height:170px">'+svg+'</svg></div>'
    +(prev.length?'<div style="display:grid;grid-template-columns:repeat('+prev.length+',minmax(0,1fr));gap:10px;margin-top:12px">'+prev.map(mBox).join('')+'</div>':'')
    +'<div style="border-top:1px solid #E4E0D6;margin-top:12px;padding-top:10px;font-size:12.5px;color:var(--text2)"><b>Summe '+y+':</b> '+pvpEur(sumP)+' Provision · '+pvpEur(sumR-sumP)+' durch Abzug verloren'+(sumR>0?' · Ø Abzug '+Math.round((sumR-sumP)/sumR*100)+' %':'')+'.</div></div>';
  // 3) KPIs und Abzug als Tabelle
  var CH=(c.checks||[]).filter(function(x){return x.ziel!=null;}),red=Math.round((c.reduktionProKpi||0.2)*100);
  var fmt=function(x,v){return /Std/.test(x.label)?(Math.round(v*100)/100).toLocaleString('de-DE'):(Math.round(v*10)/10).toLocaleString('de-DE')+' %';};
  var TH='padding:8px 10px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text3);border-bottom:1px solid #E4E0D6',TD='padding:9px 10px;border-bottom:1px solid #EFECE5;font-size:13px';
  var rows=CH.map(function(x){var good=x.dir==='gte'?x.ist>=x.ziel:x.ist<=x.ziel,d=x.dir==='gte'?x.ist-x.ziel:x.ziel-x.ist;
    return '<tr><td style="'+TD+';font-weight:600">'+esc(x.label)+'</td><td style="'+TD+';text-align:right;font-weight:700;color:'+(good?'var(--text)':'#C9502F')+'">'+fmt(x,x.ist)+'</td><td style="'+TD+';text-align:right;color:var(--text3)">'+(x.dir==='lte'?'≤ ':'≥ ')+fmt(x,x.ziel)+'</td><td style="'+TD+';text-align:right;color:'+(good?'var(--text3)':'#C9502F')+'">'+(d>=0?'+':'−')+fmt(x,Math.abs(d)).replace(' %',' Pkt.')+'</td><td style="'+TD+';text-align:right;font-weight:700;color:'+(good?'var(--text3)':'#C9502F')+'">'+(good?'✓':'−'+red+' %')+'</td></tr>';}).join('');
  var lever=CH.filter(function(x){return x.dir==='gte'?x.ist<x.ziel:x.ist>x.ziel;}).map(function(x){return {x:x,rel:x.dir==='gte'?(x.ziel-x.ist)/(x.ziel||1):(x.ist-x.ziel)/(x.ziel||1)};}).sort(function(a,b){return a.rel-b.rel;})[0];
  var gain=lever?(c.regulaer||0)*(c.reduktionProKpi||0.2):0;
  var ml=c.mindestleistung!=null?c.mindestleistung:2.5,bm=c.beschaeftigungsmonat||0;
  var lastClosed=Object.keys(PROV_CLOSED).filter(function(k){return k<=cm&&PROV_CLOSED[k].rows[String(emp.id)];}).sort().pop(),lc=lastClosed?PROV_CLOSED[lastClosed]:null;
  h+='<div id="pvpSec2" style="'+CARD+'">'+H('KPIs und Abzug',mn+' · '+(bm>=3?'ab Monat 3':'Monat '+bm)+' · je verfehlter KPI −'+red+' %')
    +(CH.length?'<table style="width:100%;border-collapse:collapse"><thead><tr><th style="'+TH+';text-align:left">Kennzahl</th><th style="'+TH+';text-align:right">Ist</th><th style="'+TH+';text-align:right">Ziel</th><th style="'+TH+';text-align:right">Abstand</th><th style="'+TH+';text-align:right">Abzug</th></tr></thead><tbody>'+rows
      +'<tr><td style="'+TD+';font-weight:700;border-bottom:0">Gesamt</td><td colspan="3" style="'+TD+';border-bottom:0;color:var(--text3)">'+(c.mindestleistungGreift?'Mindestleistung verfehlt – nur Mindestprovision':fail.length+' von '+CH.length+' verfehlt')+'</td><td style="'+TD+';text-align:right;font-weight:700;border-bottom:0;color:'+(abzP?'#C9502F':'var(--text)')+'">−'+abzP+' %</td></tr></tbody></table>':'<div class="kal-note">Keine Ziele hinterlegt.</div>')
    +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px">'
    +'<div style="background:#EFECE5;border-radius:12px;padding:10px 12px"><div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Optional · '+mn+'</div><div style="font-size:12px;color:var(--text3);margin-top:2px">Betrag ohne Abzug</div>'+(ad&&!cur.closed?'<input type="number" min="0" step="1" placeholder="0" value="'+(cur.extra||'')+'" style="margin-top:8px;height:32px;width:100%;font-size:13px" onchange="provExtraSet(\''+emp.id+'\',\''+cm+'\',this.value)">':'<div style="font-size:20px;font-weight:300;margin-top:4px">'+pvpEur(cur.extra)+'</div>')+'</div>'
    +'<div style="background:#EFECE5;border-radius:12px;padding:10px 12px"><div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Abschluss</div><div style="font-size:12px;color:var(--text3);margin-top:2px">'+(lc?ML[+lastClosed.slice(5,7)-1]+' abgeschlossen'+(lc.am?' am '+lc.am.slice(8,10)+'.'+lc.am.slice(5,7)+'.':'')+(lc.von?' · '+esc(lc.von):''):'noch kein Monat abgeschlossen')+'</div><div style="font-size:12px;color:var(--text3);margin-top:6px">'+mn+': '+(cur.closed?'🔒 abgeschlossen':'offen · rechnet live')+'</div></div></div>'
    +'<div style="border-top:1px solid #E4E0D6;margin-top:12px;padding-top:10px;font-size:12.5px;color:var(--text2)">'+(lever?'<b>Größter Hebel:</b> '+esc(lever.x.label)+' auf '+(lever.x.dir==='lte'?'≤ ':'≥ ')+fmt(lever.x,lever.x.ziel)+' bringen – spart −'+red+' % Abzug, ≈ +'+pvpEur(gain)+'. ':'<b>Alle KPIs erfüllt.</b> ')+(bm<2?'Im ersten Monat gilt noch keine Mindestleistung.':'Mindestleistung '+String(ml).replace('.',',')+' Opt./Std. '+(c.mindestleistungGreift?'<b>verfehlt</b>.':'erreicht.'))+'</div></div>';
  body.innerHTML=h;}
