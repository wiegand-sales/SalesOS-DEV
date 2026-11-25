// Sales OS – Kern: Supabase, Anmeldung, Rechte, Laden der Daten, Hilfsfunktionen
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).


// Zeigt einen kurzen Hinweis, wenn ein Viewer versucht etwas zu speichern/löschen
function showViewerBlockedToast(){
  var el = document.getElementById('viewerToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'viewerToast';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--teal-dark);color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 10px 24px rgba(0,0,0,.25);opacity:0;transition:opacity .3s ease;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.innerHTML='<i class="ti ti-eye" style="margin-right:6px"></i>Nur Ansicht – Änderungen werden nicht gespeichert';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.style.opacity = '0'; }, 2600);
}
// Simuliert eine erfolgreiche, aber wirkungslose Supabase-Antwort (kein Netzwerk-Aufruf).
// Gibt bei .single()/.maybeSingle() ein LEERES OBJEKT zurück (nicht null!), da aufrufender
// Code danach oft res.data.irgendfeld ausliest (z.B. r.id) - null wuerde dort abstuerzen.
// Ohne .single() wird ein leeres ARRAY zurückgegeben (passt zu .forEach()/.map()-Mustern).
function _viewerBlockedQuery(){
  var usedSingle=false;
  var noop = {
    select:function(){return noop;}, eq:function(){return noop;}, neq:function(){return noop;},
    order:function(){return noop;}, range:function(){return noop;}, in:function(){return noop;},
    single:function(){usedSingle=true;return noop;}, maybeSingle:function(){usedSingle=true;return noop;},
    then:function(res,rej){ return Promise.resolve({data:usedSingle?{}:[],error:null}).then(res,rej); },
    catch:function(){return noop;}
  };
  return noop;
}
// sb: wie der rohe Supabase-Client, blockiert aber Insert/Update/Upsert/Delete zentral,
// wenn die eingeloggte Person Rolle 'viewer' hat. Betrifft dadurch automatisch JEDE
// Speicherfunktion im Code, ohne dass einzelne Stellen angepasst werden müssen.
// storageFrom() sichert genauso den Datei-Upload/-Löschen (sb.storage.from(bucket).upload/remove/...) ab -
// sonst könnte ein Viewer über die Storage-API die Datenbank-Sperre umgehen.
function _viewerBlockedStorage(){
  return { data:null, error:null };
}

function logout(){
  sb.auth.signOut().then(function(){
    location.reload();
  });
}

function openLoginPanel(){
  var tag=document.getElementById('loginHeroTag');
  if(tag){
    tag.style.opacity='0';
    setTimeout(function(){tag.innerHTML='Schön, dich wiederzusehen.';tag.style.opacity='1';},200);
  }
  document.getElementById('auth-gate').classList.add('panel-open');
  setTimeout(function(){var el=document.getElementById('auth-email');if(el)el.focus();},50);
}
function closeLoginPanel(){
  document.getElementById('auth-gate').classList.remove('panel-open');
  var tag=document.getElementById('loginHeroTag');
  if(tag){
    tag.style.opacity='0';
    setTimeout(function(){tag.innerHTML='Sales Coaching, einfach gemacht.';tag.style.opacity='1';},200);
  }
}
function loginWithPassword(){
  var email = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  var msg = document.getElementById('auth-msg');
  function showMsg(text,cls){msg.textContent=text;msg.className='login-message '+cls;msg.style.display='block';}
  if(!email || !password){ showMsg('Bitte E-Mail und Passwort eingeben.','login-message-info'); return; }
  showMsg('Anmelden…','login-message-info');
  window._freshLoginClick=true;
  sb.auth.signInWithPassword({ email: email, password: password }).then(function(res){
    if(res.error){ showMsg('Fehler: ' + res.error.message,'login-message-error'); }
    // Bei Erfolg uebernimmt onAuthStateChange den Rest (initAppAfterLogin)
  });
}

// employees aus Supabase laden und ins bestehende App-Format uebersetzen
function loadEmployeesFromSupabase(){
  return sb.from('employees').select('*').order('name').then(function(res){
    if(res.error){ console.warn('employees load failed:', res.error); return false; }
    employees = res.data.map(function(e){
      return {
        id: e.id, name: e.name, role: e.role==='SC'?'SDC':e.role, phase: e.phase, sdlTeam: Array.isArray(e.sdl_team)?e.sdl_team.map(String):[],
        color: e.color_index, startDate: e.start_date, endDate: e.end_date || null,
        team: e.team, contract: e.contract, hours: e.hours, active: e.active,
        auth_user_id: e.auth_user_id || null, notes: e.notes || '',
        isPureCoach: e.is_pure_coach===true||e.role==='KAL', kalOnly: e.role==='KAL', funktion: e.funktion||null, stufe: e.stufe||null, standort: e.standort||null, imKalender: e.im_kalender==null?null:!!e.im_kalender, inProvision: e.in_provision==null?null:!!e.in_provision, boardRole: e.board_role||null, provisionSettings: e.provision_settings || {}, email: e.email || '', workHours: e.work_hours || null, urlaub: e.urlaub || {}
      };
    });
    // Funktion · Stufe · Standort sind die Wahrheit (SQL 42); die alte Position wird daraus berechnet
    employees.forEach(function(e){if(!e.funktion)return;e.role=personRoleCode(e.funktion,e.stufe,e.standort||'MUC');e.kalOnly=e.role==='KAL';if(e.kalOnly)e.isPureCoach=true;});
    return loadSalariesFromSupabase();
  });
}
// Coach im Board: gesetzte Board-Rolle geht vor (Coach = ja, Betrachter/Agent = nein), sonst wie bisher nach Position
function isCoachEmp(e){ if(!e||e.kalOnly)return false; if(e.boardRole==='coach')return true; if(e.boardRole==='viewer'||e.boardRole==='agent'||e.boardRole==='none')return false; return !!(e.isPureCoach||e.role==='SDC'||e.role==='SDM'||e.role==='SDL'); }
// SDL (Sales Department Lead): sieht Provision und Gehalt nur von sich und seinem Team (Stammdaten › Team)
function isSdlUser(){return currentUserRole==='coach'&&!!currentCoach&&currentCoach.role==='SDL';}
function canSeeSalary(emp){if(!emp||!isSdlUser())return true;var id=String(emp.id);return id===String(currentCoach.id)||(currentCoach.sdlTeam||[]).indexOf(id)>=0;}
function loadSalariesFromSupabase(){return sb.from('employee_salary').select('*').then(function(res){
  if(res.error){SALARY_TABLE=false;console.warn('employee_salary (SQL 29 ausgeführt?)',res.error);return true;}
  SALARY_TABLE=true;var by={};(res.data||[]).forEach(function(r){by[String(r.employee_id)]=r;});
  employees.forEach(function(e){var r=by[String(e.id)];var pv=e.provisionSettings||(e.provisionSettings={});delete pv.grundgehalt;delete pv.agSozialabgaben;
    if(r){if(r.grundgehalt!=null)pv.grundgehalt=+r.grundgehalt;if(r.ag_sozialabgaben!=null)pv.agSozialabgaben=+r.ag_sozialabgaben;}});
  return true;}).catch(function(e){SALARY_TABLE=false;console.warn('employee_salary',e);return true;}).then(function(){return typeof loadProvExtra==='function'?loadProvExtra():true;}).then(function(){return typeof loadProvClosed==='function'?loadProvClosed():true;});}
function personFn(e){if(!e)return 'agent';if(e.funktion)return e.funktion;var r=e.role;return r==='SDL'?'sdl':(r==='SDC'||r==='SDM')?'coach':r==='KAL'?'am':'agent';}
function personStufe(e){if(!e)return '';if(e.stufe)return e.stufe;return (e.role==='SR'||e.role==='SE'||e.role==='SDC'||e.role==='SDM')?e.role:'';}
function personOrt(e){if(!e)return 'MUC';if(e.standort)return e.standort;return e.role==='VLC'?'VLC':'MUC';}
function personFnLabel(e){var f=personFn(e),l=(PERSON_FN.filter(function(x){return x[0]===f;})[0]||['',''])[1],st=personStufe(e);return l+(st&&(f==='agent'||f==='coach')?' · '+st:'');}
function personRoleCode(fn,stufe,ort){if(fn==='agent')return ort==='VLC'?'VLC':(stufe==='SE'?'SE':'SR');if(fn==='sdl')return 'SDL';if(fn==='coach')return stufe==='SDM'?'SDM':'SDC';return 'KAL';}
function esPersonSync(){var f=document.getElementById('es-fn'),st=document.getElementById('es-stufe'),o=document.getElementById('es-ort'),r=document.getElementById('es-role');if(!f||!r)return;
  var fn=f.value,wrap=document.getElementById('es-stufe-wrap');if(st){var opts=fn==='agent'?[['SR','SR'],['SE','SE']]:fn==='coach'?[['SDC','SDC'],['SDM','SDM']]:[];var cur=st.value;st.innerHTML=opts.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+x[1]+'</option>';}).join('');if(wrap)wrap.style.display=opts.length?'':'none';}
  var code=personRoleCode(fn,st?st.value:'',o?o.value:'MUC');if(![].some.call(r.options,function(x){return x.value===code;})){var op=document.createElement('option');op.value=code;op.text=code;r.add(op);}r.value=code;
  if(typeof esSdlToggle==='function')esSdlToggle(code);if(typeof toggleProvisionModel==='function')toggleProvisionModel(code);}
