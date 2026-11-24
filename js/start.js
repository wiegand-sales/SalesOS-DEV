// Sales OS – Lade-Code: globale Variablen und alles, was beim Laden läuft, in Originalreihenfolge.
// Wird als LETZTE Datei geladen; alle Funktionen sind dann schon da.
// ── Wächter (eigener, neuer Code – nicht aus der alten index.html): fehlt eine Programmdatei, nicht halb starten ──
(function(){
  var fehlt=[['config.js',typeof SUPABASE_URL],['shared/figuren.js',typeof kidSvg],['js/core.js',typeof initAppAfterLogin],['js/kpi.js',typeof workHoursForDate],['js/ui.js',typeof renderMain],['js/zielvereinbarung.js',typeof zielTreeHtml],['js/uebersicht.js',typeof renderTeam],['js/mitarbeiter.js',typeof renderEmpDetail],['js/popup.js',typeof puInit],['js/dashboard.js',typeof renderDashboard],['js/provision.js',typeof calculateProvision],['js/einstellungen.js',typeof renderEinstellungen],['js/live-menue.js',typeof renderLive],['js/import.js',typeof importCSV],['js/kalender.js',typeof renderKalender],['js/aufgaben.js',typeof renderAufgaben]].filter(function(x){return x[1]==='undefined';}).map(function(x){return x[0];});
  if(!fehlt.length)return;
  var zeige=function(){var d=document.createElement('div');d.id='sosLadeFehler';d.setAttribute('role','alert');
    d.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(29,28,26,.55);display:flex;align-items:center;justify-content:center;font-family:Urbanist,sans-serif';
    d.innerHTML='<div style="background:#F7F5F0;border-radius:14px;padding:22px 24px;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.25)"><div style="font-weight:700;font-size:16px;margin-bottom:6px">Sales OS wurde nicht vollständig geladen</div><div style="font-size:13.5px;color:#5c4a42;margin-bottom:14px">Es fehlt: '+fehlt.join(', ')+'. Meist hilft es, die Seite neu zu laden.</div><button type="button" style="background:#F08566;color:#fff;border:0;border-radius:8px;height:34px;padding:0 14px;font-weight:700;font-family:inherit;cursor:pointer">Seite neu laden</button></div>';
    d.querySelector('button').onclick=function(){location.reload();};document.body.appendChild(d);};
  if(document.body)zeige();else document.addEventListener('DOMContentLoaded',zeige);
  throw new Error('Sales OS: Dateien nicht geladen: '+fehlt.join(', ')); // bricht start.js ab: kein halber Start
})();
// ── Teil 1 ──
// ══ SUPABASE SETUP ══
var _sbRaw = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var currentUserRole = null; // 'coach' | 'admin' | 'viewer' | null (unbekannt/nicht eingeloggt)
var sb = {
  auth: _sbRaw.auth,
  functions: _sbRaw.functions,
  rpc: function(){ return _sbRaw.rpc.apply(_sbRaw, arguments); },
  storage: {
    from: function(bucket){
      var real = _sbRaw.storage.from(bucket);
      if(currentUserRole !== 'viewer') return real;
      ['upload','update','remove','move','copy'].forEach(function(m){
        if(typeof real[m]==='function'){
          real[m] = function(){ showViewerBlockedToast(); return Promise.resolve(_viewerBlockedStorage()); };
        }
      });
      return real;
    }
  },
  from: function(table){
    var real = _sbRaw.from(table);
    if(currentUserRole === 'coach' && typeof canEditTable==='function' && !canEditTable(table)){
      ['insert','update','upsert','delete'].forEach(function(m){
        if(typeof real[m]==='function'){ real[m] = function(){ showPermBlockedToast(); return _viewerBlockedQuery(); }; }
      });
      return real;
    }
    if(currentUserRole !== 'viewer') return real;
    ['insert','update','upsert','delete'].forEach(function(m){
      if(typeof real[m]==='function'){
        real[m] = function(){ showViewerBlockedToast(); return _viewerBlockedQuery(); };
      }
    });
    return real;
  }
};

// Staging-Banner nur einblenden, wenn dies die DEV-Datenbank ist (nicht Live)
if(SUPABASE_URL.indexOf('kjlkneodyvfqgaukdjvb')>=0){
  var stgBanner=document.getElementById('stg-banner');
  if(stgBanner){
    stgBanner.style.display='block';
    var stgStyle=document.getElementById('stg-banner-style');
    if(stgStyle)stgStyle.textContent='#stg-banner~*{margin-top:32px!important}#stg-banner~.sidebar{margin-top:54px!important;height:calc(100vh - 70px)!important}';
  }
}
document.addEventListener('DOMContentLoaded', function(){
  var pw = document.getElementById('auth-password');
  if(pw){ pw.addEventListener('keydown', function(e){ if(e.key === 'Enter') loginWithPassword(); }); }
});

var _appInitStarted = false;
var currentCoach = null;      // {id,name,role} falls eingeloggter User ein Coach (SDM/SC) ist, sonst null (Admin/Overview)
var coachFilterView = 'overview'; // 'overview' | employee-id des Coaches
var wiegandView='overview'; // 'overview' | 'team' | 'performance' (SFP Wiegand Tab-Navigation) - Overview ist der Standard-Landing-Tab nach dem Login (Performance-Menue entfernt, per Banner-Umschalter in Overview weiterhin erreichbar)
var overviewSelectedIds=null; // Array ausgewählter Mitarbeiter-IDs in SFP Wiegand > Overview (Mehrfachauswahl)
var provisionTeamSelectedIds=null; // null = alle Mitarbeiter; sonst Array ausgewaehlter IDs (eigenstaendig, unabhaengig von overviewSelectedIds)
var provisionTeamDropdownOpen=false;
var provisionTeamSearchQuery='';
var overviewRenderTarget='team'; // 'team' | 'emp' - steuert ob die Performance-Tabelle im Team-Kontext (renderTeam) oder eingebettet auf der Mitarbeiterseite (renderTab) neu gerendert wird
var overviewDisplayMode='individual'; // 'individual' | 'gesamt' | 'durchschnitt' - steuert ob je Mitarbeiter oder aggregiert angezeigt wird
var overviewEmpDropdownOpen=false;
var overviewEmpSearchQuery='';
document.addEventListener('click',function(e){
  if(!overviewEmpDropdownOpen)return;
  if(e.target.closest&&e.target.closest('#overviewEmpDropdownWrap'))return;
  overviewEmpDropdownOpen=false;overviewEmpSearchQuery='';rerenderOverviewContext();
});
var overviewPerfGroup='month'; // 'day' | 'week' | 'month' – eigener Zustand, unabhängig vom Mitarbeiter-Tab
var overviewPerfSortKey=null; // aktuell aktive Sortierspalte der Performance-Tabelle (Overview)
var overviewPerfSortDir='asc'; // 'asc' | 'desc'
var overviewFromDate=null; // Von-Datum (Overview Performance-Tabelle), null = Standard (Monatsanfang)
var overviewChartMetric='margeGesamt';
var overviewChartGroup='week'; // 'day' | 'week' | 'month' - X-Achsen-Granularitaet des Performance-Trend-Charts
var empChartMetric='margeGesamt'; // eigenstaendiger Zustand fuer das Mitarbeiter-Performance-Diagramm
var empChartGroup='day';
var overviewChartEmpId=null; // null = Team (alle aktiven Mitarbeiter), sonst employee-id
var bannerViewMode=null; // null = Standard je Reiter, sonst 'performance'|'overview' explizit ueberschrieben
var settingsView='users'; // 'users' | 'roles' | 'wizards' | 'integrations' | 'data'
var activityFilterPerson='ALL'; // 'ALL' | employee-id (Coach)
var activityFilterDays=7;
var settingsNavOpen=true;
// ── Benutzer & Rechte: eine gemeinsame Liste fuer alle Personen ──
var userFilter='all', userSearch='', userShowAllAgents=false, loginInfo=null, loginInfoLoading=false, userMsg='';
var BOARD_ROLE_LABEL={admin:'Admin',coach:'Coach',viewer:'Betrachter',agent:'Sales Agent',none:'Kein Zugang'};
var SALARY_TABLE=false; // true, sobald die Tabelle employee_salary existiert (SQL 29)
// ── Person: Funktion · Stufe · Standort (SQL 42). Das alte Feld role wird daraus abgeleitet, damit alles Bestehende weiterläuft.
var PERSON_FN=[['agent','Sales Agent'],['sdl','SDL'],['coach','Coach'],['salesops','Sales Ops'],['am','Account Management'],['leitung','Leitung'],['none','keine (nur Betrachter)']];
var _savingNewAppUser=false;
var _deletingAppUser=false;
document.addEventListener('click',function(){document.querySelectorAll('.dd-panel').forEach(function(p){p.style.display='none';});document.querySelectorAll('.dd-raised').forEach(function(c){c.style.zIndex='';c.classList.remove('dd-raised');});});
var _bannerRotationOrder=['performance','overview','ziel','coaching','activity','kalender','aufgaben'];
var BANNER_TITLES={performance:'Performance',overview:'Overview',ziel:'Zielvereinbarung',coaching:'Coaching',activity:'Aktivitäten',kalender:'Kalender',aufgaben:'Aufgaben'};
var _bannerRotationTimer=null;
var overviewToDate=null;   // Bis-Datum (Overview Performance-Tabelle), null = Standard (Monatsende/heute)
var coachCalYear=null, coachCalMonthIdx=null; // Kalender-Monatsnavigation SFP Coaching (init. beim ersten Rendern auf aktuellen Monat)
var coachCalViewMode='week'; // 'month' | 'week'
var coachCalWeekStart=null; // Montag der aktuell angezeigten Woche (YYYY-MM-DD), init. beim ersten Rendern auf aktuelle Woche
var coachCalMiniPickerOpen=false;
var coachCalMiniPickerYear=null; // im Mini-Picker angezeigtes Jahr (kann vom eigentlich aktiven Jahr abweichen, waehrend man blaettert)







var COACHING_CATEGORIES={
  'Coaching':['Einzelcoaching'],
  'Performance':['Weekly','Performance Review'],
  'Onboarding':['Onboarding']
};
// Eine Reihe „Was für eine Session“: gespeicherte Art → Knopf-Beschriftung
var SF_ARTS=[['Einzelcoaching','Coaching'],['Weekly','Gespräch Weekly'],['Performance Review','Performance Review'],['Onboarding','Onboarding']];
var COACHING_WIE_LABEL={'Einzelcoaching':'Coaching'};
// Alte Arten aus der Zeit vor Nov 2026: behalten ihren Namen, zählen für Filter und Auswertung zu einer der drei Kategorien
var COACHING_LEGACY_CAT=(function(){var m={},add=function(cat,l){l.forEach(function(t){m[t]=cat;});};
  add('Coaching',['Gruppencoaching','Call Shadowing Aktiv','Call Shadowing Passiv','Call Shadowing (Aktiv)','Call Shadowing (Passiv)','1:1 Coaching','Live Coaching','Call Review','Rollenspiel','Feedbackgespräch','Motivation','Mentoring','Call Blitz','Mega YES','Cross Selling','Neukunden','Bestandskunden','Follow-up','Angebotsnachverfolgung','Abschlusstraining','Lead-Abarbeitung','Fokuszeit']);
  add('Onboarding',['Training','Produkttraining','Pitch-Training','Einwandtraining','Systemtraining','Wissens-Quiz','Nachschulung']);
  add('Performance',['KPI Review','Performance-Gespräch','Zielvereinbarung','Tagesziel','Wochenziel','Monatsziel','Teammeeting','Daily','Kick-off','Karrieregespräch','Entwicklungsplan']);return m;})();
var SESSION_TOPICS=['Einwandsbehandlung','Bedarfsanalyse','Produktwissen','Gesprächsführung','Motivation','Coachability','Zuverlässigkeit','Teamfähigkeit','CR OEM','CR TW','CR SY','CR MY','Sonstiges'];
var FOCUS_METRICS=[
  {key:'oem_aktivitaeten',label:'Aktivitäten'},
  {key:'convOEM',label:'Conv. OEM'},
  {key:'optGesamt',label:'Opt. Gesamt'},
  {key:'crOEM',label:'CR OEM %'},
  {key:'optPerH',label:'Opt./Std.'},
  {key:'crTeilweise',label:'CR Teilweise %'},
  {key:'crYes',label:'CR Yes %'},
  {key:'crSuperYes',label:'CR Super Yes %'},
  {key:'crMegaYes',label:'CR Mega Yes %'},
  {key:'margeGesamt',label:'Marge Gesamt €'}
];
var currentAuthUser=null; // {id,email} des eingeloggten Auth-Users, unabhängig davon ob er ein employees-Match hat
var ADMIN_NAME_MAP={ // Fallback für Admin-Logins, falls app_users (noch) nicht geladen ist
  'p.rode@wiegand-gmbh.de':'Peter Rode',
  'n.hojdem@wiegand-gmbh.de':'Niklas Hojdem'
};
var appUsers=[]; // [{id,authUserId,email,name,role}] aus app_users (Admins & Viewer ohne employees-Eintrag)
// ── D5: Startfehler – fehlende Teile automatisch nachladen (Variante C, Peter 24.11.2026) ──
var START_LOADERS=[['Leistungsdaten',function(){return loadPerformanceFromSupabase();}],['Protokolle',function(){return loadProtocolsFromSupabase();}],
  ['Call-Bewertungen',function(){return loadCallRatingsFromSupabase();}],['Aufgaben (alt)',function(){return loadTasksFromSupabase();}],
  ['Entwicklungs-Bewertungen',function(){return loadReviewsFromSupabase();}],['KPI-Ziele',function(){return loadKpiTargetsFromSupabase();}],
  ['Bewertungskriterien',function(){return loadRatingCriteriaFromSupabase();}],['Einstellungen',function(){return loadSettingsFromSupabase();}],
  ['Mitarbeiter-Ziele',function(){return loadEmployeeKpiTargetsFromSupabase();}],['Änderungshistorie',function(){return loadEmployeeHistoryFromSupabase();}],
  ['Arbeitszeit-Verlauf',function(){return loadEmployeeVerlaufFromSupabase();}],['Dokumente',function(){return loadEmployeeDocumentsFromSupabase();}],
  ['Ziele',function(){return loadGoalsFromSupabase();}],['Admin-Protokoll',function(){return loadAdminAuditLogFromSupabase();}],
  ['Aktivitätsprotokoll',function(){return loadActivityLogFromSupabase();}],['Zielvereinbarung',function(){return loadZielvereinbarungFromSupabase();}],
  ['Abwesenheiten',function(){return loadAbsencesFromSupabase();}],['Zielsperren',function(){return loadZielLocksFromSupabase();}],
  ['Aufgaben',function(){return loadAufgabenFromSupabase();}]];
