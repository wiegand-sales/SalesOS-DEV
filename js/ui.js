// Sales OS – Bedienung: Menüleiste, Navigation, Auswahlfelder, Banner, Diagramm-Bedienung
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function selectSettingsSub(v){settingsView=v;view='settings';renderSidebar();renderMain();}
// ── Einheitliches Auswahlfeld (Design wie „Mitarbeiter ausgewählt“): Knopf + Panel in #EFECE5 ──
function ddSelectHtml(id,icon,label,items,curVal,pickFn,withSearch){
  var h='<div style="position:relative" onclick="event.stopPropagation()">'
    +'<button type="button" class="btn btn-sm" style="height:34px;padding:0 12px;font-weight:500" onclick="ddToggle(\''+id+'\')"><i class="ti '+icon+'"></i> '+esc(label)+' <i class="ti ti-chevron-down" style="font-size:11px"></i></button>'
    +'<div id="dd_'+id+'" class="dd-panel" style="display:none;position:absolute;top:38px;right:0;z-index:40;background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;box-shadow:0 10px 24px rgba(40,32,15,0.14);width:260px;padding:10px 4px;flex-direction:column">';
  if(withSearch)h+='<div style="padding:0 8px 6px"><div style="display:flex;align-items:center;gap:6px;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:8px;padding:6px 8px">'
    +'<i class="ti ti-search" style="font-size:13px;color:var(--text3)"></i>'
    +'<input placeholder="Suchen…" oninput="ddFilter(\''+id+'\',this.value)" style="border:none;background:none;outline:none;font-size:12.5px;width:100%;color:var(--text);height:auto;padding:0">'
    +'</div></div>';
  h+='<div class="dd-list" style="max-height:280px;overflow-y:auto;padding-top:2px">';
  items.forEach(function(it){
    if(it.head){h+='<div class="dd-head" style="font-size:11px;font-weight:700;color:var(--text3);padding:8px 12px 4px">'+esc(it.head)+'</div>';return;}
    var on=String(it.v)===String(curVal);
    h+='<div class="dd-opt" data-search="'+esc(String(it.l).toLowerCase())+'" onclick="ddPick(\''+id+'\',\''+pickFn+'\',\''+String(it.v).replace(/'/g,"\\'")+'\')" style="display:grid;grid-template-columns:'+(it.role!==undefined?'34px ':'')+'1fr 16px;align-items:center;gap:6px;padding:7px 12px;margin:0 4px;font-size:13px;cursor:pointer;border-radius:6px;white-space:nowrap;color:var(--text);font-weight:'+(on?600:400)+'" onmouseover="this.style.background=\'rgba(29,28,26,0.06)\'" onmouseout="this.style.background=\'transparent\'">'
      +(it.role!==undefined?'<span style="font-size:11px;font-weight:700;color:var(--text3)">'+esc(it.role||'')+'</span>':'')
      +'<span style="overflow:hidden;text-overflow:ellipsis">'+esc(it.l)+'</span>'
      +'<span>'+(on?'<i class="ti ti-check" style="font-size:14px"></i>':'')+'</span></div>';
  });
  h+='<div class="dd-none" style="display:none;padding:12px;text-align:center;font-size:12px;color:var(--text3)">Keine Treffer</div>';
  h+='</div></div></div>';
  return h;
}
function ddToggle(id){
  var el=document.getElementById('dd_'+id);if(!el)return;
  var open=el.style.display==='flex';
  document.querySelectorAll('.dd-panel').forEach(function(p){p.style.display='none';});
  document.querySelectorAll('.dd-raised').forEach(function(c){c.style.zIndex='';c.classList.remove('dd-raised');});
  if(!open){var card=el.closest('.card');if(card){card.style.position='relative';card.style.zIndex='60';card.classList.add('dd-raised');}
    el.style.display='flex';var i=el.querySelector('input');if(i){i.value='';ddFilter(id,'');setTimeout(function(){i.focus();},0);}}
}
function ddFilter(id,q){
  var el=document.getElementById('dd_'+id);if(!el)return;
  q=(q||'').toLowerCase().trim();var n=0;
  el.querySelectorAll('.dd-opt').forEach(function(o){var hit=!q||o.dataset.search.indexOf(q)>=0;o.style.display=hit?'grid':'none';if(hit)n++;});
  el.querySelectorAll('.dd-head').forEach(function(hd){hd.style.display=q?'none':'block';});
  var none=el.querySelector('.dd-none');if(none)none.style.display=n?'none':'block';
}
function ddPick(id,fn,val){
  var el=document.getElementById('dd_'+id);if(el)el.style.display='none';
  document.querySelectorAll('.dd-raised').forEach(function(c){c.style.zIndex='';c.classList.remove('dd-raised');});
  if(typeof window[fn]==='function')window[fn](val);
}

function setOverviewChartMetric(m){overviewChartMetric=m;renderTeam();}
function setOverviewChartEmp(v){overviewChartEmpId=v||null;renderTeam();}
// Punkte des Banner-Karussells (für alle Folien gleich, aktive Folie als breiter Strich)
function bannerDots(active){return _bannerRotationOrder.map(function(m){var on=m===active;return '<div onclick="setBannerViewMode(\''+m+'\')" style="'+(on?'width:20px;height:7px;border-radius:4px;background:#F7B39A':'width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.25)')+';cursor:pointer" title="'+BANNER_TITLES[m]+'"></div>';}).join('');}
function bannerDotsBar(active){return '<div style="display:flex;justify-content:center;gap:8px;position:absolute;bottom:16px;left:0;right:0">'+bannerDots(active)+'</div>';}
function gbVisible(){return employees.filter(function(e){return !e.isPureCoach;});}
// In Kalender und Aufgaben nur den Banner austauschen (die Seite selbst bleibt unberührt: Scroll, Ziehen, offene Leisten)
function bannerSwapInPlace(){if(view!=='kalender'&&view!=='aufgaben'&&view!=='telefonate')return false;var el=document.getElementById('gBan');if(!el)return false;el.outerHTML=buildGlobalBannerHtml(gbVisible());return true;}
function _bannerRotateNext(){
  // Auf der Mitarbeiter-Detailseite wird ein eigenstaendiger Banner gezeigt (nicht der globale) -
  // ein Re-Render hier wuerde nur unnoetig die Seite zuruecksetzen (u.a. Scroll-Position), ohne
  // dass sich optisch etwas Sichtbares aendert. Rotation daher auf diesen Seiten pausieren.
  if(view!=='team'&&view!=='coaching'&&view!=='activity'&&view!=='kalender'&&view!=='aufgaben'&&view!=='telefonate')return;
  var cur=bannerViewMode||'overview';
  var idx=_bannerRotationOrder.indexOf(cur);
  bannerViewMode=_bannerRotationOrder[(idx+1)%_bannerRotationOrder.length];
  if(!bannerSwapInPlace())renderMain();
}
// Idempotent: laeuft die Rotation schon, wird nichts veraendert (sonst wuerde jeder normale
// Re-Render z.B. bei Dateneingaben den 60s-Timer immer wieder zuruecksetzen und er wuerde nie feuern)
function ensureBannerRotation(){
  if(_bannerRotationTimer)return;
  _bannerRotationTimer=setInterval(_bannerRotateNext,60000);
}
// Nur bei manuellem Klick auf einen Karussell-Punkt: Timer bewusst zuruecksetzen, damit der Nutzer
// nach seiner Auswahl die vollen 60s Ruhe hat, bevor automatisch weitergeschaltet wird
function resetBannerRotation(){
  if(_bannerRotationTimer)clearInterval(_bannerRotationTimer);
  _bannerRotationTimer=setInterval(_bannerRotateNext,60000);
}
function setBannerViewMode(m){
  bannerViewMode=m;
  resetBannerRotation();
  if(!bannerSwapInPlace())renderMain();
}
// Petrol-Farbverlauf ueber n Segmente: dunkel -> helles Teal (analog SalesOS stageGradientColor)
// Reines SVG-Donut mit Zentrums-Zahl und Legende (Punkt/Name/Wert/Prozent), analog
// "Wo/Warum wir Kunden verlieren" in SalesOS - kein Chart.js noetig.
function sparkline(values,color,w,h){
  w=w||90;h=h||30;
  values=(values||[]).filter(function(v){return v!==undefined&&v!==null;});
  if(values.length<2)return '<svg width="'+w+'" height="'+h+'"></svg>';
  var min=Math.min.apply(null,values),max=Math.max.apply(null,values);
  var range=max-min||1;
  var step=w/(values.length-1);
  var pad=4;
  var pts=values.map(function(v,i){
    var x=i*step;
    var y=pad+(1-(v-min)/range)*(h-2*pad);
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="display:block"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
// Setzt den Gradient erst NACH dem ersten Chart.js-Render neu, da erst dann die echte
// Zeichenflaeche (chartArea) bekannt ist - vorher war canvas.clientHeight oft 0/zu klein
// und der Verlauf wirkte "zerdrueckt".
function reapplyChartGradient(chart,canvas,a1,a2){
  if(!chart||!chart.data||!chart.data.datasets[0])return;
  var ca=chart.chartArea||{top:0,bottom:canvas.clientHeight||260};
  chart.data.datasets[0].backgroundColor=vGradient(canvas,chart.data.datasets[0].borderColor,a1,a2,ca.top,ca.bottom);
  chart.update('none');
}
function updateRail(){
  var area=view==='live'?'live':view==='telefonate'?'telefonate':view==='aufgaben'?'aufgaben':view==='kalender'?'kalender':view==='dashboard'?'dashboard':view==='settings'?'settings':view==='activity'?'activity':view==='provisionTeam'?'provision':view==='coaching'?'coaching':(view==='team'&&wiegandView==='ziel')?'ziel':view==='team'?'overview':_railArea;
  _railArea=area;
  var MAPID={telefonate:'nav-team-telefonate',aufgaben:'nav-team-aufgaben',kalender:'nav-team-kalender',dashboard:'nav-team-dashboard',overview:'nav-team-overview',coaching:'nav-team-coaching',provision:'nav-team-provision',live:'nav-team-live',activity:'nav-coaching-activity',ziel:'nav-team-ziel',settings:'nav-settings'};
  Object.keys(SB_AREAS).forEach(function(k){
    var b=document.getElementById('rail-'+k);if(!b)return;
    b.classList.toggle('on',k===area&&view!=='emp');
    var src=document.getElementById(MAPID[k]);
    if(src)b.style.display=(src.style.display==='none')?'none':'';
  });
  var t=document.getElementById('sbPanelTitle');if(t)t.textContent=SB_AREAS[area]||'Sales OS';
  var st=document.getElementById('sbPanelSettings'),sf=document.getElementById('sbPanelStaff'),sp=document.getElementById('sbPanelSpacer');
  var showSet=(area==='settings'&&view==='settings');
  if(st){st.style.display=showSet?'':'none';
    if(showSet){var L=[['users','Benutzer'],['roles','Rollen &amp; Rechte'],['kalender','Kalender'],['telefonate','Telefonate'],['wizards','Wizards'],['integrations','Integrationen'],['data','Daten &amp; Backup']];
      st.innerHTML=L.map(function(x){return '<a href="#" class="'+(settingsView===x[0]?'on':'')+'" onclick="selectSettingsSub(\''+x[0]+'\');return false">'+x[1]+'</a>';}).join('');}}
  if(sf)sf.style.display=showSet?'none':'flex';
  if(sp)sp.style.display=showSet?'':'none';
  var ra=document.getElementById('sbRailAvatar'),pa=document.getElementById('sbProfileAvatar'),pn=document.getElementById('sbProfileName');
  if(ra&&pa){ra.textContent=pa.textContent;ra.style.background=pa.style.background;ra.style.color=pa.style.color;ra.title=(pn?pn.textContent:'');}
  var q=document.getElementById('sbEmpSearch');if(q&&q.value)sbFilterEmps(q.value);
}
function sbFilterEmps(q){
  q=String(q||'').trim().toLowerCase();
  document.querySelectorAll('#empList .emp-item').forEach(function(it){var n=(it.querySelector('.emp-name')||{}).textContent||'';it.style.display=(!q||n.toLowerCase().indexOf(q)>=0)?'':'none';});
  document.querySelectorAll('#empList .sb-group-body').forEach(function(b){if(q&&b.style.maxHeight==='0px'||q&&b.style.maxHeight==='0')b.style.maxHeight='none';});
}
function applySidebarState(){
  var c=false;try{c=localStorage.getItem('sfp_sb_panel')==='closed';}catch(e){}
  document.body.classList.toggle('sb-collapsed',c);
  var ic=document.getElementById('sbToggleIcon'),tp=document.getElementById('sbToggleTip'),bt=document.getElementById('sbToggle');
  if(ic)ic.className='ti '+(c?'ti-chevron-right':'ti-chevron-left');
  if(tp)tp.textContent=c?'Menü aufklappen':'Menü zuklappen';
  if(bt)bt.setAttribute('aria-label',c?'Menü aufklappen':'Menü zuklappen');
}
function toggleSidebarPanel(){
  var c=document.body.classList.contains('sb-collapsed');
  try{localStorage.setItem('sfp_sb_panel',c?'open':'closed');}catch(e){}
  applySidebarState();
  if(typeof Chart!=='undefined'&&Chart.instances){setTimeout(function(){Object.values(Chart.instances).forEach(function(ch){try{ch.resize();}catch(e){}});},60);}
}
function sbOpenSearch(){
  if(document.body.classList.contains('sb-collapsed'))toggleSidebarPanel();
  if(view==='settings'){selectWiegandSub('overview');}
  setTimeout(function(){var q=document.getElementById('sbEmpSearch');if(q)q.focus();},30);
}
function renderSidebar(){
  var el=document.getElementById('empList');
  el.innerHTML='';
  document.querySelectorAll('.sb-item').forEach(function(x){x.classList.remove('active');});
  (function(){
    var settingsNavEl=document.getElementById('nav-settings'),settingsSubEl=document.getElementById('settingsSubNav');
    var showSettings=currentUserRole==='admin';
    if(settingsNavEl)settingsNavEl.style.display=showSettings?'':'none';
    if(settingsSubEl&&!showSettings)settingsSubEl.classList.add('hidden');
    if(typeof applyPermsToNav==='function')applyPermsToNav();
  })();
  (function(){
    var avatarEl=document.getElementById('sbProfileAvatar'),nameEl=document.getElementById('sbProfileName'),roleEl=document.getElementById('sbProfileRole');
    if(!avatarEl)return;
    if(currentCoach){
      var c=COLORS[currentCoach.color%COLORS.length];
      avatarEl.style.background=c.bg;avatarEl.style.color=c.text;
      avatarEl.textContent=ini(currentCoach.name);
      nameEl.textContent=currentCoach.name;
      roleEl.textContent=currentCoach.role==='SDM'?'Coach':'Coach';
    } else if(currentAuthUser){
      var adminName=resolveNonEmployeeName(currentAuthUser.email)||'Admin';
      avatarEl.style.background='var(--purple-bg)';avatarEl.style.color='var(--purple)';
      avatarEl.textContent=ini(adminName);
      nameEl.textContent=adminName;
      roleEl.textContent='Admin';
    }
  })();
  var isTeamTab=(view==='team'&&wiegandView==='team');
  if(view==='team'&&!isTeamTab)document.getElementById('nav-team').classList.add('active');
  var ntp=document.getElementById('nav-team-performance');if(ntp)ntp.classList.toggle('active',view==='team'&&wiegandView==='performance');
  var nto=document.getElementById('nav-team-overview');if(nto)nto.classList.toggle('active',view==='team'&&wiegandView==='overview');
  var ntc=document.getElementById('nav-team-coaching');if(ntc)ntc.classList.toggle('active',view==='coaching'&&coachFilterView==='overview');
  var ntz=document.getElementById('nav-team-ziel');if(ntz)ntz.classList.toggle('active',view==='team'&&wiegandView==='ziel');
  var ntt=document.getElementById('nav-team-telefonate');if(ntt)ntt.classList.toggle('active',view==='telefonate');
  var nc=document.getElementById('nav-coaching');if(nc)nc.classList.toggle('active',view==='coaching'||isTeamTab||view==='activity'||view==='provisionTeam');
  var nct=document.getElementById('nav-coaching-team');if(nct)nct.classList.toggle('active',isTeamTab);
  var na=document.getElementById('nav-coaching-activity');if(na)na.classList.toggle('active',view==='activity');
  var ntp=document.getElementById('nav-team-provision');if(ntp)ntp.classList.toggle('active',view==='provisionTeam');
  if(view==='settings')document.getElementById('nav-settings').classList.add('active');
  ['users','integrations','data'].forEach(function(sv){
    var el=document.getElementById('nav-settings-'+sv);if(el)el.classList.toggle('active',view==='settings'&&settingsView===sv);
  });
  // Dynamische Coach-Untermenüpunkte (SDM/SC), ersetzt die frühere horizontale Tab-Leiste in SFP Coaching
  var coachSubEl=document.getElementById('coachingCoachSubItems');
  if(coachSubEl){
    coachSubEl.innerHTML='';
    var coachOrder=['Kathrin','Dogoro','Amir'];
    var coachListSb=employees.filter(function(e){return isCoachEmp(e)&&e.active!==false;}).sort(function(a,b){
      var ia=coachOrder.indexOf(a.name.split(' ')[0]),ib=coachOrder.indexOf(b.name.split(' ')[0]);
      if(ia===-1&&ib===-1)return a.name.localeCompare(b.name,'de');
      if(ia===-1)return 1;
      if(ib===-1)return -1;
      return ia-ib;
    });
    coachListSb.forEach(function(c){
      var d=document.createElement('div');
      d.className='sb-item sb-navsub'+((view==='coaching'&&coachFilterView===c.id)?' active':'');
      d.textContent=c.name.split(' ')[0];
      d.onclick=(function(cid){return function(){setCoachFilterView(cid);};})(c.id);
      coachSubEl.appendChild(d);
    });
  }
  var HIDDEN=[];
  var visible=employees.filter(function(e){return e.active!==false&&HIDDEN.indexOf(e.role)<0&&!e.isPureCoach;});
  // Mitarbeiter in Onboarding-Phase kommen alle in eine Gruppe -- AUSSER VLC (Valencia):
  // VLC wird immer als eigener Standort gefuehrt, unabhaengig vom Onboarding-Status
  var onboardingEmps=visible.filter(function(e){return e.phase==='Onboarding'&&e.role!=='VLC';});
  var aktivEmps=visible.filter(function(e){return e.phase!=='Onboarding'||e.role==='VLC';});
  // Gruppen dynamisch nach Position (role), feste Reihenfolge
  var order=['SE','SR','SDL','VLC','SDM','SDC'];
  var positions=[];
  aktivEmps.forEach(function(e){
    var r=e.role||'Sonstige';
    if(positions.indexOf(r)<0)positions.push(r);
  });
  positions.sort(function(a,b){
    var ai=order.indexOf(a),bi=order.indexOf(b);
    if(ai<0)ai=99;if(bi<0)bi=99;return ai-bi;
  });
  var groups=[];
  positions.forEach(function(pos){
    var members=aktivEmps.filter(function(e){return (e.role||'Sonstige')===pos;});
    if(members.length)groups.push({key:pos,label:pos,members:members});
  });
  if(onboardingEmps.length)groups.push({key:'OB',label:'Onboarding',members:onboardingEmps});
  var CK='sfp_sb_col';
  var col={};try{col=JSON.parse(localStorage.getItem(CK)||'{}');}catch(ex){}
  function saveCol(){try{localStorage.setItem(CK,JSON.stringify(col));}catch(ex){}}
  function empItem(emp){
    var c=COLORS[emp.color%COLORS.length];
    var r=lastRating(emp.id);var rs=r?RS[r]:null;
    var al=checkAlerts(emp.id);
    var d=document.createElement('div');
    d.className='emp-item'+(view==='emp'&&emp.id===selectedEmp?' active':'');
    var alrt=al.length?('<div title="'+al.length+' Performance-Alert'+(al.length!==1?'s':'')+'" style="width:20px;height:20px;border-radius:6px;background:#F08566;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 5px rgba(40,32,15,0.3)"><i class="ti ti-alert-triangle" style="font-size:10px;color:#fff"></i></div>'):'';
    var missingEnd=(emp.active===false&&!emp.endDate)?('<i class="ti ti-calendar-exclamation" title="Vertragsende fehlt" style="font-size:13px;color:var(--red);flex-shrink:0"></i>'):'';
    d.innerHTML='<div class="av" style="width:38px;height:38px;font-size:14px;background:'+c.bg+';color:'+c.text+'">'+ini(emp.name)+'</div>'
      +'<div style="flex:1;min-width:0"><div class="emp-name">'+esc(emp.name)+'</div><div class="emp-role">'+emp.role+'</div></div>'
      +alrt+missingEnd;
    d.onclick=(function(eid){return function(){selectedEmp=eid;view='emp';activeTab='performance';renderSidebar();renderMain();};})(emp.id);
    return d;
  }
  function makeGroup(grp){
    if(!grp.members.length)return;
    var isCol=!!col[grp.key];
    var hdr=document.createElement('div');
    hdr.className='sb-group-header'+(isCol?' collapsed':'');
    hdr.innerHTML=grp.label+' <span style="background:var(--purple-bg);color:var(--purple);border-radius:20px;padding:0 6px;font-size:9px;font-weight:700">'+grp.members.length+'</span><span class="sb-group-arrow">▾</span>';
    var body=document.createElement('div');
    body.className='sb-group-body';
    body.style.maxHeight=isCol?'0':(grp.members.length*52+4)+'px';
    if(!isCol){setTimeout(function(b){return function(){if(b.style.maxHeight!=='0px')b.style.maxHeight='none';};}(body),300);}
    hdr.onclick=(function(k,h,b){return function(){
      col[k]=!col[k];saveCol();
      h.classList.toggle('collapsed',!!col[k]);
      if(col[k]){b.style.maxHeight=b.scrollHeight+'px';requestAnimationFrame(function(){requestAnimationFrame(function(){b.style.maxHeight='0';});});}
      else{b.style.maxHeight='0';requestAnimationFrame(function(){b.style.maxHeight=b.scrollHeight+'px';setTimeout(function(){if(!col[k])b.style.maxHeight='none';},260);});}
    };})(grp.key,hdr,body);
    grp.members.forEach(function(emp){body.appendChild(empItem(emp));});
    el.appendChild(hdr);el.appendChild(body);
  }
  groups.forEach(makeGroup);
  var inactive=employees.filter(function(e){return e.active===false;});
  if(inactive.length)makeGroup({key:'INAKTIV',label:'Inaktiv',members:inactive});
  try{updateRail();}catch(e){console.warn('updateRail',e);}
}
function showView(v){
  view=v;
  if(v!=='team')closeWiegandSubnav();
  if(v!=='settings')closeSettingsSubnav();
  if(v!=='coaching'&&v!=='team'&&v!=='activity')closeCoachingSubnav();
  renderSidebar();renderMain();
}
function selectDashboard(){view='dashboard';wiegandNavOpen=true;bannerViewMode='overview';resetBannerRotation();renderSidebar();renderMain();}
function selectCoachingActivity(){view='activity';wiegandNavOpen=true;bannerViewMode='activity';resetBannerRotation();renderSidebar();renderMain();}

function selectLive(){view='live';bannerViewMode='overview';resetBannerRotation();renderSidebar();renderMain();}
function selectProvisionTeam(){view='provisionTeam';wiegandNavOpen=true;bannerViewMode='overview';resetBannerRotation();renderSidebar();renderMain();}
function closeWiegandSubnav(){
  wiegandNavOpen=false;
  var sub=document.getElementById('wiegandSubNav');if(sub)sub.classList.add('hidden');
  var chev=document.getElementById('wiegandNavChevron');if(chev)chev.className='ti ti-chevron-down';
}
function closeSettingsSubnav(){
  settingsNavOpen=false;
  var sub=document.getElementById('settingsSubNav');if(sub)sub.classList.add('hidden');
  var chev=document.getElementById('settingsNavChevron');if(chev)chev.className='ti ti-chevron-down';
}
function closeCoachingSubnav(){
  coachingNavOpen=false;
  var sub=document.getElementById('coachingSubNav');if(sub)sub.classList.add('hidden');
  var chev=document.getElementById('coachingNavChevron');if(chev)chev.className='ti ti-chevron-down';
}
function toggleWiegandNav(){
  wiegandNavOpen=!wiegandNavOpen;
  var sub=document.getElementById('wiegandSubNav');if(sub)sub.classList.toggle('hidden',!wiegandNavOpen);
  var chev=document.getElementById('wiegandNavChevron');if(chev)chev.className='ti ti-chevron-'+(wiegandNavOpen?'up':'down');
  if(wiegandNavOpen){closeSettingsSubnav();closeCoachingSubnav();}
  if(wiegandView==='team')wiegandView='overview'; // 'team' gehoert jetzt zu SFP Coaching, nicht mehr zu SFP Wiegand
  selectWiegandSub(wiegandView);
}
function selectWiegandSub(v){wiegandView=v;view='team';if(v==='ziel'){bannerViewMode='ziel';resetBannerRotation();}if(v==='overview'){bannerViewMode='performance';resetBannerRotation();}renderSidebar();renderMain();}
function renderMain(){recomputeTeamTargets();if(view==='dashboard'){var _nd=document.getElementById('nav-team-dashboard');if(_nd&&_nd.style.display==='none'){view='team';wiegandView='overview';renderSidebar();}}if(view==='dashboard')renderDashboard();else if(view==='team')renderTeam();else if(view==='coaching'){view='kalender';renderKalender();}else if(view==='activity')renderActivity();else if(view==='provisionTeam')renderProvisionTeam();else if(view==='settings')renderEinstellungen();else if(view==='kalender')renderKalender();else if(view==='aufgaben')renderAufgaben();else if(view==='live')renderLive();else if(view==='telefonate')renderTelefonate();else renderEmpDetail();}
function navState(){return {view:view,wiegandView:typeof wiegandView!=='undefined'?wiegandView:null,selectedEmp:typeof selectedEmp!=='undefined'?selectedEmp:null,activeTab:typeof activeTab!=='undefined'?activeTab:null,settingsView:typeof settingsView!=='undefined'?settingsView:null,coachFilterView:typeof coachFilterView!=='undefined'?coachFilterView:null};}
function navKeyOf(st){
  // nur die fuer die jeweilige Ansicht relevanten Teile vergleichen
  var k={view:st.view};
  if(st.view==='team')k.w=st.wiegandView;
  if(st.view==='emp'){k.e=st.selectedEmp;k.t=st.activeTab;}
  if(st.view==='settings')k.s=st.settingsView;
  if(st.view==='coaching')k.c=st.coachFilterView;
  return JSON.stringify(k);
}
function navRecord(){
  if(_navRestoring||!window.history||!history.pushState)return;
  if(typeof currentUserRole!=='undefined'&&!currentUserRole)return;
  var st=navState(),k=navKeyOf(st);
  if(k===_navLastKey)return;
  try{if(_navLastKey===null)history.replaceState({sos:st},'');else history.pushState({sos:st},'');}catch(e){}
  _navLastKey=k;
}

function openModal(id){document.getElementById(id).classList.remove('hidden');}
function closeModal(id){document.getElementById(id).classList.add('hidden');}
// Hinweise an den Menü-Icons (Entwurf A): Zahl oben rechts, nur wenn etwas offen ist
function railSetBadge(id,n,tip){var b=document.getElementById(id);if(!b)return;b.classList.toggle('au-badge',n>0);b.setAttribute('data-n',n>9?'9+':String(n));var t=b.querySelector('.rl-tip');if(t){if(!t.dataset.base)t.dataset.base=t.textContent;t.textContent=t.dataset.base+(n>0?' · '+n+' '+tip:'');}}