function esSdlToggle(v){var b=document.getElementById('es-sdl-team');if(b)b.style.display=v==='SDL'?'':'none';}
function positionRole(p){ if(p.role==='KAL')return 'Kein Zugang'; return (p.isPureCoach||p.role==='SDC'||p.role==='SDM'||p.role==='SDL')?'Coach':'Sales Agent'; }
function personRole(p){ if(p.kind==='app') return p.role==='admin'?'Admin':'Betrachter'; if(p.boardRole&&BOARD_ROLE_LABEL[p.boardRole]) return BOARD_ROLE_LABEL[p.boardRole]; return positionRole(p); }
function updateEmpBoardRole(sel){
  var emp=employees.find(function(e){return String(e.id)===String(sel.dataset.eid);});if(!emp)return;
  var v=sel.value||null,old=emp.boardRole||null;
  if(v===old)return;
  if(v==='admin'&&!confirm(emp.name+' bekommt Admin-Rechte und darf damit alles im Board sehen und ändern. Fortfahren?')){renderMain();return;}
  emp.boardRole=v;renderMain();
  sb.from('employees').update({board_role:v}).eq('id',emp.id).then(function(res){
    if(res.error){
      emp.boardRole=old;renderMain();
      alert(/board_role/i.test(res.error.message||'')?'Die Spalte „Board-Rolle“ fehlt noch in der Datenbank. Bitte zuerst 07_board_rolle.sql ausführen.':'Fehler beim Speichern: '+res.error.message);
      return;
    }
    logActivity('employee','role_changed','Board-Rolle geändert: '+(old?BOARD_ROLE_LABEL[old]:'aus Position')+' → '+(v?BOARD_ROLE_LABEL[v]:'aus Position'),emp.id,emp.name);
  });
}
// ── Schalter je Person: „Im Urlaubskalender“ / „In Provision“ (Spalten im_kalender / in_provision, leer = Standard nach Position)
function isAgentEmp(e){return !!e&&!e.isPureCoach&&e.role!=='SDC'&&e.role!=='SDM'&&e.role!=='KAL';}
function kalFlag(e){if(!e||e.active===false)return false;if(isAgentEmp(e))return true;if(e.imKalender!=null)return e.imKalender;if(e.funktion==='none'||e.boardRole==='viewer')return false;return !!(e.kalOnly||e.role==='SDC'||e.role==='SDM'||(e.isPureCoach&&e.boardRole!=='viewer'));}
function provFlag(e){if(!e||e.active===false)return false;if(isAgentEmp(e))return true;if(e.inProvision!=null)return e.inProvision;return e.role==='SDC'||e.role==='SDM';}
function personEmp(p){if(!p)return null;if(p.kind==='emp')return kalEmp(p.id);var n=String(p.name||'').trim().toLowerCase();return employees.find(function(e){return String(e.name||'').trim().toLowerCase()===n;})||null;}
function personSwitch(p,flag){var e=personEmp(p),ag=e&&isAgentEmp(e),on=e?(flag==='kal'?kalFlag(e):provFlag(e)):false,lock=ag||currentUserRole!=='admin'||(flag==='prov'&&!e);
  return '<button type="button" class="psw'+(on?' on':'')+(lock?' lock':'')+'" role="switch" aria-checked="'+on+'" title="'+(ag?'Bei Sales Agents immer an':flag==='prov'&&!e?'Erst im Urlaubskalender anlegen':flag==='kal'?'Im Urlaubskalender anzeigen':'In der Provisionsübersicht anzeigen')+'"'+(lock?' disabled':' onclick="personToggle(\''+p.kind+'\',\''+p.id+'\',\''+flag+'\')"')+'></button>';}
function personToggle(kind,id,flag){if(currentUserRole!=='admin')return;var p=allPersons().find(function(x){return x.kind===kind&&String(x.id)===String(id);});if(!p)return;var e=personEmp(p);
  var col=flag==='kal'?'im_kalender':'in_provision',key=flag==='kal'?'imKalender':'inProvision';
  if(!e){if(flag!=='kal')return;var pay={name:p.name,role:'KAL',phase:'Aktiv',team:'Deutschland',contract:'full',hours:40,active:true,color_index:0,im_kalender:true};
    sb.from('employees').insert(pay).select().single().then(function(res){if(res.error){alert(/im_kalender/.test(res.error.message||'')?'Bitte zuerst 40_personen_schalter.sql ausführen.':'Fehler: '+res.error.message);return;}
      logActivity('employee','created',p.name+' in den Urlaubskalender aufgenommen');location.reload();});return;}
  var nv=!(flag==='kal'?kalFlag(e):provFlag(e)),old=e[key];e[key]=nv;renderMain();var upd={};upd[col]=nv;
  sb.from('employees').update(upd).eq('id',e.id).then(function(res){if(res&&res.error){e[key]=old;renderMain();alert(/im_kalender|in_provision/.test(res.error.message||'')?'Bitte zuerst 40_personen_schalter.sql ausführen.':'Fehler beim Speichern: '+res.error.message);return;}
    logActivity('employee','updated',e.name+': '+(flag==='kal'?'Urlaubskalender':'Provision')+' '+(nv?'an':'aus'),e.id,e.name);});}
function allPersons(){
  var list=appUsers.map(function(u){return {kind:'app',id:u.id,name:u.name,email:u.email,role:u.role,authUserId:u.authUserId,sub:''};});
  employees.forEach(function(e){ if(e.role==='KAL'&&appUsers.some(function(u){return String(u.name||'').trim().toLowerCase()===String(e.name||'').trim().toLowerCase();}))return; list.push({kind:'emp',id:e.id,name:e.name,email:e.email||'',role:e.role,isPureCoach:e.isPureCoach,boardRole:e.boardRole||null,active:e.active,authUserId:e.auth_user_id||null,sub:(e.role||'')+(e.active===false?' · inaktiv':'')}); });
  return list;
}
function loadLoginInfo(){
  if(loginInfoLoading||currentUserRole!=='admin')return;
  loginInfoLoading=true;
  var to=new Promise(function(_,rej){setTimeout(function(){rej(new Error('Zeitüberschreitung'));},12000);});
  Promise.race([sb.functions.invoke('agent-login',{body:{action:'list'}}),to]).then(function(res){
    loginInfoLoading=false;
    if(res.error||!res.data||!res.data.users){
      loginInfo={error:true,msg:(res.data&&res.data.error)||(res.error&&res.error.message)||'keine Antwort'};
      if(res.error&&res.error.context&&typeof res.error.context.status!=='undefined') loginInfo.msg+=' (Status '+res.error.context.status+')';
    }
    else { var m={}; res.data.users.forEach(function(u){ if(u.email) m[u.email.toLowerCase()]=u; m['id:'+u.id]=u; }); loginInfo=m; }
    if(view==='settings'&&settingsView==='users')renderMain();
  }).catch(function(e){ loginInfoLoading=false; loginInfo={error:true,msg:e&&e.message}; if(view==='settings'&&settingsView==='users')renderMain(); });
}
function loginOf(p){
  if(!loginInfo||loginInfo.error) return null;
  return (p.authUserId&&loginInfo['id:'+p.authUserId])||(p.email&&loginInfo[p.email.toLowerCase()])||false;
}
function loadAppUsersFromSupabase(){
  return sb.from('app_users').select('*').then(function(res){
    if(res.error){console.warn('app_users load failed:',res.error);return false;}
    appUsers=(res.data||[]).map(function(r){return {id:r.id,authUserId:r.auth_user_id,email:r.email,name:r.name,role:r.role};});
    return true;
  });
}
function resolveCurrentCoach(){
  return sb.auth.getUser().then(function(res){
    var uid = res.data && res.data.user ? res.data.user.id : null;
    var email = res.data && res.data.user ? res.data.user.email : null;
    currentAuthUser = uid ? {id:uid,email:email} : null;
    if(!uid){currentCoach=null;currentUserRole=null;return;}
    var match = employees.find(function(e){return e.auth_user_id===uid;});
    currentCoach = match || null;
    coachFilterView = currentCoach ? currentCoach.id : 'overview';
    // Rolle wie in der Datenbank (board_role()): zuerst app_users (Login-ID oder Mail ohne Groß-/Kleinschreibung, Admin vor Betrachter),
    // dann employees.board_role, dann die Position.
    var lm=String(email||'').toLowerCase();
    var auAll=appUsers.filter(function(u){return (uid&&u.authUserId===uid)||(lm&&String(u.email||'').toLowerCase()===lm);});
    var au=auAll.find(function(u){return u.role==='admin';})||auAll[0]||null;
    if(au){
      currentUserRole = au.role==='admin' ? 'admin' : 'viewer';
    } else if(currentCoach && currentCoach.boardRole && BOARD_ROLE_LABEL[currentCoach.boardRole]){
      // bewusst gesetzte Board-Rolle geht vor der Position
      currentUserRole=currentCoach.boardRole;
    } else if(currentCoach && !(currentCoach.isPureCoach || currentCoach.role==='SC' || currentCoach.role==='SDC' || currentCoach.role==='SDM' || currentCoach.role==='SDL')){
      // Mitarbeiter mit Login, aber kein Coach: Agent (nutzt nur die Chrome-Erweiterung, kein Board-Zugang)
      currentUserRole='agent';
    } else if(currentCoach){
      currentUserRole='coach';
    } else {
      // Unbekannter Login ohne Eintrag bekommt KEINEN Zugriff. Ausnahme: die fest hinterlegten Admin-Adressen,
      // damit Admins nicht ausgesperrt werden, falls die Benutzerliste einmal nicht geladen werden kann.
      currentUserRole = ADMIN_NAME_MAP[lm] ? 'admin' : 'none';
    }
  }).catch(function(){currentCoach=null;currentAuthUser=null;currentUserRole=null;});
}

