// Sales OS – Kalender: Abwesenheiten, Sessions, Urlaubskonto, Verspätungen
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function kalAbsWarn(eids,day){var L=(eids||[]).map(function(id){var a=kalOn(id,day),e=kalEmp(id);return a&&e?e.name+' ('+(KAL_ART[kalShowArt(a)]||'abwesend')+')':null;}).filter(Boolean);return L.length?confirm('Am '+kalF(day)+' abwesend: '+L.join(', ')+'.\nTrotzdem planen?'):true;}

function kalMapRow(r){return {id:r.id||('t'+Math.random().toString(36).slice(2)),employeeId:r.employee_id,art:r.art,minuten:r.minuten!=null?+r.minuten:null,von:r.von,bis:r.bis,halb:!!r.halb,halbTeil:r.halb_teil||null,status:r.status||'genehmigt',
  verschobenVon:r.verschoben_von||null,notiz:r.notiz||'',eingereichtAm:(r.eingereicht_am||'').slice(0,10)||today(),eingereichtVon:r.eingereicht_von||'',entschiedenVon:r.entschieden_von||'',entschiedenAm:r.entschieden_am||null,masked:!!r.masked};}
function kalHalb(x){return x.halb?(x.halbTeil==='nm'?' ½ NM':' ½ VM'):'';}
function kalIsViewer(){return currentUserRole==='viewer';}
function kalCanEdit(){return currentUserRole==='admin'||(!kalIsViewer()&&permFor('kalEdit')==='E');}
function loadAbsencesFromSupabase(){
  if(kalIsViewer()){
    var y=+today().slice(0,4);
    return sb.rpc('absences_team',{p_von:(y-1)+'-01-01',p_bis:(y+1)+'-12-31'}).then(function(res){
      if(res.error){console.warn('absences_team failed:',res.error);absences=[];return false;}
      absences=(res.data||[]).map(function(r,i){var m=kalMapRow(r);m.id='v'+i;m.masked=true;return m;}).filter(function(x){return x.art!=='verspaetung';});lateness=[];return true;});
  }
  return selectAllPaginated('absences').then(function(res){
    if(res.error){console.warn('absences load failed (Tabelle angelegt?):',res.error);absences=[];return false;}
    var all=(res.data||[]).map(kalMapRow);lateness=all.filter(function(x){return x.art==='verspaetung';});absences=all.filter(function(x){return x.art!=='verspaetung';});return true;});
}
function kalErrText(res){var m=(res&&res.error&&res.error.message)||'';if(/halb_teil/i.test(m))return 'Die Spalte „halb_teil“ fehlt noch. Bitte 21_kalender_regeln.sql in Supabase ausführen.';if(/row-level security|permission denied|42501/i.test(m))return 'Keine Berechtigung: Abwesenheiten dürfen nur Admins und Coaches eintragen und ändern.';return 'Speichern fehlgeschlagen: '+m;}
function kalActor(){return currentCoach?currentCoach.name:(currentAuthUser?resolveNonEmployeeName(currentAuthUser.email):'');}

// ── Regeln (Einstellungen › Kalender) ──
function kalRules(){var r=settings.kalenderRules||{};return {freiGrenze:r.freiGrenze!=null?+r.freiGrenze:3,freiBezug:r.freiBezug||'standort',verschieben:r.verschieben||'direkt',fehltAn:r.fehltAn!==false,fehltZeit:/^\d{2}:\d{2}$/.test(r.fehltZeit||'')?r.fehltZeit:'09:30',
  weekly:Object.assign({auto:true,minKpis:2,marge:true,zeitraum:'monat'},r.weekly||{}),routinen:(r.routinen||[]).map(function(rt){var M={'KPI Review':'Weekly','Performance-Gespräch':'Performance Review','1:1 Coaching':'Einzelcoaching','Coaching':'Einzelcoaching','Training':'Onboarding'};return M[rt.art]?Object.assign({},rt,{art:M[rt.art]}):rt;})};}
function kalSaveRules(r,log){settings.kalenderRules=r;saveSettingJson('kalenderRules',r,log||'Kalender-Regeln geändert');renderMain();}
function kalRuleSet(path,val){var r=kalRules();if(path.indexOf('weekly.')===0)r.weekly[path.slice(7)]=val;else r[path]=val;kalSaveRules(r);}
function kalTeamOf(e){return e.team||e.role||'';}

// ── Datum ──
function kalP(s){var a=s.split('-');return new Date(+a[0],+a[1]-1,+a[2]);}
function kalI(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function kalAdd(s,n){var d=kalP(s);d.setDate(d.getDate()+n);return kalI(d);}
function kalF(s){var d=kalP(s);return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.';}
function kalRange(x){return x.von===x.bis?kalF(x.von):kalF(x.von)+' – '+kalF(x.bis);}
function kalNf(v){return String(Math.round(v*10)/10).replace('.',',');}
function kalWknd(s){var w=kalP(s).getDay();return w===0||w===6;}
function kalMon(s){var d=kalP(s);return kalAdd(s,-((d.getDay()+6)%7));}
function kalRef(){var t=today();return kalWknd(t)?kalMon(kalAdd(t,2)):t;}
function kalKw(s){return isoWeekNum(new Date(s+'T00:00:00Z'));}
function kalIni(n){return String(n||'').split(' ').map(function(x){return x[0]||'';}).join('').slice(0,2).toUpperCase();}
function kalFirst(n){return String(n||'').split(' ')[0];}
function kalDiff(a,b){return Math.round((kalP(b)-kalP(a))/864e5);}
function valenciaFeiertage(year){
  var o=easterSundayUTC(year),m={};
  function put(d,n){m[d.toISOString().slice(0,10)]=n;}
  function fix(mo,da,n){put(new Date(Date.UTC(year,mo,da)),n);}
  fix(0,1,'Año Nuevo');fix(0,6,'Reyes');fix(0,22,'San Vicente Mártir');fix(2,19,'San José (Fallas)');
  put(addUTCDaysToDate(o,-2),'Viernes Santo');put(addUTCDaysToDate(o,1),'Lunes de Pascua');put(addUTCDaysToDate(o,8),'San Vicente Ferrer');
  fix(4,1,'Día del Trabajador');fix(5,24,'San Juan');fix(7,15,'Asunción');fix(9,9,'Día de la Comunitat Valenciana');fix(9,12,'Fiesta Nacional');
  fix(10,1,'Todos los Santos');fix(11,6,'Día de la Constitución');fix(11,8,'Inmaculada Concepción');fix(11,25,'Navidad');
  return m;
}
function kalIsVlc(e){return !!e&&e.role==='VLC';}
function kalHol(s,loc){var y=s.slice(0,4),k=y+loc;if(!_kalHolCache[k]){var b=bayernFeiertage(+y),v=loc==='VLC'?valenciaFeiertage(+y):{},m={};Object.keys(b).forEach(function(x){m[x]=b[x];});Object.keys(v).forEach(function(x){m[x]=m[x]?m[x]+' / '+v[x]:v[x];});_kalHolCache[k]=m;}return _kalHolCache[k][s]||'';}
function kalHolE(e,s){return kalHol(s,kalIsVlc(e)?'VLC':'MUC');}
function kalFixDay(s){return /-12-(24|31)$/.test(s);}
// Arbeitstag lt. Wochenarbeitszeit und Feiertagen; 24.12./31.12. sind für alle frei (Urlaubstag / Ausgleichstag)
function kalWorkday(e,s){return !kalWknd(s)&&!kalHolE(e,s)&&!kalFixDay(s)&&workHoursForDate(e,s)>0;}
function kalWdBetween(e,a,b){var n=0,d=kalAdd(a,1);while(d<b){if(kalWorkday(e,d))n++;d=kalAdd(d,1);}return n;}

// ── Mitarbeiter je Standort ──
// Wer im Kalender (Monat, Woche, Jahr, Team, Urlaubskonto, Formular) steht – Aufgaben, Weeklys, QA und „frei“-Zählung nutzen weiter kalEmps (nur Agenten)
// Anzeige der Position im Kalender (Personen ohne Board-Zugang als „Büro“)
function kalRoleLbl(e){if(!e)return '';var f=personFn(e);return f==='am'?'AM':f==='salesops'?'Ops':f==='leitung'?'Leitung':f==='none'?'–':(e.role||'');}
function kalPeople(loc){var _p=kalViewRange(),A=kalEmps(loc).filter(kalFlag),seen={};teamTargetList().forEach(function(e){seen[e.id]=1;});var X=employees.filter(function(e){return !seen[e.id]&&kalLocMatch(e,loc)&&kalFlag(e)&&kalEmployedIn(e,_p);});
  var ord=function(e){return e.kalOnly?2:(e.role==='SDC'||e.role==='SDM'||e.isPureCoach)?1:0;};return A.concat(X.sort(function(a,b){return ord(a)-ord(b)||a.name.localeCompare(b.name);}));}
function kalLocMatch(e,loc){loc=loc||KAL.loc;if(loc==='ALL')return true;if(loc==='NONE')return false;return loc==='VLC'?kalIsVlc(e):!kalIsVlc(e);}
// Zeitraum der aktuellen Kalenderansicht – Personen erscheinen nur, solange sie in diesem Zeitraum beschäftigt sind
function kalViewRange(){var c=KAL.cur||today(),v=KAL.view;if(v==='jahr')return [c.slice(0,4)+'-01-01',c.slice(0,4)+'-12-31'];if(v==='woche'){var m=kalMon(c);return [m,kalAdd(m,6)];}
  var f=c.slice(0,7)+'-01';return [f,kalAdd(kalAdd(c.slice(0,7)+'-28',4).slice(0,7)+'-01',-1)];}
function kalEmployedIn(e,p){p=p||kalViewRange();return !(e.endDate&&e.endDate<p[0])&&!(e.startDate&&e.startDate>p[1]);}
// Infos beim Überfahren des Namens (Team-Ansicht)
function kalPersonTip(e){var y=today().slice(0,4),k=kalKonto(e.id),vw=kalIsViewer(),T=k.ans+(k.uebEff||0),fd=function(d){return d?d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4):'';};
  var L=['<b>'+esc(e.name)+'</b> · '+esc(typeof personFnLabel==='function'?personFnLabel(e):(e.role||''))+' · '+(kalIsVlc(e)?'VLC':'MUC'),
    'Urlaub '+y+': <b>'+kalNf(k.frei)+' frei</b> von '+kalNf(T)+' · genommen '+kalNf(k.tk)+(k.pl?' · geplant '+kalNf(k.pl):'')+(k.be?' · beantragt '+kalNf(k.be):'')];
  if(k.flexMax)L.push('Flex Days: '+kalNf(k.flex)+' von '+k.flexMax+' übrig');
  if(!vw){L.push((k.kr?'Krank '+y+': <b>'+kalNf(k.kr)+' Tage</b>':'Krank '+y+': keine Tage')+(k.ag?' · Ausgleich '+kalNf(k.ag)+' T':''));}
  if(typeof latCanSee==='function'&&latCanSee()){var st=latStats(e.id,y+'-01-01',y+'-12-31');if(st.n)L.push('Verspätungen '+y+': '+st.n+'× · '+st.min+' Min.');}
  if(e.startDate&&e.startDate.slice(0,4)===y)L.push('Eintritt '+fd(e.startDate));
  if(e.endDate)L.push('<b>Vertragsende '+fd(e.endDate)+'</b>');
  L.push('<span style="opacity:.7">Klick: Mitarbeiterkarte öffnen</span>');return L.join('<br>');}
function kalEmps(loc){var _p=kalViewRange();return teamTargetList().filter(function(e){return kalLocMatch(e,loc)&&kalEmployedIn(e,_p);}).sort(function(a,b){return a.name.localeCompare(b.name);});}
function kalEmp(id){return employees.find(function(e){return e.id===id;});}

// ── Einträge ──
function kalVirtual(){var out=[],y=+today().slice(0,4);
  teamTargetList().forEach(function(e){[y,y+1].forEach(function(yy){
    var a=yy+'-12-24',b=yy+'-12-31';
    if(!kalWknd(a)&&workHoursForDate(e,a)>0)out.push({id:'x24'+e.id+yy,employeeId:e.id,art:'urlaub',von:a,bis:a,halb:false,status:'genehmigt',fixed:true});
    if(!kalWknd(b)&&workHoursForDate(e,b)>0)out.push({id:'x31'+e.id+yy,employeeId:e.id,art:'ausgleich',von:b,bis:b,halb:false,status:'genehmigt',fixed:true});});});
  return out;}
function kalAll(){var k=employees.length+today();if(!_kalVirt||_kalVirtKey!==k){_kalVirt=kalVirtual();_kalVirtKey=k;}return absences.concat(_kalVirt);}
function kalDays(x){var e=kalEmp(x.employeeId),r=[];if(!e)return r;var d=x.von;while(d<=x.bis){if(x.fixed||kalWorkday(e,d))r.push(d);d=kalAdd(d,1);}return r;}
function kalAmt(x){return kalDays(x).length*(x.halb?0.5:1);}
function kalIndex(){_kalOnIdx={};kalAll().forEach(function(x){if(x.status==='abgelehnt'||x.status==='storniert')return;kalDays(x).forEach(function(d){var k=x.employeeId+'|'+d;if(!_kalOnIdx[k])_kalOnIdx[k]=x;});});}
function kalOn(eid,d){if(!_kalOnIdx)kalIndex();return _kalOnIdx[eid+'|'+d]||null;}
function kalVorlauf(x){var e=kalEmp(x.employeeId);return e?kalWdBetween(e,x.eingereichtAm||today(),x.von):99;}
function kalShowArt(x){if(x.masked)return x.art==='urlaub'?'urlaub':'abwesend';if(x.art==='urlaub'&&x.status==='offen'&&!x.verschobenVon&&kalVorlauf(x)<15)return 'flex';return x.art;}
function kalFree(d,loc,excl){var r=[];kalEmps(loc).forEach(function(e){if(e.id===excl)return;var x=kalOn(e.id,d);if(x&&!x.fixed&&x.art!=='krank'&&!(x.masked&&x.art!=='urlaub'))r.push({e:e,x:x});});return r;}
function kalFreeFor(d,e,exclId){var r=kalFree(d,kalIsVlc(e)?'VLC':'MUC',e.id).filter(function(o){return o.x.id!==exclId;});if(kalRules().freiBezug==='team'){var t=kalTeamOf(e);r=r.filter(function(o){return kalTeamOf(o.e)===t;});}return r;}
function kalTip(x){var e=kalEmp(x.employeeId),a=kalShowArt(x);return '<b>'+esc(e?e.name:'')+'</b><br>'+KAL_ART[a]+kalHalb(x)+' · '+kalRange(x)+(x.status==='offen'?'<br>Antrag offen, eingereicht '+kalF(x.eingereichtAm):'')+(x.verschobenVon?'<br>verschoben von '+esc(x.verschobenVon):'')+(x.fixed?'<br>gilt für alle':'')+(x.notiz?'<br>'+esc(x.notiz):'');}

// ── Urlaubskonto ──
// Anteiliger Urlaub im Eintritts-/Austrittsjahr: Jahresanspruch (Standard 28 oder eingetragen) ÷ 12 × volle Beschäftigungsmonate,
// aufgerundet auf halbe Tage. Ein Monat zählt nur, wenn er vom 1. bis zum letzten Tag im Arbeitsverhältnis liegt.
function kalVolleMonate(e,y){var n=0;for(var m=1;m<=12;m++){var f=y+'-'+('0'+m).slice(-2)+'-01',l=kalAdd(kalAdd(f,32).slice(0,8)+'01',-1);
  if((!e.startDate||e.startDate<=f)&&(!e.endDate||e.endDate>=l))n++;}return n;}
function kalAnteil(e,y,jahr){var m=kalVolleMonate(e,String(y));return m>=12?jahr:Math.ceil(jahr*m/12*2)/2;}
function kalCfg(e,y){var u=(e.urlaub||{})[y]||{},prev=String(+y-1),ub=u.uebertrag!=null?+u.uebertrag:null,vs=false;
  if(ub===null){var hasPrev=(e.urlaub||{})[prev]||absences.some(function(x){return x.employeeId===e.id&&x.von.slice(0,4)===prev&&!x.masked;});if(hasPrev&&+prev>=2026){var kp=kalKonto(e.id,prev);ub=Math.max(0,kp.rest);vs=true;}else ub=0;}
  var aj=u.anspruch!=null?+u.anspruch:28;
  return {anspruch:kalAnteil(e,y,aj),anspruchJahr:aj,monate:kalVolleMonate(e,String(y)),flex:u.flex!=null?+u.flex:5,uebertrag:ub,uebVorschlag:vs,vorher:u.vorher_genommen!=null?+u.vorher_genommen:0};}
function kalKonto(eid,year){var e=kalEmp(eid),y=String(year||today().slice(0,4)),c=kalCfg(e,y),t=today();
  var k={ans:c.anspruch,flexMax:c.flex,uebertrag:c.uebertrag,vorher:c.vorher,tk:c.vorher,pl:0,be:0,flexUsed:0,kr:0,ag:0,bisMaerz:0,mon:[]};
  for(var i=0;i<12;i++)k.mon.push({tk:0,pl:0,be:0});
  kalAll().forEach(function(x){if(x.employeeId!==eid||x.status==='abgelehnt'||x.status==='storniert'||x.masked)return;var f=x.halb?0.5:1;
    kalDays(x).forEach(function(d){if(d.slice(0,4)!==y)return;if((e.startDate&&d<e.startDate)||(e.endDate&&d>e.endDate))return; // nur Tage im Arbeitsverhältnis
      var m=+d.slice(5,7)-1;
      if(x.art==='krank'){if(x.status==='genehmigt')k.kr+=f;return;}
      if(x.art==='freistellung'){if(x.status==='genehmigt')k.fs=(k.fs||0)+f;return;}
      if(x.art==='ausgleich'){if(x.status==='genehmigt'&&!x.fixed)k.ag+=f;return;}
      if(x.status==='offen'){k.be+=f;k.mon[m].be+=f;return;}
      if(d<=t){k.tk+=f;k.mon[m].tk+=f;}else{k.pl+=f;k.mon[m].pl+=f;}
      if(d<=y+'-03-31')k.bisMaerz+=f;
      if(x.art==='flex')k.flexUsed+=f;});});
  // Übertrag verfällt am 31.03.: danach zählt nur, was bis dahin genommen wurde
  // C5: gilt auch für vergangene Jahre (sonst wäre der Übertrag ins Folgejahr zu hoch)
  k.uebEff=(t>y+'-03-31')?Math.min(k.uebertrag,k.bisMaerz+k.vorher):k.uebertrag;
  k.rest=k.ans+k.uebEff-k.tk-k.pl;k.frei=k.rest-k.be;k.flex=k.flexMax-k.flexUsed;
  return k;}
function kalFlags(eid){var k=kalKonto(eid),f=[],m=+today().slice(5,7);
  if(m>=9&&k.frei>=8)f.push('<span class="kal-tag warn" data-ktip="Noch '+kalNf(k.frei)+' Tage frei. Was bis 31.12. nicht genommen ist, wird übertragen und verfällt am 31.03.">viel Resturlaub</span>');
  if(k.flex<=0)f.push('<span class="kal-tag warn">keine Flex Days mehr</span>');
  if(k.uebertrag&&today().slice(5)<='03-31')f.push('<span class="kal-tag" data-ktip="Übertrag aus dem Vorjahr, verfällt am 31.03.">Übertrag '+kalNf(k.uebertrag)+'</span>');
  return f;}

// ── Hinweise für Anträge / Einträge ──
function kalEval(r){var e=kalEmp(r.employeeId),H=[];if(!e)return {n:0,H:[{t:'err',h:'Bitte einen Mitarbeiter wählen.'}]};
  if(r.art==='verspaetung'){if(!r.von)return {n:0,H:[]};if(!kalWorkday(e,r.von))return {n:0,H:[]};if(!(+r.minuten>0))return {n:0,H:[{t:'err',h:'Bitte die Minuten angeben.'}]};return {n:1,H:[]};}
  if(!r.von||!r.bis||r.bis<r.von)return {n:0,H:[{t:'err',h:'Bitte einen gültigen Zeitraum wählen.'}]};
  var x={employeeId:r.employeeId,von:r.von,bis:r.bis,halb:r.halb,eingereichtAm:r.eingereichtAm||today()},ds=kalDays(x),n=ds.length*(r.halb?0.5:1),loc=kalIsVlc(e)?'VLC':'MUC',k=kalKonto(r.employeeId,r.von.slice(0,4));
  if(!n){H.push({t:'err',h:'Im Zeitraum liegt kein Arbeitstag von '+esc(kalFirst(e.name))+' (Wochenende, Feiertag oder lt. Arbeitszeit frei).'});return {n:0,H:H};}
  if(r.von<=r.bis&&(/-12-2[4-9]|-12-3[01]/.test(r.bis)))H.push({t:'info',h:'Der <b>24.12.</b> ist für alle ein Urlaubstag, der <b>31.12.</b> ein Ausgleichstag. Beide werden nicht noch einmal abgezogen.'});
  if(r.art==='urlaub'||r.art==='flex'){
    var v=kalWdBetween(e,x.eingereichtAm,r.von);
    if(r.verschobenVon)H.push({t:'info',h:'Verschoben von <b>'+esc(r.verschobenVon)+'</b>. Verschieben braucht eine Genehmigung, kostet aber keinen Flex Day.'});
    else if(v<15&&!r.normal){H.push({t:'warn',h:'Nur <b>'+v+' Arbeitstage</b> Vorlauf. Urlaub braucht mindestens 15 Arbeitstage Vorlauf, kürzer geht nur als <b>Flex Day</b>. Zählt als '+kalNf(n)+' Flex Day'+(n>1?'s':'')+', danach noch '+kalNf(Math.max(0,k.flex-n))+' von '+k.flexMax+'.'});
      if(k.flex<n)H.push({t:'err',h:'Nicht genug Flex Days übrig (noch '+kalNf(k.flex)+').'});}
    else if(v<15)H.push({t:'info',h:'Nur '+v+' Arbeitstage Vorlauf, wird aber wie gewählt als <b>normaler Urlaub</b> gezählt.'});
    else H.push({t:'info',h:'Vorlauf '+v+' Arbeitstage, die 15-Tage-Regel ist erfüllt.'});
    var G=kalRules().freiGrenze,tb=kalRules().freiBezug==='team',hit={};ds.forEach(function(d){var o=kalFreeFor(d,e,r.id);if(o.length>=G)hit[d]=o;});
    var hd=Object.keys(hit);if(hd.length){var nm={};hd.forEach(function(d){hit[d].forEach(function(o){nm[o.e.name+(o.x.status==='offen'?' (beantragt)':'')]=1;});});
      H.push({t:'warn',h:'Am '+hd.map(kalF).join(', ')+' haben '+(tb?'im Team '+esc(kalTeamOf(e)):'in '+loc)+' schon <b>'+G+' oder mehr andere frei</b>: '+esc(Object.keys(nm).join(', '))+'. Eintragen geht trotzdem.'});}
    var isFx=r.art==='flex'||(!r.normal&&(r.wasFlex||!r.verschobenVon&&v<15)),rest=k.frei-(r.id||isFx?0:n);H.push({t:rest<0?'err':'info',h:(isFx?'Urlaubskonto bleibt bei ':'Urlaubskonto danach: ')+'<b>'+kalNf(rest)+' von '+(k.ans+k.uebEff)+'</b> Tagen frei, offene Anträge mitgerechnet.'});}
  if(r.art==='freistellung')H.push({t:'info',h:'Freistellung (z. B. Gerichtstermin, Sonderurlaub): kostet keinen Urlaub. Kollegen und Betrachter sehen nur „abwesend“.'});
  if(r.art==='krank')H.push({t:'info',h:'Zählt als Arbeitstag mit 50 % der vereinbarten Stunden (z. B. 8 Std. → 4 Std.). Kollegen und Betrachter sehen nur „abwesend“.'});
  if(r.art==='ausgleich')H.push({t:'info',h:'Ausgleichstag: kostet keinen Urlaub und ändert das Ziel nicht. '+esc(kalFirst(e.name))+' hatte dieses Jahr '+kalNf(k.ag)+' Ausgleichstag'+(k.ag===1?'':'e')+'.'});
  return {n:n,H:H};}
function kalHintTags(x){var t=[],e=kalEmp(x.employeeId);if(!e)return '';var loc=kalIsVlc(e)?'VLC':'MUC';
  if(x.verschobenVon)t.push('<span class="kal-tag">verschoben von '+esc(x.verschobenVon)+'</span>');
  else if(x.art==='urlaub'&&kalVorlauf(x)<15)t.push('<span class="kal-tag warn" data-ktip="Nur '+kalVorlauf(x)+' Arbeitstage Vorlauf. Wird beim Genehmigen als Flex Day gezählt.">Flex Day · '+kalVorlauf(x)+' AT Vorlauf</span>');
  var G=kalRules().freiGrenze,hd=kalDays(x).filter(function(d){return kalFreeFor(d,e,x.id).length>=G;});
  if(hd.length)t.push('<span class="kal-tag warn" data-ktip="'+esc(hd.map(function(d){return kalF(d)+': '+kalFreeFor(d,e,x.id).map(function(o){return kalFirst(o.e.name);}).join(', ');}).join(' · '))+'">'+G+' andere frei'+(kalRules().freiBezug==='team'?' im Team':'')+' · '+hd.map(kalF).join(', ')+'</span>');
  var k=kalKonto(x.employeeId,x.von.slice(0,4));if(k.frei<0)t.push('<span class="kal-tag warn">Konto im Minus</span>');
  if(!t.length)t.push('<span class="kal-tag">keine Hinweise</span>');return t.join('');}

// ── Kontext (Kalender-Menü oder Coaching) und Filter nach Kategorien ──
function kalCtx(){return view==='coaching'?'coach':'kal';}
function kalSesCat(p){var t=p.type||p.typ||'';if(/^weekly$/i.test(t))return 'Weekly';return typeof findCoachingCategoryForType==='function'?findCoachingCategoryForType(t):'Coaching';}
function kalFilterCats(){var a=kalIsViewer()?[['urlaub','Urlaub'],['flex','Flex Day'],['abwesend','Abwesend']]:[['urlaub','Urlaub'],['flex','Flex Day'],['ausgleich','Ausgleichstag'],['freistellung','Freistellung'],['krank','Krank']];
  var c=[['Weekly','Weekly']].concat(Object.keys(COACHING_CATEGORIES).map(function(x){return [x,x];}));return {abs:a,ses:c};}
// Filter getrennt je Kalender: im Coaching-Kalender sind Abwesenheiten standardmäßig ausgeblendet
// Standard: Menü Kalender zeigt nur Abwesenheiten, Coaching nur Sessions
function kalHid(){if(kalCtx()!=='coach'){if(!KAL.hide)KAL.hide={};return KAL.hide;}if(!KAL.chide){KAL.chide={};kalFilterCats().abs.forEach(function(o){KAL.chide[o[0]]=1;});}return KAL.chide;}
function kalSetHide(h){if(kalCtx()==='coach')KAL.chide=h;else KAL.hide=h;}
function kalShowAbs(x){return !kalHid()[kalShowArt(x)];}
function kalOnV(eid,d){var x=kalOn(eid,d);return x&&kalShowAbs(x)?x:null;}
function kalLocSet(){return KAL.loc==='ALL'?{MUC:1,VLC:1}:KAL.loc==='NONE'?{}:(function(){var o={};o[KAL.loc]=1;return o;})();}
function kalLocToggle(l){var s2=kalLocSet();if(s2[l])delete s2[l];else s2[l]=1;KAL.loc=s2.MUC&&s2.VLC?'ALL':s2.MUC?'MUC':s2.VLC?'VLC':'NONE';KAL.open=null;_kalTC.v=null;kalRerender();}
function kalFilt(key){if(key==='*'){kalSetHide({});KAL.loc='ALL';KAL.chf={};}else if(key==='-'){var h={},f=kalFilterCats();f.abs.concat(f.ses).forEach(function(o){h[o[0]]=1;});kalSetHide(h);KAL.loc='NONE';}else if(kalHid()[key])delete kalHid()[key];else kalHid()[key]=1;kalRerender();}
function kalFiltOnly(grp){var f=kalFilterCats();kalSetHide({});(grp==='abs'?f.ses:f.abs).forEach(function(o){kalHid()[o[0]]=1;});kalRerender();}
function kalCoachOpts(){var L=employees.filter(function(e){return isCoachEmp(e)&&e.active!==false;}).sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(e){return [String(e.id),e.name];});return L.concat([['','ohne Coach-Eintrag (z. B. Admins)']]);}
function kalChfToggle(id){if(KAL.chf[id])delete KAL.chf[id];else KAL.chf[id]=1;kalRerender();}
function kalFilterBtn(){var f=kalFilterCats(),ls=kalLocSet(),n=Object.keys(kalHid()).length+Object.keys(KAL.chf).length+(KAL.loc==='ALL'?0:KAL.loc==='NONE'?2:1);
  function box(o){var on=!kalHid()[o[0]];return '<label style="display:flex;align-items:center;gap:8px;margin:0;padding:5px 6px;border-radius:7px;cursor:pointer;font-weight:400;font-size:13px"><input type="checkbox" style="width:auto;margin:0" '+(on?'checked':'')+' onchange="kalFilt(\''+o[0]+'\')">'+esc(o[1])+'</label>';}
  return '<div style="position:relative" id="kalFiltWrap"><button class="btn'+(n?' kal-tgl on':'')+'" onclick="KAL.fOpen=!KAL.fOpen;kalRerender()"><i class="ti ti-filter"></i> Filter'+(n?'<b>'+n+' aus</b>':'')+'</button>'
    +(KAL.fOpen?'<div style="position:absolute;top:40px;right:0;z-index:50;background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:10px;width:250px;box-shadow:0 8px 24px rgba(0,0,0,.12)">'
      +'<div style="display:flex;align-items:center;margin:0 6px 4px"><b style="font-size:11px;letter-spacing:.06em;color:var(--text2)">STANDORT</b></div>'+[['MUC','Olching (MUC)'],['VLC','Valencia (VLC)']].map(function(o){return '<label style="display:flex;align-items:center;gap:8px;margin:0;padding:5px 6px;border-radius:7px;cursor:pointer;font-weight:400;font-size:13px"><input type="checkbox" style="width:auto;margin:0" '+(ls[o[0]]?'checked':'')+' onchange="kalLocToggle(\''+o[0]+'\')">'+o[1]+'</label>';}).join('')
      +'<div style="display:flex;align-items:center;margin:10px 6px 4px"><b style="font-size:11px;letter-spacing:.06em;color:var(--text2)">ABWESENHEITEN</b><a style="margin-left:auto;font-size:11.5px;cursor:pointer;color:var(--text2)" onclick="kalFiltOnly(\'abs\')">nur diese</a></div>'+f.abs.map(box).join('')
      +'<div style="display:flex;align-items:center;margin:10px 6px 4px"><b style="font-size:11px;letter-spacing:.06em;color:var(--text2)">SESSIONS</b><a style="margin-left:auto;font-size:11.5px;cursor:pointer;color:var(--text2)" onclick="kalFiltOnly(\'ses\')">nur diese</a></div>'+f.ses.map(box).join('')
      +'<div style="display:flex;align-items:center;margin:10px 6px 4px"><b style="font-size:11px;letter-spacing:.06em;color:var(--text2)">COACH</b></div>'+kalCoachOpts().map(function(o){return '<label style="display:flex;align-items:center;gap:8px;margin:0;padding:5px 6px;border-radius:7px;cursor:pointer;font-weight:400;font-size:13px"><input type="checkbox" style="width:auto;margin:0" '+(KAL.chf[o[0]]?'':'checked')+' data-c="'+esc(o[0])+'" onchange="kalChfToggle(this.dataset.c)">'+esc(o[1])+'</label>';}).join('')
      +'<div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px"><button class="btn btn-sm" onclick="kalFilt(\'-\')">Alle abwählen</button><button class="btn btn-sm" onclick="kalFilt(\'*\')">Alle anzeigen</button></div></div>':'')+'</div>';}