var START_RETRY_MAX=3, START_RETRY_SEC=10, _startTimer=null, _startBaseTry=0;


// ── Sitzungsdauer: Anmeldung gilt bis Tagesende (spätestens 12 Stunden), Abmeldung nach 4 Stunden Inaktivität ──
var SESSION_MAX_H=12, IDLE_MAX_MIN=240, IDLE_WARN_MIN=2;
['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(function(ev){window.addEventListener(ev,_idleTouch,{passive:true,capture:true});});
setInterval(_sessionWatch,30000);
(function(){var why=null;try{why=sessionStorage.getItem('sos_logoutReason');sessionStorage.removeItem('sos_logoutReason');}catch(e){}
  if(!why)return;window.addEventListener('load',function(){var tag=document.getElementById('loginHeroTag');if(tag)tag.textContent=why==='idle'?'Du wurdest nach 4 Stunden Inaktivität abgemeldet.':'Neuer Tag, neue Anmeldung.';});})();
sb.auth.getSession().then(function(res){
  var s0=res.data.session;
  if(s0&&_sessExpired(s0)){forceLogout('day');return;}
  if(s0){ _idleTouchForce(); initAppAfterLogin(); }
});
sb.auth.onAuthStateChange(function(event, session){
  if(session&&_sessExpired(session)){forceLogout('day');return;}
  if(session){ initAppAfterLogin(); }
});
// Wirkung einer Session auf eine KPI: Ø der letzten 3 Arbeitstage davor gegen Ø der nächsten 3 Arbeitstage danach (Sessiontag selbst zählt nicht)
var IMPACT_DAYS=3;

// ── Coaching-Abdeckung: eigener, ausgebauter Tab mit mehr Informationen ──
// ── SFP Coaching > Overview Coachings: Petrol-Infobox (ersetzt die frühere 3-Kacheln+Chart-Zeile) ──
// ═══════════════ LOGIN-WIZARD (Petrol-Karussell, wie in SalesOS) ═══════════════
var MOTIVATION_QUOTES=[
"Kleine Schritte, jeden Tag - das ist der Unterschied.","Disziplin schlägt Motivation, jedes Mal.","Der beste Zeitpunkt anzufangen war gestern. Der zweitbeste ist jetzt.",
"Fortschritt zählt mehr als Perfektion.","Wer nicht dranbleibt, hat schon verloren, bevor es losging.","Aus jedem Nein lernst du etwas fürs nächste Ja.",
"Erfolg ist die Summe kleiner Anstrengungen, jeden Tag wiederholt.","Konzentrier dich auf das, was du beeinflussen kannst.","Ein Rückschlag ist kein Ausstieg, sondern eine Kurve.",
"Wer fragt, führt das Gespräch.","Zuhören ist die unterschätzteste Vertriebstechnik.","Vertrauen wird verdient, nicht verlangt.",
"Gute Vorbereitung schlägt spontanes Talent.","Jeder Anruf ist eine neue Chance, nicht eine Wiederholung.","Der Kunde kauft nie das Produkt, sondern das Ergebnis.",
"Wachstum passiert außerhalb der Komfortzone.","Konsequenz ist die Brücke zwischen Zielen und Ergebnissen.","Wer aufgibt, bevor der Erfolg kommt, hat ihn nie gesehen.",
"Ein gutes Coaching verändert mehr als tausend Tipps.","Reflektier täglich - auch fünf Minuten reichen.","Die besten Verkäufer sind die besten Fragensteller.",
"Motivation bringt dich in Gang, Gewohnheit hält dich in Bewegung.","Kritik ist Feedback in Verkleidung - nutze sie.","Wer wächst, macht Fehler. Wer nichts macht, wächst nicht.",
"Ehrlichkeit im Gespräch schlägt jeden Trick.","Der erste Eindruck entscheidet, der zweite bestätigt.","Konstanz schlägt Intensität, langfristig immer.",
"Erfolgreiche Menschen tun das, was andere aufschieben.","Ziele ohne Plan sind nur Wünsche.","Sei neugierig auf den Kunden, nicht nur auf den Abschluss.",
"Jede Ablehnung bringt dich näher ans nächste Ja.","Was du wiederholst, wird du.","Struktur gibt Freiheit, kein Chaos.",
"Der Unterschied zwischen gut und großartig ist Übung.","Bleib ruhig, wenn's hart wird - genau da entscheidet sich alles.","Ein Lächeln hört man auch am Telefon.",
"Wer über sich hinauswächst, verändert auch das Team.","Kleine Erfolge feiern - sie summieren sich.","Vorbereitung ist der Unterschied zwischen Zufall und Können.",
"Der Kunde merkt, ob du an dein Produkt glaubst.","Frag nach dem Warum, bevor du das Was verkaufst.","Beharrlichkeit gewinnt gegen Talent, wenn Talent nicht beharrlich ist.",
"Wachstum beginnt mit ehrlichem Feedback.","Verantwortung übernehmen ist der erste Schritt zur Verbesserung.","Ein starkes Nein heute kann ein besseres Ja morgen sein.",
"Die Energie im ersten Satz entscheidet oft über das ganze Gespräch.","Sei der Grund, warum ein Kunde gerne wiederkommt.","Übung schlägt Zufall, jedes Mal.",
"Wer nach vorne schaut, verliert die Angst vor dem letzten Anruf.","Dein Mindset bestimmt deine Zahlen, nicht umgekehrt.","Klarheit im Ziel bringt Ruhe im Handeln.",
"Der Unterschied liegt oft im letzten Prozent Einsatz.","Gute Gewohnheiten bauen sich langsam, aber sicher auf.","Jeder Tag ist eine neue Chance, die gestern verpasst wurde, nachzuholen.",
"Sei präzise in der Sprache, dann wirkst du sicherer.","Vertrieb ist Beziehungsarbeit mit Zahlen am Ende.","Wer den Kunden versteht, muss ihn nicht überzeugen.",
"Bleib dran, auch wenn's mühsam wird - genau dort trennt sich die Spreu vom Weizen.","Erfolg hinterlässt Spuren - folge deinen eigenen guten.","Der beste Verkäufer im Raum ist oft der beste Zuhörer.",
"Fokus schlägt Fleiß, wenn der Fleiß am falschen Ort ansetzt.","Ein ehrliches Coaching-Gespräch bringt mehr als zehn Standardtipps.","Sei geduldig mit dem Prozess, ungeduldig mit dem Fortschritt.",
"Wer nicht fragt, bekommt selten die volle Antwort.","Deine Stimme trägt mehr Überzeugung als deine Worte.","Ziele schriftlich festhalten verdoppelt die Wahrscheinlichkeit, sie zu erreichen.",
"Ein Nein heute ist kein Nein für immer.","Konzentriere dich auf den nächsten Schritt, nicht auf die ganze Treppe.","Wer sich selbst reflektiert, wächst schneller als der Rest.",
"Beständigkeit im Kleinen erzeugt Großes im Ganzen.","Der Unterschied zwischen Traum und Ziel ist ein Datum.","Sei der Mensch, mit dem der Kunde gerne noch mal spricht.",
"Ein starkes Team trägt auch schwache Tage.","Frage zweimal nach, bevor du eine Lösung anbietest.","Übe die schwierigen Gespräche öfter als die einfachen.",
"Wachstum fühlt sich selten bequem an.","Wer den Prozess liebt, gewinnt auch ohne sofortigen Erfolg.","Dein nächster Anruf kennt deine letzten Ergebnisse nicht - nutze das.",
"Beharrlichkeit ist lauter als Talent.","Ein gutes Ziel motiviert auch an einem schlechten Tag.","Vertrauen aufbauen dauert länger, als es zu verlieren.",
"Sei konkret in deinen Vorsätzen, nicht nur ambitioniert.","Wer sich verbessern will, muss sich beobachten lassen.","Kleine Disziplin heute erspart große Reue morgen.",
"Ein starker Pitch beginnt mit einer starken Frage.","Der Erfolg von morgen beginnt mit der Vorbereitung von heute.","Sei geduldig mit dir selbst - Wachstum ist kein Sprint.",
"Wer den Kunden ernst nimmt, verdient sein Vertrauen.","Übe Einwandsbehandlung wie einen Muskel - regelmäßig.","Konstante kleine Verbesserungen schlagen sporadische große Sprünge.",
"Dein Ton macht mehr als die Hälfte der Botschaft aus.","Wer nicht nachfragt, verpasst die eigentliche Chance.","Bleib neugierig - das hält dich scharf.",
"Ein motiviertes Team schlägt ein talentiertes Team ohne Zusammenhalt.","Reflektiere Erfolge genauso gründlich wie Misserfolge.","Jeder Tag zählt - auch die ruhigen.",
"Sei mutig genug, unbequeme Fragen zu stellen.","Der beste Moment für Feedback ist jetzt, nicht später.","Vertrieb beginnt mit Zuhören und endet mit Vertrauen.","Wer heute übt, gewinnt morgen leichter."
];

// ═══════════════ WIZARD-ENGINE (Einstellungen → Wizards, settings.wizardConfig) ═══════════════
// Drei Wizards (Login · Admin, Login · Coach, Tagesüberblick) teilen sich einen Katalog von 11 Slides.
var WIZ_KPIS=[['crOEM','CR OEM'],['crTW','CR TW'],['crSyMy','CR SY/MY'],['crMY','CR MY'],['marge','Marge'],['opt','Optimierungen']];
var WIZ_SLIDES={
  overdue:{label:'Überfällige Sessions',desc:'Mitarbeiter ohne Coaching seit mehr als X Tagen',def:{days:30},build:function(ctx,c){
    var l=wizardOverdueList(ctx.scope,c.days);
    return [{type:'stat',icon:'ti-alert-triangle',stat:String(l.length),title:ctx.own?'Überfällige Coaching Sessions':'Überfällige Coachings',
      sub:l.length?((ctx.own?'':'Team-weit: ')+wizNames(l)):(ctx.own?'Bei deinen Mitarbeitern ist aktuell niemand überfällig.':'Aktuell ist niemand überfällig.')}];}},
  upcoming:{label:'Geplante Sessions',desc:'Die nächsten geplanten Coachings (max. 5)',def:{days:null},build:function(ctx,c){
    var u=wizardUpcomingSessions(ctx.own?ctx.coach.id:null,c.days);
    return [{type:'tasklist',title:ctx.own?'Geplante Coaching Sessions':'Anstehende Sessions',
      sub:(ctx.own?'Deine anstehenden Termine':'Die nächsten geplanten Coachings im Team')+(c.days?' · nächste '+c.days+' Tage.':'.'),
      items:u.length?u.slice(0,5).map(function(x){return{icon:'ti-calendar-event',text:x.empName+' · '+fd(x.date)};}):[{icon:'ti-calendar-off',text:'Keine geplanten Sessions'}]}];}},
  qa:{label:'QA fällig',desc:'Mitarbeiter mit unter 5 QA-Calls in X Tagen',def:{days:60},build:function(ctx,c){
    var l=wizardQaFaelligList(ctx.scope,c.days);
    return [{type:'stat',icon:'ti-clipboard-check',stat:String(l.length),title:'QA fällig',
      sub:l.length?(ctx.own?l.map(function(e){return e.name;}).join(', ')+' brauchen eine QA-Bewertung.':l.length+' Mitarbeiter mit unter 5 QA-Calls in den letzten '+c.days+' Tagen.'):(ctx.own?'Alle deine Mitarbeiter sind im QA-Ziel.':'Alle Mitarbeiter sind im QA-Ziel.')}];}},
  margeUp:{label:'Margenerhöhung',desc:'Marge im laufenden Monat gegen das Monatsziel',def:{},build:function(){
    var m=wizardMargeInfo();
    return [{type:'stat',icon:'ti-chart-bar',stat:'€ '+Math.round(m.ist).toLocaleString('de-DE'),title:'Margenerhöhung diesen Monat',sub:'Ziel: € '+Math.round(m.ziel).toLocaleString('de-DE')+' · aktuell bei '+m.pct+'% des Monatsziels.'}];}},
  top3:{label:'Top 3',desc:'Die besten 3 der letzten 30 Tage in einer KPI',def:{kpi:'crOEM'},build:function(ctx,c){
    var r=wizRanked(ctx.scope,c.kpi,0).slice(0,3);
    return [{type:'stagerow',title:'Top 3 Mitarbeiter',sub:(c.kpi==='marge'||c.kpi==='opt'?'Summe ':'Ø ')+wizKpiLabel(c.kpi)+' der letzten 30 Tage.',
      boxes:r.length?r.map(function(x){return{n:wizKpiFmt(x.v,c.kpi),l:wizFirst(x.e)};}):[{n:'—',l:'Keine Daten'}]}];}},
  worst3:{label:'Worst 3',desc:'Die schwächsten 3 der letzten 30 Tage in einer KPI',def:{kpi:'crOEM',minOpt:0},build:function(ctx,c){
    var r=wizRanked(ctx.scope,c.kpi,c.minOpt).slice(-3).reverse();
    return [{type:'stagerow',title:'Worst 3 Mitarbeiter',sub:(c.kpi==='marge'||c.kpi==='opt'?'Summe ':'Ø ')+wizKpiLabel(c.kpi)+' der letzten 30 Tage'+(c.minOpt>0?' · ab '+c.minOpt+' Opt.':'')+'.',
      boxes:r.length?r.map(function(x){return{n:wizKpiFmt(x.v,c.kpi),l:wizFirst(x.e)};}):[{n:'—',l:'Keine Daten'}]}];}},
  dist:{label:'Verteilung über Coaches',desc:'Abgeschlossene Coachings je Coach, gesamt',def:{},build:function(){
    // alle, die coachen (Coaches und SDL), ohne Betrachter
    var coachEmps=employees.filter(function(e){return e.active!==false&&isCoachEmp(e);}),cnt={};
    employeeActiveList().forEach(function(e){(protocols[e.id]||[]).forEach(function(p){if(p.status!=='geplant'&&p.coachId)cnt[p.coachId]=(cnt[p.coachId]||0)+1;});});
    var d=coachEmps.map(function(c){return{n:String(cnt[c.id]||0),l:wizFirst(c)};}).sort(function(a,b){return(+b.n)-(+a.n);});
    return [{type:'stagerow',title:'Verteilung über Coaches',sub:'Alle abgeschlossenen Coachings, gesamt.',boxes:d.length?d:[{n:'0',l:'—'}]}];}},
  opt:{label:'Optimierungen',desc:'Optimierungen heute mit Prognose fürs Tagesende',def:{},build:function(){return [{html:buildDailyWizardOpt()}];}},
  margeToday:{label:'Marge',desc:'Marge heute mit Prognose fürs Tagesende',def:{},build:function(){return [{html:buildDailyWizardMarge()}];}},
  cr:{label:'Conversion Rates',desc:'CR des Teams heute und im laufenden Monat',def:{},build:function(){return [{html:buildDailyWizardCr()}];}},
  worstKpi:{label:'Schwächste 3 je KPI',desc:'Marge, CR OEM, TW, SY/MY, MY heute – je eine Slide',def:{minOpt:5},build:function(ctx,c){
    return [['Marge','marge'],['CR OEM','crOEM'],['CR TW','crTW'],['CR SY/MY','crSyMy'],['CR MY','crMY']].map(function(k){return {html:dailyWizardWorstPage(k[0],k[1],c.minOpt)};});}}
};
var WIZ_SLIDE_IDS=['overdue','upcoming','qa','margeUp','top3','worst3','dist','opt','margeToday','cr','worstKpi'];

// ── Ablauf: Seiten bauen, anzeigen, Reihenfolge mehrerer fälliger Wizards ──
var wizRun={w:null,pages:[],i:0,preview:false},wizQueue=[];
setInterval(checkDailyWizard,60000);




// ══ LOCALSTORAGE ══
var LS_KEY='sfp_coaching_v1';

var _restoringBackup=false;
var _dragSessionInfo=null; // {sid, eid}


// ── C
// ── CONSTANTS ──
var COLORS=[{bg:'var(--purple-bg)',text:'var(--purple-dark)'}];
var RATINGS=['Mega Yes','Super Yes','Yes','Teilweise'];
var RS={'Mega Yes':{bg:'#EAF3DE',color:'#27500A'},'Super Yes':{bg:'#EEEDFE',color:'#3C3489'},'Yes':{bg:'#E6F1FB',color:'#0C447C'},'Teilweise':{bg:'#FAEEDA',color:'#633806'}};
var SKILLS=['Needs Analysis','Value Argumentation','Objection Handling','Trust Building','Closing Technique'];
var SK_DE=['Bedarfsermittlung','Nutzenargumentation','Einwandbehandlung','Vertrauensaufbau','Abschlusstechnik'];
var KPI_TARGETS={
  crOEM:     {val:55, dir:'gte', label:'CR OEM'},
  crTeilweise:{val:25, dir:'lte', label:'TW'},
  crSuperYes:{val:12, dir:'gte', label:'SY'},
  crMegaYes: {val:8,  dir:'gte', label:'MY'},
  optPerH:   {val:3.5,dir:'gte', label:'Opt./Std.'}, // B4: Ersatzwert 3,5
};
var CR_GOOD=KPI_TARGETS.crOEM.val;

// ── STATE ──
var teamRange=7;
var teamCustomFrom=null;
var teamCustomTo=null;
var teamPerfMetric='margeGesamt';
var settings={ftpUrl:''};
var view='dashboard', selectedEmp=null, activeTab='performance'; // Start nach dem Öffnen: Dashboard (ohne Zugriff: Übersicht)
var teamFilter='ALL';
var perfMetric='crOEM', perfRange=7;
var perfTableGroup='day'; // 'day' | 'week' | 'month'
var tlFilter='all'; // 'all' | 'session' | 'review' | 'milestone' | 'record'
var _editingSessionId=null; // gesetzt, wenn eine geplante Session im Neue-Session-Modal bearbeitet wird (statt neu anzulegen)
var sessionSelectedEmpIds=[]; // Mehrfachauswahl im Session-planen-Modal (fuer Gruppencoachings)
var sessionEmpDropdownOpen=false;
var sessionEmpSearchQuery='';
var ncSelectedEmpIds=[]; // Mehrfachauswahl im Neue-Session-erfassen-Modal (fuer Gruppencoachings)
var ncEmpDropdownOpen=false;
var ncEmpSearchQuery='';
var perfCustomFrom=null, perfCustomTo=null;
var activeChart=null;

// ── DATA ──
var ratingCriteria=[
  {id:1,name:'Needs Analysis Quality',cat:'Sales',target:80,desc:'How well the rep identifies customer needs'},
  {id:2,name:'Own-Brand Argumentation',cat:'Sales',target:80,desc:'Quality of value proposition for own-brand'},
  {id:3,name:'Objection Handling',cat:'Sales',target:75,desc:'Effectiveness in handling objections'},
  {id:4,name:'Closing Initiative',cat:'Sales',target:75,desc:'Proactively guiding the conversation to a close'},
  {id:5,name:'Customer Rapport',cat:'Communication',target:85,desc:'Building trust and a positive relationship'},
];

var ROLES=['Vertriebsmitarbeiter','Senior Vertriebsmitarbeiter','Sales Coach'];
var GLOBAL_TARGETS=KPI_TARGETS;

var employees=[
  {id:1,name:"Johann Breuer",role:"SE",phase:"Aktiv",color:0,startDate:'2026-01-01',team:"SE",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:2,name:"Dogoro Dembele",role:"SDM",phase:"Aktiv",color:1,startDate:'2026-01-01',team:"SDM",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:3,name:"Thorsten M\u00fcller",role:"SE",phase:"Aktiv",color:2,startDate:'2026-01-01',team:"SE",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:4,name:"Jan Klimmeck",role:"SR",phase:"Aktiv",color:3,startDate:'2026-01-01',team:"SR",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:5,name:"Bianca Sachon",role:"SR",phase:"Aktiv",color:4,startDate:'2026-01-01',team:"SR",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:6,name:"Melanie Murad",role:"SE",phase:"Aktiv",color:5,startDate:'2026-01-01',team:"SE",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:7,name:"Amir Hazaimia",role:"SE",phase:"Aktiv",color:0,startDate:'2026-01-01',team:"SE",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:8,name:"Jenny Weise",role:"SE",phase:"Aktiv",color:1,startDate:'2026-01-01',team:"SE",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:9,name:"Niko Nikolic",role:"SR",phase:"Aktiv",color:2,startDate:'2026-01-01',team:"SR",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:10,name:"Stefan Lang",role:"SR",phase:"Inaktiv",color:3,startDate:'2026-01-01',team:"SR",contract:'Vollzeit',hours:40,active:false,targets:null},
  {id:11,name:"Kathrin Steininger",role:"SC",phase:"Aktiv",color:4,startDate:'2026-01-01',team:"SC",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:12,name:"Duygu Sulaiman",role:"SR",phase:"Aktiv",color:5,startDate:'2026-01-01',team:"SR",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:13,name:"Olti Dragusha",role:"SR",phase:"Aktiv",color:0,startDate:'2026-01-01',team:"SR",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:14,name:"Rafael Muresan",role:"Sales Representative (Valencia)",phase:"Aktiv",color:1,startDate:'2026-01-01',team:"VLC",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:15,name:"Julius Kolbeck",role:"Sales Representative (Valencia)",phase:"Aktiv",color:2,startDate:'2026-01-01',team:"VLC",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:16,name:"Laura Seven",role:"Sales Representative (Valencia)",phase:"Aktiv",color:3,startDate:'2026-01-01',team:"VLC",contract:'Vollzeit',hours:40,active:true,targets:null},
  {id:17,name:"Loris Barbarito",role:"Sales Representative (Valencia)",phase:"Aktiv",color:4,startDate:'2026-01-01',team:"VLC",contract:'Vollzeit',hours:40,active:true,targets:null}
];

var protocols={};
var performance={};


var tasks={};
// ── REVIEWS ──
var reviews={};

var callRatings={}; // {empId: [{id, date, auftragsnr, status, b2b, bewertetVon, scores:{...}, einwand, hinweis}]}
var employeeHistory={}; // {empId: [{id, changedAt, field, oldValue, newValue, changedBy}]}
var goals={}; // {empId: [{id, description, metricKey, targetValue, targetDate, status, createdAt, createdBy}]}
var adminAuditLog=[]; // [{id, changedAt, changedBy, action, details}]
var activityLog=[]; // [{id, createdAt, actorId, category, action, description, targetEmployeeId, targetLabel}]
var employeeDocuments={}; // {empId: [{id, filename, storagePath, description, uploadedBy, uploadedAt}]}
var MONTH_NAMES_ZIEL=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var zielMonth=today().slice(0,7);
var zielStore={};
// C1: Spalte week6 (sql/50) – erst schreiben, wenn sie in der Datenbank existiert
var ZIEL_W6=false;
var zielYearView=today().slice(0,4);
var zielNlTargets={};
// ── Arbeitstage-Kalender: Tage statt reiner KW-Zahlen anklicken, daraus werden die Wochensummen berechnet ──
var _kalenderState=null; // {empId, mk, tage:{'YYYY-MM-DD':true/false}}
var KALENDER_ZYKLUS=['work','off','urlaub','krank'];
// Chart.js-Animation, die die Linie beim ersten Rendern von links nach rechts "einzeichnet" statt
// nur einzublenden (Punkte/Segmente je nach Index leicht zeitversetzt starten lassen), statt der
// reinen Standard-Animation (die von der Grundlinie nach oben wachsen wuerde).
var CHART_DRAWIN_ANIMATION={
  duration:900,
  easing:'easeOutQuart',
  delay:function(ctx){
    if(ctx.type==='data'&&ctx.mode==='default'){
      var n=(ctx.chart.data.labels||[]).length||1;
      return (ctx.dataIndex||0)*(700/n);
    }
    return 0;
  }
};
// Petrol-Tooltip-Standard fuers ganze Board (statt Chart.js-Default-Look) - wird einmal global
// gesetzt und gilt automatisch fuer jedes Chart.js-Diagramm.
if(typeof Chart!=='undefined'){
  Chart.defaults.font.family="'Urbanist',sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor='#1d1c1a';
  Chart.defaults.plugins.tooltip.titleColor='#fff';
  Chart.defaults.plugins.tooltip.titleFont={size:12,weight:'700'};
  Chart.defaults.plugins.tooltip.bodyColor='#fff';
  Chart.defaults.plugins.tooltip.footerColor='#fff';
  Chart.defaults.plugins.tooltip.bodyFont={size:12.5,weight:'500'};
  Chart.defaults.plugins.tooltip.borderColor='rgba(255,255,255,0.08)';
  Chart.defaults.plugins.tooltip.borderWidth=1;
  Chart.defaults.plugins.tooltip.cornerRadius=8;
  Chart.defaults.plugins.tooltip.padding=10;
  Chart.defaults.plugins.tooltip.boxPadding=4;
  // Vertikale Krosshair-Linie an der Hover-Position (nur bei kartesischen Charts mit x/y-Skalen -
  // Radar-Charts haben keine x/y-Skala und werden hier automatisch uebersprungen).
  Chart.register({
    id:'petrolCrosshair',
    afterDatasetsDraw:function(chart){
      var xScale=chart.scales&&chart.scales.x,yScale=chart.scales&&chart.scales.y;
      if(!xScale||!yScale)return;
      var active=chart.getActiveElements?chart.getActiveElements():null;
      if(!active||!active.length)return;
      var x=active[0].element.x;
      var ctx=chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4,4]);
      ctx.lineWidth=1;
      ctx.strokeStyle='rgba(29,28,26,0.275)';
      ctx.moveTo(x,yScale.top);
      ctx.lineTo(x,yScale.bottom);
      ctx.stroke();
      ctx.restore();
    }
  });
}