// Agents haben keinen Board-Zugang: Hinweis auf die Chrome-Erweiterung statt leerer Seiten
function showAgentLock(){
  var name=(currentCoach&&currentCoach.name)?currentCoach.name.split(' ')[0]:'';
  var d=document.createElement('div');
  d.id='agentLock';
  d.style.cssText='position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit';
  d.innerHTML='<div style="background:#fff;border-radius:18px;max-width:440px;width:100%;padding:36px 32px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.25)">'
    +'<div style="width:56px;height:56px;border-radius:14px;background:#F08566;display:flex;align-items:center;justify-content:center;margin:0 auto 18px">'
    +'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l5-5 4 3 7-7"/></svg></div>'
    +'<h2 style="margin:0 0 10px;font-size:22px;color:#1d1c1a">Hallo '+esc(name)+'</h2>'
    +'<p style="margin:0 0 22px;font-size:15px;line-height:1.5;color:#3d4f52">Das Board ist für Coaches und Führung. <b>Deine Kennzahlen und deine Provision</b> siehst du jederzeit in der <b>Sales-OS-Erweiterung</b> oben rechts in Chrome.</p>'
    +'<button id="agentLockLogout" style="height:42px;padding:0 22px;border:none;border-radius:10px;background:#F3ECE8;color:#F08566;font-weight:700;font-size:14px;cursor:pointer">Abmelden</button>'
    +'</div>';
  document.body.appendChild(d);
  document.getElementById('agentLockLogout').onclick=function(){ d.remove(); logout(); };
}
function showNoAccessLock(){
  // Login ohne Eintrag als Mitarbeiter, Admin oder Betrachter: kein Zugriff aufs Board
  var d=document.createElement('div');
  d.id='noAccessLock';
  d.style.cssText='position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit';
  d.innerHTML='<div style="background:#fff;border-radius:18px;max-width:440px;width:100%;padding:36px 32px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.25)">'
    +'<h2 style="margin:0 0 10px;font-size:22px;color:#1d1c1a">Kein Zugang</h2>'
    +'<p style="margin:0 0 22px;font-size:15px;line-height:1.5;color:#3d4f52">Dein Login <b>'+esc((currentAuthUser&&currentAuthUser.email)||'')+'</b> ist für das Board nicht freigeschaltet. Bitte wende dich an einen Admin.</p>'
    +'<button id="noAccessLogout" style="height:42px;padding:0 22px;border:none;border-radius:10px;background:#F3ECE8;color:#F08566;font-weight:700;font-size:14px;cursor:pointer">Abmelden</button>'
    +'</div>';
  document.body.appendChild(d);
  document.getElementById('noAccessLogout').onclick=function(){ d.remove(); logout(); };
}
function startLoad(name,fn){ // liefert null bei Erfolg, sonst den Namen
  return Promise.resolve().then(fn).then(function(r){return r===false?name:null;},function(e){console.warn('Start: '+name+' nicht geladen',e);return name;});
}
function startRetryHide(){ if(_startTimer){clearTimeout(_startTimer);_startTimer=null;} var t=document.getElementById('startRetry'); if(t)t.remove(); }
function startRetryShow(names,txt,btn,onBtn){
  var t=document.getElementById('startRetry');
  if(!t){ t=document.createElement('div'); t.id='startRetry'; t.setAttribute('role','status');
    t.style.cssText='position:fixed;right:24px;bottom:24px;z-index:7000;width:340px;box-sizing:border-box;background:#F7F5F0;border:1px solid #E9A58F;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;box-shadow:0 4px 14px rgba(60,40,30,.12);font-size:13px';
    document.body.appendChild(t); }
  t.innerHTML='<strong style="font-size:14px;color:#8a2f17">'+esc(names.join(', '))+' nicht geladen</strong><span style="color:#5c4a42">'+esc(txt)+'</span><div><button class="btn btn-primary" type="button">'+esc(btn)+'</button></div>';
  t.querySelector('button').onclick=onBtn;
}
function startRetryData(names,n){
  if(_startTimer){clearTimeout(_startTimer);_startTimer=null;}
  if(n>START_RETRY_MAX){ startRetryShow(names,'Automatische Versuche erfolglos. Zahlen und Listen können unvollständig sein.','Seite neu laden',function(){location.reload();}); return; }
  var run=function(){
    startRetryHide();
    Promise.all(START_LOADERS.filter(function(x){return names.indexOf(x[0])>=0;}).map(function(x){return startLoad(x[0],x[1]);})).then(function(f){
      f=f.filter(Boolean);
      var b=document.getElementById('fst-banner'); if(b&&Object.keys(performance).some(function(k){return performance[k]&&performance[k].length;}))b.remove();
      try{renderSidebar();renderMain();}catch(e){console.warn('Neu zeichnen nach Nachladen',e);}
      if(f.length)startRetryData(f,n+1);
    });
  };
  startRetryShow(names,'Neuer Versuch in '+START_RETRY_SEC+' Sekunden (Versuch '+n+' von '+START_RETRY_MAX+').','Jetzt neu laden',run);
  _startTimer=setTimeout(run,START_RETRY_SEC*1000);
}
function startRetryBase(names){ // Mitarbeiter/Benutzer fehlen: ganzen Start wiederholen
  _startBaseTry++;
  if(_startBaseTry>START_RETRY_MAX){ startRetryShow(names,'Automatische Versuche erfolglos. Bitte später neu laden.','Seite neu laden',function(){location.reload();}); return; }
  var run=function(){ if(_startTimer){clearTimeout(_startTimer);_startTimer=null;} _appInitStarted=false; initAppAfterLogin(); };
  startRetryShow(names,'Neuer Versuch in '+START_RETRY_SEC+' Sekunden (Versuch '+_startBaseTry+' von '+START_RETRY_MAX+').','Jetzt neu laden',run);
  _startTimer=setTimeout(run,START_RETRY_SEC*1000);
}
function initAppAfterLogin(){
  if(_appInitStarted)return;   // verhindert doppelten Init durch ueberlappende Auth-Events
  _appInitStarted = true;
  document.getElementById('auth-gate').style.display = 'none';
  // D5: Fehlschlag (false oder Ausnahme) bricht den Start nicht mehr ab; Mitarbeiter/Benutzer werden sonst neu versucht,
  // statt fälschlich „Kein Zugang“ zu zeigen.
  Promise.all([startLoad('Mitarbeiter',loadEmployeesFromSupabase), startLoad('Benutzer',loadAppUsersFromSupabase)]).then(function(f){
    f=f.filter(Boolean);
    if(f.length){ startRetryBase(f); return 'retry'; }
    startRetryHide();
    return resolveCurrentCoach();
  }).then(function(st){
    if(st==='retry')return;
    if(currentUserRole==='agent'){ showAgentLock(); return; }
    if(currentUserRole==='none'){ showNoAccessLock(); return; }
    Promise.all(START_LOADERS.map(function(x){return startLoad(x[0],x[1]);})).then(function(f){
      lsLoad();               // Rest der Daten (protocols, ...) bleibt vorerst lokal
      runAppInit();
      f=f.filter(Boolean); if(f.length) startRetryData(f,1);
      logAppOpen(); // Zugriff protokollieren (max. 1 Eintrag je 30 Min. und Nutzer)
      if(window._freshLoginClick){
        window._freshLoginClick=false;
        openLoginWizard();
      }
      checkDailyWizard(); // pruefen ob der taegliche 13-Uhr-Ueberblick sofort beim Laden faellig ist
    });
  });
}
function _sessExpired(session){
  if(!session||!session.user)return false;
  var t=session.user.last_sign_in_at?new Date(session.user.last_sign_in_at):null;if(!t||isNaN(t))return false;
  var loginDay=t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);
  return loginDay!==today()||(Date.now()-t.getTime())>SESSION_MAX_H*3600000;
}
function forceLogout(reason){
  try{sessionStorage.setItem('sos_logoutReason',reason);localStorage.removeItem('sos_lastActivity');}catch(e){}
  sb.auth.signOut().then(function(){location.reload();},function(){location.reload();});
}
function _idleTouch(){var n=Date.now();try{var l=+localStorage.getItem('sos_lastActivity')||0;if(n-l>30000)localStorage.setItem('sos_lastActivity',String(n));}catch(e){}var w=document.getElementById('idleWarn');if(w)w.remove();}
function _idleShowWarn(){
  if(document.getElementById('idleWarn'))return;
  var o=document.createElement('div');o.id='idleWarn';
  o.style.cssText='position:fixed;inset:0;z-index:2000;background:rgba(29,28,26,.45);display:flex;align-items:center;justify-content:center';
  o.innerHTML='<div style="background:#F7F5F0;border-radius:16px;padding:22px 24px;width:min(420px,90vw);box-shadow:0 20px 50px rgba(0,0,0,.25)"><div style="font-size:15px;font-weight:700;margin-bottom:6px">Noch da?</div><div style="font-size:13px;color:var(--text2);margin-bottom:16px">Du warst längere Zeit nicht aktiv und wirst in '+IDLE_WARN_MIN+' Minuten automatisch abgemeldet.</div><div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" style="width:auto" onclick="logout()">Jetzt abmelden</button><button class="btn btn-primary" style="width:auto" onclick="_idleTouchForce()">Angemeldet bleiben</button></div></div>';
  document.body.appendChild(o);
}
function _idleTouchForce(){try{localStorage.setItem('sos_lastActivity',String(Date.now()));}catch(e){}var w=document.getElementById('idleWarn');if(w)w.remove();}
function _sessionWatch(){
  sb.auth.getSession().then(function(res){
    var s0=res.data&&res.data.session;if(!s0)return;
    if(_sessExpired(s0)){forceLogout('day');return;}
    var l=0;try{l=+localStorage.getItem('sos_lastActivity')||0;}catch(e){}
    if(!l){_idleTouchForce();return;}
    var idle=(Date.now()-l)/60000;
    if(idle>=IDLE_MAX_MIN)forceLogout('idle');
    else if(idle>=IDLE_MAX_MIN-IDLE_WARN_MIN)_idleShowWarn();
  });
}
function employeeActiveList(){return employees.filter(function(e){return e.active!==false&&!e.isPureCoach;});}
function getCoacheesFor(coachId){
  return employeeActiveList().filter(function(e){
    var sessions=(protocols[e.id]||[]).filter(function(p){return p.status!=='geplant';}).sort(function(a,b){return b.date.localeCompare(a.date);});
    return sessions.length&&sessions[0].coachId===coachId;
  });
}
// ── Taeglicher Team-Ueberblick-Wizard (13 Uhr) ──
function fmtEur(v){return Math.round(v).toLocaleString('de-DE')+' €';}