// „+“: Abwesenheit eintragen oder Session planen (im Stil der Hauptmenü-Leiste)
function kalPlusMenuHtml(day,emp,hh){var a=function(ic,t,sub,fn){return '<button type="button" onclick="'+fn+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;cursor:pointer;font-family:inherit;text-align:left;color:var(--text)" onmouseover="this.style.background=\'#F7F5F0\'" onmouseout="this.style.background=\'transparent\'"><span style="width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;color:var(--text2)"><i class="ti '+ic+'"></i></span><span><b style="display:block;font-size:13.5px;font-weight:600">'+t+'</b><small style="font-size:11.5px;color:var(--text3)">'+sub+'</small></span></button>';};
  var dq=day?'\''+day+'\'':'null',eq=emp?'\''+emp+'\'':'null';
  return '<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:6px;width:270px;box-shadow:0 8px 24px rgba(0,0,0,.12)">'
    +a('ti-calendar-event','Abwesenheit eintragen','Urlaub, Krank, Verspätung …','kalPlusGo(\'abs\','+dq+','+eq+','+(hh==null?'null':hh)+')')
    +a('ti-message-circle','Session planen','Coaching, Weekly, Performance …','kalPlusGo(\'ses\','+dq+','+eq+','+(hh==null?'null':hh)+')')+'</div>';}
// Zwei Knöpfe nebeneinander: Abwesenheit · Session (kein Menü)
function kalPlusBtn(){if(!kalCanEdit())return '';var st='display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 13px;border:0;background:#F08566;color:#fff;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer';
  return '<span style="display:inline-flex;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(240,133,102,.25)" role="group" aria-label="Eintragen"><button type="button" style="'+st+'" onclick="kalPlusGo(\'abs\',null,null,null)"><i class="ti ti-calendar-event" aria-hidden="true"></i> Abwesenheit</button><button type="button" style="'+st+';border-left:1px solid rgba(255,255,255,.45)" onclick="kalPlusGo(\'ses\',null,null,null)"><i class="ti ti-message-circle" aria-hidden="true"></i> Session</button></span>';}
function kalPlusGo(k,day,emp,hh){KAL.pOpen=false;kalDayMenuClose();
  if(k==='abs'){kalOpenForm(emp||null,day||null);return;}
  if(hh!=null&&day){kalKlickMitZeit(day,hh);return;}
  if(day){kalKlick(day);return;}openSessionModal(0);}
// Klick auf einen Tag: dieselbe Auswahl an der Mausposition
function kalDayMenuClose(){var m=document.getElementById('kalDayMenu');if(m)m.remove();}
function kalDayMenu(ev,day,emp,hh){kalDayMenuClose();var m=document.createElement('div');m.id='kalDayMenu';m.style.cssText='position:fixed;z-index:3000;left:'+Math.min(ev.clientX,window.innerWidth-290)+'px;top:'+Math.min(ev.clientY+6,window.innerHeight-130)+'px';
  m.innerHTML=kalPlusMenuHtml(day,emp,hh);document.body.appendChild(m);}

// ── Sessions aus protocols ──
function kalSessEmps(){return kalCtx()==='coach'?employees.filter(function(e){return e.active!==false&&kalLocMatch(e);}):kalEmps();}
function kalSess(d,eid,raw){var out=[],grp={},cf=kalCtx()==='coach'&&typeof coachFilterView!=='undefined'&&coachFilterView&&coachFilterView!=='overview'?coachFilterView:null;
  kalSessEmps().forEach(function(e){if(eid&&e.id!==eid)return;(protocols[e.id]||[]).forEach(function(p){if(p.date!==d)return;if(kalOn(e.id,d)&&p.status!=='geplant')return;if(cf&&p.coachId!==cf)return;if(KAL.chf[String(p.coachId||'')])return;if(!raw&&kalHid()[kalSesCat(p)])return;
    if(p.groupId&&!eid){if(grp[p.groupId]){grp[p.groupId].n++;return;}var o={e:e,p:p,n:1};grp[p.groupId]=o;out.push(o);return;}out.push({e:e,p:p,n:1});});});
  return out.sort(function(a,b){return (a.p.uhrzeit||'').localeCompare(b.p.uhrzeit||'');});}
function kalSesPast(p){return p.status!=='geplant'||p.date<today();}
function kalCoachName(id){var c=employees.find(function(e){return e.id===id;});return c?kalFirst(c.name):'';}
function kalGroupProtos(p){if(!p.groupId)return [p];var r=[];Object.keys(protocols).forEach(function(k){(protocols[k]||[]).forEach(function(q){if(q.groupId===p.groupId)r.push(q);});});return r;}
function kalSesUpdate(p,upd){var q=p.groupId?sb.from('protocols').update(upd).eq('group_id',p.groupId):sb.from('protocols').update(upd).eq('id',p.id);return q.then(function(res){if(res&&res.error)alert(kalErrText(res));});}
function kalSesWho(o){return o.p.groupId?'Gruppencoaching ('+o.n+')':o.e.name;}
function kalSesAttrs(o){return ' data-eid="'+esc(o.e.id)+'" data-sid="'+esc(o.p.id)+'" data-typ="'+esc(o.p.type||'')+'" data-focus="'+esc(o.p.focus||'')+'" data-datum="'+esc(o.p.date)+'" data-uhrzeit="'+esc(o.p.uhrzeit||'')+'"';}
function kalSesTip(o){return esc((o.p.uhrzeit?o.p.uhrzeit+(o.p.endUhrzeit?'–'+o.p.endUhrzeit:'')+' ':'')+(o.p.type||'Session'))+'<br>'+esc(kalSesWho(o))+(o.p.focus?' · '+esc(o.p.focus):'')+(o.p.coachId?' mit '+esc(kalCoachName(o.p.coachId)):'')+(o.p.status==='geplant'?'<br>geplant':'');}
function kalKpiMisses(e,from,to){var T=empTargets(e),s=chartSumsForRange([e],from,to),out=[];var rows=(performance[e.id]||[]).filter(function(x){return x.date&&x.date>=from&&x.date<=to;});if(!rows.length)return out;
  KAL_KPIS.forEach(function(k){var t=T[k[0]];if(!t||t.val==null||t.val==='')return;var v;
    if(k[0]==='optPerH'){var opt=rows.reduce(function(a,x){return a+(x.optGesamt||0);},0),h=totalWorkHoursForMonth(e,null,rows.map(function(x){return x.date;}));v=h>0?opt/h:null;}else v=chartCrFromSums(k[0],s);
    if(v==null)return;if(t.dir==='gte'?v<+t.val:v>+t.val)out.push(k[1]);});return out;}
function kalMargeCheck(e,mk){var z=(zielStore[mk]||{})[e.id];if(!z||!z.margeOpt)return null;var s=chartSumsForRange([e],mk+'-01',addDaysUTC(today(),-1)),opt=s.oem+s.ups+s.wka;if(!opt)return null;var ist=s.margeGes/opt;return ist<+z.margeOpt?{ist:ist,ziel:+z.margeOpt}:null;}
function kalWeeklyReason(e){var W=kalRules().weekly,t=today(),y=addDaysUTC(t,-1),from=W.zeitraum==='7'?addDaysUTC(t,-7):t.slice(0,7)+'-01';if(from>y)from=y;
  var miss=kalKpiMisses(e,from,y),why=[];if(miss.length>=(+W.minKpis||2))why.push(miss.length+' KPIs unter Ziel ('+miss.join(', ')+')');
  if(W.marge){var m=kalMargeCheck(e,t.slice(0,7));if(m)why.push('Marge/Opt. '+Math.round(m.ist)+' € statt '+Math.round(m.ziel)+' €');}return why;}
function kalPeriod(rh,ref){var mo=kalMon(ref);if(rh==='monat'){var f=ref.slice(0,7)+'-01',l=kalI(new Date(+ref.slice(0,4),+ref.slice(5,7),0));while(kalWknd(l))l=kalAdd(l,-1);return {from:f,to:l,due:l,lbl:'im '+KAL_MON[+ref.slice(5,7)-1]};}
  if(rh==='2wochen'){var w=kalKw(mo),start=w%2===0?mo:kalAdd(mo,-7);return {from:start,to:kalAdd(start,11),due:kalAdd(start,11),lbl:'in KW '+kalKw(start)+'/'+kalKw(kalAdd(start,7))};}
  return {from:mo,to:kalAdd(mo,4),due:kalAdd(mo,4),lbl:'in KW '+kalKw(mo)};}