// ── Menueleiste: Symbolleiste + Panel ──
var SB_AREAS={dashboard:'Dashboard',overview:'Performance',coaching:'Coaching',kalender:'Kalender',aufgaben:'Aufgaben',provision:'Provision',live:'Live',activity:'Aktivitäten',ziel:'Zielvereinbarung',settings:'Einstellungen'};
var _railArea='overview';
try{applySidebarState();}catch(e){}

// ── Live-Ansicht für die Fernseher (live.html mit geheimem Schlüssel, ohne Anmeldung) ──
var LIVE={ort:'',msg:''};
var LIVE_TAB='uebersicht';


// ── Power Hour (bis zu drei pro Tag) + Historie ──
var PHB={loaded:false,loading:false,err:'',date:null,all:[],ticks:{},open:null,msg:''};
var PHB_KPI={opt:'Optimierungen',my:'Mega Yes',marge:'Margenerhöhung',marge_my:'Marge je Mega Yes'};

// ── Figuren der Live-Ansicht (je Agent: Junge/Mädchen, Hautfarbe, Haare, Shirt) ──
var FIG={msg:''};
var FIG_KEYS=[['g','sel'],['s','sel'],['h','sel'],['c','col'],['hc','sel'],['eye','sel'],['unten','sel'],['hose','col'],['schuh','col'],['muster','sel'],['brille','sel'],['hut','sel'],['headset','chk'],['freck','chk'],['ohrringe','chk'],['bart','chk']];

