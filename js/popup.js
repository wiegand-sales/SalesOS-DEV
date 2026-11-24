// Sales OS – Gemeinsames Mitarbeiter-Popup (Mitarbeiterkarte), Session/QA im Popup
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

function puIsJs(id){return id==='cevModal'||id==='commentModal';}
function puKey(id){var p=PU.find(function(x){return x.ids.indexOf(id)>=0;});return p?p.k:null;}
function puHide(id){var e=document.getElementById(id);if(!e)return;if(puIsJs(id))e.style.display='none';else e.classList.add('hidden');}
function puShow(id){var e=document.getElementById(id);if(!e)return;if(puIsJs(id))e.style.display='flex';else e.classList.remove('hidden');}
function puAllIds(){return PU.reduce(function(a,p){return a.concat(p.ids);},[]);}
function puResetAll(){
  puAllIds().forEach(function(id){var e=document.getElementById(id);if(!e)return;if(puIsJs(id))e.remove();else e.classList.add('hidden');});
  _puState={};
}
function puGo(key,variantId){
  var p=PU.find(function(x){return x.k===key;});if(!p)return;
  var target=variantId||(key==='se'?_puSeVariant:p.ids[0]);
  var emp=_puEmp||selectedEmp;
  puAllIds().forEach(function(id){if(id!==target)puHide(id);});
  var el=document.getElementById(target);
  if(el&&_puState[target]===String(emp)){puShow(target);puDecorate(target);return;}
  if(el&&puIsJs(target))el.remove();
  var fn=window[PU_OPEN[target]];if(typeof fn!=='function')return;
  _puSwitching=true;
  try{fn(emp);}finally{_puSwitching=false;}
}
function puShellify(ov,id){
  if(ov.dataset.puShell)return;
  var box=ov.firstElementChild;if(!box)return;
  var kids=[].slice.call(box.children);if(kids.length<3)return;
  var hdr=kids[0],foot=kids[kids.length-1],mid=kids.slice(1,-1);
  var title=(hdr.firstElementChild&&hdr.firstElementChild.textContent)||'';
  var emp=employees.find(function(e){return String(e.id)===String(_puEmp);});
  box.style.cssText='background:#EEEDE9;border:1px solid #E4E0D6;border-radius:16px;width:860px;max-width:95vw;max-height:86vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.18)';
  box.innerHTML='';
  var h=document.createElement('div');h.style.cssText='display:flex;align-items:center;padding:14px 16px 6px';
  h.innerHTML='<div style="min-width:0"><div style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">'+esc(title)+'</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(emp?esc(emp.name)+(emp.role?' · '+esc(emp.role):''):'')+'</div></div>';
  var x=document.createElement('button');x.className='btn';x.type='button';x.setAttribute('aria-label','Schließen');
  x.style.cssText='margin-left:auto;width:34px;height:34px;padding:0;justify-content:center';x.innerHTML='<i class="ti ti-x"></i>';
  x.onclick=function(){ov.remove();};h.appendChild(x);box.appendChild(h);
  var main=document.createElement('div');main.style.cssText='display:flex;min-height:0;flex:1';
  var rail=document.createElement('div');
  rail.style.cssText='width:56px;flex-shrink:0;align-self:stretch;margin:6px 0 14px 14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;box-shadow:0 10px 24px rgba(40,32,15,.10);position:relative;z-index:3';
  var right=document.createElement('div');right.style.cssText='flex:1;min-width:0;display:flex;flex-direction:column;min-height:0';
  var sc=document.createElement('div');sc.style.cssText='flex:1;overflow-y:auto;padding:6px 18px 12px 14px';
  var card=null,n=0,icons=PU_SUBICONS[id]||[];
  mid.forEach(function(el){
    var t=(el.textContent||'').trim();
    if(/^[①②③④⑤⑥]/.test(t)&&el.children.length===0){
      n++;card=document.createElement('div');card.id=id+'Sec'+n;
      card.style.cssText='background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)';
      var ttl=t.replace(/^[①②③④⑤⑥]\s*/,'');
      card.innerHTML='<div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:10px">'+esc(ttl)+'</div>';
      sc.appendChild(card);
      var ic=icons[n-1]||['ti-point',ttl];
      var b=document.createElement('button');b.className='rl-btn'+(n===1?' on':'');b.type='button';b.setAttribute('aria-label',ttl);
      b.style.cssText='width:38px;height:38px;font-size:18px';b.innerHTML='<i class="ti '+ic[0]+'"></i><span class="rl-tip" style="left:48px">'+esc(ttl)+'</span>';
      b.dataset.target=card.id;
      (function(c){b.onclick=function(){c.scrollIntoView({behavior:'smooth',block:'start'});};})(card);
      rail.appendChild(b);
      return;
    }
    el.style.borderLeft='none';el.style.paddingLeft='0';el.style.marginBottom='0';
    (card||sc).appendChild(el);
  });
  if(card)card.style.marginBottom='4px';
  // Kategorie-Überschriften (Skill/Will/Result) ruhig im Board-Schema
  [].slice.call(sc.querySelectorAll('div')).forEach(function(d){if(d.style.padding==='6px 12px'&&d.style.letterSpacing){d.style.background='#EFECE5';d.style.color='var(--text2)';}});
  var fw=document.createElement('div');fw.style.cssText='display:flex;justify-content:flex-end;gap:8px;padding:4px 18px 14px';
  foot.style.marginTop='0';foot.style.justifyContent='flex-end';
  if(foot.firstElementChild&&foot.firstElementChild.onclick&&/speichern/i.test(foot.firstElementChild.textContent||''))foot.style.flexDirection='row-reverse';
  fw.appendChild(foot);
  right.appendChild(sc);right.appendChild(fw);main.appendChild(rail);main.appendChild(right);box.appendChild(main);
  ov.dataset.puShell='1';
}
function puSpy(rail){
  var subs=[].slice.call(rail.querySelectorAll('.rl-btn.rl-sub'));if(!subs.length)return;
  var items=subs.map(function(b){
    var tid=b.dataset.target;
    if(!tid){var mm=(b.getAttribute('onclick')||'').match(/getElementById\('([^']+)'\)/);if(mm)tid=mm[1];}
    return {b:b,id:tid};
  }).filter(function(x){return x.id;});
  function mark(btn){subs.forEach(function(b){b.classList.toggle('on',b===btn);});}
  items.forEach(function(it){if(!it.b.dataset.puSpy){it.b.dataset.puSpy='1';it.b.addEventListener('click',function(){mark(it.b);});}});
  var first=items.length?document.getElementById(items[0].id):null;if(!first)return;
  var sc=first.parentElement;while(sc&&sc!==document.body){var oy=getComputedStyle(sc).overflowY;if(oy==='auto'||oy==='scroll')break;sc=sc.parentElement;}
  if(!sc||sc===document.body||sc.dataset.puSpy)return;
  sc.dataset.puSpy='1';
  sc.addEventListener('scroll',function(){
    var top=sc.getBoundingClientRect().top+24,cur=items[0];
    items.forEach(function(it){var el=document.getElementById(it.id);if(el&&el.getBoundingClientRect().top<=top)cur=it;});
    if(sc.scrollTop+sc.clientHeight>=sc.scrollHeight-4)cur=items[items.length-1];
    mark(cur.b);
  },{passive:true});
}
function puDecorate(id){
  var m=document.getElementById(id);if(!m)return;
  var key=puKey(id);
  if(puIsJs(id))puShellify(m,id);
  var rail=m.querySelector('.pu-rail');
  if(!rail){var first=m.querySelector('.rl-btn');if(!first)return;rail=first.parentElement;rail.classList.add('pu-rail');}
  rail.style.margin='6px 0 14px 14px';rail.style.alignSelf='stretch';
  var top=rail.querySelector('.pu-top');
  if(!top){
    var kids=[].slice.call(rail.children);
    var si=kids.findIndex(function(c){return c.tagName==='SPAN'&&c.style.height==='1px';});
    if(si>=0)kids.slice(si).forEach(function(c){c.remove();});
    [].slice.call(rail.querySelectorAll('.rl-btn')).forEach(function(b){
      b.classList.add('rl-sub');b.style.width='38px';b.style.height='38px';
      [].slice.call(b.children).forEach(function(ch){if(ch.tagName==='SPAN'&&!ch.classList.contains('rl-tip'))ch.remove();});
    });
    top=document.createElement('div');top.className='pu-top';top.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px';
    rail.insertBefore(top,rail.firstChild);
    var sep=document.createElement('span');sep.style.cssText='width:26px;height:1px;background:#E4E0D6;margin:4px 0;flex-shrink:0';
    rail.insertBefore(sep,top.nextSibling);
  }
  puSpy(rail);
  // Fußleiste in allen Bereichen wie in der Übersicht: eigene Leiste mit Rahmen
  var right=rail.nextElementSibling;
  var foot=right&&right.lastElementChild;
  if(foot&&foot!==right.firstElementChild&&!foot.dataset.puFoot&&!foot.querySelector('#ciComposer')){
    foot.dataset.puFoot='1';
    var bar=document.createElement('div');bar.className='pu-footbar';
    while(foot.firstChild)bar.appendChild(foot.firstChild);
    foot.style.cssText='padding:4px 18px 14px;background:#EEEDE9';
    foot.appendChild(bar);
  }
  // Reihenfolge wie im Hauptmenü: Zahlen | Arbeiten | Verwaltung (Striche dazwischen)
  var PU_ORDER=['ov','pf','pv','|','ta','ab','se','ca','en','|','es'],seen={},lst=[],_pe=employees.find(function(e){return String(e.id)===String(_puEmp||selectedEmp);});PU_ORDER.forEach(function(k){if(k==='|'){lst.push('|');return;}var p=PU.find(function(x){return x.k===k;});if(p&&k==='pv'&&!(typeof ppProvAllowed==='function'&&ppProvAllowed(_pe))){seen[k]=1;return;}if(p){lst.push(p);seen[k]=1;}});PU.forEach(function(p){if(!seen[p.k])lst.splice(lst.lastIndexOf('|'),0,p);});
  top.innerHTML=lst.map(function(p){if(p==='|')return '<span style="width:26px;height:1px;background:#E4E0D6;margin:4px 0;flex-shrink:0"></span>';return '<button class="rl-btn'+(p.k===key?' on':'')+'" type="button" aria-label="'+p.n+'" style="width:38px;height:38px;font-size:18px;flex-shrink:0" onclick="puGo(\''+p.k+'\')"><i class="ti '+p.i+'"'+(p.k==='pf'?' style="color:#F08566"':'')+'></i><span class="rl-tip" style="left:48px">'+p.n+'</span></button>';}).join('');
  // Session: Schalter „Erfassen | Planen“ im Kopf
  if(key==='se'){
    var modal=m.querySelector('.modal')||m.firstElementChild;var hd=modal&&modal.firstElementChild;
    if(hd&&!hd.querySelector('.pu-seg')){
      var seg=document.createElement('div');seg.className='pu-seg';
      seg.innerHTML='<span data-v="neuesCoachingModal">Erfassen</span><span data-v="sessionPlanenModal">Planen</span>';
      [].slice.call(seg.children).forEach(function(sp){sp.onclick=function(){if(sp.dataset.v!==id)puGo('se',sp.dataset.v);};});
      var xb=hd.querySelector('button[aria-label="Schließen"]');
      if(xb){xb.style.marginLeft='0';hd.insertBefore(seg,xb);}else hd.appendChild(seg);
    }
    if(hd)[].slice.call(hd.querySelectorAll('.pu-seg span')).forEach(function(sp){sp.classList.toggle('on',sp.dataset.v===id);});
  }
}
function _ppPad(n){return (n<10?'0':'')+n;}
function _ppIso(d){return d.getFullYear()+'-'+_ppPad(d.getMonth()+1)+'-'+_ppPad(d.getDate());}
function _ppRanges(period){
  var t0=today(),d=new Date(t0+'T00:00:00'),out=[];
  if(period==='day'){
    var c=new Date(d);
    while(out.length<8){var dw=c.getDay();if(dw!==0&&dw!==6){var s=_ppIso(c);out.unshift({from:s,to:s,label:['So','Mo','Di','Mi','Do','Fr','Sa'][dw]});}c.setDate(c.getDate()-1);}
  } else if(period==='week'){
    var mon=new Date(d);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
    for(var i=7;i>=0;i--){var a=new Date(mon);a.setDate(a.getDate()-i*7);var b=new Date(a);b.setDate(b.getDate()+6);out.push({from:_ppIso(a),to:_ppIso(b),label:String(isoWeekOf(a).week)});}
  } else {
    var MN=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    for(var j=7;j>=0;j--){var m=new Date(d.getFullYear(),d.getMonth()-j,1);var e=new Date(m.getFullYear(),m.getMonth()+1,0);out.push({from:_ppIso(m),to:_ppIso(e),label:MN[m.getMonth()]});}
  }
  return out;
}
function _ppOpt(s){return (s.oem||0)+(s.ups||0)+(s.wka||0);}
function _ppOptH(emp,from,to){
  var dates=(performance[emp.id]||[]).filter(function(x){return x.date>=from&&x.date<=to;}).map(function(x){return x.date;});
  var h=dates.length?perfHoursForDates(emp,dates):0;var s=chartSumsForRange([emp],from,to);
  return h>0?_ppOpt(s)/h:null;
}
function _ppVal(emp,key,from,to){
  var s=chartSumsForRange([emp],from,to);
  if(key==='marge')return s.margeGes||0;
  if(key==='opt')return _ppOpt(s);
  if(key==='optH')return _ppOptH(emp,from,to);
  return chartCrFromSums(key,s);
}
function _ppTarget(emp,key){var T=empTargets(emp)||{};var t=T[key];if(!t||t.val==null||t.val==='')return null;return {val:+t.val,dir:t.dir||'gte'};}
function _ppMiss(v,t){if(v==null||!t)return false;return t.dir==='lte'?v>t.val:v<t.val;}
function _ppFmt(v,kind){if(v==null||isNaN(v))return '–';if(kind==='pct')return Math.round(v)+' %';if(kind==='eur')return '€ '+Math.round(v).toLocaleString('de-DE');if(kind==='dec')return (Math.round(v*10)/10).toFixed(1).replace('.',',');return String(Math.round(v));}
function _ppPeriods(){
  var t0=today(),d=new Date(t0+'T00:00:00');
  var mon=new Date(d);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));var sun=new Date(mon);sun.setDate(sun.getDate()+6);
  var MN=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  return {day:{from:t0,to:t0,label:'Heute'},week:{from:_ppIso(mon),to:_ppIso(sun),label:'Woche (KW '+String(isoWeekOf(d).week)+')'},month:{from:t0.slice(0,8)+'01',to:t0,label:MN[d.getMonth()]}};
}
function _ppMargeTargets(emp){
  var mk=today().slice(0,7),r=(typeof zielStore!=='undefined'&&zielStore[mk]&&zielStore[mk][emp.id])||{};
  var perDay=(r.optTag||0)*(r.margeOpt||0);
  var month=(typeof teamMonthZiel==='function')?teamMonthZiel([emp],mk,true):0;
  return {day:perDay||null,week:perDay?perDay*5:null,month:month||null};
}
function ppRenderChart(){
  var emp=employees.find(function(e){return String(e.id)===String(_ppEmp);});var el=document.getElementById('ppSecV');if(!emp||!el)return;
  var MET=[['marge','Marge','eur'],['opt','Opt. Ges.','n'],['crOEM','CR OEM','pct'],['crTeilweise','CR TW','pct'],['crSyMy','CR SY/MY','pct'],['crMegaYes','CR MY','pct']];
  var mt=MET.find(function(m){return m[0]===_ppMetric;})||MET[1];
  var rs=_ppRanges(_ppPeriod),vals=rs.map(function(r){return _ppVal(emp,mt[0],r.from,r.to);});
  var mx=Math.max.apply(null,vals.map(function(v){return v||0;}).concat([1]));
  function seg(opts,cur,fn){return '<span style="display:inline-flex;gap:2px;background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;padding:2px">'+opts.map(function(o){var on=o[0]===cur;return '<span onclick="'+fn+'(\''+o[0]+'\')" style="height:30px;padding:0 11px;border-radius:8px;display:flex;align-items:center;font-size:12.5px;cursor:pointer;white-space:nowrap;'+(on?'background:#fff;color:var(--text);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)':'color:var(--text2);font-weight:500')+'">'+o[1]+'</span>';}).join('')+'</span>';}
  var h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'+seg(MET,_ppMetric,'ppSetMetric')+'<span style="margin-left:auto">'+seg([['day','Tag'],['week','Woche'],['month','Monat']],_ppPeriod,'ppSetPeriod')+'</span></div>';
  h+='<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;align-items:end;height:150px;border-bottom:1px solid #E4E0D6;padding-bottom:4px">';
  vals.forEach(function(v,i){var cur=i===7;h+='<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px"><span style="font-size:11.5px;font-weight:600;white-space:nowrap;color:'+(cur?'#B5513A':'var(--text2)')+'">'+(v!=null?_ppFmt(v,mt[2]):'–')+'</span><span style="width:100%;max-width:36px;border-radius:5px 5px 0 0;background:'+(cur?'#F08566':'#B4AC9C')+';height:'+Math.max(v?4:2,(v||0)/mx*112)+'px"></span></div>';});
  h+='</div><div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;margin-top:6px;text-align:center">'+rs.map(function(r,i){return '<div style="font-size:11.5px;color:'+(i===7?'var(--text)':'var(--text3)')+';font-weight:'+(i===7?700:500)+'">'+r.label+'</div>';}).join('')+'</div>';
  el.innerHTML=h;
}
function ppSetMetric(k){_ppMetric=k;ppRenderChart();}
function ppSetPeriod(k){_ppPeriod=k;ppRenderChart();}
// Provision im Mitarbeiter-Popup (gleiche Tabelle wie die Übersicht, nur diese Person)
function ppProvAllowed(emp){return !!emp&&(currentUserRole==='admin'||canSeeArea('provision'))&&canSeeSalary(emp)&&provFlag(emp)&&(currentUserRole==='admin'||isAgentEmp(emp)||canSeeArea('provCoaches'));}
function ppRenderProv(){var el=document.getElementById('ppSecP');if(!el||!_ppEmp)return;el.innerHTML=buildProvisionTable(_ppEmp);}
function openPerfPopup(empId){
  var emp=employees.find(function(e){return String(e.id)===String(empId);});if(!emp)return;
  _ppEmp=emp.id;
  var sub=document.getElementById('ppHdSub');if(sub)sub.textContent=emp.name+(emp.role?' · '+emp.role:'');
  var P=_ppPeriods(),CARD='background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)';
  var sM=chartSumsForRange([emp],P.month.from,P.month.to),sW=chartSumsForRange([emp],P.week.from,P.week.to),sD=chartSumsForRange([emp],P.day.from,P.day.to);
  // 1) Banner
  var BK=[['OPT./STD.','optH','dec','optPerH'],['CR OEM','crOEM','pct','crOEM'],['CR TW','crTeilweise','pct','crTeilweise'],['CR SY/MY','crSyMy','pct','crSyMy'],['CR MY','crMegaYes','pct','crMegaYes']];
  var ban='<div id="ppSecB" style="border-radius:14px;padding:16px 18px;margin-bottom:14px;color:#fff;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%)"><div style="font-size:11px;font-weight:600;letter-spacing:.09em;margin-bottom:10px">'+P.month.label.toUpperCase()+' · WICHTIGSTE KPIS</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr))">';
  BK.forEach(function(k,i){
    var vm=_ppVal(emp,k[1],P.month.from,P.month.to),vw=_ppVal(emp,k[1],P.week.from,P.week.to),t=_ppTarget(emp,k[3]),miss=_ppMiss(vm,t);
    var extra='Woche '+_ppFmt(vw,k[2]);
    if(k[1]==='crMegaYes'&&t){var den=(sM.yes||0)+(sM.sy||0)+(sM.my||0),r=t.val/100,need=r<1?Math.ceil((r*den-(sM.my||0))/(1-r)):0;extra=need>0?'noch '+need+' MY':'Ziel erreicht';}
    ban+='<div style="padding:0 14px;'+(i?'border-left:1px solid rgba(255,255,255,.25);':'padding-left:0;')+'"><div style="font-size:11px;font-weight:600;letter-spacing:.09em">'+k[0]+(miss?' <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;vertical-align:1px;margin-left:3px" title="Ziel verfehlt"></span>':'')+'</div>'
      +'<div style="font-size:32px;font-weight:300;line-height:1.1">'+_ppFmt(vm,k[2])+'</div>'
      +'<div style="font-size:12.5px;color:rgba(255,255,255,.9)">'+(t?'Ziel '+(t.dir==='lte'?'≤ ':'≥ ')+_ppFmt(t.val,k[2]):'—')+'</div><div style="font-size:12.5px;color:rgba(255,255,255,.9)">'+extra+'</div></div>';
  });
  ban+='</div></div>';
  // 2) Verlauf (wird separat gezeichnet)
  var verl='<div id="ppSecV" style="'+CARD+'"></div>';
  // 3) Marge
  var MT=_ppMargeTargets(emp);
  var mg='<div id="ppSecM" style="'+CARD+'"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">';
  [['day',sD,MT.day],['week',sW,MT.week],['month',sM,MT.month]].forEach(function(x){
    var per=x[0],s=x[1],ziel=x[2],val=s.margeGes||0,opt=_ppOpt(s),avg=opt?val/opt:null,pc=ziel?Math.round(val/ziel*100):null,ok=pc!=null&&pc>=100;
    var rs=_ppRanges(per),vs=rs.map(function(r){return chartSumsForRange([emp],r.from,r.to).margeGes||0;}),mx=Math.max.apply(null,vs.concat([1]));
    mg+='<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:10px 12px 12px;min-width:0">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)"><span>'+P[per].label+'</span><span style="letter-spacing:0;text-transform:none;font-weight:600;color:var(--text3)">'+opt+' Opt.</span></div>'
      +'<div style="border-bottom:1px solid #E4E0D6;margin:6px 0 10px;padding-bottom:10px"><div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;align-items:end;height:36px">'
      +vs.map(function(v,i){return '<i title="'+rs[i].label+': '+_ppFmt(v,'eur')+'" style="display:block;border-radius:3px 3px 0 0;height:'+Math.max(3,v/mx*36)+'px;background:'+(i===7?'#F08566':'#CFC8BA')+'"></i>';}).join('')+'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;margin-top:3px">'+rs.map(function(r,i){return '<span style="font-size:9.5px;text-align:center;white-space:nowrap;overflow:hidden;color:'+(i===7?'var(--text)':'var(--text3)')+';font-weight:'+(i===7?700:500)+'">'+r.label+'</span>';}).join('')+'</div></div>'
      +'<div style="font-size:28px;font-weight:300;line-height:1.15;white-space:nowrap">'+_ppFmt(val,'eur')+'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:var(--text3);white-space:nowrap">'
      +(pc!=null?'<span style="font-size:13px;font-weight:700;color:'+(ok?'#2f6b52':'#B5513A')+'">'+pc+' %</span><span>von '+_ppFmt(ziel,'eur')+'</span>':'<span>kein Ziel hinterlegt</span>')
      +'<span style="margin-left:auto" title="Margenerhöhung pro Auftrag">'+(avg!=null?'Ø '+Math.round(avg).toLocaleString('de-DE')+' €':'')+'</span></div>'
      +'<div style="height:4px;border-radius:2px;background:#E4E0D6;margin-top:10px;overflow:hidden"><i style="display:block;height:100%;width:'+(pc!=null?Math.min(100,pc):0)+'%;background:'+(ok?'#3a3833':'#F08566')+'"></i></div></div>';
  });
  mg+='</div></div>';
  // 4) KPI-Tabelle
  var KR=[['Opt./Std.','optH','dec','optPerH'],['CR OEM','crOEM','pct','crOEM'],['CR TW','crTeilweise','pct','crTeilweise'],['CR Yes','crYes','pct','crYes'],['CR SY/MY','crSyMy','pct','crSyMy'],['Mega Yes (CR MY)','crMegaYes','pct','crMegaYes'],['CR SY','crSuperYes','pct','crSuperYes']];
  var TH='font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);padding:7px 8px;text-align:right;border-bottom:1px solid #E4E0D6;background:#EFECE5';
  var tb='<div id="ppSecK" style="'+CARD+';margin-bottom:4px"><div style="display:flex;align-items:center;font-weight:700;font-size:14px;margin-bottom:10px">KPIs<span style="margin-left:auto;font-size:12px;font-weight:500;color:var(--text3)">Heute · Woche · Monat · Ziel</span></div><table style="width:100%;border-collapse:collapse"><tr><th style="'+TH+';text-align:left">Kennzahl</th><th style="'+TH+'">Heute</th><th style="'+TH+'">Woche</th><th style="'+TH+'">Monat</th><th style="'+TH+'">Ziel</th></tr>';
  KR.forEach(function(k){
    var hl=k[1]==='crMegaYes',t=_ppTarget(emp,k[3]);
    var vd=_ppVal(emp,k[1],P.day.from,P.day.to),vw=_ppVal(emp,k[1],P.week.from,P.week.to),vm=_ppVal(emp,k[1],P.month.from,P.month.to);
    var TD='padding:0 8px;height:38px;border-bottom:1px solid #eae7e0;font-size:13.5px;text-align:right;'+(hl?'background:#FDF0EB;':'');
    tb+='<tr><td style="'+TD+'text-align:left;'+(hl?'font-weight:700':'')+'">'+k[0]+'</td><td style="'+TD+'">'+_ppFmt(vd,k[2])+'</td><td style="'+TD+'">'+_ppFmt(vw,k[2])+'</td><td style="'+TD+'font-weight:600;'+(_ppMiss(vm,t)?'color:#B5513A':'')+'">'+_ppFmt(vm,k[2])+'</td><td style="'+TD+'font-size:12px;color:var(--text3)">'+(t?(t.dir==='lte'?'≤ ':'≥ ')+_ppFmt(t.val,k[2]):'—')+'</td></tr>';
  });
  tb+='</table></div>';
  var body=document.getElementById('ppBody');
  var pvOk=false;var rp=document.getElementById('ppRailP');if(rp)rp.style.display='none';
  body.innerHTML=ban+verl+mg+tb+(pvOk?'<div id="ppSecP" style="margin-top:14px"></div>':'');
  if(pvOk)ppRenderProv();
  ppRenderChart();
  body.scrollTop=0;
  openModal('perfPopModal');
}
function openEmpSetModal(empId){
  var emp=employees.find(function(e){return String(e.id)===String(empId||selectedEmp);});if(!emp)return;
  _esEmp=emp.id;selectedEmp=emp.id;
  var body=document.getElementById('espBody');
  // Felder-IDs eindeutig halten: offene Stammdaten im Hauptbereich vorübergehend ausblenden
  var ex=document.getElementById('es-name');
  if(ex&&!body.contains(ex)){var ma=document.getElementById('mainArea');if(ma){ma.innerHTML='';_esHidMain=true;}}
  body.innerHTML=esBuildHtml(emp,'panels','');provLockForm(body);
  var sub=document.getElementById('esHdSub');if(sub)sub.textContent=emp.name+(emp.role?' · '+emp.role:'');
  espRenderHist();
  openModal('empSetModal');
  var sc=document.getElementById('espScroll');if(sc)sc.scrollTop=0;
}
function closeEmpSetModal(){
  closeModal('empSetModal');
  var b=document.getElementById('espBody');if(b)b.innerHTML='';
  if(_esHidMain){_esHidMain=false;renderMain();}
}
function espRenderHist(){
  var el=document.getElementById('espHist');if(!el)return;
  var evs=(typeof histEvents==='function')?histEvents(_esEmp):[];
  var n=document.getElementById('espHistN');if(n)n.textContent='('+evs.length+')';
  var last=document.getElementById('espLast');
  if(last){if(evs.length){var d0=new Date(evs[0].t);last.textContent='zuletzt geändert '+('0'+d0.getDate()).slice(-2)+'.'+('0'+(d0.getMonth()+1)).slice(-2)+'.'+d0.getFullYear()+' von '+evs[0].who;}else last.textContent='';}
  el.innerHTML=evs.length?evs.slice(0,5).map(function(ev){
    var d=new Date(ev.t);var ds=('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.';
    var it=ev.items[0]||{label:'Änderung'};
    var title=it.label+(ev.items.length>1?' +'+(ev.items.length-1):'');
    var txt=ev.items.map(function(x){return x.legacy?x.label+' geändert':(ev.items.length>1?x.label+': ':'')+x.ov+' → '+x.nv;}).join(' · ');
    return '<div title="'+esc(txt)+'" style="display:flex;align-items:flex-start;gap:12px;height:66px;padding:12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5;margin-bottom:6px;overflow:hidden">'
      +'<div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+ds+'</span><span style="font-size:13.5px;font-weight:600;line-height:19px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(title)+'</span></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px">'+esc(ev.who)+'</div>'
      +'<div style="font-size:13.5px;line-height:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)">'+esc(txt)+'</div></div></div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch keine Änderungen.</div>';
}
function saveEmpSetModal(){
  var emp=employees.find(function(e){return String(e.id)===String(_esEmp);});if(!emp)return;
  selectedEmp=emp.id;
  var _b=document.getElementById('espBody'),_x=document.getElementById('es-name');
  if(_x&&_b&&!_b.contains(_x)){var _ma=document.getElementById('mainArea');if(_ma){_ma.innerHTML='';_esHidMain=true;}}
  // Beide Speicherfunktionen lesen die Felder aus dem Popup; der Hauptbereich wird währenddessen nicht neu gezeichnet
  var _red=window.renderEmpDetail;window.renderEmpDetail=function(){};
  try{saveProvisionSettings(emp.id);saveEmpEinstellungen();}finally{window.renderEmpDetail=_red;}
  var t=document.getElementById('espToast');if(t){t.textContent='Änderungen gespeichert';t.style.display='block';clearTimeout(window._espTT);window._espTT=setTimeout(function(){t.style.display='none';},3000);}
  var sub=document.getElementById('esHdSub');if(sub)sub.textContent=emp.name+(emp.role?' · '+emp.role:'');
  if(!_esHidMain&&view==='emp')renderEmpDetail();
  setTimeout(function(){if(typeof loadEmployeeHistoryFromSupabase==='function')loadEmployeeHistoryFromSupabase().then(function(){espRenderHist();});},1200);
}
function openAddTaskModal(empId){
  if(empId)selectedEmp=empId;
  var e=employees.find(function(x){return String(x.id)===String(selectedEmp);});
  var sub=document.getElementById('atHdSub');if(sub)sub.textContent=e?(e.name+(e.role?' · '+e.role:'')):'—';
  atRender();
  var tt=document.getElementById('atToast');if(tt)tt.style.display='none';
  openModal('addTaskModal');
  var sc=document.getElementById('atSec1');if(sc&&sc.parentElement)sc.parentElement.scrollTop=0;
}
function puInit(){
  Object.keys(PU_OPEN).forEach(function(id){
    var name=PU_OPEN[id],orig=window[name];
    if(typeof orig!=='function'||orig._pu)return;
    var w=function(){
      var emp=arguments[0]!==undefined&&arguments[0]!==null?arguments[0]:selectedEmp;
      if(!_puSwitching)puResetAll();
      _puEmp=emp;
      var r=orig.apply(this,arguments);
      _puState[id]=String(emp);
      if(id==='neuesCoachingModal'||id==='sessionPlanenModal')_puSeVariant=id;
      try{puDecorate(id);}catch(err){console.warn('Popup-Leiste:',err);}
      return r;
    };
    w._pu=true;window[name]=w;
  });
}


function openPlannedSession(empId, sessionId, typ, fokus, datum, uhrzeit){
  var proto0=null;
  if(sessionId&&protocols[empId]){
    proto0=protocols[empId].find(function(p){return String(p.id)===String(sessionId);});
  }
  if(proto0&&proto0.groupId){openGroupSessionModal(proto0.groupId);return;}
  selectedEmp=empId;
  activeTab='session';
  // Find the protocol entry for notiz
  var proto=proto0;
  renderEmpDetail();
  setTimeout(function(){
    openNeuesCoachingModal(empId);
    _editingSessionId=sessionId||null;
    if(_editingSessionId&&typeof puColSet==='function')puColSet('ncSecNew',true);
    var dateEl=document.getElementById('sess-date');
    var timeEl=document.getElementById('sess-time');
    var endTimeEl=document.getElementById('sess-end-time');
    var typeEl=document.getElementById('sess-type');
    var topicEl=document.getElementById('sess-topic-sel');
    var noteEl=document.getElementById('sess-note');
    if(dateEl&&datum) dateEl.value=datum;
    if(timeEl&&uhrzeit) timeEl.value=uhrzeit;
    if(endTimeEl&&proto&&proto.endUhrzeit) endTimeEl.value=proto.endUhrzeit;
    if(typ)setCoachingTypeSelection('sess-category','sess-type',typ);
    if(topicEl&&fokus){
      for(var j=0;j<topicEl.options.length;j++){
        if(topicEl.options[j].value===fokus||topicEl.options[j].text===fokus){topicEl.selectedIndex=j;break;}
      }
    }
    if(noteEl&&proto&&proto.note) noteEl.value=proto.note;
  if(typeof sfFromSelects==='function')sfFromSelects(fokus);
  },100);
}
// ── Gruppensession: gemeinsame Abarbeitung fuer alle Teilnehmer auf einmal ──
function findGroupSessionMembers(groupId){
  var members=[];
  employees.forEach(function(e){
    (protocols[e.id]||[]).forEach(function(p){
      if(p.groupId===groupId)members.push({emp:e,proto:p});
    });
  });
  return members;
}
function openGroupSessionModal(groupId){
  var members=findGroupSessionMembers(groupId);
  if(!members.length){alert('Gruppensession nicht gefunden.');return;}
  var first=members[0].proto;
  var wrap=document.getElementById('groupSessionModalBody');
  if(!wrap)return;
  var namesHtml=members.map(function(m){
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg2);border-radius:8px;margin-bottom:6px">'
      +'<div class="av" style="width:26px;height:26px;font-size:10px">'+ini(m.emp.name)+'</div>'
      +'<div style="font-size:13px;font-weight:600">'+esc(m.emp.name)+'</div>'
      +'<div style="font-size:11px;color:var(--text3)">'+m.emp.role+'</div>'
      +'</div>';
  }).join('');
  wrap.innerHTML=
    '<div style="margin-bottom:12px"><label>Teilnehmer ('+members.length+')</label>'+namesHtml+'</div>'
    +'<div style="margin-bottom:10px;font-size:12px;color:var(--text3)">'+(first.type||'')+' · '+fd(first.date)+(first.uhrzeit?' · '+first.uhrzeit:'')+(first.focus?' · '+first.focus:'')+'</div>'
    +'<div style="margin-bottom:10px"><label>Bewertung</label><select id="groupSessRating"><option value="">— Keine Bewertung —</option><option value="1">1 – Schwach</option><option value="2">2 – Ausbaufähig</option><option value="3">3 – Solide</option><option value="4">4 – Gut</option><option value="5">5 – Sehr gut</option></select></div>'
    +'<div><label>Gemeinsames Protokoll / Notiz</label><textarea id="groupSessNote" rows="4" placeholder="Was wurde besprochen, was hat die Gruppe erarbeitet?">'+esc(first.note||'')+'</textarea></div>';
  document.getElementById('groupSessionModal').dataset.groupId=groupId;
  openModal('groupSessionModal');
}
function saveGroupSession(){
  if(_savingGroupSession)return;
  var groupId=document.getElementById('groupSessionModal').dataset.groupId;
  var members=findGroupSessionMembers(groupId);
  if(!members.length)return;
  var ratingEl=document.getElementById('groupSessRating');
  var rating=ratingEl&&ratingEl.value?parseInt(ratingEl.value):null;
  var note=document.getElementById('groupSessNote').value.trim();
  _savingGroupSession=true;
  sb.from('protocols').update({status:'abgeschlossen',rating:rating,note:note}).eq('group_id',groupId).then(function(res){
    _savingGroupSession=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    members.forEach(function(m){
      m.proto.status='abgeschlossen';m.proto.rating=rating;m.proto.note=note;m.proto.notes=note;
    });
    var namesTxt=members.map(function(m){return m.emp.name;}).join(', ');
    logActivity('session','updated','Gruppensession durchgeführt ('+members.length+' Mitarbeiter)',null,namesTxt);
    closeModal('groupSessionModal');
    renderSidebar();
    renderMain();
  }).catch(function(err){_savingGroupSession=false;alert('Unerwarteter Fehler: '+err.message);});
}
function spEmp(){var ids=sessionSelectedEmpIds||[];return ids.length===1?employees.find(function(e){return String(e.id)===String(ids[0]);}):null;}
function spRender(){var w=document.getElementById('spWas'),f=document.getElementById('spFokus');if(!w||!f)return;
  w.innerHTML='<span class="dsh-seg">'+SF_ARTS.map(function(a){return '<button type="button" class="'+(a[0]===SP.art?'on':'')+'" onclick="spArt(this.dataset.a)" data-a="'+esc(a[0])+'">'+esc(a[1])+'</button>';}).join('')+'</span>'
    +((sessionSelectedEmpIds||[]).length>1?'<div class="sf-sub" style="margin-bottom:0">Gruppensession mit '+sessionSelectedEmpIds.length+' Mitarbeitern</div>':'');
  var e=spEmp(),miss=sfMissKeys(e),kpis=sfKpiList().slice().sort(function(a,b){return (miss.indexOf(b[0])>=0)-(miss.indexOf(a[0])>=0);});
  var A={Skill:{items:SF_SKILL.map(function(t){return [t,t];}),sel:SP.topics.filter(function(t){return SF_SKILL.indexOf(t)>=0;})},Will:{items:SF_WILL.map(function(t){return [t,t];}),sel:SP.topics.filter(function(t){return SF_WILL.indexOf(t)>=0;})},Result:{items:kpis,sel:SP.metrics.slice()}};
  var g='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'+['Skill','Will','Result'].map(function(a){var o=A[a],lbl=o.sel.map(function(v){return a==='Result'?sfKpiLabel(v):v;});
    var c='<div class="sp-cell" style="position:relative;min-width:0"><label>'+a+'</label><button type="button" class="btn" aria-expanded="'+(SP.open===a)+'" style="width:100%;height:38px;justify-content:space-between;gap:6px;font-weight:500" onclick="spOpenSel(\''+a+'\')"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'+(lbl.length?'':'color:var(--text3)')+'">'+(lbl.length?esc(lbl.join(', ')):'— auswählen —')+'</span><i class="ti ti-chevron-down" style="font-size:11px;flex-shrink:0"></i></button>';
    if(SP.open===a)c+='<div class="sf-panel">'+o.items.map(function(it){var on=o.sel.indexOf(it[0])>=0,u=a==='Result'&&miss.indexOf(it[0])>=0;return '<label class="sf-opt"><input type="checkbox"'+(on?' checked':'')+' onchange="spPick(\''+a+'\',this.dataset.v)" data-v="'+esc(it[0])+'"> <span>'+esc(it[1])+'</span>'+(u?'<span class="sf-d" title="unter Ziel" style="margin:0 0 0 auto"></span>':'')+'</label>';}).join('')+'</div>';
    return c+'</div>';}).join('')+'</div>';
  if(miss.length)g+='<div class="sf-sub" style="margin-bottom:0"><span class="sf-d"></span>Result: '+esc(miss.map(sfKpiLabel).join(', '))+' unter Ziel im laufenden Monat</div>';
  f.innerHTML=g;}
function spArt(a){SP.art=a;spRender();}
function spOpenSel(a){SP.open=SP.open===a?null:a;spRender();}
function spPick(a,v){var L=a==='Result'?SP.metrics:SP.topics,i=L.indexOf(v);if(i>=0)L.splice(i,1);else L.push(v);spRender();}
function sessionSpeichernNeu(){
  if(_savingSessionPlanen)return;
  var empIds=sessionSelectedEmpIds.slice();
  var datum=document.getElementById('sessionDatum').value;
  var uhrzeit=document.getElementById('sessionUhrzeit').value||'';
  var endUhrzeit=document.getElementById('sessionEndUhrzeit').value||'';
  var typ=SP.art;
  var spTopics=SP.topics.concat(SP.metrics.map(sfKpiLabel));
  var thema=spTopics.join(', ');
  var focusMetric=SP.metrics[0]||'';
  var notiz=document.getElementById('sessionNotiz').value.trim();
  var coachSelEl=document.getElementById('sessionCoach');
  var selectedCoachId=coachSelEl&&coachSelEl.value?coachSelEl.value:(currentCoach?currentCoach.id:null); // leer = angemeldete Person
  if(!empIds.length||!datum)return alert('Bitte mindestens einen Mitarbeiter und ein Datum auswählen.');
  if(uhrzeit&&endUhrzeit&&endUhrzeit<=uhrzeit)return alert('Die Endzeit muss nach der Startzeit liegen.');
  if(!kalAbsWarn(empIds,datum))return;
  var groupId=empIds.length>1?('grp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)):null;
  var rows=empIds.map(function(empId){
    return {
      employee_id:empId,date:datum,uhrzeit:uhrzeit||null,end_uhrzeit:endUhrzeit||null,art:typ,rating:null,
      note:notiz||'',focus:thema,status:'geplant',
      coach_id:selectedCoachId,
      focus_metric:focusMetric||null,group_id:groupId
    };
  });
  _savingSessionPlanen=true;
  sb.from('protocols').insert(rows).select().then(function(res){
    _savingSessionPlanen=false;
    if(res.error){alert('Fehler beim Speichern: '+res.error.message);return;}
    (res.data||[]).forEach(function(r){
      var eId=r.employee_id;
      if(!protocols[eId])protocols[eId]=[];
      protocols[eId].unshift({
        id:r.id,date:datum,uhrzeit:uhrzeit,endUhrzeit:endUhrzeit,rating:null,
        note:notiz||'',notes:notiz||'',focus:thema,type:typ,
        status:'geplant',topics:spTopics.slice(),
        coachId:r.coach_id||null,focusMetric:r.focus_metric||null,groupId:groupId
      });
    });
    var namesTxt=empIds.map(function(id){var e=employees.find(function(x){return x.id===id;});return e?e.name:id;}).join(', ');
    if(groupId){
      logActivity('session','created','Gruppensession geplant ('+empIds.length+' Mitarbeiter): '+(typ||'Session'),null,namesTxt+' · '+fd(datum)+(uhrzeit?' · '+uhrzeit:''));
    } else {
      logActivity('session','created','Session geplant: '+(typ||'Session'),empIds[0],namesTxt+' · '+fd(datum)+(uhrzeit?' · '+uhrzeit:''));
    }
    SP={art:'Einzelcoaching',topics:[],metrics:[],open:null};
    document.getElementById('sessionNotiz').value='';
    document.getElementById('sessionDatum').value='';
    document.getElementById('sessionUhrzeit').value='09:00';
    document.getElementById('sessionEndUhrzeit').value='';
    sessionSelectedEmpIds=[];
    var _spOpen=!document.getElementById('sessionPlanenModal').classList.contains('hidden');
    renderSidebar();
    renderMain();
    if(_spOpen)spAfterSave();
  }).catch(function(err){
    _savingSessionPlanen=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}
// Ein Punkt zählt erst, wenn er bewertet ist (leer = kam im Call nicht vor)
function qaTap(key,n){setCbScore(key,_cbScores[key]===n?0:n);}
function setCbScore(key,val){
  val=+val||0;if(val)_cbScores[key]=val;else delete _cbScores[key];
  var sg=document.getElementById('qas_'+key);if(sg)[].forEach.call(sg.querySelectorAll('button'),function(b){b.className=(+b.dataset.n===val)?'on':'';});
  var disp=document.getElementById('cbv_'+key);if(disp){disp.textContent=val?val:'–';disp.style.color=val?'':'var(--text3)';}
  var lv=_qaBase&&_qaBase.scores?_qaBase.scores[key]:null;
  var l=document.getElementById('qal_'+key);if(l)l.textContent=lv?'zuletzt '+lv:'';
  var d=document.getElementById('qad_'+key);
  if(d){if(!lv||!val)d.textContent='';else{var dd=val-lv;d.textContent=dd>0?'+'+dd:dd<0?String(dd):'±0';d.style.color=dd>0?'#2f6b52':dd<0?'#B5513A':'var(--text3)';}}
  updateQaChips();
}
function updateQaChips(){
  (_qaFormCats||CALL_CATS).forEach(function(cat){
    var vs=cat.items.map(function(k){return _cbScores[k]||0;}).filter(function(x){return x>0;});
    var e=document.getElementById('qacg_'+cat.key);if(e)e.textContent=vs.length?'Ø '+(vs.reduce(function(a,b){return a+b;},0)/vs.length).toFixed(1).replace('.',','):'';
  });
  var t=document.getElementById('qaTotalTxt');
  if(t){var cur=Math.round(totalScore({scores:_cbScores}));var base=_qaBase?Math.round(totalScore(_qaBase)):null;
    t.innerHTML='Gesamt <b style="color:var(--text);font-size:13.5px;font-weight:600">'+cur+' %</b>'+(base!=null?' ('+base+' %)':'');}
}
function qaToast(m){var t=document.getElementById('qaToast');if(!t)return;t.textContent=m;t.style.display='block';clearTimeout(window._qaTT);window._qaTT=setTimeout(function(){t.style.display='none';},3000);}
function qaRealId(rid){var r=(callRatings[selectedEmp]||[]).find(function(x){return String(x.id)===String(rid);});return r?r.id:rid;}
function qaReopen(rid){if(rid)rid=qaRealId(rid);_puSwitching=true;try{openQaBewertungModal(selectedEmp,rid||undefined);}finally{_puSwitching=false;}var sc=document.getElementById('qaSecBew');if(sc)sc.scrollIntoView({behavior:'smooth',block:'start'});}
function qaRenderList(){
  var el=document.getElementById('qaList');if(!el)return;
  var list=(callRatings[selectedEmp]||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  var n=document.getElementById('qaListN');if(n)n.textContent='('+list.length+')';
  var ed=canEditHistorie();
  el.innerHTML=list.length?list.slice(0,5).map(function(r,i){
    var has=r.scores&&Object.keys(r.scores).some(function(k){return r.scores[k]>0;});
    var ts=has?Math.round(totalScore(r)):null;
    var prev=list.slice(i+1).find(function(x){return x.scores&&Object.keys(x.scores).some(function(k){return x.scores[k]>0;});});
    var dl=(ts!=null&&prev)?ts-Math.round(totalScore(prev)):0;
    var d=r.date?r.date.slice(8,10)+'.'+r.date.slice(5,7)+'.':'';
    var meta=[r.b2b||'',r.abschlussArt?'Opt.: '+r.abschlussArt:'keine Optimierung',r.bewertetVon?'bewertet von '+r.bewertetVon:''].filter(Boolean).join(' · ');
    var txt=[r.einwand?'Einwand: '+r.einwand:'',r.hinweis||''].filter(Boolean).join(' · ');
    return '<div title="'+esc(txt)+'" style="display:flex;align-items:flex-start;gap:12px;height:84px;padding:12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5;margin-bottom:6px;overflow:hidden">'
      +'<div style="width:96px;flex-shrink:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+d+'</span><span style="font-size:13.5px;font-weight:600;line-height:19px;color:var(--text)">'+(ts!=null?ts+' %':'–')+(dl?' <span style="font-size:11.5px;font-weight:700;color:'+(dl>0?'#2f6b52':'#B5513A')+'">'+(dl>0?'▲':'▼')+'</span>':'')+'</span></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(meta)+'</div>'
      +'<div style="font-size:13.5px;line-height:19px;height:38px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:'+(txt?'var(--text)':'var(--text3)')+'">'+(txt?esc(txt):(has?'Keine Notiz':'Keine Einzelpunkte gespeichert'))+'</div></div>'
      +(ed?'<span style="display:flex;gap:6px;flex-shrink:0;align-self:flex-start">'
        +'<button class="btn" type="button" title="Bearbeiten" onclick="qaReopen(\''+r.id+'\')" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-pencil"></i></button>'
        +'<button class="btn" type="button" title="Löschen" onclick="qaDelete(\''+r.id+'\')" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-trash"></i></button></span>':'')
      +'</div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch keine Calls bewertet.</div>';
}
function qaDelete(rid){
  var n0=(callRatings[selectedEmp]||[]).length;
  deleteHistorieCallRating(selectedEmp,qaRealId(rid));
  if((callRatings[selectedEmp]||[]).length<n0){
    if(String(_editingCallRatingId)===String(rid))qaReopen(null);else qaRenderList();
    qaToast('Bewertung gelöscht');
  }
}

// Name der angemeldeten Person (Coach oder Admin/Betrachter)
function qaCurrentName(){if(typeof currentCoach!=='undefined'&&currentCoach)return currentCoach.name;if(typeof currentAuthUser!=='undefined'&&currentAuthUser){var mu=(typeof appUsers!=='undefined'?appUsers:[]).find(function(u){return u.email===currentAuthUser.email;});if(mu)return mu.name;if(typeof resolveNonEmployeeName==='function')return resolveNonEmployeeName(currentAuthUser.email)||'';}return '';}
function saveInlineCallBewertung(empId){
  if(_savingCallBewertung)return;
  if(empId){var _se=employees.find(function(e){return String(e.id)===String(empId);});selectedEmp=_se?_se.id:empId;}
  var datum=document.getElementById('cb-date');
  var auftrag=document.getElementById('cb-auftrag');
  var bewerter=document.getElementById('cb-bewerter');
  var status=document.getElementById('cb-status');
  var b2b=document.getElementById('cb-b2b');
  var abschlussart=document.getElementById('cb-abschlussart');
  var einwand=document.getElementById('cb-einwand');
  var hinweis=document.getElementById('cb-hinweis');
  if(!datum||!datum.value){alert('Bitte Datum eingeben');return;}
  var scores=Object.assign({},_cbScores);
  var payload={
    employee_id:selectedEmp,date:datum.value,
    auftragsnr:auftrag?auftrag.value.trim():'',
    bewertet_von:(_editingCallRatingId&&bewerter&&bewerter.value.trim())?bewerter.value.trim():qaCurrentName(),
    status:(abschlussart&&abschlussart.value)?'ja':(_editingCallRatingId&&status?status.value:'nein'),
    b2b:b2b?b2b.value:'B2C',
    abschluss_art:abschlussart&&abschlussart.value?abschlussart.value:null,
    einwand:einwand?einwand.value.trim():'',
    hinweis:hinweis?hinweis.value.trim():''
  };
  _savingCallBewertung=true;
  var isEditing=!!_editingCallRatingId;
  var upsertCall=isEditing
    ? sb.from('call_ratings').update(payload).eq('id',_editingCallRatingId).select().single()
    : sb.from('call_ratings').insert(payload).select().single();
  upsertCall.then(function(res){
    if(res.error){_savingCallBewertung=false;alert('Fehler beim Speichern: '+res.error.message);return;}
    var r=res.data;
    var scoreRows=Object.keys(scores).map(function(k){
      return {call_rating_id:r.id,item_key:k,value:scores[k]};
    });
    var afterScores=function(){
      var entry={
        id:r.id,date:r.date,auftragsnr:r.auftragsnr||'',bewertetVon:r.bewertet_von||'',
        status:r.status,b2b:r.b2b,abschlussArt:r.abschluss_art||'',einwand:r.einwand||'',hinweis:r.hinweis||'',scores:scores
      };
      if(!callRatings[selectedEmp])callRatings[selectedEmp]=[];
      if(isEditing){
        var idx=callRatings[selectedEmp].findIndex(function(x){return x.id===r.id;});
        if(idx>=0)callRatings[selectedEmp][idx]=entry;else callRatings[selectedEmp].unshift(entry);
      } else {
        callRatings[selectedEmp].unshift(entry);
      }
      var e0=employees.find(function(x){return x.id===selectedEmp;});
      var avgScore=Object.keys(scores).length?(Object.values(scores).reduce(function(a,b){return a+b;},0)/Object.keys(scores).length).toFixed(1):null;
      logActivity('qa',isEditing?'updated':'created',(isEditing?'Call-Bewertung bearbeitet':'Neuen Call bewertet')+(avgScore?' (Ø '+avgScore+'/4)':''),selectedEmp,e0?e0.name+' · '+fd(r.date):'');
      _cbScores={};_editingCallRatingId=null;
      var _qm=document.getElementById('qaBewertungModal');
      if(_qm&&!_qm.classList.contains('hidden')){qaReopen(null);qaToast(isEditing?'Änderung gespeichert':'Bewertung gespeichert');}
      if(view==='emp')renderTab();
    };
    if(isEditing){
      // C13: erst neue Punkte schreiben (upsert), dann nur weggefallene löschen – bei Fehler bleiben die alten Punkte erhalten
      var _keys=scoreRows.map(function(x){return x.item_key;});
      var _fail=function(m){_savingCallBewertung=false;alert('Bewertung gespeichert, aber die Einzel-Scores konnten NICHT gespeichert werden (die bisherigen Punkte sind noch da): '+m);afterScores();};
      (scoreRows.length?sb.from('call_rating_scores').upsert(scoreRows,{onConflict:'call_rating_id,item_key'}):Promise.resolve({})).then(function(res2){
        if(res2&&res2.error){_fail(res2.error.message);return;}
        var q=sb.from('call_rating_scores').delete().eq('call_rating_id',r.id);
        if(_keys.length)q=q.not('item_key','in','('+_keys.map(function(k){return '"'+String(k).replace(/"/g,'\\"')+'"';}).join(',')+')');
        q.then(function(res3){_savingCallBewertung=false;if(res3&&res3.error)console.warn('Alte Einzel-Scores nicht gelöscht',res3.error);afterScores();},function(){_savingCallBewertung=false;afterScores();});
      },function(e){_fail(e&&e.message||String(e));});
    } else if(scoreRows.length){
      sb.from('call_rating_scores').insert(scoreRows).then(function(res2){
        _savingCallBewertung=false;
        if(res2.error)alert('Bewertung gespeichert, aber die Einzel-Scores konnten NICHT gespeichert werden: '+res2.error.message);
        afterScores();
      });
    } else {
      _savingCallBewertung=false;
      afterScores();
    }
  }).catch(function(err){
    _savingCallBewertung=false;
    alert('Unerwarteter Fehler: '+err.message);
  });
}


function saveCoachingInfoNotiz(empId){
  if(_savingCoachingInfoNotiz)return;
  var field=document.getElementById('coachingInfoNotizField');
  var statusEl=document.getElementById('coachingInfoNotizStatus');
  if(!field)return;
  var notiz=field.value;
  _savingCoachingInfoNotiz=true;
  if(statusEl)statusEl.textContent='Speichert…';
  sb.from('employees').update({notes:notiz}).eq('id',empId).then(function(res){
    _savingCoachingInfoNotiz=false;
    if(res.error){ if(statusEl)statusEl.textContent='Fehler beim Speichern'; alert('Fehler beim Speichern: '+res.error.message); return; }
    var emp=employees.find(function(e){return e.id===empId;});
    if(emp)emp.notes=notiz;
    if(statusEl){statusEl.textContent='✓ Gespeichert';setTimeout(function(){if(statusEl)statusEl.textContent='';},2500);}
  }).catch(function(err){
    _savingCoachingInfoNotiz=false;
    if(statusEl)statusEl.textContent='Fehler beim Speichern';
    alert('Unerwarteter Fehler: '+err.message);
  });
}
function openCoachingInfoModal(empId){
  var emp=employees.find(function(e){return e.id===empId;});
  if(!emp)return;
  var all=(protocols[empId]||[]).slice();
  var abgeschlossen=all.filter(function(p){return (p.status||'abgeschlossen')!=='geplant';});
  var geplant=all.filter(function(p){return p.status==='geplant';});
  var heute=today();
  // Chronologisch absteigend (neueste zuerst), geplante UND abgeschlossene gemeinsam
  var timeline=all.slice().sort(function(a,b){return b.date.localeCompare(a.date)||( (b.uhrzeit||'').localeCompare(a.uhrzeit||''));});
  var bestEvents=personalBestEvents(empId);
  // Kennzahlen
  var total=abgeschlossen.length;
  var lastDone=abgeschlossen.slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0];
  var daysSinceLast=lastDone?Math.round((new Date(heute+'T00:00:00')-new Date(lastDone.date+'T00:00:00'))/86400000):null;
  var firstDone=abgeschlossen.slice().sort(function(a,b){return a.date.localeCompare(b.date);})[0];
  var avgPerMonth=null;
  if(firstDone&&total>1){
    var monthsSpan=Math.max(1,(new Date(heute+'T00:00:00')-new Date(firstDone.date+'T00:00:00'))/(86400000*30.44));
    avgPerMonth=(total/monthsSpan).toFixed(1);
  }
  // Haupt-Coach (haeufigster coachId unter abgeschlossenen Sessions)
  var coachCounts={};
  abgeschlossen.forEach(function(p){if(p.coachId)coachCounts[p.coachId]=(coachCounts[p.coachId]||0)+1;});
  var mainCoachId=Object.keys(coachCounts).sort(function(a,b){return coachCounts[b]-coachCounts[a];})[0];
  var mainCoach=mainCoachId?employees.find(function(e){return e.id===mainCoachId;}):null;

  var c=COLORS[emp.color%COLORS.length];
  var mNamesShort=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  var dowShort=['So','Mo','Di','Mi','Do','Fr','Sa'];

  // ── Effekt je Session: Ø-Veraenderung des hinterlegten Ziel-KPI 14 Tage vor vs. nach der Session
  // (gleiche Methodik wie bei "Coach-Wirksamkeit"), normalisiert auf Zielrichtung
  var empT=empTargets(emp);
  var fullPerf=(performance[empId]||[]).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  var FOCUS_METRIC_LABELS={};
  (typeof FOCUS_METRICS!=='undefined'?FOCUS_METRICS:[]).forEach(function(m){FOCUS_METRIC_LABELS[m.key]=m.label;});
  function avgWindow(centerDate,daysBefore,daysAfter,metricKey){
    var fromS=addDaysUTC(centerDate,-daysBefore);
    var toS=addDaysUTC(centerDate,daysAfter);
    var rows=fullPerf.filter(function(p){return p.date>=fromS&&p.date<toS;});
    return perfKpiWin(emp,rows,metricKey);
  }
  function sessionEffekt(p){
    if(p.status==='geplant'||!p.focusMetric||!fullPerf.length)return null;
    var im=perfImpact(emp,fullPerf,p.date,p.focusMetric);if(im.state!=='ok')return null;
    return {delta:im.delta,raw:im.raw,verdict:im.verdict,metric:p.focusMetric,label:FOCUS_METRIC_LABELS[p.focusMetric]||focusMetricLabel(p.focusMetric)};
  }
  var alleEffekte=abgeschlossen.map(sessionEffekt).filter(function(e){return e!==null;});
  var effektPaare=abgeschlossen.map(function(p){return {p:p,eff:sessionEffekt(p)};}).filter(function(x){return x.eff!==null;});
  var besteSession=effektPaare.length?effektPaare.slice().sort(function(a,b){return b.eff.delta-a.eff.delta;})[0]:null;
  var avgEffekt=alleEffekte.length?(alleEffekte.reduce(function(a,b){return a+b.delta;},0)/alleEffekte.length):null;

  // ── Kopf, Zusammenfassung, Diagramm-Box und Notiz (Layout: schlanker Kopf + Symbolleiste links) ──
  var sortedRatings=(callRatings[empId]||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var lastQa=sortedRatings[0]||null;
  var daysSinceQa=lastQa?Math.round((new Date(heute+'T00:00:00')-new Date(lastQa.date+'T00:00:00'))/86400000):null;
  var nextPlan=geplant.filter(function(p){return p.date>=heute;}).sort(function(a,b){return a.date.localeCompare(b.date);})[0]||null;
  var lastCoach=lastDone&&lastDone.coachId?employees.find(function(e){return e.id===lastDone.coachId;}):null;
  function fdS(ds){var d=new Date(ds+'T00:00:00');return dowShort[d.getDay()]+', '+d.getDate()+'. '+mNamesShort[d.getMonth()];}
  var sumTxt='';
  if(lastDone){sumTxt+='Letzte Session vor <b>'+daysSinceLast+' '+(daysSinceLast===1?'Tag':'Tagen')+'</b>. ';}
  else sumTxt+='Noch keine abgeschlossene Session. ';
  var futPlan=geplant.filter(function(p){return p.date>=heute;}).length;
  if(futPlan)sumTxt+='<b>'+futPlan+' '+(futPlan===1?'Session':'Sessions')+'</b> geplant, die nächste am <b>'+fdS(nextPlan.date)+'</b>. ';
  else sumTxt+='<b>Keine Session</b> geplant. ';
  if(daysSinceQa===null)sumTxt+='Noch keine QA-Bewertung.';
  else if(daysSinceQa>60)sumTxt+='Seit <b>'+Math.round(daysSinceQa/7)+' Wochen</b> keine QA-Bewertung.';
  else sumTxt+='Letzte QA-Bewertung vor '+daysSinceQa+' Tagen.';
  // Sessions je Monat (12 Monate zurueck + aktueller + naechster Monat geplant)
  var mVals=[];
  for(var mi=-11;mi<=1;mi++){
    var md=new Date(heute+'T00:00:00');md.setDate(1);md.setMonth(md.getMonth()+mi);
    var mk=md.getFullYear()+'-'+('0'+(md.getMonth()+1)).slice(-2);
    var cnt=mi<=0?abgeschlossen.filter(function(p){return (p.date||'').slice(0,7)===mk;}).length:geplant.filter(function(p){return (p.date||'').slice(0,7)===mk;}).length;
    mVals.push({lbl:mNamesShort[md.getMonth()],v:cnt,cur:mi===0,fut:mi>0});
  }
  var mMax=Math.max(1,avgPerMonth?parseFloat(avgPerMonth):0);mVals.forEach(function(x){mMax=Math.max(mMax,x.v);});mMax=mMax*1.15;
  var BH=170;
  var chips='<span style="white-space:nowrap;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fff;border:1px solid #E4E0D6;color:var(--text2)">'+total+' '+(total===1?'Session':'Sessions')+'</span>';
  if(daysSinceLast!==null&&daysSinceLast>30)chips+='<span style="white-space:nowrap;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fff;border:1px solid rgba(240,133,102,.5);color:#B5513A">Letzte vor '+daysSinceLast+' Tagen</span>';
  if(daysSinceQa===null||daysSinceQa>60)chips+='<span style="white-space:nowrap;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fff;border:1px solid rgba(240,133,102,.5);color:#B5513A">'+(daysSinceQa===null?'Keine QA':Math.round(daysSinceQa/7)+' Wo. ohne QA')+'</span>';
  var effTxt=avgEffekt===null?'—':(avgEffekt>=0?'+':'−')+Math.abs(avgEffekt).toFixed(1).replace('.',',');
  // Einheitliche Box mit Kopfzeile in Menuefarbe (#F7F5F0)
  function ciBox(id,title,right,body,extraStyle){return '<div id="'+id+'" style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06);'+(extraStyle||'')+'">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700;font-size:14px;color:var(--text)">'+title+(right?'<span style="margin-left:auto;display:flex;gap:6px;align-items:center">'+right+'</span>':'')+'</div>'+body+'</div>';}
  var chartHtml='<div style="padding:16px 0 0">'
    +'<div style="position:relative;height:'+(BH+18)+'px;display:flex;align-items:flex-end;gap:6px">';
  if(avgPerMonth)chartHtml+='<div style="position:absolute;left:0;right:0;bottom:'+Math.round(parseFloat(avgPerMonth)/mMax*BH)+'px;border-top:1.5px dashed #8C8577"><span style="position:absolute;left:0;top:-16px;font-size:10.5px;color:var(--text2);font-weight:600;background:#F7F5F0;padding:0 3px">Ø '+String(avgPerMonth).replace('.',',')+'</span></div>';
  mVals.forEach(function(x){var hp=Math.max(3,Math.round(x.v/mMax*BH));
    if(x.v===0){chartHtml+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="'+x.lbl+': keine'+(x.fut?' geplant':' Sessions')+'"><div style="width:5px;height:5px;border-radius:50%;background:'+(x.cur?'#3a3833':'#D3CCBD')+';margin-bottom:1px"></div></div>';return;}
    chartHtml+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="'+x.lbl+': '+x.v+(x.fut?' geplant':' Sessions')+'"><span style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:3px">'+x.v+'</span><div style="width:70%;height:'+hp+'px;border-radius:4px 4px 0 0;'+(x.fut?'border:1.5px dashed #B4AC9C;background:transparent':x.cur?'background:#3a3833':'background:#B4AC9C')+'"></div></div>';});
  chartHtml+='</div><div style="display:flex;gap:6px;margin-top:4px;margin-bottom:8px">'+mVals.map(function(x){return '<span style="flex:1;text-align:center;font-size:11px;color:'+(x.cur?'var(--text)':'var(--text3)')+';font-weight:'+(x.cur?700:600)+'">'+x.lbl+'</span>';}).join('')+'</div></div>'
    +'<div id="ciSum" style="font-size:14px;color:var(--text);line-height:1.5;padding:10px 0 0;border-top:1px solid #E4E0D6">'+sumTxt+'</div>';
  var box=typeof ovSections==='function'?ovSections(emp):ciBox('ciSecTopBox','Coaching im Überblick',chips,chartHtml);
  var notizTxt=emp.notes||'';
  var noteBox=ciBox('ciSecNotiz','Notiz zum Mitarbeiter','<span style="font-size:12px;font-weight:600;color:var(--text3)">nur für Coaches und Admins</span>',
    '<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;padding:10px 12px">'
    +'<textarea id="coachingInfoNotizField" placeholder="Noch keine Notiz – hier schreiben …" style="width:100%;min-height:54px;border:none;background:transparent;font-size:14px;resize:vertical;color:var(--text);outline:none;padding:0;font-family:inherit" onblur="saveCoachingInfoNotiz(\''+empId+'\')">'+esc(notizTxt)+'</textarea>'
    +'<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text3);margin-top:4px"><span>Wird beim Verlassen des Feldes automatisch gespeichert</span><span id="coachingInfoNotizStatus"></span></div></div>');
  var role=emp.role||'';
  var h='<div style="display:flex;align-items:center;padding:14px 16px 6px">'
    +'<div style="min-width:0"><div style="font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text3);text-transform:uppercase">Übersicht</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(emp.name)+(role?' · '+esc(role):'')+(mainCoach?' · Coach '+esc(mainCoach.name.split(' ')[0]):'')+'</div></div>'
    +'<button class="btn" style="margin-left:auto;width:34px;height:34px;padding:0;justify-content:center" onclick="closeModal(\'coachingInfoModal\')" aria-label="Schließen"><i class="ti ti-x"></i></button></div>';
  // Gleiche Bausteine wie die Hauptmenueleiste (rl-btn: abgerundete Quadrate, aktiv weiss mit Koralle-Strich, Namensschild beim Darueberfahren)
  function railBtn(icon,tip,js,on){return '<button class="rl-btn'+(on?' on':'')+'" aria-label="'+tip+'" onclick="'+js+'" style="width:38px;height:38px;font-size:18px"><i class="ti '+icon+'"></i><span class="rl-tip" style="left:48px">'+tip+'</span></button>';}
  var sc=function(id){return "var el=document.getElementById('"+id+"');if(el)el.scrollIntoView({behavior:'smooth',block:'start'})";};
  h+='<div style="display:flex;min-height:0;flex:1">'
    +'<div style="width:56px;flex-shrink:0;align-self:stretch;margin:14px 0 14px 14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;box-shadow:0 10px 24px rgba(40,32,15,.10);position:relative;z-index:3">'
    +railBtn('ti-notes','Notiz zum Mitarbeiter',sc('ciSecNotiz'),true)+railBtn('ti-timeline','Leistung und Termine',sc('ovSecZ'))+railBtn('ti-chart-radar','Profil und nächste Schritte',sc('ovSecP'))+railBtn('ti-list','Verlauf',sc('ciSecVerlauf'))
    +'<span style="width:26px;height:1px;background:#E4E0D6;margin:4px 0"></span>'
    +railBtn('ti-calendar-plus','Session planen',"closeModal('coachingInfoModal');openSessionModal('"+empId+"')")
    +'</div>'
    +'<div style="flex:1;min-width:0;display:flex;flex-direction:column;min-height:0">'
    +'<div id="ciScroll" style="flex:1;overflow-y:auto;padding:6px 18px 12px 14px;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 8px,#000 calc(100% - 18px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 8px,#000 calc(100% - 18px),transparent 100%)">'
    +'<div id="ciSecTop"></div>'
    +noteBox+box;
  // ── Verlauf: eine Box, alle Eintraege untereinander, gleich hohe Zeilen ──
  var infoComments=(reviews[empId]||[]).filter(function(r){return r.isComment;});
  var combinedTl=timeline.map(function(p){return {kind:'session',date:p.date,p:p};})
    .concat(bestEvents.map(function(ev){return {kind:'record',date:ev.date,label:ev.label};}))
    .concat(infoComments.map(function(c){return {kind:'comment',date:c.date,c:c};}))
    .sort(function(a,b){return b.date.localeCompare(a.date);});
  var RH=58;
  function tlRow(dateTxt,mark,title,sub,right,opt){opt=opt||{};
    return '<div title="'+esc((title||'')+(sub?' – '+sub:''))+'" style="display:flex;align-items:center;gap:12px;height:'+RH+'px;padding:0 12px;margin-bottom:6px;border-radius:10px;border:1px solid '+(opt.border||'#E4E0D6')+';background:'+(opt.bg||'#EFECE5')+';'+(opt.bar?'box-shadow:inset 3px 0 0 '+opt.bar+';':'')+'">'
      +'<div style="width:58px;flex-shrink:0;font-size:12px;font-weight:500;color:var(--text3);line-height:1.25">'+dateTxt+'</div>'
      +'<div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;'+(mark.style||'background:#F7F5F0;border:1px solid #E4E0D6;color:var(--text2)')+'">'+mark.html+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:400;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+title+'</div>'+(sub?'<div style="font-size:12.5px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+sub+'</div>':'')+'</div>'
      +(right?'<div style="flex-shrink:0;display:flex;gap:6px;align-items:center">'+right+'</div>':'')+'</div>';}
  function pill(t,st){return '<span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:10px;white-space:nowrap;'+(st||'background:#F7F5F0;color:var(--text2);border:1px solid #E4E0D6')+'">'+t+'</span>';}
  var rows='';
  if(!combinedTl.length){
    rows='<div style="text-align:center;color:var(--text3);padding:20px 0">Noch keine Sessions vorhanden</div>';
  } else {
    combinedTl.forEach(function(item,idx){
      var dt=new Date(item.date+'T00:00:00');
      var dTxt=dowShort[dt.getDay()]+'<br>'+dt.getDate()+'. '+mNamesShort[dt.getMonth()];
      if(item.kind==='comment'){
        var cc=item.c;
        rows+=tlRow(dTxt,{html:'<i class="ti ti-message-2"></i>',style:'background:#fff;border:1px solid #E4E0D6;color:var(--text)'},esc(cc.note),'Kommentar'+(cc.author?' · '+esc(cc.author):''),pill(esc(String(cc.commentType||'').charAt(0).toUpperCase()+String(cc.commentType||'').slice(1))));
        return;
      }
      if(item.kind==='record'){
        rows+=tlRow(dTxt,{html:'<i class="ti ti-trophy"></i>',style:'background:#fff;border:1.5px solid #F08566;color:var(--text)'},esc(item.label),'',pill('Bestwert','background:#fff;color:#B5513A;border:1px solid rgba(240,133,102,.6)'),{bar:'#F08566',border:'rgba(240,133,102,.6)'});
        return;
      }
      var p=item.p;
      var planned=p.status==='geplant';
      var coach=p.coachId?employees.find(function(e){return e.id===p.coachId;}):null;
      var eff=sessionEffekt(p);
      var right=(planned?pill('geplant','background:#fff;color:var(--text2);border:1px dashed #B4AC9C'):'')
        +(eff?pill(esc(eff.label)+' '+impactNum(eff.metric,eff.raw)+' · '+impactWord(eff.verdict),impactStyle(eff.verdict)):'')
        +(besteSession&&besteSession.p===p?pill('beste Session'):'');
      rows+=tlRow(dTxt,{html:'<i class="ti ti-'+(planned?'calendar-event':'users')+'"></i>',style:planned?'background:#fff;border:1px dashed #B4AC9C;color:var(--text)':'background:#fff;border:1px solid #E4E0D6;color:var(--text)'},esc(p.type||p.art||'Coaching'),(coach?'Coach '+esc(coach.name):'')+(p.focus?(coach?' · ':'')+esc(p.focus):''),right);
      var nextSession=null;
      for(var ni=idx+1;ni<combinedTl.length;ni++){if(combinedTl[ni].kind==='session'){nextSession=combinedTl[ni].p;break;}}
      if(nextSession){
        var gapDays=Math.round((new Date(p.date+'T00:00:00')-new Date(nextSession.date+'T00:00:00'))/86400000);
        if(gapDays>=14){
          rows+=tlRow('',{html:'<i class="ti ti-alert-triangle"></i>',style:'background:#fff;border:1px solid rgba(240,133,102,.6);color:var(--text)'},Math.round(gapDays/7)+' Wochen Pause seit dieser Session','',null,{bg:'#FBF4F1',bar:'#F08566'});
        }
      }
    });
  }
  h+=ciBox('ciSecVerlauf','Verlauf <span style="font-size:12px;font-weight:500;color:var(--text3)">('+combinedTl.length+')</span>','','<div>'+rows+'</div>','margin-bottom:6px;padding-bottom:8px');
  h+='</div>'; // Ende Scrollbereich
  h+='<div style="padding:4px 18px 14px;background:#EEEDE9"><div style="display:flex;justify-content:flex-end;gap:8px;background:#F7F5F0;border:1px solid #E4E0D6;border-radius:12px;padding:8px"><button class="btn" type="button" style="height:36px;width:auto" onclick="closeModal(\'coachingInfoModal\')">Schließen</button></div></div>';
  h+='</div></div>'; // Ende Inhalt + Flex
  window._ciType='diverses';
  document.getElementById('coachingInfoModalBody').innerHTML=h;
  openModal('coachingInfoModal');try{if(typeof puBanEnsure==='function')setTimeout(function(){puBanEnsure('coachingInfoModal',empId);},0);}catch(_e){}
}
function openSessionModalWithFocus(empId,focusText){
  openSessionModal(empId);
  var notizEl=document.getElementById('sessionNotiz');
  if(notizEl&&!notizEl.value.trim()){
    notizEl.value='Coaching-Bedarf: "'+focusText+'" war in den letzten Calls konstant schwach.';
  }
}
function openHistorieFromSession(){
  var ids=sessionSelectedEmpIds||[];
  var id=ids.length===1?ids[0]:(ids.length?null:selectedEmp);
  if(!id){alert('Bitte genau einen Mitarbeiter auswählen, um die Coaching-Historie zu öffnen.');return;}
  closeModal('sessionPlanenModal');
  openCoachingInfoModal(id);
}
function updateSessionHdSub(){
  var el=document.getElementById('sessionHdSub');if(!el)return;
  var ids=sessionSelectedEmpIds||[];
  if(!ids.length){el.textContent='Mitarbeiter wählen';return;}
  if(ids.length>1){el.textContent=ids.length+' Mitarbeiter · Gruppencoaching';return;}
  var e=employees.find(function(x){return x.id===ids[0];});
  el.textContent=e?(e.name+(e.role?' · '+e.role:'')):'1 Mitarbeiter';
}
// ── Session planen im gemeinsamen Popup: geplante Sessions, nach dem Planen offen bleiben ──
function spRenderList(){
  var el=document.getElementById('spList');if(!el)return;
  var t0=today();
  var list=(protocols[selectedEmp]||[]).filter(function(x){return x.status==='geplant'&&x.date>=t0;}).slice().sort(function(a,b){return String(a.date+(a.uhrzeit||'')).localeCompare(String(b.date+(b.uhrzeit||'')));});
  var n=document.getElementById('spListN');if(n)n.textContent='('+list.length+')';
  el.innerHTML=list.length?list.slice(0,5).map(function(x){
    var coach=x.coachId?employees.find(function(e){return String(e.id)===String(x.coachId);}):null;
    var meta=[x.uhrzeit?x.uhrzeit+(x.endUhrzeit?'–'+x.endUhrzeit:'')+' Uhr':'',coach?'Coach '+coach.name.split(' ')[0]:'',x.topics&&x.topics.length?x.topics.join(', '):''].filter(Boolean).join(' · ');
    var txt=x.note||x.notes||'';
    return '<div title="'+esc(txt)+'" style="display:flex;align-items:flex-start;gap:12px;height:84px;padding:12px;border:1px solid rgba(240,133,102,0.45);border-radius:10px;background:#FDF0EB;margin-bottom:6px;overflow:hidden">'
      +'<div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+fd(x.date)+'</span><span style="font-size:13.5px;font-weight:600;line-height:19px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x.type||'Session')+'</span></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(meta)+'</div>'
      +'<div style="font-size:13.5px;line-height:19px;height:38px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:'+(txt?'var(--text)':'var(--text3)')+'">'+(txt?esc(txt):'Kein Anlass notiert')+'</div></div>'
      +'<span style="display:flex;gap:6px;flex-shrink:0;align-self:flex-start"><button class="btn" type="button" title="Jetzt erfassen" onclick="openPlannedSession(selectedEmp,\''+jsq(x.id)+'\',\''+jsq(x.type||'')+'\',\''+jsq((x.topics&&x.topics[0])||'')+'\',\''+jsq(x.date)+'\',\''+jsq(x.uhrzeit||'')+'\')" style="width:34px;height:34px;padding:0;justify-content:center"><i class="ti ti-check"></i></button></span>'
      +'</div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Keine Sessions geplant.</div>';
}
function spAfterSave(){
  var m=document.getElementById('sessionPlanenModal');
  if(!m)return;
  _puSwitching=true;try{openSessionModal(selectedEmp);}finally{_puSwitching=false;}
  var c=document.getElementById('spSecNew');if(c)c.scrollIntoView({behavior:'smooth',block:'start'});
  var t=document.getElementById('spToast');if(t){t.textContent='Session geplant';t.style.display='block';clearTimeout(window._spTT);window._spTT=setTimeout(function(){t.style.display='none';},3000);}
}
function openSessionModal(empId){
  if(empId)selectedEmp=empId;
  sessionSelectedEmpIds=[]; // Mitarbeiter beim Planen bewusst leer – wird ausgewählt
  sessionEmpDropdownOpen=false;sessionEmpSearchQuery='';
  renderSessionEmpDropdown();
  if(!_puSwitching)SP={art:'Einzelcoaching',topics:[],metrics:[],open:null};
  spRender();
  var coachSel=document.getElementById('sessionCoach');
  if(coachSel){
    coachSel.innerHTML='';
    var coachList=employees.filter(function(e){return isCoachEmp(e)&&e.active!==false;}).sort(function(a,b){return a.name.localeCompare(b.name);});
    coachList.forEach(function(c){
      var o=document.createElement('option');o.value=c.id;o.textContent=c.name;coachSel.appendChild(o);
    });
    // Vorbelegt ist immer die angemeldete Person; Admins ohne Mitarbeiter-Eintrag erscheinen als „Ich“
    if(!currentCoach||!coachList.some(function(c){return String(c.id)===String(currentCoach.id);})){var me=document.createElement('option');me.value='';me.textContent=(typeof qaCurrentName==='function'&&qaCurrentName())?qaCurrentName()+' (ich)':'Ich';coachSel.insertBefore(me,coachSel.firstChild);}
    coachSel.value=currentCoach&&coachList.some(function(c){return String(c.id)===String(currentCoach.id);})?currentCoach.id:'';
  }
  var datumEl=document.getElementById('sessionDatum');
  if(datumEl&&!datumEl.value)datumEl.value=today();
  renderLastContinueBox(selectedEmp);
  updateSessionHdSub();
  spRenderList();
  openModal('sessionPlanenModal');
}
function updateNcHdSub(){
  var el=document.getElementById('ncHdSub');if(!el)return;
  var ids=ncSelectedEmpIds||[];
  if(!ids.length){el.textContent='Mitarbeiter wählen';return;}
  if(ids.length>1){el.textContent=ids.length+' Mitarbeiter · Gruppencoaching';return;}
  var e=employees.find(function(x){return x.id===ids[0];});
  el.textContent=e?(e.name+(e.role?' · '+e.role:'')):'1 Mitarbeiter';
}
function renderNcEmpDropdown(){
  if(typeof updateNcHdSub==='function')updateNcHdSub();
  var wrap=document.getElementById('ncEmpDropdownWrap');
  if(!wrap)return;
  var labelEl=document.getElementById('ncEmpSelLabel');
  var visible=employees.filter(function(e){return e.active!==false&&!e.isPureCoach;});
  if(labelEl){
    labelEl.textContent=ncSelectedEmpIds.length===0?'— Mitarbeiter wählen —':
      ncSelectedEmpIds.length===1?(employees.find(function(e){return e.id===ncSelectedEmpIds[0];})||{}).name||'1 Mitarbeiter':
      ncSelectedEmpIds.length+' Mitarbeiter (Gruppe)';
  }
  if(!ncEmpDropdownOpen){wrap.innerHTML='';return;}
  var ROLE_ORDER={SDM:0,SDC:1,SDL:2,SE:3,SR:4,VLC:5};
  var sorted=visible.slice().sort(function(a,b){
    var ra=ROLE_ORDER[a.role]!=null?ROLE_ORDER[a.role]:99,rb=ROLE_ORDER[b.role]!=null?ROLE_ORDER[b.role]:99;
    return ra-rb||a.name.localeCompare(b.name);
  });
  var h='<div style="position:absolute;top:64px;left:0;z-index:30;background:var(--bg-solid);border:1px solid var(--border2);border-radius:var(--r-md);box-shadow:0 10px 24px rgba(40,32,15,0.14);width:100%;min-width:280px;display:flex;flex-direction:column">';
  h+='<div style="padding:8px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:6px;background:var(--bg2);border-radius:6px;padding:6px 8px">'
    +'<i class="ti ti-search" style="font-size:13px;color:var(--text3)"></i>'
    +'<input id="ncEmpSearchInput" placeholder="Mitarbeiter suchen…" value="'+esc(ncEmpSearchQuery)+'" oninput="ncEmpSearchQuery=this.value;filterNcEmpList(this.value)" style="border:none;background:none;outline:none;font-size:12.5px;width:100%;color:var(--text)">'
    +'</div></div>';
  h+='<div style="max-height:220px;overflow-y:auto;padding:6px 0">';
  sorted.forEach(function(e){
    var checked=ncSelectedEmpIds.indexOf(e.id)>=0;
    h+='<label class="nc-emp-opt-row" data-search="'+esc(e.name).toLowerCase()+'" style="display:grid;grid-template-columns:20px 38px 1fr;align-items:center;gap:8px;padding:6px 12px;font-size:12.5px;cursor:pointer;border-radius:4px;white-space:nowrap" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'
      +'<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleNcEmpId(\''+e.id+'\')" style="cursor:pointer">'
      +'<span style="font-size:11px;font-weight:700;color:var(--text3)">'+e.role+'</span>'
      +'<span>'+esc(e.name)+'</span>'
      +'</label>';
  });
  h+='<div id="ncEmpNoResults" style="display:none;padding:14px 12px;text-align:center;font-size:12px;color:var(--text3)">Keine Treffer</div>';
  h+='</div>';
  h+='<div style="display:flex;gap:6px;padding:8px;border-top:1px solid var(--border)">'
    +'<button type="button" class="btn btn-sm" style="flex:1;font-size:11px" onclick="ncSelectedEmpIds=['+visible.map(function(e){return "'"+e.id+"'";}).join(',')+'];onNcSelectionChanged();">Alle</button>'
    +'<button type="button" class="btn btn-sm" style="flex:1;font-size:11px" onclick="ncSelectedEmpIds=[];onNcSelectionChanged();">Keine</button>'
    +'</div>';
  h+='</div>';
  wrap.innerHTML=h;
  if(ncEmpSearchQuery)filterNcEmpList(ncEmpSearchQuery);
}
function toggleNcEmpDropdown(){ncEmpDropdownOpen=!ncEmpDropdownOpen;if(!ncEmpDropdownOpen)ncEmpSearchQuery='';renderNcEmpDropdown();}
function toggleNcEmpId(id){
  var idx=ncSelectedEmpIds.indexOf(id);
  if(idx>=0)ncSelectedEmpIds.splice(idx,1);else ncSelectedEmpIds.push(id);
  onNcSelectionChanged();
}
// Sobald mehr als eine Person ausgewaehlt ist, automatisch auf Kategorie "Coaching" /
// Art "Gruppencoaching" umschalten - Gruppencoachings sollen nicht versehentlich als
// Einzelcoaching o.ae. gespeichert werden.
function onNcSelectionChanged(){
  renderNcEmpDropdown();
  if(typeof sfRender==='function')sfRender();
}
function filterNcEmpList(q){
  q=(q||'').toLowerCase().trim();
  var wrap=document.getElementById('ncEmpDropdownWrap');
  if(!wrap)return;
  var anyVisible=false;
  wrap.querySelectorAll('.nc-emp-opt-row').forEach(function(row){
    var match=!q||row.dataset.search.indexOf(q)>=0;
    row.style.display=match?'grid':'none';
    if(match)anyVisible=true;
  });
  var noRes=document.getElementById('ncEmpNoResults');
  if(noRes)noRes.style.display=anyVisible?'none':'block';
}
function renderSessionEmpDropdown(){
  if(typeof spRender==='function')setTimeout(spRender,0);
  var wrap=document.getElementById('sessionEmpDropdownWrap');
  if(!wrap)return;
  var labelEl=document.getElementById('sessionEmpSelLabel');
  var visible=employees.filter(function(e){return e.active!==false&&!e.isPureCoach;});
  if(labelEl){
    labelEl.textContent=sessionSelectedEmpIds.length===0?'— Mitarbeiter wählen —':
      sessionSelectedEmpIds.length===1?(employees.find(function(e){return e.id===sessionSelectedEmpIds[0];})||{}).name||'1 Mitarbeiter':
      sessionSelectedEmpIds.length+' Mitarbeiter ausgewählt (Gruppencoaching)';
  }
  if(!sessionEmpDropdownOpen){wrap.innerHTML='';return;}
  var ROLE_ORDER={SDM:0,SDC:1,SDL:2,SE:3,SR:4,VLC:5};
  var sorted=visible.slice().sort(function(a,b){
    var ra=ROLE_ORDER[a.role]!=null?ROLE_ORDER[a.role]:99,rb=ROLE_ORDER[b.role]!=null?ROLE_ORDER[b.role]:99;
    return ra-rb||a.name.localeCompare(b.name);
  });
  var h='<div style="position:absolute;top:64px;left:0;z-index:30;background:var(--bg-solid);border:1px solid var(--border2);border-radius:var(--r-md);box-shadow:0 10px 24px rgba(40,32,15,0.14);width:100%;min-width:280px;display:flex;flex-direction:column">';
  h+='<div style="padding:8px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:6px;background:var(--bg2);border-radius:6px;padding:6px 8px">'
    +'<i class="ti ti-search" style="font-size:13px;color:var(--text3)"></i>'
    +'<input id="sessionEmpSearchInput" placeholder="Mitarbeiter suchen…" value="'+esc(sessionEmpSearchQuery)+'" oninput="sessionEmpSearchQuery=this.value;filterSessionEmpList(this.value)" style="border:none;background:none;outline:none;font-size:12.5px;width:100%;color:var(--text)">'
    +'</div></div>';
  h+='<div style="max-height:220px;overflow-y:auto;padding:6px 0">';
  sorted.forEach(function(e){
    var checked=sessionSelectedEmpIds.indexOf(e.id)>=0;
    h+='<label class="sess-emp-opt-row" data-search="'+esc(e.name).toLowerCase()+'" style="display:grid;grid-template-columns:20px 38px 1fr;align-items:center;gap:8px;padding:6px 12px;font-size:12.5px;cursor:pointer;border-radius:4px;white-space:nowrap" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">'
      +'<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleSessionEmpId(\''+e.id+'\')" style="cursor:pointer">'
      +'<span style="font-size:11px;font-weight:700;color:var(--text3)">'+e.role+'</span>'
      +'<span>'+esc(e.name)+'</span>'
      +'</label>';
  });
  h+='<div id="sessionEmpNoResults" style="display:none;padding:14px 12px;text-align:center;font-size:12px;color:var(--text3)">Keine Treffer</div>';
  h+='</div>';
  h+='<div style="display:flex;gap:6px;padding:8px;border-top:1px solid var(--border)">'
    +'<button type="button" class="btn btn-sm" style="flex:1;font-size:11px" onclick="sessionSelectedEmpIds=['+visible.map(function(e){return "'"+e.id+"'";}).join(',')+'];renderSessionEmpDropdown();renderLastContinueBox(sessionSelectedEmpIds.length===1?sessionSelectedEmpIds[0]:null)">Alle</button>'
    +'<button type="button" class="btn btn-sm" style="flex:1;font-size:11px" onclick="sessionSelectedEmpIds=[];renderSessionEmpDropdown();renderLastContinueBox(null)">Keine</button>'
    +'</div>';
  h+='</div>';
  wrap.innerHTML=h;
  if(sessionEmpSearchQuery)filterSessionEmpList(sessionEmpSearchQuery);
}
function toggleSessionEmpDropdown(){sessionEmpDropdownOpen=!sessionEmpDropdownOpen;if(!sessionEmpDropdownOpen)sessionEmpSearchQuery='';renderSessionEmpDropdown();}
function toggleSessionEmpId(id){
  var idx=sessionSelectedEmpIds.indexOf(id);
  if(idx>=0)sessionSelectedEmpIds.splice(idx,1);else sessionSelectedEmpIds.push(id);
  renderSessionEmpDropdown();
  renderLastContinueBox(sessionSelectedEmpIds.length===1?sessionSelectedEmpIds[0]:null);
  if(typeof updateSessionHdSub==='function')updateSessionHdSub();
}
function filterSessionEmpList(q){
  q=(q||'').toLowerCase().trim();
  var wrap=document.getElementById('sessionEmpDropdownWrap');
  if(!wrap)return;
  var anyVisible=false;
  wrap.querySelectorAll('.sess-emp-opt-row').forEach(function(row){
    var match=!q||row.dataset.search.indexOf(q)>=0;
    row.style.display=match?'grid':'none';
    if(match)anyVisible=true;
  });
  var noRes=document.getElementById('sessionEmpNoResults');
  if(noRes)noRes.style.display=anyVisible?'none':'block';
}
function renderLastContinueBox(empId,boxId){
  var box=document.getElementById(boxId||'lastContinueBox');
  if(!box)return;
  var last=(protocols[empId]||[]).filter(function(s){return s.status!=='geplant'&&s.cont&&s.cont.trim();}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
  if(!last){box.innerHTML='';return;}
  box.innerHTML='<div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;gap:10px;box-shadow:inset 3px 0 0 #F08566">'
    +'<i class="ti ti-repeat" style="font-size:16px;color:var(--text);flex-shrink:0;margin-top:1px"></i>'
    +'<div><div style="font-size:12.5px;color:var(--text2)">Aus dem letzten Coaching ('+fd(last.date)+') · Continue</div>'
    +'<div style="font-size:14px;color:var(--text);margin-top:2px">'+esc(last.cont)+'</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-top:3px">Wurde daran gearbeitet?</div></div></div>';
}
function deleteHistorieCallRating(empId,ratingId){
  if(!canEditHistorie())return;
  if(!confirm('Diese Call-Bewertung wirklich löschen? Dies kann nicht rückgängig gemacht werden.'))return;
  var list=callRatings[empId]||[];
  var idx=list.findIndex(function(r){return r.id===ratingId;});
  if(idx<0)return;
  list.splice(idx,1);
  sb.from('call_rating_scores').delete().eq('call_rating_id',ratingId).then(function(){
    sb.from('call_ratings').delete().eq('id',ratingId).then(function(res){if(res&&res.error)alert('Löschen fehlgeschlagen: '+res.error.message);renderTab();}).catch(function(err){alert('Löschen fehlgeschlagen: '+(err&&err.message||err));renderTab();});
  }).catch(function(){
    sb.from('call_ratings').delete().eq('id',ratingId).then(function(res){if(res&&res.error)alert('Löschen fehlgeschlagen: '+res.error.message);renderTab();}).catch(function(err){alert('Löschen fehlgeschlagen: '+(err&&err.message||err));renderTab();});
  });
}
function openQaBewertungModal(empId,editRatingId){
  if(empId)selectedEmp=empId;
  _cbScores={};
  _editingCallRatingId=editRatingId||null;
  var editingRating=editRatingId?((callRatings[selectedEmp]||[]).find(function(r){return r.id===editRatingId;})):null;
  // Alte Bewertung (vor QA_V2_FROM) mit den alten Punkten bearbeiten – sonst gingen Umgang, Vertrauen usw. beim Speichern verloren
  _qaFormCats=editingRating?qaCatsFor(editingRating):CALL_CATS;
  var dateEl=document.getElementById('cb-date');
  if(dateEl)dateEl.value=editingRating?editingRating.date:today();
  var fieldMap={'cb-auftrag':'auftragsnr','cb-bewerter':'bewertetVon','cb-einwand':'einwand','cb-hinweis':'hinweis'};
  Object.keys(fieldMap).forEach(function(id){
    var el=document.getElementById(id);if(el)el.value=editingRating?(editingRating[fieldMap[id]]||''):'';
  });
  var statusEl=document.getElementById('cb-status');if(statusEl)statusEl.value=editingRating?editingRating.status:'nein';
  var b2bEl=document.getElementById('cb-b2b');if(b2bEl)b2bEl.value=editingRating?editingRating.b2b:'B2C';
  var artEl=document.getElementById('cb-abschlussart');if(artEl)artEl.value=editingRating?(editingRating.abschlussArt||''):'';
  // Vergleichsbasis: der letzte Call vor diesem (beim Bearbeiten der davor)
  var _qaList=(callRatings[selectedEmp]||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  var _qaHas=function(r){return r&&r.scores&&Object.keys(r.scores).some(function(k){return r.scores[k]>0;});};
  if(editingRating){var _ix=_qaList.indexOf(editingRating);_qaBase=_qaList.slice(_ix+1).find(_qaHas)||null;}
  else _qaBase=_qaList.find(_qaHas)||null;
  var box=document.getElementById('qaScoringSection');
  if(box){
    var BAND='font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);background:#EFECE5;border-radius:8px;padding:5px 10px;display:flex;justify-content:space-between';
    var h='';
    (_qaFormCats||CALL_CATS).forEach(function(cat,ci){
      h+='<div style="'+BAND+';margin:'+(ci?12:0)+'px 0 4px"><span>'+esc(cat.label)+' · '+Math.round(cat.weight*100)+' %</span><span id="qacg_'+cat.key+'" style="letter-spacing:0;text-transform:none;color:var(--text3)"></span></div>';
      cat.items.forEach(function(k){
        h+='<div style="display:flex;align-items:center;gap:12px;height:36px;padding:0 10px;border-bottom:1px solid #eae7e0">'
          +'<span style="flex:1;min-width:0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ITEM_LABELS[k]+'</span>'
          +'<span id="qal_'+k+'" style="width:62px;flex-shrink:0;font-size:12px;color:var(--text3)"></span>'
          +'<span class="dsh-seg sm" id="qas_'+k+'" role="group" aria-label="'+esc(ITEM_LABELS[k]||k)+'" style="flex-shrink:0">'+[1,2,3,4].map(function(n){return '<button type="button" data-n="'+n+'" onclick="qaTap(\''+k+'\','+n+')" title="'+n+' von 4 – nochmal klicken = leer">'+n+'</button>';}).join('')+'</span>'
          +'<b id="cbv_'+k+'" style="width:18px;text-align:right;font-size:13.5px"></b>'
          +'<span id="qad_'+k+'" style="width:30px;text-align:right;font-size:12px;font-weight:700"></span></div>';
      });
    });
    box.innerHTML='<div class="sf-sub" style="margin:0 0 8px">Nur bewerten, was im Call vorkam · leer wird nicht gezählt · nochmal klicken leert den Punkt</div>'+h;
    (_qaFormCats||CALL_CATS).forEach(function(cat){cat.items.forEach(function(k){
      var v=editingRating&&editingRating.scores&&editingRating.scores[k]?editingRating.scores[k]:0;
      setCbScore(k,v);
    });});
  }
  var kEl=document.getElementById('qaHdKick');if(kEl)kEl.textContent=editingRating?'Call-Bewertung bearbeiten':'Call bewerten';
  var sEl=document.getElementById('qaHdSub');var qe=employees.find(function(e){return String(e.id)===String(selectedEmp);});if(sEl)sEl.textContent=qe?(qe.name+(qe.role?' · '+qe.role:'')):'—';
  updateQaChips();
  var saveBtn=document.getElementById('qaSaveBtn');
  if(saveBtn){
    saveBtn.dataset.eid=selectedEmp;
    saveBtn.innerHTML=editingRating?'<i class="ti ti-check"></i> Änderung speichern':'<i class="ti ti-check"></i> Bewertung speichern';
  }
  var ce=document.getElementById('qaCancelEdit');if(ce)ce.style.display=editingRating?'':'none';
  var ct=document.getElementById('qaCardTitle');if(ct)ct.textContent=editingRating?'Bewertung bearbeiten':'Neue Bewertung';
  qaRenderList();
  openModal('qaBewertungModal');
}
// ── Session im gemeinsamen Popup: letzte Sessions, nach dem Speichern offen bleiben ──
function ncToast(m){var t=document.getElementById('ncToast');if(!t)return;t.textContent=m;t.style.display='block';clearTimeout(window._ncTT);window._ncTT=setTimeout(function(){t.style.display='none';},3000);}
function ncRenderList(){
  var el=document.getElementById('ncList');if(!el)return;
  var t0=today();
  var list=(protocols[selectedEmp]||[]).filter(function(x){return x.status!=='geplant'||x.date<=t0;}).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  var n=document.getElementById('ncListN');if(n)n.textContent='('+list.length+')';
  el.innerHTML=list.length?list.slice(0,5).map(function(x){
    var coach=x.coachId?employees.find(function(e){return String(e.id)===String(x.coachId);}):null;
    var dur=(typeof sessionDuration==='function')?sessionDuration(x.uhrzeit,x.endUhrzeit):0;
    var meta=[coach?'Coach '+coach.name.split(' ')[0]:'',dur&&typeof formatDuration==='function'?formatDuration(dur):'',x.topics&&x.topics.length?x.topics.join(', '):''].filter(Boolean).join(' · ');
    var txt=[x.start?'Start: '+x.start:'',x.stop?'Stop: '+x.stop:'',x.cont?'Continue: '+x.cont:'',x.notes||''].filter(Boolean).join(' · ');
    return '<div title="'+esc(txt)+'" style="display:flex;align-items:flex-start;gap:12px;height:84px;padding:12px;border:1px solid #E4E0D6;border-radius:10px;background:#EFECE5;margin-bottom:6px;overflow:hidden">'
      +'<div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3)">'+fd(x.date)+'</span><span style="font-size:13.5px;font-weight:600;line-height:19px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x.type||'Session')+'</span></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;line-height:18px;color:var(--text3);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(meta)+'</div>'
      +'<div style="font-size:13.5px;line-height:19px;height:38px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:'+(txt?'var(--text)':'var(--text3)')+'">'+(txt?esc(txt):'Kein Rückblick erfasst')+'</div></div></div>';
  }).join(''):'<div style="font-size:13px;color:var(--text3);padding:4px 2px">Noch keine Sessions.</div>';
}
function ncAfterSave(wasEdit){
  var m=document.getElementById('neuesCoachingModal');
  if(!m||m.classList.contains('hidden'))return;
  _puSwitching=true;try{openNeuesCoachingModal(selectedEmp);}finally{_puSwitching=false;}
  var c=document.getElementById('ncSecNew');if(c)c.scrollIntoView({behavior:'smooth',block:'start'});
  ncToast(wasEdit?'Session aktualisiert':'Session gespeichert');
}
function openNeuesCoachingModal(empId){
  if(empId)selectedEmp=empId;
  _editingSessionId=null;
  ncSelectedEmpIds=empId?[empId]:[];
  ncEmpDropdownOpen=false;ncEmpSearchQuery='';
  renderNcEmpDropdown();
  populateCoachingCategorySelect('sess-category');
  populateCoachingTypeSelect('sess-category','sess-type',null);
  var topicEl=document.getElementById('sess-topic-sel');
  if(topicEl&&topicEl.options.length<=1){
    SESSION_TOPICS.forEach(function(t){var o=document.createElement('option');o.value=t;o.textContent=t;topicEl.appendChild(o);});
  }
  var fmEl=document.getElementById('sess-focus-metric');
  if(fmEl&&fmEl.options.length<=1){
    FOCUS_METRICS.forEach(function(m){var o=document.createElement('option');o.value=m.key;o.textContent=m.label;fmEl.appendChild(o);});
  }
  var dateEl=document.getElementById('sess-date');
  if(dateEl)dateEl.value=today();
  ['sess-time','sess-end-time','sess-start','sess-stop','sess-cont','sess-note'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  if(topicEl)topicEl.value='';
  if(fmEl)fmEl.value='';
  var saveBtn=document.getElementById('ncSaveBtn');
  if(saveBtn)saveBtn.dataset.eid=selectedEmp;
  renderLastContinueBox(selectedEmp,'ncLastContinueBox');
  if(typeof sfReset==='function')sfReset();
  updateNcHdSub();
  ncRenderList();
  var nf=document.getElementById('ncFrom');if(nf){var cn=(typeof currentCoach!=='undefined'&&currentCoach)?currentCoach.name:((typeof currentAuthUser!=='undefined'&&currentAuthUser&&typeof resolveNonEmployeeName==='function'&&resolveNonEmployeeName(currentAuthUser.email))||'');nf.textContent='';}
  openModal('neuesCoachingModal');
}

// ── Mitarbeiterkarte: Banner in allen Bereichen, „Neu …“-Formulare zum Aufklappen ──
function puBanHtml(lbl,BK){return '<div class="pu-ban" style="border-radius:14px;padding:16px 18px;margin-bottom:14px;min-height:148px;box-sizing:border-box;color:#fff;background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%)"><div style="font-size:11px;font-weight:600;letter-spacing:.09em;margin-bottom:10px">'+esc(lbl)+'</div><div style="display:grid;grid-template-columns:repeat('+BK.length+',minmax(0,1fr))">'
  +BK.map(function(x,i){return '<div style="padding:0 12px;'+(i?'border-left:1px solid rgba(255,255,255,.25);':'padding-left:0;')+'min-width:0"><div style="font-size:10.5px;font-weight:600;letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x[0])+'</div><div style="font-size:'+(String(x[1]).length>6?'24':'32')+'px;font-weight:300;line-height:1.15;white-space:nowrap">'+esc(String(x[1]))+'</div><div style="font-size:12.5px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x[2]||'')+'</div></div>';}).join('')+'</div></div>';}
function puSesStats(e){var P=(protocols[e.id]||[]).filter(function(p){return p.date;}),t=today(),mk=t.slice(0,7),done=P.filter(function(p){return p.status!=='geplant'&&p.date<=t;}).sort(function(a,b){return a.date<b.date?1:-1;}),plan=P.filter(function(p){return p.status==='geplant'&&p.date>=t;}).sort(function(a,b){return a.date<b.date?-1:1;});
  var w0=kalMon(t),wk=0;for(var i=1;i<=4;i++){var a=kalAdd(w0,-7*i),b=kalAdd(a,6);if(done.some(function(p){return p.date>=a&&p.date<=b&&(p.type||'')==='Weekly';}))wk++;}
  return {mon:done.filter(function(p){return p.date.slice(0,7)===mk;}).length,last:done[0],next:plan[0],nplan:plan.length,wk:wk};}
function puBanFor(k,e){var y=today().slice(0,4),mk=today().slice(0,7),mn=MONTH_NAMES_ZIEL[+mk.slice(5)-1],open=0;try{open=aufgAll().filter(function(o){return String(o.emp)===String(e.id);}).length;}catch(er){}
  if(k==='se'){var s=puSesStats(e);return puBanHtml(e.name.toUpperCase()+' · COACHING',[['SESSIONS',s.mon,mn],['LETZTE',s.last?kalF(s.last.date):'–',s.last?(s.last.type||'Session'):'noch keine'],['GEPLANT',s.nplan,s.next?'nächste '+kalF(s.next.date):'keine geplant'],['WEEKLYS',s.wk+'/4','letzte 4 Wochen'],['AUFGABEN',open,'offen']]);}
  if(k==='en'){var EV=(reviews[e.id]||[]).filter(function(r){return r.einwand!==undefined;}).sort(function(a,b){return (a.date||'')<(b.date||'')?1:-1;}),L0=EV[0],L1=EV[1];
    var avg=function(r,keys){if(!r)return null;var v=keys.map(function(k){return +r[k];}).filter(function(x){return !isNaN(x)&&x>0;});return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null;};
    var SK=['opener','einwand','loop','bedarf','abschluss','gespraech','zusammenfassung','produkt'],WI=['motivation','coach','zuverl','team'],RE=['crOEM','crTW','crSY','crMY'];
    var f=function(keys){var a=avg(L0,keys),b=avg(L1,keys);return [a==null?'–':kalNf(Math.round(a*10)/10),a!=null&&b!=null?((a-b>=0?'+':'−')+kalNf(Math.abs(Math.round((a-b)*10)/10))+' zur letzten'):(L0?'erste Bewertung':'')];};
    var G=(goals[e.id]||[]).filter(function(g){return !g.done&&g.status!=='done'&&g.status!=='erreicht';}),s1=f(SK),s2=f(WI),s3=f(RE);
    return puBanHtml(e.name.toUpperCase()+' · ENTWICKLUNG',[['LETZTE',L0&&L0.date?kalF(L0.date):'–',EV.length+(EV.length===1?' Bewertung':' Bewertungen')],['SKILL',s1[0],s1[1]],['WILL',s2[0],s2[1]],['RESULT',s3[0],s3[1]],['ZIELE',G.length,'offen']]);}
  if(k==='ca'){var R=(callRatings[e.id]||[]).slice().sort(function(a,b){return (a.date||'')<(b.date||'')?1:-1;}),q=typeof qaCallsDue==='function'?qaCallsDue(e.id):{cnt:0,target:5},sc=R.filter(function(r){return r.score!=null;}),avg=sc.length?Math.round(sc.reduce(function(a,r){return a+(+r.score||0);},0)/sc.length):null;
    return puBanHtml(e.name.toUpperCase()+' · CALLS',[['BEWERTET',q.cnt+'/'+q.target,'Calls diese Woche'],['Ø SCORE',avg==null?'–':avg+(avg<=100?' %':''),sc.length+' Bewertungen'],['LETZTE',R[0]&&R[0].date?kalF(R[0].date):'–',R[0]?'Bewertung':'noch keine'],['GESAMT',R.length,'Bewertungen'],['AUFGABEN',open,'offen']]);}
  if(k==='ov'){var S=ovStats(e);return puBanHtml(e.name.toUpperCase()+(e.role?' · '+e.role:'')+' · '+mn.toUpperCase(),[['ZIEL BIS HEUTE',S.pct==null?'–':S.pct+' %',S.so.ziel?'hochgerechnet '+ztEur(S.hr):'kein Ziel hinterlegt'],['TREND',S.trend==null?'–':(S.trend>=0?'+':'−')+Math.abs(S.trend)+' %','Marge/Tag zum Vormonat'],['NÄCHSTER TERMIN',S.nx?kalF(S.nx.d):'–',S.nx?S.nx.l:'nichts geplant'],['ÜBERFÄLLIG',S.od,S.od?'Aufgaben':'nichts überfällig'],['URLAUB FREI',kalNf(S.frei),'Tage '+mk.slice(0,4)]]);}
  var bm=beschaeftigungsmonat(e,mk),ist=istForEmpMonth(e.id,mk),o=0;(performance[e.id]||[]).forEach(function(r){if(r.date&&r.date.slice(0,7)===mk)o+=r.optGesamt||0;});var k2=kalKonto(e.id,y),s2=puSesStats(e);
  return puBanHtml(e.name.toUpperCase()+(e.role?' · '+e.role:''),[['IM UNTERNEHMEN','Monat '+bm,e.startDate?'seit '+kalF(e.startDate)+e.startDate.slice(2,4):''],['MARGE',ztEur(ist),mn],['OPT.',Math.round(o).toLocaleString('de-DE'),mn],['SESSIONS',s2.mon,mn],['AUFGABEN',open,'offen']]);}
function puBanEnsure(id,eid){var m=document.getElementById(id);if(!m)return;var e=kalEmp(eid||selectedEmp||(typeof _puEmp!=='undefined'&&_puEmp&&(_puEmp.id||_puEmp)));if(!e)return;var cfg=PU_BAN_AT[id],anchor=null,host=null;
  if(cfg){anchor=document.getElementById(cfg[1]);host=anchor&&anchor.parentElement;}
  else{host=[].slice.call(m.querySelectorAll('div')).find(function(x){var cs=getComputedStyle(x);return cs.overflowY==='auto'&&x.closest('.modal-ov')===m;});anchor=host&&host.firstElementChild;}
  if(!host)return;if([].slice.call(host.querySelectorAll('div')).some(function(x){return /linear-gradient/.test(x.getAttribute('style')||'')&&!x.classList.contains('pu-ban');}))return;
  var old=host.querySelector(':scope > .pu-ban');var html=puBanFor(cfg?cfg[0]:'gen',e);var d=document.createElement('div');d.innerHTML=html;var nb=d.firstElementChild;
  if(old)host.replaceChild(nb,old);else host.insertBefore(nb,anchor||host.firstChild);}
function puCollapse(id){var el=document.getElementById(id);if(!el||el.dataset.puCol)return;var hd=el.firstElementChild;if(!hd)return;el.dataset.puCol='1';
  var body=document.createElement('div');body.className='pu-colb';while(hd.nextSibling)body.appendChild(hd.nextSibling);el.appendChild(body);
  var pl=document.createElement('span');pl.className='at-pl';pl.innerHTML='<i class="ti ti-plus"></i>';hd.insertBefore(pl,hd.firstChild);hd.classList.add('pu-colh');hd.style.marginBottom='0';hd.style.cursor='pointer';
  var hint=document.createElement('span');hint.className='kal-note pu-colhint';hint.style.cssText='margin-left:auto;font-weight:400';hd.appendChild(hint);
  hd.addEventListener('click',function(ev){if(ev.target.closest('input,select,button,a'))return;puColSet(id,body.style.display==='none');});puColSet(id,false);}
function puColSet(id,open){var el=document.getElementById(id);if(!el)return;var b=el.querySelector(':scope > .pu-colb'),h=el.querySelector('.pu-colhint'),hd=el.firstElementChild;if(!b)return;b.style.display=open?'':'none';if(hd)hd.style.marginBottom=open?'10px':'0';if(h)h.textContent=open?'zuklappen':'zum Aufklappen klicken';}
function puColOpen(id){puCollapse(id);puColSet(id,true);}

// ── Übersicht: Lagebild statt Wiederholung ──
function ovSoll(e,mk){var x=ztEmpMonth(e,mk),t=today(),all=0,done=0;ztWeeks(mk).forEach(function(wm,i){var w=x.weeks[i];if(!w)return;if(w.ds){w.ds.forEach(function(d){all++;if(d<t)done++;});}else{all+=w.n;var wd=0;for(var j=0;j<5;j++){var d=kalAdd(wm.from,j);if(d.slice(0,7)===mk&&d<t&&!kalWknd(d))wd++;}done+=Math.min(w.n,wd);}});return {ziel:x.ziel,anteil:all?x.ziel*done/all:0,done:done,all:all};}
function ovStats(e){var t=today(),mk=t.slice(0,7),pm=kalI(new Date(+mk.slice(0,4),+mk.slice(5,7)-2,1)).slice(0,7),so=ovSoll(e,mk),ist=istForEmpMonth(e.id,mk),istPm=istForEmpMonth(e.id,pm);
  var hr=so.done?ist/so.done*so.all:0,dayNow=so.done?ist/so.done:0,pmDays=0;ztDaysOfMonth(pm).forEach(function(d){if(kalWorkday(e,d)&&!(kalOn(e.id,d)&&kalOn(e.id,d).art!=='krank'))pmDays+=(kalOn(e.id,d)?0.5:1);});var dayPm=pmDays?istPm/pmDays:0;
  var nx=null;(protocols[e.id]||[]).forEach(function(p){if(p.status==='geplant'&&p.date>=t&&(!nx||p.date<nx.d))nx={d:p.date,l:p.type||'Session'};});
  absences.forEach(function(a){if(String(a.employeeId)===String(e.id)&&a.status!=='abgelehnt'&&a.status!=='storniert'&&a.bis>=t&&(!nx||a.von<nx.d))nx={d:a.von>t?a.von:t,l:KAL_ART[kalShowArt(a)]};});
  var od=0;try{od=aufgAll().filter(function(o){return String(o.emp)===String(e.id)&&aufgState(o).c==='od';}).length;}catch(er){}
  return {so:so,ist:ist,pct:so.anteil?Math.round(ist/so.anteil*100):null,hr:hr,trend:dayPm?Math.round((dayNow-dayPm)/dayPm*100):null,nx:nx,od:od,frei:kalKonto(e.id,t.slice(0,4)).frei};}


// ── Übersicht: Zeitstrahl, Profil, nächste 4 Wochen, nächste Schritte ──
function ovCard(id,title,right,body){return '<div id="'+id+'" style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700;font-size:14px;color:var(--text)">'+title+(right?'<span style="margin-left:auto;font-size:11.5px;font-weight:500;color:var(--text3)">'+right+'</span>':'')+'</div>'+body+'</div>';}
function ovTimeline(e){var t=today(),m0=kalMon(t),N=8,W=[];for(var i=N-1;i>=0;i--){var a=kalAdd(m0,-7*i);W.push({from:a,to:kalAdd(a,6),kw:kalKw(a)});}
  var P=performance[e.id]||[];W.forEach(function(w){var by={};P.forEach(function(r){if(r.date>=w.from&&r.date<=w.to&&r.date<t){by[r.date]=(by[r.date]||0)+(r.margeGesamt||r.margin||0);}});var d=Object.keys(by);w.v=d.length?d.reduce(function(s,k){return s+by[k];},0)/d.length:null;});
  var x=ztEmpMonth(e,t.slice(0,7)),tg=x.opt*x.mo||null,V=W.map(function(w){return w.v;}).filter(function(v){return v!=null;});if(!V.length)return '<div class="kal-note">Noch keine Leistungsdaten in den letzten 8 Wochen.</div>';
  var mx=Math.max.apply(null,V.concat(tg?[tg]:[]))*1.12,mn=Math.min.apply(null,V.concat(tg?[tg]:[]))*0.8,w=620,h=150,X=function(i){return 24+i*(w-48)/(N-1);},Y=function(v){return 20+(1-(v-mn)/(mx-mn))*(h-62);};
  var svg='<svg viewBox="0 0 '+w+' '+(h+40)+'" style="width:100%;display:block">';
  // Abwesenheiten als Band
  W.forEach(function(wk,i){var u=0,k=0;for(var j=0;j<5;j++){var d=kalAdd(wk.from,j),a=kalOn(e.id,d);if(a&&!a.fixed){if(a.art==='krank')k++;else u++;}}if(u||k){svg+='<rect x="'+(X(i)-15)+'" y="16" width="30" height="'+(h-60)+'" rx="5" fill="'+(k>u?'#5F564C':'#CDBB9E')+'" opacity="'+(k>u?'.18':'.4')+'"/><text x="'+X(i)+'" y="'+(h-32)+'" text-anchor="middle" font-size="10" fill="#7A7268">'+(k>u?'krank ':'Urlaub ')+(u+k)+' T</text>';}});
  if(tg)svg+='<line x1="24" x2="'+(w-24)+'" y1="'+Y(tg).toFixed(1)+'" y2="'+Y(tg).toFixed(1)+'" stroke="#F08566" stroke-dasharray="4 4"/><text x="'+(w-24)+'" y="'+(Y(tg)-5).toFixed(1)+'" text-anchor="end" font-size="10" fill="#C2522F">Ziel '+ztEur(tg)+'/Tag</text>';
  var pts=[];W.forEach(function(wk,i){if(wk.v!=null)pts.push(X(i).toFixed(1)+','+Y(wk.v).toFixed(1));});svg+='<polyline fill="none" stroke="#5C554C" stroke-width="2.2" points="'+pts.join(' ')+'"/>';
  var best=Math.max.apply(null,V);W.forEach(function(wk,i){if(wk.v==null)return;svg+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(wk.v).toFixed(1)+'" r="3.4" fill="#5C554C"><title>KW '+wk.kw+': '+ztEur(wk.v)+'/Tag</title></circle>';if(wk.v===best&&V.length>2)svg+='<text x="'+X(i).toFixed(1)+'" y="'+(Y(wk.v)-10).toFixed(1)+'" text-anchor="middle" font-size="13" fill="#C9A77E">★</text>';});
  // Sessions
  var S=(protocols[e.id]||[]).filter(function(p){return p.date&&p.status!=='geplant'&&p.date>=W[0].from&&p.date<=t;}),seen={};
  S.forEach(function(p){var i=W.findIndex(function(wk){return p.date>=wk.from&&p.date<=wk.to;});if(i<0||seen[i])return;seen[i]=1;var cx=X(i),cy=h-12;svg+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+(W[i].v!=null?Y(W[i].v)+6:20).toFixed(1)+'" y2="'+(cy-9)+'" stroke="#F08566" stroke-width="1" opacity=".55"/><circle cx="'+cx.toFixed(1)+'" cy="'+cy+'" r="9" fill="#F08566"><title>'+esc(p.type||'Session')+' am '+kalF(p.date)+'</title></circle><text x="'+cx.toFixed(1)+'" y="'+(cy+4)+'" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">S</text><text x="'+cx.toFixed(1)+'" y="'+(cy+21)+'" text-anchor="middle" font-size="9.5" fill="#7A7268">'+esc((p.type||'Session').slice(0,12))+'</text>';});
  svg+=W.map(function(wk,i){return '<text x="'+X(i).toFixed(1)+'" y="'+(h+34)+'" text-anchor="middle" font-size="10.5" fill="'+(i===N-1?'#1d1c1a':'#9a9a96')+'" font-weight="'+(i===N-1?700:400)+'">KW '+wk.kw+'</text>';}).join('')+'</svg>';
  // Aussage
  var txt='',si=Object.keys(seen).map(Number).sort(function(a,b){return a-b;});
  if(si.length){var i0=si[si.length-1],a0=W[i0].v,after=W.slice(i0+1).map(function(wk){return wk.v;}).filter(function(v){return v!=null;});
    if(after.length&&a0!=null){var up=after[after.length-1]-a0;txt='Seit der letzten Session (KW '+W[i0].kw+') '+(up>=0?'steigt':'sinkt')+' die Marge/Tag um <b>'+ztEur(Math.abs(up))+'</b>'+(after.length>1?' über '+after.length+' Wochen':'')+'.';}}
  if(!txt){var f=V[0],l=V[V.length-1];txt='Marge/Tag in 8 Wochen: '+ztEur(f)+' → <b>'+ztEur(l)+'</b>'+(si.length?'':' · in diesem Zeitraum keine Session dokumentiert')+'.';}
  return svg+'<div class="kal-note" style="margin-top:4px;font-size:12.5px;color:var(--text2)">'+txt+'</div>';}
function ovProfile(e){var EV=(reviews[e.id]||[]).filter(function(r){return r.einwand!==undefined;}).sort(function(a,b){return (a.date||'')<(b.date||'')?1:-1;}),L0=EV[0],L1=EV[1];
  var D=[['opener','Einstieg'],['einwand','Einwand'],['loop','Loop'],['bedarf','Bedarf'],['abschluss','Abschluss'],['gespraech','Gespräch'],['zusammenfassung','Zusammenf.'],['produkt','Produkt'],['motivation','Motivation'],['coach','Coachability'],['zuverl','Zuverl.'],['team','Team']],cx=120,cy=112,R=80;
  var _D=D.filter(function(d){return (L0&&+L0[d[0]]>0)||(L1&&+L1[d[0]]>0);});if(_D.length>=3)D=_D;
  var pt=function(i,v){var a=2*Math.PI*i/D.length;return (cx+R*v/5*Math.sin(a)).toFixed(1)+','+(cy-R*v/5*Math.cos(a)).toFixed(1);};
  var poly=function(r,col,op){return '<polygon points="'+D.map(function(d,i){return pt(i,Math.max(0,Math.min(5,+r[d[0]]||0)));}).join(' ')+'" fill="'+col+'" fill-opacity="'+op+'" stroke="'+col+'" stroke-width="1.6"/>';};
  var rad='<svg viewBox="0 0 240 228" style="width:100%;max-width:240px;display:block;margin:0 auto">'+[1,2,3,4,5].map(function(r){return '<polygon points="'+D.map(function(d,i){return pt(i,r);}).join(' ')+'" fill="none" stroke="#E4E0D6"/>';}).join('')
    +(L1?poly(L1,'#C9A77E',.18):'')+(L0?poly(L0,'#F08566',.22):'')+D.map(function(d,i){var a=2*Math.PI*i/D.length;return '<text x="'+(cx+(R+17)*Math.sin(a)).toFixed(1)+'" y="'+(cy-(R+17)*Math.cos(a)+3).toFixed(1)+'" text-anchor="middle" font-size="9.5" fill="#5C554C">'+d[1]+'</text>';}).join('')+'</svg>';
  if(!L0)rad='<div class="kal-note" style="padding:40px 0;text-align:center">Noch keine Bewertung.<br><a href="#" onclick="puGo(\'en\');return false">Jetzt bewerten</a></div>';
  var S=ovStats(e),t=today(),mk=t.slice(0,7),so=ovSoll(e,mk),io=0;(performance[e.id]||[]).forEach(function(r){if(r.date&&r.date.slice(0,7)===mk&&r.date<t)io+=r.optGesamt||0;});var x=ztEmpMonth(e,mk),optSoll=so.all?x.zielOpt*so.done/so.all:0;
  var st=puSesStats(e),q=typeof qaCallsDue==='function'?qaCallsDue(e.id):{cnt:0,target:5};
  var ring=function(p,l,s){var r=26,c=2*Math.PI*r,pc=p==null?0:p,col=pc>=100?'#5E9B78':pc>=80?'#C9A77E':'#F08566';return '<div style="text-align:center;min-width:0"><svg viewBox="0 0 70 70" style="width:68px;height:68px"><circle cx="35" cy="35" r="'+r+'" fill="none" stroke="#EFECE5" stroke-width="7"/><circle cx="35" cy="35" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+(c*Math.min(pc,100)/100).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 35 35)"/><text x="35" y="39" text-anchor="middle" font-size="13" font-weight="700" fill="#1d1c1a">'+(p==null?'–':p+'%')+'</text></svg><div style="font-size:11px;font-weight:700">'+l+'</div><div class="kal-note" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+s+'</div></div>';};
  var rings='<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px">'+ring(S.pct,'Marge',S.so.ziel?'vom Ziel bis heute':'kein Ziel')+ring(optSoll?Math.round(io/optSoll*100):null,'Opt.',Math.round(io)+' von '+Math.round(optSoll))+ring(Math.round(st.wk/4*100),'Weeklys',st.wk+' von 4 Wochen')+ring(Math.round(q.cnt/q.target*100),'Calls',q.cnt+' von '+q.target+' bewertet')+'</div>';
  var note='';if(L0){var sc=D.map(function(d){return [d[1],+L0[d[0]]||0,L1?(+L0[d[0]]||0)-(+L1[d[0]]||0):0];}),hi=sc.slice().sort(function(a,b){return b[1]-a[1];}).slice(0,2),lo=sc.slice().sort(function(a,b){return a[1]-b[1];})[0],gr=sc.slice().sort(function(a,b){return b[2]-a[2];})[0];
    note='Stärken: '+hi.map(function(x){return x[0];}).join(', ')+' · Lernfeld: '+lo[0]+(L1&&gr[2]>0?' · am meisten verbessert: '+gr[0]+' (+'+kalNf(gr[2])+')':'');}
  return '<div style="display:grid;grid-template-columns:240px minmax(0,1fr);gap:12px;align-items:center">'+rad+'<div>'+rings+(note?'<div class="kal-note" style="margin-top:10px;font-size:12px;color:var(--text2)">'+esc(note)+'</div>':'')+'</div></div>';}
function ovNext4(e){var t=today(),m0=kalMon(t),L=[];try{L=aufgAll().filter(function(o){return String(o.emp)===String(e.id);});}catch(er){}
  var cell=function(w){var it=[],a=w,b=kalAdd(w,6),loc=kalIsVlc(e)?'VLC':'MUC';
    absences.filter(function(x){return String(x.employeeId)===String(e.id)&&x.status!=='abgelehnt'&&x.status!=='storniert'&&!x.fixed&&x.bis>=a&&x.von<=b;}).forEach(function(x){var n=kalDays(x).filter(function(d){return d>=a&&d<=b;}).length*(x.halb?0.5:1);if(n)it.push(['ab',KAL_ART[kalShowArt(x)]+' '+kalNf(n)+' T'+(x.status==='offen'?' · Antrag':'')]);});
    for(var j=0;j<5;j++){var d=kalAdd(a,j),hn=kalHolE(e,d);if(hn)it.push(['h',hn]);}
    (protocols[e.id]||[]).filter(function(p){return p.status==='geplant'&&p.date>=a&&p.date<=b;}).forEach(function(p){it.push(['s',(p.type||'Session')+' '+KAL_WD[kalP(p.date).getDay()]]);});
    L.filter(function(o){return o.due>=a&&o.due<=b||(w===m0&&o.due<a);}).forEach(function(o){it.push([aufgState(o).c==='od'?'od':'t',o.art+(aufgState(o).c==='od'?' · überfällig':'')]);});
    return '<div class="ov-wk'+(w===m0?' cur':'')+'"><b>KW '+kalKw(w)+(w===m0?' <span class="kal-note">· jetzt</span>':'')+'</b><div class="kal-note">'+kalF(a)+'–'+kalF(kalAdd(a,4))+'</div><div class="ov-its">'+(it.length?it.slice(0,4).map(function(x){return '<span class="ov-it '+x[0]+'">'+esc(x[1])+'</span>';}).join(''):'<span class="kal-note">nichts geplant</span>')+'</div></div>';};
  return '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">'+[0,1,2,3].map(function(i){return cell(kalAdd(m0,7*i));}).join('')+'</div>';}
function ovSteps(e){var t=today(),S=[],L=[];try{L=aufgAll().filter(function(o){return String(o.emp)===String(e.id);}).sort(function(a,b){return a.due<b.due?-1:1;});}catch(er){}
  var key=function(k){return jsq(k);},st=puSesStats(e),rs='';try{rs=kalWeeklyReason(e)||'';}catch(er){}
  var lastD=st.last?kalDiff(st.last.date,t):null;
  if(rs||lastD==null||lastD>14){var wk=L.find(function(o){return o.art==='Weekly';});S.push(['Weekly führen',(rs?rs:'')+(lastD!=null?(rs?' · ':'')+'letzte Session vor '+lastD+' Tagen':' · noch keine Session dokumentiert'),'Session erfassen',wk?'aufgDone(\''+key(wk.key)+'\')':'window._puOpenNew=true;puGo(\'se\')']);}
  L.filter(function(o){return aufgState(o).c==='od'&&o.art!=='Weekly';}).slice(0,2).forEach(function(o){S.push([o.art+(o.kind==='task'?': '+o.t:''),aufgState(o).l+(o.s?' · '+o.s:''),aufgActLabel(o),'aufgDone(\''+key(o.key)+'\')']);});
  var q=typeof qaCallsDue==='function'?qaCallsDue(e.id):{due:0};if(q.due>0)S.push([q.due+' Call'+(q.due>1?'s':'')+' bewerten',q.cnt+' von '+q.target+' Calls diese Woche bewertet','Call bewerten','window._puOpenNew=true;puGo(\'ca\')']);
  var pg=L.find(function(o){return o.art==='Performance Review'&&aufgState(o).c!=='od';});if(pg)S.push(['Performance Review vorbereiten','fällig '+aufgFmt(pg.due)+' · '+(pg.s||''),'Aufgabe öffnen','aufgOpenEmp(\''+key(pg.key)+'\')']);
  var so=ovStats(e);if(so.pct!=null&&so.pct<85)S.push(['Ziel prüfen','Marge bei '+so.pct+' % des Ziels bis heute · hochgerechnet '+ztEur(so.hr),'Zur Zielvereinbarung','closeModal(\'coachingInfoModal\');view=\'team\';wiegandView=\'ziel\';ZT.open[\'m'+t.slice(0,7)+'\']=true;renderSidebar();renderMain();']);
  if(!S.length)return '<div class="kal-note" style="padding:6px 0">Nichts Dringendes offen. Weiter so.</div>';
  return S.slice(0,3).map(function(s,i){return '<div class="ov-step"><span class="n">'+(i+1)+'</span><div style="min-width:0"><b>'+esc(s[0])+'</b><div class="kal-note" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(s[1])+'</div></div>'+(kalCanEdit()?'<button class="btn btn-primary btn-sm" onclick="'+s[3]+'">'+esc(s[2])+'</button>':'')+'</div>';}).join('');}
function ovSections(e){return ovCard('ovSecZ','Die letzten 8 Wochen','Marge/Tag · S = Session · ★ = Bestwert · Band = Abwesenheit',ovTimeline(e))
  +ovCard('ovSecP','Profil','Skill & Will · koralle = letzte Bewertung, sand = davor',ovProfile(e))
  +ovCard('ovSecW','Die nächsten 4 Wochen','Termine, Abwesenheiten, Fälligkeiten',ovNext4(e))
  +ovCard('ovSecS','Nächste Schritte','vom Board vorgeschlagen',ovSteps(e));}

// ── Übersicht v2: Leistung + Termine (8 Wochen zurück, 4 voraus) · Profil + nächste Schritte ──
function ovTimeline2(e){var t=today(),m0=kalMon(t),NP=8,NF=4,W=[];for(var i=NP-1;i>=-NF;i--){var a=kalAdd(m0,-7*i);W.push({from:a,to:kalAdd(a,6),kw:kalKw(a),fut:a>m0,cur:a===m0});}
  var P=performance[e.id]||[];W.forEach(function(w){if(w.fut){w.v=null;return;}var by={};P.forEach(function(r){if(r.date>=w.from&&r.date<=w.to&&r.date<t)by[r.date]=(by[r.date]||0)+(r.margeGesamt||r.margin||0);});var d=Object.keys(by);w.v=d.length?d.reduce(function(s,k){return s+by[k];},0)/d.length:null;});
  var x=ztEmpMonth(e,t.slice(0,7)),tg=x.opt*x.mo||null,V=W.map(function(w){return w.v;}).filter(function(v){return v!=null;});
  var N=W.length,w=640,h=170,mx=Math.max.apply(null,(V.length?V:[1]).concat(tg?[tg]:[]))*1.15,mn=V.length?Math.min.apply(null,V.concat(tg?[tg]:[]))*0.75:0,X=function(i){return 26+i*(w-52)/(N-1);},Y=function(v){return 18+(1-(v-mn)/(mx-mn||1))*(h-70);};
  var svg='<svg viewBox="0 0 '+w+' '+(h+26)+'" style="width:100%;display:block">';
  var fx=X(NP-0.5);svg+='<rect x="'+fx.toFixed(1)+'" y="8" width="'+(w-fx-6).toFixed(1)+'" height="'+(h-20)+'" rx="8" fill="#fff" opacity=".55"/><text x="'+(fx+8).toFixed(1)+'" y="20" font-size="10" fill="#9a9a96">voraus</text>';
  W.forEach(function(wk,i){var u=0,k=0;for(var j=0;j<5;j++){var d=kalAdd(wk.from,j),a=kalOn(e.id,d);if(a&&!a.fixed){if(a.art==='krank')k++;else u++;}}if(u||k)svg+='<rect x="'+(X(i)-14).toFixed(1)+'" y="26" width="28" height="'+(h-78)+'" rx="5" fill="'+(k>u?'#5F564C':'#CDBB9E')+'" opacity="'+(k>u?'.2':'.45')+'"><title>KW '+wk.kw+': '+(u?u+' T Urlaub ':'')+(k?k+' T krank':'')+'</title></rect><text x="'+X(i).toFixed(1)+'" y="'+(h-46)+'" text-anchor="middle" font-size="9.5" fill="#7A7268">'+(k>u?'krank':'Urlaub')+' '+(u+k)+' T</text>';});
  if(tg)svg+='<line x1="26" x2="'+(w-26)+'" y1="'+Y(tg).toFixed(1)+'" y2="'+Y(tg).toFixed(1)+'" stroke="#F08566" stroke-dasharray="4 4" opacity=".8"/><text x="'+(w-26)+'" y="'+(Y(tg)-5).toFixed(1)+'" text-anchor="end" font-size="10" fill="#C2522F">Ziel '+ztEur(tg)+'/Tag</text>';
  var pts=[];W.forEach(function(wk,i){if(wk.v!=null)pts.push(X(i).toFixed(1)+','+Y(wk.v).toFixed(1));});if(pts.length)svg+='<polyline fill="none" stroke="#5C554C" stroke-width="2.2" points="'+pts.join(' ')+'"/>';
  var best=V.length?Math.max.apply(null,V):null;W.forEach(function(wk,i){if(wk.v==null)return;svg+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(wk.v).toFixed(1)+'" r="3.4" fill="#5C554C"><title>KW '+wk.kw+': '+ztEur(wk.v)+'/Tag</title></circle>';if(wk.v===best&&V.length>2)svg+='<text x="'+X(i).toFixed(1)+'" y="'+(Y(wk.v)-10).toFixed(1)+'" text-anchor="middle" font-size="13" fill="#C9A77E">★</text>';});
  var cy=h-22;(protocols[e.id]||[]).filter(function(p){return p.date&&p.date>=W[0].from&&p.date<=W[N-1].to;}).forEach(function(p){var i=W.findIndex(function(wk){return p.date>=wk.from&&p.date<=wk.to;});if(i<0)return;var pl=p.status==='geplant';
    svg+='<circle cx="'+X(i).toFixed(1)+'" cy="'+cy+'" r="9" fill="'+(pl?'#fff':'#F08566')+'" stroke="#F08566" stroke-width="1.6"'+(pl?' stroke-dasharray="3 2"':'')+'><title>'+esc(p.type||'Session')+(pl?' geplant ':' am ')+kalF(p.date)+'</title></circle><text x="'+X(i).toFixed(1)+'" y="'+(cy+4)+'" text-anchor="middle" font-size="10" fill="'+(pl?'#C2522F':'#fff')+'" font-weight="700">S</text>';});
  svg+=W.map(function(wk,i){return '<text x="'+X(i).toFixed(1)+'" y="'+(h+16)+'" text-anchor="middle" font-size="10.5" fill="'+(wk.cur?'#C2522F':wk.fut?'#B5ADA2':'#9a9a96')+'" font-weight="'+(wk.cur?700:400)+'">KW '+wk.kw+'</text>';}).join('')+'</svg>';
  // Kopfzeile wie im Dashboard
  var S=ovStats(e),st=puSesStats(e),cw=W[NP-1],nS=(protocols[e.id]||[]).filter(function(p){return p.status!=='geplant'&&p.date>=W[0].from&&p.date<=t;}).length;
  var head='<div class="ov-ph"><span>Marge/Tag laufende Woche</span><b>'+(cw.v!=null?ztEur(cw.v):'–')+'</b><span>'+(tg?'Ziel '+ztEur(tg)+' · ':'')+nS+' Sessions in 8 Wochen · noch '+st.nplan+' geplant'+(S.pct!=null?' · Ziel bis heute <b>'+S.pct+' %</b>':'')+'</span><span class="ov-lg"><i style="background:#5C554C"></i>Marge/Tag <i class="ci"></i>Session <i class="ci pl"></i>geplant <i style="background:#CDBB9E"></i>Abwesenheit</span></div>';
  // Aussage
  var txt='',si=[];W.forEach(function(wk,i){if(!wk.fut&&(protocols[e.id]||[]).some(function(p){return p.status!=='geplant'&&p.date>=wk.from&&p.date<=wk.to;}))si.push(i);});
  if(si.length){var i0=si[si.length-1],a0=W[i0].v,after=W.slice(i0+1,NP).map(function(wk){return wk.v;}).filter(function(v){return v!=null;});if(after.length&&a0!=null){var up=after[after.length-1]-a0;txt='Seit der letzten Session (KW '+W[i0].kw+') '+(up>=0?'steigt':'sinkt')+' die Marge/Tag um <b>'+ztEur(Math.abs(up))+'</b>.';}}
  if(!txt&&V.length)txt='Marge/Tag in 8 Wochen: '+ztEur(V[0])+' → <b>'+ztEur(V[V.length-1])+'</b>.';
  // Wochenkacheln (jetzt + 3)
  var L=[];try{L=aufgAll().filter(function(o){return String(o.emp)===String(e.id);});}catch(er){}
  var tiles=[0,1,2,3].map(function(n){var a=kalAdd(m0,7*n),b=kalAdd(a,6),it=[];
    absences.filter(function(x){return String(x.employeeId)===String(e.id)&&x.status!=='abgelehnt'&&x.status!=='storniert'&&!x.fixed&&x.bis>=a&&x.von<=b;}).forEach(function(x){var c=kalDays(x).filter(function(d){return d>=a&&d<=b;}).length*(x.halb?0.5:1);if(c)it.push(['ab',KAL_ART[kalShowArt(x)]+' '+kalNf(c)+' T'+(x.status==='offen'?' · Antrag':'')]);});
    for(var j=0;j<5;j++){var d=kalAdd(a,j),hn=kalHolE(e,d);if(hn)it.push(['h',hn]);}
    (protocols[e.id]||[]).filter(function(p){return p.status==='geplant'&&p.date>=a&&p.date<=b;}).forEach(function(p){it.push(['s',(p.type||'Session')+' '+KAL_WD[kalP(p.date).getDay()]]);});
    L.filter(function(o){return (o.due>=a&&o.due<=b)||(n===0&&o.due<a);}).forEach(function(o){it.push([aufgState(o).c==='od'?'od':'t',o.art+(aufgState(o).c==='od'?' · überfällig':' · fällig')]);});
    var wd=0;for(var j2=0;j2<5;j2++){var dd=kalAdd(a,j2);if(kalWorkday(e,dd)&&!(kalOn(e.id,dd)&&kalOn(e.id,dd).art!=='krank'))wd+=(kalOn(e.id,dd)?0.5:1);}
    return '<div class="ov-t'+(n===0?' hi':'')+'"><div class="ov-th"><span>KW '+kalKw(a)+(n===0?' · jetzt':'')+'</span><em>'+kalF(a)+'–'+kalF(kalAdd(a,4))+'</em></div><div class="ov-tv">'+wd+'<small> Einsatztage</small></div><div class="ov-its">'+(it.length?it.slice(0,4).map(function(x){return '<span class="ov-it '+x[0]+'">'+esc(x[1])+'</span>';}).join(''):'<span class="ov-none">nichts geplant</span>')+'</div></div>';}).join('');
  return '<div class="ov-panel">'+head+svg+'</div><div class="ov-tiles">'+tiles+'</div>'+(txt?'<div class="ov-why"><b>Wirkung:</b> '+txt+'</div>':'');}
function ovSteps2(e){var html=ovSteps(e);if(/Nichts Dringendes/.test(html))return '<div class="ov-tiles s1"><div class="ov-t hi"><div class="ov-th"><span>Nächster Schritt</span></div><div class="ov-tv" style="font-size:18px">Nichts Dringendes offen</div><div class="ov-none" style="color:rgba(255,255,255,.85)">Weiter so.</div></div></div>';
  var tmp=document.createElement('div');tmp.innerHTML=html;var R=[].slice.call(tmp.querySelectorAll('.ov-step'));
  return '<div class="ov-tiles s'+R.length+'">'+R.map(function(r,i){var b=r.querySelector('b'),n=r.querySelector('.kal-note'),bt=r.querySelector('button');return '<div class="ov-t'+(i===0?' hi':'')+'"><div class="ov-th"><span>'+(i===0?'Nächster Schritt':'Danach')+'</span><em>'+(i+1)+'</em></div><div class="ov-tv" style="font-size:16px;line-height:1.3">'+(b?b.innerHTML:'')+'</div><div class="ov-sub">'+(n?n.innerHTML:'')+'</div>'+(bt?'<button class="btn btn-sm'+(i===0?' ov-wbtn':' btn-primary')+'" onclick="'+esc(bt.getAttribute('onclick'))+'">'+bt.innerHTML+'</button>':'')+'</div>';}).join('')+'</div>';}
function ovSections(e){return ovCard('ovSecZ','Leistung und Termine','8 Wochen zurück · 4 Wochen voraus',ovTimeline2(e))
  +ovCard('ovSecP','Profil und nächste Schritte','Skill & Will · koralle = letzte Bewertung, sand = davor',ovProfile(e)+'<div style="margin-top:12px">'+ovSteps2(e)+'</div>');}

// ── Grafik-Kästen in Coaching, Call und Mitarbeiterentwicklung (Aufbau wie die Übersicht) ──
function vzRadar(labels,series,maxv,size,R){size=size||240;R=R||80;var n=labels.length,cx=size/2,cy=size/2-4,pt=function(i,v){var a=2*Math.PI*i/n;return (cx+R*Math.max(0,Math.min(maxv,v))/maxv*Math.sin(a)).toFixed(1)+','+(cy-R*Math.max(0,Math.min(maxv,v))/maxv*Math.cos(a)).toFixed(1);};
  var h='<svg viewBox="0 0 '+size+' '+(size-8)+'" style="width:100%;max-width:'+size+'px;display:block;margin:0 auto">';for(var r=1;r<=5;r++)h+='<polygon points="'+labels.map(function(l,i){return pt(i,maxv*r/5);}).join(' ')+'" fill="none" stroke="#E4E0D6"/>';
  series.forEach(function(s){if(!s.v)return;h+='<polygon points="'+s.v.map(function(v,i){return pt(i,v||0);}).join(' ')+'" fill="'+s.c+'" fill-opacity="'+s.o+'" stroke="'+s.c+'" stroke-width="1.6"'+(s.d?' stroke-dasharray="4 3"':'')+'/>';});
  labels.forEach(function(l,i){var a=2*Math.PI*i/n;h+='<text x="'+(cx+(R+18)*Math.sin(a)).toFixed(1)+'" y="'+(cy-(R+18)*Math.cos(a)+3).toFixed(1)+'" text-anchor="middle" font-size="9.5" fill="#5C554C">'+esc(l)+'</text>';});return h+'</svg>';}
function vzBars(rows,mx){return rows.map(function(r){return '<div class="vz-bar"><span>'+esc(r[0])+'</span><div><i style="width:'+Math.max(0,Math.min(100,r[1]/(mx||1)*100))+'%"></i></div><b>'+esc(r[2])+'</b></div>';}).join('');}
function vzTiles(T){return '<div class="ov-tiles">'+T.map(function(x,i){return '<div class="ov-t vz-t'+(i===0?' hi':'')+'"><div class="ov-th"><span>'+esc(x[0])+'</span><em>'+esc(x[3]||'')+'</em></div><div class="ov-tv vz-tv">'+esc(x[1])+'</div><div class="vz-ts">'+esc(x[2])+'</div></div>';}).join('')+'</div>';}
function vzCard(id,title,right,head,chart,T,why){return '<div class="pu-viz" id="'+id+'" style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(40,32,15,0.06)"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700;font-size:14px">'+title+'<span style="margin-left:auto;font-size:11.5px;font-weight:500;color:var(--text3)">'+right+'</span></div><div class="ov-panel"><div class="ov-ph">'+head+'</div>'+chart+'</div>'+vzTiles(T)+(why?'<div class="ov-why">'+why+'</div>':'')+'</div>';}
function vzTeam(){return teamTargetList?teamTargetList():employees.filter(function(e){return e.active!==false&&!e.isPureCoach;});}
function vzCoachCounts(e,from,to){var c=VZ_TOP.map(function(){return 0;}),n=0,wk={},co=0,tr=0;(protocols[e.id]||[]).forEach(function(p){if(!p.date||p.status==='geplant'||p.date<from||p.date>to)return;n++;var f=(p.focus||'')+' '+(p.focusMetric||'');VZ_TOP.forEach(function(t,i){if(t[1].test(f))c[i]++;});var ty=p.type||'';if(/weekly/i.test(ty))wk[kalMon(p.date)]=1;if(/coaching/i.test(ty)&&!/weekly/i.test(ty))co++;if(/training/i.test(ty))tr++;});return {c:c,n:n,wk:Object.keys(wk).length,co:co,tr:tr};}
function vzCoaching(e){var t=today(),from=kalAdd(t,-90),me=vzCoachCounts(e,from,t),T=vzTeam().filter(function(x){return x.id!==e.id;}),TM=T.map(function(x){return vzCoachCounts(x,from,t);}),avg=function(f){return TM.length?TM.reduce(function(s,o){return s+f(o);},0)/TM.length:0;};
  var tc=VZ_TOP.map(function(_,i){return avg(function(o){return o.c[i];});}),tn=avg(function(o){return o.n;}),twk=avg(function(o){return o.wk;}),tco=avg(function(o){return o.co;}),ttr=avg(function(o){return o.tr;});
  var mx=Math.max.apply(null,me.c.concat(tc).concat([1])),gapI=-1,gap=0;VZ_TOP.forEach(function(_,i){var g=tc[i]-me.c[i];if(g>gap){gap=g;gapI=i;}});
  var st=puSesStats(e),f1=function(v){return kalNf(Math.round(v*10)/10);};
  // Wirkung je Session-Art: Marge/Tag 14 Tage nach gegen 14 Tage vor der Session
  var P=performance[e.id]||[],mpd=function(a,b){var by={};P.forEach(function(r){if(r.date>=a&&r.date<=b)by[r.date]=(by[r.date]||0)+(r.margeGesamt||r.margin||0);});var d=Object.keys(by);return d.length?d.reduce(function(s,k){return s+by[k];},0)/d.length:null;};
  var eff={};(protocols[e.id]||[]).forEach(function(p){if(!p.date||p.status==='geplant'||p.date<kalAdd(t,-180))return;var im=perfImpact(e,P,p.date,'margeGesamt');if(im.state!=='ok')return;var k=(p.type||'Session');(eff[k]=eff[k]||[]).push(im.raw);});
  var ek=Object.keys(eff).map(function(k){return [k,eff[k].reduce(function(s,v){return s+v;},0)/eff[k].length,eff[k].length];}).sort(function(a,b){return b[1]-a[1];});
  var why=ek.length?'<b>Wirkung:</b> '+ek.slice(0,2).map(function(x){return 'nach '+esc(x[0])+(x[2]>1?'s':'')+' '+(x[1]>=0?'steigt':'sinkt')+' die Marge/Tag im Schnitt um <b>'+ztEur(Math.abs(x[1]))+'</b>';}).join(', ')+' (Ø 3 Arbeitstage danach gegen davor).':'<b>Wirkung:</b> noch zu wenige Sessions mit Leistungsdaten davor und danach.';
  var chart='<div class="vz-g2">'+vzRadar(VZ_TOP.map(function(x){return x[0];}),[{v:tc,c:'#C9A77E',o:.12,d:1},{v:me.c,c:'#F08566',o:.25}],mx)+'<div>'+vzBars([['Sessions 90 T',me.n,String(me.n)],['Ø Team',tn,f1(tn)],['Weeklys',me.wk,me.wk+'/12'],['Coachings',me.co,String(me.co)]],Math.max(me.n,tn,12,1))+'<div class="vz-leg"><span><i style="background:#F08566"></i>'+esc(kalFirst(e.name))+'</span><span><i class="d" style="border-color:#C9A77E"></i>Ø Team</span></div></div></div>';
  return vzCard('vzCoach','Coaching · Abdeckung im Team',esc(kalFirst(e.name))+' gegen Ø Team · Sessions je Thema, letzte 90 Tage','<span>Sessions 90 Tage</span><b>'+me.n+'</b><span>Ø Team '+f1(tn)+' · Weeklys '+me.wk+' von 12'+(st.last?' · letzte Session vor '+kalDiff(st.last.date,t)+' Tagen':'')+'</span>',chart,
    [['Lücke',gapI>=0?VZ_TOP[gapI][0]:'keine',gapI>=0?me.c[gapI]+' Sessions · Team Ø '+f1(tc[gapI]):'kein Thema unter dem Team',''],['Weeklys',me.wk+'/12','letzte 12 Wochen','Team '+f1(twk)],['Coachings',String(me.co),'90 Tage','Team '+f1(tco)],['Trainings',String(me.tr),'90 Tage','Team '+f1(ttr)]],why);}
// Call
function vzCat(r,cat){var v=cat.items.map(function(k){return r.scores&&+r.scores[k];}).filter(function(x){return x>0;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null;}
function vzTot(r){var s=0,w=0;CALL_CATS.forEach(function(c){var v=vzCat(r,c);if(v!=null){s+=v*c.weight;w+=c.weight;}});return w?s/w:null;}
function vzHeat(v){if(v==null)return ['#fff','#C4BCB0'];if(v>=3.5)return ['#5E9B78','#fff'];if(v>=3)return ['#A9C7B3','#1d1c1a'];if(v>=2.5)return ['#EFE7D8','#1d1c1a'];if(v>=2)return ['#F6C9B8','#9A3F22'];return ['#F08566','#fff'];}
function vzCall(e){var has=function(r){return r&&r.scores&&Object.keys(r.scores).some(function(k){return r.scores[k]>0;});},R=(callRatings[e.id]||[]).filter(has).sort(function(a,b){return String(a.date).localeCompare(String(b.date));}).slice(-5);
  var cut=kalAdd(today(),-90),TR=[];vzTeam().forEach(function(x){(callRatings[x.id]||[]).forEach(function(r){if(has(r)&&r.date>=cut)TR.push(r);});});
  var team=CALL_CATS.map(function(c){var v=TR.map(function(r){return vzCat(r,c);}).filter(function(x){return x!=null;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null;}),f1=function(v){return v==null?'–':kalNf(Math.round(v*10)/10);};
  if(!R.length)return vzCard('vzCall','Call · die letzten 5 Calls','je Kategorie · rechts Ø Team','<span>Noch keine bewerteten Calls.</span>','<div class="kal-note" style="padding:14px 4px">Sobald Calls bewertet sind, erscheint hier die Übersicht je Kategorie.</div>',[['Bewertet','0/5','Calls in 60 Tagen','fällig'],['Ø Team',f1(team.filter(function(x){return x!=null;}).length?team.reduce(function(s,x){return s+(x||0);},0)/team.filter(function(x){return x!=null;}).length:null),'alle Kategorien',''],['Stärke','–','',''],['Trend','–','','']],'');
  var me=CALL_CATS.map(function(c){var v=R.map(function(r){return vzCat(r,c);}).filter(function(x){return x!=null;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null;});
  var gi=-1,gv=0,si=-1,sv=-9;CALL_CATS.forEach(function(c,i){if(me[i]==null||team[i]==null)return;var g=(team[i]-me[i])*c.weight;if(g>gv){gv=g;gi=i;}var s2=me[i]-team[i];if(s2>sv){sv=s2;si=i;}});
  var tot=R.map(vzTot),q=typeof qaCallsDue==='function'?qaCallsDue(e.id):{cnt:0,target:5},last=R[R.length-1];
  var tb='<div style="overflow-x:auto"><table class="vz-hm"><tr><th></th>'+R.map(function(r){return '<th>'+kalF(r.date)+'</th>';}).join('')+'<th>Ø Team</th></tr>'+CALL_CATS.map(function(c,i){return '<tr><td class="l">'+esc(c.short||c.label)+'<span class="vz-w">'+Math.round(c.weight*100)+' %</span></td>'+R.map(function(r){var v=vzCat(r,c),h=vzHeat(v);return '<td style="background:'+h[0]+';color:'+h[1]+'">'+f1(v)+'</td>';}).join('')+'<td class="t">'+f1(team[i])+'</td></tr>';}).join('')+'</table></div>';
  var streak=0;if(gi>=0){for(var k=R.length-1;k>=0;k--){var v=vzCat(R[k],CALL_CATS[gi]);if(v!=null&&team[gi]!=null&&v<team[gi])streak++;else break;}}
  var why=gi>=0?'<b>Hinweis:</b> '+esc(CALL_CATS[gi].label)+(streak>1?' '+streak+'-mal in Folge':'')+' unter dem Team und zählt '+Math.round(CALL_CATS[gi].weight*100)+' % der Note → Training „'+esc(CALL_CATS[gi].label)+'“ vorschlagen.':'<b>Hinweis:</b> In allen Kategorien auf oder über dem Team-Schnitt.';
  return vzCard('vzCall','Call · die letzten '+R.length+' Calls','je Kategorie · Skala 1–4 · rechts Ø Team · grün gut, koralle schwach','<span>Letzter Call</span><b>'+f1(vzTot(last))+'</b><span>Ø '+R.length+' Calls '+f1(tot.reduce(function(s,x){return s+(x||0);},0)/R.length)+' · Ø Team '+f1(team.filter(function(x){return x!=null;}).reduce(function(s,x){return s+x;},0)/Math.max(1,team.filter(function(x){return x!=null;}).length))+' · '+q.cnt+' von '+q.target+' Calls in 60 Tagen bewertet</span>',tb,
    [['Größte Lücke',gi>=0?(CALL_CATS[gi].short||CALL_CATS[gi].label):'keine',gi>=0?f1(me[gi])+' · Team '+f1(team[gi])+' · zählt '+Math.round(CALL_CATS[gi].weight*100)+' %':'alle auf Team-Niveau',''],['Stärke',si>=0?(CALL_CATS[si].short||CALL_CATS[si].label):'–',si>=0?f1(me[si])+' · Team '+f1(team[si]):'',si>=0?(sv>=0?'+':'−')+kalNf(Math.abs(Math.round(sv*10)/10)):''],['Trend',tot.length>1?(tot[tot.length-1]>tot[0]+0.05?'↗':tot[tot.length-1]<tot[0]-0.05?'↘':'→'):'–',tot.length>1?'Gesamt '+f1(tot[0])+' → '+f1(tot[tot.length-1]):'erst ein Call',R.length+' Calls'],['Bewertet',q.cnt+'/'+q.target,'Calls in 60 Tagen',q.cnt<q.target?'fällig':'']],why);}
function vzEvals(id){return (reviews[id]||[]).filter(function(r){return r.einwand!==undefined;}).sort(function(a,b){return (a.date||'')<(b.date||'')?1:-1;});}
function vzAvg(r,cat){if(!r)return null;var v=VZ_DIM.filter(function(d){return !cat||d[2]===cat;}).map(function(d){return +r[d[0]];}).filter(function(x){return x>0;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null;}
function vzDev(e){var EV=vzEvals(e.id),L0=EV[0],L1=EV[1],T=vzTeam().filter(function(x){return x.id!==e.id;}).map(function(x){return vzEvals(x.id)[0];}).filter(Boolean),f1=function(v){return v==null?'–':kalNf(Math.round(v*10)/10);};
  var VZ_DIM=VZ_DIM_ALL.filter(function(d){return (L0&&+L0[d[0]]>0)||(L1&&+L1[d[0]]>0);});if(VZ_DIM.length<3)VZ_DIM=VZ_DIM_ALL;
  var tv=VZ_DIM.map(function(d){var v=T.map(function(r){return +r[d[0]];}).filter(function(x){return x>0;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null;}),tavg=function(cat){var v=T.map(function(r){return vzAvg(r,cat);}).filter(function(x){return x!=null;});return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null;};
  if(!L0)return vzCard('vzDev','Mitarbeiterentwicklung · Profil','12 Kriterien · Skill, Will, Result','<span>Noch keine Bewertung.</span>','<div class="kal-note" style="padding:14px 4px">Sobald eine Bewertung erfasst ist, erscheint hier das Profil im Vergleich zum Team.</div>',[['Lernfeld','–','',''],['Skill','–','','Team '+f1(tavg('skill'))],['Will','–','','Team '+f1(tavg('will'))],['Result','–','','Team '+f1(tavg('result'))]],'');
  var mv=VZ_DIM.map(function(d){return +L0[d[0]]||0;}),pv=L1?VZ_DIM.map(function(d){return +L1[d[0]]||0;}):null,lo=0;mv.forEach(function(v,i){if(v>0&&(mv[lo]<=0||v-(tv[i]||v)<mv[lo]-(tv[lo]||mv[lo])))lo=i;});
  var dlt=function(cat){var a=vzAvg(L0,cat),b=vzAvg(L1,cat);return a!=null&&b!=null?((a-b>=0?'+':'−')+kalNf(Math.abs(Math.round((a-b)*10)/10))+' zur vorherigen'):'erste Bewertung';};
  var up=pv?VZ_DIM.map(function(d,i){return [d[1],mv[i]-pv[i]];}).filter(function(x){return x[1]>0;}).sort(function(a,b){return b[1]-a[1];}).slice(0,3):[],under=VZ_DIM.map(function(d,i){return [d[1],tv[i]!=null?mv[i]-tv[i]:0];}).filter(function(x){return x[1]<-0.2;}).sort(function(a,b){return a[1]-b[1];}).slice(0,3);
  var nd=L0.date?kalAdd(L0.date,61):null,G=(goals[e.id]||[]).filter(function(g){return !g.done&&g.status!=='done'&&g.status!=='erreicht';});
  var why=(up.length?'<b>Verbessert:</b> '+up.map(function(x){return esc(x[0])+' (+'+kalNf(x[1])+')';}).join(', ')+' · ':'')+(under.length?'<b>unter dem Team:</b> '+under.map(function(x){return esc(x[0]);}).join(', ')+' · ':'')+(nd?'nächste Bewertung '+(nd<=today()?'<b>fällig</b>':'ab '+kalF(nd)):'');
  var chart='<div class="vz-g2">'+vzRadar(VZ_DIM.map(function(d){return d[1];}),[{v:tv,c:'#C9A77E',o:.12,d:1},{v:pv,c:'#8A7F72',o:.05,d:1},{v:mv,c:'#F08566',o:.25}],5)+'<div>'+vzBars([['Skill',vzAvg(L0,'skill')||0,f1(vzAvg(L0,'skill'))],['Will',vzAvg(L0,'will')||0,f1(vzAvg(L0,'will'))],['Result',vzAvg(L0,'result')||0,f1(vzAvg(L0,'result'))],['Ø Team',tavg()||0,f1(tavg())]],5)+'<div class="vz-leg"><span><i style="background:#F08566"></i>'+kalF(L0.date)+'</span>'+(L1?'<span><i class="d" style="border-color:#8A7F72"></i>'+kalF(L1.date)+'</span>':'')+'<span><i class="d" style="border-color:#C9A77E"></i>Ø Team</span></div></div></div>';
  return vzCard('vzDev','Mitarbeiterentwicklung · Profil',esc(kalFirst(e.name))+' gegen Ø Team'+(L1?' und die vorherige Bewertung':'')+' · '+VZ_DIM.length+' Kriterien','<span>Letzte Bewertung</span><b>'+f1(vzAvg(L0))+'</b><span>'+kalF(L0.date)+(L1?' · '+dlt()+'':'')+' · Ø Team '+f1(tavg())+' · '+G.length+' Ziel'+(G.length===1?'':'e')+' offen</span>',chart,
    [['Lernfeld',VZ_DIM[lo][1],mv[lo]+(tv[lo]!=null?' · Team '+f1(tv[lo]):'')+(pv&&mv[lo]!==pv[lo]?' · '+(mv[lo]-pv[lo]>0?'+':'−')+Math.abs(mv[lo]-pv[lo])+' seit '+kalF(L1.date):''),''],['Skill',f1(vzAvg(L0,'skill')),dlt('skill'),'Team '+f1(tavg('skill'))],['Will',f1(vzAvg(L0,'will')),dlt('will'),'Team '+f1(tavg('will'))],['Result',f1(vzAvg(L0,'result')),dlt('result'),'Team '+f1(tavg('result'))]],why);}
function vzEnsure(id,eid){var cfg=VZ_AT[id];if(!cfg)return;var m=document.getElementById(id);if(!m)return;var e=kalEmp(eid||selectedEmp);var a=document.getElementById(cfg[0]);if(!e||!a||!a.parentElement)return;
  var old=a.parentElement.querySelector(':scope > .pu-viz'),d=document.createElement('div');try{d.innerHTML=cfg[1](e);}catch(er){console.warn('Grafik',er);return;}var nb=d.firstElementChild;if(old)old.parentElement.removeChild(old);a.parentElement.insertBefore(nb,a.nextSibling);}