function lsSave(){
  try{
    localStorage.setItem(LS_KEY,JSON.stringify({
      savedAt:new Date().toISOString()
    }));
  }catch(e){console.warn('lsSave failed:',e);}
}

function lsLoad(){
  try{
    var raw=localStorage.getItem(LS_KEY);
    if(!raw)return false;
    var d=JSON.parse(raw);
    // employees kommt jetzt exklusiv aus Supabase (loadEmployeesFromSupabase) -- NICHT mehr
    // aus dem localStorage-Cache ueberschreiben, sonst gewinnt der alte Demo-Stand.
    return true;
  }catch(e){console.warn('lsLoad failed:',e);return false;}
}
function loadActivityLogFromSupabase(){
  return sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(500).then(function(res){
    if(res.error){console.warn('activity_log load failed:',res.error);return false;}
    activityLog=(res.data||[]).map(function(r){return {id:r.id,createdAt:r.created_at,actorId:r.actor_id,actorName:r.actor_name,category:r.category,action:r.action,description:r.description,targetEmployeeId:r.target_employee_id,targetLabel:r.target_label};});
    return true;
  });
}
function appUserByEmail(email){ // Mail ohne Groß-/Kleinschreibung, wie in der Datenbank
  var lm=String(email||'').toLowerCase(); if(!lm)return null;
  return appUsers.find(function(u){return String(u.email||'').toLowerCase()===lm;})||null;
}
function resolveNonEmployeeName(email){
  if(!email)return null;
  var au=appUserByEmail(email);
  return (au&&au.name)||ADMIN_NAME_MAP[String(email).toLowerCase()]||email;
}
// Zentrale Protokollierungsfunktion – von allen mutierenden Aktionen aufgerufen.
// Feuert asynchron (kein await nötig), fügt lokal sofort ein optimistisches Eintrag hinzu.
// Protokolliert das Oeffnen von Sales OS als Aktivitaet 'login'. Mehrere Aufrufe innerhalb von 30 Minuten
// werden zu einem Eintrag zusammengefasst. Nutzt _sbRaw, damit auch Betrachter (Schreibsperre) erfasst werden.
function logAppOpen(){
  try{
    if(!currentAuthUser)return;
    var key='lastAppOpenLog:'+(currentAuthUser.id||currentAuthUser.email||'');
    var last=parseInt(localStorage.getItem(key)||'0',10);
    if(Date.now()-last<30*60*1000)return;
    localStorage.setItem(key,String(Date.now()));
    var actorId=currentCoach?currentCoach.id:null;
    var actorName=currentCoach?null:resolveNonEmployeeName(currentAuthUser.email);
    var payload={actor_id:actorId,actor_name:actorName,category:'login',action:'opened',description:'Sales OS geöffnet',target_employee_id:null,target_label:null};
    _sbRaw.from('activity_log').insert(payload).select().single().then(function(res){
      if(res.error){console.warn('activity_log (Zugriff) insert failed:',res.error);localStorage.removeItem(key);return;}
      var r=res.data;
      activityLog.unshift({id:r.id,createdAt:r.created_at,actorId:r.actor_id,actorName:r.actor_name,category:r.category,action:r.action,description:r.description,targetEmployeeId:r.target_employee_id,targetLabel:r.target_label});
      if(view==='activity')renderMain();
    });
  }catch(err){console.warn('logAppOpen failed:',err);}
}
function logActivity(category,action,description,targetEmployeeId,targetLabel){
  var actorId=currentCoach?currentCoach.id:null;
  var actorName=currentCoach?null:(currentAuthUser?resolveNonEmployeeName(currentAuthUser.email):null);
  var payload={actor_id:actorId,actor_name:actorName,category:category,action:action,description:description,target_employee_id:targetEmployeeId||null,target_label:targetLabel||null};
  sb.from('activity_log').insert(payload).select().single().then(function(res){
    if(res.error){console.warn('activity_log insert failed:',res.error);return;}
    var r=res.data;
    activityLog.unshift({id:r.id,createdAt:r.created_at,actorId:r.actor_id,actorName:r.actor_name,category:r.category,action:r.action,description:r.description,targetEmployeeId:r.target_employee_id,targetLabel:r.target_label});
  });
}
// C11: alte Zielvereinbarungs-Ansicht (zielvereinbarungHtml/saveZielvereinbarung) entfernt – sie umging die Monatssperre
function ini(n){return n.split(' ').map(function(x){return x[0];}).join('').toUpperCase().slice(0,2);}
function esc(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
// Für Werte in '...' innerhalb von onclick="…": erst als JS-String maskieren, dann fürs HTML-Attribut
function jsq(s){if(s==null)return '';return esc(String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,'\\n').replace(/</g,'\\x3c'));}
function fd(d){
  if(!d)return '';
  var p=d.split('-');
  var dt=new Date(d+'T00:00:00');
  var wd=['So','Mo','Di','Mi','Do','Fr','Sa'][dt.getDay()];
  return wd+', '+p[2]+'.'+p[1]+'.'+p[0];
}
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);} // lokales Datum (nicht UTC)
// Fuer "Akt./Std." am heutigen Tag: statt der vollen Tagesstunden nur die seit Arbeitsbeginn (8:30)
// tatsaechlich verstrichene Zeit nutzen. Nutzt den letzten Sync-Zeitpunkt als Referenz, falls der
// Sync heute schon gelaufen ist (Daten sind ohnehin nur so aktuell wie der letzte Sync), sonst die
// aktuelle Uhrzeit. Untergrenze 0.5h, um absurde Werte kurz nach 8:30 zu vermeiden.
function hexToRgba(hex,alpha){
  hex=(hex||'#F08566').replace('#','');
  if(hex.length===3)hex=hex.split('').map(function(c){return c+c;}).join('');
  var r=parseInt(hex.substring(0,2),16),g=parseInt(hex.substring(2,4),16),b=parseInt(hex.substring(4,6),16);
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function vGradient(canvas,color,a1,a2,y0,y1){
  var ctx=canvas.getContext('2d');
  var top=(y0!==undefined&&y0!==null)?y0:0;
  var bottom=(y1!==undefined&&y1!==null&&y1>top)?y1:(canvas.clientHeight||260);
  var grad=ctx.createLinearGradient(0,top,0,bottom);
  grad.addColorStop(0,hexToRgba(color,a1));
  grad.addColorStop(1,hexToRgba(color,a2));
  return grad;
}
// ── Chart-Interaktion (Aufbau-Animation + Hover-Crosshair), gilt fuer alle Liniendiagramme im Board ──
// Formatiert einen Metrik-Wert passend zur Einheit (Marge=€, CR*=%, sonst Stueck/Zahl), anhand des
// Metrik-Keys (gleiche Namenskonvention ueberall im Board: margeGesamt, crOEM, oem_aktivitaeten, ...).
function formatMetricValue(metricKey,value){
  if(value===null||value===undefined||isNaN(value))return '–';
  var k=(metricKey||'').toLowerCase();
  if(k.indexOf('marge')>=0)return '€ '+Math.round(value).toLocaleString('de-DE');
  if(k.indexOf('cr')===0)return (Math.round(value*10)/10)+'%';
  return Number.isInteger(value)?String(value):(Math.round(value*10)/10).toString();
}
// UTC-sichere Datumsberechnung: vermeidet den Bug, dass new Date(dateStr+'T00:00:00') lokale Zeit
// interpretiert und .toISOString() dann in Zeitzonen mit positivem UTC-Offset (z.B. Deutschland)
// auf den Vortag zurückrutscht. Immer nutzen, wenn ein berechnetes Datum mit echten
// gespeicherten Datums-Strings (z.B. createdAt, performance.date) verglichen wird.
function localYmd(d){ // Datum eines Zeitpunkts in Ortszeit (wie today()), nicht UTC; ungültig → ''
  if(!(d instanceof Date)||isNaN(d.getTime()))return '';
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
function addDaysUTC(dateStr,delta){
  var p=dateStr.split('-').map(Number);
  var d=new Date(Date.UTC(p[0],p[1]-1,p[2]));
  d.setUTCDate(d.getUTCDate()+delta);
  return d.toISOString().slice(0,10);
}
function monthBoundsUTC(dateStr,monthsAgo){
  var p=dateStr.split('-').map(Number);
  var d=new Date(Date.UTC(p[0],p[1]-1,1));
  d.setUTCMonth(d.getUTCMonth()-(monthsAgo||0));
  var from=d.toISOString().slice(0,10);
  var toD=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0));
  var to=toD.toISOString().slice(0,10);
  return {from:from,to:to,ym:from.slice(0,7)};
}
function lastRating(id){var p=protocols[id];return(p&&p.length)?p[0].rating:null;}
function scoreColor(s){return s>=85?'var(--teal)':s>=70?'var(--purple)':'var(--amber)';}
function getPerf(id,days){
  var p=performance[id]||[];
  var cutoff=new Date();
  cutoff.setDate(cutoff.getDate()-days);
  return p.filter(function(x){return new Date(x.date)>=cutoff;}).sort(function(a,b){return new Date(a.date)-new Date(b.date);});
}
function pavg(id,key,days){
  var p=getPerf(id,days||7);
  if(!p.length)return null;
  var crMetrics={crOEM:1,crTeilweise:1,crSuperYes:1,crMegaYes:1};
  if(crMetrics[key]){
    var oem=0,notS=0,tw=0,yes=0,sy=0,my=0;
    p.forEach(function(x){
      oem+=x.convOEM||0;notS+=x.notSuccessful||0;
      tw+=x.convTW||0;yes+=x.convYes||0;sy+=x.convSY||0;my+=x.convMY||0;
    });
    if(key==='crOEM'){var d=oem+notS;return d>0?(oem/d*100):null;}
    if(key==='crTeilweise'){var d=tw+yes+sy+my;return d>0?(tw/d*100):null;}
    if(key==='crSuperYes'){var d=yes+sy+my;return d>0?(sy/d*100):null;}
    if(key==='crMegaYes'){var d=yes+sy+my;return d>0?(my/d*100):null;}
  }
  if(key==='optPerH'){
    var emp=employees.find(function(e){return e.id===id;});
    var optGesSum=p.reduce(function(a,x){return a+(x.optGesamt||0);},0);
    var dates=p.map(function(x){return x.date;});
    var hoursSum=emp?totalWorkHoursForMonth(emp,null,dates):0;
    return hoursSum>0?(optGesSum/hoursSum):null;
  }
  return p.reduce(function(a,x){return a+x[key];},0)/p.length;
}
function checkAlerts(id){
  var alerts=[];
  // B3: Maßstab sind die persönlichen Ziele (Provisionsvereinbarung/Stammdaten), nicht der Team-Durchschnitt
  var emp=employees.find(function(e){return e.id===id;}),T=emp?empTargets(emp):{};
  function check(key,perfKey,label,days){
    var t=T[key];if(!t||t.val==null||t.val===''||isNaN(+t.val))return;t={val:+t.val,dir:t.dir||'gte',label:(KPI_TARGETS[key]||{}).label};
    var v=pavg(id,perfKey,days||7);if(v===null)return;
    var fail=t.dir==='gte'?v<t.val:v>t.val;
    if(fail)alerts.push({key:label||t.label,val:(perfKey==='optPerH'?v.toFixed(1):v.toFixed(0)+'%'),ziel:(perfKey==='optPerH'?t.val:t.val+'%'),dir:t.dir});
  }
  check('crOEM','crOEM','CR OEM');
  check('crSuperYes','crSuperYes','CR SY');
  check('crMegaYes','crMegaYes','CR MY');
  check('crTeilweise','crTeilweise','CR TW');
  check('optPerH','optPerH','Opt./Std.');
  return alerts;
}function openTaskCount(id){return(tasks[id]||[]).filter(function(t){return!t.done;}).length+(qaCallsDue(id).due>0?1:0);}
function allTeams(){
  var ts={};
  employees.forEach(function(e){if(e.team)ts[e.team]=1;});
  return Object.keys(ts).sort();
}
// Fuer die SFP Wiegand Overview: aktuell Aktive PLUS ALLE ehemaligen Mitarbeiter, die jemals
// Performance-Daten hatten - dauerhaft, nicht nur zeitlich begrenzt. Ein Mitarbeiter, der bis
// 31.07.2026 gearbeitet hat, muss auch Jahre spaeter noch in der Performance-Tabelle fuer Juli 2026
// auftauchen, weil seine Zahlen das damalige Gesamtergebnis mitgepraegt haben - unabhaengig vom
// aktuellen Status oder davon, wie lange das Vertragsende her ist.
function activeOrRecentlyEndedEmployees(){
  return employees.filter(function(e){
    if(e.active!==false)return true;
    return performance[e.id]&&performance[e.id].length>0;
  });
}
function rolePerms(){ var s=settings.rolePermissions||{}; return {coach:Object.assign({},PERM_DEFAULT.coach,s.coach||{}),viewer:Object.assign({},PERM_DEFAULT.viewer,s.viewer||{})}; }
function permFor(key,role){
  role=role||currentUserRole;
  if(role==='admin')return 'E';
  if(role!=='coach'&&role!=='viewer')return '-';
  var row=PERM_ROWS.find(function(r){return r.key===key;});
  if(row&&row.adminOnly)return '-';
  if(row&&row.fixed)return 'S';
  if(row&&row.fixedRole)return row.fixedRole[role]||'-';
  if(row&&row.persons&&role===currentUserRole&&permPersonHas(key))return 'E';
  var v=rolePerms()[role][key]||'-';
  if(row&&row.editOrNone&&v!=='E')return '-';
  if(row&&row.editOrNone&&role==='viewer')return '-';
  if(role==='viewer'&&v==='E')v='S';
  if(row&&row.seeOnly&&v==='E')v='S';
  return v;
}
// Rechte für einzelne Personen zusätzlich zur Rolle (settings.permPersons = {key:['emp:<id>'|'app:<id>', …]})
function permMyKey(){if(typeof currentCoach!=='undefined'&&currentCoach)return 'emp:'+currentCoach.id;var em=(typeof currentAuthUser!=='undefined'&&currentAuthUser&&currentAuthUser.email||'').toLowerCase();var u=(typeof appUsers!=='undefined'?appUsers:[]).find(function(x){return String(x.email||'').toLowerCase()===em;});return u?'app:'+u.id:'';}
function permPersonHas(key){var L=((settings.permPersons||{})[key])||[],k=permMyKey();return !!k&&L.indexOf(k)>=0;}
function permPersonsSet(key,pk,on){if(currentUserRole!=='admin')return;var all=JSON.parse(JSON.stringify(settings.permPersons||{})),L=all[key]||[];L=L.filter(function(x){return x!==pk;});if(on)L.push(pk);all[key]=L;settings.permPersons=all;
  var p=allPersons().find(function(x){return x.kind+':'+x.id===pk;});saveSettingJson('permPersons',all,'Recht „'+((PERM_ROWS.find(function(r){return r.key===key;})||{}).label||key)+'“ '+(on?'gegeben':'entzogen')+': '+(p?p.name:pk));renderMain();}