// ── Zeitplan der Popups auf den Fernsehern ──
var ZPB={msg:''};
var ZPB_DEF={dori:{on:true,t:'11:45'},top3:{on:true,t:'17:00',min:2},do:{on:true,t:'14:00',wd:4,min:5},fr:{on:true,t:'09:00',wd:5,min:2},woche:{on:true,t:'12:00',bis:'12:30'},monat:{on:true,t:'12:30',bis:'13:00'}};
var ZPB_ROWS=[['woche','Wochenansicht','alle Werte von Montag bis heute · Popup beim Wechsel',false],['monat','Monatsansicht','alle Werte vom 1. bis heute, mit CR TW und CR SY/MY · Popup beim Wechsel, danach zurück zum Tag',false],['dori','Dori besucht den Letztplatzierten','geht zur Säule mit den wenigsten Optimierungen, rüttelt, bringt einen Tequila',false],
  ['top3','Top 3 des Tages','Treppchen, danach der Margen-Champion',true],
  ['do','Ausgleichstag am Freitag','wer höchstens 20 Optimierungen vom Wochenziel entfernt ist',true],
  ['fr','Endspurt zum Wochenziel','wer beim Wochenziel noch hinterherhängt',true]];
setInterval(liveZieleSync,10*60*1000);setTimeout(liveZieleSync,20000);
var wiegandNavOpen=true;
var coachingNavOpen=false;

// ── Team-Ziele: Durchschnitt der aktuell gueltigen Einzelziele (Stammdaten & Provisionsvereinbarung) ──
// Ersetzt die frueheren „Allgemeinen KPIs“. Mitarbeiter ohne eigenes Ziel (leeres Feld) zaehlen nicht mit.
var TEAM_TARGET_KEYS=['crOEM','crTeilweise','crSuperYes','crMegaYes','optPerH','crSyMy','crYes','anteilOEM'];

// ── Browser-Zurück/Vor innerhalb des Boards ──
// Jede neue Ansicht (Bereich, Mitarbeiter, Reiter, Einstellungen-Unterseite) wird als Verlaufseintrag gemerkt.
// „Zurück“ im Browser springt so in die vorherige Maske des Boards statt aus dem Board heraus.
var _navRestoring=false,_navLastKey=null;
window.addEventListener('popstate',function(ev){
  var st=ev.state&&ev.state.sos;if(!st)return;
  document.querySelectorAll('.modal-ov:not(.hidden)').forEach(function(m){m.classList.add('hidden');});
  _navRestoring=true;
  try{
    view=st.view;
    if(st.wiegandView!=null&&typeof wiegandView!=='undefined')wiegandView=st.wiegandView;
    if(st.selectedEmp!=null)selectedEmp=st.selectedEmp;
    if(st.activeTab!=null)activeTab=st.activeTab;
    if(st.settingsView!=null)settingsView=st.settingsView;
    if(st.coachFilterView!=null)coachFilterView=st.coachFilterView;
    if(typeof bannerViewMode!=='undefined'){
      if(view==='team'&&wiegandView==='ziel')bannerViewMode='ziel';
      else if(view==='team'&&wiegandView==='overview')bannerViewMode='performance';
      else if(view==='dashboard'||view==='provisionTeam')bannerViewMode='overview';
      if(typeof resetBannerRotation==='function')resetBannerRotation();
    }
    renderSidebar();renderMain();
  }finally{_navRestoring=false;_navLastKey=navKeyOf(st);}
});
(function(){var _rm=renderMain;renderMain=function(){var r=_rm.apply(this,arguments);try{navRecord();}catch(e){}return r;};})();
// ── Petrol-Monatsbalken: Conv. OEM / Upsells / WKA / Gesamt für den aktuellen Kalendermonat, teamweit ──
var MONTH_NAMES_DE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

// ── EMP DETAIL ──
var empBannerViewMode='performance'; // eigener Banner-Status fuer die Mitarbeiterseite, komplett unabhaengig vom globalen bannerViewMode

// Bis 11.11.2026: alte Phasen und Gewichtung – damit ältere QA-Bewertungen ihre Punktzahl behalten
var CALL_CATS_V1=[
  {key:'opener',        label:'Einstieg',            short:'Einstieg',   weight:0.05, col:'#F7B39A', fill:'rgba(247,179,154,0.15)',  bg:'rgba(247,179,154,0.18)', items:['intro','ziel']},
  {key:'einwand',       label:'Einwandsentkräftung', short:'Einwand',    weight:0.35, col:'#3a3833', fill:'rgba(29,28,26,0.15)', bg:'rgba(29,28,26,0.10)', items:['qualifizieren','solidarisierung','umgang','entkraeftung','testabschluss','vertrauen']},
  {key:'loop',          label:'Loop',                short:'Loop',       weight:0.10, col:'#F08566', fill:'rgba(29,28,26,0.075)', bg:'rgba(29,28,26,0.05)', items:['dranbleiben']},
  {key:'bedarf',        label:'Bedarfserweiterung',  short:'Bedarf',     weight:0.15, col:'#F08566', fill:'rgba(240,133,102,0.15)',  bg:'rgba(240,133,102,0.12)', items:['quantifizieren','potenzial']},
  {key:'abschluss',     label:'Abschluss',           short:'Abschluss',  weight:0.20, col:'#F59A5B', fill:'rgba(245,154,91,0.15)', bg:'rgba(245,154,91,0.12)', items:['abschlussversuch','angebotsqualitaet','kaufsignale']},
  {key:'gespraech',     label:'Gesprächsführung',    short:'Gespräch',   weight:0.10, col:'#F7A777', fill:'rgba(247,179,154,0.15)',   bg:'rgba(247,179,154,0.15)', items:['struktur','kontrolle','klarheit','fragequalitaet']},
  {key:'zusammenfassung',label:'Zusammenfassung',    short:'Zusammenf.', weight:0.05, col:'#3a3833', fill:'rgba(29,28,26,0.12)', bg:'rgba(29,28,26,0.10)', items:['naechsteschritte']},
];
// Ab der Umstellung (QA_V2_FROM): Einwandsentkräftung bleibt am stärksten, Produktwissen neu
var QA_V2_FROM='2026-11-11';
var CALL_CATS=[
  {key:'opener',        label:'Einstieg',            short:'Einstieg',   weight:0.05, col:'#F7B39A', fill:'rgba(247,179,154,0.15)',  bg:'rgba(247,179,154,0.18)', items:['intro','ziel']},
  {key:'einwand',       label:'Einwandsentkräftung', short:'Einwand',    weight:0.30, col:'#3a3833', fill:'rgba(29,28,26,0.15)', bg:'rgba(29,28,26,0.10)', items:['qualifizieren','solidarisierung','entkraeftung','testabschluss']},
  {key:'loop',          label:'Loop',                short:'Loop',       weight:0.10, col:'#F08566', fill:'rgba(29,28,26,0.075)', bg:'rgba(29,28,26,0.05)', items:['dranbleiben']},
  {key:'bedarf',        label:'Bedarfserweiterung',  short:'Bedarf',     weight:0.15, col:'#F08566', fill:'rgba(240,133,102,0.15)',  bg:'rgba(240,133,102,0.12)', items:['quantifizieren']},
  {key:'produkt',       label:'Produktwissen',       short:'Produkt',    weight:0.05, col:'#C9502F', fill:'rgba(201,80,47,0.12)', bg:'rgba(201,80,47,0.10)', items:['produktnutzen','produktfragen']},
  {key:'abschluss',     label:'Abschluss',           short:'Abschluss',  weight:0.20, col:'#F59A5B', fill:'rgba(245,154,91,0.15)', bg:'rgba(245,154,91,0.12)', items:['abschlussversuch','angebotsqualitaet']},
  {key:'gespraech',     label:'Gesprächsführung',    short:'Gespräch',   weight:0.10, col:'#F7A777', fill:'rgba(247,179,154,0.15)',   bg:'rgba(247,179,154,0.15)', items:['struktur','kontrolle','fragequalitaet']},
  {key:'zusammenfassung',label:'Zusammenfassung',    short:'Zusammenf.', weight:0.05, col:'#3a3833', fill:'rgba(29,28,26,0.12)', bg:'rgba(29,28,26,0.10)', items:['naechsteschritte']},
];
var ITEM_LABELS={
  intro:'Intro / Einstieg',ziel:'Ziel des Calls',
  qualifizieren:'Einwand qualifizieren',solidarisierung:'Solidarisierung',umgang:'Umgang mit Einwand',
  entkraeftung:'Entkräftung',testabschluss:'Testabschluss',vertrauen:'Vertrauen aufbauen',
  dranbleiben:'Re-Opening / Dranbleiben',
  quantifizieren:'Bedarf ermitteln',potenzial:'Potenzial erkennen',
  abschlussversuch:'Abschlussversuch',angebotsqualitaet:'Angebotsqualität',kaufsignale:'Kaufsignale nutzen',
  struktur:'Gesprächsstruktur',kontrolle:'Gesprächskontrolle',klarheit:'Klarheit',fragequalitaet:'Fragequalität',
  naechsteschritte:'Zusammenfassung & nächste Schritte',
  produktnutzen:'Produktnutzen erklären',produktfragen:'Fragen sicher beantworten'
};
// QA-Kategorie: Ø der letzten n Calls vs. Ø der n Calls davor (analog "dieser Monat vs Vormonat")
// QA-Kategorie: Ø über aktive Kollegen der gleichen Rolle (jeweils letzte n Calls)
// QA-Kategorie: letzte 7 Bewertungen chronologisch (für Sparkline)
// QA-Bewertungspflicht: Ziel 4 Calls pro Woche (ab Montag der laufenden Woche). Gibt {due, cnt, target} zurück.
var QA_WEEK_TARGET=4;
var _qaOpenC={at:0,m:null};

// ── SETTINGS ──
// ── AKTIVITÄT: Änderungsprotokoll aller Nutzer ──
var CATEGORY_META={
  session:{label:'SESSION',col:'#F08566',bg:'rgba(29,28,26,0.06)'},
  qa:{label:'QA-BEWERTUNG',col:'#F7A777',bg:'rgba(247,179,154,0.15)'},
  goal:{label:'ZIEL',col:'#F08566',bg:'rgba(240,133,102,0.12)'},
  task:{label:'AUFGABE',col:'var(--amber-dark)',bg:'var(--amber-bg)'},
  eval:{label:'ENTWICKLUNG',col:'#F59A5B',bg:'rgba(245,154,91,0.12)'},
  stammdaten:{label:'STAMMDATEN',col:'var(--red)',bg:'rgba(189,45,41,0.12)'},
  kpi_target:{label:'KPI-ZIEL',col:'var(--purple)',bg:'var(--purple-bg)'},
  employee:{label:'MITARBEITER',col:'var(--red)',bg:'rgba(189,45,41,0.12)'},
  document:{label:'DOKUMENT',col:'var(--text2)',bg:'var(--bg2)'},
  solidroad:{label:'SOLIDROAD',col:'var(--purple)',bg:'var(--purple-bg)'},
  criteria:{label:'QA-KRITERIUM',col:'#F7A777',bg:'rgba(247,179,154,0.15)'},
  login:{label:'ZUGRIFF',col:'var(--text2)',bg:'var(--bg2)'}
};
// ── DASHBOARD (Vertriebskennzahlen) ──
// Banner oben wie auf allen Seiten; darunter Margenerhöhung, OEM · UPS · WKA und Mitarbeiter.
// Alle CR aus Rohzahlen: erst summieren, dann teilen (chartSumsForRange). Der Zeitraum gilt für die ganze Seite.
var dshPeriod='days',dshOpen=null,dshEmpTeam='all';
var DSH_TEAMS=['SE','SR','OB','VLC'],DSH_AREAS=['OEM','UPS','WKA'],DSH_AC=['#5C564F','#A89C8E','#D3C8B6'];
// ── Team-Steckbriefe: Kennzahl wählbar, Kacheln immer gleich hoch ──
var dshKpi='ze',dshKpiOpen=false;
var DSH_KPIS=[
 {k:'ze',l:'Zielerreichung Marge',g:'Ergebnis',u:'%'},{k:'mg',l:'Margenerhöhung',g:'Ergebnis',u:'n€'},
 {k:'akt',l:'Aktivitäten',g:'Produktivität',u:'n'},{k:'oph',l:'Opt./Std.',g:'Produktivität',u:'d'},
 {k:'crG',l:'CR Gesamt',g:'Conversion',u:'%'},{k:'crO',l:'CR OEM',g:'Conversion',u:'%'},{k:'crU',l:'CR UPS',g:'Conversion',u:'%'},{k:'crW',l:'CR WKA',g:'Conversion',u:'%'},
 {k:'tw',l:'CR TW',g:'Upgrade',u:'%',lte:true},{k:'sm',l:'CR SY/MY',g:'Upgrade',u:'%'},{k:'my',l:'CR MY',g:'Upgrade',u:'%'},
 {k:'mG',l:'Ø Marge/Opt. Gesamt',g:'Ø Marge je Optimierung',u:'€'},{k:'mO',l:'Ø Marge/Opt. OEM',g:'Ø Marge je Optimierung',u:'€'},{k:'mU',l:'Ø Marge/Opt. UPS',g:'Ø Marge je Optimierung',u:'€'},{k:'mW',l:'Ø Marge/Opt. WKA',g:'Ø Marge je Optimierung',u:'€'}];
