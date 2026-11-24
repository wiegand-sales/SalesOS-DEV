// Sales OS – Aufgaben
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function toggleTask(id){
  var t=(tasks[selectedEmp]||[]).find(function(x){return x.id===id;});
  if(!t)return;
  t.done=!t.done;
  t.status=t.done?'done':'open';
  t.completedAt=t.done?new Date().toISOString():null;
  renderTab();
  taskDbUpdate(id,{done:t.done,status:t.status,completed_at:t.completedAt}).then(function(res){
    if(res.error){
      alert('Fehler beim Speichern: '+res.error.message+'\n\nDie Änderung ist lokal sichtbar, aber NICHT gespeichert.');
      t.done=!t.done;t.status=t.done?'done':'open';renderTab();
    } else {
      var e0=employees.find(function(x){return x.id===selectedEmp;});
      logActivity('task','status_changed','Aufgabe '+(t.done?'abgeschlossen':'wiedereröffnet')+': "'+t.text+'"',selectedEmp,e0?e0.name:'');
    }
  });
}
function setTaskStatus(id,newStatus){
  var t=(tasks[selectedEmp]||[]).find(function(x){return x.id===id;});
  if(!t)return;
  var oldStatus=t.status,oldDone=t.done;
  t.status=newStatus;
  t.done=(newStatus==='done');
  t.completedAt=t.done?(t.completedAt||new Date().toISOString()):null;
  renderTab();
  taskDbUpdate(id,{status:newStatus,done:t.done,completed_at:t.completedAt}).then(function(res){
    if(res.error){
      alert('Fehler beim Speichern: '+res.error.message+'\n\nDie Änderung ist lokal sichtbar, aber NICHT gespeichert.');
      t.status=oldStatus;t.done=oldDone;renderTab();
    } else {
      var e0=employees.find(function(x){return x.id===selectedEmp;});
      logActivity('task','status_changed','Aufgabe-Status geändert: '+oldStatus+' → '+newStatus+' · "'+t.text+'"',selectedEmp,e0?e0.name:'');
    }
  });
}
function toggleTaskDetail(id){
  var el=document.getElementById('td-'+id);
  if(el)el.classList.toggle('open');
}
function deleteTask(id){
  if(!confirm('Delete this task?'))return;
  var t0=(tasks[selectedEmp]||[]).find(function(x){return x.id===id;});
  tasks[selectedEmp]=(tasks[selectedEmp]||[]).filter(function(x){return x.id!==id;});
  renderTab();
  sb.from('tasks').delete().eq('id',id).then(function(res){
    if(res.error){alert('Fehler beim Löschen: '+res.error.message);}
    else{var e0=employees.find(function(x){return x.id===selectedEmp;});logActivity('task','deleted','Aufgabe gelöscht: "'+(t0?t0.text:'')+'"',selectedEmp,e0?e0.name:'');}
  });
}
function saveNewTask(){
  if(_savingNewTask)return;
  if(AT_ART){atPlanSession();return;}
  var text=document.getElementById('taskText').value.trim();
  var desc=document.getElementById('taskDesc').value.trim();
  var prio=document.getElementById('taskPrio').value;
  var due=document.getElementById('taskDue').value;
  var source=document.getElementById('taskQuelle')?document.getElementById('taskQuelle').value.trim():'';
  if(!text)return;
  var payload={
    employee_id:selectedEmp,text:text,description:desc,done:false,status:'open',
    priority:prio,due_date:due||null,source:source
  };
  _savingNewTask=true;
  sb.from('tasks').insert(payload).select().single().then(function(res){
    _savingNewTask=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    var r=res.data;
    if(!tasks[selectedEmp])tasks[selectedEmp]=[];
    tasks[selectedEmp].unshift({
      id:r.id,text:r.text,description:r.description||'',done:false,status:r.status||'open',
      priority:r.priority,dueDate:r.due_date,source:r.source||''
    });
    var e0=employees.find(function(x){return x.id===selectedEmp;});
    if(typeof aufgAfterNewTask==='function')aufgAfterNewTask(r.id);
    logActivity('task','created','Neue Aufgabe angelegt: "'+text+'"',selectedEmp,e0?e0.name:'');
    document.getElementById('taskText').value='';
    document.getElementById('taskDesc').value='';
    document.getElementById('taskDue').value='';
    var tsrc=document.getElementById('taskQuelle');if(tsrc)tsrc.value='';
    var _atm=document.getElementById('addTaskModal');
    if(_atm&&!_atm.classList.contains('hidden')){atRender();atToast('Aufgabe hinzugefügt: '+text,null);var _tt=document.getElementById('taskText');if(_tt)_tt.focus();}
    if(view==='emp')renderEmpDetail();else renderTab();
  }).catch(function(err){
    _savingNewTask=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}
function atArtRender(){var w=document.getElementById('atArtSeg');if(!w)return;var opts=[['','Aufgabe']].concat(typeof SF_ARTS!=='undefined'?SF_ARTS:[]);
  w.innerHTML='<span class="dsh-seg">'+opts.map(function(a){return '<button type="button" class="'+(a[0]===AT_ART?'on':'')+'" onclick="atArtSet(this.dataset.a)" data-a="'+esc(a[0])+'">'+esc(a[1])+'</button>';}).join('')+'</span>';
  var ses=!!AT_ART,g=function(id){return document.getElementById(id);};
  if(g('taskTextLbl'))g('taskTextLbl').textContent=ses?'Thema / Anlass (optional)':'Aufgabentitel';
  if(g('taskText'))g('taskText').placeholder=ses?'z. B. Einwände bei Preisfragen':'z.B. Pitch-Skript lesen – pages 1 to 9';
  if(g('taskDueLbl'))g('taskDueLbl').textContent=ses?'Termin':'Fälligkeitsdatum';
  if(g('taskTime'))g('taskTime').style.display=ses?'':'none';
  if(g('taskPrio'))g('taskPrio').disabled=ses;
  var b=g('taskSaveBtn');if(b)b.innerHTML=ses?'<i class="ti ti-calendar-plus"></i> Session planen':'<i class="ti ti-check"></i> Aufgabe hinzufügen';}
function atArtSet(a){AT_ART=a||'';atArtRender();}
function atPlanSession(){var g=function(id){return document.getElementById(id);};var e=kalEmp(selectedEmp);if(!e)return;if(!kalAbsWarn([e.id],(g('taskDue')&&g('taskDue').value)||today()))return;
  var day=(g('taskDue')&&g('taskDue').value)||today(),uz=(g('taskTime')&&g('taskTime').value)||'10:00',key=g('taskAssignee')?g('taskAssignee').value:'';
  var coach=/^emp:/.test(key)?key.slice(4):(currentCoach?currentCoach.id:null);
  var note=[g('taskText')?g('taskText').value.trim():'',g('taskDesc')?g('taskDesc').value.trim():''].filter(Boolean).join(' – ');
  var row={employee_id:e.id,date:day,uhrzeit:uz,end_uhrzeit:kalAddMin(uz,AT_ART==='Weekly'?30:60),art:AT_ART,rating:null,note:note,focus:'',status:'geplant',coach_id:coach,focus_metric:null,group_id:null};
  var p={id:'t'+Date.now(),date:day,uhrzeit:uz,endUhrzeit:row.end_uhrzeit,type:AT_ART,status:'geplant',rating:null,note:note,notes:note,focus:'',topics:[],coachId:coach};
  if(!protocols[e.id])protocols[e.id]=[];protocols[e.id].unshift(p);
  var lbl=(SF_ARTS.find(function(x){return x[0]===AT_ART;})||[0,AT_ART])[1];
  sb.from('protocols').insert(row).select().single().then(function(res){
    if(res&&res.error){alert('Planen fehlgeschlagen: '+res.error.message);protocols[e.id]=protocols[e.id].filter(function(q){return q!==p;});atRender();return;}
    if(res&&res.data&&res.data.id)p.id=res.data.id;
    if(key&&!/^emp:/.test(key)&&typeof aufgAssign==='function')aufgAssign('plan:'+p.id,key);
    atRender();});
  logActivity('session','created','Session geplant: '+lbl,e.id,e.name+' · '+fd(day)+' · '+uz);
  ['taskText','taskDesc','taskDue'].forEach(function(id){if(g(id))g(id).value='';});
  atRender();if(typeof atToast==='function')atToast('Geplant: '+lbl+', '+kalF(day)+' '+uz,null);}
function taskDbUpdate(id,fields){
  // completed_at gibt es erst nach 06_aufgaben_erledigt_am.sql – fehlt die Spalte, wird ohne sie gespeichert
  return sb.from('tasks').update(fields).eq('id',id).then(function(res){
    if(res.error&&fields.hasOwnProperty('completed_at')&&/completed_at/i.test(res.error.message||'')){
      var f2=Object.assign({},fields);delete f2.completed_at;
      return sb.from('tasks').update(f2).eq('id',id);
    }
    return res;
  });
}
function atRender(){
  var list=(tasks[selectedEmp]||[]);
  var t0=today();
  function dd(ds){return Math.round((new Date(t0+'T00:00:00')-new Date(ds+'T00:00:00'))/86400000);}
  function dmy(ds){return ds?ds.slice(8,10)+'.'+ds.slice(5,7)+'.':'';}
  var CH='font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;';
  function row(t,done){
    var right='';
    if(done){var ca=t.completedAt?String(t.completedAt).slice(0,10):'';right=ca?'<span style="'+CH+'background:#fff;border:1px solid #E4E0D6;color:var(--text2)">erledigt '+dmy(ca)+'</span>':'';}
    else{
      if(t.dueDate){var o=dd(t.dueDate);
        right+=o>0?'<span style="'+CH+'background:#FDF0EB;border:1px solid rgba(240,133,102,0.55);color:#B5513A">seit '+o+' '+(o===1?'Tag':'Tagen')+' fällig</span>'
          :'<span style="'+CH+'background:#fff;border:1px solid #E4E0D6;color:var(--text2)">'+(o===0?'heute fällig':'fällig '+dmy(t.dueDate))+'</span>';}
      if(t.priority==='high')right+='<span style="'+CH+'background:#3a3833;border:1px solid #3a3833;color:#fff">Hoch</span>';
    }
    var subTxt=[t.description,t.source?'Quelle: '+t.source:''].filter(Boolean).join(' · ');
    return '<div style="display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 12px;border:1px solid #E4E0D6;border-radius:10px;background:'+(done?'#F7F5F0':'#EFECE5')+';margin-bottom:6px">'
      +'<span role="checkbox" aria-checked="'+(done?'true':'false')+'" title="'+(done?'Wieder öffnen':'Als erledigt markieren')+'" onclick="atToggle(\''+t.id+'\')" style="width:22px;height:22px;border-radius:7px;border:1.5px solid '+(done?'#3a3833':'#B4AC9C')+';background:'+(done?'#3a3833':'#fff')+';flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff">'+(done?'<i class="ti ti-check" style="font-size:14px"></i>':'')+'</span>'
      +'<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:'+(done?500:600)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'+(done?'text-decoration:line-through;color:var(--text3)':'')+'">'+esc(t.text||'')+'</div>'
      +(subTxt?'<div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(subTxt)+'</div>':'')+'</div>'
      +'<span style="display:flex;gap:6px;flex-shrink:0">'+right+'</span></div>';
  }
  var open=list.filter(function(t){return t.status!=='done'&&!t.done;}).sort(function(a,b){return (a.dueDate||'9999').localeCompare(b.dueDate||'9999');});
  var done=list.filter(function(t){return t.status==='done'||t.done;}).sort(function(a,b){return String(b.completedAt||b.createdAt||'').localeCompare(String(a.completedAt||a.createdAt||''));}).slice(0,3);
  var oEl=document.getElementById('atOpen'),dEl=document.getElementById('atDone'),nEl=document.getElementById('atOpenN');
  if(nEl)nEl.textContent='('+open.length+')';
  if(oEl)oEl.innerHTML=open.length?open.map(function(t){return row(t,false);}).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Keine offenen Aufgaben.</div>';
  if(dEl)dEl.innerHTML=done.length?done.map(function(t){return row(t,true);}).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch nichts erledigt.</div>';
}
function atToast(msg,undo){
  var t=document.getElementById('atToast');if(!t)return;
  document.getElementById('atToastMsg').textContent=msg;
  t.lastElementChild.style.display=undo?'':'none';
  _atLast=undo;t.style.display='flex';
  clearTimeout(window._atTT);window._atTT=setTimeout(function(){t.style.display='none';},4000);
}
function atUndo(){if(!_atLast)return;var id=_atLast;_atLast=null;document.getElementById('atToast').style.display='none';atToggle(id,true);}
function atToggle(id,isUndo){
  var t=(tasks[selectedEmp]||[]).find(function(x){return String(x.id)===String(id);});if(!t)return;
  var old={status:t.status,done:t.done,completedAt:t.completedAt};
  var nowDone=!(t.status==='done'||t.done);
  t.status=nowDone?'done':'open';t.done=nowDone;t.completedAt=nowDone?new Date().toISOString():null;
  atRender();
  if(view==='emp')renderEmpDetail();
  if(!isUndo)atToast((nowDone?'Erledigt: ':'Wieder geöffnet: ')+t.text,t.id);
  taskDbUpdate(t.id,{status:t.status,done:t.done,completed_at:t.completedAt}).then(function(res){
    if(res&&res.error){alert('Fehler beim Speichern: '+res.error.message);t.status=old.status;t.done=old.done;t.completedAt=old.completedAt;atRender();if(view==='emp')renderEmpDetail();return;}
    var e0=employees.find(function(x){return x.id===selectedEmp;});
    logActivity('task','status_changed','Aufgabe '+(nowDone?'erledigt':'wieder geöffnet')+': "'+t.text+'"',selectedEmp,e0?e0.name:'');
  });
}
// Teamleiter (Position SDL) eines Agents laut Stammdaten des SDL → Aufgaben-Schlüssel 'emp:<id>'
function aufgTeamLead(e){if(!e)return null;var id=String(e.id);var l=employees.find(function(x){return x.role==='SDL'&&x.active!==false&&String(x.id)!==id&&(x.sdlTeam||[]).indexOf(id)>=0;});return l?'emp:'+l.id:null;}
function loadAufgabenFromSupabase(){return Promise.all([sb.from('aufgaben_meta').select('*'),sb.from('aufgaben_kommentare').select('*')]).then(function(r){aufgMeta={};aufgKomm=[];
  if(r[0]&&!r[0].error)(r[0].data||[]).forEach(function(x){aufgMeta[x.key]=x;});else console.warn('aufgaben_meta (Tabelle angelegt?)',r[0]&&r[0].error);
  if(r[1]&&!r[1].error)aufgKomm=(r[1].data||[]).sort(function(a,b){return (b.am||'').localeCompare(a.am||'');});return true;}).catch(function(e){console.warn('aufgaben',e);return false;});}
function aufgNiklasEmp(){return employees.find(function(x){return x.active!==false&&/^niklas/i.test(x.name||'');})||null;}
function aufgNiklasKey(){var e=aufgNiklasEmp();return e?'emp:'+e.id:'u:n.hojdem';}
function aufgStaff(){var C=employees.filter(function(e){return e.active!==false&&e.boardRole!=='admin'&&!/^niklas/i.test(e.name||'')&&isCoachEmp(e);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  var row=function(e){return {key:'emp:'+e.id,name:e.name,sub:e.role==='SDM'?'Sales Development':'Coach'};},L=[],used={};
  AUFG_ORDER.forEach(function(n){if(n==='niklas'){var ne=aufgNiklasEmp();L.push({key:aufgNiklasKey(),name:ne?ne.name:'Niklas Hojdem',sub:'Sales Operations'});return;}
    var e=C.find(function(x){return (x.name||'').toLowerCase().indexOf(n)===0;});if(e){used[e.id]=1;L.push(row(e));}});
  C.forEach(function(e){if(!used[e.id])L.push(row(e));});return L;}
function aufgMeKeys(){var k=[];if(currentCoach)k.push('emp:'+currentCoach.id);if(currentUserRole==='admin')k.push('admin');
  var nk=aufgNiklasKey(),em=String(currentAuthUser&&currentAuthUser.email||'').toLowerCase();if(em==='n.hojdem@wiegand-gmbh.de'&&k.indexOf(nk)<0)k.push(nk);return k;}
// QA-Bewertungen (Zufallstopf): gleichmäßig auf Dogoro und Niklas, Kathrin nur ohne eigene Erster-Monat-Agents; stabil innerhalb der Woche, neu gemischt jeden Montag

function aufgQaHash(s){var h=2166136261;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function aufgName(key){var s=aufgStaff().find(function(x){return x.key===key;});if(s)return s.name;var e=key&&key.indexOf('emp:')===0?kalEmp(key.slice(4)):null;return e?e.name:'–';}
function aufgOwner(n){var e=employees.find(function(x){return x.active!==false&&(x.name||'').toLowerCase().indexOf(n)===0;});return e?'emp:'+e.id:null;}
// Ist der Zuständige am Fälligkeitstag abwesend, übernimmt ein anwesender Kollege (Dogoro, Kathrin, SDL, Niklas)
function aufgAbsentOn(key,day){if(!key||key.indexOf('emp:')!==0)return false;var a=kalOn(key.slice(4),day);return !!(a&&!a.fixed&&a.status!=='abgelehnt'&&a.status!=='storniert');}
function aufgCover(key,day){if(!aufgAbsentOn(key,day))return key;var C=[aufgOwner('dogoro'),aufgOwner('kathrin')].concat(employees.filter(function(l){return l.role==='SDL'&&l.active!==false;}).map(function(l){return 'emp:'+l.id;})).concat([aufgNiklasKey()]).filter(function(k,i,A){return k&&k!==key&&A.indexOf(k)===i;});
  for(var i=0;i<C.length;i++)if(!aufgAbsentOn(C[i],day))return C[i];return key;}
function aufgWeekAbsent(key,mon){if(!key||key.indexOf('emp:')!==0)return false;var e=kalEmp(key.slice(4));if(!e)return false;var any=false;for(var i=0;i<5;i++){var d=kalAdd(mon,i);if(!kalWorkday(e,d))continue;any=true;if(!aufgAbsentOn(key,d))return false;}return any;}
function aufgWeeklyOwner(e){var bm=beschaeftigungsmonat(e,today().slice(0,7));if(bm<=1&&aufgOwner('kathrin'))return aufgOwner('kathrin');return aufgTeamLead(e)||aufgOwner('dogoro')||aufgDefault(e);}
function aufgDefault(e){var mk=today().slice(0,7),bm=e?beschaeftigungsmonat(e,mk):99;var k=bm<=1?aufgOwner('kathrin'):aufgOwner('dogoro');return k||aufgOwner('dogoro')||aufgOwner('kathrin')||'admin';}
function aufgCoachOf(e){var rt=(kalRules().routinen||[]).find(function(r){return (r.empIds||[]).indexOf(e.id)>=0&&r.coachId;});return rt?'emp:'+rt.coachId:aufgDefault(e);}
function aufgFmt(d){return kalF(d);}
// ── Aufgaben berechnen ──
// Zuständige, die keine Spalte mehr haben (z. B. kein Coach mehr), fallen auf den Standard zurück – sonst wäre die Aufgabe unsichtbar
function aufgAll(){
  // Aufgaben nur für Personen, deren Vertrag noch läuft
  var teamTargetList=function(){var t0=today();return window.teamTargetList().filter(function(e){return !e.endDate||e.endDate>=t0;});};var t=today(),out=[],_sk=aufgStaff().map(function(p){return p.key;}).concat(['admin']),_fb=aufgOwner('dogoro')||aufgOwner('kathrin')||'admin',add=function(o){if(!o.quit&&!/^(antrag|task|emp):/.test(o.key||''))o.quit='Erledigt';if(o.quit&&aufgQuitted(o.key))return;var m=aufgMeta[o.key]&&aufgMeta[o.key].assignee;var a=(m&&m!=='admin')?m:o.def;if(_sk.indexOf(a)<0)a=_sk.indexOf(o.def)>=0?o.def:_fb;if(!(m&&m!=='admin')){var dd=o.due&&o.due>t?o.due:t;var cv=aufgCover(a,dd);if(cv!==a){o.vertretung=a;a=cv;}}o.assignee=a;out.push(o);};_kalOnIdx=null;
  // 1) Urlaubsanträge
  absences.filter(function(x){return x.status==='offen';}).forEach(function(x){var e=kalEmp(x.employeeId);if(!e)return;var tg=kalHintTags(x).replace(/<\/span>\s*<span[^>]*>/g,' · ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
    add({key:'antrag:'+x.id,art:'Urlaubsantrag',kind:'auto',t:e.name+' · '+kalRange(x),s:tg==='keine Hinweise'?KAL_ART[kalShowArt(x)]+' · '+kalNf(kalAmt(x))+' T':tg,due:x.eingereichtAm>kalAdd(t,-2)?kalAdd(x.eingereichtAm,2):t,born:x.eingereichtAm,def:aufgDefault(e),act:'Genehmigen',go:function(){KAL.loc=kalIsVlc(e)?'VLC':'MUC';KAL.pane='gen';selectKalender();},emp:e.id});});
  // 2) Ziel anpassen? (mehr als 5 Krankheitstage im laufenden oder letzten Monat)
  var mk=t.slice(0,7),pm=kalI(new Date(+mk.slice(0,4),+mk.slice(5,7)-2,1)).slice(0,7);
  teamTargetList().forEach(function(e){[pm,mk].forEach(function(m){var k=ztAbsCount(e,m).k;if(k>5)add({key:'ziel:'+e.id+':'+m,art:'Ziel anpassen?',kind:'auto',t:e.name,s:kalNf(k)+' Krankheitstage im '+MONTH_NAMES_ZIEL[+m.slice(5)-1],due:m===mk?t:m+'-'+('0'+new Date(+m.slice(0,4),+m.slice(5,7),0).getDate()).slice(-2),born:m+'-01',def:aufgDefault(e),act:'Ziel prüfen',quit:'Ziel bleibt',go:function(){view='team';wiegandView='ziel';ZT.open['m'+m]=true;ZT.open['e'+m+e.id]=true;renderSidebar();renderMain();},emp:e.id});});});
  // 3) Ausgleichstag? (140 Opt. von Mo bis Do erreicht, Fr noch frei)
  var mo=kalMon(t),th=kalAdd(mo,3),fr=kalAdd(mo,4);if(t>=th&&t<=fr)teamTargetList().forEach(function(e){var o=0;(performance[e.id]||[]).forEach(function(r){if(r.date>=mo&&r.date<=th)o+=r.optGesamt||0;});
    if(o>=140&&!kalOn(e.id,fr))add({key:'ausgl:'+e.id+':'+fr,art:'Ausgleichstag eintragen?',kind:'auto',t:e.name,s:Math.round(o)+' Opt. von Mo bis Do',due:th,born:th,def:aufgCoachOf(e),act:'Eintragen',go:function(){kalOpenForm(e.id,fr);if(KF){KF.art='ausgleich';kalDrawForm();}},emp:e.id});});
  // 4) Sessions planen: Performance Reviews, Routinen, Weeklys nach Regeln (aus dem Kalender, beide Standorte)
  var sv=KAL.loc;['MUC','VLC'].forEach(function(l){KAL.loc=l;_kalTC.v=null;kalTasks().forEach(function(x){var grp=/^rt/.test(x.id)?'Routine · '+x.art:(x.art==='Weekly'?'Weeklys':null);
    add({key:'ses:'+x.id,art:x.art==='Performance Review'?'Performance Review':x.art,kind:grp?'routine':'auto',bundle:grp,t:x.e.name,s:x.src,due:x.art==='Weekly'?kalMon(x.due):x.due,born:kalAdd(x.due,-14),def:x.coachId?'emp:'+x.coachId:(x.art==='Weekly'?aufgWeeklyOwner(x.e):aufgCoachOf(x.e)),act:'Session planen',go:function(){kalPlanTask(x.id);},emp:x.e.id,task:x});});});KAL.loc=sv;_kalTC.v=null;
  // 5) QA-Bewertungen: jeder Bewerter bewertet 4 Calls pro Woche INSGESAMT (nicht 4 je Agent).
  //    Vorgeschlagen werden die Agents mit den wenigsten Bewertungen (letzte 60 Tage, Stand Wochenbeginn), bei Gleichstand zufällig, stabil in der Woche.
  //    SDL (Amir): nur sein Team · Kathrin: zuerst Agents im ersten Monat · Dogoro und Niklas: alle übrigen.
  var qMo=kalMon(t),qFr=kalAdd(qMo,4),qMk=qMo.slice(0,7),QN=4,used={};
  var qAg=teamTargetList().filter(function(e){if(e.startDate&&e.startDate>qFr)return false;for(var i=0;i<5;i++){var d=kalAdd(qMo,i);if(kalWorkday(e,d)&&!kalOn(e.id,d))return true;}return false;});
  var qCnt=function(e){var f=kalAdd(qMo,-60);return (callRatings[e.id]||[]).filter(function(r){return r.date>=f&&r.date<qMo;}).length;};
  var qOrd=function(L){return L.slice().sort(function(x,y){return qCnt(x)-qCnt(y)||aufgQaHash(x.id+'|'+qMo)-aufgQaHash(y.id+'|'+qMo);});};
  var qPick=function(pool,n){var o=[];qOrd(pool.filter(function(e){return !used[e.id];})).forEach(function(e){if(o.length<n){o.push(e);used[e.id]=1;}});return o;};
  var qTeamOf={};employees.forEach(function(l){if(l.role==='SDL'&&l.active!==false)(l.sdlTeam||[]).forEach(function(id){qTeamOf[String(id)]=l;});});
  var qGen=qAg.filter(function(e){return !qTeamOf[String(e.id)];});
  var qR=[];var _qPush=qR.push.bind(qR);qR.push=function(r){if(!aufgWeekAbsent(r.key,qMo))_qPush(r);return qR.length;};
  employees.filter(function(l){return l.role==='SDL'&&l.active!==false;}).forEach(function(l){qR.push({key:'emp:'+l.id,name:l.name,pool:qAg.filter(function(e){return qTeamOf[String(e.id)]===l;})});});
  var qK=aufgOwner('kathrin'),qKe=qK&&kalEmp(qK.slice(4));if(qK)qR.push({key:qK,name:qKe?qKe.name:'Kathrin',first:true,pool:qGen});
  var qD=aufgOwner('dogoro'),qDe=qD&&kalEmp(qD.slice(4));if(qD)qR.push({key:qD,name:qDe?qDe.name:'Dogoro',pool:qGen});
  var qNk=aufgNiklasKey(),qNe=typeof aufgNiklasEmp==='function'?aufgNiklasEmp():null;qR.push({key:qNk,name:qNe?qNe.name:'Niklas Hojdem',pool:qGen});
  // Bewertungen dieser Woche je Bewerter (über „bewertet von“)
  var qByR=function(name){var fn=String(name||'').toLowerCase().split(' ')[0],o=[];if(!fn)return o;Object.keys(callRatings).forEach(function(eid){(callRatings[eid]||[]).forEach(function(r){if(r.date>=qMo&&r.date<=kalAdd(qMo,6)&&String(r.bewertetVon||'').toLowerCase().indexOf(fn)===0)o.push(eid);});});return o;};
  // Reihenfolge: SDL zuerst (eigener Pool), dann Kathrin (erster Monat), dann Dogoro und Niklas abwechselnd aus dem Rest
  var qSel={};qR.forEach(function(r){if(r.first){var fm=r.pool.filter(function(e){return e.startDate&&beschaeftigungsmonat(e,qMk)<=1;});qSel[r.key]=qPick(fm,QN);}else if(r.pool!==qGen){var sp=qPick(r.pool,QN),so=qOrd(r.pool);for(var k=0;sp.length<QN&&so.length;k++)sp.push(so[k%so.length]);qSel[r.key]=sp;}});
  if(qSel[qK]&&qSel[qK].length<QN)qSel[qK]=qSel[qK].concat(qPick(qGen,QN-qSel[qK].length));
  var qRest=qR.filter(function(r){return !qSel[r.key];});for(var qi=0;qi<QN;qi++)qRest.forEach(function(r){qSel[r.key]=(qSel[r.key]||[]).concat(qPick(r.pool,1));});
  qR.forEach(function(r){var done=qByR(r.name),open=Math.max(0,QN-done.length),dl,dl=done.slice(),L=(qSel[r.key]||[]).filter(function(e){var k=dl.indexOf(String(e.id));if(k>=0){dl.splice(k,1);return false;}return true;}).slice(0,open);
    L.forEach(function(e,i){add({key:'qa:'+r.key+':'+qMo+':'+e.id+':'+i,art:'QA-Bewertung',kind:'routine',t:e.name,s:'Call bewerten · '+(done.length+i+1)+' von '+QN+' diese Woche'+(r.first&&e.startDate&&beschaeftigungsmonat(e,qMk)<=1?' · erster Monat':''),due:qFr,born:qMo,def:r.key,act:'Call bewerten',go:function(){openQaBewertungModal(e.id);},emp:e.id});});});
  // 6) Mitarbeiter fehlt? (ab 09:30 an Arbeitstagen: keine Aktivität, keine Abwesenheit)
  var KR=kalRules(),fz=KR.fehltZeit.split(':'),fMin=(+fz[0])*60+(+fz[1]),nw=new Date(),hm=nw.getHours()*60+nw.getMinutes();if(KR.fehltAn&&hm>=Math.min(fMin,AUFG_FEHLT_MIN_OVR==null?fMin:AUFG_FEHLT_MIN_OVR)&&!kalWknd(t))teamTargetList().forEach(function(e){if(e.startDate&&e.startDate>t)return;if(!kalWorkday(e,t))return;var a=kalOn(e.id,t);if(a)return;
    var act=0;(performance[e.id]||[]).forEach(function(r){if(r.date===t)act+=(r.gesamtAktivitaeten||0)+(r.oem_aktivitaeten||0)+(r.optGesamt||0);});if(act>0)return;
    add({key:'fehlt:'+e.id+':'+t,art:'Mitarbeiter fehlt?',kind:'auto',t:e.name,s:'keine Aktivität bis '+KR.fehltZeit+' · keine Abwesenheit eingetragen',due:t,born:t,def:aufgDefault(e),act:'Abwesenheit eintragen',emp:e.id,go:function(){openAbsPopup(e.id,t.slice(0,7));abNewForm();AB.fOpen=true;AB.f.art='krank';AB.f.status='genehmigt';AB.f.von=t;AB.f.bis=t;abRender();}});});
  // 5b) Entwicklung bewerten – eigene Aufgabe vor dem Performance Review
  teamTargetList().forEach(function(e){if(e.active===false||!e.startDate)return;[3,5,11,23].forEach(function(n){var s0=kalP(e.startDate);s0.setMonth(s0.getMonth()+n);var due=kalI(s0);
    if(due<kalAdd(t,-60)||due>kalAdd(t,14))return;
    var rev=(reviews[e.id]||[]).some(function(r){return r&&r.einwand!==undefined&&(r.date||'')>=kalAdd(due,-30);});
    if(!rev)add({key:'pgr:'+e.id+':'+n,art:'Entwicklung bewerten',kind:'auto',t:e.name,s:n+' Monate · vor dem Performance Review',due:due,born:kalAdd(due,-14),def:aufgCoachOf(e),act:'Entwicklung bewerten',go:function(){openCoachingEval(e.id);},emp:e.id});});});
  // 6a) Ziele: zur Frist „Ziel prüfen“ (ohne Doppel, wenn noch eine alte freie Ziel-Aufgabe offen ist)
  var gl=kalAdd(t,7);employees.forEach(function(e){if(e.active===false)return;(goals[e.id]||[]).forEach(function(g){if(!g.targetDate||g.targetDate>gl||g.status==='erreicht'||g.status==='verfehlt')return;
    if((tasks[e.id]||[]).some(function(k){return !(k.done||k.status==='done')&&k.text==='Ziel: '+g.description;}))return;
    var u=goalUnit(g.metricKey);add({key:'ziel-pr:'+g.id,art:'Ziel prüfen',kind:'auto',t:e.name,s:(g.metricKey?focusMetricLabel(g.metricKey)+(g.targetValue!=null?' ≥ '+g.targetValue+u:'')+' · ':'')+g.description,due:g.targetDate,born:kalAdd(g.targetDate,-7),def:aufgCoachOf(e),act:'Ziel prüfen',go:function(){openGoalInPopup(e.id);},emp:e.id});});});
  // 6b) Geplante Sessions: erledigt, sobald sie erfasst sind
  var pl=kalAdd(t,14);employees.forEach(function(e){if(e.active===false)return;(protocols[e.id]||[]).forEach(function(p){if(p.status!=='geplant'||!p.date||p.date>pl)return;
    var ty=p.type||'Session',art=ty==='Einzelcoaching'?'Coaching':ty;
    add({key:'plan:'+p.id,art:art,kind:'auto',t:e.name,s:'geplant '+kalF(p.date)+(p.uhrzeit?' · '+String(p.uhrzeit).slice(0,5):'')+(p.note?' · '+p.note:''),due:p.date,born:kalAdd(p.date,-14),def:p.coachId?'emp:'+p.coachId:aufgDefault(e),act:'Session erfassen',go:function(){openPlannedSession(e.id,p.id,p.type,p.focus||'',p.date,p.uhrzeit||'');},emp:e.id});});});
  // 7) Freie Tasks
  Object.keys(tasks||{}).forEach(function(eid){(tasks[eid]||[]).forEach(function(k){if(k.done||k.status==='done')return;var e=kalEmp(eid);if(!e)return;
    add({key:'task:'+k.id,art:'Task',kind:'task',t:k.text,s:e.name+(k.source?' · '+k.source:''),due:k.dueDate||kalAdd(t,7),born:t,def:aufgCoachOf(e),act:'Öffnen',go:function(){selectedEmp=eid;view='emp';activeTab='tasks';renderSidebar();renderMain();},emp:eid,taskId:k.id});});});
  return out;}
function aufgState(o){var t=today(),d=kalDiff(t,o.due);if(d<0)return {c:'od',l:'überfällig seit '+(-d)+' T',r:0};if(d===0)return {c:'td',l:'heute',r:1};if(d===1)return {c:'tm',l:'morgen',r:2};return {c:'',l:d<=6?KAL_WD[kalP(o.due).getDay()]+' '+aufgFmt(o.due):'in '+d+' T',r:3};}
// Weeklys und QA-Bewertungen immer einzeln (je Mitarbeiter eine Karte), andere Routinen weiter gebündelt
function aufgCards(L){var B={},out=[];L.forEach(function(o){if(o.bundle&&o.art!=='Weekly'&&o.art!=='QA-Bewertung'){var k=o.bundle+'|'+o.assignee;if(!B[k]){B[k]={key:'b:'+k,bundle:o.bundle,art:o.bundle,items:[],assignee:o.assignee,due:o.due,kind:o.kind};out.push(B[k]);}B[k].items.push(o);if(o.due<B[k].due)B[k].due=o.due;}else out.push(o);});
  out.forEach(function(c){if(c.items){var rt=c.items[0].task&&/^rt/.test(c.items[0].task.id)?(kalRules().routinen||[]).find(function(r){return c.items[0].task.id.indexOf('rt'+r.id)===0;}):null;c.total=rt?(rt.empIds||[]).length:null;c.t=c.items.length+' offen'+(c.total?' von '+c.total:'');c.s=c.items.slice(0,3).map(function(o){return kalFirst(o.t);}).join(', ')+(c.items.length>3?' …':'');}});
  return out.sort(function(a,b){var x=aufgState(a).r-aufgState(b).r;return x||(a.due<b.due?-1:a.due>b.due?1:0);});}
// ── Seite ──
// Aufgaben-Folie des Banner-Karussells
function aufgBannerHtml(L){var me=aufgMeKeys(),cnt=function(f){return L.filter(f).length;},st=function(o){return aufgState(o).c;};
  var big=function(l,v,s){return '<div style="padding-left:14px"><div style="font-size:10.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:4px">'+l+'</div><div style="font-size:30px;font-weight:700;line-height:1">'+v+'</div><div style="font-size:11px;color:#E9B2A6;margin-top:4px">'+s+'</div></div>';};
  var sm=function(l,v,s){return '<div style="padding:4px 14px"><div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em">'+l+'</div><div style="font-size:18px;font-weight:700;margin-top:4px">'+v+'</div><div style="font-size:9.5px;color:#E9B2A6;margin-top:3px">'+s+'</div></div>';};
  var wk=kalAdd(kalMon(today()),4);
  var h='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px;color:#fff;margin:16px 0 22px;min-height:var(--ban-h);box-sizing:border-box;position:relative;overflow:hidden">'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.14)">'+big('ÜBERFÄLLIG',cnt(function(o){return st(o)==='od';}),'seit Fälligkeit offen')+big('HEUTE FÄLLIG',cnt(function(o){return st(o)==='td';}),'alle Personen')+big('BIS FREITAG',cnt(function(o){return o.due<=wk;}),'diese Woche')+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">'+sm('ANTRÄGE',cnt(function(o){return o.art==='Urlaubsantrag';}),'offen')+sm('WEEKLYS',cnt(function(o){return o.art==='Weekly';}),'offen')+sm('QA',cnt(function(o){return o.art==='QA-Bewertung';}),'Mitarbeiter')+sm('PERFORMANCE REVIEW',cnt(function(o){return o.art==='Performance Review';}),'fällig')+sm('ZIEL ANPASSEN?',cnt(function(o){return o.art==='Ziel anpassen?';}),'prüfen')+sm('MEINE',cnt(function(o){return me.indexOf(o.assignee)>=0;}),'offen')+'</div>'+bannerDotsBar('aufgaben')+'</div>';
  return h;}
function renderAufgaben(){var ma=document.getElementById('mainArea');if(!ma)return;var L=aufgAll(),S=aufgStaff(),me=aufgMeKeys(),C=aufgCards(L);
  var cnt=function(f){return L.filter(f).length;},st=function(o){return aufgState(o).c;};
  var h='<div class="content">'+buildGlobalBannerHtml(gbVisible());
  h+='<div class="card card-static"><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap"><div class="card-title" style="margin:0"><i class="ti ti-checklist"></i> Aufgaben</div><span class="kal-note">'+(AU.view==='k'?(AU.group==='d'?'nach Fälligkeit · Klick öffnet':AU.group==='a'?'nach Art · Klick öffnet':'eine Spalte je Person · Karte ziehen = neu zuweisen · Klick öffnet'):'oben die Aufgaben der anderen, darunter deine zum Abarbeiten')+'</span>'
    +'<span style="margin-left:auto;display:flex;gap:8px;align-items:center">'+(AU.view==='k'?'<span class="kal-note">Spalten</span><span class="dsh-seg"><button type="button" class="'+(!AU.group||AU.group==='p'?'on':'')+'" onclick="AU.group=\'p\';renderAufgaben()">Person</button><button type="button" class="'+(AU.group==='d'?'on':'')+'" onclick="AU.group=\'d\';renderAufgaben()">Fälligkeit</button><button type="button" class="'+(AU.group==='a'?'on':'')+'" onclick="AU.group=\'a\';renderAufgaben()">Art</button></span>':'')+'<span class="dsh-seg"><button type="button" class="'+(AU.view==='k'?'on':'')+'" onclick="AU.view=\'k\';renderAufgaben()">Kanban</button><button type="button" class="'+(AU.view==='l'?'on':'')+'" onclick="AU.view=\'l\';renderAufgaben()">Liste</button></span></span></div>';
  h+=(AU.view==='k'?aufgKanban(C,S):aufgList(C,me))+'</div>'+aufgRoutineTable()+'</div>';
  var oc=ma.querySelector('.content'),sc=oc?oc.scrollTop:0;ma.innerHTML=h;var nc=ma.querySelector('.content');if(nc&&sc)nc.scrollTop=sc;aufgBadge(L);}
function aufgCardHtml(c){var s=aufgState(c),items=c.items;
  return '<div class="au-kc" draggable="true" data-akey="'+esc(c.key)+'" onclick="aufgClick(\''+jsq(c.key)+'\')"><div class="au-st '+s.c+'"><i class="ti '+(s.c==='od'?'ti-alarm':'ti-clock')+'"></i>'+s.l+'<span class="r">'+aufgFmt(c.due)+'</span></div>'
    +'<div class="au-b"><b>'+esc(c.art)+'</b><small>'+esc(c.t)+'</small><div class="ft"><span class="au-tag">'+(items?'Routine':c.kind==='task'?'Task':'automatisch')+'</span>'+(items&&c.total?'<span class="au-pr"><i><b style="width:'+Math.max(0,(c.total-items.length)/c.total*100)+'%"></b></i>'+(c.total-items.length)+'/'+c.total+'</span>':'<small class="au-s">'+esc(c.s||'')+'</small>')+'</div></div></div>';}
function aufgKanban(C,S){if(AU.group==='d'||AU.group==='a')return aufgKanban2(C);return '<div class="au-kb" style="grid-template-columns:repeat('+S.length+',minmax(250px,1fr))">'+S.map(function(p){var X=C.filter(function(c){return c.assignee===p.key;}),od=X.some(function(c){return aufgState(c).c==='od';});
  return '<div class="au-col" data-acol="'+esc(p.key)+'"><div class="au-ch"><i style="background:'+(od?'#F08566':'#9a9a96')+'"></i>'+esc(p.name)+'<small>'+esc(p.sub)+'</small><span>'+X.length+'</span></div>'+(X.length?X.map(aufgCardHtml).join(''):'<div class="kal-note" style="text-align:center;padding:14px">Keine Aufgaben</div>')+'</div>';}).join('')+'</div>';}
// Spalte in der Ansicht „Art“: alles außer Performance Review, Weekly und QA landet unter „Aufgaben“
function aufgArtCol(c){var a=String(c.art||'');if(/Performance|Entwicklung bewerten/.test(a))return 'Performance Reviews';if(/Weekly/.test(a))return 'Weekly';if(/QA/.test(a))return 'QA-Bewertungen';return 'Aufgaben';}
function aufgKanban2(C){var cols;if(AU.group==='d'){var wk=kalAdd(kalMon(kalRef()),4);cols=[['Überfällig',function(c){return aufgState(c).c==='od';}],['Heute',function(c){return aufgState(c).c==='td';}],['Bis Freitag',function(c){var s=aufgState(c).c;return s!=='od'&&s!=='td'&&c.due<=wk;}],['Später',function(c){return c.due>wk;}]];}
  else{cols=['Performance Reviews','Weekly','QA-Bewertungen','Aufgaben'].map(function(a){return [a,function(c){return aufgArtCol(c)===a;}];});}
  return '<div class="au-kb" style="grid-template-columns:repeat('+cols.length+',minmax(250px,1fr))">'+cols.map(function(cl){var X=C.filter(cl[1]);return '<div class="au-col"><div class="au-ch"><i style="background:'+(cl[0]==='Überfällig'&&X.length?'#F08566':'#9a9a96')+'"></i>'+esc(cl[0])+'<span>'+X.length+'</span></div>'+(X.length?X.map(function(c){return aufgCardHtml(c).replace('<span class="au-tag">','<span class="au-tag">'+esc(kalFirst(aufgName(c.assignee)))+'</span><span class="au-tag">');}).join(''):'<div class="kal-note" style="text-align:center;padding:14px">Keine Aufgaben</div>')+'</div>';}).join('')+'</div>';}
function aufgRow(c){var s=aufgState(c),km=aufgKomm.find(function(k){return k.key===c.key;});
  return '<tr onclick="aufgClick(\''+jsq(c.key)+'\')" style="cursor:pointer"><td class="au-due '+s.c+'">'+s.l.replace('überfällig seit','seit')+'</td><td><b>'+esc(c.art)+'</b> · '+esc(c.t)+'<small>'+esc(c.s||'')+'</small></td><td>'+esc(aufgName(c.assignee))+'</td><td class="au-cm">'+(km?'<b>'+new Date(km.am).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+'</b> '+esc(aufgKommText(km.text)):'<span class="zt-dim">–</span>')+'</td></tr>';}
function aufgList(C,me){var oth=C.filter(function(c){return me.indexOf(c.assignee)<0;}),mine=C.filter(function(c){return me.indexOf(c.assignee)>=0&&!c.items;}),rout=C.filter(function(c){return me.indexOf(c.assignee)>=0&&c.items;});
  var t=today(),ses=[];employees.forEach(function(e){(protocols[e.id]||[]).forEach(function(p){if(p.date===t&&p.status==='geplant'&&(!currentCoach||!p.coachId||p.coachId===currentCoach.id))ses.push({e:e,p:p});});});
  var seen={};ses=ses.filter(function(o){if(o.p.groupId){if(seen[o.p.groupId])return false;seen[o.p.groupId]=1;}return true;}).sort(function(a,b){return (a.p.uhrzeit||'').localeCompare(b.p.uhrzeit||'');});
  var head='<colgroup><col style="width:130px"><col style="width:38%"><col style="width:180px"><col></colgroup><thead><tr><th>Fällig</th><th>Aufgabe · Mitarbeiter</th><th>Zuständig</th><th>Letzter Kommentar</th></tr></thead>';
  var now=new Date(),nm=now.getHours()*60+now.getMinutes(),line=false,sr='';ses.forEach(function(o){var m=o.p.uhrzeit?timeStrToMin(o.p.uhrzeit):0;if(!line&&m>nm){sr+='<tr><td colspan="4"><div class="au-now">jetzt '+('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2)+'</div></td></tr>';line=true;}
    sr+='<tr class="kal-sopen" style="cursor:pointer" onclick="openPlannedSessionFromChip(this)"'+kalSesAttrs({e:o.e,p:o.p,n:1})+'><td class="au-due'+(m<nm?' od':'')+'" style="width:110px">'+(o.p.uhrzeit||'–')+'</td><td><span class="au-dot'+(m<nm?' od':'')+'"></span><b>'+esc(o.p.type||'Session')+'</b> · '+esc(o.p.groupId?'Gruppencoaching':o.e.name)+'<small>'+(m<nm?'verpasst · ':'')+'geplante Session</small></td><td></td><td></td></tr>';});
  return '<div class="au-mine"><div class="au-mh"><i class="ti ti-list-check"></i> Meine Aufgaben<span>'+mine.length+' offen · '+ses.length+' Termine</span>'+(mine.length?'<button class="btn btn-primary" onclick="aufgOpen(\''+jsq(mine[0].key)+'\')"><i class="ti ti-player-play"></i> Jetzt abarbeiten ('+mine.length+')</button>':'')+'</div>'
    +'<div class="au-sec">Offen, ohne feste Uhrzeit</div><div class="au-in"><table class="zt-t au-t">'+head+'<tbody>'+(mine.length?mine.map(aufgRow).join(''):'<tr><td colspan="4" class="kal-note">Alles erledigt.</td></tr>')+'</tbody></table></div>'
    +(rout.length?'<div class="au-sec">Routinen</div><div class="au-in"><table class="zt-t au-t"><colgroup><col style="width:130px"><col style="width:38%"><col style="width:180px"><col></colgroup><tbody>'+rout.map(function(c){return '<tr onclick="aufgClick(\''+jsq(c.key)+'\')" style="cursor:pointer"><td class="au-due" style="width:110px">'+aufgState(c).l+'</td><td><b>'+esc(c.art)+'</b><small>'+esc(c.s)+'</small></td><td colspan="2">'+(c.total?'<span class="au-pr"><i style="width:160px"><b style="width:'+((c.total-c.items.length)/c.total*100)+'%"></b></i>'+(c.total-c.items.length)+' von '+c.total+'</span>':c.items.length+' offen')+'</td></tr>';}).join('')+'</tbody></table></div>':'')
    +'<div class="au-sec">Termine heute</div><div class="au-in"><table class="zt-t au-t"><colgroup><col style="width:130px"><col style="width:38%"><col style="width:180px"><col></colgroup><tbody>'+(sr||'<tr><td class="kal-note">Keine Termine.</td></tr>')+'</tbody></table></div></div>'
    +'<div class="au-oth" style="margin-top:16px"><div class="au-mh"><i class="ti ti-users"></i> Zugewiesene Aufgaben · andere<span>'+oth.length+' offen</span></div><div class="au-in" style="margin-top:12px"><table class="zt-t au-t">'+head+'<tbody>'+(oth.length?oth.map(aufgRow).join(''):'<tr><td colspan="4" class="kal-note">Keine.</td></tr>')+'</tbody></table></div></div>';}
function aufgRoutineTable(){var R=kalRules().routinen||[];if(!R.length)return '';var mo=kalMon(kalRef()),W=[];for(var i=5;i>=0;i--)W.push(kalAdd(mo,-7*i));
  var rows=R.map(function(rt){var c=rt.coachId?kalCoachName(rt.coachId):'–';return '<tr><td><b>'+esc(c)+'</b> · '+esc(rt.art)+'<small class="kal-note" style="display:block">'+KAL_RH[rt.rhythmus||'woche']+' · '+(rt.empIds||[]).length+' Mitarbeiter</small></td>'+W.map(function(w,ix){var pd=kalPeriod(rt.rhythmus,w),soll=0,ist=0;
      if(rt.rhythmus==='2wochen'&&pd.from!==w&&kalAdd(pd.from,7)!==w)return '<td class="c"><span class="au-cell c0">–</span></td>';
      if(rt.rhythmus==='monat'&&kalMon(pd.to)!==kalMon(w)&&ix<5)return '<td class="c"><span class="au-cell c0">–</span></td>';
      (rt.empIds||[]).forEach(function(id){var e=kalEmp(id);if(!e)return;soll++;if((protocols[id]||[]).some(function(p){return p.date>=pd.from&&p.date<=pd.to&&(p.type||'')===(rt.art||'Weekly')&&p.status!=='geplant';}))ist++;});
      var p=soll?ist/soll:0,cl=ix===5?'c0':p>=1?'c3':p>=0.75?'c2':'c1';return '<td class="c"><span class="au-cell '+cl+'">'+ist+' / '+soll+'</span></td>';}).join('')+'</tr>';}).join('');
  return '<div class="card card-static"><div class="card-title">Routinen-Übersicht<span class="kal-note" style="font-weight:400;margin-left:6px">erledigt = Session dokumentiert · Routinen pflegst du unter Einstellungen › Kalender</span></div><div class="std-wrap"><table class="std-table"><thead><tr><th>Person · Routine</th>'+W.map(function(w){return '<th class="c">KW '+kalKw(w)+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="kal-legend"><span><span class="au-cell c3">✓</span> vollständig</span><span><span class="au-cell c2">≥ 75 %</span></span><span><span class="au-cell c1">&lt; 75 %</span></span><span>laufende Woche grau</span></div></div>';}
function aufgBadge(L){var adm=currentUserRole==='admin';
  try{L=L||aufgAll();var me=aufgMeKeys(),n=L.filter(function(o){return (adm||me.indexOf(o.assignee)>=0)&&aufgState(o).r<=1;}).length;railSetBadge('rail-aufgaben',n,'überfällig / heute');}catch(e){}
  try{var nr=kalCanEdit()?kalOpenReqs().length:0;var _nr=nr;}catch(e){var _nr=0;}
  try{var t=today(),me2=currentCoach?currentCoach.id:null,c=0;if(adm||me2){var grp={};employees.forEach(function(e){if(e.active===false)return;(protocols[e.id]||[]).forEach(function(p){if(p.status!=='geplant'||!p.date||p.date>=t)return;if(!adm&&p.coachId!==me2)return;if(p.groupId){if(grp[p.groupId])return;grp[p.groupId]=1;}c++;});});}var tot=(typeof _nr==='number'?_nr:0)+c,tp=[_nr?_nr+(_nr===1?' Antrag offen':' Anträge offen'):'',c?c+(c===1?' Session überfällig':' Sessions überfällig'):''].filter(Boolean).join(' · ');railSetBadge('rail-kalender',tot,tp||'nichts offen');}catch(e){}}
function selectAufgaben(){view='aufgaben';bannerViewMode='aufgaben';resetBannerRotation();renderSidebar();renderMain();}
// ── Öffnen ──
function aufgFind(key){var L=aufgAll(),C=aufgCards(L);return C.find(function(c){return c.key===key;})||L.find(function(o){return o.key===key;});}
function aufgOpen(key){var c=aufgFind(key);if(!c)return;AU.open=key;var m=document.getElementById('aufgModal');if(!m){m=document.createElement('div');m.className='modal-ov hidden';m.id='aufgModal';m.innerHTML='<div class="modal" style="width:640px!important;background:#EEEDE9;padding:18px"><div id="aufgBody"></div></div>';m.addEventListener('mousedown',function(ev){if(ev.target===m)closeModal('aufgModal');});document.body.appendChild(m);}
  var s=aufgState(c),K=aufgKomm.filter(function(k){return k.key===key;}),S=aufgStaff();
  var h='<div style="display:flex;align-items:center;margin:2px 4px 12px"><div><div style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">'+(c.items?'Routine':'Aufgabe')+'</div><div style="font-size:16px;font-weight:700">'+esc(c.art)+(c.items?'':' · '+esc(c.t))+'</div></div><button class="btn" style="margin-left:auto" onclick="closeModal(\'aufgModal\')" aria-label="Schließen"><i class="ti ti-x"></i></button></div>'
    +'<div class="kal-fs"><div class="zt-k3" style="grid-template-columns:repeat(3,1fr)"><div style="min-height:0"><small>Fällig</small><b style="font-size:15px">'+aufgFmt(c.due)+'</b></div><div style="min-height:0"><small>Status</small><b style="font-size:15px">'+s.l+'</b></div><div style="min-height:0"><small>Zuständig</small><select style="height:30px;margin-top:2px" onchange="aufgAssign(\''+jsq(key)+'\',this.value)"'+(kalCanEdit()?'':' disabled')+'>'+S.map(function(p){return '<option value="'+esc(p.key)+'"'+(p.key===c.assignee?' selected':'')+'>'+esc(p.name)+'</option>';}).join('')+'</select></div></div>'
    +(c.items?'':'<div class="kal-note" style="margin-top:8px">'+esc(c.s||'')+'</div>')+'</div>';
  if(c.items)h+='<div class="kal-fs"><div class="h">Offen ('+c.items.length+')</div>'+c.items.map(function(o){return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #E4E0D6"><span class="kal-av">'+kalIni(o.t)+'</span><div style="flex:1;min-width:0">'+esc(o.t)+'<div class="kal-note">'+esc(o.s||'')+'</div></div>'+'<button class="btn btn-sm" onclick="closeModal(\'aufgModal\');aufgOpenEmp(\''+jsq(o.key)+'\')">Öffnen</button>'+'</div>';}).join('')+'</div>';
  h+='<div class="kal-fs"><div class="h">Kommentare</div>'+(K.length?K.map(function(k){return '<div style="padding:6px 0;border-bottom:1px solid #E4E0D6;font-size:13px"><b>'+new Date(k.am).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+'</b> '+esc(k.text)+' <span class="kal-note">· '+esc(k.von||'')+'</span></div>';}).join(''):'<div class="kal-note">Noch kein Kommentar.</div>')
    +(kalCanEdit()?'<div style="display:flex;gap:8px;margin-top:8px"><input type="text" id="aufgKommIn" placeholder="Kommentar schreiben …" onkeydown="if(event.key===\'Enter\')aufgComment()"><button class="btn" onclick="aufgComment()"><i class="ti ti-send"></i></button></div>':'')+'</div>';
  if(!c.items&&kalCanEdit())h+='<div class="kal-acts" style="justify-content:flex-end">'+(c.quit&&kalCanEdit()?'<button class="btn" onclick="aufgQuit(\''+jsq(key)+'\',\''+c.quit+'\')"><i class="ti ti-check"></i> '+c.quit+'</button>':'')+'<button class="btn btn-primary" onclick="closeModal(\'aufgModal\');aufgGo(\''+jsq(key)+'\')">'+esc(c.act)+'</button></div>';
  document.getElementById('aufgBody').innerHTML=h;openModal('aufgModal');}
function aufgGo(key){var o=aufgAll().find(function(x){return x.key===key;});if(o&&o.go)o.go();}
function aufgAssign(key,who){var c=aufgFind(key);if(!c)return;var keys=c.items?c.items.map(function(o){return o.key;}):[key];
  keys.forEach(function(k){aufgMeta[k]={key:k,assignee:who};});var by=kalActor();
  sb.from('aufgaben_meta').upsert(keys.map(function(k){return {key:k,assignee:who,updated_by:by,updated_at:new Date().toISOString()};}),{onConflict:'key'}).then(function(r){if(r&&r.error)alert(/aufgaben_meta/i.test(r.error.message||'')?'Die Tabelle „aufgaben_meta“ fehlt noch. Bitte 26_aufgaben.sql ausführen.':kalErrText(r));});
  logActivity('aufgabe','assigned','Aufgabe zugewiesen: '+c.art,c.emp||null,(c.t||'')+' → '+aufgName(who));
  if(view==='aufgaben')renderAufgaben();var m=document.getElementById('aufgModal');if(m&&!m.classList.contains('hidden'))aufgOpen(c.items?'b:'+c.bundle+'|'+who:key);}
function aufgComment(){var i=document.getElementById('aufgKommIn');if(!i||!i.value.trim()||!AU.open)return;var row={key:AU.open,text:i.value.trim(),von:kalActor()};var loc=Object.assign({am:new Date().toISOString()},row);aufgKomm.unshift(loc);
  sb.from('aufgaben_kommentare').insert(row).then(function(r){if(r&&r.error)alert(/aufgaben_kommentare/i.test(r.error.message||'')?'Die Tabelle „aufgaben_kommentare“ fehlt noch. Bitte 26_aufgaben.sql ausführen.':kalErrText(r));});aufgOpen(AU.open);if(view==='aufgaben')renderAufgaben();}function aufgBadgeLazy(){if(Date.now()-_aufgBT<2000)return;_aufgBT=Date.now();try{aufgBadge();}catch(e){}}

// ── Aufgaben in der Mitarbeiterkarte (Bereich „Task“) ──
function aufgClick(key){var c=aufgFind(key);if(!c)return;if(c.items){aufgOpen(key);return;}aufgOpenEmp(key);}
function aufgOpenEmp(key){var o=aufgAll().find(function(x){return x.key===key;});if(!o||!o.emp)return;AU.hl=key;openAddTaskModal(o.emp);
  setTimeout(function(){var el=document.querySelector('#atOpen [data-akey="'+key.replace(/"/g,'')+'"]');if(el)el.scrollIntoView({block:'center'});},120);}
// Prüf-Aufgaben ohne nötige Änderung abschließen: Kommentar mit Kennung [erledigt] in aufgaben_kommentare
function aufgQuitted(key){return (aufgKomm||[]).some(function(c){return c.key===key&&/^\[erledigt[\]|]/.test(c.text||'');});}
function aufgQuit(key,label){if(!kalCanEdit())return;var o=aufgAll().find(function(x){return x.key===key;})||{},inp=document.querySelector('[data-quitin="'+key+'"]'),extra=inp&&inp.value.trim()?' – '+inp.value.trim():'',txt='[erledigt|'+(o.emp||'')+'|'+(o.art||'Aufgabe')+'] '+label+extra,row={key:key,text:txt,von:kalActor()};
  aufgKomm.unshift(Object.assign({am:new Date().toISOString()},row));sb.from('aufgaben_kommentare').insert(row).then(function(r){if(r&&r.error)alert(kalErrText(r));});
  try{closeModal('aufgModal');}catch(e){}renderMain();if(view==='aufgaben'&&typeof renderAufgaben==='function')renderAufgaben();}
function aufgKommText(t){return /^\[erledigt[\]|]/.test(t||'')?'✓ '+String(t).replace(/^\[erledigt[^\]]*\]\s*/,''):t;}
function aufgActLabel(o){if(/^plan:/.test(o.key||''))return 'Session erfassen';if(o.art==='Ziel prüfen')return 'Ziel prüfen';if(o.art==='Entwicklung bewerten')return 'Entwicklung bewerten';if(o.art==='Performance Review'||o.art==='Performance Review')return 'Session erfassen';if(o.art==='Weekly')return 'Weekly erfassen';if(o.art==='QA-Bewertung')return 'Call bewerten';if(/^ses:/.test(o.key||''))return 'Session erfassen';return o.art==='Mitarbeiter fehlt?'?'Abwesenheit eintragen':o.art==='Urlaubsantrag'?'Genehmigen':o.art==='Ziel anpassen?'?'Ziel prüfen':o.art==='Ausgleichstag eintragen?'?'Eintragen':'Erledigt';}
function aufgDone(key){var o=aufgAll().find(function(x){return x.key===key;});if(!o||!kalCanEdit())return;
  if(o.kind==='task'&&o.taskId){atToggle(o.taskId);return;}
  if(/^antrag:/.test(key)){kalDecide(key.slice(7),true);setTimeout(atRender,60);return;}
  if(/^ses:/.test(key)){var typ=o.task&&o.task.art||'Weekly';if(typ==='Performance Review')typ='Performance Review';
    closeModal('addTaskModal');window._puOpenNew=true;openNeuesCoachingModal(o.emp);setTimeout(function(){puColOpen('ncSecNew');aufgPrefillSession(typ);if(typeof sfPreset==='function')sfPreset(typ,o.emp);},80);return;}
  if(/^qa:/.test(key)){closeModal('addTaskModal');window._puOpenNew=true;if(typeof openQaBewertungModal==='function')openQaBewertungModal(o.emp);return;}
  closeModal('addTaskModal');if(o.go)o.go();}
function aufgPrefillSession(typ){var cat=document.getElementById('sess-category'),ty=document.getElementById('sess-type'),dt=document.getElementById('sess-date');if(dt)dt.value=today();if(!cat||!ty)return;
  for(var i=0;i<cat.options.length;i++){cat.selectedIndex=i;populateCoachingTypeSelect('sess-category','sess-type',null);var hit=[].slice.call(ty.options).find(function(op){return op.value===typ||op.textContent===typ;});if(hit){ty.value=hit.value;try{ty.dispatchEvent(new Event('change'));}catch(e){}return;}}}
// „Zuletzt erledigt“: freie Tasks plus das, womit Aufgaben erledigt wurden (Weekly, Performance Review, Entwicklungsbewertung, QA-Bewertung)
function aufgEmpDoneHtml(eid){var L=[],dm=function(d){return d?String(d).slice(8,10)+'.'+String(d).slice(5,7)+'.':'';};
  (tasks[eid]||[]).forEach(function(t){if(t.status==='done'||t.done)L.push({d:String(t.completedAt||t.createdAt||'').slice(0,10),t:t.text||'Task',s:'Task',id:t.id});});
  (protocols[eid]||[]).forEach(function(p){if(p.status==='geplant')return;var ty=p.type||'';if(ty==='Weekly'||/Performance/i.test(ty))L.push({d:p.date,t:(ty==='Weekly'?'Weekly':'Performance Review')+' erfasst',s:p.coachId?kalCoachName(p.coachId):'Session'});});
  (reviews[eid]||[]).forEach(function(r){if(r&&r.einwand!==undefined)L.push({d:r.date,t:'Entwicklung bewertet',s:'Mitarbeiterentwicklung'});});
  (callRatings[eid]||[]).forEach(function(c){if(c&&c.date)L.push({d:c.date,t:'Call bewertet',s:c.bewertetVon||'QA-Bewertung'});});
  (aufgKomm||[]).forEach(function(c){var m=/^\[erledigt\|([^|]*)\|([^\]]*)\]\s*(.*)$/.exec(c.text||'');if(!m||String(m[1])!==String(eid))return;var rest=m[3].replace(/^(Erledigt|Ziel bleibt)\s*(–\s*)?/,'');L.push({d:String(c.am||'').slice(0,10),t:m[2]+(/^Ziel bleibt/.test(m[3])?' · Ziel bleibt':''),s:(c.von?'abgeschlossen von '+c.von:'abgeschlossen')+(rest?' · '+rest:''),q:true});});
  L=L.filter(function(x){return x.d;}).sort(function(a,b){return b.d.localeCompare(a.d);}).slice(0,3);
  if(!L.length)return '<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch nichts erledigt.</div>';
  return L.map(function(x){return '<div style="display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 12px;border:1px solid #E4E0D6;border-radius:10px;background:#F7F5F0;margin-bottom:6px">'
    +(x.id?'<span role="checkbox" aria-checked="true" title="Wieder öffnen" onclick="atToggle(\''+x.id+'\')" style="width:22px;height:22px;border-radius:7px;border:1.5px solid #3a3833;background:#3a3833;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff"><i class="ti ti-check" style="font-size:13px"></i></span>'
      :'<span aria-hidden="true" style="width:22px;height:22px;border-radius:7px;border:1.5px solid #3a3833;background:#3a3833;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff"><i class="ti ti-check" style="font-size:13px"></i></span>')
    +'<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:500;color:var(--text2)">'+esc(x.t)+(x.q?' <span style="font-size:10.5px;font-weight:700;background:#FBE3DA;color:#A3361F;border-radius:5px;padding:1px 6px;margin-left:4px">ohne Erfassung</span>':'')+'</div><div style="font-size:12px;color:var(--text3)">'+esc(x.s||'')+'</div></div>'
    +'<span style="font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:10px;background:#fff;border:1px solid #E4E0D6;color:var(--text2);white-space:nowrap">erledigt '+dm(x.d)+'</span></div>';}).join('');}
function aufgEmpHtml(eid){var L=aufgAll().filter(function(o){return String(o.emp)===String(eid);}).sort(function(a,b){var x=aufgState(a).r-aufgState(b).r;return x||(a.due<b.due?-1:1);}),S=aufgStaff(),ed=kalCanEdit();
  if(!L.length)return {n:0,h:'<div class="kal-note">Keine offenen Aufgaben.</div>'};
  return {n:L.length,h:L.map(function(o){var s=aufgState(o),km=aufgKomm.find(function(k){return k.key===o.key;}),tag=o.kind==='task'?'Task':o.bundle?'Routine':'automatisch',k=jsq(o.key);
    return '<div class="at-tk'+(AU.hl===o.key?' hl':'')+'" data-akey="'+esc(o.key)+'"><div class="au-st '+s.c+'"><i class="ti '+(s.c==='od'?'ti-alarm':'ti-clock')+'"></i>'+s.l+'<span class="r">'+aufgFmt(o.due)+'</span></div>'
      +'<div class="at-b2"><div class="at-tt"><b>'+esc(o.kind==='task'?o.t:o.art)+'</b><span class="au-tag" style="margin-left:6px">'+tag+'</span><small>'+esc(o.kind==='task'?(o.s||'').replace(/^[^·]*·?\s*/,''):o.s||'')+'</small></div>'
      +'<div class="at-ar"><div class="at-selw"><span>Zuständig</span><select onchange="aufgAssign(\''+k+'\',this.value);atRender()"'+(ed?'':' disabled')+'>'+S.map(function(p){return '<option value="'+esc(p.key)+'"'+(p.key===o.assignee?' selected':'')+'>'+esc(kalFirst(p.name))+'</option>';}).join('')+(S.some(function(p){return p.key===o.assignee;})?'':'<option selected>'+esc(kalFirst(aufgName(o.assignee)))+'</option>')+'</select></div>'
      +'<span style="flex:1"></span>'+(ed&&o.quit?'<button class="btn" title="Aufgabe abschließen, ohne etwas zu erfassen" onclick="aufgQuit(\''+k+'\',\''+o.quit+'\')"><i class="ti ti-check"></i> '+o.quit+'</button>':'')+(ed?'<button class="btn btn-primary" onclick="aufgDone(\''+k+'\')">'+aufgActLabel(o)+'</button>':'')+'</div></div>'
      +'<div class="at-km">'+(km?'<span><b>'+new Date(km.am).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+'</b> '+esc(aufgKommText(km.text))+' <span class="kal-note">· '+esc(km.von||'')+'</span></span>':'')+(ed?'<input type="text" placeholder="Kommentar schreiben …" onkeydown="if(event.key===\'Enter\'&&this.value.trim()){aufgKommAt(\''+k+'\',this.value);this.value=\'\';}">':'')+'</div></div>';}).join('')};}
function aufgKommAt(key,txt){var row={key:key,text:txt.trim(),von:kalActor()};aufgKomm.unshift(Object.assign({am:new Date().toISOString()},row));
  sb.from('aufgaben_kommentare').insert(row).then(function(r){if(r&&r.error)alert(/aufgaben_kommentare/i.test(r.error.message||'')?'Die Tabelle „aufgaben_kommentare“ fehlt noch. Bitte 26_aufgaben.sql ausführen.':kalErrText(r));});atRender();}
function atNewToggle(force){var b=document.getElementById('atNewBody'),h=document.getElementById('atNewHint');if(!b)return;var open=force!=null?force:b.style.display==='none';b.style.display=open?'':'none';if(h)h.textContent=open?'zuklappen':'zum Aufklappen klicken';if(open){var t=document.getElementById('taskText');if(t)setTimeout(function(){t.focus();},30);}}
function atAssigneeSel(){var sel=document.getElementById('taskAssignee');if(!sel)return;var e=kalEmp(selectedEmp),d=aufgDefault(e),cur=sel.getAttribute('data-emp')===String(selectedEmp)?sel.value:d;sel.innerHTML=aufgStaff().map(function(p){return '<option value="'+esc(p.key)+'"'+(p.key===cur?' selected':'')+'>'+esc(p.name)+'</option>';}).join('');sel.setAttribute('data-emp',String(selectedEmp));}
function aufgAfterNewTask(id){var sel=document.getElementById('taskAssignee'),e=kalEmp(selectedEmp);if(!sel||!id)return;var v=sel.value;if(v&&v!==aufgDefault(e))aufgAssign('task:'+id,v);atNewToggle(false);}
function atBanner(){var el=document.getElementById('atBan');if(!el)return;var e=kalEmp(selectedEmp);if(!e){el.innerHTML='';return;}var L=aufgAll().filter(function(o){return String(o.emp)===String(e.id);}).sort(function(a,b){return a.due<b.due?-1:1;}),od=L.filter(function(o){return aufgState(o).c==='od';}),fut=L.filter(function(o){return aufgState(o).c!=='od';});
  var mx=od.length?Math.max.apply(null,od.map(function(o){return kalDiff(o.due,today());})):0,cut=kalAdd(today(),-30),done=(tasks[e.id]||[]).filter(function(t){return (t.done||t.status==='done')&&t.completedAt&&String(t.completedAt).slice(0,10)>=cut;}).length+(protocols[e.id]||[]).filter(function(p){return p.date>=cut&&p.date<=today()&&p.status!=='geplant';}).length;
  var w0=kalMon(today()),wk=0;for(var i=1;i<=4;i++){var a=kalAdd(w0,-7*i),b=kalAdd(a,6);if((protocols[e.id]||[]).some(function(p){return p.date>=a&&p.date<=b&&(p.type||'')==='Weekly'&&p.status!=='geplant';}))wk++;}
  var nx=fut[0],BK=[['OFFEN',L.length,'Aufgaben'],['ÜBERFÄLLIG',od.length,od.length?'seit max. '+mx+' T':'nichts überfällig'],['NÄCHSTE',nx?aufgFmt(nx.due):'–',nx?nx.art:'keine geplant'],['ERLEDIGT',done,'letzte 30 Tage'],['WEEKLYS',wk+'/4','letzte 4 Wochen']];
  el.innerHTML='<div style="border-radius:14px;padding:16px 18px;margin-bottom:14px;min-height:148px;box-sizing:border-box;color:#fff;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%)"><div style="font-size:11px;font-weight:600;letter-spacing:.09em;margin-bottom:10px">'+esc(e.name.toUpperCase())+' · AUFGABEN</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr))">'
    +BK.map(function(x,i){return '<div style="padding:0 12px;'+(i?'border-left:1px solid rgba(255,255,255,.25);':'padding-left:0;')+'min-width:0"><div style="font-size:10.5px;font-weight:600;letter-spacing:.08em">'+x[0]+'</div><div style="font-size:'+(i===2?'24':'32')+'px;font-weight:300;line-height:1.15;white-space:nowrap">'+x[1]+'</div><div style="font-size:12.5px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x[2])+'</div></div>';}).join('')+'</div></div>';}
function aufgPuBadge(){try{var n=aufgAll().filter(function(o){return String(o.emp)===String(selectedEmp);}).length;document.querySelectorAll('.pu-top .rl-btn[aria-label="Task"]').forEach(function(b){b.classList.toggle('au-badge',n>0);b.setAttribute('data-n',n>9?'9+':String(n));});}catch(e){}}