function permPersonsHtml(key){var L=((settings.permPersons||{})[key])||[],P=allPersons().filter(function(p){var r=personRole(p);return (r==='Coach'||r==='Betrachter')&&(p.kind==='app'||p.active!==false);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  var chips=L.map(function(pk){var p=P.find(function(x){return x.kind+':'+x.id===pk;})||allPersons().find(function(x){return x.kind+':'+x.id===pk;});return '<span class="pp-chip">'+esc(p?p.name:pk)+'<button type="button" aria-label="entfernen" onclick="permPersonsSet(\''+key+'\',\''+pk+'\',false)">×</button></span>';}).join('');
  var opts=P.filter(function(p){return L.indexOf(p.kind+':'+p.id)<0;}).map(function(p){return '<option value="'+p.kind+':'+p.id+'">'+esc(p.name)+' · '+personRole(p)+'</option>';}).join('');
  return '<div class="pp-box"><span class="pp-lbl">Zusätzlich erlaubt für:</span>'+(chips||'<span class="pp-none">niemand</span>')+(opts?'<select onchange="if(this.value)permPersonsSet(\''+key+'\',this.value,true)"><option value="">+ Person</option>'+opts+'</select>':'')+'</div>';}
function canSeeArea(key){return permFor(key)!=='-';}
function canEditTable(table){
  if(currentUserRole!=='coach')return true;
  var row=PERM_ROWS.find(function(r){return (r.tables||[]).indexOf(table)>=0;});
  return !row||permFor(row.key)==='E';
}
function showPermBlockedToast(){
  showViewerBlockedToast();
  var el=document.getElementById('viewerToast'); if(el) el.innerHTML='<i class="ti ti-lock" style="margin-right:6px"></i>Keine Berechtigung – Änderung wird nicht gespeichert';
}
function hiddenTabsForRole(){
  var out=[]; PERM_ROWS.forEach(function(r){ if((r.tabs||[]).length&&!canSeeArea(r.key)) out=out.concat(r.tabs); }); return out;
}
function applyPermsToNav(){
  PERM_ROWS.forEach(function(r){ (r.nav||[]).forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display=canSeeArea(r.key)?'':'none'; }); });
}