document.addEventListener('mousedown',function(e){if(dshKpiOpen&&!(e.target.closest&&e.target.closest('.dsh-kpick'))){dshKpiOpen=false;if(view==='dashboard')renderDashboard();}});
// ── Box „Teams“: Diagramm (ein Team im Fokus) und Kacheln in einer Box, eigener Zeitraum + Kennzahl ──
var dshTP='week',dshTF='OB';
window.addEventListener('resize',function(){if(view==='dashboard')dshAlignInfo();});
// ── Box „Coaching und Wirkung“: Sessions (bzw. QA-Bewertungen) je Abschnitt, Zielerreichung als Linie, fünf Kacheln ──
var dshCP='week',dshCK='ses';
// ── Plan: Tagesziele je Mitarbeiter aus der Zielvereinbarung, verteilt nach Wochenarbeitszeit ──
// Monatsziel je Mitarbeiter = Einsatztage x Opt./Tag x Marge/Opt.; verteilt auf seine Arbeitstage
// (Kalender aus der Zielvereinbarung, sonst Mo–Fr ohne Feiertage) im Verhältnis seiner Arbeitsstunden.
// Monate ohne Zielvereinbarung nutzen das „Ziel NL“ des Monats, verteilt nach Arbeitstagen (Teamfilter: Anteil nach Arbeitsstunden, B6).
var _dshPlanCache={};

// ── Dashboard-Kachel „Live“: eigene, ruhige Ansicht (Tag / Woche / Monat) aus den Board-Daten ──
var DSH_LIVE='tag',DSH_LIVE_HL='top',DSH_LIVE_STAND=null;
setInterval(dshLivePull,3*60*1000);

// ══ Rollen & Rechte ══════════════════════════════════════════════════════════
// Werte je Bereich und Rolle: 'E' = bearbeiten, 'S' = ansehen, '-' = kein Zugriff. Admins immer 'E'.
var PERM_ROWS=[
  {key:'performance',label:'Dashboard & Performance-Tabelle',group:'Bereiche',fixed:true},
  {key:'ziel',label:'Zielvereinbarung & Ziele',group:'Bereiche',tables:['zielvereinbarung','goals','kpi_targets','employee_kpi_targets'],nav:['nav-team-ziel']},
  {key:'provision',label:'Provision & Gehälter',group:'Bereiche',seeOnly:true,nav:['nav-team-provision'],tabs:['provision']},
  {key:'provCoaches',label:'Provision: auch Coaches sehen',group:'Bereiche',seeOnly:true},
  {key:'salary',label:'Gehälter sehen',group:'Bereiche',seeOnly:true},
  {key:'kalEdit',label:'Abwesenheiten eintragen & genehmigen',group:'Kalender',editOrNone:true,tables:['absences']},
  {key:'kalGrund',label:'Grund der Abwesenheit sehen',group:'Kalender',fixedRole:{coach:'S',viewer:'-'}},
  {key:'kalLate',label:'Verspätungen sehen',group:'Kalender',fixedRole:{coach:'S',viewer:'-'}},
  {key:'provEdit',label:'Provisionsvereinbarung ändern',group:'Verwaltung',editOrNone:true,persons:true},
  {key:'coaching',label:'Coaching-Sessions & Aufgaben',group:'Bereiche',tables:['protocols','tasks'],tabs:['session','tasks']},
  {key:'qa',label:'QA-Bewertungen',group:'Bereiche',tables:['call_ratings','call_rating_scores'],tabs:['call-performance']},
  {key:'dev',label:'Development / Halbjahresgespräch',group:'Bereiche',tables:['reviews','review_kpis'],tabs:['coaching-eval']},
  {key:'activity',label:'Aktivitäten',group:'Bereiche',seeOnly:true,nav:['nav-coaching-activity']},
  {key:'stammdaten',label:'Mitarbeiter anlegen & Stammdaten',group:'Verwaltung',tables:['employees'],tabs:['emp-settings']},
  {key:'histEdit',label:'Bewertungen & Kommentare nachträglich ändern oder löschen',group:'Verwaltung',editOrNone:true},
  {key:'settings',label:'Einstellungen',group:'Verwaltung',adminOnly:true}
];
var PERM_DEFAULT={coach:{salary:'S',kalEdit:'E',provEdit:'-',provCoaches:'-',performance:'S',ziel:'E',provision:'S',coaching:'E',qa:'E',dev:'E',timeline:'E',activity:'S',stammdaten:'E',histEdit:'E',settings:'-'},
                  viewer:{salary:'S',kalEdit:'-',provEdit:'-',provCoaches:'-',performance:'S',ziel:'S',provision:'S',coaching:'S',qa:'S',dev:'S',timeline:'S',activity:'S',stammdaten:'S',histEdit:'-',settings:'-'}};
// ══ Wizards ══════════════════════════════════════════════════════════════════
// Alt-Einstellung des Tagesüberblicks (settings.wizardSettings) bleibt erhalten und wird beim Speichern mitgeführt.
var WIZ_DEFAULT={on:true,time:'13:00',roles:{admin:true,coach:true,viewer:false},slides:{opt:true,marge:true,cr:true,worst:true},minOpt:5};
var wizEdit={id:null,draft:null,dirty:false},wizPick={key:null,top:0,left:0},wizDragIdx=null;
document.addEventListener('mousedown',function(e){
  if(!wizPick.key)return;
  if(e.target.closest&&(e.target.closest('#wizPickPanel')||e.target.closest('[onclick^="wizPickToggle"]')))return;
  wizPickClose();
});
window.addEventListener('scroll',function(){wizPickClose();},true);
// ── PROVISION: komplett eigenstaendige Tabelle, unabhaengig von buildOverviewTab (keine geteilte Zustandsvariable) ──
var provisionMode='month'; // Standard: aktueller Monat // 'month' | 'year' | 'custom'
var provisionCustomMonth=today().slice(0,7);
// ── Provisionsberechnung nach der Provisionsvereinbarung (§2-§5) ──
var WEEKDAY_KEYS=['so','mo','di','mi','do','fr','sa']; // JS getDay(): 0=So,1=Mo,...6=Sa
var DEFAULT_WORK_HOURS={
  mo:{von:'08:30',bis:'18:00',pause:30},di:{von:'08:30',bis:'17:00',pause:30},mi:{von:'08:30',bis:'17:00',pause:30},
  do:{von:'08:30',bis:'17:00',pause:30},fr:{von:'08:30',bis:'16:00',pause:30},sa:{von:'',bis:'',pause:0},so:{von:'',bis:'',pause:0}
};
// ── KPI-Katalog für die Provision (DE). Provisionsrelevant ist, was in pv.kpis steht; alles andere ist „ergänzend“.
var PROV_KPI_CAT=[
  {k:'optH',lbl:'Opt. Gesamt / Std.',dir:'gte',unit:'',step:0.1},
  {k:'crOem',lbl:'CR OEM',dir:'gte',unit:'%'},
  {k:'tw',lbl:'CR TW',dir:'lte',unit:'%'},
  {k:'my',lbl:'CR MY',dir:'gte',unit:'%'},
  {k:'syMy',lbl:'CR SY/MY',dir:'gte',unit:'%'},
  {k:'oemAnteil',lbl:'Anteil OEM',dir:'gte',unit:'%'},
  {k:'crGes',lbl:'CR Ges.',dir:'gte',unit:'%'},
  {k:'crUps',lbl:'CR UPS',dir:'gte',unit:'%'},
  {k:'crWka',lbl:'CR WKA',dir:'gte',unit:'%'},
  {k:'anteilUps',lbl:'Anteil UPS',dir:'gte',unit:'%'},
  {k:'anteilWka',lbl:'Anteil WKA',dir:'gte',unit:'%'},
  {k:'aktivitaeten',lbl:'Aktivitäten / Std.',dir:'gte',unit:'',step:0.1},
  {k:'notReached',lbl:'NE – Nicht erreicht',dir:'lte',unit:'%'},
  {k:'notPossible',lbl:'NM – Nicht möglich',dir:'lte',unit:'%'},
  {k:'notSuccessful',lbl:'NEF – Nicht erfolgreich',dir:'lte',unit:'%'},
  {k:'crYes',lbl:'CR YES',dir:'lte',unit:'%'},
  {k:'sy',lbl:'CR SY',dir:'gte',unit:'%'},
  {k:'optGesamt',lbl:'Opt. Gesamt / Tag',dir:'gte',unit:''},
  {k:'convOEM',lbl:'Conv. OEM / Tag',dir:'gte',unit:''},
  {k:'margeZiel',lbl:'Marge Ziel',dir:'gte',unit:'€',step:10}
];
var PROV_KPI_DEFAULT=['optH','crOem','tw','my','syMy','oemAnteil'];
var PROVISION_DEFAULTS={
  basisProOpt:1.00,divOEM:10000,divUpsell:20000,divWka:20000,
  reduktionProKpi:20,mindestprovision:20,mindestleistungOptH:2.50,
  monat1:{optH:2.00,crOem:45,tw:20,sy:30,my:10,syMy:40,oemAnteil:60,crYes:15,notReached:25,notPossible:15,notSuccessful:15,aktivitaeten:12,convOEM:2,optGesamt:12,margeZiel:1000},
  monat2:{optH:2.50,crOem:50,tw:20,sy:40,my:20,syMy:60,oemAnteil:80,crYes:15,notReached:20,notPossible:15,notSuccessful:15,aktivitaeten:14,convOEM:3,optGesamt:14,margeZiel:1500},
  monat3plus:{optH:3.50,crOem:55,tw:15,sy:40,my:20,syMy:60,oemAnteil:80,crYes:15,notReached:15,notPossible:15,notSuccessful:15,aktivitaeten:16,convOEM:4,optGesamt:16,margeZiel:2000}
};
// Feldweises Zusammenfuehren mit den Standardwerten: fehlt ein einzelnes Feld (z.B. weil nur
// "grundgehalt" explizit gespeichert wurde), greift dafuer trotzdem der jeweilige Standardwert,
// statt bei einem nicht-leeren aber unvollstaendigen Objekt ALLE Standardwerte zu verlieren
// Bonusvereinbarung weWow (Position VLC, Standort Valencia). null = keine Pruefung in diesem Monat
var VLC_PROVISION_DEFAULTS={
  serviceRate:3700,bonusProOpt:0.75,extraPayPct:1,extraPayAbH:62.50,
  monat1:{optH:null,syMy:null,crOem:null,tw:20,my:10,oemAnteil:60},
  monat2:{optH:null,syMy:null,crOem:null,tw:20,my:20,oemAnteil:80},
  monat3plus:{optH:2.5,syMy:70,crOem:60,tw:15,my:20,oemAnteil:80},
  stufen:{optH:{aus1:80,grenze:null,aus2:null},syMy:{aus1:75,grenze:65,aus2:50},crOem:{aus1:75,grenze:55,aus2:0}}
};
// Optionaler Zusatzbetrag je Mitarbeiter und Monat: wird ohne Abzug auf die Provision gerechnet (Einstellung provisionExtra)
// gespeichert in der Tabelle provision_extra (SQL 35); solange es die Tabelle nicht gibt, im Einstellungs-Block
var PROV_EXTRA={},PROV_EXTRA_TABLE=false;
// ── Monatsabschluss der Provision (Tabellen provision_monat / provision_abschluss, SQL 37)
var PROV_CLOSED={},PROV_CLOSED_TABLE=false;
var PROV_FOCUS_TAG={crOem:'OEM',crUps:'UPS',crWka:'WKA',crGes:'GES',oemAnteil:'OEM',anteilUps:'UPS',anteilWka:'WKA'};

// ── Ziel: Bezug Skill · Will · Result (eine Auswahl) ──
var GB={v:'',open:null};
document.addEventListener('mousedown',function(ev){if(!GB.open)return;var c=ev.target&&ev.target.closest?ev.target.closest('.gb-cell'):null;if(!c){GB.open=null;gbRender();}});
var _savingCoachEval=false;

// Setzt die Fokus-KPI automatisch, wenn das gewählte Thema eindeutig einem KPI entspricht
// (z.B. Thema "CR MY" -> Fokus-KPI "crMegaYes"). Verhindert, dass Coachs ein KPI-Thema
// waehlen, aber die separate Fokus-KPI-Auswahl vergessen (-> Impact Coaching bleibt sonst leer).
var TOPIC_TO_METRIC={'CR OEM':'crOEM','CR TW':'crTeilweise','CR SY':'crSuperYes','CR MY':'crMegaYes'};

// ── Neue Session: Was für eine Session · Fokus (Skill · Will · Result, je mehrere) ──
var SF={cat:'Coaching',art:'Einzelcoaching',legacy:null,topics:[],metrics:[],metric:'',hint:'',open:null};
var SF_SKILL=['Einstieg','Einwandsentkräftung','Loop','Bedarfserweiterung','Produktwissen','Abschluss','Gesprächsführung','Zusammenfassung'];
var SF_WILL=['Motivation','Coachability','Zuverlässigkeit','Teamfähigkeit'];
var SF_TOPICS=SF_SKILL.concat(SF_WILL);
var TOPIC_ALIAS={'Einwandsbehandlung':'Einwandsentkräftung','Bedarfsanalyse':'Bedarfserweiterung'};
var SF_REVIEW_KEYS=[['opener','Einstieg'],['einwand','Einwandsentkräftung'],['loop','Loop'],['bedarf','Bedarfserweiterung'],['abschluss','Abschluss'],['gespraech','Gesprächsführung'],['zusammenfassung','Zusammenfassung'],['produkt','Produktwissen'],['motivation','Motivation'],['coach','Coachability'],['zuverl','Zuverlässigkeit'],['team','Teamfähigkeit']];
// Panel schließen bei Klick daneben
document.addEventListener('mousedown',function(ev){if(!SF.open)return;var c=ev.target&&ev.target.closest?ev.target.closest('.sf-cell'):null;if(!c){SF.open=null;sfRender();}});

