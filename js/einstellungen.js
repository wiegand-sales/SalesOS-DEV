// Sales OS – Einstellungen: Benutzer, Rechte-Matrix, Wizards, Integrationen, Aktivität
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function setActivityFilterPerson(v){activityFilterPerson=v;renderActivity();}
function setActivityFilterDays(d){activityFilterDays=d;renderActivity();}
function setUserFilter(f){userFilter=f;renderMain();}
function setUserSearch(v){userSearch=v;renderMain();var el=document.getElementById('userSearch');if(el){el.focus();el.setSelectionRange(v.length,v.length);}}
function buildUserOverviewHtml(){
  if(loginInfo===null) loadLoginInfo();
  var RC={'Admin':['var(--purple)','rgba(29,28,26,0.10)'],'Coach':['#F08566','rgba(245,154,91,0.14)'],'Betrachter':['#6b5a12','rgba(214,180,60,0.20)'],'Sales Agent':['var(--text2)','rgba(0,0,0,0.06)'],'Kein Zugang':['var(--text3)','rgba(0,0,0,0.04)']};
  var ACC={'Admin':['Bearbeiten','var(--purple)'],'Coach':['Bearbeiten','var(--purple)'],'Betrachter':['Nur ansehen','#6b5a12'],'Sales Agent':['Nur Erweiterung','var(--text2)'],'Kein Zugang':['Kein Zugang','var(--text3)']};
  var persons=allPersons(), q=userSearch.trim().toLowerCase();
  var counts={all:0,Admin:0,Coach:0,Betrachter:0,'Sales Agent':0,'Kein Zugang':0};
  persons.forEach(function(p){ if(p.kind==='emp'&&p.active===false&&personRole(p)==='Sales Agent')return; counts.all++; counts[personRole(p)]++; });
  function chip(key,label){ return '<button class="'+(userFilter===key?'active':'')+'" onclick="setUserFilter(\''+key+'\')">'+label+'&nbsp;<span style="opacity:.7">'+counts[key]+'</span></button>'; }
  var h='';
  var _tb='<div class="chart-toggle">'+chip('all','Alle')+chip('Admin','Admin')+chip('Coach','Coach')+chip('Betrachter','Betrachter')+chip('Sales Agent','Sales Agents')+chip('Kein Zugang','Kein Zugang')+'</div>'
    +'<div style="display:flex;gap:8px;align-items:center"><input id="userSearch" value="'+esc(userSearch)+'" oninput="setUserSearch(this.value)" placeholder="Name oder E-Mail suchen" aria-label="Suchen" style="width:230px;height:34px">'
    +'<button class="btn btn-primary" style="width:auto;height:34px" onclick="openModal(\'addAppUserModal\')"><i class="ti ti-plus"></i> Admin / Betrachter</button></div>';
  if(userMsg) h+='<div class="card" style="margin-bottom:16px;padding:12px 16px;font-size:13px;line-height:1.5">'+userMsg+' <button class="btn sbtn" style="margin-left:8px" onclick="userMsg=\'\';renderMain()">Ausblenden</button></div>';
  if(loginInfo&&loginInfo.error) h+='<div class="card" style="margin-bottom:16px;padding:12px 16px;font-size:12.5px;color:var(--text2)">Login-Status nicht verfügbar: '+esc(loginInfo.msg||'')+' <button class="btn sbtn" style="margin-left:8px" onclick="loginInfo=null;renderMain()">Erneut versuchen</button></div>';
  var TH='text-align:left';
  var TD='vertical-align:middle';
  function row(p,i){
    var r=personRole(p), rc=RC[r], acc=ACC[r], lg=loginOf(p);
    var ini=(p.name||'?').split(' ').map(function(w){return w[0];}).slice(0,2).join('');
    var roleCell=p.kind==='app'
      ?'<span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-block;width:150px"><select data-uid="'+p.id+'" onchange="updateAppUserRole(this)" aria-label="Rolle von '+esc(p.name)+'" style="width:100%;height:34px;padding:4px 10px;font-size:12.5px"><option value="admin"'+(p.role==='admin'?' selected':'')+'>Admin</option><option value="viewer"'+(p.role==='viewer'?' selected':'')+'>Betrachter</option></select></span></span>'
      :(function(){var pr=positionRole(p),set=!!p.boardRole;
        return '<span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-block;width:150px"><select data-eid="'+p.id+'" onchange="updateEmpBoardRole(this)" aria-label="Rolle von '+esc(p.name)+'" style="width:100%;height:34px;padding:4px 10px;font-size:12.5px;'+(set?'border-color:rgba(240,133,102,0.7);background:#FDF0EB':'')+'">'
          +'<option value=""'+(set?'':' selected')+'>'+(set?'Automatisch ('+pr+')':pr)+'</option>'
          +['admin','coach','viewer','agent','none'].map(function(k){return '<option value="'+k+'"'+(p.boardRole===k?' selected':'')+'>'+BOARD_ROLE_LABEL[k]+'</option>';}).join('')
          +'</select></span><span style="font-size:11.5px;white-space:nowrap;color:'+(set?'#B5513A':'var(--text3)')+'">'+(set?'gesetzt'+(p.role&&p.role!=='KAL'?' · Position '+esc(p.role):''):'aus Funktion')+'</span></span>';})();
    var target=p.kind==='app'?'app':'emp';
    var lgCell=lg===null?'<span style="font-size:12px;color:var(--text3)">…</span>'
      :lg?'<span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px"><span style="width:8px;height:8px;border-radius:4px;background:var(--purple)"></span>Aktiv</span>'
      :(p.email?'<button class="btn sbtn" onclick="personLogin(\'create\',\''+target+'\',\''+p.id+'\')"><i class="ti ti-user-plus"></i> Zugang anlegen</button>':'<span style="font-size:12px;color:var(--text3)">E-Mail fehlt</span>');
    // Feste Plätze: Passwort · Login entfernen · Öffnen/Löschen – damit die Knöpfe in allen Zeilen untereinander stehen
    var actions='';
    if(!lg) actions+='<span class="pa-slot"></span><span class="pa-slot"></span>';
    if(lg) actions+='<button class="btn sbtn" title="Passwort neu setzen" aria-label="Passwort neu setzen" onclick="personLogin(\'reset\',\''+target+'\',\''+p.id+'\')"><i class="ti ti-key"></i></button>'
      +'<button class="btn sbtn" title="Login entfernen" aria-label="Login entfernen" onclick="personLogin(\'remove\',\''+target+'\',\''+p.id+'\')"><i class="ti ti-user-x"></i></button>';
    if(p.kind==='app') actions+='<button class="btn sbtn" title="Person entfernen" aria-label="Person entfernen" onclick="deleteAppUser(\''+jsq(p.id)+'\',\''+jsq(p.name)+'\')"><i class="ti ti-trash"></i></button>';
    else actions+='<button class="btn sbtn" title="Mitarbeiter öffnen" aria-label="Mitarbeiter öffnen" onclick="selectEmp(\''+p.id+'\')"><i class="ti ti-arrow-right"></i></button>';
    var bg='';
    var lastCell=(lg&&lg.last_sign_in_at)?(function(){var d=new Date(lg.last_sign_in_at);return '<span style="font-size:12.5px;color:var(--text2);white-space:nowrap">'+('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear()+' · '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+'</span>';})():'<span style="font-size:12.5px;color:var(--text3)">–</span>';
    var ZG={'Admin':'Alles','Coach':'Laut Rollen &amp; Rechte','Betrachter':'Nur ansehen','Sales Agent':'Nur Erweiterung','Kein Zugang':'Kein Zugang'};
    var accCell=(r==='Sales Agent'||r==='Kein Zugang')?'<span style="font-size:12.5px;color:var(--text2)" title="Sales Agents kommen nicht ins Board, sie sehen ihre Zahlen in der Erweiterung">'+ZG[r]+'</span>'
      :'<a href="#" onclick="selectSettingsSub(\'roles\');return false" title="Was diese Rolle darf, legst du unter Rollen &amp; Rechte fest" style="font-size:12.5px;color:'+acc[1]+';text-decoration:none;white-space:nowrap">'+ZG[r]+' ›</a>';
    return '<tr style="'+bg+'"><td style="'+TD+'"><div style="display:flex;align-items:center;gap:10px"><span style="width:30px;height:30px;border-radius:6px;background:#F3ECE8;color:var(--purple);font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">'+esc(ini)+'</span><div style="display:flex;flex-direction:column"><span style="font-size:13px;font-weight:600">'+esc(p.name)+'</span><span style="font-size:11.5px;color:var(--text3)">'+esc(p.kind==='app'?(p.role==='admin'?'Admin':'Betrachter'):p.sub)+'</span></div></div></td>'
      +'<td style="'+TD+'">'+roleCell+'</td><td style="'+TD+';font-size:12.5px;color:var(--text2)">'+esc(p.email||'–')+'</td><td style="'+TD+'">'+lgCell+(lastCell&&lg?'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+lastCell.replace(/<[^>]+>/g,'')+'</div>':'')+'</td>'
      +'<td style="'+TD+';font-size:12.5px">'+(function(){var e=personEmp(p);return e?esc(personFnLabel(e))+'<div style="font-size:11.5px;color:var(--text3)">'+personOrt(e)+'</div>':'<span style="color:var(--text3)">–</span>';})()+'</td>'
      +'<td style="'+TD+';text-align:center">'+personSwitch(p,'kal')+'</td><td style="'+TD+';text-align:center">'+personSwitch(p,'prov')+'</td>'
      +'<td style="'+TD+'">'+accCell+'</td><td style="'+TD+';text-align:right;white-space:nowrap"><div class="pa-grid">'+actions+'</div></td></tr>';
  }
  function table(list){
    return '<div class="std-wrap"><table class="std-table" style="min-width:1080px"><colgroup><col style="width:17%"><col style="width:18%"><col style="width:15%"><col style="width:9%"><col style="width:10%"><col style="width:8%"><col style="width:7%"><col style="width:9%"><col style="width:7%"></colgroup><thead><tr style="background:#EFECE5"><th scope="col" style="'+TH+'">Name</th><th scope="col" style="'+TH+'">Rolle</th><th scope="col" style="'+TH+'">E-Mail</th><th scope="col" style="'+TH+'">Login</th><th scope="col" style="'+TH+'">Funktion · Standort</th><th scope="col" style="'+TH+';text-align:center">Im Urlaubskalender</th><th scope="col" style="'+TH+';text-align:center">In Provision</th><th scope="col" style="'+TH+'">Zugriff</th><th scope="col" style="'+TH+'"></th></tr></thead><tbody>'+list.map(row).join('')+'</tbody></table></div>';
  }
  var match=function(p){ return (!q||(p.name||'').toLowerCase().indexOf(q)>=0||(p.email||'').toLowerCase().indexOf(q)>=0) && (userFilter==='all'||personRole(p)===userFilter); };
  var order={'Admin':0,'Coach':1,'Betrachter':2,'Kein Zugang':3};
  var team=persons.filter(function(p){return personRole(p)!=='Sales Agent'&&match(p);}).sort(function(a,b){return order[personRole(a)]-order[personRole(b)]||a.name.localeCompare(b.name);});
  var agents=persons.filter(function(p){return personRole(p)==='Sales Agent'&&p.active!==false&&match(p);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  // Eine Tabelle für alle: Filter, Suche und Knopf stehen im Kopf der Box
  var all=team.concat(agents);
  h+='<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px"><div style="font-weight:700;font-size:14px;color:var(--text)">Benutzer <span style="font-weight:500;color:var(--text3);font-size:12.5px">('+all.length+')</span></div>'
    +'<div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+_tb+'</div></div>'
    +(all.length?table(all):'<div style="color:var(--text3);font-size:13px;padding:6px 2px">Keine Treffer.</div>')+'</div>';
  h+='<p style="font-size:12px;color:var(--text3);margin:4px 0 0">Neue Sales Agents und Coaches legst du wie bisher über „Mitarbeiter hinzufügen“ an. Ob jemand Coach ist, ergibt sich aus der Position (SC/SDM).</p>';
  return h;
}
function personLogin(action,kind,id){
  var p=allPersons().find(function(x){return x.kind===kind&&x.id===id;}); if(!p)return;
  var pw=(action==='create'||action==='reset')?genAgentPassword():'';
  var ask={create:'Login für '+p.name+' ('+p.email+') anlegen? Es wird ein Startpasswort erzeugt.',reset:'Passwort von '+p.name+' neu setzen? Das alte Passwort gilt dann nicht mehr.',remove:'Login von '+p.name+' entfernen? Die Person kann sich danach nicht mehr anmelden.'}[action];
  if(!confirm(ask))return;
  var body={action:action,password:pw}; body[kind==='app'?'app_user_id':'employee_id']=id;
  sb.functions.invoke('agent-login',{body:body}).then(function(res){
    var data=res.data||{};
    var fail=function(t){ userMsg='<span style="color:var(--red)">'+esc(t)+'</span>'; renderMain(); };
    if(res.error||data.error){
      if(!data.error&&res.error&&res.error.context&&typeof res.error.context.json==='function') return res.error.context.json().then(function(j){fail(j.error||res.error.message);}).catch(function(){fail(res.error.message);});
      return fail(data.error||res.error.message);
    }
    if(kind==='app'){ var u=appUsers.find(function(x){return x.id===id;}); if(u) u.authUserId=action==='remove'?null:(data.auth_user_id||u.authUserId); }
    else { var e=employees.find(function(x){return x.id===id;}); if(e&&action!=='reset') e.auth_user_id=action==='remove'?null:data.auth_user_id; }
    logActivity('employee','login_'+action,{create:'Login angelegt',reset:'Passwort neu gesetzt',remove:'Login entfernt'}[action]+': '+p.name,kind==='emp'?id:null,p.name);
    userMsg=action==='remove'?'Login von <b>'+esc(p.name)+'</b> entfernt.'
      :'<b>'+(action==='create'?'Login angelegt':'Passwort neu gesetzt')+' für '+esc(p.name)+'.</b> Bitte jetzt notieren und persönlich weitergeben – es wird nicht gespeichert:<br>E-Mail: <b>'+esc(p.email)+'</b> · Passwort: <b style="font-family:monospace">'+esc(pw)+'</b>';
    loginInfo=null; renderMain();
  }).catch(function(e){ userMsg='<span style="color:var(--red)">Server nicht erreichbar – ist die Funktion „agent-login“ in Supabase eingerichtet?</span>'; renderMain(); });
}
function saveNewAppUser(){
  if(_savingNewAppUser)return;
  var name=document.getElementById('newAppUserName').value.trim();
  var email=document.getElementById('newAppUserEmail').value.trim();
  var role=document.getElementById('newAppUserRole').value;
  if(!name||!email){alert('Bitte Name und E-Mail ausfüllen.');return;}
  _savingNewAppUser=true;
  sb.from('app_users').insert({name:name,email:email,role:role}).select().single().then(function(res){
    _savingNewAppUser=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    appUsers.push({id:res.data.id,authUserId:res.data.auth_user_id,email:res.data.email,name:res.data.name,role:res.data.role});
    logActivity('employee','created','Neuer '+(role==='admin'?'Admin':'Betrachter')+' angelegt: '+name);
    document.getElementById('newAppUserName').value='';
    document.getElementById('newAppUserEmail').value='';
    document.getElementById('newAppUserRole').value='viewer';
    closeModal('addAppUserModal');
    renderMain();
  }).catch(function(err){_savingNewAppUser=false;alert('Unerwarteter Fehler: '+err.message);});
}
function updateAppUserRole(sel){
  if(sel.disabled)return;
  var uid=sel.dataset.uid, newRole=sel.value;
  sel.disabled=true;
  sb.from('app_users').update({role:newRole}).eq('id',uid).then(function(res){
    sel.disabled=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    var u=appUsers.find(function(x){return x.id===uid;});
    if(u){u.role=newRole;logActivity('employee','updated','Rolle geändert: '+u.name+' → '+(newRole==='admin'?'Admin':'Betrachter'));}
  }).catch(function(err){sel.disabled=false;alert('Unerwarteter Fehler: '+err.message);});
}
function deleteAppUser(uid,name){
  if(_deletingAppUser)return;
  if(!confirm(name+' wirklich entfernen? Die Person kann sich danach nicht mehr sinnvoll einloggen (kein Admin-/Betrachter-Zugriff mehr).'))return;
  _deletingAppUser=true;
  sb.from('app_users').delete().eq('id',uid).then(function(res){
    _deletingAppUser=false;
    if(res.error){alert('Fehler beim Löschen: '+res.error.message);return;}
    appUsers=appUsers.filter(function(u){return u.id!==uid;});
    logActivity('employee','deleted','Admin/Betrachter entfernt: '+name);
    renderMain();
  }).catch(function(err){_deletingAppUser=false;alert('Unerwarteter Fehler: '+err.message);});
}
// ── Zugaenge fuer die Sales-OS-Erweiterung (ueber die Edge Function "agent-login") ──
function genAgentPassword(){
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var a=new Uint32Array(12); crypto.getRandomValues(a);
  var s=''; for(var i=0;i<12;i++) s+=chars[a[i]%chars.length];
  return s.slice(0,4)+'-'+s.slice(4,8)+'-'+s.slice(8,12);
}
function agentLogin(action,empId){
  var emp=employees.find(function(e){return e.id===empId;}); if(!emp) return;
  var pwEl=document.getElementById('al-pw'), msg=document.getElementById('al-msg');
  var pw=pwEl?pwEl.value.trim():'';
  if((action==='create'||action==='reset')&&pw.length<10){ msg.innerHTML='<span style="color:var(--red)">Bitte ein Passwort mit mindestens 10 Zeichen eingeben oder mit dem Zauberstab erzeugen.</span>'; return; }
  if(action==='remove'&&!confirm('Zugang von '+emp.name+' zur Erweiterung wirklich entfernen? Der Login wird gelöscht.')) return;
  msg.innerHTML='<span style="color:var(--text3)">Wird ausgeführt …</span>';
  sb.functions.invoke('agent-login',{body:{action:action,employee_id:empId,password:pw}}).then(function(res){
    var err=res.error, data=res.data||{};
    if(err||data.error){
      var t=data.error||'';
      if(!t&&err&&err.context&&typeof err.context.json==='function'){ return err.context.json().then(function(j){ msg.innerHTML='<span style="color:var(--red)">'+esc(j.error||err.message)+'</span>'; }).catch(function(){ msg.innerHTML='<span style="color:var(--red)">'+esc(err.message)+'</span>'; }); }
      msg.innerHTML='<span style="color:var(--red)">'+esc(t||(err&&err.message)||'Fehler')+'</span>'; return;
    }
    if(action==='create'){ emp.auth_user_id=data.auth_user_id; logActivity('employee','agent_login_created','Erweiterungs-Zugang angelegt',emp.id,emp.name); }
    if(action==='remove'){ emp.auth_user_id=null; logActivity('employee','agent_login_removed','Erweiterungs-Zugang entfernt',emp.id,emp.name); }
    if(action==='reset'){ logActivity('employee','agent_login_reset','Erweiterungs-Passwort neu gesetzt',emp.id,emp.name); }
    renderMain();
    setTimeout(function(){
      var m2=document.getElementById('al-msg'); if(!m2) return;
      if(action==='remove'){ m2.innerHTML='<span style="color:var(--purple)">Zugang entfernt.</span>'; return; }
      m2.innerHTML='<div style="background:var(--s-tint);border-radius:10px;padding:10px 12px"><b>'+(action==='create'?'Zugang angelegt.':'Passwort neu gesetzt.')+'</b> Bitte jetzt notieren und dem Mitarbeiter persönlich geben – es wird nicht gespeichert:<br>'
        +'E-Mail: <b>'+esc(emp.email||'')+'</b> · Passwort: <b style="font-family:monospace">'+esc(pw)+'</b></div>';
    },50);
  }).catch(function(e){ msg.innerHTML='<span style="color:var(--red)">Server nicht erreichbar: '+esc(e.message||String(e))+'. Ist die Funktion „agent-login“ in Supabase eingerichtet?</span>'; });
}
function nextMotivationQuote(){
  var bag=[];
  try{bag=JSON.parse(localStorage.getItem('motivationBag')||'[]');}catch(e){bag=[];}
  if(!bag||!bag.length){
    bag=MOTIVATION_QUOTES.map(function(_,i){return i;});
    for(var i=bag.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=bag[i];bag[i]=bag[j];bag[j]=t;}
  }
  var idx=bag.pop();
  try{localStorage.setItem('motivationBag',JSON.stringify(bag));}catch(e){}
  return MOTIVATION_QUOTES[idx];
}
function wizardMargeInfo(){
  var mk=today().slice(0,7);
  var liste=employeeActiveList();
  var monatIst=0;
  liste.forEach(function(e){
    (performance[e.id]||[]).forEach(function(x){
      if((x.date||'').slice(0,7)!==mk)return;
      monatIst+=x.margeGesamt||x.margin||0;
    });
  });
  var wMeta=getMonthWeeksZiel(mk);
  var mRec=zielStore[mk]||{};
  var mVisible=liste.filter(function(e){return empActiveInZielMonth(e,mk);});
  var monatZiel=0;
  mVisible.forEach(function(e){
    var r=mRec[e.id]||{};
    var weeks=wMeta.map(function(wm,i){return(r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays;});
    var monthSum=weeks.reduce(function(a,b){return a+b;},0);
    var optTag=r.optTag!=null?r.optTag:0;
    var margeOpt=r.margeOpt!=null?r.margeOpt:0;
    monatZiel+=monthSum*optTag*margeOpt;
  });
  var pct=monatZiel>0?Math.round(monatIst/monatZiel*100):0;
  return {ist:monatIst,ziel:monatZiel,pct:pct};
}
function wizardOverdueList(scopeList,days){
  var lim=(days!=null&&days!=='')?+days:30;
  return scopeList.filter(function(e){var t=tageSeitLetzterSession(e.id);return t===null||t>lim;});
}
function wizardQaFaelligList(scopeList,days){
  var cutoff=addDaysUTC(today(),-((days!=null&&days!=='')?+days:60));
  return scopeList.filter(function(e){
    var cnt=(callRatings[e.id]||[]).filter(function(r){return r.date>=cutoff;}).length;
    return cnt<5;
  });
}
function wizardUpcomingSessions(coachIdOrNull,days){
  var all=[],von=today(),bis=(days!=null&&days!=='')?addDaysUTC(von,+days):null;
  employeeActiveList().forEach(function(e){
    (protocols[e.id]||[]).forEach(function(p){
      if(p.status!=='geplant')return;
      if(p.date<von)return;
      if(bis&&p.date>bis)return;
      if(coachIdOrNull!==null&&p.coachId!==coachIdOrNull)return;
      all.push({empName:e.name,date:p.date});
    });
  });
  all.sort(function(a,b){return a.date.localeCompare(b.date);});
  return all;
}
// ── 13-Uhr-Wizard: Hilfsfunktionen (CR immer aus Rohzahlen: erst summieren, dann teilen) ──
function dwRowsToday(empId){var t=today();return (performance[empId]||[]).filter(function(x){return x.date===t;});}
function dwRowsMonth(empId){var mk=today().slice(0,7);return (performance[empId]||[]).filter(function(x){return (x.date||'').slice(0,7)===mk;});}
function dwSums(rows){
  var s={oem:0,notS:0,tw:0,yes:0,sy:0,my:0,ups:0,wka:0,marge:0};
  rows.forEach(function(x){
    s.oem+=x.convOEM||0;s.notS+=x.notSuccessful||0;s.tw+=x.convTW||0;s.yes+=x.convYes||0;
    s.sy+=x.convSY||0;s.my+=x.convMY||0;s.ups+=x.ups_yes||0;s.wka+=x.wka_gesamt_yes||0;
    s.marge+=x.margeGesamt||x.margin||0;
  });
  s.opt=s.oem+s.ups+s.wka;
  return s;
}
function dwCr(s,metric){
  var d;
  if(metric==='crOEM'){d=s.oem+s.notS;return d>0?s.oem/d*100:null;}
  if(metric==='crTW'){d=s.tw+s.yes+s.sy+s.my;return d>0?s.tw/d*100:null;}
  if(metric==='crSyMy'){d=s.yes+s.sy+s.my;return d>0?(s.sy+s.my)/d*100:null;}
  if(metric==='crMY'){d=s.yes+s.sy+s.my;return d>0?s.my/d*100:null;}
  return null;
}
function dwTeamEmps(){return employees.filter(function(e){return !e.isPureCoach;});}
function dwTeamSums(rowFn){var all=[];dwTeamEmps().forEach(function(e){all=all.concat(rowFn(e.id));});return dwSums(all);}
// Hochrechnung auf Tagesende: je Mitarbeiter bisheriger Wert / verstrichene Arbeitszeit * geplante Arbeitszeit heute
function dwPrognose(kind){
  var t=today(),sum=0;
  dwTeamEmps().forEach(function(e){
    var rows=dwRowsToday(e.id);if(!rows.length)return;
    var s=dwSums(rows),ist=kind==='marge'?s.marge:s.opt;
    var planned=workHoursForDate(e,t),elapsed=elapsedWorkHoursTodayFor(e);
    sum+=(planned>0&&elapsed>0&&elapsed<planned)?ist/elapsed*planned:ist;
  });
  return sum;
}
function dwStandStr(){
  var ref=new Date();
  if(settings.ftpLastSync){var sd=new Date(settings.ftpLastSync);if(!isNaN(sd.getTime())&&localYmd(sd)===today()&&sd<ref)ref=sd;}
  return ('0'+ref.getHours()).slice(-2)+':'+('0'+ref.getMinutes()).slice(-2);
}
// Einheitliches Slide-Geruest: feste Hoehe, Kopf (Icon/Titel/Stand) oben, Inhalt, Fussnote immer unten
function dwHead(icon,iconBg,title){
  return '<div style="width:100%;height:370px;text-align:left;display:flex;flex-direction:column">'
    +'<div style="width:44px;height:44px;border-radius:12px;background:'+iconBg+';display:flex;align-items:center;justify-content:center;font-size:21px;margin-bottom:14px;flex-shrink:0"><i class="ti '+icon+'"></i></div>'
    +'<div style="font-size:18px;font-weight:700;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+title+'</div>'
    +'<div style="font-size:12.5px;color:#FFE1D6;margin-bottom:18px">'+fd(today())+' · Stand '+dwStandStr()+' Uhr</div>';
}
function dwFoot(txt){return '<div style="margin-top:auto;font-size:11.5px;color:#FFE1D6;padding-top:10px">'+(txt||'&nbsp;')+'</div></div>';}
function dwBar(pct){
  var w=Math.max(0,Math.min(100,pct||0));
  return '<div style="height:7px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden;margin:12px 0 7px"><div style="height:100%;width:'+w+'%;background:#F7B39A;border-radius:4px"></div></div>';
}
function dwTile(label,val,sub,subCol){
  return '<div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px">'
    +'<div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">'+label+'</div>'
    +'<div style="font-size:21px;font-weight:700;margin-top:4px">'+val+'</div>'
    +'<div style="font-size:12px;margin-top:2px;color:'+(subCol||'#FFE1D6')+'">'+(sub||'&nbsp;')+'</div></div>';
}
// Ziel-Slide (Optimierungen + Marge identisch aufgebaut): grosse Zahl, Zielzeile, Balken, Offen/Prozent, Prognose-Kachel
function dwGoalSlide(icon,title,ist,ziel,prog,fmt){
  var h=dwHead(icon,'rgba(247,179,154,0.15)',title);
  h+='<div style="font-size:40px;font-weight:800;line-height:1.05">'+fmt(ist)+'</div>';
  if(ziel>0){
    var offen=Math.max(0,ziel-ist),pct=Math.round(ist/ziel*100);
    h+='<div style="font-size:12.5px;color:#FFE1D6">bisher heute · Tagesziel '+fmt(ziel)+'</div>'+dwBar(pct)
      +'<div style="display:flex;justify-content:space-between;font-size:13px"><span style="font-weight:600;color:'+(offen>0?'#ffb3b3':'#F7B39A')+'">'+(offen>0?'noch '+fmt(offen)+' offen':'Tagesziel erreicht')+'</span><span style="color:#FFE1D6">'+pct+'%</span></div>';
  } else {
    h+='<div style="font-size:12.5px;color:#FFE1D6">bisher heute · kein Tagesziel hinterlegt</div>'+dwBar(0)
      +'<div style="font-size:13px">&nbsp;</div>';
  }
  var sub=ziel>0?(prog>=ziel?'Ziel wird voraussichtlich erreicht':'ca. '+fmt(ziel-prog)+' unter Ziel'):'';
  h+='<div style="margin-top:16px">'+dwTile('PROGNOSE TAGESENDE','≈ '+fmt(prog),sub,prog>=ziel?'#F7B39A':'#ffb3b3')+'</div>';
  return h+dwFoot('Prognose: Hochrechnung je Mitarbeiter auf seine Arbeitszeit heute');
}
function dwNum(v){return Math.round(v).toLocaleString('de-DE');}
function buildDailyWizardOpt(){
  var s=dwTeamSums(dwRowsToday);
  return dwGoalSlide('ti-target-arrow','Optimierungen heute',s.opt,todayTargetStat('opt'),dwPrognose('opt'),dwNum);
}
function buildDailyWizardMarge(){
  var s=dwTeamSums(dwRowsToday);
  return dwGoalSlide('ti-currency-euro','Marge gesamt',s.marge,todayTargetStat('marge'),dwPrognose('marge'),fmtEur);
}
function buildDailyWizardCr(){
  var sT=dwTeamSums(dwRowsToday),sM=dwTeamSums(dwRowsMonth);
  function f(v){return v===null?'—':Math.round(v)+'%';}
  function t(lbl,m){return dwTile(lbl,f(dwCr(sT,m)),'Monat: '+f(dwCr(sM,m)));}
  var h=dwHead('ti-percentage','rgba(247,179,154,0.15)','Conversion Rates (Team)');
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+t('CR OEM','crOEM')+t('CR TW','crTW')+t('CR SY/MY','crSyMy')+t('CR MY','crMY')+'</div>';
  return h+dwFoot('Große Zahl: heute · darunter: laufender Monat');
}
// Schwaechste 3: nur Verkaeufer (keine Coaches SC/SDM, keine inaktiven) mit mehr als minOpt Optimierungen heute
function dwWorstCandidates(minOpt){
  var lim=(minOpt!=null)?+minOpt:5;
  return employees.filter(function(e){return !e.isPureCoach&&e.active!==false&&e.role!=='SDC'&&e.role!=='SDM';})
    .map(function(e){return {e:e,s:dwSums(dwRowsToday(e.id))};})
    .filter(function(x){return x.s.opt>lim;});
}
function dailyWizardWorstPage(title,metric,minOpt){
  var lim=(minOpt!=null)?+minOpt:5;
  var isMarge=metric==='marge';
  var rows=dwWorstCandidates(lim).map(function(x){
    return {name:x.e.name,val:isMarge?x.s.marge:dwCr(x.s,metric),marge:x.s.marge,opt:x.s.opt};
  }).filter(function(x){return x.val!==null;}).sort(function(a,b){return a.val-b.val;}).slice(0,3);
  var cols='grid-template-columns:minmax(0,1fr) 84px 64px;gap:10px';
  var h=dwHead('ti-alert-triangle','rgba(229,115,115,0.15)','Schwächste 3 – '+title);
  h+='<div style="display:grid;'+cols+';font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.03em;padding:0 12px 6px"><span>MITARBEITER</span><span style="text-align:right">'+(isMarge?'OPT. HEUTE':'MARGE HEUTE')+'</span><span style="text-align:right">'+(isMarge?'MARGE':title.toUpperCase())+'</span></div>';
  for(var i=0;i<3;i++){
    var r=rows[i];
    if(r){
      h+='<div style="display:grid;'+cols+';align-items:center;height:40px;box-sizing:border-box;padding:0 12px;background:rgba(229,115,115,0.12);border-radius:8px;margin-bottom:8px;font-size:13px">'
        +'<span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(i+1)+'. '+esc(r.name)+'</span>'
        +'<span style="text-align:right;color:#FFF0EA;white-space:nowrap">'+(isMarge?Math.round(r.opt):fmtEur(r.marge))+'</span>'
        +'<span style="text-align:right;font-weight:700;color:#ffb3b3;white-space:nowrap">'+(isMarge?fmtEur(r.val):Math.round(r.val)+'%')+'</span></div>';
    } else {
      h+='<div style="height:40px;box-sizing:border-box;padding:0 12px;display:flex;align-items:center;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px;font-size:12.5px;color:#FFE1D6">'+(i===0&&!rows.length?'Noch niemand mit mehr als '+lim+' Optimierungen heute':'—')+'</div>';
    }
  }
  return h+dwFoot('Nur Verkäufer mit mehr als '+lim+' Optimierungen heute');
}
function wizKpiLabel(k){var x=WIZ_KPIS.filter(function(p){return p[0]===k;})[0];return x?x[1]:k;}
function wizKpiFmt(v,k){if(v===null||v===undefined)return '—';if(k==='marge')return fmtEur(v);if(k==='opt')return dwNum(v);return Math.round(v)+'%';}
// Rangliste der letzten 30 Tage, CR immer erst summieren, dann teilen
function wizRanked(scope,kpi,minOpt){
  var cutoff=addDaysUTC(today(),-30);
  return scope.map(function(e){
    var rows=(performance[e.id]||[]).filter(function(x){return (x.date||'')>=cutoff;});
    if(!rows.length)return null;
    var s=dwSums(rows),v=kpi==='marge'?s.marge:kpi==='opt'?s.opt:dwCr(s,kpi);
    if(v===null||s.opt<(minOpt||0))return null;
    return {e:e,v:v};
  }).filter(Boolean).sort(function(a,b){return b.v-a.v;});
}
function wizFirst(e){return e.name.split(' ')[0].toUpperCase();}
function wizNames(l){return l.slice(0,3).map(function(e){return e.name;}).join(', ')+(l.length>3?' und weitere.':'.');}
function wizSlideList(onIds,extra){
  var list=onIds.map(function(id){return {id:id,on:true};});
  WIZ_SLIDE_IDS.forEach(function(id){if(onIds.indexOf(id)<0)list.push({id:id,on:false});});
  return list.map(function(s){return Object.assign({},WIZ_SLIDES[s.id].def,(extra&&extra[s.id])||{},s);});
}
// Standardbelegung = Stand vor dem Umbau; der Tagesüberblick übernimmt die bisherigen wizardSettings
function wizDefaultConfig(){
  var old=wizCfg(),dOn=[];
  if(old.slides.opt)dOn.push('opt');if(old.slides.marge)dOn.push('margeToday');if(old.slides.cr)dOn.push('cr');if(old.slides.worst)dOn.push('worstKpi');
  return {v:1,wizards:[
    {id:'login_admin',name:'Login · Admin',on:true,trigger:{login:true,time:false,at:'09:00'},freq:'every',roles:{admin:true,coach:false,viewer:true},scope:'team',quote:true,slides:wizSlideList(['overdue','qa','margeUp','upcoming','dist'])},
    {id:'login_coach',name:'Login · Coach',on:true,trigger:{login:true,time:false,at:'09:00'},freq:'every',roles:{admin:false,coach:true,viewer:false},scope:'own',quote:true,slides:wizSlideList(['overdue','upcoming','qa','margeUp','top3','worst3'])},
    {id:'daily',name:'Tagesüberblick',on:old.on,trigger:{login:false,time:true,at:old.time},freq:'daily',roles:Object.assign({},old.roles),scope:'team',quote:false,slides:wizSlideList(dOn.length?dOn:['opt'],{worstKpi:{minOpt:old.minOpt}})}
  ]};
}
// Gespeicherte Konfiguration mit der Standardbelegung zusammenführen (fehlende Felder/Slides werden ergänzt, nichts geht verloren)
function wizConfig(){
  var def=wizDefaultConfig(),st=settings.wizardConfig;
  if(!st||!Array.isArray(st.wizards))return def;
  def.wizards=def.wizards.map(function(dw){
    var sw=st.wizards.filter(function(x){return x&&x.id===dw.id;})[0];
    if(!sw)return dw;
    var w=Object.assign({},dw,sw);
    w.trigger=Object.assign({},dw.trigger,sw.trigger||{});
    w.roles=Object.assign({},dw.roles,sw.roles||{});
    var seen={},list=[];
    (sw.slides||[]).forEach(function(s){
      if(!s||!WIZ_SLIDES[s.id]||seen[s.id])return;seen[s.id]=1;
      list.push(Object.assign({},WIZ_SLIDES[s.id].def,s));
    });
    dw.slides.forEach(function(s){if(!seen[s.id])list.push(Object.assign({},s,{on:false}));});
    w.slides=list;
    return w;
  });
  return def;
}
function wizGet(id){return wizConfig().wizards.filter(function(w){return w.id===id;})[0]||null;}
function wizBuildPages(w){
  var own=w.scope==='own'&&!!currentCoach;
  var ctx={own:own,coach:own?currentCoach:null,scope:own?getCoacheesFor(currentCoach.id):employeeActiveList()};
  var pages=[];
  w.slides.forEach(function(s){
    if(!s.on||!WIZ_SLIDES[s.id])return;
    try{pages=pages.concat(WIZ_SLIDES[s.id].build(ctx,s));}catch(e){console.warn('Wizard-Slide '+s.id+' fehlgeschlagen:',e);}
  });
  if(w.quote&&pages.length)pages.push({type:'quote',quote:nextMotivationQuote()});
  return pages;
}
function wizPageHtml(p){
  if(p.html)return p.html;
  if(p.type==='quote')return '<div class="wizard-icon"><i class="ti ti-bulb"></i></div><div class="wizard-quote">"'+p.quote+'"</div>';
  if(p.type==='tasklist')return '<div class="wizard-title">'+p.title+'</div><div class="wizard-sub">'+p.sub+'</div>'
    +p.items.map(function(it){return '<div class="wizard-taskrow"><i class="ti '+it.icon+'"></i>'+esc(it.text)+'</div>';}).join('');
  if(p.type==='stagerow')return '<div class="wizard-title">'+p.title+'</div><div class="wizard-sub">'+p.sub+'</div>'
    +'<div class="wizard-stagerow">'+p.boxes.map(function(b){return '<div class="wizard-stagebox"><strong>'+b.n+'</strong><span>'+esc(b.l)+'</span></div>';}).join('')+'</div>';
  return '<div class="wizard-icon"><i class="ti '+p.icon+'"></i></div><div class="wizard-stat">'+p.stat+'</div><div class="wizard-title">'+p.title+'</div><div class="wizard-sub">'+esc(p.sub)+'</div>';
}
function wizOverlayOpen(){var o=document.getElementById('loginWizardOverlay');return !!o&&!o.classList.contains('hidden');}
function wizShownKey(w){return w.id==='daily'?'dailyWizardShownDate':'wizShown_'+w.id;}
function wizShownToday(w){try{return localStorage.getItem(wizShownKey(w))===today();}catch(e){return false;}}
function wizMarkShown(w){try{localStorage.setItem(wizShownKey(w),today());}catch(e){}}
function wizOpen(w,opts){
  opts=opts||{};
  var pages=wizBuildPages(w);
  if(!opts.preview&&(w.freq==='daily'||opts.source==='time'))wizMarkShown(w);
  if(!pages.length){ if(opts.preview)alert('In diesem Wizard ist keine Slide eingeschaltet.'); else wizDrain(); return; }
  wizRun={w:w,pages:pages,i:0,preview:!!opts.preview};
  wizRender();
  document.getElementById('loginWizardOverlay').classList.remove('hidden');
}
function wizRender(){
  var p=wizRun.pages[wizRun.i],n=wizRun.pages.length,last=wizRun.i>=n-1;
  var body=document.getElementById('wizardBody');
  body.innerHTML=wizPageHtml(p);
  body.style.padding=p.html?'32px 28px 24px':'';
  var dots=document.getElementById('wizardDots');dots.innerHTML='';
  for(var i=0;i<n;i++){var d=document.createElement('span');d.className='wizard-dot'+(i===wizRun.i?' active':'');dots.appendChild(d);}
  document.getElementById('wizardNextBtn').innerHTML=last?(wizRun.w&&wizRun.w.quote?'Los geht\'s <i class="ti ti-check"></i>':'Fertig <i class="ti ti-check"></i>'):'Weiter <i class="ti ti-arrow-right"></i>';
}
function wizardNext(){
  if(wizRun.i>=wizRun.pages.length-1){closeLoginWizard();return;}
  wizRun.i++;wizRender();
}
function closeLoginWizard(){
  document.getElementById('loginWizardOverlay').classList.add('hidden');
  var wasPreview=wizRun.preview;
  wizRun={w:null,pages:[],i:0,preview:false};
  if(!wasPreview)setTimeout(wizDrain,250);
}
function wizDrain(){
  if(wizOverlayOpen())return;
  while(wizQueue.length){
    var q=wizQueue.shift(),w=wizGet(q.id);
    if(w){wizOpen(w,{source:q.source});return;}
  }
}
function wizEnqueue(w,source){
  if(wizQueue.some(function(q){return q.id===w.id;}))return;
  if(wizRun.w&&wizRun.w.id===w.id&&wizOverlayOpen())return;
  wizQueue.push({id:w.id,source:source});
}
function wizForMe(w){return !!(w.on&&currentUserRole&&w.roles[currentUserRole]);}
function wizTimeReached(at){var tp=String(at||'00:00').split(':'),n=new Date();return n.getHours()*60+n.getMinutes()>=(+tp[0])*60+(+tp[1]||0);}
// Bei Anmeldung (frischer Login-Klick)
function openLoginWizard(){
  wizConfig().wizards.forEach(function(w){
    if(!wizForMe(w)||!w.trigger.login)return;
    if(w.freq==='daily'&&wizShownToday(w))return;
    wizEnqueue(w,'login');
  });
  wizDrain();
}
// Uhrzeit-Auslöser: beim Laden und jede Minute, höchstens einmal pro Tag und Gerät
function checkDailyWizard(){
  if(!currentUserRole)return;
  wizConfig().wizards.forEach(function(w){
    if(!wizForMe(w)||!w.trigger.time)return;
    if(wizShownToday(w)||!wizTimeReached(w.trigger.at))return;
    wizEnqueue(w,'time');
  });
  wizDrain();
}
// Kompatibilität: alte Aufrufe zeigen die Vorschau des Tagesüberblicks
function dailyWizardNext(){wizardNext();}

function renderActivity(){
  var ma=document.getElementById('mainArea');if(!ma)return;
  var coachList=employees.filter(function(e){return isCoachEmp(e)&&e.active!==false;});
  var auditActionLabels={kpi_target_global:'Globale KPI-Ziele geändert',kpi_target_employee:'Individuelle KPI-Ziele geändert',employee_deactivated:'Mitarbeiter deaktiviert'};
  var auditActionCategory={kpi_target_global:'kpi_target',kpi_target_employee:'kpi_target',employee_deactivated:'employee'};
  var auditAsActivity=(adminAuditLog||[]).map(function(a){
    return {
      actorId:a.changedBy||null,
      actorName:null,
      category:auditActionCategory[a.action]||'kpi_target',
      createdAt:a.changedAt,
      description:(auditActionLabels[a.action]||a.action)+(a.details?': '+a.details:'')
    };
  });
  var combinedLog=activityLog.concat(auditAsActivity).sort(function(x,y){return (y.createdAt||'').localeCompare(x.createdAt||'');});
  var cutoff=(function(){var d=new Date(today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-activityFilterDays);return d.toISOString().slice(0,10);})();
  var filtered=combinedLog.filter(function(a){
    if(activityFilterPerson!=='ALL'){
      if(activityFilterPerson.indexOf('NAME:')===0){
        if(a.actorId||a.actorName!==activityFilterPerson.slice(5))return false;
      } else if(a.actorId!==activityFilterPerson){
        return false;
      }
    }
    return (a.createdAt||'').slice(0,10)>=cutoff;
  });

  // Aktivitäten pro Tag (Balken)
  var byDate={};
  filtered.forEach(function(a){if(a.category==='login')return;var d=(a.createdAt||'').slice(0,10);byDate[d]=(byDate[d]||0)+1;});
  var days=[];
  for(var i=activityFilterDays-1;i>=0;i--){
    var d=new Date(today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-i);
    var ds=d.toISOString().slice(0,10);
    days.push({ds:ds,n:byDate[ds]||0,wd:['So','Mo','Di','Mi','Do','Fr','Sa'][d.getUTCDay()]});
  }
  var maxN=100;

  // ── Petrol-Infobox: immer letzte 30 Tage vs. die 30 Tage davor ──
  var last30From=addDaysUTC(today(),-29),last30To=today();
  var prev30From=addDaysUTC(today(),-59),prev30To=addDaysUTC(today(),-30);
  var h='<div class="content">';
  h+=buildGlobalBannerHtml(employees.filter(function(e){return !e.isPureCoach;}));

  // ── Verlauf-Liste (mit Filter-Steuerung im Kopf) ──
  h+='<div class="card">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">';
  h+='<div class="card-title" style="margin:0">Verlauf <span style="font-weight:400;font-size:12px;color:var(--text3);text-transform:none;letter-spacing:0">('+filtered.length+' von '+combinedLog.length+')</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px">';
  h+='<select onchange="setActivityFilterPerson(this.value)" style="width:auto;height:34px;font-size:12px;font-weight:500;padding:0 12px;border:1px solid var(--border2);border-radius:var(--r-md);background:var(--bg);color:var(--text);cursor:pointer">';
  h+='<option value="ALL"'+(activityFilterPerson==='ALL'?' selected':'')+'>Alle Personen</option>';
  if(coachList.length){
    h+='<optgroup label="Coaches">';
    coachList.forEach(function(c){h+='<option value="'+c.id+'"'+(activityFilterPerson===c.id?' selected':'')+'>'+esc(c.name)+'</option>';});
    h+='</optgroup>';
  }
  // Admins & Betrachter: alle aus app_users (auch ohne bisherigen Eintrag) + Admin-Fallbacks + Namen aus dem Protokoll
  var adminNames=[],roleOf={};
  (appUsers||[]).forEach(function(u){var nm=u.name||u.email;if(nm&&adminNames.indexOf(nm)<0){adminNames.push(nm);roleOf[nm]=u.role;}});
  Object.keys(ADMIN_NAME_MAP||{}).forEach(function(k){var nm=ADMIN_NAME_MAP[k];if(nm&&adminNames.indexOf(nm)<0){adminNames.push(nm);roleOf[nm]='admin';}});
  activityLog.forEach(function(a){if(!a.actorId&&a.actorName&&adminNames.indexOf(a.actorName)<0)adminNames.push(a.actorName);});
  adminNames.sort(function(a,b){return a.localeCompare(b);});
  if(adminNames.length){
    h+='<optgroup label="Admins &amp; Betrachter">';
    adminNames.forEach(function(nm){var val='NAME:'+nm;var rl=roleOf[nm]==='viewer'?' (Betrachter)':(roleOf[nm]==='admin'?' (Admin)':'');h+='<option value="'+esc(val)+'"'+(activityFilterPerson===val?' selected':'')+'>'+esc(nm)+rl+'</option>';});
    h+='</optgroup>';
  }
  h+='</select>';
  h+='<div style="display:flex;border:1px solid var(--border2);border-radius:var(--r-md);overflow:hidden;height:34px">';
  [7,30,90].forEach(function(d){
    h+='<button style="padding:0 14px;height:100%;font-size:12px;font-weight:500;border:none;cursor:pointer;font-family:inherit;background:'+(activityFilterDays===d?'var(--purple)':'transparent')+';color:'+(activityFilterDays===d?'#fff':'var(--text2)')+'" onclick="setActivityFilterDays('+d+')">'+d+'T</button>';
  });
  h+='</div></div></div>';
  if(!filtered.length){
    h+='<div style="text-align:center;color:var(--text3);padding:24px"><i class="ti ti-history-off" style="font-size:26px;display:block;margin-bottom:8px"></i>Keine Einträge</div>';
  } else {
    h+='<div style="display:flex;flex-direction:column;gap:8px">';
    filtered.slice(0,100).forEach(function(a){
      var actor=a.actorId?employees.find(function(e){return e.id===a.actorId;}):null;
      var displayName=actor?actor.name:(a.actorName||null);
      var c=actor?COLORS[actor.color%COLORS.length]:{bg:'var(--purple-bg)',text:'var(--purple)'};
      var meta=CATEGORY_META[a.category]||{label:a.category.toUpperCase(),col:'var(--text2)',bg:'var(--bg2)'};
      var dt=new Date(a.createdAt);
      var timeStr=isNaN(dt)?'':dt.toLocaleString('de-DE',{hour:'2-digit',minute:'2-digit'});
      var dateStr=isNaN(dt)?'':fd(a.createdAt.slice(0,10));
      var isToday=a.createdAt&&a.createdAt.slice(0,10)===today();
      h+='<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 14px;background:var(--s-sub);border:1px solid var(--border2);border-radius:var(--r-md)">';
      h+='<div style="width:70px;flex-shrink:0;font-size:11px;color:var(--text3);padding-top:2px">'+(isToday?timeStr:dateStr)+'</div>';
      h+='<div class="av" style="width:26px;height:26px;font-size:10px;background:'+c.bg+';color:'+c.text+';flex-shrink:0" title="'+esc(displayName||'Unbekannt')+'">'+(displayName?ini(displayName):'?')+'</div>';
      h+='<div style="flex:1;min-width:0">';
      h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">';
      h+='<span style="font-size:12px;font-weight:600">'+esc(displayName||'Unbekannt')+'</span>';
      h+='<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:'+meta.bg+';color:'+meta.col+'">'+meta.label+'</span>';
      h+='<span style="font-size:12px;color:var(--text2)">'+esc(a.description)+'</span>';
      h+='</div>';
      if(a.targetLabel)h+='<div style="font-size:11px;color:var(--text3)">'+esc(a.targetLabel)+'</div>';
      h+='</div></div>';
    });
    h+='</div>';
  }
  h+='</div>';
  h+='</div>'; // Ende content
  ma.innerHTML=h;
}
function setPerm(role,key,val){
  var row=PERM_ROWS.find(function(r){return r.key===key;}); if(!row||row.fixed||row.adminOnly)return;
  var p=rolePerms(); p[role][key]=val; settings.rolePermissions=p;
  saveSettingJson('rolePermissions',p,'Rechte geändert: '+row.label+' ('+(role==='coach'?'Coach':'Betrachter')+')');
  renderMain();
}
function saveSettingJson(key,val,logText){
  return sb.from('settings').upsert({key:key,value:JSON.stringify(val)},{onConflict:'key'}).then(function(res){
    if(res&&res.error){alert('Speichern fehlgeschlagen: '+res.error.message);return;}
    if(logText)logActivity('employee','updated',logText);
  });
}
function permToggle(role,key,col){
  // Häkchen-Matrix: „Sehen“ schaltet zwischen Kein Zugriff und Ansehen, „Ändern“ zwischen Ansehen und Bearbeiten
  var row=PERM_ROWS.find(function(r){return r.key===key;}); if(!row||row.fixed||row.adminOnly)return;
  var cur=permFor(key,role),nv;
  if(row.editOrNone) nv=cur==='E'?'-':'E';
  else if(col==='S') nv=cur==='-'?'S':'-';
  else nv=cur==='E'?'S':'E';
  setPerm(role,key,nv);
}
function buildRolesHtml(){
  var GROUPS=[['Auswertungen',['performance','ziel','provision','provCoaches','salary','activity']],['Mitarbeiter',['coaching','qa','dev']],['Kalender',['kalEdit','kalGrund','kalLate']],['Verwaltung',['stammdaten','provEdit','histEdit']]];
  var cnt={admin:0,coach:0,viewer:0,agent:0,none:0},K={'Admin':'admin','Coach':'coach','Betrachter':'viewer','Sales Agent':'agent','Kein Zugang':'none'};
  allPersons().forEach(function(p){if(p.kind==='emp'&&p.active===false)return;var r=K[personRole(p)];if(r)cnt[r]++;});
  function box(state,avail,lock,onclick,title){
    if(!avail)return '<span style="display:inline-block;width:20px;height:20px"></span>';
    var on=!!state;
    return '<span role="checkbox" aria-checked="'+on+'" tabindex="'+(lock?'-1':'0')+'" title="'+esc(title||'')+'"'+(lock?'':' onclick="'+onclick+'" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();this.click();}"')
      +' style="display:inline-flex;width:20px;height:20px;border-radius:6px;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;vertical-align:middle;'
      +(lock?'cursor:default;opacity:.45;':'cursor:pointer;')
      +(on?'background:#3a3833;border:1.5px solid #3a3833':'background:#fff;border:1.5px solid #B4AC9C')+'">'+(on?'✓':'')+'</span>';
  }
  function eye(){return '<i class="ti ti-eye" style="font-size:16px;color:var(--text2)" title="Sehen"></i>';}
  function pen(){return '<i class="ti ti-pencil" style="font-size:16px;color:var(--text2)" title="Anlegen und ändern"></i>';}
  var TD='padding:0 8px;height:38px;border-bottom:1px solid #eae7e0;text-align:center;vertical-align:middle';
  var BL='border-left:1px solid #E4E0D6;';
  var h='<div class="card"><div style="font-weight:700;font-size:14px;color:var(--text)">Was darf welche Rolle?</div>'
    +'<div style="font-size:12.5px;color:var(--text3);margin:2px 0 12px">'+eye()+' sehen · '+pen()+' anlegen und ändern. Häkchen anklicken – gilt sofort für alle Personen mit dieser Rolle. Betrachter können nie speichern, darum nur „Sehen“.</div>'
    +'<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text2);background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;padding:8px 12px;margin-bottom:12px"><span><b style="color:var(--text)">Admin, Sales Agent, Kein Zugang</b> sind fest vorgegeben</span><span><b style="color:var(--text)">Kein Zugang</b>: kein Login, z. B. Account Management – erscheint trotzdem im Urlaubskalender, wenn dort eingeschaltet</span><span><b style="color:var(--text)">Einstellungen</b> (Benutzer, Rollen, Wizards, Integrationen, Daten) nur Admins</span></div>'
    +'<div class="std-wrap"><table style="width:100%;border-collapse:collapse;border:1px solid #E4E0D6;border-radius:10px;overflow:hidden">'
    +'<thead><tr style="background:#EFECE5"><th scope="col" style="text-align:left;padding:9px 12px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);width:40%">Recht</th>'
    +'<th scope="colgroup" colspan="2" style="'+BL+'padding:9px 8px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)">Admin <span style="font-weight:600;color:var(--text3)">· '+cnt.admin+'</span></th>'
    +'<th scope="colgroup" colspan="2" style="'+BL+'padding:9px 8px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)">Coach <span style="font-weight:600;color:var(--text3)">· '+cnt.coach+'</span></th>'
    +'<th scope="col" style="'+BL+'padding:9px 8px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)">Betrachter <span style="font-weight:600;color:var(--text3)">· '+cnt.viewer+'</span></th>'
    +'<th scope="col" style="'+BL+'padding:9px 8px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)">Sales Agent <span style="font-weight:600;color:var(--text3)">· '+cnt.agent+'</span></th>'
    +'<th scope="col" style="'+BL+'padding:9px 8px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text)">Kein Zugang <span style="font-weight:600;color:var(--text3)">· '+cnt.none+'</span></th></tr>'
    +'<tr style="background:#EFECE5"><th></th><th style="'+BL+'padding:4px">'+eye()+'</th><th style="padding:4px">'+pen()+'</th><th style="'+BL+'padding:4px">'+eye()+'</th><th style="padding:4px">'+pen()+'</th><th style="'+BL+'padding:4px">'+eye()+'</th><th style="'+BL+'padding:4px;font-size:11px;color:var(--text3);font-weight:500">Erweiterung</th><th style="'+BL+'padding:4px"></th></tr></thead><tbody>';
  GROUPS.forEach(function(g){
    h+='<tr><td colspan="8" style="height:32px;background:#EFECE5;padding:0 12px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)">'+g[0]+'</td></tr>';
    g[1].forEach(function(k){
      var row=PERM_ROWS.find(function(r){return r.key===k;});if(!row)return;
      var c=permFor(k,'coach'),v=permFor(k,'viewer'),lock=!!row.fixed;
      var desc={performance:'Startseite, Banner, Diagramm, Tabelle',ziel:'Zielplanung, Zielvereinbarung, Ziele im Popup',provision:'Provisionen und Gehälter',provCoaches:'Provision von Coaches/SDM in der Übersicht – sonst nur Sales Agents',salary:'Grundgehalt und Gehaltsdaten',kalEdit:'Urlaub, Krank, Verspätung eintragen, Anträge entscheiden',kalGrund:'sonst nur „abwesend“ – fest durch die Datenbank',kalLate:'fest durch die Datenbank',provEdit:'KPIs, Teiler, Mindestprovision – zusätzlich für einzelne Personen freigebbar',activity:'wer hat wann was geändert',coaching:'Sessions erfassen und planen, Aufgaben',qa:'Calls bewerten',dev:'Mitarbeiterentwicklung, Kommentare',stammdaten:'Mitarbeiter anlegen, Person, Vertrag, Provisionsvereinbarung',histEdit:'Bewertungen, Calls, Kommentare'}[k]||'';
      var label=row.key==='histEdit'?'Nachträglich ändern oder löschen':row.label;
      lock=lock||!!row.fixedRole;
      var cS=row.editOrNone?box(0,false):box(c!=='-',true,lock,"permToggle('coach','"+k+"','S')",lock?'fest vorgegeben':'');
      var cE=(row.seeOnly||row.fixed)?box(0,false):box(c==='E',true,false,"permToggle('coach','"+k+"','E')");
      var vS=row.editOrNone?box(0,false):box(v!=='-',true,lock,"permToggle('viewer','"+k+"','S')",lock?'fest vorgegeben':'');
      h+='<tr><td style="'+TD+';text-align:left;padding-left:12px;font-size:13px;color:var(--text)">'+esc(label)+(desc?' <span style="font-size:11.5px;color:var(--text3)">· '+esc(desc)+'</span>':'')+'</td>'
        +'<td style="'+TD+';'+BL+'">'+box(1,!row.editOrNone,true,'','Admin darf immer alles')+'</td><td style="'+TD+'">'+box(1,!(row.seeOnly),true,'','Admin darf immer alles')+'</td>'
        +'<td style="'+TD+';'+BL+'">'+cS+'</td><td style="'+TD+'">'+cE+'</td><td style="'+TD+';'+BL+'">'+vS+'</td>'
        +'<td style="'+TD+';'+BL+';color:var(--text3)">–</td><td style="'+TD+';'+BL+';color:var(--text3)">–</td></tr>'
        +(row.persons?'<tr><td colspan="8" style="padding:6px 12px 10px;border-bottom:1px solid #eae7e0">'+permPersonsHtml(k)+'</td></tr>':'');
    });
  });
  h+='</tbody></table></div>'
    +'<div style="font-size:12.5px;line-height:1.55;color:var(--text2);background:var(--s-sub);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 13px;margin-top:12px"><b style="color:var(--text)">So wird es durchgesetzt:</b> Board und Datenbank prüfen dieselben Rechte: Betrachter können nichts speichern, Coaches nur, wo „ändern“ angehakt ist – auch wer sich direkt mit der Datenbank verbindet. Ohne Häkchen bei „sehen“ wird der Bereich in Menü und Mitarbeiterprofil ausgeblendet. Sales Agents kommen nicht ins Board und sehen in der Erweiterung nur ihre eigenen Zahlen. „Kein Zugang“ hat weder Board noch Erweiterung.</div></div>';
  return h;
}
function wizCfg(){ var s=settings.wizardSettings||{}; return {on:s.on!==false,time:s.time||WIZ_DEFAULT.time,roles:Object.assign({},WIZ_DEFAULT.roles,s.roles||{}),slides:Object.assign({},WIZ_DEFAULT.slides,s.slides||{}),minOpt:s.minOpt!=null?s.minOpt:WIZ_DEFAULT.minOpt}; }
function wizClone(o){return JSON.parse(JSON.stringify(o));}
function wizRoleTxt(r){var a=[];if(r.admin)a.push('Admin');if(r.coach)a.push('Coach');if(r.viewer)a.push('Betrachter');return a.length?a.join(', '):'niemand';}
function wizTrigTxt(w){
  var a=[];if(w.trigger.login)a.push('Bei Anmeldung');if(w.trigger.time)a.push('ab '+w.trigger.at+' Uhr');
  return (a.length?a.join(' + '):'kein Auslöser')+' · '+(w.freq==='daily'?'1× pro Tag':'jede Anmeldung');
}
function wizRerender(){
  var el=document.getElementById('wizCard');
  if(el)el.outerHTML=buildWizardsHtml();
  wizRenderPick();
}
// Panel liegt direkt im body, damit es nicht von Box/Tabelle verschoben oder abgeschnitten wird
function wizRenderPick(){
  var l=document.getElementById('wizPickLayer');
  if(!l){l=document.createElement('div');l.id='wizPickLayer';document.body.appendChild(l);}
  if(wizPick.key){
    var b=document.querySelector('[data-wizpick="'+wizPick.key+'"]');
    if(!b){wizPick.key=null;}else{var r=b.getBoundingClientRect();wizPick.top=r.bottom+4;wizPick.left=r.left;wizPick.width=r.width;}
  }
  l.innerHTML=wizPickPanel();
}
function wizPickClose(){if(!wizPick.key)return;wizPick.key=null;var el=document.getElementById('wizCard');if(el)el.outerHTML=buildWizardsHtml();wizRenderPick();}
function wizToggleOpen(id){
  if(wizEdit.id===id){
    if(wizEdit.dirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;
    wizEdit={id:null,draft:null,dirty:false};
  } else {
    if(wizEdit.dirty&&!confirm('Ungespeicherte Änderungen am geöffneten Wizard verwerfen?'))return;
    wizEdit={id:id,draft:wizClone(wizGet(id)),dirty:false};
  }
  wizPick.key=null;wizRerender();
}
function wizSet(path,val){
  var d=wizEdit.draft;if(!d)return;
  var p=path.split('.'),o=d;
  for(var i=0;i<p.length-1;i++)o=o[p[i]];
  o[p[p.length-1]]=val;
  wizEdit.dirty=true;wizPick.key=null;wizRerender();
}
function wizSlideSet(i,prop,val){var d=wizEdit.draft;if(!d||!d.slides[i])return;d.slides[i][prop]=val;wizEdit.dirty=true;wizPick.key=null;wizRerender();}
function wizNum(v,min,max,allowEmpty){
  if(allowEmpty&&String(v).trim()==='')return null;
  var n=parseInt(v,10);if(isNaN(n))n=min;return Math.max(min,Math.min(max,n));
}
// Speichern: neue Konfiguration + Tagesüberblick zusätzlich im alten Format (wizardSettings)
function wizPersist(cfg,logText){
  var plain={v:1,wizards:cfg.wizards.map(function(w){return wizClone(w);})};
  settings.wizardConfig=plain;
  var d=plain.wizards.filter(function(w){return w.id==='daily';})[0];
  var p1=saveSettingJson('wizardConfig',plain,logText);
  if(d){
    var on=function(id){return d.slides.some(function(s){return s.id===id&&s.on;});};
    var wk=d.slides.filter(function(s){return s.id==='worstKpi';})[0];
    var legacy={on:d.on,time:d.trigger.at,roles:Object.assign({},d.roles),slides:{opt:on('opt'),marge:on('margeToday'),cr:on('cr'),worst:on('worstKpi')},minOpt:wk&&wk.minOpt!=null?wk.minOpt:5};
    settings.wizardSettings=legacy;
    saveSettingJson('wizardSettings',legacy);
  }
  return p1;
}
function wizSave(){
  var d=wizEdit.draft;if(!d)return;
  if(!d.trigger.login&&!d.trigger.time){alert('Bitte mindestens einen Auslöser wählen: bei Anmeldung oder Uhrzeit.');return;}
  if(d.trigger.time&&!/^\d{2}:\d{2}$/.test(d.trigger.at||'')){alert('Bitte eine gültige Uhrzeit eintragen.');return;}
  var cfg=wizConfig();
  cfg.wizards=cfg.wizards.map(function(w){return w.id===d.id?wizClone(d):w;});
  wizPersist(cfg,'Wizard „'+d.name+'“ geändert');
  wizEdit.dirty=false;wizRerender();
  if(typeof atToast==='function')atToast('Wizard gespeichert');
}
function wizToggleActive(id,val){
  var cfg=wizConfig();
  cfg.wizards.forEach(function(w){if(w.id===id)w.on=val;});
  if(wizEdit.draft&&wizEdit.draft.id===id)wizEdit.draft.on=val;
  wizPersist(cfg,'Wizard „'+(wizGet(id)||{}).name+'“ '+(val?'eingeschaltet':'ausgeschaltet'));
  wizRerender();
}
function wizPreview(id){
  var w=(wizEdit.draft&&wizEdit.draft.id===id)?wizEdit.draft:wizGet(id);
  if(w)wizOpen(wizClone(w),{preview:true});
}
// Reihenfolge per Ziehen (nur über den Griff)
function wizDragStart(ev,i){wizDragIdx=i;ev.dataTransfer.effectAllowed='move';try{ev.dataTransfer.setData('text/plain',String(i));}catch(e){}}
function wizDragOver(ev,i){
  if(wizDragIdx===null)return;ev.preventDefault();
  var rows=document.querySelectorAll('#wizSlideBody tr');
  rows.forEach(function(r,k){r.style.boxShadow=k===i?(i<wizDragIdx?'inset 0 2px 0 #F08566':'inset 0 -2px 0 #F08566'):'';});
}
function wizDrop(ev,i){
  ev.preventDefault();
  var from=wizDragIdx;wizDragIdx=null;
  if(from===null||from===i||!wizEdit.draft)return wizRerender();
  var s=wizEdit.draft.slides,it=s.splice(from,1)[0];s.splice(i,0,it);
  wizEdit.dirty=true;wizRerender();
}
function wizDragEnd(ev){
  var tr=ev.target&&ev.target.closest?ev.target.closest('tr'):null;if(tr)tr.draggable=false;
  if(wizDragIdx!==null){wizDragIdx=null;wizRerender();}
}
// Auswahl im Board-Stil (Knopf + Panel), Panel fest positioniert, damit die Tabelle es nicht abschneidet
function wizPickBtn(key,val,opts){
  var cur=opts.filter(function(o){return o[0]===val;})[0]||opts[0];
  return '<button type="button" class="btn sbtn" data-wizpick="'+key+'" style="justify-content:space-between;min-width:150px" onclick="wizPickToggle(\''+key+'\',this)"><span>'+esc(cur[1])+'</span><i class="ti ti-chevron-'+(wizPick.key===key?'up':'down')+'" style="font-size:11px"></i></button>';
}
function wizPickToggle(key,btn){
  wizPick.key=wizPick.key===key?null:key;
  wizRerender();
}
function wizPickPanel(){
  if(!wizPick.key||!wizEdit.draft)return '';
  var k=wizPick.key.split(':'),i=+k[0],prop=k[1],s=wizEdit.draft.slides[i];if(!s)return '';
  return '<div id="wizPickPanel" style="position:fixed;top:'+wizPick.top+'px;left:'+wizPick.left+'px;min-width:'+wizPick.width+'px;z-index:300;background:#EFECE5;border:1px solid var(--border2);border-radius:var(--r-md);box-shadow:0 10px 24px rgba(40,32,15,0.14);padding:6px 0">'
    +WIZ_KPIS.map(function(o){return '<div role="option" aria-selected="'+(s[prop]===o[0])+'" onclick="wizSlideSet('+i+',\''+prop+'\',\''+o[0]+'\')" style="padding:7px 14px;font-size:12.5px;cursor:pointer;white-space:nowrap;'+(s[prop]===o[0]?'font-weight:700;color:var(--text)':'color:var(--text2)')+'" onmouseover="this.style.background=\'rgba(29,28,26,0.06)\'" onmouseout="this.style.background=\'transparent\'">'+esc(o[1])+'</div>';}).join('')
    +'</div>';
}
function wizSlideSettingHtml(s,i){
  var num=function(prop,val,min,max,ph,allowEmpty){return '<input type="number" min="'+min+'" max="'+max+'" value="'+(val==null?'':val)+'"'+(ph?' placeholder="'+ph+'"':'')+' aria-label="'+prop+'" onchange="wizSlideSet('+i+',\''+prop+'\',wizNum(this.value,'+min+','+max+','+(allowEmpty?'true':'false')+'))" style="width:76px;height:34px;padding:0 10px;margin:0">';};
  var row=function(inner){return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;white-space:nowrap;font-size:13px;color:var(--text2)">'+inner+'</div>';};
  switch(s.id){
    case 'overdue':return row('<span>älter als</span>'+num('days',s.days,1,365)+'<span>Tage</span>');
    case 'upcoming':return row('<span>nächste</span>'+num('days',s.days,1,365,'alle',true)+'<span>Tage</span>');
    case 'qa':return row('<span>in den letzten</span>'+num('days',s.days,1,365)+'<span>Tagen</span>');
    case 'top3':return row(wizPickBtn(i+':kpi',s.kpi,WIZ_KPIS));
    case 'worst3':return row(wizPickBtn(i+':kpi',s.kpi,WIZ_KPIS)+'<span>ab</span>'+num('minOpt',s.minOpt,0,500)+'<span>Opt.</span>');
    case 'worstKpi':return row('<span>mehr als</span>'+num('minOpt',s.minOpt,0,500)+'<span>Opt. heute</span>');
    default:return '<span style="color:var(--text3)">—</span>';
  }
}
function wizEditorHtml(d){
  function chk(path,label,on){return '<label class="wz-chip'+(on?' on':'')+'"><input type="checkbox" '+(on?'checked':'')+' onchange="wizSet(\''+path+'\',this.checked)">'+label+'</label>';}
  function rad(val,label){var on=d.freq===val;return '<label class="wz-chip'+(on?' on':'')+'"><input type="radio" name="wizFreq" '+(on?'checked':'')+' onchange="wizSet(\'freq\',\''+val+'\')">'+label+'</label>';}
  function sw(on,label,js){return '<label class="wz-switch" title="'+label+'"><input type="checkbox" aria-label="'+label+'" '+(on?'checked':'')+' onchange="'+js+'"><span></span></label>';}
  var lbl='font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);margin-bottom:8px';
  var h='<div style="padding:16px;background:rgba(29,28,26,0.025);border-top:1px solid var(--border2);border-bottom:1px solid var(--border2)">'
    +'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:16px">'
    +'<div><div style="'+lbl+'">Auslöser</div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px 0">'+chk('trigger.login','Bei Anmeldung',d.trigger.login)+chk('trigger.time','Uhrzeit',d.trigger.time)
      +'<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)'+(d.trigger.time?'':';opacity:.45')+'">ab <input type="time" value="'+esc(d.trigger.at||'')+'" '+(d.trigger.time?'':'disabled ')+'aria-label="Uhrzeit" onchange="wizSet(\'trigger.at\',this.value)" style="width:110px"> Uhr</span></div></div>'
    +'<div><div style="'+lbl+'">Häufigkeit</div><div>'+rad('daily','1× pro Tag')+rad('every','Jede Anmeldung')+'</div></div>'
    +'<div><div style="'+lbl+'">Für wen</div><div>'+chk('roles.admin','Admin',d.roles.admin)+chk('roles.coach','Coach',d.roles.coach)+chk('roles.viewer','Betrachter',d.roles.viewer)+'</div></div>'
    +'</div>'
    +'<div style="'+lbl+'">Slides · Reihenfolge per Ziehen</div>'
    +'<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:26%">Slide</th><th>Inhalt</th><th style="width:330px">Einstellung</th><th class="r" style="text-align:right;width:100px">Anzeigen</th></tr></thead><tbody id="wizSlideBody">';
  var nr=0;
  d.slides.forEach(function(s,i){
    var def=WIZ_SLIDES[s.id];if(!def)return;
    h+='<tr ondragstart="wizDragStart(event,'+i+')" ondragover="wizDragOver(event,'+i+')" ondrop="wizDrop(event,'+i+')" ondragend="wizDragEnd(event)" style="height:54px'+(s.on?'':';opacity:.55')+'">'
      +'<td class="f"><span style="display:inline-flex;align-items:center;gap:8px"><i class="ti ti-grip-vertical" title="Ziehen zum Sortieren" style="cursor:grab;color:var(--text3);font-size:16px" onmousedown="this.closest(\'tr\').draggable=true" onmouseup="this.closest(\'tr\').draggable=false"></i>'
      +'<span style="display:inline-block;min-width:16px;color:var(--text3);font-weight:600">'+(s.on?(++nr):'')+'</span>'+esc(def.label)+'</span></td>'
      +'<td style="color:var(--text2)">'+esc(def.desc)+'</td>'
      +'<td>'+wizSlideSettingHtml(s,i)+'</td>'
      +'<td class="r">'+sw(s.on,'Slide '+def.label+' anzeigen','wizSlideSet('+i+',\'on\',this.checked)')+'</td></tr>';
  });
  h+='</tbody></table></div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin-top:14px"><span style="font-size:12px;color:var(--text3)">'
    +(wizEdit.dirty?'Ungespeicherte Änderungen':'Uhrzeit-Auslöser: höchstens einmal pro Tag und Gerät. „Jede Anmeldung“ gilt für den Auslöser bei Anmeldung.')+'</span>'
    +'<span style="margin-left:auto;display:flex;gap:8px"><button class="btn" style="width:auto;height:34px" onclick="wizPreview(\''+d.id+'\')"><i class="ti ti-player-play"></i> Vorschau</button>'
    +'<button class="btn btn-primary" style="width:auto;height:34px" onclick="wizSave()"><i class="ti ti-check"></i> Speichern</button></span></div>'
    +'</div>';
  return h;
}
function buildWizardsHtml(){
  var cfg=wizConfig();
  if(wizEdit.id&&!wizEdit.draft)wizEdit.id=null;
  var cols='<colgroup><col style="width:22%"><col><col style="width:18%"><col style="width:90px"><col style="width:80px"><col style="width:56px"></colgroup>';
  var th='<thead><tr><th>Wizard</th><th>Auslöser</th><th>Für wen</th><th class="r" style="text-align:right">Slides</th><th class="r" style="text-align:right">Aktiv</th><th></th></tr></thead>';
  var h='<div class="card" id="wizCard"><div class="card-title">Wizards</div><div class="card-sub">Wann welcher Wizard für wen erscheint und welche Slides er zeigt</div><div class="std-wrap">';
  var part='<table class="std-table">'+cols+th+'<tbody>';
  cfg.wizards.forEach(function(saved){
    var isOpen=wizEdit.id===saved.id,w=isOpen?wizEdit.draft:saved;
    var n=w.slides.filter(function(s){return s.on;}).length;
    part+='<tr onclick="if(!event.target.closest(\'.wz-switch\'))wizToggleOpen(\''+w.id+'\')" style="cursor:pointer">'
      +'<td class="f">'+esc(w.name)+(isOpen&&wizEdit.dirty?' <span style="color:#F08566" title="ungespeichert">●</span>':'')+'</td>'
      +'<td style="color:var(--text2)">'+esc(wizTrigTxt(w))+'</td>'
      +'<td style="color:var(--text2)">'+esc(wizRoleTxt(w.roles))+'</td>'
      +'<td class="r">'+n+'</td>'
      +'<td class="r"><label class="wz-switch" title="Wizard ein- oder ausschalten"><input type="checkbox" aria-label="'+esc(w.name)+' aktiv" '+(saved.on?'checked':'')+' onchange="wizToggleActive(\''+w.id+'\',this.checked)"><span></span></label></td>'
      +'<td class="r"><i class="ti ti-chevron-'+(isOpen?'up':'down')+'" style="color:var(--text3)"></i></td></tr>';
    if(isOpen){
      h+=part+'</tbody></table>'+wizEditorHtml(w);
      part='<table class="std-table">'+cols+'<tbody>';
    }
  });
  h+=part+'</tbody></table></div></div>';
  // leere Rest-Tabelle (geöffneter Wizard war der letzte) entfernen
  return h.replace(/<table class="std-table"><colgroup>(?:(?!<\/colgroup>).)*<\/colgroup><tbody><\/tbody><\/table>/,'');
}

// ══ Integrationen & Daten (gemeinsame Bausteine) ═════════════════════════════
function sCard(icon,title,desc,status,body){
  // Grosse Box im Board-Standard: Titel mit Status, Untertitel, Inhalt (Icon wird bewusst nicht mehr gezeigt)
  return '<div class="card"><div class="card-title" style="display:flex;align-items:center;gap:8px">'+title+(status?' '+status:'')+'</div><div class="card-sub">'+desc+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:12px">'+body+'</div></div>';
}
function sStatus(t,kind){
  var c={ok:['var(--purple-dark)','var(--s-tint-strong)'],warn:['#9C2F06','rgba(217,65,9,0.12)'],off:['var(--text2)','var(--s-sub)'],bad:['#9C2F06','rgba(217,65,9,0.12)']}[kind];
  return '<span class="badge" style="color:'+c[0]+';background:'+c[1]+';white-space:nowrap;font-weight:600">'+t+'</span>';
}
function sKv(k,v){return '<tr><td class="f">'+k+'</td><td class="r">'+v+'</td></tr>';}
function sKvTable(rowsHtml){return '<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:45%">Eigenschaft</th><th class="r" style="text-align:right">Wert</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';}
function sGrid(inner){return inner;}
function daysUntil(ds){ if(!ds)return null; return Math.round((new Date(ds+'T00:00:00')-new Date(today()+'T00:00:00'))/86400000); }

function buildIntegrationsHtml(){
  var last=settings.ftpLastSync?new Date(settings.ftpLastSync):null;
  var ageMin=last?Math.round((Date.now()-last.getTime())/60000):null;
  var st=ageMin===null?sStatus('Noch kein Sync','off'):ageMin<=90?sStatus('Läuft','ok'):ageMin<=360?sStatus('Verzögert','warn'):sStatus('Gestoppt','bad');
  var ago=ageMin===null?'–':ageMin<60?'vor '+ageMin+' Min.':ageMin<1440?'vor '+Math.round(ageMin/60)+' Std.':last.toLocaleDateString('de-DE');
  var sfp=sCard('ti-refresh','SFP-Daten (FTP)','Performance-Daten aus dem SFP, automatisch per SFTP-Datei',st,
    sKvTable(sKv('Letzter Sync',last?last.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' · '+ago:'–')+(function(){var fr=settings.ftpRange;if(!fr||!fr.von)return sKv('Zeitraum in der Datei','– (wird beim nächsten Sync ermittelt)');var f=function(d){return d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4);};return sKv('Zeitraum in der Datei',f(fr.von)+' – '+f(fr.bis)+' · '+fr.tage+' Tage')+sKv('Zeilen im letzten Sync',fr.zeilen+' in der Datei · '+fr.geschrieben+' geschrieben · '+fr.uebersprungen0+' mit 0 € übersprungen');})()+sKv('Rhythmus','alle 15 Minuten (cron-job.org)')+sKv('Datei',esc(settings.ftpFile||'user_activity.csv')))
    +'<details><summary style="font-size:12.5px;font-weight:600;color:var(--purple);cursor:pointer">Verbindung bearbeiten</summary><div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-top:10px">'
    +'<div><label for="ftpHost">SFTP-Host</label><input id="ftpHost" value="'+esc(settings.ftpHost||'')+'"></div><div><label for="ftpPort">Port</label><input id="ftpPort" value="'+esc(settings.ftpPort||'22')+'"></div>'
    +'<div><label for="ftpUser">Benutzername</label><input id="ftpUser" value="'+esc(settings.ftpUser||'')+'"></div><div><label for="ftpFile">Dateiname</label><input id="ftpFile" value="'+esc(settings.ftpFile||'')+'"></div></div>'
    +'<p style="font-size:11.5px;color:var(--text3);margin:8px 0">Das Passwort liegt nur verschlüsselt in den GitHub-Secrets, nicht in Sales OS.</p><button class="btn btn-primary sbtn" onclick="saveFTP()">Speichern</button></details>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sbtn" style="text-decoration:none" href="https://github.com/wiegand-sales/'+(SUPABASE_URL.indexOf('kjlkneodyvfqgaukdjvb')>=0?'SalesOS-DEV':'SalesOS')+'/actions" target="_blank" rel="noopener">Sync-Protokoll ansehen ↗</a></div>');
  var un=settings.ftpUnmatched||[];
  var unRows=un.length?'<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:42%">Name im SFP</th><th style="width:28%">Bereich</th><th class="r" style="text-align:right">Aktion</th></tr></thead><tbody>'
    +un.map(function(n){var m=String(n).match(/^\s*([A-Za-zÄÖÜäöü]+)\s*-\s*(.+)$/);var pre=m?m[1].toUpperCase():'',nm=m?m[2]:String(n);
      var area=pre==='OB'?'Onboarding':pre==='VLC'?'Valencia (VLC)':(pre||'–');
      return '<tr><td class="f">'+esc(nm)+'<span class="s">'+esc(n)+'</span></td><td>'+esc(area)+'</td><td class="r"><button class="btn sbtn" onclick="openModal(\'addEmpModal\')">Als Mitarbeiter anlegen</button></td></tr>';}).join('')+'</tbody></table></div>'
    :'<div style="font-size:12.5px;color:var(--text2)">Alle Namen aus dem SFP sind zugeordnet.</div>';
  var unC=sCard('ti-user-question','Nicht zugeordnete Namen','Zeilen aus dem SFP, die keinem Mitarbeiter zugeordnet werden konnten',un.length?sStatus(un.length+' offen','warn'):sStatus('Alles zugeordnet','ok'),
    unRows+'<div style="font-size:12px;color:var(--text2);background:var(--s-sub);border:1px solid var(--border);border-radius:var(--r-md);padding:9px 12px;line-height:1.5">Tipp: Meist weicht nur die Schreibweise ab – dann den Namen beim Mitarbeiter genau wie im SFP schreiben. HO- und SOM-Einträge werden bewusst übersprungen.</div>');
  var d=daysUntil(settings.tokenExpiry);
  var tokSt=d===null?sStatus('Ablaufdatum fehlt','warn'):d<0?sStatus('Abgelaufen','bad'):d<=30?sStatus('läuft in '+d+' Tagen ab','warn'):sStatus('ok','ok');
  var tok=sCard('ti-key','Zugangsschlüssel','Ablaufende Schlüssel rechtzeitig erneuern, sonst stoppt der Sync',tokSt,
    '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><div style="flex:1;min-width:200px"><label for="tokExp">GitHub-Token für cron-job.org läuft ab am</label><input id="tokExp" type="date" value="'+esc(settings.tokenExpiry||'')+'" onchange="settings.tokenExpiry=this.value;sb.from(\'settings\').upsert({key:\'tokenExpiry\',value:this.value},{onConflict:\'key\'}).then(function(){renderMain();})"></div></div>'
    +sKvTable(sKv('SFTP-Passwort','in GitHub gespeichert')+sKv('Supabase Service-Schlüssel','nur auf dem Server')));
  var agentsAll=employees.filter(function(e){return e.active!==false&&!(e.isPureCoach||e.role==='SDC'||e.role==='SDM');});
  var withLogin=agentsAll.filter(function(e){return !!e.auth_user_id;}).length;
  var ext=sCard('ti-puzzle','Chrome-Erweiterung','„Sales OS – Deine Kennzahlen“ für die Sales Agents',settings.extensionUrl?sStatus('Im Web Store','ok'):sStatus('Link fehlt','off'),
    sKvTable(sKv('Agents mit Zugang',withLogin+' von '+agentsAll.length))
    +'<div><label for="extUrl">Link zum Chrome Web Store (für die Agents)</label><input id="extUrl" placeholder="https://chromewebstore.google.com/detail/…" value="'+esc(settings.extensionUrl||'')+'" onchange="settings.extensionUrl=this.value.trim();sb.from(\'settings\').upsert({key:\'extensionUrl\',value:settings.extensionUrl},{onConflict:\'key\'}).then(function(){renderMain();})"></div>'
    +(settings.extensionUrl?'<div><a class="btn sbtn" style="text-decoration:none" href="'+esc(settings.extensionUrl)+'" target="_blank" rel="noopener">Store-Seite öffnen ↗</a></div>':''));
  function bItem(l,v,x,warn){return '<div style="padding:2px 16px;border-right:1px solid rgba(255,255,255,0.14)"><div style="font-size:9.5px;color:#FFE1D6;font-weight:600;letter-spacing:.05em;text-transform:uppercase">'+l+'</div><div style="font-size:19px;font-weight:700;color:'+(warn?'#FFB38A':'#fff')+'">'+v+'</div><div style="font-size:11px;color:#FFEDE6">'+x+'</div></div>';}
  var syncTxt=ageMin===null?'kein Sync':ageMin<=90?'läuft':ageMin<=360?'verzögert':'gestoppt';
  var tokTxt=d===null?'Datum fehlt':d<0?'abgelaufen':d<=30?'in '+d+' Tagen':'ok';
  var banner='<div class="card"><div class="card-title">Status Integrationen</div><div class="card-sub">Alles auf einen Blick</div>'
    +'<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);border-radius:12px;padding:14px 18px;display:grid;grid-template-columns:repeat(4,1fr)">'
    +bItem('SFP-Sync',syncTxt,last?'zuletzt '+('0'+last.getHours()).slice(-2)+':'+('0'+last.getMinutes()).slice(-2)+' · alle 15 Min.':'noch keine Daten',ageMin===null||ageMin>90)
    +bItem('Offene Namen',String(un.length),'aus dem SFP-Import',un.length>0)
    +bItem('Zugangsschlüssel',tokTxt,'GitHub-Token für cron-job.org',d===null||d<=30)
    +bItem('Erweiterung',withLogin+' von '+agentsAll.length,'Agents mit Zugang'+(settings.extensionUrl?'':' · Link fehlt'),!settings.extensionUrl).replace('border-right:1px solid rgba(255,255,255,0.14)','')
    +'</div></div>';
  return banner+sfp+unC+tok+ext;
}

function buildDataHtml(){
  var imp=sCard('ti-file-upload','Performance-Daten importieren','Manuell nachladen, z. B. für vergangene Monate',sStatus('CSV','off'),
    '<span style="font-size:12.5px;color:var(--text2)">Bestehende Einträge für denselben Tag werden überschrieben, Coaching-Daten bleiben unberührt. Der Mitarbeiter-Name muss genau wie in der Mitarbeiterliste geschrieben sein.</span>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-primary sbtn" style="cursor:pointer;margin:0;color:#fff"><i class="ti ti-upload"></i> CSV hochladen<input type="file" accept=".csv,text/csv" onchange="importCSV(this.files[0])" style="display:none"></label><button class="btn sbtn" onclick="downloadCSVVorlage()"><i class="ti ti-download"></i> Vorlage laden</button></div>'
    +'<div id="csv-status" style="font-size:12.5px"></div>');
  var noMail=employees.filter(function(e){return e.active!==false&&!e.email;}).length;
  var un=(settings.ftpUnmatched||[]).length;
  var dup=0; Object.keys(performance||{}).forEach(function(k){var seen={};(performance[k]||[]).forEach(function(r){if(seen[r.date])dup++;seen[r.date]=1;});});
  function q(t,d,n,ok,btn){return '<tr><td class="f">'+t+'<span class="s">'+d+'</span></td><td>'+sStatus(String(n),ok?'ok':'warn')+'</td><td class="r">'+(btn||'')+'</td></tr>';}
  var issues=(noMail?1:0)+(un?1:0)+(dup?1:0);
  var qual=sCard('ti-shield-check','Datenqualität','Wird beim Öffnen dieser Seite geprüft',issues?sStatus(issues+' Hinweis'+(issues>1?'e':''),'warn'):sStatus('Alles in Ordnung','ok'),
    '<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:52%">Prüfung</th><th style="width:20%">Ergebnis</th><th class="r" style="text-align:right">Aktion</th></tr></thead><tbody>'
    +q('Tage ohne Präsenz','Einsatztage mit 0 € Marge und nur einem abgelehnten Lead','prüfen',true,'<button class="btn sbtn" onclick="countZeroMargeRecords()">Zählen</button>')
    +q('Nicht zugeordnete Namen','Aus dem SFP-Import',un,!un,un?'<button class="btn sbtn" onclick="selectSettingsSub(\'integrations\')">Ansehen</button>':'')
    +q('Mitarbeiter ohne E-Mail','Nötig für einen Login (Erweiterung)',noMail,!noMail,noMail?'<button class="btn sbtn" onclick="userFilter=\'all\';selectSettingsSub(\'users\')">Ansehen</button>':'')
    +q('Doppelte Tage','Zwei Einträge für denselben Mitarbeiter und Tag',dup,!dup,'')
    +'</tbody></table></div><div id="zero-marge-status" style="font-size:12.5px"></div>');
  var back=sCard('ti-database','Backups','Sicherung der Coaching-Daten als Datei',sStatus('manuell','off'),
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary sbtn" onclick="exportDaten()"><i class="ti ti-download"></i> Jetzt sichern (JSON)</button>'
    +'<label class="btn sbtn" style="cursor:pointer;margin:0;color:var(--text)"><i class="ti ti-upload"></i> Sicherung wiederherstellen<input type="file" accept=".json,application/json" onchange="if(this.files[0]&&confirm(\'Sicherung wirklich wiederherstellen? Bestehende Daten werden überschrieben.\'))importDaten(this.files[0])" style="display:none"></label></div>'
    +'<div id="restore-status" style="font-size:12.5px"></div>'
    +'<span style="font-size:12px;color:var(--text3)">Alle Daten liegen in der Datenbank (Supabase). Vor jedem Board-Update wird zusätzlich eine Sicherung der Seite angelegt. Ob Supabase automatische Tagessicherungen anlegt, hängt vom Tarif ab.</span>');
  var env=sCard('ti-device-desktop','Umgebung','Welche Version gerade läuft',SUPABASE_URL.indexOf('kjlkneodyvfqgaukdjvb')>=0?sStatus('Testsystem','warn'):sStatus('Live','ok'),
    sKvTable(sKv('Board','v4.1')+sKv('Datenbank',SUPABASE_URL.indexOf('kjlkneodyvfqgaukdjvb')>=0?'DEV (Supabase)':'Live (Supabase)')+sKv('Testsystem','wiegand-sales.github.io/SalesOS-DEV')));
  return sGrid(imp+qual+back+env);
}

function renderEinstellungen(){
  var ma=document.getElementById('mainArea');if(!ma)return;
  if(currentUserRole!=='admin'){ view='team'; wiegandView='overview'; renderSidebar(); renderTeam(); return; }

  var STABS=[['users','Benutzer'],['roles','Rollen &amp; Rechte'],['kalender','Kalender'],['telefonate','Telefonate'],['wizards','Wizards'],['integrations','Integrationen'],['data','Daten &amp; Backup']];
  var curTab=STABS.find(function(t){return t[0]===settingsView;})||STABS[0];
  // Kopf wie auf der Mitarbeiterseite: Box mit Titel und Infozeile, darunter die Bereiche als Schalter, rechts Hinweise
  var _isDev=SUPABASE_URL.indexOf('kjlkneodyvfqgaukdjvb')>=0;
  var _last=settings.ftpLastSync?new Date(settings.ftpLastSync):null,_age=_last?Math.round((Date.now()-_last.getTime())/60000):null;
  var _ago=_age===null?'noch kein Sync':_age<60?'vor <b style="font-weight:700">'+_age+' Min.</b>':_age<1440?'vor <b style="font-weight:700">'+Math.round(_age/60)+' Std.</b>':_last.toLocaleDateString('de-DE');
  var _noMail=employees.filter(function(e){return e.active!==false&&!e.email;}).length;
  function _sh(txt,warn,onclick){return '<span'+(onclick?' onclick="'+onclick+'" style="cursor:pointer;':' style="')+'height:34px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border-radius:10px;font-size:12.5px;white-space:nowrap;'+(warn?'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A':'background:#fff;border:1px solid #E4E0D6;color:var(--text2)')+'"><span style="width:8px;height:8px;border-radius:50%;background:'+(warn?'#F08566':'#3a3833')+'"></span>'+txt+'</span>';}
  var _hints=_sh('Sync '+_ago,_age===null||_age>90,"selectSettingsSub('integrations')")+(_noMail?_sh('<b style="font-weight:700">'+_noMail+'</b> ohne E-Mail',true,"userFilter='all';selectSettingsSub('users')"):'');
  var _cnt=employees.filter(function(e){return e.active!==false;}).length;
  ma.innerHTML='<div style="padding:22px 24px 8px;flex-shrink:0"><div style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:16px;padding:16px;box-shadow:0 12px 30px rgba(40,32,15,0.06)">'
    +'<div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;border-radius:11px;background:#EFECE5;border:1px solid #E4E0D6;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;color:var(--text)"><i class="ti ti-settings"></i></div>'
    +'<div style="min-width:0"><div style="font-size:18px;font-weight:800;line-height:1.2">Einstellungen</div><div style="font-size:12.5px;color:var(--text2);line-height:1.3">Admin-Bereich · '+_cnt+' aktive Mitarbeiter · '+(_isDev?'Testsystem':'Live-System')+' · Board v4.1</div></div></div>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-top:14px"><div class="emp-seg" id="setTabBar">'
    +STABS.map(function(t){return '<div class="tab'+(t[0]===settingsView?' active':'')+'" onclick="selectSettingsSub(\''+t[0]+'\')">'+t[1]+'</div>';}).join('')
    +'</div><span style="margin-left:auto;display:flex;gap:6px">'+_hints+'</span></div></div></div>'
    +'<div class="content" style="max-width:100%;padding-top:6px">'

    // ══ KPI-ZIELE (verschoben nach SFP Wiegand > Zielvereinbarung, siehe kpiZieleHtml()) ══

    // ══ ZIELVEREINBARUNG (verschoben nach SFP Wiegand > Zielvereinbarung, siehe zielTreeHtml()) ══

    // ══ MITARBEITERÜBERSICHT (Coaches + Admins/Betrachter, alles außer normale Sales Agents) ══
    +(settingsView==='users'?buildUserOverviewHtml():'')
    +(settingsView==='roles'?buildRolesHtml():'')
    +(settingsView==='wizards'?buildWizardsHtml():'')
    +(settingsView==='kalender'?buildKalRulesHtml():'')
    +(settingsView==='telefonate'?buildTelefonateSettingsHtml():'')

    +(settingsView==='integrations'?buildIntegrationsHtml():'')
    +(settingsView==='data'?buildDataHtml():'')
    +'</div>';
}