function kalTasks(){var k=KAL.loc+'|'+view;if(_kalTC.v&&_kalTC.k===k&&Date.now()-_kalTC.at<400)return _kalTC.v;_kalTC.v=kalTasksCalc();_kalTC.k=k;_kalTC.at=Date.now();return _kalTC.v;}
function kalTasksCalc(){var out=[],t=today(),ref=kalRef(),wk=kalPeriod('woche',ref),R=kalRules(),covered={};
  kalEmps().forEach(function(e){
    if(e.startDate){[3,5,11,23].forEach(function(n){var s=kalP(e.startDate);s.setMonth(s.getMonth()+n);var due=kalI(s);
      if(due<kalAdd(t,-60)||due>kalAdd(t,14))return;
      // Zwei getrennte Aufgaben: „Entwicklung bewerten“ (aufgAll) und diese Session. Die Session zählt erst, wenn sie nicht vor der Bewertung liegt.
      var rv=(reviews[e.id]||[]).filter(function(r){return r&&r.einwand!==undefined&&(r.date||'')>=kalAdd(due,-30);}).map(function(r){return r.date;}).sort().pop()||null;
      var ses=(protocols[e.id]||[]).some(function(p){return /Performance/i.test(p.type||'')&&p.date>=kalAdd(due,-30)&&(!rv||p.date>=rv);});
      if(!ses)out.push({id:'pg'+e.id+n,e:e,art:'Performance Review',l:'Performance Review '+e.name,src:n+' Monate im Unternehmen'+(rv?' · Bewertung ✓':' · Bewertung noch offen'),due:due});});}});
  // Routinen: feste Termine je Mitarbeiter
  R.routinen.forEach(function(rt){(rt.empIds||[]).forEach(function(id){var e=kalEmp(id);if(!e||kalEmps().indexOf(e)<0)return;var pd=kalPeriod(rt.rhythmus,ref),art=rt.art||'Weekly';
    var has=(protocols[e.id]||[]).some(function(p){return p.date>=pd.from&&p.date<=pd.to&&(p.type||'')===art;});if(art==='Weekly')covered[e.id]=1;
    if(!has)out.push({id:'rt'+rt.id+e.id+pd.from,e:e,art:art,coachId:rt.coachId||null,l:art+' mit '+e.name,src:'Routine '+KAL_RH[rt.rhythmus||'woche']+(rt.coachId?' · '+kalCoachName(rt.coachId):'')+' · noch keins '+pd.lbl,due:pd.due});});});
  // Weekly nach Regeln: nur wer nicht performt und diese Woche noch keine Session hat
  if(R.weekly.auto)kalEmps().forEach(function(e){if(covered[e.id])return;var has=(protocols[e.id]||[]).some(function(p){return p.date>=wk.from&&p.date<=wk.to&&/^(Weekly|KPI Review)$/.test(p.type||'');});if(has)return;
    var why=kalWeeklyReason(e);if(why.length)out.push({id:'wk'+e.id+wk.from,e:e,art:'Weekly',l:'Weekly mit '+e.name,src:why.join(' · '),due:wk.due});});
  return out.sort(function(a,b){return a.due<b.due?-1:a.due>b.due?1:0;});}
function kalOpenReqs(){return absences.filter(function(x){var e=kalEmp(x.employeeId);return x.status==='offen'&&e&&kalLocMatch(e);}).sort(function(a,b){return a.von<b.von?-1:1;});}

// ── Banner: oben 3, unten 6 Kennzahlen ──
function kalBanner(){var t=today(),L=kalPeople(),wds=[],d=t;while(wds.length<10){if(!kalWknd(d)&&!kalHol(d,KAL.loc))wds.push(d);d=kalAdd(d,1);}
  var abw=wds.map(function(x){return L.filter(function(e){return kalOn(e.id,x);}).length;});
  var mo=kalMon(kalRef()),wk=[0,1,2,3,4].map(function(i){return kalAdd(mo,i);}),nmo=kalAdd(mo,7),nwk=[0,1,2,3,4].map(function(i){return kalAdd(nmo,i);});
  var sesW=wk.map(function(x){return kalSess(x,null,true).length;}),sesN=sesW.reduce(function(a,b){return a+b;},0);
  var openR=kalOpenReqs(),weeks=[],wl=[];for(var i=0;i<8;i++){var ws=kalAdd(mo,7*i),cnt=0;L.forEach(function(e){for(var j=0;j<5;j++){var xx=kalOn(e.id,kalAdd(ws,j));if(xx&&(xx.art==='urlaub'||xx.art==='flex'))cnt+=xx.halb?0.5:1;}});weeks.push(cnt);wl.push('KW '+kalKw(ws));}
  var abwN=new Set();L.forEach(function(e){nwk.forEach(function(x){if(kalOn(e.id,x))abwN.add(e.id);});});
  var K=L.map(function(e){return kalKonto(e.id);}),sum=function(f){return K.reduce(function(a,k){return a+k[f];},0);};
  var mk=t.slice(0,7),kr=0,ag=0;absences.forEach(function(x){if(x.status!=='genehmigt')return;var e=kalEmp(x.employeeId);if(!e||L.indexOf(e)<0)return;kalDays(x).forEach(function(dd){if(dd.slice(0,7)!==mk)return;if(x.art==='krank'||(x.masked&&x.art!=='urlaub'))kr+=x.halb?0.5:1;if(x.art==='ausgleich')ag++;});});
  function big(l,v,s){return '<div style="grid-column:span 1;padding-left:14px"><div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">'+l+'</div><div style="font-size:30px;font-weight:700;line-height:1">'+v+'</div><div style="font-size:11px;color:#E9B2A6;margin-top:4px">'+s+'</div></div>';}
  function chart(vals,lab,fmt){return '<div style="grid-column:span 1;display:flex;align-items:center;height:100%;padding:4px 14px">'+barsHighlightLast(vals,'#F7B39A',300,34,lab,fmt)+'</div>';}
  function small(l,v,s){return '<div style="padding:4px 14px"><div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">'+l+'</div><div style="font-size:18px;font-weight:700;margin-top:4px">'+v+'</div><div style="font-size:9.5px;color:#E9B2A6;margin-top:3px">'+s+'</div></div>';}
  var h='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px;color:#fff;margin-bottom:22px;margin-top:16px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
  h+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);min-height:110px;align-items:center">';
  h+=big('ABWESEND HEUTE',L.filter(function(e){return kalOn(e.id,t);}).length,'von '+L.length+' · '+({ALL:'alle Standorte',MUC:'Olching',VLC:'Valencia',NONE:'kein Standort'}[KAL.loc]||KAL.loc))+chart(abw,wds.map(kalF),function(v){return v+' abwesend';});
  h+=big('SESSIONS KW '+kalKw(mo),sesN,'geplant und durchgeführt')+chart(sesW,wk.map(kalF),function(v){return v+' Sessions';});
  h+=big('OFFENE ANTRÄGE',openR.length,openR.length?'ältester vom '+kalF(openR.map(function(x){return x.eingereichtAm;}).sort()[0]):'nichts offen')+chart(weeks,wl,function(v){return kalNf(v)+' Urlaubstage';});
  h+='</div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;min-height:56px;align-items:center">';
  h+=small('ABWESEND KW '+kalKw(nmo),abwN.size,'Mitarbeiter')+small('RESTURLAUB TEAM',kalNf(sum('frei')),'Tage frei')+small('FLEX DAYS ÜBRIG',kalNf(sum('flex')),'im Team');
  h+=small('KRANKHEITSTAGE',kalNf(kr),KAL_MON[+mk.slice(5)-1])+small('AUSGLEICHSTAGE',ag,KAL_MON[+mk.slice(5)-1])+small('ZU PLANEN',kalTasks().length,'Sessions');
  return h+'</div>'+bannerDotsBar('kalender')+'</div>';}

// ── Ansichten ──
function kalAbsRz(x,d){if(!(kalCanEdit()&&!x.fixed&&!x.masked))return '';var ds=kalDays(x);return (ds[0]===d?'<span class="kal-rz l" data-krz="von"></span>':'')+(ds[ds.length-1]===d?'<span class="kal-rz r" data-krz="bis"></span>':'');}
function kalAbsChip(e,x,d){var a=kalShowArt(x),dr=kalCanEdit()&&!x.fixed&&!x.masked;
  return '<div class="kal-ch '+KAL_CLS[a]+(x.status==='offen'?' kal-op':'')+'" style="position:relative" '+(dr?'draggable="true" data-kabs="'+x.id+'" data-kfrom="'+d+'"':'')+(x.fixed||x.masked?'':' data-kedit="'+x.id+'"')+' data-ktip="'+esc(kalTip(x))+'">'+kalAbsRz(x,d)+esc(kalFirst(e.name))+' · '+KAL_ART[a]+kalHalb(x)+'</div>';}
function kalSesChip(o){return '<div class="kal-ch kal-ses kal-sopen'+(kalSesPast(o.p)?' past':'')+'" '+(kalCanEdit()?'draggable="true" data-kses="'+o.p.id+'" data-kemp="'+o.e.id+'"':'')+kalSesAttrs(o)+' data-ktip="'+esc(kalSesTip(o))+'">'+(o.p.uhrzeit?o.p.uhrzeit+' ':'')+esc(o.p.groupId?'Gruppe ('+o.n+')':kalFirst(o.e.name))+(kalSesArt(o.p.type)?' <span style="opacity:.7">· '+esc(kalSesArt(o.p.type))+'</span>':'')+(kalOn(o.e.id,o.p.date)?' <span class="kal-sabs" title="Mitarbeiter an diesem Tag abwesend">abwesend</span>':'')+'</div>';}
// Kurzname der Session-Art für die Chips im Kalender
function kalSesArt(t){if(!t)return '';return {'Einzelcoaching':'Coaching','Performance Review':'Performance','Performance-Gespräch':'Performance','KPI Review':'Weekly','1:1 Coaching':'Coaching'}[t]||t;}
function kalFreeOver(d,o){var R=kalRules();if(R.freiBezug!=='team')return o.length>=R.freiGrenze;var c={};o.forEach(function(z){var t=kalTeamOf(z.e);c[t]=(c[t]||0)+1;});return Object.keys(c).some(function(t){return c[t]>=R.freiGrenze;});}
function kalFreeTag(d){if(kalFixDay(d))return '';var o=kalFree(d,KAL.loc,null);return kalFreeOver(d,o)?'<span class="kal-tag warn" data-ktip="'+esc(o.map(function(z){return esc(z.e.name)+(z.x.status==='offen'?' (beantragt)':'');}).join(' · '))+'">'+o.length+' frei</span>':'';}
// Vorschläge: noch nicht geplante Weeklys / Performance Reviews gestrichelt am Fälligkeitstag (Überfälliges heute). Klick → Woche zum Einplanen, Ziehen auf eine Uhrzeit → Termin
function kalSuggest(d){if(kalCtx()==='coach'||!kalCanEdit())return [];var t=today();if(d<t)return [];var hid=kalHid();
  return kalTasks().filter(function(x){var dd=x.due<t?t:x.due;if(dd!==d)return false;if(!kalLocMatch(x.e))return false;var cat=/Weekly/i.test(x.art)?'Weekly':'Performance';return !hid[cat];});}
function kalSuggestChip(x){return '<div class="kal-ch kal-vs" draggable="true" data-ktask="'+esc(x.id)+'" onclick="event.stopPropagation();kalPlanTask(this.dataset.ktask)" data-ktip="'+esc('<b>'+x.l+'</b><br>Vorschlag · fällig '+kalF(x.due)+'<br>'+x.src+'<br>Klick: Woche öffnen · Ziehen: auf eine Uhrzeit')+'">'+esc(kalFirst(x.e.name))+' · '+esc(x.art==='Weekly'?'Weekly':'Review')+'</div>';}
function kalVWeek(){var m=kalMon(KAL.cur),D=[0,1,2,3,4,5,6].map(function(i){return kalAdd(m,i);}),t=today();
  var h='<div class="kal-wv"><div class="hd" style="border-left:0"></div>'+D.map(function(d){var hn=kalHol(d,KAL.loc);var hp=kalHolPart(d);return '<div class="hd'+(d===t?' td':'')+(kalWknd(d)?' we':'')+'">'+KAL_WD[kalP(d).getDay()].toUpperCase()+'<b>'+kalF(d)+'</b>'+(hp?'<small class="hp">'+esc(hp)+'</small>':'')+(hn?'<small>'+esc(hn)+'</small>':'')+'</div>';}).join('');
  h+='<div class="lab">ganztags</div>'+D.map(function(d){var o=[kalFreeTag(d)];kalPeople().forEach(function(e){var x=kalOnV(e.id,d);if(x)o.push(kalAbsChip(e,x,d));});kalSess(d).forEach(function(s){if(!s.p.uhrzeit)o.push(kalSesChip(s));});var sg=kalSuggest(d);if(o.length-1+sg.length>3&&KAL.wex!==d){var by={};sg.forEach(function(x){var k=x.art==='Weekly'?'Weekly':'Performance Review';(by[k]=by[k]||[]).push(x);});Object.keys(by).forEach(function(k){var L=by[k];o.push(L.length===1?kalSuggestChip(L[0]):'<div class="kal-ch kal-vs kal-vsg" onclick="event.stopPropagation();KAL.wex=\''+d+'\';kalRerender()" data-ktip="'+esc('<b>'+L.length+' × '+k+' (Vorschlag)</b><br>'+L.map(function(x){return x.e.name;}).join('<br>')+'<br>Klick: einzeln anzeigen')+'"><b>'+L.length+'</b> '+(k==='Weekly'?'Weeklys':'Reviews')+'</div>');});}else{sg.forEach(function(x){o.push(kalSuggestChip(x));});if(KAL.wex===d&&sg.length>1)o.push('<div class="kal-more" style="cursor:pointer" onclick="event.stopPropagation();KAL.wex=null;kalRerender()">weniger anzeigen</div>');}return kalWknd(d)?'<div class="ad we">'+o.slice(1).join('')+'</div>':'<div class="ad" data-kday="'+d+'">'+o.join('')+'</div>';}).join('');
  var tm='<div class="times">';for(var hh=8;hh<20;hh++)tm+='<span style="top:'+((hh-8)*56+4)+'px">'+('0'+hh).slice(-2)+':00</span>';h+=tm+'</div>';
  D.forEach(function(d){var c=kalWknd(d)?'<div class="col we">':'<div class="col'+(kalHol(d,KAL.loc)?' hl':'')+'" data-kslot="'+d+'" data-kopen="'+d+'">';
    var day=kalSess(d).filter(function(o){return o.p.uhrzeit;}),cols=[];day.forEach(function(o){var st=timeStrToMin(o.p.uhrzeit),en=o.p.endUhrzeit?timeStrToMin(o.p.endUhrzeit):st+45;if(en<=st)en=st+45;o._s=st;o._e=en;var ci=0;while(cols[ci]&&cols[ci]>st)ci++;cols[ci]=en;o._col=Math.min(ci,2);});
    day.forEach(function(o){var n=0;day.forEach(function(q){if(q._s<o._e&&q._e>o._s)n=Math.max(n,q._col+1);});o._n=Math.max(1,Math.min(3,n,cols.length));if(o._col>=o._n)o._col=o._n-1;});
    day.forEach(function(o){if(!o.p.uhrzeit)return;var st=timeStrToMin(o.p.uhrzeit),en=o.p.endUhrzeit?timeStrToMin(o.p.endUhrzeit):st+45;var top=Math.max(0,(st-480)/60*56),hgt=Math.max(22,(en-st)/60*56-3);
      c+='<div class="ev kal-ses kal-sopen'+(kalSesPast(o.p)?' past':'')+'" style="top:'+top.toFixed(0)+'px;height:'+hgt.toFixed(0)+'px;left:calc('+(o._col*100/o._n)+'% + 4px);right:auto;width:calc('+(100/o._n)+'% - 8px)" '+(kalCanEdit()?'draggable="true" data-kses="'+o.p.id+'" data-kemp="'+o.e.id+'"':'')+kalSesAttrs(o)+' data-ktip="'+esc(kalSesTip(o))+'">'+(kalCanEdit()?'<span class="kal-rz t" data-krz="s"></span><span class="kal-rz b" data-krz="e"></span>':'')+'<div><b class="kal-tm">'+o.p.uhrzeit+'</b> '+esc(kalSesWho(o))+'</div><div>'+esc(o.p.type||'Session')+(o.p.coachId?' · '+esc(kalCoachName(o.p.coachId)):'')+'</div></div>';});
    h+=c+'</div>';});
  return h+'</div>';}
function kalMgCut(n){if(view!=='kalender')return n>5?5:n;return n>3?3:n;}
function kalVMonth(){var d0=kalP(KAL.cur),y=d0.getFullYear(),mo=d0.getMonth(),first=kalI(new Date(y,mo,1)),last=kalI(new Date(y,mo+1,0)),t=today();var d=kalMon(first);
  var h='<div class="kal-mg">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(w){return '<div class="wh">'+w+'</div>';}).join('');
  while(d<=last||kalP(d).getDay()!==1){var hn=kalHol(d,KAL.loc),hp=kalHolPart(d),out=kalP(d).getMonth()!==mo;
    if(kalWknd(d)){h+='<div class="c we'+(out?' out':'')+'"><div class="dn">'+kalP(d).getDate()+'</div></div>';d=kalAdd(d,1);continue;}
    var ch=[];kalPeople().forEach(function(e){var x=kalOnV(e.id,d);if(x&&!x.fixed)ch.push(kalAbsChip(e,x,d));if(latCanSee())latOn(e.id,d).forEach(function(l){ch.push('<div class="kal-ch kal-vzc" data-kedit="'+l.id+'" data-ktip="'+esc('<b>'+esc(e.name)+'</b><br>'+(l.minuten||0)+' Min. zu spät'+(l.notiz?'<br>'+esc(l.notiz):''))+'"><i class="ti ti-clock"></i> '+esc(kalFirst(e.name))+' · '+(l.minuten||0)+'′</div>');});});kalSuggest(d).forEach(function(x){ch.push(kalSuggestChip(x));});kalSess(d).forEach(function(o){ch.push(kalSesChip(o));});
    var fix=kalFixDay(d)?'<div class="kal-ch '+(d.slice(-2)==='24'?'kal-u':'kal-a')+'">alle · '+(d.slice(-2)==='24'?'Urlaubstag':'Ausgleichstag')+'</div>':'';
    h+='<div class="c'+(hn?' hl':'')+(out?' out':'')+'" data-kday="'+d+'" data-kopen="'+d+'"><div class="dn">'+(d===t?'<span class="tday">'+kalP(d).getDate()+'</span>':kalP(d).getDate())+kalFreeTag(d)+(view==='kalender'&&ch.length>kalMgCut(ch.length)?'<span class="kal-more" style="margin-left:auto;font-weight:600">+'+(ch.length-kalMgCut(ch.length))+'</span>':'')+'</div>'+(hn?'<div class="hn">'+esc(hn)+'</div>':'')+(hp?'<div class="hn hp">'+esc(hp)+'</div>':'')+fix+ch.slice(0,kalMgCut(ch.length)).join('')+(view!=='kalender'&&ch.length>kalMgCut(ch.length)?'<div class="kal-more">+'+(ch.length-kalMgCut(ch.length))+' weitere</div>':'')+'</div>';d=kalAdd(d,1);}
  return h+'</div>';}