// Lädt eine komplette Tabelle unabhängig von der Standard-1000-Zeilen-Grenze von Supabase.
// orderCol optional (für stabile Reihenfolge über Seiten hinweg empfohlen, aber nicht zwingend).
// Alle Zeilen laden: erst die Anzahl abfragen, dann alle Seiten gleichzeitig (statt nacheinander).
// Eindeutige Sortierung (z.B. employee_id+date) ist Pflicht, damit sich parallele Seiten nicht ueberschneiden.
function selectAllParallel(table,columns,orderCols){
  var PAGE=1000;
  function q(){var x=sb.from(table).select(columns||'*');(orderCols||[]).forEach(function(c){x=x.order(c,{ascending:true});});return x;}
  return sb.from(table).select('employee_id',{count:'exact',head:true}).then(function(cr){
    if(cr.error||cr.count==null)return selectAllPaginated(table); // Rueckfall auf den bisherigen Weg
    var n=cr.count,pages=[];
    for(var from=0;from<Math.max(n,1);from+=PAGE)pages.push(q().range(from,from+PAGE-1));
    return Promise.all(pages).then(function(rs){
      var err=rs.filter(function(x){return x.error;})[0];if(err)return err;
      var all=[];rs.forEach(function(x){all=all.concat(x.data||[]);});
      // Falls zwischen Zaehlen und Laden neue Zeilen dazukamen: Rest nachladen
      if(all.length>=pages.length*PAGE)return q().range(all.length,all.length+PAGE*10-1).then(function(x){return {data:all.concat(x.data||[]),error:x.error||null};});
      return {data:all,error:null};
    });
  });
}
function selectAllPaginated(table,orderCol,ascending,eqFilter){
  var PAGE=1000;
  var allRows=[];
  function fetchPage(from){
    var q=sb.from(table).select('*');
    if(orderCol)q=q.order(orderCol,{ascending:ascending!==false});
    if(eqFilter)q=q.eq(eqFilter.col,eqFilter.val);
    return q.range(from,from+PAGE-1).then(function(res){
      if(res.error)return res;
      allRows=allRows.concat(res.data||[]);
      if(res.data&&res.data.length===PAGE)return fetchPage(from+PAGE);
      return {data:allRows,error:null};
    });
  }
  return fetchPage(0);
}

function perfRowMap(r){return {
        date:r.date,notReached:r.oem_nicht_erreicht,notPossible:r.oem_nicht_moeglich,notSuccessful:r.oem_nicht_erfolgreich,
        convTW:r.oem_tw,convYes:r.oem_yes,convSY:r.oem_sy,convMY:r.oem_my,ups_yes:r.ups_yes,wka_gesamt_yes:r.wka_gesamt_yes,
        margeOEM:r.oem_margenerhoehung,margeUpsell:r.ups_margenerhoehung,margeWKA:r.wka_margenerhoehung,
        convOEM:r.oem_gesamt,oem_aktivitaeten:r.oem_aktivitaeten,optGesamt:r.gesamt_optimierungen,margeGesamt:r.gesamt_margenerhoehung,
        gesamtAktivitaeten:r.gesamt_aktivitaeten,gesamtNichtErreicht:r.gesamt_nicht_erreicht,
        gesamtNichtMoeglich:r.gesamt_nicht_moeglich,gesamtNichtErfolgreich:r.gesamt_nicht_erfolgreich,
        upsNichtErfolgreich:r.ups_nicht_erfolgreich,wkaOemNichtErfolgreich:r.wka_oem_nicht_erfolgreich,
        wkaUpsNichtErfolgreich:r.wka_ups_nicht_erfolgreich,wkaOemBeendet:r.wka_oem_beendet,wkaUpsBeendet:r.wka_ups_beendet
      };}