var _savingSession=false;





var _savingRatingCriterion=false;
var _savingNewTask=false;

// ── Neue Aufgabe mit Art: „Aufgabe“ = freier Task, sonst eine geplante Session (Termin, Coach = Zuständig) ──
var AT_ART='';
var _savingNewEmp=false;
// ══ Mitarbeiter hinzufügen: alle Stammdaten & die Provisionsvereinbarung direkt beim Anlegen ══
var _aeNew=null,_aeHidMain=false;
var _savingNewEmpFull=false;
// ══ Ein Popup für alles: Übersicht · Session · Call · Entwicklung · Kommentar · Task ══
// Die bestehenden Popups bleiben mit allen Feldern und Speicherfunktionen erhalten; sie teilen sich nur eine Leiste
// und werden beim Wechseln ausgeblendet statt geschlossen, damit Eingaben erhalten bleiben.
var PU=[
  {k:'pf',n:'Performance',i:'ti-chart-line',ids:['perfPopModal']},
  {k:'pv',n:'Provision',i:'ti-cash',ids:['provPopModal']},
  {k:'ov',n:'Übersicht',i:'ti-layout-grid',ids:['coachingInfoModal']},
  {k:'se',n:'Coaching',i:'ti-users',ids:['neuesCoachingModal','sessionPlanenModal']},
  {k:'ca',n:'Call',i:'ti-phone',ids:['qaBewertungModal']},
  {k:'en',n:'Mitarbeiterentwicklung',i:'ti-trending-up',ids:['cevModal']},
  {k:'ta',n:'Task',i:'ti-checkbox',ids:['addTaskModal']},
  {k:'es',n:'Einstellungen',i:'ti-settings',ids:['empSetModal']}
];
var PU_OPEN={provPopModal:'openProvPopup',perfPopModal:'openPerfPopup',coachingInfoModal:'openCoachingInfoModal',neuesCoachingModal:'openNeuesCoachingModal',sessionPlanenModal:'openSessionModal',
  qaBewertungModal:'openQaBewertungModal',cevModal:'openCoachingEval',commentModal:'openCommentModal',addTaskModal:'openAddTaskModal',empSetModal:'openEmpSetModal'};
var PU_SUBICONS={cevModal:[['ti-calendar','Datum'],['ti-adjustments-horizontal','Bewertung'],['ti-notes','Notiz']],
  commentModal:[['ti-user','Wer & Wann'],['ti-tag','Art des Kommentars'],['ti-message-circle','Kommentar']]};
var _puState={},_puEmp=null,_puSwitching=false,_puSeVariant='neuesCoachingModal';
// ── Bereich „Performance“: Banner mit den wichtigsten KPIs, Verlauf mit Filter, Marge, KPI-Tabelle ──
var _ppMetric='opt',_ppPeriod='week',_ppEmp=null;
var _atLast=null;
// ── Bereich „Einstellungen“ im gemeinsamen Popup: Stammdaten & Provisionsvereinbarung wie im Reiter, als Flächen ──
var _esEmp=null,_esHidMain=false;

// Deutsche Spaltennamen (CSV) <-> interne Feldnamen (Supabase-Tabelle "performance")
var CSV_COLS=[
  ['Datum','datum'],['Mitarbeiter','mitarbeiter_name'],['Aktivitäten','oem_aktivitaeten'],
  ['Nicht Erreicht','oem_nicht_erreicht'],['Nicht Möglich','oem_nicht_moeglich'],['Nicht Erfolgreich','oem_nicht_erfolgreich'],
  ['Conv. OEM','oem_gesamt'],['Conv. TW','oem_tw'],['Conv. Yes','oem_yes'],['Conv. SY','oem_sy'],['Conv. MY','oem_my'],
  ['Upsells','ups_yes'],['WKA','wka_gesamt_yes'],['Opt. Gesamt','gesamt_optimierungen'],
  ['Marge OEM','oem_margenerhoehung'],['Marge Upsells','ups_margenerhoehung'],['Marge WKA','wka_margenerhoehung'],['Marge Gesamt','gesamt_margenerhoehung']
];
var PERF_COLS='employee_id,date,oem_nicht_erreicht,oem_nicht_moeglich,oem_nicht_erfolgreich,oem_tw,oem_yes,oem_sy,oem_my,ups_yes,wka_gesamt_yes,oem_margenerhoehung,ups_margenerhoehung,wka_margenerhoehung,oem_gesamt,oem_aktivitaeten,gesamt_optimierungen,gesamt_margenerhoehung,gesamt_aktivitaeten,gesamt_nicht_erreicht,gesamt_nicht_moeglich,gesamt_nicht_erfolgreich,ups_nicht_erfolgreich,wka_oem_nicht_erfolgreich,wka_ups_nicht_erfolgreich,wka_oem_beendet,wka_ups_beendet';
// C4: Verlauf der Arbeitszeit mit „gültig ab“ (Tabelle employee_verlauf, SQL 51).
// Fehlt die Tabelle, rechnet das Board wie bisher mit der aktuellen Arbeitszeit (EV_OK=false).
var employeeVerlauf={},EV_OK=false; // {empId:{workHours:[{ab:'YYYY-MM-DD',wert:{mo:{von,bis,pause},…}|null}] aufsteigend}}

var _importingCSV=false;

var _savingFTP=false;
var _savingGroupSession=false;


var _savingSessionPlanen=false;

// ── Session planen: gleiche Auswahl wie „Neue Session“ (Art in einer Reihe, Fokus Skill · Will · Result) ──
var SP={art:'Einzelcoaching',topics:[],metrics:[],open:null};
document.addEventListener('mousedown',function(ev){if(!SP.open)return;var c=ev.target&&ev.target.closest?ev.target.closest('.sp-cell'):null;if(!c){SP.open=null;spRender();}});


var _savingNewGoal=false;
var _uploadingDoc=false;
// Dokumente: Öffnen zeigt Bilder und PDFs direkt im Board, Herunterladen speichert die Datei
var DOC_MIME={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',txt:'text/plain'};
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDocPreview();});
var _deletingEmpDoc=false;
var _savingEmpEinstellungen=false;
var _savingEmpZiele=false;
var _savingProvisionSettings=false;
var esOpenSections={};
var histFilter='all', histShowAll=false, histExpanded={};
var HIST_AREAS={stamm:'Stammdaten',prov:'Provision',kpi:'KPI-Ziele',zeit:'Arbeitszeit'};
// (mitarbeiterDeaktivieren() entfernt - Deaktivierung/Reaktivierung laeuft jetzt sauber ueber die Phase im Stammdaten-Formular)



// ── CALL BEWERTUNG INLINE ──
var _cbScores={};




var _qaBase=null;
var _savingCallBewertung=false;


var _savingCoachingInfoNotiz=false;
document.addEventListener('click',function(e){
  if(!ncEmpDropdownOpen)return;
  if(e.target.closest&&(e.target.closest('#ncEmpDropdownWrap')||e.target.closest('#neuesCoachingModal button[onclick="toggleNcEmpDropdown()"]')))return;
  ncEmpDropdownOpen=false;ncEmpSearchQuery='';renderNcEmpDropdown();
});
document.addEventListener('click',function(e){
  if(!sessionEmpDropdownOpen)return;
  if(e.target.closest&&(e.target.closest('#sessionEmpDropdownWrap')||e.target.closest('#sessionPlanenModal button[onclick="toggleSessionEmpDropdown()"]')))return;
  sessionEmpDropdownOpen=false;sessionEmpSearchQuery='';renderSessionEmpDropdown();
});
var _editingCallRatingId=null,_qaFormCats=null;
document.querySelectorAll('.modal-ov').forEach(function(m){
  var downOnOverlay=false;
  m.addEventListener('mousedown',function(e){downOnOverlay=(e.target===m);});
  m.addEventListener('click',function(e){
    if(e.target===m&&downOnOverlay)m.classList.add('hidden');
    downOnOverlay=false;
  });
});



var _savingZieleGlobal=false;

// ══ Einheitliche Auswahllisten: jedes <select> bekommt automatisch das Design der Auswahlfelder
//    aus der Performance-Tabelle (Knopf + Panel in #EFECE5). Das echte <select> bleibt unsichtbar
//    erhalten, Werte, onchange und alle bestehenden Funktionen laufen unveraendert weiter. ══
(function(){
  if(window._uiSelectInit)return;window._uiSelectInit=true;
  var openFor=null,panel=null;
  function skip(sel){return sel.multiple||sel.classList.contains('perm-sel')||sel.hasAttribute('data-native')||sel.size>1;}
  function curText(sel){var o=sel.options[sel.selectedIndex];return o?o.text:'';}
  function sync(sel){var b=sel._uiBtn;if(!b)return;var t=b.querySelector('.ui-sel-t');if(t)t.textContent=curText(sel)||'—';b.disabled=sel.disabled;b.style.opacity=sel.disabled?'.55':'';}
  window.uiSelectSync=sync;
  function enhance(sel){
    if(sel._uiBtn||skip(sel))return;
    var st=sel.getAttribute('style')||'';
    var auto=/width\s*:\s*auto/.test(st);
    var hm=st.match(/height\s*:\s*(\d+)px/);var fm=st.match(/font-size\s*:\s*([\d.]+)px/);
    var b=document.createElement('button');b.type='button';b.className='ui-sel';
    b.style.cssText='display:'+(auto?'inline-flex':'flex')+';align-items:center;justify-content:space-between;gap:8px;width:'+(auto?'auto':'100%')+';height:'+(hm?hm[1]:38)+'px;padding:0 11px;border:1px solid var(--border2);border-radius:var(--r-md);background:#F7F5F0;color:var(--text);font-family:inherit;font-size:'+(fm?fm[1]:13)+'px;font-weight:'+(auto?500:400)+';cursor:pointer;text-align:left;white-space:nowrap;min-width:0';
    b.innerHTML='<span class="ui-sel-t" style="overflow:hidden;text-overflow:ellipsis"></span><i class="ti ti-chevron-down" style="font-size:12px;color:var(--text3);flex-shrink:0"></i>';
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle(sel);});
    sel._uiBtn=b;sel.style.display='none';
    sel.parentNode.insertBefore(b,sel.nextSibling);
    sync(sel);
  }
  function close(){if(panel){panel.remove();panel=null;}openFor=null;}
  function toggle(sel){if(openFor===sel){close();return;}close();open(sel);}
  function open(sel){
    openFor=sel;
    var r=sel._uiBtn.getBoundingClientRect();
    panel=document.createElement('div');
    var w=Math.max(r.width,220);
    panel.style.cssText='position:fixed;z-index:100000;background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;box-shadow:0 10px 24px rgba(40,32,15,0.16);padding:8px 4px;display:flex;flex-direction:column;width:'+w+'px;max-width:92vw';
    var many=sel.options.length>10;
    var h='';
    if(many)h+='<div style="padding:0 6px 6px"><div style="display:flex;align-items:center;gap:6px;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:8px;padding:6px 8px"><i class="ti ti-search" style="font-size:13px;color:var(--text3)"></i><input class="ui-sel-q" placeholder="Suchen…" style="border:none;background:none;outline:none;font-size:12.5px;width:100%;color:var(--text);height:auto;padding:0"></div></div>';
    h+='<div class="ui-sel-list" style="overflow-y:auto;max-height:300px">';
    var idx=0;
    Array.prototype.forEach.call(sel.children,function(ch){
      if(ch.tagName==='OPTGROUP'){h+='<div class="ui-sel-head" style="font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 4px">'+esc(ch.label||'')+'</div>';Array.prototype.forEach.call(ch.children,function(o){h+=row(o);});}
      else if(ch.tagName==='OPTION')h+=row(ch);
    });
    function row(o){var i=Array.prototype.indexOf.call(sel.options,o);var on=i===sel.selectedIndex;
      if(o.hidden)return '';
      return '<div class="ui-sel-opt" data-i="'+i+'" data-search="'+esc((o.text||'').toLowerCase())+'" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;margin:0 4px;font-size:13px;border-radius:6px;cursor:'+(o.disabled?'default':'pointer')+';color:'+(o.disabled?'var(--text3)':'var(--text)')+';font-weight:'+(on?600:400)+'"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(o.text)+'</span>'+(on?'<i class="ti ti-check" style="font-size:14px;flex-shrink:0"></i>':'')+'</div>';}
    h+='<div class="ui-sel-none" style="display:none;padding:12px;text-align:center;font-size:12px;color:var(--text3)">Keine Treffer</div></div>';
    panel.innerHTML=h;
    document.body.appendChild(panel);
    var ph=panel.offsetHeight,below=window.innerHeight-r.bottom-8;
    var top=(ph>below&&r.top>below)?Math.max(8,r.top-ph-4):r.bottom+4;
    var left=Math.min(r.left,window.innerWidth-w-8);
    panel.style.top=top+'px';panel.style.left=Math.max(8,left)+'px';
    panel.addEventListener('click',function(e){e.stopPropagation();var opt=e.target.closest('.ui-sel-opt');if(!opt)return;var o=sel.options[+opt.dataset.i];if(!o||o.disabled)return;
      var changed=sel.selectedIndex!==+opt.dataset.i;sel.selectedIndex=+opt.dataset.i;close();sync(sel);
      if(changed){sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}));}});
    panel.addEventListener('mouseover',function(e){var o=e.target.closest('.ui-sel-opt');panel.querySelectorAll('.ui-sel-opt').forEach(function(x){x.style.background=x===o?'rgba(29,28,26,0.06)':'transparent';});});
    var q=panel.querySelector('.ui-sel-q');
    if(q){q.addEventListener('input',function(){var v=q.value.toLowerCase().trim(),n=0;panel.querySelectorAll('.ui-sel-opt').forEach(function(x){var hit=!v||x.dataset.search.indexOf(v)>=0;x.style.display=hit?'flex':'none';if(hit)n++;});panel.querySelectorAll('.ui-sel-head').forEach(function(x){x.style.display=v?'none':'block';});panel.querySelector('.ui-sel-none').style.display=n?'none':'block';});setTimeout(function(){q.focus();},0);}
    var cur=panel.querySelector('.ui-sel-opt[data-i="'+sel.selectedIndex+'"]');if(cur)cur.scrollIntoView({block:'nearest'});
  }
  document.addEventListener('click',function(){close();});
  window.addEventListener('scroll',function(e){if(panel&&!panel.contains(e.target))close();},true);
  window.addEventListener('resize',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  // Programmatische Wertaenderungen (sel.value=…) im Knopf nachziehen
  var dv=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
  var di=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'selectedIndex');
  if(dv&&dv.set)Object.defineProperty(HTMLSelectElement.prototype,'value',{configurable:true,get:function(){return dv.get.call(this);},set:function(v){dv.set.call(this,v);if(this._uiBtn)sync(this);}});
  if(di&&di.set)Object.defineProperty(HTMLSelectElement.prototype,'selectedIndex',{configurable:true,get:function(){return di.get.call(this);},set:function(v){di.set.call(this,v);if(this._uiBtn)sync(this);}});
  var dsel=Object.getOwnPropertyDescriptor(HTMLOptionElement.prototype,'selected');
  if(dsel&&dsel.set)Object.defineProperty(HTMLOptionElement.prototype,'selected',{configurable:true,get:function(){return dsel.get.call(this);},set:function(v){dsel.set.call(this,v);var s=this.parentNode&&(this.parentNode.tagName==='SELECT'?this.parentNode:this.parentNode.parentNode);if(s&&s._uiBtn)sync(s);}});
  var dd=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'disabled');
  if(dd&&dd.set)Object.defineProperty(HTMLSelectElement.prototype,'disabled',{configurable:true,get:function(){return dd.get.call(this);},set:function(v){dd.set.call(this,v);if(this._uiBtn)sync(this);}});
  var pending=false;
  function scan(){pending=false;document.querySelectorAll('select').forEach(function(sel){if(!sel._uiBtn)enhance(sel);else sync(sel);});}
  new MutationObserver(function(muts){
    if(pending)return;
    for(var i=0;i<muts.length;i++){var t=muts[i].target;if(panel&&panel.contains(t))continue;pending=true;break;}
    if(pending)requestAnimationFrame(scan);
  }).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
})();
// Ein Popup für alles: Öffnungsfunktionen verbinden
try{puInit();}catch(e){console.warn('puInit',e);}