function kalVYear(){if(kalCtx()==='coach')return kalVYearCoach();var y=+KAL.cur.slice(0,4),t=today(),h='<div class="kal-yv">',L=kalPeople();
  for(var m=0;m<12;m++){var f=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),g=['M','D','M','D','F','S','S'].map(function(w){return '<i>'+w+'</i>';}).join(''),tot=0;
    for(var k=0;k<(f.getDay()+6)%7;k++)g+='<b class="e"></b>';
    for(var dd=1;dd<=n;dd++){var d=kalI(new Date(y,m,dd));if(kalWknd(d)){g+='<b class="we">'+dd+'</b>';continue;}var hn=kalHol(d,KAL.loc);if(hn){g+='<b class="hd" data-ktip="'+esc(hn)+'">'+dd+'</b>';continue;}var hpY=kalHolPart(d);if(hpY){g+='<b class="hpy" data-ktip="'+esc(hpY)+'">'+dd+'</b>';continue;}
      var ab=L.map(function(e){return {e:e,x:kalOnV(e.id,d)};}).filter(function(o){return o.x&&!o.x.fixed;});tot+=ab.length;var lv=Math.min(3,ab.length);
      g+='<b class="'+(lv?'l'+lv:'')+(d===t?' td':'')+'"'+(ab.length?' data-ktip="'+esc(kalF(d)+' · '+ab.map(function(o){return esc(kalFirst(o.e.name))+' ('+KAL_ART[kalShowArt(o.x)]+')';}).join(', '))+'"':'')+'>'+dd+'</b>';}
    h+='<div class="kal-ym'+(m===+t.slice(5,7)-1&&String(y)===t.slice(0,4)?' cur':'')+'" data-kmonth="'+kalI(f)+'"><h4>'+KAL_MON[m]+'<span>'+tot+' Abw.-Tage</span></h4><div class="g">'+g+'</div></div>';}
  return h+'</div>';}
// Jahr im Coaching: je dunkler, desto mehr Sessions an dem Tag (1–2 / 3–4 / ab 5)
function kalVYearCoach(){var y=+KAL.cur.slice(0,4),t=today(),h='<div class="kal-yv">';
  for(var m=0;m<12;m++){var f=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),g=['M','D','M','D','F','S','S'].map(function(w){return '<i>'+w+'</i>';}).join(''),tot=0;
    for(var k=0;k<(f.getDay()+6)%7;k++)g+='<b class="e"></b>';
    for(var dd=1;dd<=n;dd++){var d=kalI(new Date(y,m,dd)),ss=kalSess(d);tot+=ss.length;
      if(kalWknd(d)&&!ss.length){g+='<b class="we">'+dd+'</b>';continue;}var hn=kalHol(d,KAL.loc);if(hn&&!ss.length){g+='<b class="hd" data-ktip="'+esc(hn)+'">'+dd+'</b>';continue;}
      var c=ss.length,lv=c>=5?3:c>=3?2:c?1:0,tip=ss.slice(0,8).map(function(o){return (o.p.uhrzeit?o.p.uhrzeit+' ':'')+(o.p.groupId?'Gruppencoaching ('+o.n+')':kalFirst(o.e.name))+' · '+(o.p.type||'Session');}).join(', ')+(c>8?' …':'');
      g+='<b class="'+(lv?'l'+lv:'')+(d===t?' td':'')+'"'+(c?' data-ktip="'+esc(kalF(d)+' · '+c+' Session'+(c>1?'s':'')+': '+tip)+'"':'')+'>'+dd+'</b>';}
    h+='<div class="kal-ym'+(m===+t.slice(5,7)-1&&String(y)===t.slice(0,4)?' cur':'')+'" data-kmonth="'+kalI(f)+'"><h4>'+KAL_MON[m]+'<span>'+tot+' Session'+(tot===1?'':'s')+'</span></h4><div class="g">'+g+'</div></div>';}
  return h+'</div>';}
// Tag, an dem jemand laut Arbeitszeit (Stammdaten) nicht arbeitet – kein Wochenende, kein Feiertag
function kalNoWork(e,d){if(!e||kalWknd(d)||kalHolE(e,d)||kalFixDay(d))return false;if((e.startDate&&d<e.startDate)||(e.endDate&&d>e.endDate))return true;return !(workHoursForDate(e,d)>0);}
function kalNoWorkTip(e,d){var fd=function(x){return x.slice(8,10)+'.'+x.slice(5,7)+'.'+x.slice(0,4);};if(e.endDate&&d>e.endDate)return esc(e.name)+' – Vertragsende '+fd(e.endDate);if(e.startDate&&d<e.startDate)return esc(e.name)+' – Eintritt am '+fd(e.startDate);return esc(e.name)+' arbeitet '+['sonntags','montags','dienstags','mittwochs','donnerstags','freitags','samstags'][kalP(d).getDay()]+' nicht (laut Arbeitszeit)';}
// Feiertag nur für einen Teil des Teams (bei „alle Standorte“: spanische Feiertage, an denen Olching arbeitet)
function kalHolPart(d){if(KAL.loc!=='ALL')return '';if(kalHol(d,'MUC'))return '';var v=kalHol(d,'VLC');return v?'Valencia: '+v:'';}
function kalVTeam(){var d0=kalP(KAL.cur),y=d0.getFullYear(),mo=d0.getMonth(),n=new Date(y,mo+1,0).getDate(),D=[],t=today();for(var i=1;i<=n;i++)D.push(kalI(new Date(y,mo,i)));
  var h='<div class="kal-tlw"'+(kalCtx()==='coach'?' style="max-height:'+(kalPeople(KAL.loc).length*42+94)+'px"':'')+'><div class="kal-tl" style="grid-template-columns:210px repeat('+n+',minmax(28px,1fr))"><div class="hd nm">Mitarbeiter</div>'+D.map(function(d){var hn=kalHol(d,KAL.loc),hp=kalHolPart(d);return '<div class="hd'+(kalWknd(d)||hn?' we':'')+(hp?' hp':'')+(d===t?' td':'')+'"'+(hn||hp?' data-ktip="'+esc(hn||hp)+'"':'')+'><b>'+kalP(d).getDate()+'</b>'+KAL_WD[kalP(d).getDay()]+'</div>';}).join('');
  var co=kalCtx()==='coach',TE=co?kalPeople('MUC').concat(kalPeople('VLC')):kalPeople();
  TE.forEach(function(e){h+='<div class="nm kal-nmc" data-eid="'+e.id+'" onclick="event.stopPropagation();openEmpSetModal(\''+e.id+'\')" data-ktip="'+esc(kalPersonTip(e))+'"><span class="kal-av">'+kalIni(e.name)+'</span>'+esc(e.name)+'<small>'+esc(kalRoleLbl(e))+'</small></div>';
    D.forEach(function(d,ix){var hn=kalHol(d,KAL.loc),x=kalOnV(e.id,d),inner='';
      if(x){var a=kalShowArt(x),pv=ix>0&&kalOnV(e.id,D[ix-1])===x,nx=ix<n-1&&kalOnV(e.id,D[ix+1])===x,dr=kalCanEdit()&&!x.fixed&&!x.masked;
        inner='<span class="blk '+KAL_CLS[a]+(x.status==='offen'?' kal-op':'')+(x.halb?' h':'')+(!pv?' s':'')+(!nx?' e':'')+'" '+(dr?'draggable="true" data-kabs="'+x.id+'" data-kfrom="'+d+'"':'')+(x.fixed||x.masked?'':' data-kedit="'+x.id+'"')+' data-ktip="'+esc(kalTip(x))+'">'+(dr&&!pv?'<span class="kal-rz l" data-krz="von"></span>':'')+(dr&&!nx?'<span class="kal-rz r" data-krz="bis"></span>':'')+(!pv?(x.halb?'½':KAL_ART[a].slice(0,1)):'')+'</span>';}
      // Sessions: gut sichtbarer, anklickbarer Baustein mit Kürzel der Art (C, W, P, O); mehrere am Tag = Anzahl
      var ss=kalSess(d,e.id);if(ss.length){var o0=ss[0],lab=ss.length>1?ss.length:(kalSesArt(o0.p.type)||'S').slice(0,1);inner+='<span class="sb2 kal-ses kal-sopen'+(ss.every(function(o){return kalSesPast(o.p);})?' past':'')+(x?' over':'')+'" '+(kalCanEdit()?'draggable="true" data-kses="'+o0.p.id+'" data-kemp="'+o0.e.id+'"':'')+kalSesAttrs(o0)+' data-ktip="'+esc(ss.map(function(o){return kalSesTip(o);}).join('<br>'))+'">'+lab+'</span>';}
      // Feiertag je Mitarbeiter (Valencia hat eigene Feiertage) – auch wenn die Spalte für den Standort-Filter kein Feiertag ist
      var hE=kalHolE(e,d),nw=!x&&!hE&&kalNoWork(e,d);h+='<div class="cell'+(kalWknd(d)||hn||hE?' we':'')+(nw?' nw':'')+(d===t?' td':'')+'" data-kday="'+d+'" data-kemp="'+e.id+'"'+(!kalWknd(d)?' data-kopen="'+d+'"':'')+(nw?' data-ktip="'+kalNoWorkTip(e,d)+'"':(hE&&!hn?' data-ktip="'+esc('Feiertag '+(kalIsVlc(e)?'Valencia':'Bayern')+': '+hE)+'"':''))+'>'+inner+'</div>';});});
  if(co){h+='<div class="ft nm">Sessions</div>'+D.map(function(d){var c=0;TE.forEach(function(e){c+=kalSess(d,e.id).length;});return '<div class="ft'+(kalWknd(d)||kalHol(d,KAL.loc)?' we':'')+'">'+(c||'')+'</div>';}).join('');return h+'</div></div>';}
  h+='<div class="ft nm">Frei (ohne Krank)</div>'+D.map(function(d){if(kalWknd(d)||kalHol(d,KAL.loc)||kalFixDay(d))return '<div class="ft we">·</div>';var o=kalFree(d,KAL.loc,null);return '<div class="ft'+(kalFreeOver(d,o)?' w3':'')+'"'+(o.length?' data-ktip="'+esc(o.map(function(z){return esc(z.e.name)+(z.x.status==='offen'?' (beantragt)':'');}).join(' · '))+'"':'')+'>'+(o.length||'')+'</div>';}).join('');
  return h+'</div></div>';}
function kalMini(o){return '<div class="kal-mc'+(o.due?' due':'')+(o.cls?' '+o.cls:'')+'"'+(o.attrs||'')+(o.tip?' title="'+esc(o.tip)+'"':'')+'>'+(o.grip?'<span class="grip" aria-hidden="true">⋮⋮</span>':'')
  +'<div class="l"><div class="t"><span>'+o.title+'</span>'+(o.tag?'<em class="tg">'+o.tag+'</em>':'')+'</div><div class="s">'+o.sub+'</div></div>'+(o.acts?'<div class="a">'+o.acts+'</div>':'')+'</div>';}
function kalIb(ic,tip,on,pri){return '<button type="button" class="btn btn-sm ib'+(pri?' btn-primary':'')+'" title="'+esc(tip)+'" aria-label="'+esc(tip)+'" onclick="event.stopPropagation();'+on+'"><i class="ti '+ic+'"></i></button>';}
function kalPaneNote(n,txt){return '<div class="kal-note kal-pnote">'+(n>KAL_PANE_MAX?'Die nächsten '+KAL_PANE_MAX+' von '+n+' · alle in den Aufgaben':txt)+'</div>';}
function kalPane(){if(!KAL.pane)return '';if(KAL.pane==='ueb'){var _sv=KAL.cpane;KAL.cpane='ueb';var _r=kalCoachPane();KAL.cpane=_sv;return _r;}var R=kalOpenReqs(),T=kalTasks(),t=today();
  if(KAL.pane==='gen')return '<div class="ph"><i class="ti ti-checklist"></i> Genehmigen<span>'+R.length+'</span></div>'+kalPaneNote(R.length,'Anträge nach Datum, Hinweise im Tooltip.')+(R.length?R.slice(0,KAL_PANE_MAX).map(function(x){var e=kalEmp(x.employeeId),a=kalShowArt(x),tg=kalHintTags(x),tip=String(tg).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    return kalMini({due:tg.indexOf('warn')>=0,title:esc(e.name),tag:tg.indexOf('warn')>=0?'Hinweis':'',tip:tip,sub:KAL_ART[a]+' · '+kalRange(x)+' · '+kalNf(kalAmt(x))+' T',attrs:' onclick="kalGoto(\''+x.von+'\')" style="cursor:pointer"',
      acts:kalCanEdit()?kalIb('ti-x','Ablehnen','kalDecide(\''+x.id+'\',false)')+kalIb('ti-check','Genehmigen','kalDecide(\''+x.id+'\',true)',true):''});}).join(''):'<div class="kal-note" style="margin-top:10px">Nichts offen.</div>');
  var L=T.slice().sort(function(a,b){return a.due.localeCompare(b.due);});
  function card(x){return kalMini({due:x.due<t,grip:kalCanEdit(),cls:'drag',title:esc(x.l),tag:x.due<t?'überfällig':'',sub:'fällig '+kalF(x.due)+' · '+esc(x.src),attrs:kalCanEdit()?' draggable="true" data-ktask="'+x.id+'"':'',acts:kalCanEdit()?kalIb('ti-calendar-plus','Einplanen','kalPlanTask(\''+x.id+'\')'):''});}
  return '<div class="ph"><i class="ti ti-list-check"></i> Planen<span>'+T.length+'</span></div>'+kalPaneNote(T.length,'Auf einen Tag oder eine Uhrzeit ziehen = Session geplant.')+L.slice(0,KAL_PANE_MAX).map(card).join('')+(T.length?'':'<div class="kal-note" style="margin-top:10px">Alles eingeplant.</div>');}
function kalPaneSeg(opts,cur,fn){return '<div class="dsh-seg" role="group">'+opts.map(function(o){return '<button type="button" class="'+(cur===o[0]?'on':'')+'" onclick="'+fn+'(\''+o[0]+'\')">'+o[1]+(o[2]!=null?' <b class="kal-pn'+(o[2]?'':' z')+'">'+o[2]+'</b>':'')+'</button>';}).join('')+'</div>';}
function kalRangeLabel(){var c=KAL.cur;if(KAL.view==='woche'){var m=kalMon(c),f=kalAdd(m,6);return kalP(m).getDate()+'. '+KAL_MON[kalP(m).getMonth()].slice(0,3)+' – '+kalP(f).getDate()+'. '+KAL_MON[kalP(f).getMonth()].slice(0,3)+' '+f.slice(0,4)+' (KW '+kalKw(m)+')';}
  if(KAL.view==='jahr')return c.slice(0,4);return KAL_MON[kalP(c).getMonth()]+' '+c.slice(0,4);}
function kalBar(){var v=[['woche','Woche'],['monat','Monat'],['jahr','Jahr'],['team','Team']],R=kalOpenReqs().length,T=kalTasks().length;
  return '<div class="dsh-seg" role="group" aria-label="Ansicht">'+v.map(function(o){return '<button type="button" class="'+(KAL.view===o[0]?'on':'')+'" onclick="kalSetView(\''+o[0]+'\')">'+o[1]+'</button>';}).join('')+'</div>'
    +'<button class="btn" onclick="kalToday()"><i class="ti ti-calendar"></i> Heute</button><button class="kal-nav" aria-label="Zurück" onclick="kalStep(-1)">‹</button><button class="kal-nav" aria-label="Weiter" onclick="kalStep(1)">›</button><span class="rng">'+kalRangeLabel()+'</span>'
    +'<div class="r">'+kalPaneSeg([['gen','Genehmigen',R],['plan','Planen',T],['ueb','Überfällig',kalCoachPlanned(true).length]],KAL.pane,'kalSetPane')
    +kalFilterBtn()+(view==='kalender'?'':kalPlusBtn())+'</div>';}
// Menü Kalender: Leiste in zwei Spalten wie darunter – links bis zum Kalenderrand, rechts über der Liste die Knöpfe Abwesenheit · Session
function kalBarFx(){return '<div class="kal-bar kal-bar2"><div class="kb-l">'+kalBar()+'</div><div class="kb-r">'+kalPlusBtn()+'</div></div>';}

// Kalender im Menü Coaching: gleiche Ansichten wie im Menü Kalender (Woche/Monat/Jahr/Team), alle Standorte, Coach-Filter der Seite
function kalCoachView(){return ['monat','jahr','team'].indexOf(KAL.cview)>=0?KAL.cview:'woche';}


// Alle geplanten Sessions ab heute (Coach-Filter der Seite gilt), Gruppencoaching als ein Eintrag
function kalCoachPlanned(over){var t=today(),out=[],grp={},cf=typeof coachFilterView!=='undefined'&&coachFilterView&&coachFilterView!=='overview'?coachFilterView:null;
  kalSessEmps().forEach(function(e){(protocols[e.id]||[]).forEach(function(p){if(p.status!=='geplant'||!p.date||(over?p.date>=t:p.date<t))return;if(cf&&p.coachId!==cf)return;if(KAL.chf[String(p.coachId||'')])return;
    if(p.groupId){if(grp[p.groupId]){grp[p.groupId].n++;return;}var o={e:e,p:p,n:1};grp[p.groupId]=o;out.push(o);return;}out.push({e:e,p:p,n:1});});});
  out.sort(function(a,b){return (a.p.date+(a.p.uhrzeit||'99')).localeCompare(b.p.date+(b.p.uhrzeit||'99'));});return over?out.reverse():out;}
// Geplante Session hat nicht stattgefunden: aus Kalender und Aufgaben entfernen (bei Gruppen alle Teilnehmer)
function kalSesNoShow(eid,sid){var p=(protocols[eid]||[]).find(function(q){return String(q.id)===String(sid);});if(!p)return;var e=kalEmp(eid)||{name:''};
  if(!confirm('Session „'+(p.type||'Session')+'“ vom '+kalF(p.date)+(p.groupId?' (Gruppe)':' mit '+e.name)+' als „ausgefallen“ markieren? Sie verschwindet aus Kalender und Aufgaben und zählt in der Auswertung als ausgefallen.'))return;
  var ids=[];Object.keys(protocols).forEach(function(k){protocols[k]=(protocols[k]||[]).filter(function(q){var hit=String(q.id)===String(sid)||(p.groupId&&q.groupId===p.groupId&&q.status==='geplant');if(hit)ids.push(q.id);return !hit;});});
  var nowIso=new Date().toISOString();cancelledSessions.push(Object.assign({empId:eid},p,{status:'ausgefallen'}));
  ids.filter(function(i){return !String(i).startsWith('t');}).forEach(function(i){sb.from('protocols').update({status:'ausgefallen'}).eq('id',i).then(function(r){if(r&&r.error){if(/status|check/i.test(r.error.message||''))alert('Für „Fand nicht statt“ fehlt noch die Datenbank-Erweiterung (34_session_ausgefallen.sql).');else alert('Speichern fehlgeschlagen: '+r.error.message);}});});
  logActivity('session','deleted','Session fand nicht statt: '+(p.type||'Session'),eid,e.name+' · '+kalF(p.date));_kalTC.v=null;kalRerender();}