function loadPerformanceFromSupabase(){
  return selectAllParallel('performance',PERF_COLS,['employee_id','date']).then(function(res){
    if(res.error){console.warn('performance load failed:',res.error);return false;}
    var byEmp={};
    (res.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({
        date:r.date,notReached:r.oem_nicht_erreicht,notPossible:r.oem_nicht_moeglich,notSuccessful:r.oem_nicht_erfolgreich,
        convTW:r.oem_tw,convYes:r.oem_yes,convSY:r.oem_sy,convMY:r.oem_my,ups_yes:r.ups_yes,wka_gesamt_yes:r.wka_gesamt_yes,
        margeOEM:r.oem_margenerhoehung,margeUpsell:r.ups_margenerhoehung,margeWKA:r.wka_margenerhoehung,
        convOEM:r.oem_gesamt,oem_aktivitaeten:r.oem_aktivitaeten,optGesamt:r.gesamt_optimierungen,margeGesamt:r.gesamt_margenerhoehung,
        gesamtAktivitaeten:r.gesamt_aktivitaeten,gesamtNichtErreicht:r.gesamt_nicht_erreicht,
        gesamtNichtMoeglich:r.gesamt_nicht_moeglich,gesamtNichtErfolgreich:r.gesamt_nicht_erfolgreich,
        upsNichtErfolgreich:r.ups_nicht_erfolgreich,wkaOemNichtErfolgreich:r.wka_oem_nicht_erfolgreich,
        wkaUpsNichtErfolgreich:r.wka_ups_nicht_erfolgreich,wkaOemBeendet:r.wka_oem_beendet,wkaUpsBeendet:r.wka_ups_beendet
      });
    });
    Object.keys(byEmp).forEach(function(k){byEmp[k].sort(function(a,b){return b.date.localeCompare(a.date);});});
    performance=byEmp;
    return true;
  });
}

function loadProtocolsFromSupabase(){
  return selectAllPaginated('protocols').then(function(res){
    if(res.error){console.warn('protocols load failed:',res.error);return false;}
    var byEmp={};
    (res.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({
        id:r.id,date:r.date,uhrzeit:r.uhrzeit?r.uhrzeit.slice(0,5):'',endUhrzeit:r.end_uhrzeit?r.end_uhrzeit.slice(0,5):'',type:r.art,rating:r.rating,
        note:r.note,notes:r.note,focus:r.focus,status:r.status,
        start:r.start_note||'',stop:r.stop_note||'',cont:r.continue_note||'',
        topics:r.focus?[r.focus]:[],coachId:r.coach_id||null,focusMetric:r.focus_metric||null,groupId:r.group_id||null
      });
    });
    Object.keys(byEmp).forEach(function(k){byEmp[k].sort(function(a,b){return b.date.localeCompare(a.date);});});
    // ausgefallene Sessions getrennt halten (zählen weder als Session noch als geplant)
    cancelledSessions=[];Object.keys(byEmp).forEach(function(k){byEmp[k]=byEmp[k].filter(function(p){if(p.status==='ausgefallen'){cancelledSessions.push(Object.assign({empId:k},p));return false;}return true;});});
    protocols=byEmp;
    return true;
  });
}

function loadEmployeeKpiTargetsFromSupabase(){
  return selectAllPaginated('employee_kpi_targets').then(function(res){
    if(res.error){console.warn('employee_kpi_targets load failed:',res.error);return false;}
    (res.data||[]).forEach(function(r){
      var emp=employees.find(function(e){return e.id===r.employee_id;});
      if(!emp)return;
      if(!emp.targets)emp.targets={};
      emp.targets[r.metric_key]=r.val;
      if(r.dir)emp.targets[r.metric_key+'Dir']=r.dir;
    });
    return true;
  });
}


function loadKpiTargetsFromSupabase(){
  return sb.from('kpi_targets').select('*').then(function(res){
    if(res.error){console.warn('kpi_targets load failed:',res.error);return false;}
    res.data.forEach(function(r){
      KPI_TARGETS[r.metric_key]={val:r.val,dir:r.dir,label:r.label};
    });
    if(KPI_TARGETS.crOEM)CR_GOOD=KPI_TARGETS.crOEM.val;
    return true;
  });
}

function loadRatingCriteriaFromSupabase(){
  return sb.from('rating_criteria').select('*').order('sort_order').then(function(res){
    if(res.error){console.warn('rating_criteria load failed:',res.error);return false;}
    ratingCriteria=res.data.map(function(r){
      return {id:r.id,name:r.name,cat:r.category,target:r.target,desc:r.description||''};
    });
    return true;
  });
}

function loadSettingsFromSupabase(){
  return sb.from('settings').select('*').then(function(res){
    if(res.error){console.warn('settings load failed:',res.error);return false;}
    res.data.forEach(function(r){
      if(r.key==='ftpUrl')settings.ftpUrl=r.value||'';
      if(r.key==='ftpHost')settings.ftpHost=r.value||'';
      if(r.key==='ftpPort')settings.ftpPort=r.value||'';
      if(r.key==='ftpUser')settings.ftpUser=r.value||'';
      if(r.key==='ftpFile')settings.ftpFile=r.value||'';
      if(r.key==='ftpLastSync')settings.ftpLastSync=r.value||'';
      if(r.key==='tokenExpiry')settings.tokenExpiry=r.value||'';
      if(r.key==='extensionUrl')settings.extensionUrl=r.value||'';
      if(r.key==='liveKey')settings.liveKey=r.value||'';
      if(r.key==='powerHourConfig'){try{settings.powerHourConfig=JSON.parse(r.value||'{}')||{};}catch(e){settings.powerHourConfig={};}}
      if(r.key==='liveConfig'){try{settings.liveConfig=JSON.parse(r.value||'{}')||{};}catch(e){settings.liveConfig={};}}
      if(r.key==='telefonateConfig'){try{settings.telefonateConfig=JSON.parse(r.value||'{}')||{};}catch(e){settings.telefonateConfig={};}}
      if(r.key==='rolePermissions'||r.key==='kalenderRules'||r.key==='wizardSettings'||r.key==='wizardConfig'||r.key==='dashboardTargets'||r.key==='ftpUnmatched'||r.key==='ftpRange'||r.key==='permPersons'){ try{ settings[r.key]=JSON.parse(r.value||'null'); }catch(e){} }
      if(r.key.indexOf('ziel_nl_')===0)zielNlTargets[r.key.slice(8)]=parseFloat(r.value)||0;
    });
    return true;
  });
}


function loadReviewsFromSupabase(){
  return Promise.all([
    selectAllPaginated('reviews',null,true,{col:'type',val:'Mitarbeiterentwicklung'}),
    selectAllPaginated('review_kpis')
  ]).then(function(results){
    var reviewsRes=results[0],kpisRes=results[1];
    if(reviewsRes.error){console.warn('reviews load failed:',reviewsRes.error);return false;}
    if(kpisRes.error)console.warn('review_kpis load failed (Bewertungen werden trotzdem geladen, nur ohne Einzel-Werte):',kpisRes.error);
    var kpisByReview={};
    (kpisRes.data||[]).forEach(function(k){
      if(!kpisByReview[k.review_id])kpisByReview[k.review_id]={};
      kpisByReview[k.review_id][k.metric_key]=k.value;
    });
    var byEmp={};
    (reviewsRes.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      var entry={id:r.id,date:r.date,note:r.notes||'',einwand:0};
      var kpis=kpisByReview[r.id]||{};
      Object.keys(kpis).forEach(function(k){entry[k]=kpis[k];});
      byEmp[r.employee_id].push(entry);
    });
    Object.keys(byEmp).forEach(function(k){byEmp[k].sort(function(a,b){return b.date.localeCompare(a.date);});});
    reviews=byEmp;
    // Kommentare (Tabelle employee_comments) dazuladen – fehlt die Tabelle noch, laeuft das Board normal weiter
    return sb.from('employee_comments').select('*').order('date',{ascending:false}).then(function(cr){
      if(cr.error){console.warn('employee_comments load failed:',cr.error);return true;}
      (cr.data||[]).forEach(function(c){
        var k=String(c.employee_id);
        if(!reviews[k])reviews[k]=[];
        reviews[k].push({id:c.id,date:c.date,isComment:true,commentType:c.comment_type||'diverses',note:c.note||'',author:c.author||''});
      });
      return true;
    },function(e){console.warn('employee_comments load failed:',e);return true;});
  });
}
function saveCommentToDb(empId,c,isUpdate){
  var row={id:c.id,employee_id:String(empId),date:c.date,comment_type:c.commentType||'diverses',note:c.note,author:c.author||null};
  var q=isUpdate?sb.from('employee_comments').update({date:row.date,comment_type:row.comment_type,note:row.note}).eq('id',c.id):sb.from('employee_comments').insert(row);
  return q.then(function(res){
    if(res.error){console.warn('Kommentar speichern fehlgeschlagen:',res.error);alert('Kommentar konnte nicht gespeichert werden: '+res.error.message);}
    return res;
  });
}
function newCommentId(){
  if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(ch){var r=Math.random()*16|0;return (ch==='x'?r:(r&0x3|0x8)).toString(16);});
}