// ── Teil 2 (früher zweiter <script>-Block) ──
// ── KALENDER: Abwesenheiten, Sessions, Anträge, Urlaubskonto ──
// Daten: Tabelle absences (siehe sql/20_kalender_abwesenheiten.sql), Urlaubskonto in employees.urlaub (je Jahr),
// Sessions aus protocols. Betrachter lesen über absences_team() (Krank/Ausgleich nur als „abwesend“).
var absences=[];
var lateness=[];
var cancelledSessions=[]; // Sessions mit Status „ausgefallen“ (Fand nicht statt) // Verspätungen (art 'verspaetung'), getrennt gehalten: zählen nicht als Abwesenheit // {id,employeeId,art,von,bis,halb,status,verschobenVon,notiz,eingereichtAm,eingereichtVon,entschiedenVon,entschiedenAm}
var KAL={hide:null,fOpen:false,pOpen:false,cview:'woche',view:'monat',cur:null,loc:'ALL',pane:'auto',cpane:'ueb',chf:{},accS:false,accK:false,accW:false,swr:'monat',swAll:false,low:'req',sort:'rest',open:null,drag:null,snap:null,ut:null};
var KAL_MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var KAL_WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
var KAL_ART={urlaub:'Urlaub',flex:'Flex Day',ausgleich:'Ausgleichstag',freistellung:'Freistellung',krank:'Krank',abwesend:'Abwesend',verspaetung:'Verspätung'};
var KAL_CLS={urlaub:'kal-u',flex:'kal-f',ausgleich:'kal-a',freistellung:'kal-fs2',krank:'kal-k',abwesend:'kal-x'};

// ── Feiertage: Bayern für alle, bei Position VLC zusätzlich Spanien / Region Valencia / Stadt Valencia ──
var _kalHolCache={};
var _kalVirt=null,_kalVirtKey='';
var _kalOnIdx=null;
document.addEventListener('mousedown',function(ev){var m=document.getElementById('kalDayMenu');if(m&&!m.contains(ev.target))kalDayMenuClose();if(KAL.pOpen){var w=document.getElementById('kalPlusWrap');if(w&&!w.contains(ev.target)){KAL.pOpen=false;kalRerender();}}});
document.addEventListener('mousedown',function(ev){if(!KAL.fOpen)return;var w=document.getElementById('kalFiltWrap');if(w&&!w.contains(ev.target)){KAL.fOpen=false;kalRerender();}});

// ── Zu planen: Performance Reviews (3/5/11/23 Monate) und Weekly je Agent ohne Session in dieser Woche ──
var KAL_KPIS=[['crOEM','CR OEM'],['crTeilweise','CR TW'],['crSuperYes','CR SY'],['crMegaYes','CR MY'],['crYes','CR YES'],['optPerH','Opt./Std.']];
var KAL_RH={woche:'wöchentlich','2wochen':'alle 2 Wochen',monat:'monatlich'};
var _kalTC={at:0,k:'',v:null};
// Einheitliche, schmale Karten rechts (alle gleich hoch), höchstens 8
var KAL_PANE_MAX=12;

// ── Einstellungen › Kalender ──
var KAL_ARTEN=['Weekly'].concat(Object.keys(COACHING_CATEGORIES).reduce(function(a,c){return a.concat(COACHING_CATEGORIES[c]);},[]).filter(function(x,i,arr){return x!=='Weekly'&&arr.indexOf(x)===i;}));
// ── Formular: Abwesenheit eintragen / bearbeiten ──
var KF=null;
// ── Ein Formular „Abwesenheit eintragen“ für Kalender (KF) und Mitarbeiterkarte (AB.f) ──
var ABS_TILE='background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:10px 12px 12px;margin-bottom:12px';
var ABS_TH='font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);margin-bottom:8px';
document.addEventListener('dragstart',function(ev){var t=ev.target&&ev.target.closest&&ev.target.closest('[draggable=true]');if(!t||(view!=='kalender'&&view!=='coaching'))return;var tp=document.getElementById('kalTip');if(tp)tp.style.display='none';
  KAL.drag=t.dataset.kabs?{k:'abs',id:t.dataset.kabs,from:t.dataset.kfrom}:t.dataset.kses?{k:'ses',id:t.dataset.kses,emp:t.dataset.kemp}:t.dataset.ktask?{k:'task',id:t.dataset.ktask}:null;
  if(KAL.drag){ev.dataTransfer.effectAllowed='move';try{ev.dataTransfer.setData('text/plain','kal');}catch(e){}}});
document.addEventListener('dragover',function(ev){if(!KAL.drag||(view!=='kalender'&&view!=='coaching'))return;var z=ev.target.closest('[data-kslot],[data-kday]');document.querySelectorAll('.kal-over').forEach(function(x){if(x!==z)x.classList.remove('kal-over');});if(!z)return;
  if(KAL.drag.k==='abs'&&z.dataset.kslot)return;ev.preventDefault();z.classList.add('kal-over');var g=document.querySelector('.kal-ghost');
  if(z.dataset.kslot&&KAL.drag.k!=='abs'){var tm=kalSlotTime(z,ev);if(!g){g=document.createElement('div');g.className='kal-ghost';}g.textContent=tm;g.style.top=((timeStrToMin(tm)-480)/60*56)+'px';if(g.parentNode!==z)z.appendChild(g);}else if(g)g.remove();});
document.addEventListener('dragend',function(){KAL.drag=null;document.querySelectorAll('.kal-over').forEach(function(x){x.classList.remove('kal-over');});var g=document.querySelector('.kal-ghost');if(g)g.remove();});
document.addEventListener('drop',function(ev){if(!KAL.drag||(view!=='kalender'&&view!=='coaching'))return;var z=ev.target.closest('[data-kslot],[data-kday]');if(!z)return;ev.preventDefault();var day=z.dataset.kslot||z.dataset.kday,tm=z.dataset.kslot?kalSlotTime(z,ev):null,d=KAL.drag;KAL.drag=null;
  if(d.k==='abs')kalMoveAbs(d.id,d.from,day);else if(d.k==='ses')kalMoveSes(d.emp,d.id,day,tm);else{var t=kalTasks().find(function(x){return x.id===d.id;});if(t)kalPlanSession(t,day,tm);}});
document.addEventListener('click',function(ev){if(KAL.rzDone){KAL.rzDone=false;ev.stopPropagation();return;}if((view!=='kalender'&&view!=='coaching')||!ev.target.closest)return;if(!ev.target.closest('#mainArea'))return;if(view==='coaching'&&!ev.target.closest('.kal-bar,.kal-wv,.kal-mg,.kal-yv,.kal-tlw,.kal-pane'))return;
  var so=ev.target.closest('.kal-sopen');if(so){if(typeof openPlannedSessionFromChip==='function')openPlannedSessionFromChip(so);return;}
  var mo=ev.target.closest('[data-kmonth]');if(mo){KAL.cur=mo.dataset.kmonth;if(kalCtx()==='coach')KAL.cview='monat';else KAL.view='monat';kalRerender();return;}
  var ed=ev.target.closest('[data-kedit]');if(ed){if(kalCanEdit())kalOpenForm(null,null,ed.dataset.kedit);return;}
  if(ev.target.closest('[draggable=true],.kal-tag,button,input,select,a'))return;
  var o=ev.target.closest('[data-kopen]');if(!o||!kalCanEdit())return;
  var hh=null;if(o.dataset.kslot&&typeof kalSlotTime==='function'){var tm=kalSlotTime(o,ev);hh=+String(tm).slice(0,2);}
  if(kalCtx()==='coach')kalPlusGo('ses',o.dataset.kopen,o.dataset.kemp||null,hh);else kalPlusGo('abs',o.dataset.kopen,o.dataset.kemp||null,null);});
document.addEventListener('mousedown',function(ev){var g=ev.target&&ev.target.closest&&ev.target.closest('[data-krz]');
  if(!g&&ev.target&&ev.target.closest){var bk=ev.target.closest('.blk[data-kabs],.kal-ch[data-kabs]');if(bk){var rc=bk.getBoundingClientRect();var cS=bk.classList.contains('s'),cE=bk.classList.contains('e'),zw=bk.classList.contains('blk')?(cS&&cE?rc.width/3:rc.width/2):Math.min(22,rc.width/3);if(ev.clientX>rc.right-zw&&(cE||!bk.classList.contains('blk')))g=bk.querySelector('.kal-rz.r');else if(ev.clientX<rc.left+zw&&(cS||!bk.classList.contains('blk')))g=bk.querySelector('.kal-rz.l');}}
  if(!g||(view!=='kalender'&&view!=='coaching')||!kalCanEdit())return;
  ev.preventDefault();ev.stopPropagation();var tp=document.getElementById('kalTip');if(tp)tp.style.display='none';var edge=g.dataset.krz,host=g.parentElement;
  if(edge==='s'||edge==='e'){var p=(protocols[host.dataset.eid]||[]).find(function(q){return String(q.id)===String(host.dataset.sid);});if(!p)return;
    var st=timeStrToMin(p.uhrzeit),en=p.endUhrzeit?timeStrToMin(p.endUhrzeit):st+45;KAL.rz={k:'ses',edge:edge,host:host,col:host.parentElement,p:p,eid:host.dataset.eid,st:st,en:en,old:{u:p.uhrzeit,e:p.endUhrzeit}};}
  else{var id=host.dataset.kabs||host.dataset.kedit,x=absences.find(function(a){return String(a.id)===String(id);});if(!x)return;KAL.rz={k:'abs',edge:edge,x:x,day:null,old:{von:x.von,bis:x.bis,halb:x.halb}};}
  document.body.style.cursor=(edge==='s'||edge==='e')?'ns-resize':'ew-resize';},true);
document.addEventListener('mousemove',function(ev){var r=KAL.rz;if(!r)return;ev.preventDefault();
  if(r.k==='ses'){var b=r.col.getBoundingClientRect(),m=480+Math.round(((ev.clientY-b.top)/56*60)/15)*15;m=Math.max(480,Math.min(m,20*60));
    if(r.edge==='s')r.st=Math.min(m,r.en-15);else r.en=Math.max(m,r.st+15);
    r.host.style.top=((r.st-480)/60*56).toFixed(0)+'px';r.host.style.height=Math.max(22,(r.en-r.st)/60*56-3).toFixed(0)+'px';var tm=r.host.querySelector('.kal-tm');if(tm)tm.textContent=kalMinStr(r.st)+'–'+kalMinStr(r.en);}
  else{var el=document.elementFromPoint(ev.clientX,ev.clientY),c=el&&el.closest&&el.closest('[data-kday]');document.querySelectorAll('.kal-over').forEach(function(z){if(z!==c)z.classList.remove('kal-over');});
    if(c){var d=c.dataset.kday;if((r.edge==='von'&&d<=r.x.bis)||(r.edge==='bis'&&d>=r.x.von)){r.day=d;c.classList.add('kal-over');}}}});