function kalCoachPane(){var ov=KAL.cpane==='ueb',L=kalCoachPlanned(ov),t=today(),so=kalAdd(kalMon(t),6),mo=kalAdd(t,1);
  function card(o){var d=o.p.date,wd=KAL_WD[kalP(d).getDay()],ago=Math.round((kalP(t)-kalP(d))/86400000),rel=ov?'seit '+ago+' T':d===t?'Heute':d===mo?'Morgen':'',f=String(o.p.focus||'').replace(/[<>"']/g,'');
    return kalMini({due:!!rel,cls:'kal-sopen',attrs:kalSesAttrs(o)+' style="cursor:pointer"',title:esc(o.p.groupId?'Gruppe ('+o.n+')':o.e.name),tag:rel,sub:wd+' '+kalF(d)+(o.p.uhrzeit?' · '+esc(String(o.p.uhrzeit).slice(0,5)):'')+' · '+esc(kalSesArt(o.p.type)||'Session'),
      acts:(ov&&kalCanEdit()?kalIb('ti-calendar-x','Fand nicht statt – entfernen','kalSesNoShow(\''+esc(o.e.id)+'\',\''+esc(o.p.id)+'\')'):'')+(o.p.groupId?'':'<button type="button" class="btn btn-sm ib" title="Termin-E-Mail" aria-label="Termin-E-Mail" data-id="'+esc(o.e.id)+'" data-d="'+esc(d)+'" data-f="'+esc(f)+'" onclick="event.stopPropagation();emailSession(this.dataset.id,this.dataset.d,this.dataset.f)"><i class="ti ti-mail"></i></button>')});}
  if(ov)return '<div class="ph"><i class="ti ti-alert-circle"></i> Überfällig<span>'+L.length+'</span></div>'+kalPaneNote(L.length,'Geplant, nicht erfasst · neueste zuerst · Klick öffnet')
    +(L.length?L.slice(0,KAL_PANE_MAX).map(card).join(''):'<div class="kal-note" style="margin-top:10px">Nichts überfällig.</div>');
  var wk=L.filter(function(o){return o.p.date<=so;}),la=L.filter(function(o){return o.p.date>so;});
  return '<div class="ph"><i class="ti ti-calendar-event"></i> Geplante Sessions<span>'+L.length+'</span></div><div class="kal-note">Klick öffnet die Session.</div>'
    +(wk.length?'<div class="gp">Diese Woche<span>'+wk.length+'</span></div>'+wk.map(card).join(''):'')+(la.length?'<div class="gp">Später<span>'+la.length+'</span></div>'+la.map(card).join(''):'')
    +(L.length?'':'<div class="kal-note" style="margin-top:10px">Keine Sessions geplant.</div>');}
function kalLegend(){return '<div class="kal-legend"><span><i class="kal-sw kal-u"></i>Urlaub</span><span><i class="kal-sw kal-f"></i>Flex Day</span>'+(kalIsViewer()?'<span><i class="kal-sw kal-x"></i>Abwesend</span>':'<span><i class="kal-sw kal-a"></i>Ausgleichstag</span><span><i class="kal-sw kal-fs2"></i>Freistellung</span><span><i class="kal-sw kal-k"></i>Krank</span>')+'<span><i class="kal-sw kal-u kal-op"></i>beantragt</span><span><i class="kal-sw kal-hol"></i>Feiertag / Wochenende</span><span><i class="kal-sw kal-ses"></i>Session geplant</span><span><i class="kal-sw kal-ses past"></i>Session vergangen</span>'
  +(kalCtx()==='coach'?'<span class="kal-note">'+(KAL.view==='jahr'?'Je dunkler, desto mehr Sessions. Klick öffnet den Monat.':KAL.view==='team'?'Klick auf eine Session öffnet sie, Klick auf einen freien Tag plant eine neue für den Mitarbeiter.':'Klick auf eine Session öffnet sie, Klick auf eine freie Zeit plant eine neue.')+'</span>':KAL.view==='jahr'?'<span class="kal-note">Je dunkler, desto mehr fehlen. Koralle-Rand ab 3. Klick öffnet den Monat.</span>':kalCanEdit()?'<span class="kal-note">Einträge und Sessions lassen sich ziehen, Klick auf einen Eintrag bearbeitet ihn.</span>':'')+'</div>';}
function kalReqTable(){var L=kalOpenReqs();if(!L.length)return '<div class="kal-note" style="padding:10px 2px">Keine offenen Anträge.</div>';
  return '<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:22%">Mitarbeiter</th><th style="width:14%">Zeitraum</th><th style="width:11%">Art</th><th class="r" style="width:6%">Tage</th><th>Hinweise</th><th style="width:200px"></th></tr></thead><tbody>'+L.map(function(x){var e=kalEmp(x.employeeId),a=kalShowArt(x);
    return '<tr><td><div style="display:flex;align-items:center;gap:10px"><span class="kal-av">'+kalIni(e.name)+'</span><div>'+esc(e.name)+'<div class="kal-note">eingereicht '+kalF(x.eingereichtAm)+(x.eingereichtVon?' · '+esc(x.eingereichtVon):'')+'</div></div></div></td><td>'+kalRange(x)+'</td><td><span class="kal-tag"><i class="kal-sw '+KAL_CLS[a]+' kal-op"></i>'+KAL_ART[a]+'</span></td><td class="r">'+kalNf(kalAmt(x))+'</td><td><div class="kal-tags" style="margin:0">'+kalHintTags(x)+'</div></td><td class="r">'+(kalCanEdit()?'<div class="kal-acts" style="justify-content:flex-end"><button class="btn btn-sm" onclick="kalDecide(\''+x.id+'\',false)">Ablehnen</button><button class="btn btn-sm btn-primary" onclick="kalDecide(\''+x.id+'\',true)">Genehmigen</button></div>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';}
function kalTaskTable(){var T=kalTasks(),t=today();if(!T.length)return '<div class="kal-note" style="padding:10px 2px">Alles eingeplant.</div>';
  return '<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:18%">Aufgabe</th><th style="width:24%">Mitarbeiter</th><th style="width:12%">Fällig</th><th>Entsteht durch</th><th style="width:140px"></th></tr></thead><tbody>'+T.map(function(x){
    return '<tr '+(kalCanEdit()?'draggable="true" data-ktask="'+x.id+'" style="cursor:grab"':'')+'><td><b>'+esc(x.art==='Performance Review'?'Performance Review':x.art)+'</b></td><td><div style="display:flex;align-items:center;gap:10px"><span class="kal-av">'+kalIni(x.e.name)+'</span>'+esc(x.e.name)+'</div></td><td>'+(x.due<t?'<span class="kal-tag warn">'+kalF(x.due)+'</span>':kalF(x.due))+'</td><td>'+esc(x.src)+'</td><td class="r">'+(kalCanEdit()?'<button class="btn btn-sm btn-primary" style="display:inline-flex" onclick="kalPlanTask(\''+x.id+'\')">Einplanen</button>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';}

// ── Urlaubskonto: Liste, Klick öffnet die Karte darunter ──

function kalPersonCard(eid){var e=kalEmp(eid),k=kalKonto(eid),y=today().slice(0,4),c=kalCfg(e,y),ed=kalCanEdit(),t=today();
  var all=absences.concat(latCanSee()?lateness:[]).filter(function(x){return x.employeeId===eid&&x.status!=='abgelehnt'&&x.status!=='storniert';});
  var fut=all.filter(function(x){return x.bis>=t;}).sort(function(a,b){return a.von<b.von?-1:1;}),past=all.filter(function(x){return x.bis<t;}).sort(function(a,b){return a.von<b.von?1:-1;});
  fut=fut.slice(0,10);past=past.slice(0,10-fut.length);
  var anteil='';
  if(c.monate<12){var gr=[];if(e.startDate&&e.startDate.slice(0,4)===y)gr.push('Eintritt '+fd(e.startDate));if(e.endDate&&e.endDate.slice(0,4)===y)gr.push('Austritt '+fd(e.endDate));
    anteil=(gr.length?gr.join(', ')+': ':'')+'anteilig '+kalNf(c.anspruchJahr)+' ÷ 12 × '+c.monate+' volle Monate = <b>'+kalNf(c.anspruch)+' Tage</b> (aufgerundet auf halbe Tage)';}
  function ent(x){if(x.art==='verspaetung')return '<div class="row"'+(ed?' data-kedit="'+x.id+'"':'')+'><i class="ti ti-clock" style="font-size:12px;color:var(--text2);width:10px"></i>Verspätung<span class="r">'+kalF(x.von)+' · '+(x.minuten||0)+' Min.</span></div>';var a=kalShowArt(x);return '<div class="row"'+(ed&&!x.masked?' data-kedit="'+x.id+'"':'')+'><i class="kal-sw '+KAL_CLS[a]+(x.status==='offen'?' kal-op':'')+'"></i>'+KAL_ART[a]+kalHalb(x)+(x.status==='offen'?' · offen':'')+'<span class="r">'+kalRange(x)+' · '+kalNf(kalAmt(x))+' T</span></div>';}
  var left='<div class="k4"><div class="hi"><small>Frei</small><b>'+kalNf(k.frei)+'</b></div><div><small>Genommen</small><b>'+kalNf(k.tk)+'</b></div><div><small>Geplant</small><b>'+kalNf(k.pl)+'</b></div><div><small>Beantragt</small><b>'+kalNf(k.be)+'</b></div></div>'
    +'<div class="meta"><span>Flex Days</span><span class="kal-fx">'+Array.apply(null,{length:k.flexMax}).map(function(_,i){return '<i class="'+(i<k.flex?'':'u')+'"></i>';}).join('')+'</span><span>'+kalNf(k.flex)+' von '+k.flexMax+' übrig</span>'+(kalIsViewer()?'':'<span>Krank '+kalNf(k.kr)+'</span><span>Ausgleichstage '+kalNf(k.ag)+'</span>'+(function(){var st=latStats(eid,y+'-01-01',y+'-12-31');return '<span>Verspätungen '+st.n+'×'+(st.n?' · '+st.min+' Min.':'')+'</span>';})())+'</div>'
    +(ed?'<h4>Einstellungen '+y+'</h4><div class="set"><span>Urlaubsanspruch (ganzes Jahr)</span><input type="number" step="0.5" id="kalSetAns" value="'+c.anspruchJahr+'"><span>davon Flex Days</span><input type="number" step="0.5" id="kalSetFlex" value="'+c.flex+'"><span>Übertrag aus '+(+y-1)+' (verfällt 31.03.)'+(c.uebVorschlag?'<br><span class="kal-note">Vorschlag: Rest aus '+(+y-1)+', mit Speichern übernehmen</span>':'')+'</span><input type="number" step="0.5" id="kalSetUeb" value="'+c.uebertrag+'"><span>Vor dem Kalender genommen</span><input type="number" step="0.5" id="kalSetVor" value="'+c.vorher+'"></div>'+(anteil?'<div class="kal-note" style="margin-top:8px">'+anteil+'</div>':'')
      +'<div class="kal-acts" style="justify-content:flex-end;margin-top:12px"><button class="btn" onclick="kalOpenForm(\''+eid+'\')">Eintragen</button><button class="btn btn-primary" onclick="kalSaveCfg(\''+eid+'\')">Speichern</button></div>':'');
  var right='<h4 style="margin-top:0">Geplant<span>'+fut.length+'</span></h4>'+(fut.length?fut.map(ent).join(''):'<div class="kal-note" style="padding:6px 0">Nichts geplant.</div>')
    +'<h4>Letzte Einträge<span>'+past.length+'</span></h4>'+(past.length?past.map(ent).join(''):'<div class="kal-note" style="padding:6px 0">Noch keine Einträge.</div>');
  return '<div class="kal-pc"><div>'+left+'</div><div>'+right+'</div></div>';}
function kalVzTz(e){var c=String(e.contract||'');if(/teil/i.test(c))return 'TZ';if(/voll/i.test(c))return 'VZ';return (+e.hours>=38||!e.hours)?'VZ':'TZ';}
function kalRtSet(id,key,val){var r=kalRules(),rt=r.routinen.find(function(x){return x.id===id;});if(!rt)return;rt[key]=val;kalSaveRules(r,'Routine geändert');}
function kalRtEmp(id,eid,on){var r=kalRules(),rt=r.routinen.find(function(x){return x.id===id;});if(!rt)return;rt.empIds=(rt.empIds||[]).filter(function(x){return x!==eid;});if(on)rt.empIds.push(eid);kalSaveRules(r,'Routine geändert');}
function kalRtAdd(){var r=kalRules();r.routinen.push({id:'r'+Date.now(),art:'Weekly',rhythmus:'woche',coachId:currentCoach?currentCoach.id:null,empIds:[]});kalSaveRules(r,'Routine angelegt');}
function kalRtDel(id){if(!confirm('Diese Routine löschen?'))return;var r=kalRules();r.routinen=r.routinen.filter(function(x){return x.id!==id;});kalSaveRules(r,'Routine gelöscht');}
function buildKalRulesHtml(){var R=kalRules(),W=R.weekly,coaches=employees.filter(function(e){return isCoachEmp(e)&&e.active!==false;}),agents=teamTargetList().filter(function(e){return !kalIsVlc(e);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  function seg(path,cur,opts){return '<div class="dsh-seg sm">'+opts.map(function(o){return '<button type="button" class="'+(cur===o[0]?'on':'')+'" onclick="kalRuleSet(\''+path+'\',\''+o[0]+'\')">'+o[1]+'</button>';}).join('')+'</div>';}
  function row(lbl,sub,ctl){return '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid #E4E0D6"><div><div style="font-weight:600">'+lbl+'</div>'+(sub?'<div class="kal-note">'+sub+'</div>':'')+'</div><div>'+ctl+'</div></div>';}
  var aff=agents.map(function(e){return {e:e,why:kalWeeklyReason(e)};}).filter(function(o){return o.why.length;});
  var h='<div class="card"><div class="card-title">Urlaub und Anträge</div><div class="card-sub">Gilt für Hinweise beim Eintragen und Genehmigen</div>'
    +row('Hinweis „andere frei“ ab','So viele andere haben am selben Tag schon frei oder beantragt','<input type="number" min="1" step="1" style="width:80px;text-align:right" value="'+R.freiGrenze+'" onchange="kalRuleSet(\'freiGrenze\',Math.max(1,+this.value||3))">')
    +row('Gezählt wird','Je Standort (alle Teams zusammen) oder nur im eigenen Team',seg('freiBezug',R.freiBezug,[['standort','je Standort'],['team','je Team']]))
    +row('Genehmigten Urlaub per Ziehen verschieben','„Als Antrag“: der Urlaub wird wieder offen und muss neu genehmigt werden',seg('verschieben',R.verschieben,[['direkt','direkt übernehmen'],['antrag','als Antrag']]))+'</div>';
  h+='<div class="card"><div class="card-title">Mitarbeiter fehlt?</div><div class="card-sub">Aufgabe für den zuständigen Coach, wenn ein Agent an einem Arbeitstag ohne Abwesenheit bis zur Uhrzeit keine Aktivität hat</div>'
    +row('Prüfen','',seg('fehltAn',R.fehltAn?'1':'0',[['1','an'],['0','aus']]).replace(/kalRuleSet\('fehltAn','(\d)'\)/g,function(m,v){return "kalRuleSet('fehltAn',"+(v==='1'?'true':'false')+")";}))
    +row('Keine Aktivität bis','Die Leistungsdaten kommen alle 15 Minuten · danach erscheint die Aufgabe','<input type="time" step="900" style="width:120px" value="'+R.fehltZeit+'" onchange="if(/^\\d{2}:\\d{2}$/.test(this.value))kalRuleSet(\'fehltZeit\',this.value)">')+'</div>';
  h+='<div class="card"><div class="card-title">Weekly automatisch vorschlagen</div><div class="card-sub">Unter „Planen“ erscheint ein Weekly nur für Agents, die diese Woche noch keine Session haben und die Bedingung erfüllen</div>'
    +row('Automatisch vorschlagen','',seg('weekly.auto',W.auto?'1':'0',[['1','an'],['0','aus']]).replace(/kalRuleSet\('weekly\.auto','(\d)'\)/g,function(m,v){return "kalRuleSet('weekly.auto',"+(v==='1')+")";}))
    +row('wenn mindestens … KPIs unter Ziel','Geprüft werden CR OEM, CR TW, CR SY, CR MY, CR YES und Opt./Std. gegen die individuellen Ziele','<input type="number" min="1" max="6" step="1" style="width:80px;text-align:right" value="'+W.minKpis+'" onchange="kalRuleSet(\'weekly.minKpis\',Math.max(1,+this.value||2))">')
    +row('Zeitraum für die KPIs','',seg('weekly.zeitraum',W.zeitraum,[['monat','laufender Monat'],['7','letzte 7 Tage']]))
    +row('oder Ø Marge/Opt. unter Ziel','Ø Marge je Opt. im laufenden Monat liegt unter dem Wert aus der Zielvereinbarung',seg('weekly.marge',W.marge?'1':'0',[['1','ja'],['0','nein']]).replace(/kalRuleSet\('weekly\.marge','(\d)'\)/g,function(m,v){return "kalRuleSet('weekly.marge',"+(v==='1')+")";}))
    +'<div style="margin-top:12px;font-size:13px"><b>Aktuell betroffen: '+aff.length+'</b>'+(aff.length?'<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">'+aff.map(function(o){return '<div><span style="font-weight:600">'+esc(o.e.name)+'</span> <span class="kal-note">· '+esc(o.why.join(' · '))+'</span></div>';}).join('')+'</div>':' <span class="kal-note">· alle im Ziel</span>')+'</div></div>';
  h+='<div class="card"><div class="card-title" style="display:flex;align-items:center">Routinen<button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="kalRtAdd()"><i class="ti ti-plus"></i> Routine</button></div><div class="card-sub">Feste Termine je Mitarbeiter, z. B. „Weekly wöchentlich mit Dogoro“. Fehlt der Termin im Zeitraum, erscheint er unter „Planen“.</div>';
  if(!R.routinen.length)h+='<div class="kal-note" style="padding:10px 0">Noch keine Routinen.</div>';
  R.routinen.forEach(function(rt){h+='<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:12px;margin-top:10px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
    +'<select style="width:220px" onchange="kalRtSet(\''+rt.id+'\',\'art\',this.value)">'+KAL_ARTEN.map(function(a){return '<option'+(a===rt.art?' selected':'')+'>'+esc(a)+'</option>';}).join('')+'</select>'
    +'<select style="width:160px" onchange="kalRtSet(\''+rt.id+'\',\'rhythmus\',this.value)">'+Object.keys(KAL_RH).map(function(k){return '<option value="'+k+'"'+(k===rt.rhythmus?' selected':'')+'>'+KAL_RH[k]+'</option>';}).join('')+'</select>'
    +'<select style="width:200px" onchange="kalRtSet(\''+rt.id+'\',\'coachId\',this.value||null)"><option value="">Coach: wer plant</option>'+coaches.map(function(c){return '<option value="'+c.id+'"'+(c.id===rt.coachId?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>'
    +'<span class="kal-note">'+(rt.empIds||[]).length+' Mitarbeiter</span><button class="btn btn-sm btn-danger" style="margin-left:auto" onclick="kalRtDel(\''+rt.id+'\')">Löschen</button></div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px">'+agents.map(function(e){var on=(rt.empIds||[]).indexOf(e.id)>=0;return '<label style="display:inline-flex;align-items:center;gap:6px;margin:0;font-weight:400;cursor:pointer;font-size:13px"><input type="checkbox" style="width:auto;margin:0" '+(on?'checked':'')+' onchange="kalRtEmp(\''+rt.id+'\',\''+e.id+'\',this.checked)">'+esc(e.name)+'</label>';}).join('')+'</div></div>';});
  return h+'</div>';}

// ── Seite ──
function kalRerender(){_kalTC.v=null;if(view==='kalender'||view==='coaching')renderKalender();}
// Coach-Wirksamkeit (Ø KPI-Veränderung 14 Tage vor/nach Coachings mit Ziel-KPI) – im Kalender zum Aufklappen


// ── Gemeinsamer Aufbau für Karten unter dem Kalender: Diagramm · 6 Kacheln · Tabelle im selben 6er-Raster ──
function kxBars(cols,legend,note){var mx=Math.max.apply(null,cols.map(function(c){return c.parts.reduce(function(a,p){return a+p[0];},0);}).concat([1])),H=120;
  return '<div class="kx-chart"><div class="kx-ch"><b>'+legend.title+'</b>'+(note?'<span class="kal-note">'+note+'</span>':'')+'<span class="kx-lg">'+legend.items.map(function(it){return '<span><i style="'+it[1]+'"></i>'+it[0]+'</span>';}).join('')+'</span></div>'
    +'<div class="kx-bars" style="grid-template-columns:repeat('+cols.length+',minmax(0,1fr))">'+cols.map(function(c){return '<div class="kx-col"><div class="kx-top">'+(c.top||'')+'</div><div class="kx-stack" style="height:'+H+'px">'
      +c.parts.slice().reverse().map(function(p){return p[0]>0?'<div style="height:'+(p[0]/mx*H).toFixed(0)+'px;'+p[1]+'" title="'+esc(p[2]+': '+kalNf(p[0]))+'"></div>':'';}).join('')+'</div><div class="kx-lab'+(c.cur?' cur':'')+'">'+c.lab+'</div></div>';}).join('')+'</div></div>';}
function kxTiles(T){return '<div class="kx-g kx-tiles">'+T.map(function(t,i){return '<div class="kx-tile'+(i===0?' hi':'')+'"><div class="k">'+t[0]+'</div><div class="v">'+t[1]+'</div><div class="s">'+(t[2]||'&nbsp;')+'</div></div>';}).join('')+'</div>';}
function kxHead(H){return '<div class="kx-g kx-th">'+H.map(function(h){return '<div>'+h+'</div>';}).join('')+'</div>';}
function kxRow(cells,attrs){return '<div class="kx-g kx-tr"'+(attrs||'')+'>'+cells.map(function(c){return '<div>'+c+'</div>';}).join('')+'</div>';}
// ── Sessions und Wirkung (ersetzt „Letzte Sessions“ und „Coach-Wirksamkeit“) ──
function kalSwRange(){var t=today();return KAL.swr==='woche'?[kalMon(t),t]:KAL.swr==='90'?[kalAdd(t,-89),t]:[t.slice(0,7)+'-01',t];}
function kalSwData(from,to){var L=[];kalSessEmps().forEach(function(e){var P=performance[e.id]||[];(protocols[e.id]||[]).forEach(function(p){if(p.status==='geplant'||!p.date||p.date<from||p.date>to)return;if(KAL.chf[String(p.coachId||'')])return;
  var im=p.focusMetric?perfImpact(e,P,p.date,p.focusMetric):null;L.push({e:e,p:p,im:im});});});return L.sort(function(a,b){return (b.p.date+(b.p.uhrzeit||'')).localeCompare(a.p.date+(a.p.uhrzeit||''));});}
function kalSwHtml(){var r=kalSwRange(),L=kalSwData(r[0],r[1]),ok=L.filter(function(x){return x.im&&x.im.state==='ok';}),ja=ok.filter(function(x){return x.im.verdict==='ja';}).length,wait=L.filter(function(x){return x.im&&x.im.state==='wait';}).length,noK=L.filter(function(x){return !x.p.focusMetric;}).length;
  var cr=ok.filter(function(x){return /^cr/i.test(x.p.focusMetric);}),avg=cr.length?cr.reduce(function(a,x){return a+x.im.delta;},0)/cr.length:null,t=today();
  var plan=0;kalSessEmps().forEach(function(e){(protocols[e.id]||[]).forEach(function(p){if(p.status==='geplant'&&p.date>=t&&p.date<=kalAdd(t,30)&&!KAL.chf[String(p.coachId||'')])plan++;});});
  // Diagramm: 12 Wochen
  var m0=kalMon(t),cols=[];for(var w=11;w>=0;w--){var a=kalAdd(m0,-7*w),b=kalAdd(a,6),W=kalSwData(a,b),c={ja:0,neu:0,nein:0,wt:0};W.forEach(function(x){if(!x.im)return;if(x.im.state==='wait')c.wt++;else if(x.im.state==='ok')c[x.im.verdict==='ja'?'ja':x.im.verdict==='nein'?'nein':'neu']++;});var d=c.ja+c.neu+c.nein;
    cols.push({lab:'KW '+kalKw(a),cur:w===0,top:d?Math.round(c.ja/d*100)+' %':'',parts:[[c.ja,'background:#3a3833','hat geholfen'],[c.neu,'background:#D8D2C6','keine Veränderung'],[c.nein,'background:#F08566','verschlechtert'],[c.wt,'border:1.5px dashed #C9B9A3;box-sizing:border-box;background:transparent','wartet']]});}
  var h=kxBars(cols,{title:'Wirkung je Woche',items:[['hat geholfen','background:#3a3833'],['keine Veränderung','background:#D8D2C6'],['verschlechtert','background:#F08566'],['wartet','border:1.5px dashed #C9B9A3;box-sizing:border-box']]},'Zahl über dem Balken = Anteil „hat geholfen“');
  h+=kxTiles([['Sessions',L.length,(KAL.swr==='woche'?'diese Woche':KAL.swr==='90'?'letzte 90 Tage':'im '+KAL_MON[+t.slice(5,7)-1])+' · '+plan+' geplant'],['Hat geholfen',ok.length?Math.round(ja/ok.length*100)+' %':'–',ja+' von '+ok.length+' mit Ergebnis'],['Ø Veränderung',avg==null?'–':(avg>0?'+':'')+kalNf(Math.round(avg*10)/10),'%-Punkte, Ziel-KPI CR'],['Wartet',wait,'noch keine 3 Arbeitstage danach'],['Ohne Ziel-KPI',noK,'ohne Result gewählt'],['Überfällig',kalCoachPlanned(true).length,cancelledSessions.filter(function(c){var r=kalSwRange();return c.date>=r[0]&&c.date<=r[1]&&!KAL.chf[String(c.coachId||'')];}).length+' ausgefallen im Zeitraum']]);
  h+=kxHead(['Datum','Mitarbeiter','Art','Coach','Ziel-KPI','Ergebnis']);
  var show=KAL.swAll?L:L.slice(0,15);
  h+=show.map(function(x){var p=x.p,im=x.im,res;
    if(!p.focusMetric)res='<span class="kx-r neu">kein Ziel-KPI</span>';
    else if(!im||im.state==='none')res='<span class="kx-r neu">keine Daten</span>';
    else if(im.state==='wait')res='<span class="kx-r w">wartet · '+im.n+'/'+IMPACT_DAYS+'</span>';
    else res='<span class="kx-r '+(im.verdict==='ja'?'ja':im.verdict==='nein'?'nein':'neu')+'">'+impactNum(p.focusMetric,im.raw)+' · '+impactWord(im.verdict)+'</span><small>'+kalNf(Math.round(im.before*10)/10)+' → '+kalNf(Math.round(im.after*10)/10)+'</small>';
    var tip=['<b>'+esc(x.e.name)+' · '+esc(kalSesArt(p.type)||'Session')+'</b>',p.start?'Start: '+esc(p.start):'',p.stop?'Stop: '+esc(p.stop):'',p.cont?'Continue: '+esc(p.cont):'',(p.notes||p.note)?'Notiz: '+esc(p.notes||p.note):''].filter(Boolean).join('<br>');
    return kxRow([kalF(p.date)+(p.uhrzeit?'<small>'+esc(String(p.uhrzeit).slice(0,5))+'</small>':''),'<b>'+esc(x.e.name)+'</b>',esc(kalSesArt(p.type)||'Session'),esc(p.coachId?kalCoachName(p.coachId):'–'),p.focusMetric?esc(focusMetricLabel(p.focusMetric)):'–',res],' style="cursor:pointer" onclick="selectEmp(\''+x.e.id+'\')" data-ktip="'+esc(tip)+'"');}).join('');
  if(!L.length)h+='<div class="kal-note" style="padding:12px 14px">Keine Sessions in diesem Zeitraum.</div>';
  if(L.length>15)h+='<div style="padding:10px 14px"><button class="btn btn-sm" onclick="KAL.swAll=!KAL.swAll;kalRerender()">'+(KAL.swAll?'weniger anzeigen':'alle '+L.length+' anzeigen')+'</button></div>';
  return h;}
// ── Urlaubskonto im selben Aufbau ──
function kalUkHtml(){var y=today().slice(0,4),E=kalPeople().slice().sort(function(a,b){return KAL.sort==='name'?a.name.localeCompare(b.name):kalKonto(b.id).frei-kalKonto(a.id).frei;}),vw=kalIsViewer(),ls=latCanSee();
  var K=E.map(function(e){return {e:e,k:kalKonto(e.id)};}),sum=function(f){return K.reduce(function(a,x){return a+(+x.k[f]||0);},0);};
  // Diagramm: Abwesenheitstage je Monat nach Art
  var M=[];for(var i=0;i<12;i++)M.push({u:0,f:0,a:0,fr:0,k:0});var ids={};E.forEach(function(e){ids[e.id]=1;});
  absences.forEach(function(x){if(!ids[x.employeeId]||x.status==='abgelehnt'||x.status==='storniert'||x.bis<y+'-01-01'||x.von>y+'-12-31')return;var a=kalShowArt(x),q=x.halb?0.5:1;kalDays(x).forEach(function(d){if(d.slice(0,4)!==y)return;var m=M[+d.slice(5,7)-1];if(a==='urlaub')m.u+=q;else if(a==='flex')m.f+=q;else if(a==='ausgleich')m.a+=q;else if(a==='freistellung')m.fr+=q;else m.k+=q;});});
  var cm=+today().slice(5,7)-1;
  var h=kxBars(M.map(function(m,i){var tot=m.u+m.f+m.a+m.fr+m.k;return {lab:KAL_MON[i].slice(0,3),cur:i===cm,top:tot?kalNf(tot)+' T':'',parts:[[m.u,'background:#CDBB9E','Urlaub'],[m.f,'background:#E6D9C2','Flex Day'],[m.a,'background:#9C8E7C','Ausgleichstag'],[m.fr,'background:#D8D2C6','Freistellung'],[m.k,'background:#5a4f45',vw?'Abwesend':'Krank']]};}),
    {title:'Abwesenheit je Monat '+y,items:[['Urlaub','background:#CDBB9E'],['Flex Day','background:#E6D9C2'],['Ausgleichstag','background:#9C8E7C'],['Freistellung','background:#D8D2C6'],[vw?'Abwesend':'Krank','background:#5a4f45']]},'Tage im Team');
  var lat=0,latMin=0;if(ls)E.forEach(function(e){var st=latStats(e.id,y+'-01-01',y+'-12-31');lat+=st.n;latMin+=st.min;});
  var anspr=K.reduce(function(a,x){return a+x.k.ans+x.k.uebEff;},0),req=kalOpenReqs().filter(function(x){return ids[x.employeeId];});
  h+=kxTiles([['Resturlaub',kalNf(sum('frei')),'Tage frei im Team · Ø '+kalNf(E.length?Math.round(sum('frei')/E.length*10)/10:0)+' je MA'],['Genommen',kalNf(sum('tk')),'von '+kalNf(anspr)+' Tagen · '+kalNf(sum('pl'))+' geplant'],['Offene Anträge',req.length,kalNf(req.reduce(function(a,x){return a+kalAmt(x);},0))+' Tage beantragt'],['Flex Days',kalNf(sum('flex')),'übrig von '+K.reduce(function(a,x){return a+x.k.flexMax;},0)],
    vw?['Mitarbeiter',E.length,'im Filter']:['Krank',kalNf(sum('kr')),'Tage in '+y],ls?['Verspätungen',lat+'×',latMin+' Min. in '+y]:['Ausgleichstage',vw?'–':kalNf(sum('ag')),'in '+y]]);
  h+=kxHead(['Mitarbeiter','Urlaub '+y,'Flex Days',vw?'–':'Krank',vw?'–':'Ausgleich',ls?'Verspätung':'Hinweise']);
  h+=K.map(function(x){var e=x.e,k=x.k,T=k.ans+k.uebEff||1,f=kalFlags(e.id),op=KAL.open===e.id;
    function seg(v,c){return v>0?'<i style="width:'+(v/T*100)+'%;background:'+c+'"></i>':'';}
    var bar='<span class="kx-ub" data-ktip="Genommen '+kalNf(k.tk)+' · geplant '+kalNf(k.pl)+' · beantragt '+kalNf(k.be)+' · frei '+kalNf(k.frei)+'">'+seg(k.tk,'#8A7F72')+seg(k.pl,'#CDBB9E')+seg(k.be,'#E6D9C2')+'</span><small><b style="color:var(--text)">'+kalNf(k.frei)+'</b> frei von '+kalNf(T)+'</small>';
    var st=ls?latStats(e.id,y+'-01-01',y+'-12-31'):null;
    return kxRow(['<b>'+esc(e.name)+'</b><small>'+(f.length?String(f.join(' ')).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim():esc(kalRoleLbl(e))+' · '+kalVzTz(e))+'</small>',bar,'<span class="kal-fx">'+Array.apply(null,{length:k.flexMax}).map(function(_,i){return '<i class="'+(i<k.flex?'':'u')+'"></i>';}).join('')+'</span><small>'+kalNf(k.flex)+' von '+k.flexMax+'</small>',
      vw?'–':kalNf(k.kr)+' T',vw?'–':kalNf(k.ag)+' T',ls?(st.n?st.n+'×<small>'+st.min+' Min.</small>':'0'):(f.length?f.join(''):'–')],' style="cursor:pointer" onclick="kalToggleAcc(\''+e.id+'\')"')+(op?'<div class="kal-body" style="padding:10px 14px">'+kalPersonCard(e.id)+'</div>':'');}).join('');
  return h;}
// Aufklapp-Karte unter dem Kalender (wie „Neue Session“: + / –)
function kalAccCard(k,ic,title,sub,right,body){var op=!!KAL[k];return '<div class="card" style="padding:14px 16px"><div class="at-newh" style="cursor:pointer" onclick="KAL.'+k+'=!KAL.'+k+';kalRerender()"><span class="at-pl"><i class="ti '+(op?'ti-minus':'ti-plus')+'"></i></span><b>'+title+'</b><span class="kal-note" style="margin-left:8px">'+sub+'</span><span style="margin-left:auto;display:inline-flex;gap:8px;align-items:center">'+(op?right:'')+'<span class="kal-note">'+(op?'zuklappen':'zum Aufklappen klicken')+'</span></span></div>'+(op?'<div style="margin-top:12px">'+body+'</div>':'')+'</div>';}



function renderKalender(){var ma=document.getElementById('mainArea');if(!ma)return;if(!KAL.cur)KAL.cur=kalRef();_kalOnIdx=null;if(KAL.pane==='auto'||!KAL.pane)KAL.pane=kalCoachPlanned(true).length?'ueb':'gen';
  var vw=KAL.view==='woche'?kalVWeek():KAL.view==='jahr'?kalVYear():KAL.view==='team'?kalVTeam():kalVMonth();
  var h='<div class="content">'+buildGlobalBannerHtml(gbVisible());
  h+='<div class="card">'+kalBarFx()+'<div class="kal-cw fx'+(KAL.pane?'':' nopane')+'"><div style="min-width:0">'+vw+'</div><aside class="kal-pane">'+kalPane()+'</aside></div>'+kalLegend()+'</div>';
  if(false)h+='<div class="card"><div class="card-title">'+(KAL.low==='req'?'Offene Anträge':'Zu planen')+'<span class="kal-note" style="font-weight:400;margin-left:6px">'+(KAL.low==='req'?'alle Hinweise auf einen Blick':'Zeile in den Kalender ziehen oder „Einplanen“')+'</span><span class="dsh-tr"><span class="dsh-seg"><button type="button" class="'+(KAL.low==='req'?'on':'')+'" onclick="KAL.low=\'req\';kalRerender()">Anträge · '+kalOpenReqs().length+'</button><button type="button" class="'+(KAL.low==='plan'?'on':'')+'" onclick="KAL.low=\'plan\';kalRerender()">Planen · '+kalTasks().length+'</button></span></span></div>'+(KAL.low==='req'?kalReqTable():kalTaskTable())+'</div>';
  h+=kalAccCard('accS','ti-chart-bar','Sessions und Wirkung',(kalSwData(kalSwRange()[0],kalSwRange()[1]).length)+' Sessions · Ergebnis je Session (Ø 3 Arbeitstage vor gegen nach)',
    '<span class="dsh-seg" onclick="event.stopPropagation()">'+[['woche','Woche'],['monat','Monat'],['90','90 Tage']].map(function(o){return '<button type="button" class="'+(KAL.swr===o[0]?'on':'')+'" onclick="KAL.swr=\''+o[0]+'\';kalRerender()">'+o[1]+'</button>';}).join('')+'</span>',KAL.accS?kalSwHtml():'');
  h+=kalAccCard('accK','ti-beach','Urlaubskonto',kalPeople().length+' Personen · Frei, Flex Days, Krank'+(latCanSee()?', Verspätung':''),
    '<span class="dsh-seg" onclick="event.stopPropagation()"><button type="button" class="'+(KAL.sort==='rest'?'on':'')+'" onclick="KAL.sort=\'rest\';kalRerender()">Resturlaub</button><button type="button" class="'+(KAL.sort==='name'?'on':'')+'" onclick="KAL.sort=\'name\';kalRerender()">Name</button></span>',KAL.accK?kalUkHtml():'');
  h+='</div>';
  var oc=ma.querySelector('.content'),st=oc?oc.scrollTop:0;ma.innerHTML=h;var nc=ma.querySelector('.content');if(nc&&st)nc.scrollTop=st;
  if(document.getElementById('kalFormModal')&&!document.getElementById('kalFormModal').classList.contains('hidden'))kalDrawForm();}
function selectKalender(){view='kalender';bannerViewMode='kalender';resetBannerRotation();renderSidebar();renderMain();}
function kalSetView(v){if(kalCtx()==='coach')KAL.cview=v;else KAL.view=v;kalRerender();}
function kalSetPane(p){KAL.pane=p;kalRerender();}

function kalToday(){KAL.cur=kalRef();kalRerender();}
function kalStep(n){var d=kalP(KAL.cur),vw=kalCtx()==='coach'?kalCoachView():KAL.view;if(vw==='woche')KAL.cur=kalAdd(KAL.cur,7*n);else if(vw==='jahr')KAL.cur=kalI(new Date(d.getFullYear()+n,0,1));else KAL.cur=kalI(new Date(d.getFullYear(),d.getMonth()+n,1));kalRerender();}
function kalGoto(d){KAL.cur=d;KAL.view='monat';kalRerender();}
function kalToggleAcc(id){KAL.open=KAL.open===id?null:id;kalRerender();}

// ── Speichern ──
function kalRowFrom(x){var r=kalRowBase(x);if(x.halb)r.halb_teil=x.halbTeil||'vm';return r;}
function kalRowBase(x){var r={employee_id:x.employeeId,art:x.art,von:x.von,bis:x.bis,halb:!!x.halb,status:x.status,verschoben_von:x.verschobenVon||null,notiz:x.notiz||null,eingereicht_von:x.eingereichtVon||null,entschieden_von:x.entschiedenVon||null,entschieden_am:x.entschiedenAm||null};if(x.art==='verspaetung')r.minuten=x.minuten||null;return r;}
function kalDecide(id,ok){if(!kalCanEdit())return;var x=absences.find(function(a){return String(a.id)===String(id);});if(!x)return;
  var art=x.art;if(ok&&art==='urlaub'&&!x.verschobenVon&&kalVorlauf(x)<15)art='flex';
  var upd={status:ok?'genehmigt':'abgelehnt',art:art,entschieden_von:kalActor(),entschieden_am:new Date().toISOString()};
  x.status=upd.status;x.art=art;x.entschiedenVon=upd.entschieden_von;x.entschiedenAm=upd.entschieden_am;kalRerender();
  var e=kalEmp(x.employeeId);logActivity('kalender',ok?'approved':'rejected',(ok?'Antrag genehmigt: ':'Antrag abgelehnt: ')+KAL_ART[art],x.employeeId,(e?e.name:'')+' · '+kalRange(x));
  sb.from('absences').update(upd).eq('id',x.id).then(function(res){if(res&&res.error)alert(kalErrText(res));});}
function kalSaveCfg(eid){var e=kalEmp(eid);if(!e||!kalCanEdit())return;var y=today().slice(0,4);
  function num(id){var v=document.getElementById(id);v=v?String(v.value).replace(',','.'):'';return v===''?null:+v;}
  var u=JSON.parse(JSON.stringify(e.urlaub||{}));u[y]={anspruch:num('kalSetAns'),flex:num('kalSetFlex'),uebertrag:num('kalSetUeb'),vorher_genommen:num('kalSetVor')};
  Object.keys(u[y]).forEach(function(k){if(u[y][k]==null)delete u[y][k];});e.urlaub=u;kalRerender();
  logActivity('kalender','updated','Urlaubskonto geändert',eid,e.name+' · '+y);
  sb.from('employees').update({urlaub:u}).eq('id',eid).then(function(res){if(res&&res.error)alert(/urlaub/i.test(res.error.message||'')?'Die Spalte „urlaub“ fehlt noch. Bitte 20_kalender_abwesenheiten.sql ausführen.':'Speichern fehlgeschlagen: '+res.error.message);});}


// ── Verspätungen ──
function latCanSee(){return currentUserRole==='admin'||(!kalIsViewer()&&permFor('kalLate')!=='-');}
function latOn(eid,d){return lateness.filter(function(x){return String(x.employeeId)===String(eid)&&x.von===d;});}
function latMinOn(eid,d){return latOn(eid,d).reduce(function(s,x){return s+(+x.minuten||0);},0);}
function latStats(eid,from,to){var L=lateness.filter(function(x){return String(x.employeeId)===String(eid)&&x.von>=from&&x.von<=to;});return {n:L.length,min:L.reduce(function(s,x){return s+(+x.minuten||0);},0)};}
function latHm(h){var m=Math.round(h*60);return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');}
function latChecks(e,F){var tile=function(l,v,sub,c){return '<div class="ab-ck '+(c||'')+'"><small>'+l+'</small><b>'+v+'</b><em>'+sub+'</em></div>';};
  if(!F.von||!e)return '<div class="ab-ck4">'+tile('Dieser Eintrag','–','Datum wählen','off')+tile('Arbeitszeit','–','','off')+tile('Zählt als','Verspätung','kein Urlaub, kein Antrag')+tile('Dieses Jahr','–','','off')+'</div>';
  var m=+F.minuten||0,soll=(function(){var wh=workHoursPlanFor(e,F.von),dv=wh[WEEKDAY_KEYS[new Date(F.von+'T00:00:00').getDay()]]||DEFAULT_WORK_HOURS[WEEKDAY_KEYS[new Date(F.von+'T00:00:00').getDay()]];if(!dv||!dv.von||!dv.bis)return 0;return Math.max(0,(timeStrToMin(dv.bis)-timeStrToMin(dv.von)-(dv.pause||0))/60);})();
  var other=latOn(e.id,F.von).filter(function(x){return String(x.id)!==String(F.id);}).reduce(function(s,x){return s+(+x.minuten||0);},0),ist=Math.max(0,soll-(m+other)/60);
  var y=F.von.slice(0,4),st=latStats(e.id,y+'-01-01',y+'-12-31'),n=st.n+(F.id?0:1),tot=st.min-(F.id?(+((lateness.find(function(x){return String(x.id)===String(F.id);})||{}).minuten)||0):0)+m;
  return '<div class="ab-ck4">'+tile('Dieser Eintrag',m?m+' Min.':'–',kalF(F.von))+tile('Arbeitszeit',soll?latHm(soll)+' Std.':'–',soll?'zählt voll · Zeit wird nachgeholt':'an dem Tag kein Arbeitstag',soll?'':'w')
    +tile('Zählt als','Verspätung','kein Urlaub, kein Antrag')+tile('Dieses Jahr',n+'×',(F.id?'':'danach · ')+tot+' Min. gesamt')+'</div>';}
function absObj(c){return c==='kf'?KF:AB.f;}
function absRedraw(c){if(c==='kf')kalDrawForm();else abRender();}
function absSet(c,k,v){var F=absObj(c);if(!F)return;F[k]=v;
  if(k==='art'&&(v==='krank'||v==='verspaetung'))F.status='genehmigt';
  if(k==='art'&&v==='verspaetung'){F.halb=false;F.bis=F.von;if(!F.minuten)F.minuten=15;}
  if(F.art==='verspaetung'&&k==='von')F.bis=F.von;
  if(k==='halb'&&v)F.bis=F.von;
  if(k==='von'){if(!F.bis||F.bis<F.von||F.halb)F.bis=F.von;}
  if(c==='ab'&&(k==='von'||k==='bis'))AB.fOpen=true;
  absRedraw(c);}
function absSeg(c,k,arr,cur){return '<span class="dsh-seg">'+arr.map(function(o){return '<button type="button" class="'+(cur===o[0]?'on':'')+'" onclick="absSet(\''+c+'\',\''+k+'\','+(typeof o[0]==='boolean'||typeof o[0]==='number'?o[0]:'\''+o[0]+'\'')+')">'+o[1]+'</button>';}).join('')+'</span>';}
function absFormHtml(c,e,F,ev,empHtml){var isU=F.art==='urlaub',vl=F.von&&e?kalWdBetween(e,F.eingereichtAm||today(),F.von):0;
  var isV=F.art==='verspaetung',arts=[['urlaub','Urlaub'],['ausgleich','Ausgleichstag'],['freistellung','Freistellung'],['krank','Krank']];if(latCanSee()||isV)arts.push(['verspaetung','Verspätung']);
  var h='<div style="'+ABS_TILE+'"><div style="'+ABS_TH+'">Was</div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    +absSeg(c,'art',arts,F.art)
    +(isV?'':'<span style="margin-left:auto;display:inline-flex;gap:8px;flex-wrap:wrap">'+absSeg(c,'halb',[[false,'Ganzer Tag'],[true,'Halber Tag']],!!F.halb)
    +(F.halb?absSeg(c,'halbTeil',[['vm','Vormittag'],['nm','Nachmittag']],F.halbTeil||'vm'):'')+'</span>')+'</div></div>';
  if(isV){
    h+='<div style="'+ABS_TILE+'"><div style="'+ABS_TH+'">Wer &amp; Wann</div><div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.5fr);gap:8px;align-items:start">'
      +'<div style="min-width:0"><label>Mitarbeiter</label>'+empHtml+'</div>'
      +'<div><label>Datum</label><input type="date" value="'+(F.von||'')+'" onchange="absSet(\''+c+'\',\'von\',this.value)"></div>'
      +'<div><label>Minuten zu spät</label><div style="display:flex;gap:6px;align-items:center">'+absSeg(c,'minuten',[[5,'5'],[15,'15'],[30,'30'],[60,'60']],+F.minuten||0)
      +'<input type="number" min="1" max="600" value="'+(F.minuten||'')+'" style="width:80px" onchange="absSet(\''+c+'\',\'minuten\',+this.value||null)" aria-label="Minuten"></div></div></div>'
      +'<input type="text" placeholder="Grund / Notiz (optional), z. B. Bahn ausgefallen" value="'+esc(F.notiz||'')+'" oninput="absObj(\''+c+'\').notiz=this.value" style="margin-top:8px"></div>';
    h+='<div style="'+ABS_TILE+';margin-bottom:0"><div style="'+ABS_TH+'">Prüfung</div>'+latChecks(e,F)+(F.von&&e&&!kalWorkday(e,F.von)?'<div class="kal-hint err" style="margin-top:8px">An diesem Tag arbeitet '+esc(kalFirst(e.name))+' laut Arbeitszeit nicht.</div>':'')+'</div>';
    return h;}
  h+='<div style="'+ABS_TILE+'"><div style="'+ABS_TH+'">Wer &amp; Wann</div><div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) auto;gap:8px;align-items:start">'
    +'<div style="min-width:0"><label>Mitarbeiter</label>'+empHtml+'</div>'
    +'<div><label>Von</label><input type="date" value="'+(F.von||'')+'" onchange="absSet(\''+c+'\',\'von\',this.value)"></div>'
    +'<div><label>Bis</label><input type="date" value="'+(F.halb?(F.von||''):(F.bis||''))+'"'+(F.halb?' disabled':'')+' onchange="absSet(\''+c+'\',\'bis\',this.value)"></div>'
    +'<div style="'+(F.art==='krank'?'visibility:hidden':'')+'"><label>Status</label>'+absSeg(c,'status',[['genehmigt','Genehmigt'],['offen','Antrag']],F.status)+'</div></div>'
    +'<input type="text" placeholder="Notiz (optional)" value="'+esc(F.notiz||'')+'" oninput="absObj(\''+c+'\').notiz=this.value" style="margin-top:8px"></div>';
  var hints=(F.von?(ev.H||[]):[]).filter(function(x){return x.t!=='info'||/24\.12|Verschoben/.test(x.h);});
  var flexRule=isU&&F.von&&!F.verschobenVon&&vl<15;
  h+='<div style="'+ABS_TILE+';margin-bottom:0"><div style="'+ABS_TH+'">Prüfung</div>'+(e?abChecks(e,F,ev):'')
    +hints.map(function(x){return '<div class="kal-hint '+x.t+'" style="margin-top:8px">'+x.h+'</div>';}).join('')
    +(flexRule?'<label style="display:inline-flex;align-items:center;gap:6px;margin:8px 0 0;cursor:pointer;font-weight:400"><input type="checkbox" style="width:auto;margin:0"'+(F.normal?' checked':'')+' onchange="absSet(\''+c+'\',\'normal\',this.checked)"> trotzdem als normalen Urlaub zählen</label>':'')
    +'</div>';
  return h;}

function kalEnsureModal(){if(document.getElementById('kalFormModal'))return;var d=document.createElement('div');d.className='modal-ov hidden';d.id='kalFormModal';
  var rb=function(id,ic,t){return '<button class="rl-btn" type="button" aria-label="'+t+'" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\''+id+'\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti '+ic+'"></i><span class="rl-tip" style="left:48px">'+t+'</span></button>';};
  d.innerHTML='<div class="modal" style="padding:0;display:flex;flex-direction:column;background:#EEEDE9;overflow:hidden">'
   +'<div style="display:flex;align-items:center;padding:14px 16px 6px"><div style="min-width:0"><div style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase" id="kalFormTitle">Abwesenheit eintragen</div><div id="kalFormSub" style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div></div><button class="btn" type="button" aria-label="Schließen" style="margin-left:auto;width:36px;height:36px;padding:0;justify-content:center" onclick="kalCloseForm()"><i class="ti ti-x"></i></button></div>'
   +'<div style="display:flex;min-height:0;flex:1">'
   +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0"><div id="kalFormBody" style="flex:1;overflow-y:auto;padding:6px 18px 12px 18px"></div>'
   +'<div style="padding:4px 18px 14px 18px"><div id="kalFormFoot" style="display:flex;justify-content:flex-end;gap:8px;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:12px;padding:8px"></div></div></div></div></div>';
  d.addEventListener('mousedown',function(ev){if(ev.target===d)kalCloseForm();});document.body.appendChild(d);}
function kalOpenForm(eid,day,editId){if(!kalCanEdit())return;kalEnsureModal();
  if(editId){var x=absences.find(function(a){return String(a.id)===String(editId);})||lateness.find(function(a){return String(a.id)===String(editId);});if(!x)return;KF={id:x.id,employeeId:x.employeeId,minuten:x.minuten,art:x.art==='flex'?'urlaub':x.art,wasFlex:x.art==='flex',normal:x.art==='urlaub'&&x.status==='genehmigt',von:x.von,bis:x.bis,halb:x.halb,halbTeil:x.halbTeil||'vm',status:x.status,notiz:x.notiz,eingereichtAm:x.eingereichtAm,verschobenVon:x.verschobenVon};}
  else{var L=kalPeople();KF={id:null,employeeId:eid||(KF&&KF.employeeId&&L.some(function(e){return e.id===KF.employeeId;})?KF.employeeId:(L[0]&&L[0].id)),art:'urlaub',von:day||today(),bis:day||today(),halb:false,halbTeil:'vm',status:'genehmigt',notiz:'',normal:false};}
  document.getElementById('kalFormTitle').textContent=KF.id?'Eintrag bearbeiten':'Abwesenheit eintragen';
  document.getElementById('kalFormModal').classList.remove('hidden');kalDrawForm();}
function kalCloseForm(){var m=document.getElementById('kalFormModal');if(m)m.classList.add('hidden');}
function kalDrawForm(){var b=document.getElementById('kalFormBody');if(!b||!KF)return;var L=kalPeople(KF.employeeId&&kalIsVlc(kalEmp(KF.employeeId))?'VLC':KAL.loc);if(L.every(function(e){return e.id!==KF.employeeId;})&&kalEmp(KF.employeeId))L=L.concat([kalEmp(KF.employeeId)]);
  var ev=kalEval(KF),fe=kalEmp(KF.employeeId),sub=document.getElementById('kalFormSub');if(sub)sub.textContent=fe?fe.name+(fe.role?' · '+fe.role:''):'—';
  var empSel='<select onchange="absSet(\'kf\',\'employeeId\',this.value)">'+L.map(function(e){return '<option value="'+e.id+'"'+(e.id===KF.employeeId?' selected':'')+'>'+esc(e.name)+'</option>';}).join('')+'</select>';
  var h=absFormHtml('kf',fe,KF,ev,empSel);
  var ft='<div style="display:flex;gap:8px;width:100%;justify-content:flex-end">'+(KF.id?'<button class="btn btn-danger" style="margin-right:auto" onclick="kalDelete()">Löschen</button>':'')+'<button class="btn" onclick="kalCloseForm()">Abbrechen</button><button class="btn btn-primary" onclick="kalSaveForm()"'+(ev.n?'':' disabled')+'>'+(KF.id?'Speichern':'Eintragen')+'</button></div>';
  b.innerHTML=h;var fo=document.getElementById('kalFormFoot');if(fo)fo.innerHTML=ft;}
function latSaveForm(){var e=kalEmp(KF.employeeId),x={id:KF.id,employeeId:KF.employeeId,art:'verspaetung',von:KF.von,bis:KF.von,halb:false,halbTeil:null,status:'genehmigt',notiz:KF.notiz||'',minuten:+KF.minuten,verschobenVon:null,eingereichtAm:today(),eingereichtVon:kalActor(),entschiedenVon:kalActor(),entschiedenAm:new Date().toISOString()};
  var row=kalRowFrom(x);kalCloseForm();
  if(KF.id){var i=lateness.findIndex(function(a){return String(a.id)===String(KF.id);});if(i>=0)lateness[i]=x;sb.from('absences').update(row).eq('id',KF.id).then(function(res){if(res&&res.error)alert(latErr(res));});}
  else{x.id='t'+Date.now();lateness.push(x);sb.from('absences').insert(row).select().single().then(function(res){if(res&&res.error){alert(latErr(res));lateness=lateness.filter(function(a){return a!==x;});kalRerender();return;}if(res&&res.data&&res.data.id)x.id=res.data.id;});}
  logActivity('kalender',KF.id?'updated':'created',(KF.id?'Verspätung geändert: ':'Verspätung eingetragen: ')+x.minuten+' Min.',x.employeeId,(e?e.name:'')+' · '+kalF(x.von));
  kalRerender();}
function latErr(res){var m=(res&&res.error&&res.error.message)||'';if(/minuten|absences_art_check|check constraint/i.test(m))return 'Für Verspätungen fehlt noch die Datenbank-Erweiterung. Bitte 31_verspaetung.sql ausführen.';return kalErrText(res);}
function kalSaveForm(){if(!KF)return;var ev=kalEval(KF);if(!ev.n)return;if(KF.art==='verspaetung'){latSaveForm();return;}var art=KF.art,e=kalEmp(KF.employeeId);
  if(art==='urlaub'&&!KF.normal&&(KF.wasFlex||!KF.verschobenVon&&kalWdBetween(e,KF.eingereichtAm||today(),KF.von)<15))art='flex';
  if(art==='krank')KF.status='genehmigt';
  var x={id:KF.id,employeeId:KF.employeeId,art:art,von:KF.von,bis:KF.halb?KF.von:KF.bis,halb:!!KF.halb,halbTeil:KF.halb?(KF.halbTeil||'vm'):null,status:KF.status,notiz:KF.notiz||'',verschobenVon:KF.verschobenVon||null,eingereichtAm:KF.eingereichtAm||today(),eingereichtVon:kalActor(),
    entschiedenVon:KF.status==='genehmigt'?kalActor():'',entschiedenAm:KF.status==='genehmigt'?new Date().toISOString():null};
  var row=kalRowFrom(x);kalCloseForm();
  if(KF.id){var i=absences.findIndex(function(a){return String(a.id)===String(KF.id);});if(i>=0){x.eingereichtAm=absences[i].eingereichtAm;x.eingereichtVon=absences[i].eingereichtVon;row.eingereicht_von=x.eingereichtVon||null;absences[i]=x;}
    sb.from('absences').update(row).eq('id',KF.id).then(function(res){if(res&&res.error)alert(kalErrText(res));});}
  else{x.id='t'+Date.now();absences.push(x);
    sb.from('absences').insert(row).select().single().then(function(res){if(res&&res.error){alert(/relation .*absences/i.test(res.error.message||'')?'Die Tabelle „absences“ fehlt noch. Bitte 20_kalender_abwesenheiten.sql ausführen.':kalErrText(res));absences=absences.filter(function(a){return a!==x;});kalRerender();return;}
      if(res&&res.data&&res.data.id)x.id=res.data.id;});}
  logActivity('kalender',KF.id?'updated':'created',(KF.id?'Abwesenheit geändert: ':'Abwesenheit eingetragen: ')+KAL_ART[art],x.employeeId,(e?e.name:'')+' · '+kalRange(x));
  kalRerender();}
function kalDelete(){if(!KF||!KF.id)return;if(!confirm('Diesen Eintrag löschen? Das lässt sich nicht rückgängig machen.'))return;var id=KF.id,x=absences.find(function(a){return String(a.id)===String(id);})||lateness.find(function(a){return String(a.id)===String(id);}),e=x&&kalEmp(x.employeeId);
  absences=absences.filter(function(a){return String(a.id)!==String(id);});lateness=lateness.filter(function(a){return String(a.id)!==String(id);});kalCloseForm();kalRerender();
  if(x)logActivity('kalender','deleted','Abwesenheit gelöscht: '+KAL_ART[x.art],x.employeeId,(e?e.name:'')+' · '+kalRange(x));
  sb.from('absences').delete().eq('id',id).then(function(res){if(res&&res.error)alert(kalErrText(res));});}

// ── Drag & Drop, Rückgängig ──
function kalToast(t,undoFn){var u=document.getElementById('kalUndo');if(!u){u=document.createElement('div');u.className='kal-undo';u.id='kalUndo';u.innerHTML='<span id="kalUndoT"></span><button type="button">Rückgängig</button>';document.body.appendChild(u);}
  document.getElementById('kalUndoT').innerHTML=t;u.querySelector('button').onclick=function(){u.classList.remove('on');if(undoFn)undoFn();};u.classList.add('on');clearTimeout(KAL.ut);KAL.ut=setTimeout(function(){u.classList.remove('on');},7000);}
function kalSlotTime(col,ev){var r=col.getBoundingClientRect(),mins=Math.round(((ev.clientY-r.top-12)/56*60)/15)*15;mins=Math.max(0,Math.min(mins,11*60+15));return ('0'+(8+Math.floor(mins/60))).slice(-2)+':'+('0'+mins%60).slice(-2);}
function kalAddMin(t,n){var m=timeStrToMin(t)+n;return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2);}
function kalMoveAbs(id,from,to){var x=absences.find(function(a){return String(a.id)===String(id);});if(!x)return;var dd=kalDiff(from,to);if(!dd)return;
  var old={von:x.von,bis:x.bis,verschobenVon:x.verschobenVon,status:x.status,eingereichtAm:x.eingereichtAm},was=kalRange(x),asReq=kalRules().verschieben==='antrag'&&x.status==='genehmigt'&&(x.art==='urlaub'||x.art==='flex');x.von=kalAdd(x.von,dd);x.bis=kalAdd(x.bis,dd);if(x.status==='genehmigt'&&!x.verschobenVon)x.verschobenVon=was.replace(' – ','–');if(asReq){x.status='offen';x.eingereichtAm=today();}
  kalRerender();var e=kalEmp(x.employeeId);
  sb.from('absences').update({von:x.von,bis:x.bis,verschoben_von:x.verschobenVon||null,status:x.status}).eq('id',x.id).then(function(res){if(res&&res.error)alert(kalErrText(res));});
  logActivity('kalender','moved','Abwesenheit verschoben: '+KAL_ART[x.art],x.employeeId,(e?e.name:'')+' · '+was+' → '+kalRange(x));
  kalToast('<b>'+esc(e?e.name:'')+'</b>: '+KAL_ART[x.art]+' von '+was+' auf '+kalRange(x)+' verschoben'+(asReq?', wartet jetzt auf Genehmigung.':'.'),function(){x.von=old.von;x.bis=old.bis;x.verschobenVon=old.verschobenVon;x.status=old.status;x.eingereichtAm=old.eingereichtAm;kalRerender();sb.from('absences').update({von:x.von,bis:x.bis,verschoben_von:x.verschobenVon||null,status:x.status}).eq('id',x.id).then(function(){});});}
function kalMoveSes(eid,sid,day,tm){var p=(protocols[eid]||[]).find(function(q){return String(q.id)===String(sid);});if(!p)return;var all=kalGroupProtos(p),old=all.map(function(q){return {q:q,date:q.date,uhrzeit:q.uhrzeit,endUhrzeit:q.endUhrzeit};});
  var dur=(p.uhrzeit&&p.endUhrzeit)?timeStrToMin(p.endUhrzeit)-timeStrToMin(p.uhrzeit):null;all.forEach(function(q){q.date=day;if(tm){q.uhrzeit=tm;if(dur)q.endUhrzeit=kalAddMin(tm,dur);}});
  kalRerender();kalSesUpdate(p,{date:p.date,uhrzeit:p.uhrzeit||null,end_uhrzeit:p.endUhrzeit||null});
  var e=kalEmp(eid);kalToast((p.groupId?'Gruppencoaching ('+all.length+')':(p.type||'Session')+' mit '+esc(e?e.name:''))+' auf '+kalF(day)+(p.uhrzeit?' '+p.uhrzeit:'')+' verschoben.',function(){old.forEach(function(o){o.q.date=o.date;o.q.uhrzeit=o.uhrzeit;o.q.endUhrzeit=o.endUhrzeit;});kalRerender();kalSesUpdate(p,{date:p.date,uhrzeit:p.uhrzeit||null,end_uhrzeit:p.endUhrzeit||null});});}
function kalPlanSession(task,day,tm){var e=task.e,uz=tm||'10:00',row={employee_id:e.id,date:day,uhrzeit:uz,end_uhrzeit:kalAddMin(uz,task.art==='Weekly'?30:60),art:task.art,rating:null,note:'',focus:'',status:'geplant',coach_id:task.coachId||(currentCoach?currentCoach.id:null),focus_metric:null,group_id:null};
  var p={id:'t'+Date.now(),date:day,uhrzeit:row.uhrzeit,endUhrzeit:row.end_uhrzeit,type:task.art,status:'geplant',rating:null,note:'',notes:'',focus:'',topics:[],coachId:row.coach_id};
  if(!protocols[e.id])protocols[e.id]=[];protocols[e.id].unshift(p);kalRerender();
  sb.from('protocols').insert(row).select().single().then(function(res){if(res&&res.error){alert('Planen fehlgeschlagen: '+res.error.message);protocols[e.id]=protocols[e.id].filter(function(q){return q!==p;});kalRerender();return;}if(res&&res.data&&res.data.id)p.id=res.data.id;});
  logActivity('session','created','Session geplant: '+task.art,e.id,e.name+' · '+fd(day)+' · '+uz);
  kalToast('Geplant: '+esc(task.l)+', '+kalF(day)+' '+uz+(tm?'':' (Uhrzeit in der Wochenansicht anpassen)')+'.',function(){protocols[e.id]=protocols[e.id].filter(function(q){return q!==p;});kalRerender();if(!String(p.id).startsWith('t'))sb.from('protocols').delete().eq('id',p.id).then(function(){});});}
function kalPlanTask(id){var t=kalTasks().find(function(x){return x.id===id;});if(!t)return;KAL.pane='plan';KAL.view='woche';KAL.cur=t.due<today()?today():t.due;kalRerender();var c=document.querySelector('#mainArea .content');if(c)c.scrollTo({top:0,behavior:'smooth'});}
// ── Länge ändern wie in Outlook: Session oben/unten (Uhrzeit), Abwesenheit links/rechts (Datum) ──
function kalMinStr(m){return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2);}
function abEnsureModal(){if(document.getElementById('absPopModal'))return;var d=document.createElement('div');d.className='modal-ov hidden';d.id='absPopModal';
  d.innerHTML='<div class="modal" style="padding:0;display:flex;flex-direction:column;background:#EEEDE9;overflow:hidden">'
   +'<div style="display:flex;align-items:center;padding:14px 16px 6px"><div style="min-width:0"><div style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">Abwesenheit</div><div id="abHdSub" style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div></div><button class="btn" type="button" aria-label="Schließen" style="margin-left:auto;width:36px;height:36px;padding:0;justify-content:center" onclick="abClose()"><i class="ti ti-x"></i></button></div>'
   +'<div style="display:flex;min-height:0;flex:1"><div style="width:56px;flex-shrink:0;align-self:stretch;margin:6px 0 14px 14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;box-shadow:0 10px 24px rgba(40,32,15,.10);position:relative;z-index:3">'
   +'<button class="rl-btn on" type="button" aria-label="Überblick" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'abSecB\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-star"></i><span class="rl-tip">Überblick</span></button>'
   +'<button class="rl-btn" type="button" aria-label="Kalender" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'abSecC\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-calendar"></i><span class="rl-tip">Kalender</span></button>'
   +'<button class="rl-btn" type="button" aria-label="Team" style="width:38px;height:38px;font-size:18px" onclick="var el=document.getElementById(\'abSecT\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'})"><i class="ti ti-users-group"></i><span class="rl-tip">Team</span></button></div>'
   +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0"><div id="abBody" style="flex:1;overflow-y:auto;padding:6px 18px 12px 14px"></div>'
   +'<div style="display:flex;justify-content:flex-end;gap:8px;padding:4px 18px 14px"><button class="btn" type="button" style="height:36px;width:auto" onclick="abToKalender()"><i class="ti ti-calendar"></i> Im Kalender öffnen</button><button class="btn" type="button" style="height:36px;width:auto" onclick="abClose()">Schließen</button></div></div></div></div>';
  var down=false;d.addEventListener('mousedown',function(ev){down=(ev.target===d);});d.addEventListener('click',function(ev){if(down&&ev.target===d)abClose();});
  document.body.appendChild(d);}
function openAbsPopup(empOrId,mk){abEnsureModal();var id=empOrId&&empOrId.id?empOrId.id:empOrId;var e=employees.find(function(x){return String(x.id)===String(id);});if(!e)return;
  AB.emp=e.id;AB.mk=mk||(AB.emp===e.id&&AB.mk)||today().slice(0,7);AB.base=null;var sub=document.getElementById('abHdSub');if(sub)sub.textContent=e.name+(e.role?' · '+e.role:'');
  abRender();var b=document.getElementById('abBody');if(b)b.scrollTop=0;openModal('absPopModal');}
function abClose(){closeModal('absPopModal');if(view==='team'&&typeof wiegandView!=='undefined'&&wiegandView==='ziel')renderTeam();else if(view==='kalender'||view==='coaching')kalRerender();}
function abToKalender(){var e=kalEmp(AB.emp);closeModal('absPopModal');KAL.loc=kalIsVlc(e)?'VLC':'MUC';KAL.view='monat';KAL.cur=AB.mk+'-01';KAL.open=AB.emp;selectKalender();}
function abStep(n){var d=new Date(+AB.mk.slice(0,4),+AB.mk.slice(5,7)-1+n,1);AB.mk=kalI(d).slice(0,7);AB.base=null;abRender();}
function abPlan(e,mk){var n=0;ztDaysOfMonth(mk).forEach(function(d){if(!kalWorkday(e,d))return;var a=kalOn(e.id,d);if(!a)n++;else if(a.art==='krank')n+=0.5;});var x=(zielStore[mk]||{})[e.id]||{},opt=+x.optTag||0,mo=+x.margeOpt||0;return {t:n,z:n*opt*mo};}
function abRender(){if(!AB.f)abNewForm();var e=kalEmp(AB.emp),b=document.getElementById('abBody');if(!e||!b)return;_kalOnIdx=null;var mk=AB.mk,y=mk.slice(0,4),k=kalKonto(e.id,y),mn=MONTH_NAMES_ZIEL[+mk.slice(5)-1],p=abPlan(e,mk);if(!AB.base)AB.base=p;
  var CARD='background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)';
  var lst=latStats(e.id,mk+'-01',mk+'-31');
  var BK=[['URLAUB FREI',kalNf(k.frei),'von '+kalNf(k.ans+k.uebEff)+' Tagen'],['FLEX DAYS',kalNf(k.flex),'von '+k.flexMax+' übrig'],['KRANK '+y,kalNf(k.kr),'Tage']].concat(latCanSee()?[['VERSPÄTET',lst.n+'×',lst.n?lst.min+' Min. im '+mn:'im '+mn]]:[]).concat([['EINSATZTAGE',p.t,mn+' lt. Kalender'],['ZIEL MARGE',ztEur(p.z),mn]]);
  var h='<div id="abSecB" style="border-radius:14px;padding:16px 18px;margin-bottom:14px;min-height:148px;box-sizing:border-box;color:#fff;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%)"><div style="font-size:11px;font-weight:600;letter-spacing:.09em;margin-bottom:10px">'+mn.toUpperCase()+' '+y+' · URLAUB UND ABWESENHEIT</div><div style="display:grid;grid-template-columns:repeat('+BK.length+',minmax(0,1fr))">'
    +BK.map(function(x,i){return '<div style="padding:0 14px;'+(i?'border-left:1px solid rgba(255,255,255,.25);':'padding-left:0;')+'min-width:0"><div style="font-size:11px;font-weight:600;letter-spacing:.09em">'+x[0]+'</div><div style="font-size:'+(i===BK.length-1?'24':'32')+'px;font-weight:300;line-height:1.15;white-space:nowrap">'+x[1]+'</div><div style="font-size:12.5px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+x[2]+'</div></div>';}).join('')+'</div></div>';
  // Formular (feste Höhe: optionale Teile werden nur ausgeblendet, nicht entfernt)
  var F=AB.f,ev=F.von?kalEval(F):{n:0,H:[]},hid=function(c){return c?'':'visibility:hidden;';},ed=kalCanEdit();
  var seg=function(arr,cur,set){return '<span class="dsh-seg">'+arr.map(function(o){return '<button type="button" class="'+(cur===o[0]?'on':'')+'" onclick="'+set.replace('$',o[0])+';abRender()">'+o[1]+'</button>';}).join('')+'</span>';};
  var isU=F.art==='urlaub',vl=F.von?kalWdBetween(e,F.eingereichtAm||today(),F.von):0;
  var fo=!!(AB.fOpen||F.von||F.id);
  h+='<div id="abSecC" style="'+CARD+'"><div class="at-newh" onclick="AB.fOpen=!'+fo+';if(!AB.fOpen&&!AB.f.id&&!AB.f.von)AB.f=null;abRender()"><span class="at-pl"><i class="ti '+(fo?'ti-minus':'ti-plus')+'"></i></span><b>'+(F.id?'Abwesenheit ändern':'Abwesenheit eintragen')+'</b><span class="kal-note" style="margin-left:auto">'+(fo?(F.id?'aus der Team-Übersicht geladen · zuklappen':'zuklappen · oder unten im Team Tage anklicken'):'zum Aufklappen klicken · oder unten im Team Tage anklicken')+'</span></div><div style="margin-top:12px;'+(fo?'':'display:none')+'">'
    +absFormHtml('ab',e,F,ev,'<input type="text" value="'+esc(e.name)+'" disabled style="background:#EFECE5;color:var(--text2)">')
    +'<div class="ab-fr" style="justify-content:flex-end;margin:12px 0 0"><button class="btn btn-danger" style="margin-right:auto;'+hid(F.id&&ed)+'" onclick="abDelete()">Löschen</button><button class="btn" onclick="AB.f=null;abRender()">Zurücksetzen</button><button class="btn btn-primary" onclick="abSave()"'+(ed&&ev.n?'':' disabled')+'>'+(F.id?'Speichern':'Eintragen')+'</button></div></div></div>';
  // Team (eigene Zeile anklickbar: Tage wählen oder Eintrag laden)
  var loc=kalIsVlc(e)?'VLC':'MUC',T=kalPeople(loc),D=ztDaysOfMonth(mk);T=[e].concat(T.filter(function(x){return x.id!==e.id;}));
  var selTo=F.halb?F.von:F.bis;
  var tl='<div class="ab-tl" style="grid-template-columns:130px repeat('+D.length+',minmax(14px,1fr))"><div class="nm hd"><b>'+mn+'</b></div>'+D.map(function(x){return '<div class="hd'+(kalWknd(x)||kalHol(x,loc)?' we':'')+'"><b>'+kalP(x).getDate()+'</b>'+KAL_WD[kalP(x).getDay()].slice(0,1)+'</div>';}).join('');
  T.forEach(function(t){var me=t.id===e.id;tl+='<div class="nm'+(me?' me':'')+'">'+esc(t.name)+'</div>'+D.map(function(x){if(kalWknd(x)||kalHol(x,loc))return '<div class="we"></div>';var a=kalOn(t.id,x),sel=me&&F.von&&x>=F.von&&x<=selTo;
    var lm=latCanSee()?latMinOn(t.id,x):0,nw=!a&&kalNoWork(t,x);return '<div class="'+(me?'me2 ab-pick':'')+(sel?' ab-sel':'')+(nw?' nw':'')+'"'+(me&&ed?' onclick="abPick(\''+x+'\')"':'')+(nw?' data-ktip="'+kalNoWorkTip(t,x)+'"':'')+'>'+(a&&!a.fixed?'<span class="'+(KAL_CLS[kalShowArt(a)]||'')+(a.status==='offen'?' kal-op':'')+'" data-ktip="'+esc(kalTip(a))+'"></span>':'')+(lm&&!a?'<i class="ti ti-clock ab-vz" data-ktip="'+esc(esc(t.name)+' · '+lm+' Min. zu spät')+'"></i>':'')+'</div>';}).join('');});
  tl+='<div class="nm sum">frei</div>'+D.map(function(x){if(kalWknd(x)||kalHol(x,loc))return '<div class="we"></div>';var o=kalFree(x,loc,null);return '<div class="sum'+(kalFreeOver(x,o)?' w3':'')+'">'+(o.length||'')+'</div>';}).join('')+'</div>';
  h+='<div id="abSecT" style="'+CARD+';margin-bottom:4px"><div style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:14px;margin-bottom:10px"><button class="kal-nav" onclick="abStep(-1)">‹</button>Team '+mn+' '+y+'<button class="kal-nav" onclick="abStep(1)">›</button><span class="kal-note" style="margin-left:auto;font-weight:400">'+esc(kalFirst(e.name))+'s Zeile: Tag anklicken = Zeitraum wählen, Eintrag anklicken = ändern · '+(loc==='VLC'?'Valencia':'Olching')+'</span></div><div style="overflow-x:auto">'+tl+'</div>'
    +'<div style="margin-top:10px;font-size:13px">Ziel '+mn+': <b>'+p.t+' T · '+ztEur(p.z)+'</b>'+(zielLocks[mk]?' <span class="kal-note">· Monat festgeschrieben, neue Abwesenheiten erscheinen bei „Wer lag genauer?“ als „Urlaub ungeplant“</span>':'')+'</div></div>';
  b.innerHTML=h;}
function abChecks(e,F,ev){var tile=function(l,v,sub,c,tip){return '<div class="ab-ck '+(c||'')+'"'+(tip?' data-ktip="'+esc(tip)+'"':'')+'><small>'+l+'</small><b>'+v+'</b><em>'+sub+'</em></div>';};
  if(!F.von)return '<div class="ab-ck4">'+tile('Dieser Eintrag','–','Zeitraum wählen','off')+tile('Vorlauf','–','','off')+tile('Zählt als','–','','off')+tile('Andere frei','–','','off')+'</div>';
  var err=(ev.H||[]).filter(function(x){return x.t==='err';})[0],y=F.von.slice(0,4),k=kalKonto(e.id,y),n=ev.n||0,bis=F.halb?F.von:(F.bis||F.von);
  var t1=err?tile('Dieser Eintrag','Prüfen',err.h.replace(/<[^>]+>/g,''),'w',err.h.replace(/<[^>]+>/g,'')):tile('Dieser Eintrag',kalNf(n)+' Arbeitstag'+(n===1?'':'e'),kalF(F.von)+(bis!==F.von?'–'+kalF(bis):'')+(F.halb?' · '+(F.halbTeil==='nm'?'Nachmittag':'Vormittag'):''));
  var vl=kalWdBetween(e,F.eingereichtAm||today(),F.von),isU=F.art==='urlaub',isFx=isU&&!F.normal&&(F.wasFlex||!F.verschobenVon&&vl<15);
  var t2=F.art==='krank'?tile('Vorlauf','–','nicht relevant','off'):tile('Vorlauf',vl<0?'rückwirkend':vl+' AT',isU?(F.verschobenVon?'verschoben, kein Flex Day':vl<15?(F.normal?'unter 15 · trotzdem Urlaub':'unter 15 → Flex Day'):'15-Tage-Regel erfüllt'):'',isU&&vl<15&&!F.normal&&!F.verschobenVon?'w':'');
  var t3;if(F.art==='krank')t3=tile('Zählt als','Krank','50 % Std. für Opt./Std.');else if(F.art==='freistellung')t3=tile('Zählt als','Freistellung','kostet keinen Urlaub');else if(F.art==='ausgleich')t3=tile('Zählt als','Ausgleichstag','kostet keinen Urlaub');
  else if(isFx){var fr=k.flex-(F.id?0:n);t3=tile('Zählt als','Flex Day','danach '+kalNf(fr)+' von '+k.flexMax+' übrig','w');}else{var ur=k.frei-(F.id?0:n);t3=tile('Zählt als','Urlaub','Konto danach '+kalNf(ur)+' von '+kalNf(k.ans+k.uebEff),ur<0?'w':'');}
  var loc=kalIsVlc(e)?'VLC':'MUC',mx=0,md=null,nm=[];kalDays({employeeId:e.id,von:F.von,bis:bis,halb:F.halb}).forEach(function(d){var o=kalFreeFor?kalFreeFor(d,e,F.id):kalFree(d,loc,e.id);if(o.length>mx){mx=o.length;md=d;nm=o.map(function(x){return kalFirst(x.e.name)+(x.x.status==='offen'?' (beantragt)':'');});}});
  var G=kalRules().freiGrenze,t4=tile('Andere frei',mx?mx+' am '+kalF(md):'niemand',mx?nm.join(', '):'im ganzen Zeitraum',mx>=G?'w':'',mx?nm.join(', '):'');
  return '<div class="ab-ck4">'+t1+t2+t3+t4+'</div>';}

function abNewForm(){AB.fOpen=AB.fOpen||false;AB.f={id:null,employeeId:AB.emp,art:'urlaub',von:null,bis:null,halb:false,halbTeil:'vm',status:'genehmigt',notiz:'',normal:false,eingereichtAm:today(),pend:false};}
function abPick(d){var e=kalEmp(AB.emp);var x=absences.find(function(a){return a.employeeId===e.id&&!a.fixed&&a.status!=='abgelehnt'&&a.status!=='storniert'&&a.von<=d&&a.bis>=d&&kalDays(a).indexOf(d)>=0;});
  if(x&&!(AB.f&&AB.f.pend)){if(x.masked)return;AB.f={id:x.id,employeeId:x.employeeId,art:x.art==='flex'?'urlaub':x.art,wasFlex:x.art==='flex',von:x.von,bis:x.bis,halb:!!x.halb,halbTeil:x.halbTeil||'vm',status:x.status==='offen'?'offen':'genehmigt',notiz:x.notiz||'',normal:x.art==='urlaub'&&x.status==='genehmigt',eingereichtAm:x.eingereichtAm||today(),verschobenVon:x.verschobenVon||null,pend:false};abRender();return;}
  AB.fOpen=true;var F=AB.f;if(!F||F.id||!F.pend){abNewForm();F=AB.f;F.von=d;F.bis=d;F.pend=true;}else{if(d<F.von)F.von=d;else F.bis=d;F.pend=false;}if(F.halb)F.bis=F.von;abRender();}
function abSave(){var F=AB.f;if(!F||!kalCanEdit())return;KF=Object.assign({},F);kalSaveForm();AB.f=null;AB.base=null;abRender();}
function abDelete(){var F=AB.f;if(!F||!F.id)return;KF=Object.assign({},F);var n=absences.length+lateness.length;kalDelete();if(absences.length+lateness.length<n){AB.f=null;AB.base=null;}abRender();}