function loadTasksFromSupabase(){
  return selectAllPaginated('tasks').then(function(res){
    if(res.error){console.warn('tasks load failed:',res.error);return false;}
    var byEmp={};
    (res.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({
        id:r.id,text:r.text,description:r.description||'',done:r.done,
        status:r.status||(r.done?'done':'open'),
        priority:r.priority,dueDate:r.due_date,source:r.source||'',
        completedAt:r.completed_at||null,createdAt:r.created_at||null
      });
    });
    Object.keys(byEmp).forEach(function(k){byEmp[k].sort(function(a,b){return (b.dueDate||'').localeCompare(a.dueDate||'');});});
    tasks=byEmp;
    return true;
  });
}

function loadEmployeeHistoryFromSupabase(){
  return selectAllPaginated('employee_history','changed_at',false).then(function(res){
    if(res.error){console.warn('employee_history load failed:',res.error);return false;}
    var byEmp={};
    (res.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({id:r.id,changedAt:r.changed_at,field:r.field,oldValue:r.old_value,newValue:r.new_value,changedBy:r.changed_by,changedByName:r.changed_by_name||null});
    });
    employeeHistory=byEmp;
    return true;
  });
}
function loadEmployeeVerlaufFromSupabase(){
  return selectAllPaginated('employee_verlauf','gueltig_ab',true).then(function(res){
    if(res.error){console.warn('employee_verlauf nicht geladen (SQL 51 ausgeführt?):',res.error.message||res.error);EV_OK=false;employeeVerlauf={};return false;}
    var m={};(res.data||[]).forEach(function(r){var k=String(r.employee_id);m[k]=m[k]||{};(m[k][r.feld]=m[k][r.feld]||[]).push({ab:String(r.gueltig_ab).slice(0,10),wert:r.wert,von:r.geaendert_von||null});});
    employeeVerlauf=m;EV_OK=true;return true;
  });
}
function loadGoalsFromSupabase(){
  return selectAllPaginated('goals','created_at',false).then(function(res){
    if(res.error){console.warn('goals load failed:',res.error);return false;}
    var byEmp={};
    (res.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({id:r.id,description:r.description,metricKey:r.metric_key,targetValue:r.target_value,targetDate:r.target_date,status:r.status,createdAt:r.created_at,createdBy:r.created_by});
    });
    goals=byEmp;
    return true;
  });
}
function logAdminAction(action,details){
  return sb.from('admin_audit_log').insert({
    changed_by:currentCoach?currentCoach.id:null,action:action,details:details
  }).then(function(res){
    if(res.error)console.warn('admin_audit_log konnte nicht gespeichert werden:',res.error);
  });
}
function loadAdminAuditLogFromSupabase(){
  return sb.from('admin_audit_log').select('*').order('changed_at',{ascending:false}).limit(200).then(function(res){
    if(res.error){console.warn('admin_audit_log load failed:',res.error);return false;}
    adminAuditLog=(res.data||[]).map(function(r){return {id:r.id,changedAt:r.changed_at,changedBy:r.changed_by,action:r.action,details:r.details};});
    return true;
  });
}
function loadEmployeeDocumentsFromSupabase(){
  return selectAllPaginated('employee_documents','uploaded_at',false).then(function(res){
    if(res.error){console.warn('employee_documents load failed:',res.error);return false;}
    var byEmp={};
    (res.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({id:r.id,filename:r.filename,storagePath:r.storage_path,description:r.description,uploadedBy:r.uploaded_by,uploadedAt:r.uploaded_at});
    });
    employeeDocuments=byEmp;
    return true;
  });
}
function loadCallRatingsFromSupabase(){
  return Promise.all([
    selectAllPaginated('call_ratings'),
    selectAllPaginated('call_rating_scores')
  ]).then(function(results){
    var ratingsRes=results[0],scoresRes=results[1];
    if(ratingsRes.error){console.warn('call_ratings load failed:',ratingsRes.error);return false;}
    if(scoresRes.error)console.warn('call_rating_scores load failed (Bewertungen werden trotzdem geladen, nur ohne Einzel-Scores):',scoresRes.error);
    var scoresByRating={};
    (scoresRes.data||[]).forEach(function(s){
      if(!scoresByRating[s.call_rating_id])scoresByRating[s.call_rating_id]={};
      scoresByRating[s.call_rating_id][s.item_key]=s.value;
    });
    var byEmp={};
    (ratingsRes.data||[]).forEach(function(r){
      if(!byEmp[r.employee_id])byEmp[r.employee_id]=[];
      byEmp[r.employee_id].push({
        id:r.id,date:r.date,auftragsnr:r.auftragsnr||'',bewertetVon:r.bewertet_von||'',
        status:r.status,b2b:r.b2b,abschlussArt:r.abschluss_art||'',einwand:r.einwand||'',hinweis:r.hinweis||'',
        scores:scoresByRating[r.id]||{}
      });
    });
    Object.keys(byEmp).forEach(function(k){byEmp[k].sort(function(a,b){return b.date.localeCompare(a.date);});});
    callRatings=byEmp;
    return true;
  });
}
function runAppInit(){
renderSidebar();
var hasData=Object.keys(performance).some(function(k){return performance[k]&&performance[k].length>0;});
if(!hasData){
  showView('team');
  setTimeout(function(){
    if(document.getElementById('fst-banner'))return;   // Banner existiert schon, kein zweites erzeugen
    var banner=document.createElement('div');
    banner.id='fst-banner';
    banner.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:8000;display:flex;align-items:center;justify-content:center';
    var box='<div style="background:var(--bg);border-radius:16px;padding:32px 40px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center">';
    box+='<div style="width:56px;height:56px;border-radius:50%;background:var(--purple-bg);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px"><i class="ti ti-database-import"></i></div>';
    box+='<div style="font-size:18px;font-weight:700;margin-bottom:8px">Willkommen im Sales OS Dashboard</div>';
    box+='<div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px">Noch keine Performance-Daten vorhanden. Lade deine CSV-Datei hoch um loszulegen.</div>';
    box+='<div style="display:flex;gap:10px;justify-content:center">';
    box+='<button class="btn btn-primary" id="fst-csv-btn"><i class="ti ti-upload"></i> CSV jetzt hochladen</button>';
    box+='<button class="btn" id="fst-skip-btn" style="color:var(--text2)">Später</button>';
    box+='</div>';
    box+='<div style="font-size:11px;color:var(--text3);margin-top:16px">Einstellungen → Performance-Daten importieren</div>';
    box+='</div>';
    banner.innerHTML=box;
    document.body.appendChild(banner);
    document.getElementById('fst-csv-btn').onclick=function(){
      banner.remove();showView('settings');
    };
    document.getElementById('fst-skip-btn').onclick=function(){
      banner.remove();
    };
  },600);
} else {
  showView('team');
}
}
// Zeitpunkt des letzten Datenabgleichs neu lesen. Sonst rechnet „bisher gearbeitet“ (Soll-Linie, persönliches Soll, Opt./Std. heute)
// auf lange offenen Seiten weiter mit der Abgleich-Zeit vom Seitenstart, während die Zahlen nachgeladen werden.
function ftpLastSyncNachladen(){if(typeof sb==='undefined'||!sb)return Promise.resolve(false);
  try{return Promise.resolve(sb.from('settings').select('value').eq('key','ftpLastSync')).then(function(res){
    if(!res||res.error||!res.data||!res.data.length||!res.data[0].value)return false;settings.ftpLastSync=res.data[0].value;return true;},function(){return false;});}
  catch(e){return Promise.resolve(false);}}
function perfRefreshToday(){if(typeof sb==='undefined'||!sb)return Promise.resolve(false);var t=today();_perfTodayT=Date.now();ftpLastSyncNachladen();
  return sb.from('performance').select(PERF_COLS).eq('date',t).then(function(res){if(!res||res.error){console.warn('Leistungsdaten heute',res&&res.error);return false;}
    var by={};(res.data||[]).forEach(function(r){(by[r.employee_id]=by[r.employee_id]||[]).push(perfRowMap(r));});
    Object.keys(by).forEach(function(id){performance[id]=(performance[id]||[]).filter(function(x){return x.date!==t;}).concat(by[id]);});
    try{_aufgBT=0;aufgBadgeLazy();if(view==='aufgaben')renderAufgaben();}catch(e){}return true;}).catch(function(e){console.warn('Leistungsdaten heute',e);return false;});}