document.addEventListener('mouseup',function(){var r=KAL.rz;if(!r)return;KAL.rz=null;document.body.style.cursor='';document.querySelectorAll('.kal-over').forEach(function(z){z.classList.remove('kal-over');});KAL.rzDone=true;setTimeout(function(){KAL.rzDone=false;},300);
  if(r.k==='ses'){var p=r.p,nu=kalMinStr(r.st),ne=kalMinStr(r.en),all=kalGroupProtos(p);if(nu===r.old.u&&ne===r.old.e){kalRerender();return;}all.forEach(function(q){q.uhrzeit=nu;q.endUhrzeit=ne;});kalRerender();
    kalSesUpdate(p,{uhrzeit:nu,end_uhrzeit:ne});var e=kalEmp(r.eid);
    kalToast((p.groupId?'Gruppencoaching ('+all.length+')':(p.type||'Session')+(e?' mit '+esc(e.name):''))+': jetzt '+nu+'–'+ne+'.',function(){all.forEach(function(q){q.uhrzeit=r.old.u;q.endUhrzeit=r.old.e;});kalRerender();kalSesUpdate(p,{uhrzeit:p.uhrzeit||null,end_uhrzeit:p.endUhrzeit||null});});return;}
  var x=r.x;if(!r.day||(r.edge==='von'?r.day===x.von:r.day===x.bis)){kalRerender();return;}var was=kalRange(x);if(r.edge==='von')x.von=r.day;else x.bis=r.day;if(x.von!==x.bis)x.halb=false;
  kalRerender();var e2=kalEmp(x.employeeId);sb.from('absences').update({von:x.von,bis:x.bis,halb:x.halb}).eq('id',x.id).then(function(res){if(res&&res.error)alert(kalErrText(res));});
  logActivity('kalender','updated','Abwesenheit geändert: '+KAL_ART[x.art],x.employeeId,(e2?e2.name:'')+' · '+was+' → '+kalRange(x));
  kalToast('<b>'+esc(e2?e2.name:'')+'</b>: '+KAL_ART[x.art]+' jetzt '+kalRange(x)+' ('+kalNf(kalAmt(x))+' T).',function(){x.von=r.old.von;x.bis=r.old.bis;x.halb=r.old.halb;kalRerender();sb.from('absences').update({von:x.von,bis:x.bis,halb:x.halb}).eq('id',x.id).then(function(){});});});
// schwarzes Hover-Feld wie im Performance-Diagramm
document.addEventListener('mouseover',function(ev){var tp=document.getElementById('kalTip');var t=ev.target&&ev.target.closest&&ev.target.closest('[data-ktip]');
  if(!t){if(tp)tp.style.display='none';return;}if(!tp){tp=document.createElement('div');tp.id='kalTip';tp.className='kal-tip';document.body.appendChild(tp);}tp.innerHTML=t.getAttribute('data-ktip');tp.style.display='block';});
document.addEventListener('mousemove',function(ev){var tp=document.getElementById('kalTip');if(tp&&tp.style.display==='block'){var w=tp.offsetWidth,x=ev.clientX+14;if(x+w>innerWidth-8)x=ev.clientX-w-14;tp.style.left=x+'px';tp.style.top=(ev.clientY+16)+'px';}});

// ── ZIELVEREINBARUNG (Entwurf D): Jahr → Monat → Mitarbeiter → KW → Tag in einer Tabelle ──
// Einsatztage ab ZT_KAL_START aus dem Kalender (Arbeitszeit, Feiertage, Abwesenheiten außer Krank), davor wie gespeichert.
// Ziel OS = Σ geplante Tage × Ø Opt. am Wochentag × Ø Marge/Opt. (letzte 3 Monate, neue Agents: Startwerte früherer Starter).
// Festschreiben: Stand je Mitarbeiter in ziel_festschreibung, danach Änderungen nur durch Admins und mit Protokoll (ziel_protokoll).
var ZT_KAL_START='2026-12';
var zielLocks={};      // month -> {am,von,snapshot,...}
var zielProtokoll=[];  // {month,employee_id,feld,alt,neu,grund,von,am}
var ZT={open:{},prot:false,edit:{},alt:false,saved:{}};
// ── Ziel OS ──
var _ztHist={};
var _ztStart={};

// ── Mitarbeiter-Popup: Bereich „Abwesenheit“ (Banner, Kalender zum Eintragen, Team zum Ansehen) ──
var AB={emp:null,mk:null,art:'urlaub',base:null};

// in die Popup-Leiste einhängen (nach „Task“, vor „Einstellungen“)
(function(){if(typeof PU==='undefined')return;if(!PU.some(function(p){return p.k==='ab';})){var i=PU.findIndex(function(p){return p.k==='es';});PU.splice(i<0?PU.length:i,0,{k:'ab',n:'Abwesenheit',i:'ti-calendar',ids:['absPopModal']});}
  PU_OPEN.absPopModal='openAbsPopup';abEnsureModal();try{puInit();}catch(err){console.warn('puInit Abwesenheit',err);}})();

// Strich vor „Verwaltung“ nur zeigen, wenn Aktivitäten oder Einstellungen sichtbar sind
(function(){if(typeof updateRail!=='function'||updateRail._sep)return;var o=updateRail;window.updateRail=function(){var r=o.apply(this,arguments);try{var a=document.getElementById('rail-activity'),b=document.getElementById('rail-settings'),sp=document.getElementById('rail-sep-admin');if(sp){var vis=function(x){return x&&x.style.display!=='none';};sp.style.display=(vis(a)||vis(b))?'':'none';}}catch(e){}return r;};window.updateRail._sep=true;})();

// ── AUFGABEN: Kanban je Person (wie Project OS) und Liste „Meine Aufgaben“ ──
// Aufgaben entstehen automatisch aus Kalender, Zielvereinbarung und Leistungsdaten; „erledigt“ erkennt das Board selbst
// (Antrag entschieden, Session geplant/dokumentiert …). Freie Tasks kommen aus der Tabelle tasks.
// Zuständigkeit (Ziehen in eine andere Spalte) und Kommentare: Tabellen aufgaben_meta / aufgaben_kommentare.
var aufgMeta={},aufgKomm=[],AU={view:'l',drag:null,open:null};
// Personen (Spalten): Admin-Spalte + Coaches/Admins aus den Mitarbeitern
// Feste Reihenfolge der Spalten: Dogoro, Kathrin, Amir, Niklas; weitere Coaches danach alphabetisch
var AUFG_ORDER=['dogoro','kathrin','amir','niklas'];
// Ziehen zwischen den Spalten
document.addEventListener('dragstart',function(ev){var t=ev.target&&ev.target.closest&&ev.target.closest('[data-akey]');if(!t||view!=='aufgaben')return;AU.drag=t.getAttribute('data-akey');t.classList.add('au-drag');try{ev.dataTransfer.setData('text/plain','a');}catch(e){}});
document.addEventListener('dragend',function(){if(view!=='aufgaben')return;AU.drag=null;document.querySelectorAll('.au-drag,.au-over').forEach(function(x){x.classList.remove('au-drag');x.classList.remove('au-over');});});
document.addEventListener('dragover',function(ev){if(!AU.drag||view!=='aufgaben')return;var c=ev.target.closest('[data-acol]');document.querySelectorAll('.au-over').forEach(function(x){if(x!==c)x.classList.remove('au-over');});if(c){ev.preventDefault();c.classList.add('au-over');}});
document.addEventListener('drop',function(ev){if(!AU.drag||view!=='aufgaben')return;var c=ev.target.closest('[data-acol]');if(!c)return;ev.preventDefault();var k=AU.drag;AU.drag=null;if(!kalCanEdit())return;var card=aufgFind(k);if(card&&card.assignee!==c.getAttribute('data-acol'))aufgAssign(k,c.getAttribute('data-acol'));});

var _aufgBT=0;
(function(){if(typeof updateRail!=='function')return;var o=updateRail;window.updateRail=function(){var r=o.apply(this,arguments);aufgBadgeLazy();return r;};window.updateRail._sep=true;})();
(function(){if(typeof atRender!=='function'||atRender._au)return;var o=atRender;window.atRender=function(){var r=o.apply(this,arguments);try{var x=aufgEmpHtml(selectedEmp),el=document.getElementById('atOpen'),n=document.getElementById('atOpenN');if(el)el.innerHTML=x.h;if(n)n.textContent='('+x.n+')';var dn=document.getElementById('atDone');if(dn)dn.innerHTML=aufgEmpDoneHtml(selectedEmp);aufgPuBadge();atBanner();atAssigneeSel();atArtRender();}catch(e){console.warn('Aufgaben in Task',e);}return r;};window.atRender._au=true;})();
(function(){if(typeof puDecorate!=='function'||puDecorate._au)return;var o=puDecorate;window.puDecorate=function(){var r=o.apply(this,arguments);aufgPuBadge();return r;};window.puDecorate._au=true;})();
document.addEventListener('click',function(){if(!AU.hl)return;var m=document.getElementById('addTaskModal');if(m&&m.classList.contains('hidden'))AU.hl=null;},true);
var PU_BAN_AT={cevModal:['en','cevSec1'],neuesCoachingModal:['se','ncSecNew'],sessionPlanenModal:['se','spSecNew'],qaBewertungModal:['ca','qaSecBew'],coachingInfoModal:['ov','ciSecTop']};
// „Neu …“ zum Aufklappen
var PU_COL=['ncSecNew','spSecNew','qaSecBew','cevSec1'];
(function(){if(typeof puDecorate!=='function'||puDecorate._ban)return;var o=puDecorate;window.puDecorate=function(id){var r=o.apply(this,arguments);try{PU_COL.forEach(puCollapse);
  if(id==='neuesCoachingModal'){puColSet('ncSecNew',!!(typeof _editingSessionId!=='undefined'&&_editingSessionId)||!!window._puOpenNew);window._puOpenNew=false;}
  if(id==='sessionPlanenModal')puColSet('spSecNew',!!window._puOpenNew);if(id==='cevModal')puColSet('cevSec1',!!window._puOpenNew||!!(document.getElementById('cevCancelEdit')&&document.getElementById('cevCancelEdit').offsetParent));if(id==='qaBewertungModal')puColSet('qaSecBew',!!window._puOpenNew);
  puBanEnsure(id);setTimeout(function(){try{puBanEnsure(id);}catch(e){}},80);}catch(e){console.warn('Banner',e);}return r;};window.puDecorate._ban=true;window.puDecorate._au=true;})();
// Coaching
var VZ_TOP=[['Einwand',/einwand/i],['Bedarf',/bedarf/i],['Produkt',/produkt/i],['Gespräch',/gespr/i],['Motivation',/motiv/i],['Coachab.',/coachab/i],['CR OEM',/oem/i],['CR SY/MY',/\bSY\b|\bMY\b|super|mega/i]];
// Mitarbeiterentwicklung
var VZ_DIM=[['opener','Einstieg','skill'],['einwand','Einwand','skill'],['loop','Loop','skill'],['bedarf','Bedarf','skill'],['abschluss','Abschluss','skill'],['gespraech','Gespräch','skill'],['zusammenfassung','Zusammenf.','skill'],['produkt','Produkt','skill'],['motivation','Motivation','will'],['coach','Coachab.','will'],['zuverl','Zuverl.','will'],['team','Team','will'],['crOEM','CR OEM','result'],['crTW','CR TW','result'],['crSY','CR SY','result'],['crMY','CR MY','result']];
var VZ_DIM_ALL=VZ_DIM;
var VZ_AT={neuesCoachingModal:['ncSecNew',vzCoaching],qaBewertungModal:['qaSecBew',vzCall],cevModal:['cevSec1',vzDev]};
(function(){if(typeof puDecorate!=='function'||puDecorate._viz)return;var o=puDecorate;window.puDecorate=function(id){var r=o.apply(this,arguments);try{vzEnsure(id);setTimeout(function(){vzEnsure(id);},90);}catch(e){}return r;};window.puDecorate._viz=true;window.puDecorate._ban=true;window.puDecorate._au=true;})();

// ── Heutige Leistungsdaten alle 15 Minuten nachladen (Cronjob füllt die Tabelle laufend) ──
var AUFG_FEHLT_MIN_OVR=null,_perfTodayT=0;
setInterval(function(){var n=new Date(),h=n.getHours();if(h<8||h>19||document.hidden)return;if(Date.now()-_perfTodayT<14*60000)return;perfRefreshToday();},60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-_perfTodayT>14*60000)perfRefreshToday();});

// Team-Ansicht (Kalender und Mitarbeiterkarte): Fadenkreuz – Zeile und Tagesspalte unter der Maus hervorheben
(function(){var cur=null;function clear(){document.querySelectorAll('.kg-row,.kg-col,.kg-x').forEach(function(x){x.classList.remove('kg-row','kg-col','kg-x');});cur=null;}
  document.addEventListener('mouseover',function(ev){var t=ev.target;if(!t||!t.closest)return;var g=t.closest('.kal-tl,.ab-tl');if(!g){if(cur)clear();return;}
    var cell=t;while(cell&&cell.parentElement!==g)cell=cell.parentElement;if(!cell||cell===cur)return;
    var K=g.children,n=0;for(var i=0;i<K.length;i++){if(K[i].classList.contains('hd'))n++;else break;}if(!n)return;
    var idx=Array.prototype.indexOf.call(K,cell),r=Math.floor(idx/n),c=idx%n;clear();cur=cell;if(r===0&&c===0)return;
    for(var j=0;j<K.length;j++){var rr=Math.floor(j/n),cc=j%n;if(r>0&&rr===r&&!K[j].classList.contains('ft'))K[j].classList.add('kg-row');if(c>0&&cc===c)K[j].classList.add('kg-col');}
    if(r>0&&c>0)cell.classList.add('kg-x');},true);
  document.addEventListener('mouseleave',function(){if(cur)clear();});})();

// ══ Karte „Provision“ in der Mitarbeiterkarte (Aufbau wie Übersicht/Performance) ══
var _pvpEmp=null;

