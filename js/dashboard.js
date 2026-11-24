// Sales OS – Dashboard inkl. Kachel „Live“
// Aus index.html ausgelagert (reine Verschiebung). Nur Funktionen: Variablen und alles, was beim Laden
// laufen soll, gehören nach js/start.js (wird zuletzt geladen).

// Ansicht wie in der Performance-Tabelle: Tage (laufender Monat), Wochen (alle KW des Jahres), Monate (laufendes Jahr)
// Kacheln und Abschnitte: Tage = heute, Wochen = laufende Woche, Monate = laufender Monat, Jahre = Geschäftsjahr bis heute
function dshRangeKey(p){return p==='days'?'day':p==='weeks'?'week':p==='months'?'month':'year';}
function dshSetPeriod(p){dshPeriod=p;renderDashboard();}
function dshSetEmpTeam(t){dshEmpTeam=t;renderDashboard();}
function dshActive(){return employees.filter(function(e){return e.active!==false&&!e.isPureCoach&&e.role!=='SDC'&&e.role!=='SDM';});}
function dshTeamOf(e){if(e.role==='VLC')return 'VLC';if(e.phase==='Onboarding')return 'OB';if(e.role==='SE'||e.role==='SDL')return 'SE';if(e.role==='SR')return 'SR';return null;}
function dshAll(){return dshActive().filter(function(e){return !!dshTeamOf(e);});}
function dshTeam(t){return dshAll().filter(function(e){return dshTeamOf(e)===t;});}
function dshYmd(d){return d.toISOString().slice(0,10);}
function dshMonday(ds){var d=new Date(ds+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return dshYmd(d);}
function dshIsWork(ds){var w=new Date(ds+'T00:00:00Z').getUTCDay();return w>0&&w<6;}
function dshPrevWork(ds){var d=addDaysUTC(ds,-1);while(!dshIsWork(d))d=addDaysUTC(d,-1);return d;}
function dshRange(p){
  var t=today(),y=+t.slice(0,4),m=+t.slice(5,7);
  if(p==='day'){var pd=dshPrevWork(t);return {from:t,to:t,end:t,prevFrom:pd,prevTo:pd,prevLbl:'Vortag',lbl:'heute'};}
  if(p==='week'){var mo=dshMonday(t),n=Math.round((new Date(t)-new Date(mo))/86400000);return {from:mo,to:t,end:addDaysUTC(mo,6),prevFrom:addDaysUTC(mo,-7),prevTo:addDaysUTC(mo,n-7),prevLbl:'Vorwoche',lbl:'diese Woche'};}
  if(p==='year'){var f=y+'-01-01';return {from:f,to:t,end:y+'-12-31',prevFrom:(y-1)+'-01-01',prevTo:(y-1)+t.slice(4),prevLbl:'Vorjahr bis '+fd(t).slice(0,6),lbl:String(y)};}
  var pm=new Date(Date.UTC(y,m-2,1)),pmLast=new Date(Date.UTC(y,m-1,0)),pt=new Date(Date.UTC(y,m-2,+t.slice(8,10)));if(pt>pmLast)pt=pmLast;
  var MN=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  return {from:t.slice(0,8)+'01',to:t,end:dshYmd(new Date(Date.UTC(y,m,0))),prevFrom:dshYmd(pm),prevTo:dshYmd(pt),prevLbl:'Vormonat bis '+fd(t).slice(0,3),lbl:MN[m-1]};
}
// Ziel für einen Zeitraum: Monatsziel aus der Zielvereinbarung, anteilig nach Arbeitstagen (Mo–Fr)
function dshCr(s,k){
  if(!s)return null;var d;
  if(k==='OEM'){d=s.oem+s.nerrOem;return d>0?s.oem/d*100:null;}
  if(k==='UPS'){d=s.ups+s.nerrUps;return d>0?s.ups/d*100:null;}
  if(k==='WKA'){d=s.wka+s.nerrWkaOem+s.nerrWkaUps+s.wkaOemBeendet+s.wkaUpsBeendet;return d>0?s.wka/d*100:null;}
  if(k==='ALL'){var o=s.oem+s.ups+s.wka;d=o+s.nerrOem+s.nerrUps+s.nerrWkaOem+s.nerrWkaUps;return d>0?o/d*100:null;}
  if(k==='MY')return chartCrFromSums('crMegaYes',s);
  if(k==='SYMY')return chartCrFromSums('crSyMy',s);
  return null;
}
function dshOpt(s,k){return k==='OEM'?s.oem:k==='UPS'?s.ups:k==='WKA'?s.wka:s.oem+s.ups+s.wka;}
function dshMarge(s,k){return k==='OEM'?s.margeOEM:k==='UPS'?s.margeUps:k==='WKA'?s.margeWka:s.margeGes;}
function dshMpo(s,k){var o=dshOpt(s,k);return o>0?dshMarge(s,k)/o:null;}
// Ziele: CR OEM aus den globalen KPI-Zielen; UPS, WKA und Ø je Auftrag aus settings.dashboardTargets, sonst Teamdurchschnitt
function dshTarget(k){
  if(k==='OEM')return KPI_TARGETS.crOEM?+KPI_TARGETS.crOEM.val:null;
  var dt=settings.dashboardTargets||{},v=dt[k==='MPO'?'margeOpt':'cr'+k];
  return (v===''||v==null)?null:+v;
}
function dshPct(v){return v===null||v===undefined?'–':Math.round(v)+' %';}
function dshEur(v){return Math.round(v||0).toLocaleString('de-DE')+' €';}
function dshEur1(v){return v===null||v===undefined?'–':v.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' €';}
function dshNum(v){return Math.round(v||0).toLocaleString('de-DE');}
// ── Bausteine im Board-Stil ──
function dshCard(title,right,body,why){return '<div class="card"><div class="card-title">'+title+(right?'<span class="dsh-cr">'+right+'</span>':'')+'</div>'+body+(why?'<div class="dsh-why"><b>Warum:</b> '+why+'</div>':'')+'</div>';}
function dshBar(v,mx,lo){return '<span class="dsh-mb"><span class="t"><i class="'+(lo?'lo':'')+'" style="width:'+(mx>0?Math.max(0,Math.min(100,v/mx*100)):0).toFixed(1)+'%"></i></span></span>';}
function dshKD(k){return DSH_KPIS.filter(function(x){return x.k===k;})[0];}
function dshSetKpi(k){dshKpi=k;dshKpiOpen=false;renderDashboard();}
function dshToggleKpi(){dshKpiOpen=!dshKpiOpen;renderDashboard();}
function dshHours(list,from,to){var h=0;list.forEach(function(e){var seen={};(performance[e.id]||[]).forEach(function(x){if(x.date>=from&&x.date<=to&&!seen[x.date]){seen[x.date]=1;h+=workHoursForDate(e,x.date)||0;}});h+=krankExtraHours(e,from,to,seen);});return h;}
function dshKVal(k,list,s,from,to){
  switch(k){
    case 'akt':return s.akt;
    case 'oph':var hh=dshHours(list,from,to);return hh>0?(s.oem+s.ups+s.wka)/hh:null;
    case 'crG':return dshCr(s,'ALL');case 'crO':return dshCr(s,'OEM');case 'crU':return dshCr(s,'UPS');case 'crW':return dshCr(s,'WKA');
    case 'tw':return chartCrFromSums('crTeilweise',s);case 'sm':return dshCr(s,'SYMY');case 'my':return dshCr(s,'MY');
    case 'mG':return dshMpo(s,'ALL');case 'mO':return dshMpo(s,'OEM');case 'mU':return dshMpo(s,'UPS');case 'mW':return dshMpo(s,'WKA');
  }return null;
}
function dshKTarget(k,e,list){
  if(k==='ze')return 100;
  if(list){var MAP={oph:'optPerH',crO:'crOEM',tw:'crTeilweise',sm:'crSyMy',my:'crMegaYes'},tt=MAP[k]?teamTargetFor(list,MAP[k]):null;return tt?tt.val:null;}
  var tg=e?empTargets(e):null,pick=function(key){var t=tg&&tg[key]?tg[key]:KPI_TARGETS[key];return t&&t.val!=null?+t.val:null;};
  if(k==='oph')return pick('optPerH');if(k==='crO')return pick('crOEM');if(k==='tw')return pick('crTeilweise');if(k==='sm')return pick('crSyMy');if(k==='my')return pick('crMegaYes');
  return null;
}
function dshKFmt(k,v){if(v===null||v===undefined||isNaN(v))return '–';var u=dshKD(k).u;
  if(u==='n')return Math.round(v).toLocaleString('de-DE');if(u==='n€')return Math.round(v).toLocaleString('de-DE')+' €';if(u==='%')return Math.round(v)+' %';
  if(u==='€')return v.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' €';
  return v.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});}
function dshKDelta(k,a,b,light){if(a===null||b===null||a===undefined||b===undefined)return '<span class="dl">&nbsp;</span>';var d=a-b,kd=dshKD(k),good=kd.lte?d<=0:d>=0;
  var t=kd.u==='%'?Math.round(Math.abs(d))+' Pkt.':kd.u==='n'?Math.round(Math.abs(d)).toLocaleString('de-DE'):Math.abs(d).toLocaleString('de-DE',{maximumFractionDigits:1})+(kd.u==='€'?' €':'');
  return '<span class="dl"><b class="'+(light?'':good?'up':'dn')+'">'+(d>0?'▲ ':d<0?'▼ ':'')+t+'</b> ggü. Vorperiode</span>';}

// Kreisdiagramm: Aufteilung der Margenerhöhung auf OEM, UPS und WKA
function dshDonutTile(parts,psum,S){
  var r=54,c=2*Math.PI*r,off=0,seg='';
  parts.forEach(function(v,i){var f=psum>0?v/psum:0;if(f<=0)return;seg+='<circle cx="70" cy="70" r="'+r+'" fill="none" stroke="'+DSH_AC[i]+'" stroke-width="22" stroke-dasharray="'+(f*c).toFixed(2)+' '+c.toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 70 70)"/>';off+=f*c;});
  var oa=[S.oem,S.ups,S.wka];
  var leg=DSH_AREAS.map(function(k,i){var v=parts[i];return '<div class="lr"><i style="background:'+DSH_AC[i]+'"></i><span class="n">'+k+'</span><span class="o">'+dshNum(oa[i])+' Opt. · '+dshEur(v)+'</span><span class="p">'+(psum>0?Math.round(v/psum*100):0)+' %</span></div>';}).join('');
  return '<div class="dsh-qt dsh-donut"><div class="l">Aufteilung</div><div class="dw"><svg viewBox="0 0 140 140" role="img" aria-label="Aufteilung der Margenerhöhung auf OEM, UPS und WKA"><circle cx="70" cy="70" r="'+r+'" fill="none" stroke="rgba(0,0,0,.06)" stroke-width="22"/>'+seg+'</svg><div class="c"><b>'+dshEur(psum)+'</b><span>Marge</span></div></div><div class="lg2">'+leg+'</div></div>';
}
function dshSetTP(p){dshTP=p;renderDashboard();}
function dshSetTF(t){dshTF=t;renderDashboard();}
function dshTSlots(p){
  var t=today(),y=+t.slice(0,4),sl=[];
  if(p==='day'){var m0=t.slice(0,8)+'01',mEnd=dshYmd(new Date(Date.UTC(y,+t.slice(5,7),0))),fe=bayernFeiertage(y),d=m0;
    while(d<=mEnd){if(dshIsWork(d)&&!fe[d])sl.push({f:d,t:d,l:d.slice(8,10)+'.'});d=addDaysUTC(d,1);}
    return {s:sl,cmp:'Vortag',cur:'heute'};}
  if(p==='month'){var MS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    for(var i=1;i<=12;i++){var f=y+'-'+('0'+i).slice(-2)+'-01';sl.push({f:f,t:dshYmd(new Date(Date.UTC(y,i,0))),l:MS[i-1]});}
    return {s:sl,cmp:'Vormonat',cur:'laufender Monat'};}
  var mo=dshMonday(t);for(var j=11;j>=0;j--){var a=addDaysUTC(mo,-7*j);sl.push({f:a,t:addDaysUTC(a,6),l:'KW '+isoWeekNum(new Date(a+'T00:00:00Z'))});}
  return {s:sl,cmp:'Vorwoche',cur:'laufende Woche'};
}
function dshTVal(k,list,from,to){
  var t=today();if(from>t)return null;var to2=to>t?t:to;
  var s=chartSumsForRange(list,from,to2);
  if(k==='ze'){var pl=dshPlanRange(list,from,to2<t?to2:addDaysUTC(t,-1))+(to2>=t?dshPlanRange(list,t,t)*dshDayFrac(list):0);return pl>0?s.margeGes/pl*100:null;}
  if(k==='mg')return (s.margeGes||0)>0||(s.oem+s.ups+s.wka)>0?s.margeGes:null;
  return dshKVal(k,list,s,from,to2);
}
// Balken je Abschnitt (wie der Filter): Team-Wert als Balken, Ziel gestrichelt, Gesamt als Strich, laufender Abschnitt umrandet
function dshBars(vals,gv,z,lte,cur,mn,mx,ko,labels){
  var lo0=Math.min(0,mn),rng=(mx-lo0)||1,H=function(v){return Math.max(0,(v-lo0)/rng*100);};
  var h='<div class="bcx">'+(z!=null?'<div class="zl" style="bottom:'+H(z).toFixed(1)+'%"></div>':'');
  vals.forEach(function(v,i){
    var lb=labels&&labels[i]?labels[i]:'';
    if(v===null||v===undefined){h+='<div class="c" title="'+esc(lb)+'">'+(i>cur&&z!=null?'<div class="b fut" style="height:'+H(z).toFixed(1)+'%"></div>':'')+'</div>';return;}
    var bad=z!=null&&(lte?v>z:v<z);
    h+='<div class="c" title="'+esc(lb)+': '+v.toLocaleString('de-DE',{maximumFractionDigits:1})+(gv&&gv[i]!=null?' · Gesamt '+gv[i].toLocaleString('de-DE',{maximumFractionDigits:1}):'')+'"><div class="b'+(bad?' lo':'')+(i===cur?' cur':'')+'" style="height:'+H(v).toFixed(1)+'%"></div>'
      +(!ko&&gv&&gv[i]!=null?'<div class="gt" style="bottom:'+H(gv[i]).toFixed(1)+'%"></div>':'')+'</div>';
  });
  return h+'</div>';
}
function dshBarsFoot(vals,z,lte,cur,labels,unit,ko){
  var done=0,u=0;vals.forEach(function(v,i){if(v===null||v===undefined||i>=cur)return;done++;if(z!=null&&(lte?v>z:v<z))u++;});
  var mid=ko||z==null||!done?'':(u?'<b>'+u+'</b> von '+done+' unter Ziel':'alle im Ziel');
  return '<div class="bxs"><span>'+esc(labels[0]||'')+'</span><span>'+mid+'</span><span>'+esc(labels[labels.length-1]||'')+'</span></div>';
}
function dshTeamBox(all,T){
  var k=dshKpi,kd=dshKD(k),TS=dshTSlots(dshTP),sl=TS.s,n=sl.length,t0=today(),cur=-1;
  sl.forEach(function(x,i){if(x.f<=t0&&x.t>=t0)cur=i;});if(cur<0)cur=n-1;
  var TEAMS=['SE','SR','OB','VLC'],TCOL={SE:'#5C564F',SR:'#8A7F72',OB:'#F08566',VLC:'#C9BEAC'};
  var lists={G:all};TEAMS.forEach(function(t){lists[t]=T[t].list;});
  var ser={};Object.keys(lists).forEach(function(t){ser[t]=sl.map(function(x){return dshTVal(k,lists[t],x.f,x.t);});});
  var z=dshKTarget(k,null),lte=!!kd.lte;
  // Team-Ziel je Team = Durchschnitt der Einzelziele seiner Mitarbeiter, Gesamt = alle
  var ZT={G:z};TEAMS.forEach(function(t){var v=dshKTarget(k,null,lists[t]);ZT[t]=v!=null?v:z;});
  var allv=[];Object.keys(ser).forEach(function(t){ser[t].forEach(function(v){if(v!==null)allv.push(v);});});Object.keys(ZT).forEach(function(t){if(ZT[t]!=null)allv.push(ZT[t]);});
  var mn=allv.length?Math.min.apply(null,allv):0,mx=allv.length?Math.max.apply(null,allv):1,pad=(mx-mn)*0.14||1;mn-=pad;mx+=pad;
  function bad(v,ref,zz){if(v===null||v===undefined)return false;var Z0=zz!==undefined?zz:z;var r=Z0!=null?Z0:ref;if(r==null)return false;var tol=Z0!=null?0:(kd.u==='%'?2:Math.abs(r)*0.03);return lte?v>r+tol:v<r-tol;}
  if(!ser[dshTF]||!ser[dshTF].some(function(v){return v!==null;}))dshTF='SE';
  var zf=ZT[dshTF];
  // ── großes Diagramm, ein Team im Fokus ──
  var W=1000,H=330,TOP=70,BOT=30,X=function(i){return 14+i*(W-28)/((n-1)||1);},Y=function(v){return TOP+(1-(v-mn)/((mx-mn)||1))*(H-TOP-BOT);};
  var svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" class="big" aria-label="'+esc(kd.l)+' je Team im Verlauf">';
  if(zf!=null){var yz=Y(zf);svg+=lte?'<rect x="0" y="0" width="'+W+'" height="'+yz+'" fill="rgba(240,133,102,.07)"/>':'<rect x="0" y="'+yz+'" width="'+W+'" height="'+(H-yz)+'" fill="rgba(240,133,102,.07)"/>';}
  function line(arr,st){var p=[];arr.forEach(function(v,i){if(v!==null)p.push(X(i).toFixed(1)+','+Y(v).toFixed(1));});return p.length>1?'<polyline points="'+p.join(' ')+'" fill="none" '+st+' vector-effect="non-scaling-stroke"/>':'';}
  TEAMS.forEach(function(t){if(t!==dshTF)svg+=line(ser[t],'stroke="#B8AC9B" stroke-opacity=".5" stroke-width="1.5"');});
  svg+=line(ser.G,'stroke="#3a3833" stroke-opacity=".6" stroke-width="2" stroke-dasharray="2 4"');
  svg+=line(ser[dshTF],'stroke="'+TCOL[dshTF]+'" stroke-width="4"')+'</svg>';
  var ch='<div class="tv-area">';
  var rg=mx-mn,st=[0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,50000].filter(function(x){return rg/x<=5;})[0]||100000;
  for(var g=Math.ceil(mn/st)*st;g<=mx;g+=st)ch+='<div class="gl" style="top:'+(Y(g)/H*100).toFixed(1)+'%"><span>'+dshKFmt(k,g)+'</span></div>';
  if(zf!=null)ch+='<div class="zl" style="top:'+(Y(zf)/H*100).toFixed(1)+'%"></div>';
  ch+=svg;
  var fd2=ser[dshTF],bi=-1,wi=-1;fd2.forEach(function(v,i){if(v===null)return;if(bi<0||(lte?v<fd2[bi]:v>fd2[bi]))bi=i;if(wi<0||(lte?v>fd2[wi]:v<fd2[wi]))wi=i;});
  window._dshTV={l:sl.map(function(x){return x.l;}),ser:ser,k:k,z:z,lte:lte,f:dshTF,TC:TCOL,X:sl.map(function(x,i){return X(i)/W*100;}),Y:function(v){return Y(v)/H*100;}};
  sl.forEach(function(x,i){var w=100/n;ch+='<div class="hs" style="left:'+(X(i)/W*100-w/2).toFixed(2)+'%;width:'+w.toFixed(2)+'%" onmousemove="dshTip(event,'+i+')" onmouseleave="dshTipHide()"></div>';});
  ch+='<div class="xh" id="dshXh"></div><div class="tt" id="dshTt"></div>';
  fd2.forEach(function(v,i){if(v===null)return;var c=i===cur;ch+='<i class="pt'+(c?' cur':'')+'" style="left:'+(X(i)/W*100).toFixed(2)+'%;top:'+(Y(v)/H*100).toFixed(2)+'%;background:'+TCOL[dshTF]+'" title="'+sl[i].l+': '+dshKFmt(k,v)+'"></i>';});
  if(bi>=0&&bi!==wi){ch+='<div class="mk" style="left:'+(X(bi)/W*100).toFixed(2)+'%;top:calc('+(Y(fd2[bi])/H*100).toFixed(2)+'% - 30px)">Bestwert '+dshKFmt(k,fd2[bi])+'</div>';
    ch+='<div class="mk lo" style="left:'+(X(wi)/W*100).toFixed(2)+'%;top:calc('+(Y(fd2[wi])/H*100).toFixed(2)+'% + 12px)">Tiefpunkt '+dshKFmt(k,fd2[wi])+'</div>';}
  var cv=fd2[cur],pv=cur>0?fd2[cur-1]:null,vals=fd2.filter(function(v){return v!==null;}),avg=vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:null;
  var dlt=(cv!=null&&pv!=null)?cv-pv:null,dgood=dlt!=null&&(lte?dlt<=0:dlt>=0);
  ch+='<div class="sl"><span class="tm"><i style="background:'+TCOL[dshTF]+'"></i>'+dshTF+'</span><span class="v'+(bad(cv,ser.G[cur])?' dsh-lo':'')+'">'+dshKFmt(k,cv)+'</span>'+'<span class="s">'+(dlt!=null?'<b class="'+(dgood?'':'dsh-lo')+'">'+(dlt>0?'▲ ':dlt<0?'▼ ':'')+(kd.u==='%'?Math.round(Math.abs(dlt))+' Pkt.':dshKFmt(k,Math.abs(dlt)))+'</b> ggü. '+TS.cmp+' · ':'')+'Ø Zeitraum <b>'+dshKFmt(k,avg)+'</b>'+(zf!=null?' · '+(lte?'max. ':'Ziel ')+dshTF+' <b>'+dshKFmt(k,zf)+'</b>':' · Gesamt <b>'+dshKFmt(k,ser.G[cur])+'</b>')+'</span>'+'<span class="bt">'+TEAMS.map(function(t){var has=ser[t].some(function(v){return v!==null;});return '<button type="button" class="tg'+(t===dshTF?' on':'')+'"'+(has?' onclick="dshSetTF(\''+t+'\')"':' disabled')+'><i style="background:'+TCOL[t]+'"></i>'+t+'</button>';}).join('')+'</span></div>';
  ch+='</div><div class="tv-x">'+sl.map(function(x,i){var l=x.l;if(n>15&&i%2&&i!==cur)l='';return '<span class="'+(i===cur?'cur':(x.f>t0?'fut':''))+'" style="left:'+(X(i)/W*100).toFixed(2)+'%">'+l+'</span>';}).join('')+'</div>';
  // ── Kacheln: Gesamt + Teams, Wert der laufenden Periode, Mini-Diagramm mit Gesamt und Ziel ──
  var cs=sl[cur],UN=dshTP==='day'?'Tagen':dshTP==='week'?'Wochen':'Monaten',tiles='<div class="dsh-tcs">';
  var gvc=ser.G[cur],gpv=cur>0?ser.G[cur-1]:null;
  tiles+='<div class="dsh-tc dsh-ko"><div class="h">Gesamt<span>'+TS.cur+'</span></div><div class="v">'+dshKFmt(k,gvc)+'</div>'+dshKDelta(k,gvc,gpv,true).replace('ggü. Vorperiode','ggü. '+TS.cmp)
    +dshBars(ser.G,null,z,lte,cur,mn,mx,true,sl.map(function(x){return x.l;}))+dshBarsFoot(ser.G,z,lte,cur,sl.map(function(x){return x.l;}),UN,true)+'<div class="ex"><span>'+(z!=null?(lte?'max. ':'Ziel ')+dshKFmt(k,z):'Ø Zeitraum '+dshKFmt(k,(function(){var a=ser.G.filter(function(v){return v!==null;});return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null;})()))+'</span><span>'+TS.cmp+' <b>'+dshKFmt(k,gpv)+'</b></span></div></div>';
  TEAMS.forEach(function(t){
    var L=lists[t],v=ser[t][cur],pv2=cur>0?ser[t][cur-1]:null,head='<div class="h">'+t+'<span>'+L.length+' MA</span></div>';
    if(v===null||v===undefined){tiles+='<div class="dsh-tc na">'+head+'<div class="v">–</div><span class="dl">'+(t==='VLC'&&/U|W/.test(k.slice(-1))?'nur OEM':'keine Daten im Zeitraum')+'</span><div class="bcx"></div><div class="bxs"><span>&nbsp;</span></div><div class="ex"><span>&nbsp;</span></div></div>';return;}
    var lo=bad(v,gvc,ZT[t]);
    var em=L.map(function(e){return {e:e,v:dshTVal(k,[e],cs.f,cs.t),z:k==='ze'?100:dshKTarget(k,e)};}).filter(function(x){return x.v!==null;});
    var ds='<div class="ds"></div>',ex='<div class="ex"><span>&nbsp;</span></div>';
    if(em.length){
      var ev=em.map(function(x){return x.v;}),zr=k==='akt'||k==='mg'?(gvc!=null&&all.length?gvc/all.length:null):(z!=null?z:gvc);
      var a=Math.min.apply(null,ev.concat(zr!=null?[zr]:[])),b=Math.max.apply(null,ev.concat(zr!=null?[zr]:[])),pd=(b-a)*0.1||1;a-=pd;b+=pd;
      ds='<div class="ds">'+(zr!=null?'<b style="left:'+((zr-a)/(b-a)*100).toFixed(1)+'%"></b>':'')+em.map(function(x){var bb=(k==='akt'||k==='mg')?(zr!=null&&x.v<zr*0.9):bad(x.v,gvc);return '<i class="'+(bb?'lo':'')+'" style="left:'+((x.v-a)/(b-a)*100).toFixed(1)+'%" title="'+esc(x.e.name)+': '+dshKFmt(k,x.v)+'"></i>';}).join('')+'</div>';
      var so=em.slice().sort(function(p,q){return lte?p.v-q.v:q.v-p.v;}),fn=function(nm){return esc(nm.split(' ')[0]);};
      ex='<div class="ex"><span>Bester <b>'+fn(so[0].e.name)+' '+dshKFmt(k,so[0].v)+'</b></span>'+(so.length>1?'<span>Schwächster <b>'+fn(so[so.length-1].e.name)+' '+dshKFmt(k,so[so.length-1].v)+'</b></span>':'')+'</div>';
    }
    tiles+='<div class="dsh-tc'+(t===dshTF?' foc':'')+'" onclick="dshSetTF(\''+t+'\')" style="cursor:pointer" title="'+t+' im Diagramm hervorheben">'+head+'<div class="v'+(lo?' dsh-lo':'')+'">'+dshKFmt(k,v)+'</div>'+dshKDelta(k,v,pv2).replace('ggü. Vorperiode','ggü. '+TS.cmp)
      +dshBars(ser[t],ser.G,ZT[t],lte,cur,mn,mx,false,sl.map(function(x){return x.l;}))+dshBarsFoot(ser[t],ZT[t],lte,cur,sl.map(function(x){return x.l;}),UN,false)+ex+'</div>';
  });
  tiles+='</div>';
  // ── Kopf: Titel, Zeitraum und Kennzahl nebeneinander rechts ──
  var gs={};DSH_KPIS.forEach(function(x){(gs[x.g]=gs[x.g]||[]).push(x);});
  var pick='<div class="dsh-kpick'+(dshKpiOpen?' open':'')+'"><button type="button" class="btn" style="width:auto;height:34px" onclick="dshToggleKpi()" aria-expanded="'+dshKpiOpen+'"><span style="color:var(--text3);font-weight:500;margin-right:6px">Kennzahl</span>'+kd.l+'<i class="ti ti-chevron-'+(dshKpiOpen?'up':'down')+'" style="font-size:12px;margin-left:6px"></i></button>'
    +(dshKpiOpen?'<div class="pan">'+Object.keys(gs).map(function(g){return '<div><div class="g">'+g+'</div>'+gs[g].map(function(x){return '<button type="button" class="'+(x.k===k?'on':'')+'" onclick="dshSetKpi(\''+x.k+'\')">'+x.l+'</button>';}).join('')+'</div>';}).join('')+'</div>':'')+'</div>';
  var per='<div class="dsh-seg" role="group" aria-label="Zeitraum">'+[['day','Tag'],['week','Woche'],['month','Monat']].map(function(p){return '<button type="button" class="'+(dshTP===p[0]?'on':'')+'" aria-pressed="'+(dshTP===p[0])+'" onclick="dshSetTP(\''+p[0]+'\')">'+p[1]+'</button>';}).join('')+'</div>';
  return '<div class="card"><div class="card-title">Teams im Vergleich<span class="dsh-tr">'+per+pick+'</span></div><div class="dsh-tv">'+ch+'</div>'+tiles
    +'<div class="dsh-why">In den Kacheln: Wert der '+(dshTP==='day'?'heutigen Tages':dshTP==='week'?'laufenden Woche':'laufenden Monats')+', Balken je Abschnitt mit Ziel (gestrichelt) und Gesamt (Strich auf dem Balken). Klick auf eine Kachel hebt das Team oben hervor.</div></div>';
}

// Schwarzes Info-Feld beim Überfahren, wie im Performance-Diagramm
function dshTip(ev,i){
  var D=window._dshTV;if(!D)return;var tt=document.getElementById('dshTt'),xh=document.getElementById('dshXh');if(!tt)return;
  var rows=[[D.f,D.ser[D.f][i],D.TC[D.f]],['Gesamt',D.ser.G[i],'#3a3833']];
  ['SE','SR','OB','VLC'].forEach(function(t){if(t!==D.f)rows.push([t,D.ser[t][i],D.TC[t]]);});
  var h='<div class="tt-t">'+esc(D.l[i])+'</div>'+rows.map(function(r,j){return '<div class="tt-r'+(j===0?' f':'')+'"><i style="background:'+r[2]+'"></i>'+r[0]+'<b>'+dshKFmt(D.k,r[1])+'</b></div>';}).join('')+(D.z!=null?'<div class="tt-z">'+(D.lte?'max. ':'Ziel ')+dshKFmt(D.k,D.z)+'</div>':'');
  tt.innerHTML=h;tt.style.display='block';xh.style.display='block';xh.style.left=D.X[i]+'%';
  var area=tt.parentNode.getBoundingClientRect(),x=D.X[i]/100*area.width,w=tt.offsetWidth;
  tt.style.left=(x+w+16>area.width?x-w-12:x+12)+'px';
  var v=D.ser[D.f][i];tt.style.top=Math.max(4,Math.min(area.height-tt.offsetHeight-4,(v!=null?D.Y(v)/100*area.height:area.height/2)-tt.offsetHeight/2))+'px';
}
function dshTipHide(){var tt=document.getElementById('dshTt'),xh=document.getElementById('dshXh');if(tt)tt.style.display='none';if(xh)xh.style.display='none';}
// Info-Feld oben rechts genau so breit wie die letzte Kachel darunter und rechtsbündig dazu
function dshAlignInfo(){
  var ib=document.querySelector('.dsh-tv .ib'),tiles=document.querySelectorAll('.dsh-tcs > .dsh-tc'),area=document.querySelector('.dsh-tv .tv-area');
  if(!ib||!tiles.length||!area)return;
  var lt=tiles[tiles.length-1].getBoundingClientRect(),ar=area.getBoundingClientRect();
  ib.style.width=lt.width+'px';ib.style.right=(ar.right-lt.right)+'px';
}
function dshSetCP(p){dshCP=p;renderDashboard();}
function dshSetCK(k){dshCK=k;renderDashboard();}
function dshCoachCount(list,from,to,k){
  var n=0,plan=0,t=today();
  list.forEach(function(e){
    if(k==='qa'){(callRatings[e.id]||[]).forEach(function(r){if(r.date>=from&&r.date<=to)n++;});return;}
    (protocols[e.id]||[]).forEach(function(p){if(!p.date||p.date<from||p.date>to)return;if(p.status==='geplant'){if(p.date>=t)plan++;}else n++;});
  });
  return {n:n,plan:plan};
}
function dshCoachTile(list){
  var od=0,ds=[],qa=0;
  list.forEach(function(e){var d=tageSeitLetzterSession(e.id);if(d===null||d>30)od++;if(d!==null)ds.push(d);});
  try{qa=wizardQaFaelligList(list,60).length;}catch(e){qa=0;}
  return {od:od,avg:ds.length?Math.round(ds.reduce(function(a,b){return a+b;},0)/ds.length):null,qa:qa,n:list.length};
}
function dshCoachTip(ev,i){
  var D=window._dshCO;if(!D)return;var tt=document.getElementById('dshCoTt');if(!tt)return;
  var x=D.s[i];
  tt.innerHTML='<div class="tt-t">'+esc(x.l)+'</div><div class="tt-r f"><i style="background:#B8AC9B"></i>'+(D.k==='qa'?'QA-Bewertungen':'Sessions')+'<b>'+x.n+'</b></div>'+(D.k==='ses'&&x.plan?'<div class="tt-r"><i style="background:transparent;border-style:dashed"></i>noch geplant<b>'+x.plan+'</b></div>':'')+'<div class="tt-r"><i style="background:#3a3833"></i>Zielerreichung<b>'+(x.ze!=null?Math.round(x.ze)+' %':'–')+'</b></div>';
  tt.style.display='block';
  var area=tt.parentNode.getBoundingClientRect(),cx=(i+0.5)/D.s.length*area.width,w=tt.offsetWidth;
  tt.style.left=(cx+w+16>area.width?cx-w-12:cx+12)+'px';tt.style.top='60px';
}
function dshCoachTipHide(){var tt=document.getElementById('dshCoTt');if(tt)tt.style.display='none';}
function dshCoachBox(all,T){
  var TS=dshTSlots(dshCP),sl=TS.s,n=sl.length,t0=today(),cur=-1,k=dshCK;
  sl.forEach(function(x,i){if(x.f<=t0&&x.t>=t0)cur=i;});if(cur<0)cur=n-1;
  sl.forEach(function(x){var c=dshCoachCount(all,x.f,x.t,k);x.n=x.f>t0?0:c.n;x.plan=c.plan;x.fut=x.f>t0;x.ze=x.fut?null:dshTVal('ze',all,x.f,x.t);});
  var mxN=Math.max.apply(null,sl.map(function(x){return x.n+x.plan;}).concat([4]))*1.2;
  var zs=sl.map(function(x){return x.ze;}).filter(function(v){return v!==null;}),zmn=zs.length?Math.min.apply(null,zs.concat([100])):80,zmx=zs.length?Math.max.apply(null,zs.concat([100])):110,zp=(zmx-zmn)*0.15||5;zmn-=zp;zmx+=zp;
  window._dshCO={s:sl,k:k};
  var GAP=n>15?6:n>10?10:14;
  var ch='<div class="co-area"><div class="cols" style="gap:'+GAP+'px">';
  sl.forEach(function(x,i){
    ch+='<div class="col" onmousemove="dshCoachTip(event,'+i+')" onmouseleave="dshCoachTipHide()">'
      +(x.plan&&k==='ses'?'<div class="pl" style="bottom:'+(x.n/mxN*100).toFixed(2)+'%;height:'+(x.plan/mxN*100).toFixed(2)+'%"></div>':'')
      +(x.n?'<div class="br'+(i===cur?' cur':'')+'" style="height:'+(x.n/mxN*100).toFixed(2)+'%"></div>':'')+'</div>';
  });
  ch+='</div>';
  for(var g=2;g<mxN;g+=(mxN>40?10:mxN>16?4:2))ch+='<div class="gl" style="bottom:'+(g/mxN*100).toFixed(1)+'%"><span>'+g+'</span></div>';
  // Zielerreichung als Linie (eigene Skala, rechts beschriftet)
  var pts=[],dots='';sl.forEach(function(x,i){if(x.ze===null)return;var xx=(i+0.5)/n*100,yy=100-(x.ze-zmn)/(zmx-zmn)*100;pts.push(xx.toFixed(2)+','+yy.toFixed(2));dots+='<i class="zd" style="left:'+xx.toFixed(2)+'%;top:'+yy.toFixed(2)+'%"></i>';});
  ch+='<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="zl2" aria-hidden="true">'+(pts.length>1?'<polyline points="'+pts.join(' ')+'" fill="none" stroke="#3a3833" stroke-width="2.5" vector-effect="non-scaling-stroke"/>':'')+'</svg>'+dots;
  var y100=100-(100-zmn)/(zmx-zmn)*100;
  ch+='<div class="z100" style="top:'+y100.toFixed(1)+'%"><span>100 %</span></div><div class="tt" id="dshCoTt"></div></div>';
  ch+='<div class="tv-x co-x" style="gap:'+GAP+'px">'+sl.map(function(x,i){return '<span class="'+(i===cur?'cur':x.fut?'fut':'')+'">'+(n>15&&i%2&&i!==cur?'':x.l)+'</span>';}).join('')+'</div>';
  // Statuszeile
  var c0=sl[cur],tAll=dshCoachTile(all);
  var unit=k==='qa'?'QA-Bewertungen':'Sessions';
  var sline='<div class="sl"><span class="s">'+unit+' '+TS.cur+'</span><span class="v">'+c0.n+'</span><span class="s">'+(k==='ses'?'noch <b>'+c0.plan+'</b> geplant · ':'')+'<b'+(tAll.od?' class="dsh-lo"':'')+'>'+tAll.od+'</b> Mitarbeiter länger als 30 Tage ohne Coaching · Zielerreichung <b>'+(c0.ze!=null?Math.round(c0.ze)+' %':'–')+'</b></span>'
    +'<span class="lgx"><span><i style="background:#B8AC9B"></i>'+unit+'</span>'+(k==='ses'?'<span><i class="pli"></i>geplant</span>':'')+'<span><i style="height:3px;background:#3a3833"></i>Zielerreichung</span></span></div>';
  // Kacheln
  var cs=sl[cur],TEAMS=['SE','SR','OB','VLC'];
  function kv(l,v,lo){return '<div class="kv"><span>'+l+'</span><b class="'+(lo?'dsh-lo':'')+'">'+v+'</b></div>';}
  var gz=c0.ze,tiles='<div class="dsh-tcs co">';
  tiles+='<div class="dsh-tc dsh-ko"><div class="h">Gesamt<span>'+TS.cur+'</span></div><div class="v">'+cs.n+'</div><span class="dl">'+unit+(k==='ses'?' · noch <b>'+cs.plan+'</b> geplant':'')+'</span>'
    +'<div class="bx">'+kv('Zielerreichung',c0.ze!=null?Math.round(c0.ze)+' %':'–')+kv('überfällig &gt; 30 Tage',tAll.od+' von '+tAll.n)+kv('Ø Tage seit Coaching',tAll.avg!=null?tAll.avg:'–')+kv('QA fällig',tAll.qa)+'</div></div>';
  TEAMS.forEach(function(t){
    var L=T[t].list,c=dshCoachCount(L,cs.f,cs.t,k),ti=dshCoachTile(L),ze=dshTVal('ze',L,cs.f,cs.t<t0?cs.t:t0);
    tiles+='<div class="dsh-tc"><div class="h">'+t+'<span>'+L.length+' MA</span></div><div class="v">'+c.n+'</div><span class="dl">'+unit+'</span>'
      +'<div class="bx">'+kv('Zielerreichung',ze!=null?Math.round(ze)+' %':'–',ze!=null&&ze<100)+kv('überfällig &gt; 30 Tage',ti.od+' von '+ti.n,ti.od>0)+kv('Ø Tage seit Coaching',ti.avg!=null?ti.avg:'–',ti.avg!=null&&ti.avg>14)+kv('QA fällig',ti.qa,ti.qa>1)+'</div></div>';
  });
  tiles+='</div>';
  var per='<div class="dsh-seg" role="group" aria-label="Zeitraum">'+[['day','Tag'],['week','Woche'],['month','Monat']].map(function(p){return '<button type="button" class="'+(dshCP===p[0]?'on':'')+'" aria-pressed="'+(dshCP===p[0])+'" onclick="dshSetCP(\''+p[0]+'\')">'+p[1]+'</button>';}).join('')+'</div>';
  var kseg='<div class="dsh-seg" role="group" aria-label="Kennzahl">'+[['ses','Sessions'],['qa','QA-Bewertungen']].map(function(p){return '<button type="button" class="'+(dshCK===p[0]?'on':'')+'" aria-pressed="'+(dshCK===p[0])+'" onclick="dshSetCK(\''+p[0]+'\')">'+p[1]+'</button>';}).join('')+'</div>';
  return '<div class="card"><div class="card-title">Coaching und Wirkung<span class="dsh-tr">'+per+kseg+'</span></div><div class="dsh-tv"><div style="position:relative;height:46px;margin-left:50px">'+sline+'</div>'+ch+'</div>'+tiles
    +'<div class="dsh-why"><b>Warum:</b> zeigt, ob die schwachen Teams genug Coaching bekommen – und ob die Zielerreichung danach steigt.</div></div>';
}
function dshPlanMonth(list,mk){
  var key=mk+'|'+list.map(function(e){return e.id;}).join(',');
  if(_dshPlanCache[key])return _dshPlanCache[key];
  var y=+mk.slice(0,4),m=+mk.slice(5,7),last=new Date(Date.UTC(y,m,0)).getUTCDate(),fe=bayernFeiertage(y),days={},src='none',rec=zielStore[mk];
  for(var i=1;i<=last;i++)days[mk+'-'+('0'+i).slice(-2)]=0;
  var hasZv=rec&&Object.keys(rec).some(function(id){var r=rec[id];return r&&(r.optTag||0)*(r.margeOpt||0)>0;});
  if(hasZv){
    src='zv';
    var wMeta=getMonthWeeksZiel(mk);
    list.filter(function(e){return empActiveInZielMonth(e,mk);}).forEach(function(e){
      var r=rec[e.id]||{};var per=(r.optTag||0)*(r.margeOpt||0);if(!per)return;
      var nDays=wMeta.map(function(wm,i){return(r.weeks&&r.weeks[i]!=null)?r.weeks[i]:wm.defaultDays;}).reduce(function(a,b){return a+b;},0);
      var mz=nDays*per,at=r.arbeitstage,hasAt=(Array.isArray(at)&&at.length>0)||(at&&typeof at==='object'&&!Array.isArray(at)&&Object.keys(at).length>0);
      var w={},sw=0;
      Object.keys(days).forEach(function(d){
        var work=hasAt?(Array.isArray(at)?at.indexOf(d)>=0:at[d]==='work'):(dshIsWork(d)&&!fe[d]);
        if(e.startDate&&d<e.startDate)work=false;if(e.endDate&&d>e.endDate)work=false;
        if(!work)return;var hh=workHoursForDate(e,d)||0;if(hh>0){w[d]=hh;sw+=hh;}
      });
      if(sw>0)Object.keys(w).forEach(function(d){days[d]+=mz*w[d]/sw;});
    });
  } else if(zielNlTargets[mk]>0){
    src='nl';var wd=Object.keys(days).filter(function(d){return dshIsWork(d)&&!fe[d];});
    // B6 (Peter 24.11.: „NL-Ziel anteilig“): Teilmenge (Teamfilter) bekommt den Anteil ihrer Arbeitsstunden am Tag
    var allL=dshAll(),ids={};list.forEach(function(e){ids[e.id]=1;});
    var full=allL.every(function(e){return ids[e.id];});
    function hrs(L,d){var h=0;L.forEach(function(e){if(e.startDate&&d<e.startDate)return;if(e.endDate&&d>e.endDate)return;h+=workHoursForDate(e,d)||0;});return h;}
    wd.forEach(function(d){var sh=1;if(!full){var ha=hrs(allL,d);sh=ha>0?hrs(list,d)/ha:0;}days[d]=zielNlTargets[mk]/wd.length*sh;});
  }
  return (_dshPlanCache[key]={days:days,src:src});
}
function dshPlanRange(list,from,to){var z=0,d=from;while(d<=to){z+=dshPlanMonth(list,d.slice(0,7)).days[d]||0;d=addDaysUTC(d,1);}return z;}
function dshDayFrac(list){var pl=0,el=0;list.forEach(function(e){pl+=workHoursForDate(e,today())||0;el+=elapsedWorkHoursTodayFor(e)||0;});return pl>0?Math.max(0,Math.min(1,el/pl)):1;}
// Abschnitte des Diagramms (Tage bzw. Monate) inkl. Plan und Ist
function dshSlots(list,p){
  var t=today(),y=+t.slice(0,4),sl=[],WD=['So','Mo','Di','Mi','Do','Fr','Sa'];
  function dl(d){return d.slice(8,10)+'.'+d.slice(5,7)+'.';}
  if(p==='days')p='month';
  if(p==='months'||p==='years')p='year';
  if(p==='weeks'){buildYearWeeksForChart(y).forEach(function(w){sl.push({from:w.from,to:w.to,l:'KW '+w.kw});});}
  else if(p==='year'){var MS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    for(var i=1;i<=12;i++){var f=y+'-'+('0'+i).slice(-2)+'-01';sl.push({from:f,to:dshYmd(new Date(Date.UTC(y,i,0))),l:MS[i-1]});}}
  else if(p==='day'){var d=t,a=[];while(a.length<10){var fe=bayernFeiertage(+d.slice(0,4));if(dshIsWork(d)&&!fe[d])a.unshift(d);d=addDaysUTC(d,-1);}a.forEach(function(x){sl.push({from:x,to:x,l:dl(x)});});}
  else if(p==='week'){
    // Woche: alle Kalenderwochen des laufenden Monats, jeweils nur die Tage innerhalb des Monats
    var m0=t.slice(0,8)+'01',mEnd=dshYmd(new Date(Date.UTC(y,+t.slice(5,7),0))),mo=dshMonday(m0);
    while(mo<=mEnd){var fr=addDaysUTC(mo,4),f3=mo<m0?m0:mo,t3=fr>mEnd?mEnd:fr;
      if(f3<=t3)sl.push({from:f3,to:t3,l:'KW '+isoWeekNum(new Date(mo+'T00:00:00Z'))+' · '+(f3===t3?dl(f3):f3.slice(8,10)+'.–'+dl(t3))});
      mo=addDaysUTC(mo,7);}
  }
  else{var R=dshRange(p),d2=R.from,fe2=bayernFeiertage(y);while(d2<=R.end){if(dshIsWork(d2)&&!fe2[d2])sl.push({from:d2,to:d2,l:p==='week'?WD[new Date(d2+'T00:00:00Z').getUTCDay()]:dl(d2)});d2=addDaysUTC(d2,1);}}
  var frac=dshDayFrac(list),cur=-1;
  sl.forEach(function(s,i){
    s.plan=dshPlanRange(list,s.from,s.to);
    if(s.from<=t&&s.to>=t)cur=i;
    if(s.from<=t){var sm=chartSumsForRange(list,s.from,s.to<t?s.to:t);
      // Abschnitte ganz ohne importierte Daten (z. B. vor dem Start des Boards) nicht als 0 % werten
      if((sm.margeGes||0)===0&&(sm.oem+sm.ups+sm.wka+sm.nerrOem+sm.nerrUps)===0&&s.to<t){s.nodata=true;}
      else{s.v=[sm.margeOEM,sm.margeUps,sm.margeWka];s.tot=sm.margeGes;}}
  });
  // Plan bis jetzt im laufenden Abschnitt (heute anteilig nach verstrichener Arbeitszeit)
  sl.forEach(function(s,i){
    if(i!==cur)return;
    var pt=s.from===s.to?s.plan*frac:dshPlanRange(list,s.from,addDaysUTC(t,-1))+dshPlanRange(list,t,t)*frac;
    s.planNow=pt;s.running=true;
  });
  return {s:sl,cur:cur};
}
// Diagramm: Ziel je Abschnitt als heller Rahmen, Ist davor (OEM/UPS/WKA), Zielerreichung in % darüber
function dshFmtK(v){return v>=1e6?(v/1e6).toLocaleString('de-DE',{maximumFractionDigits:1})+' Mio':v>=1000?Math.round(v/1000)+'k':Math.round(v)+'';}
function dshChart(list,p){
  var SL=dshSlots(list,p),s=SL.s,n=s.length,cur=SL.cur,U=(p==='months'||p==='years')?'Monat':p==='weeks'?'Woche':'Tag',UU=(p==='months'||p==='years')?'Monaten':p==='weeks'?'Wochen':'Tagen';
  var anyPlan=s.some(function(x){return x.plan>0;});
  var mx=Math.max.apply(null,s.map(function(x){return Math.max(x.plan||0,x.v?x.tot:0);}).concat([1]))*1.2;
  var done=0,under=0,sumI=0,sumP=0,gap=n>40?3:n>15?6:n>10?10:14,step=n>40?4:n>15?2:1,showPc=n<=31;
  var cols='';
  s.forEach(function(x,i){
    var z=x.plan||0,fut=!x.v,run=!!x.running;
    if(x.v){sumI+=x.tot;sumP+=run?(x.planNow||0):z;}
    if(x.v&&!run&&z>0){done++;if(x.tot<z)under++;}
    var c='<div class="col" title="'+x.l+(x.v?': '+dshEur(x.tot):'')+(z>0?' · Ziel '+dshEur(z):'')+(run?' (läuft)':'')+(x.nodata?' · keine Daten':'')+'">';
    if(x.nodata)fut=true;
    if(z>0)c+='<div class="zf'+(fut?' fut':'')+'" style="height:'+(z/mx*100).toFixed(2)+'%"></div>';
    if(x.v&&x.tot>0)c+='<div class="ist'+(run?' cur':'')+(!showPc&&!run&&z>0&&x.tot<z?' lo':'')+'" style="height:'+(x.tot/mx*100).toFixed(2)+'%">'+x.v.map(function(v,k){return '<i style="height:'+(v/x.tot*100).toFixed(2)+'%;background:'+DSH_AC[k]+'"></i>';}).join('')+'</div>';
    if(x.v&&z>0&&showPc){var r=Math.round(x.tot/(run?(x.planNow||z):z)*100),lo=!run&&x.tot<z;
      c+='<div class="pc'+(lo?' lo':'')+(run?' run':'')+'" style="bottom:calc('+(Math.max(z,x.tot)/mx*100).toFixed(2)+'% + 4px)">'+(run?'läuft':r+' %')+'</div>';}
    cols+=c+'</div>';
  });
  var grid=[0.33,0.66].map(function(g){var v=mx/1.2*g*1.5;return v<mx?'<div class="gl" style="bottom:'+(v/mx*100).toFixed(1)+'%"><span>'+dshFmtK(v)+'</span></div>':'';}).join('');
  var dlt=sumI-sumP;
  var info=anyPlan?(done?'<b'+(under?' class="dsh-lo"':'')+'>'+under+' von '+done+' '+UU+'</b> unter Ziel · ':'')+'aufgelaufen <b class="'+(dlt<0?'dsh-lo':'')+'">'+(dlt>0?'+':'')+dshEur(dlt)+'</b> gegen Plan':'Für diesen Zeitraum ist kein Ziel hinterlegt';
  var leg=DSH_AREAS.map(function(a,i){return '<span><i style="background:'+DSH_AC[i]+'"></i>'+a+'</span>';}).join('')+(anyPlan?'<span><i class="zfl"></i>Ziel je '+U+'</span>':'');
  var lab=s.map(function(x,i){var lo=x.v&&!x.running&&x.plan>0&&x.tot<x.plan;return '<span class="'+(i===cur?'cur':lo?'lo':x.nodata?'nd':'')+'"'+(x.nodata?' title="keine Daten"':'')+'>'+(i%step&&i!==cur?'':x.l)+'</span>';}).join('');
  return '<div class="dsh-chart"><div class="hd"><span class="inf">'+info+'</span><span class="dsh-lg">'+leg+'</span></div>'
    +'<div class="area">'+grid+'<div class="cols" style="gap:'+gap+'px">'+cols+'</div></div><div class="xl" style="gap:'+gap+'px">'+lab+'</div></div>';
}
function dshLivePull(){var el=document.getElementById('dshLiveBox');if(!el||document.hidden||typeof sb==='undefined')return;var t=today(),from=kalAdd(t,-((new Date(t+'T12:00:00').getDay()+6)%7));if(t.slice(0,8)+'01'<from)from=t.slice(0,8)+'01';
  // Seitenweise laden (Supabase liefert max. 1000 Zeilen je Abfrage), feste Sortierung für stabile Seiten
  var PAGE=1000,rows=[];
  function page(off){var qq;try{qq=sb.from('performance').select(PERF_COLS);if(!qq||typeof qq.gte!=='function')return Promise.resolve(null);}catch(e){return Promise.resolve(null);}
    return qq.gte('date',from).order('employee_id').order('date').range(off,off+PAGE-1).then(function(res){if(!res||res.error)return null;var d=res.data||[];rows=rows.concat(d);return d.length===PAGE?page(off+PAGE):{data:rows};});}
  Promise.all([page(0),ftpLastSyncNachladen()]).then(function(a){var res=a[0];if(!res)return;var by={};(res.data||[]).forEach(function(r){(by[r.employee_id]=by[r.employee_id]||[]).push({
      date:r.date,notReached:r.oem_nicht_erreicht,notPossible:r.oem_nicht_moeglich,notSuccessful:r.oem_nicht_erfolgreich,convTW:r.oem_tw,convYes:r.oem_yes,convSY:r.oem_sy,convMY:r.oem_my,ups_yes:r.ups_yes,wka_gesamt_yes:r.wka_gesamt_yes,
      margeOEM:r.oem_margenerhoehung,margeUpsell:r.ups_margenerhoehung,margeWKA:r.wka_margenerhoehung,convOEM:r.oem_gesamt,oem_aktivitaeten:r.oem_aktivitaeten,optGesamt:r.gesamt_optimierungen,margeGesamt:r.gesamt_margenerhoehung,
      gesamtAktivitaeten:r.gesamt_aktivitaeten,gesamtNichtErreicht:r.gesamt_nicht_erreicht,gesamtNichtMoeglich:r.gesamt_nicht_moeglich,gesamtNichtErfolgreich:r.gesamt_nicht_erfolgreich,upsNichtErfolgreich:r.ups_nicht_erfolgreich,
      wkaOemNichtErfolgreich:r.wka_oem_nicht_erfolgreich,wkaUpsNichtErfolgreich:r.wka_ups_nicht_erfolgreich,wkaOemBeendet:r.wka_oem_beendet,wkaUpsBeendet:r.wka_ups_beendet});});
    // Nur Mitarbeiter mit neuen Daten aktualisieren – nie Daten im Speicher löschen, nur weil die Abfrage nichts liefert
    Object.keys(by).forEach(function(id){var old=(performance[id]||[]).filter(function(x){return x.date<from;});performance[id]=old.concat(by[id]).sort(function(a2,b2){return b2.date.localeCompare(a2.date);});});
    DSH_LIVE_STAND=new Date();var e2=document.getElementById('dshLiveBox');if(e2)e2.outerHTML=dshLiveCard();});}
function dshLiveHl(v){DSH_LIVE_HL=v;var el=document.getElementById('dshLiveBox');if(el)el.outerHTML=dshLiveCard();}
function dshLiveSet(v){DSH_LIVE=v;var el=document.getElementById('dshLiveBox');if(el)el.outerHTML=dshLiveCard();}
function dshLiveRows(v){var t=today(),dw=(new Date(t+'T12:00:00').getDay()+6)%7,from=v==='tag'?t:v==='woche'?kalAdd(t,-dw):t.slice(0,8)+'01',out=[];
  (employees||[]).forEach(function(e){if(e.active===false||!isAgentEmp(e))return;var rows=(performance[e.id]||[]).filter(function(x){return x.date>=from&&x.date<=t;});
    var q={oem:0,my:0,ye:0,sy:0,tw:0,ne:0,ups:0,une:0,wka:0,wne:0,m:0},hrs=0,seen={};
    rows.forEach(function(x){q.oem+=x.convOEM||0;q.my+=x.convMY||0;q.ye+=x.convYes||0;q.sy+=x.convSY||0;q.tw+=x.convTW||0;q.ne+=x.notSuccessful||0;q.ups+=x.ups_yes||0;q.une+=x.upsNichtErfolgreich||0;q.wka+=x.wka_gesamt_yes||0;
      q.wne+=(x.wkaOemNichtErfolgreich||0)+(x.wkaUpsNichtErfolgreich||0)+(x.wkaOemBeendet||0)+(x.wkaUpsBeendet||0);q.m+=x.margeGesamt||0;
      if(!seen[x.date]){seen[x.date]=1;hrs+=x.date===t?(elapsedWorkHoursTodayFor(e)||0):(workHoursForDate(e,x.date)||0);}});
    if(v!=='monat'&&!seen[t])hrs+=elapsedWorkHoursTodayFor(e)||0;
    var fk=typeof figFokus==='function'?figFokus(e):'OEM',fn=fk==='UPS'?q.ups:fk==='WKA'?q.wka:q.oem,fd=fk==='UPS'?q.ups+q.une:fk==='WKA'?q.wka+q.wne:q.oem+q.ne,opt=q.oem+q.ups+q.wka,tg=empTargets(e)||{};
    var oZ=(tg.optPerH&&tg.optPerH.val!=null&&tg.optPerH.val!=='')?+tg.optPerH.val:((settings.liveConfig||{}).optProStd!=null?+(settings.liveConfig||{}).optProStd:3.5);
    out.push({e:e,opt:opt,my:q.my,oemR:Math.max(0,q.oem-q.my),ups:q.ups,wka:q.wka,marge:q.m,hrs:hrs,oph:hrs>0?opt/hrs:0,soll:oZ*hrs,
      fo:fd>0?fn/fd*100:null,cm:(q.ye+q.sy+q.my)>0?q.my/(q.ye+q.sy+q.my)*100:null,tw:(q.tw+q.ye+q.sy+q.my)>0?q.tw/(q.tw+q.ye+q.sy+q.my)*100:null,sm:(q.ye+q.sy+q.my)>0?(q.sy+q.my)/(q.ye+q.sy+q.my)*100:null,ao:opt>0?q.oem/opt*100:null,
      z:{oph:tg.optPerH&&tg.optPerH.val,fo:tg.crOEM&&tg.crOEM.val,cm:tg.crMegaYes&&tg.crMegaYes.val,tw:tg.crTeilweise&&tg.crTeilweise.val,sm:tg.crSyMy&&tg.crSyMy.val,ao:tg.anteilOEM&&tg.anteilOEM.val},q:q,fk:fk});});
  out.sort(function(a,b){return v==='monat'?(b.oph-a.oph):(b.opt-a.opt||b.marge-a.marge);});return out;}
function dshLiveCard(){if(!DSH_LIVE_STAND&&!window._dshLivePulling){window._dshLivePulling=1;setTimeout(function(){dshLivePull();window._dshLivePulling=0;},300);}var v=DSH_LIVE,R=dshLiveRows(v),c=settings.liveConfig||{},N=R.length;
  var seg='<span class="dsh-seg" title="Bestwert (Top) oder schlechtesten Wert (Worst) je Kennzahl hervorheben">'+[['top','Top'],['worst','Worst']].map(function(x){return '<button type="button" class="'+(DSH_LIVE_HL===x[0]?'on':'')+'" onclick="dshLiveHl(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</span>'
    +'<span class="dsh-seg">'+[['tag','Tag'],['woche','Woche'],['monat','Monat']].map(function(x){return '<button type="button" class="'+(v===x[0]?'on':'')+'" onclick="dshLiveSet(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</span>';
  var h='<div class="card" id="dshLiveBox"><div class="card-title">Live<span class="dsh-tr"><span class="dsh-cr" style="margin-left:0">'+(v==='tag'?'heute':v==='woche'?'Montag bis heute':'1. bis heute')+' · alle aktiven Agents'+(DSH_LIVE_STAND?' · Stand '+('0'+DSH_LIVE_STAND.getHours()).slice(-2)+':'+('0'+DSH_LIVE_STAND.getMinutes()).slice(-2):'')+'</span>'+seg+'</span></div>';
  if(!N)return h+'<div class="kal-note" style="padding:24px;text-align:center">Für diesen Zeitraum gibt es noch keine Zahlen.</div></div>';
  var S={opt:0,hrs:0,m:0,soll:0,fn:0,fd:0,my:0,ysm:0};R.forEach(function(r){S.opt+=r.opt;S.hrs+=r.hrs;S.m+=r.marge;S.soll+=r.soll;var q=r.q;S.my+=q.my;S.ysm+=q.ye+q.sy+q.my;
    if(r.fk==='UPS'){S.fn+=q.ups;S.fd+=q.ups+q.une;}else if(r.fk==='WKA'){S.fn+=q.wka;S.fd+=q.wka+q.wne;}else{S.fn+=q.oem;S.fd+=q.oem+q.ne;}});
  var e0=function(x){return '€'+Math.round(x||0).toLocaleString('de-DE');},p0=function(x){return x==null?'–':Math.round(x)+' %';};
  var tile=function(l,val,sub,ko){return '<div class="dsh-qt'+(ko?' dsh-ko':'')+'"><div class="l">'+l+'</div><div class="v big">'+val+'</div><div class="kv"><span>'+sub+'</span></div></div>';};
  // ── Diagramm wie die Live-Ansicht, in den Dashboard-Farben ──
  var CM='#3A3530',CO='#5C564F',CU='#A89C8E',CW='#D3C8B6',isM=v==='monat';
  var G='display:grid;grid-template-columns:110px repeat('+N+',minmax(0,1fr));gap:6px;align-items:center';
  // allgemeines Soll (Vollzeit, 28 am Tag)
  var t0=today(),vz=R.map(function(r){return r.e;}).sort(function(a2,b2){return (workHoursForDate(b2,t0)||0)-(workHoursForDate(a2,t0)||0);})[0],vzS=0;
  if(isM)vzS=3.5;else if(vz){var dw0=(new Date(t0+'T12:00:00').getDay()+6)%7,f0=v==='tag'?t0:kalAdd(t0,-dw0),hh=0;for(var d0=f0;d0<=t0;d0=kalAdd(d0,1)){hh+=d0===t0?(elapsedWorkHoursTodayFor(vz)||0):(workHoursForDate(vz,d0)||0);}vzS=3.5*hh;}
  var val=function(r){return isM?r.oph:r.opt;},sol=function(r){return isM?((r.z.oph!=null&&r.z.oph!=='')?+r.z.oph:3.5):r.soll;};
  var mx=Math.max.apply(null,R.map(val).concat(R.map(sol)).concat([vzS,isM?4:10]))*1.12,st=isM?1:(mx>60?20:mx>30?10:5),yMax=Math.ceil(mx/st)*st,H=380,Yp=function(x){return x/yMax*H;};
  var und=R.filter(function(r){return val(r)<sol(r);}).length;
  var lg=[[CM,'OEM MY'],[CO,'OEM'],[CU,'UPS'],[CW,'WKA']].map(function(x){return '<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+x[0]+';margin-right:5px"></i>'+x[1]+'</span>';}).join('')
    +'<span><i style="display:inline-block;width:11px;height:9px;border:1.5px dashed #A89C8E;border-radius:2px;margin-right:5px;vertical-align:-1px"></i>persönliches Soll</span><span><i style="display:inline-block;width:16px;border-top:2px dashed #D9541E;margin-right:5px;vertical-align:3px"></i>'+(isM?'Soll 3,5 je Std.':'Soll für 28 am Tag')+'</span>';
  // Kennzahl-Band wie auf den Fernsehern, in Grau
  var zAvg=function(k,fb){var L=R.map(function(r){return r.z[k];}).filter(function(x){return x!=null&&x!=='';}).map(Number);return L.length?L.reduce(function(p2,q2){return p2+q2;},0)/L.length:(c[fb]!=null?+c[fb]:null);};
  var crF=S.fd>0?S.fn/S.fd*100:null,crY=S.ysm>0?S.my/S.ysm*100:null,zF=zAvg('fo','crOEM'),zY=zAvg('cm','crMY');
  var dif=function(x,z){if(x==null||z==null)return '';var d=Math.round(x)-Math.round(z);return d>=0?(d===0?'genau im Plan':d+' Pkt. drüber'):(-d<=3?'knapp ':'')+(-d)+' Pkt. darunter';};
  var bt=function(l,val,sub,w,mk,first){return '<div style="padding:0 22px;'+(first?'padding-left:0;':'border-left:1px solid #D9D2C6;')+'min-width:0"><div style="font-size:11.5px;font-weight:700;letter-spacing:.08em;color:#5f594e;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+l+'</div><div style="font-size:40px;font-weight:300;line-height:1.1;margin-top:4px;color:var(--text);white-space:nowrap">'+val+'</div><div style="font-size:12.5px;color:#6b665c;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+sub+'</div>'
    +'<div style="position:relative;height:6px;border-radius:3px;background:'+(w==null?'transparent':'#D9D2C6')+';margin-top:10px">'+(w==null?'':'<i style="position:absolute;left:0;top:0;bottom:0;width:'+Math.max(0,Math.min(100,w)).toFixed(1)+'%;border-radius:3px;background:#5C564F"></i>')+(mk!=null?'<u style="position:absolute;top:-3px;width:3px;height:12px;border-radius:2px;background:#1d1c1a;left:calc('+mk+'% - 1.5px)"></u>':'')+'</div></div>';};
  var oph0=S.hrs>0?S.opt/S.hrs:0;
  h+='<div style="background:#EFECE5;border-radius:12px;padding:12px 14px 14px"><div style="display:flex;align-items:center;font-size:11.5px;color:var(--text2);margin-bottom:12px;flex-wrap:wrap;gap:8px"><span><b style="color:#C9502F">'+und+' von '+N+' Agents</b> unter ihrem Soll</span><span style="margin-left:auto;display:flex;gap:14px;flex-wrap:wrap">'+lg+'</span></div>';
  var ax='';for(var yv=0;yv<=yMax+1e-9;yv+=st){ax+='<div style="position:absolute;left:0;right:0;bottom:'+Yp(yv).toFixed(1)+'px;border-top:1px solid '+(yv===0?'#BDB3A6':'rgba(0,0,0,.06)')+'"></div><span style="position:absolute;right:calc(100% + 8px);bottom:'+(Yp(yv)-7).toFixed(1)+'px;font-size:11px;color:var(--text3)">'+(isM?yv.toLocaleString('de-DE'):yv)+'</span>';}
  var now=new Date(),hm=('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
  var sline=vzS>0?'<div style="position:absolute;left:0;right:0;bottom:'+Yp(vzS).toFixed(1)+'px;border-top:2px dashed #D9541E;z-index:3"><span style="position:absolute;right:0;top:-20px;background:#D9541E;color:#fff;font-size:11px;font-weight:700;border-radius:5px;padding:1px 7px;white-space:nowrap">'+(isM?'Soll 3,5 je Std.':v==='woche'?'Soll Woche · '+Math.round(vzS)+' (28 am Tag)':'Soll '+hm+' · '+Math.round(vzS)+' (für 28 am Tag)')+'</span></div>':'';
  var cols=R.map(function(r){var x=val(r),hb=Math.max(2,Yp(x)),sh=Yp(sol(r)),tot=r.opt||1,lo=x<sol(r);
    var sg=[[r.wka,CW],[r.ups,CU],[r.oemR,CO],[r.my,CM]].filter(function(q2){return q2[0]>0;}).map(function(q2){return '<i style="display:block;height:'+(q2[0]/tot*hb).toFixed(1)+'px;background:'+q2[1]+'"></i>';}).join('');
    return '<div style="position:relative;height:'+H+'px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center">'+(sh>0?'<div style="position:absolute;left:8%;right:8%;bottom:0;height:'+sh.toFixed(1)+'px;border:1.5px dashed #A89C8E;border-bottom:0;border-radius:6px 6px 0 0;background:rgba(255,255,255,.35)"></div>':'')
      +'<b style="position:relative;font-size:13px;margin-bottom:3px;color:'+(lo?'#C9502F':'var(--text)')+'">'+(isM?x.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}):x)+'</b><span style="position:relative;display:flex;flex-direction:column;width:62%;border-radius:5px 5px 0 0;overflow:hidden">'+sg+'</span></div>';}).join('');
  h+='<div style="'+G+';align-items:end"><div style="height:'+H+'px;position:relative"><span style="position:absolute;left:2px;top:50%;transform:rotate(-90deg) translateX(-50%);transform-origin:0 0;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text3);white-space:nowrap;text-transform:uppercase">'+(isM?'Opt. je Stunde':'Optimierungen')+'</span></div>'
    +'<div style="grid-column:2 / span '+N+';position:relative;height:'+H+'px">'+ax+sline+'<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat('+N+',minmax(0,1fr));gap:6px;align-items:end">'+cols+'</div></div></div>';
  var line=function(l,f,mt){return '<div style="'+G+';margin-top:'+(mt||4)+'px"><span class="dlv-l">'+l+'</span>'+R.map(f).join('')+'</div>';};
  h+='<style>.dlv-c{display:block;text-align:center;font-size:12px;font-weight:700;border-radius:6px;padding:3px 0;white-space:nowrap;overflow:hidden}.dlv-l{font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text3);text-transform:uppercase}.dlv-n{font-size:12.5px;font-weight:700;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style>';
  h+=line('Marge',function(r){return '<span class="dlv-c" style="color:var(--text);background:none">'+(r.marge>=1000?'€'+(r.marge/1000).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+'k':e0(r.marge))+'</span>';},8);
  h+=line('Ø / Opt.',function(r){return '<span class="dlv-c" style="color:var(--text3);background:none;font-weight:600">'+(r.opt?e0(r.marge/r.opt):'–')+'</span>';},2);
  h+='<div style="border-top:1px solid #D3C8B6;margin-top:10px;padding-top:10px">';
  h+='<div style="'+G+'"><span class="dlv-l">Agents</span>'+R.map(function(r){return '<span class="dlv-n" title="'+esc(r.e.name)+'">'+esc(String(r.e.name).split(' ')[0])+'</span>';}).join('')+'</div>';
  // KPI-Zeilen: erreicht hellbeige, knapp mittelbraun, nicht erreicht fast schwarz, schlechtester Wert rot
  var kn=function(k,d){return c[k]!=null?+c[k]:d;},zz=function(r,k,fb){return r.z[k]!=null&&r.z[k]!==''?+r.z[k]:(c[fb]!=null?+c[fb]:null);};
  var kpi=function(l,get,zf,knapp,low,fmt){var vals=R.map(get),wi=-1,wv=null,bi=-1,bv=null;vals.forEach(function(x,i){if(x==null)return;if(wv==null||(low?x>wv:x<wv)){wv=x;wi=i;}if(bv==null||(low?x<bv:x>bv)){bv=x;bi=i;}});
    return line(l,function(r,i){var x=vals[i];if(x==null)return '<span class="dlv-c" style="color:#B4AC9C;background:none">–</span>';var t=fmt?fmt(x):Math.round(x)+' %',z=zf(r),stl;
      var HLS='background:#E2603C;color:#fff';
      if(N>1&&DSH_LIVE_HL==='top'&&i===bi)stl=HLS;else if(N>1&&DSH_LIVE_HL==='worst'&&i===wi&&!(z!=null&&(low?x<=z:x>=z)))stl=HLS;else if(z==null)stl='background:none;color:var(--text2)';else{var ok=low?x<=z:x>=z,mid=low?x<=z+knapp:x>=z-knapp,DK='background:#3A3530;color:#fff',LT='background:#D3C8B6;color:#5C564F';stl=ok?(DSH_LIVE_HL==='top'?DK:LT):mid?'background:#A89C8E;color:#fff':(DSH_LIVE_HL==='top'?LT:DK);}
      return '<span class="dlv-c" style="'+stl+'">'+t+'</span>';});};
  h+=kpi('Opt. je Std.',function(r){return r.hrs>0?r.oph:null;},function(r){return r.z.oph!=null&&r.z.oph!==''?+r.z.oph:(c.optProStd!=null?+c.optProStd:3.5);},0.3,false,function(x){return x.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});});
  h+=kpi('CR Fokus',function(r){return r.fo;},function(r){return zz(r,'fo','crOEM');},kn('knappOEM',5));
  h+=kpi('CR TW',function(r){return r.tw;},function(r){return zz(r,'tw','crTW');},kn('knappTW',5),true);
  h+=kpi('CR SY/MY',function(r){return r.sm;},function(r){return zz(r,'sm','crSM');},kn('knappSM',5));
  h+=kpi('CR MY',function(r){return r.cm;},function(r){return zz(r,'cm','crMY');},kn('knappMY',3));
  h+=kpi('Anteil OEM',function(r){return r.ao;},function(r){return zz(r,'ao','crAO');},kn('knappAO',5));
  h+='</div>';
  h+='</div>';
  return h+'</div>';}
function renderDashboard(){
  var ma=document.getElementById('mainArea');if(!ma)return;
  _dshPlanCache={};
  var R=dshRange(dshRangeKey(dshPeriod)),all=dshAll(),S=chartSumsForRange(all,R.from,R.to),P=chartSumsForRange(all,R.prevFrom,R.prevTo),T={};
  var prevHas=(P.margeGes||0)>0||(P.oem+P.ups+P.wka)>0;
  DSH_TEAMS.forEach(function(t){var l=dshTeam(t);T[t]={list:l,s:chartSumsForRange(l,R.from,R.to)};});
  var REF={},Z={};DSH_AREAS.concat(['MPO']).forEach(function(k){Z[k]=dshTarget(k);REF[k]=Z[k]!=null?Z[k]:(k==='MPO'?dshMpo(S,'ALL'):dshCr(S,k));});
  function under(k,v){return v!==null&&v!==undefined&&REF[k]!=null&&v<REF[k]-(Z[k]!=null?0:(k==='MPO'?1:2));}
  var h='<div class="content">'+buildGlobalBannerHtml(employees.filter(function(e){return !e.isPureCoach;}));
  var per=[['days','Tage'],['weeks','Wochen'],['months','Monate'],['years','Jahre']];
  var pseg='<div class="dsh-seg" role="group" aria-label="Zeitraum">'+per.map(function(p){return '<button type="button" class="'+(dshPeriod===p[0]?'on':'')+'" aria-pressed="'+(dshPeriod===p[0])+'" onclick="dshSetPeriod(\''+p[0]+'\')">'+p[1]+'</button>';}).join('')+'</div>';
  // ── 1 · Margenerhöhung: Diagramm, vier Kacheln, drei Bereichskarten ──
  var parts=[S.margeOEM,S.margeUps,S.margeWka],psum=parts[0]+parts[1]+parts[2],tot=S.margeGes,ziel=dshPlanRange(all,R.from,R.end),pct=ziel>0?Math.round(tot/ziel*100):null;
  // Vier Kacheln: große Zahl, darunter nur CR und Ø je Auftrag, mit Abstand die Teams (CR und Ø je Auftrag)
  var crAllRef=dshCr(S,'ALL');
  function tileTeams(k){
    var mx=Math.max.apply(null,DSH_TEAMS.map(function(t){return dshCr(T[t].s,k)||0;}).concat([(k==='ALL'?crAllRef:REF[k])||0]))*1.15||100;
    var r='<div class="tm"><div class="th"><span>Team</span><span>CR</span><span></span><span>Ø/Auftr.</span></div>';
    DSH_TEAMS.forEach(function(t){var c=dshCr(T[t].s,k),mp=dshMpo(T[t].s,k);
      if(c===null){r+='<div class="tr"><span class="n">'+t+'</span><span class="na">'+(t==='VLC'&&k!=='OEM'&&k!=='ALL'?'nur OEM':'keine Daten')+'</span></div>';return;}
      var lo=k==='ALL'?(crAllRef!=null&&c<crAllRef-2):under(k,c),lm=under('MPO',mp);
      r+='<div class="tr"><span class="n">'+t+'</span><span class="t"><i class="'+(lo?'lo':'')+'" style="width:'+Math.min(100,c/mx*100).toFixed(1)+'%"></i></span><span class="c'+(lo?' dsh-lo':'')+'">'+dshPct(c)+'</span><span class="m'+(lm?' dsh-lo':'')+'">'+dshEur1(mp)+'</span></div>';});
    return r+'</div>';
  }
  var tiles='<div class="dsh-q">';
  tiles+='<div class="dsh-qt dsh-ko"><div class="l">Gesamt · '+R.lbl+'</div><div class="v big">'+dshEur(tot)+'</div><div class="kv"><span>CR <b>'+dshPct(crAllRef)+'</b></span><span>Ø je Auftrag <b>'+dshEur1(dshMpo(S,'ALL'))+'</b></span></div>'+tileTeams('ALL')+'</div>';
  tiles+=DSH_AREAS.map(function(k,i){var v=parts[i],c=dshCr(S,k),mp=dshMpo(S,k),lo=under(k,c)&&Z[k]!=null,lm=under('MPO',mp);
    return '<div class="dsh-qt"><div class="l"><i class="dsh-dot" style="background:'+DSH_AC[i]+'"></i>'+k+'<span class="pc">'+(psum>0?Math.round(v/psum*100):0)+' %</span></div><div class="v big">'+dshEur(v)+'</div><div class="kv"><span>CR <b class="'+(lo?'dsh-lo':'')+'">'+dshPct(c)+'</b></span><span>Ø je Auftrag <b class="'+(lm?'dsh-lo':'')+'">'+dshEur1(mp)+'</b></span></div>'+tileTeams(k)+'</div>';}).join('')+dshDonutTile(parts,psum,S)+'</div>';
  var main='<div class="card"><div class="card-title">Margenerhöhung<span class="dsh-tr"><span class="dsh-cr" style="margin-left:0">Kacheln: '+(dshPeriod==='days'?'heute':dshPeriod==='weeks'?'laufende Woche':dshPeriod==='months'?'laufender Monat':'Geschäftsjahr '+R.lbl+' bis heute')+'</span>'+pseg+'</span></div>'+dshChart(all,dshPeriod)+tiles+'</div>';
  h+=dshLiveCard();
  h+=main;
  // ── 2 · Team-Steckbriefe: eine Kennzahl, Gesamt + SE/SR/OB/VLC ──
  h+=dshTeamBox(all,T);
  // ── 3 · Coaching und Wirkung ──
  h+=dshCoachBox(all,T);
  // ── 3 · Mitarbeiter (wie bisher) ──
  // Mitarbeiter-Abschnitt vorerst ausgeblendet (dshEmpSection bleibt erhalten)
  h+='</div>';
  // Scrollposition beim Neuzeichnen behalten (Filter, Kennzahl, Team), sonst springt die Seite nach oben
  var oc=ma.querySelector('.content'),st=oc?oc.scrollTop:0;
  ma.innerHTML=h;
  var nc=ma.querySelector('.content');if(nc&&st)nc.scrollTop=st;

}
function dshEmpSection(R,all,S,Z,REF,under){
  // ── 3 · Mitarbeiter ──
  var teamUps=dshCr(S,'UPS'),teamWka=dshCr(S,'WKA');
  var rows=all.map(function(e){
    var rr=(performance[e.id]||[]).filter(function(x){return x.date>=R.from&&x.date<=R.to;});if(!rr.length)return null;
    var s=chartSumsForRange([e],R.from,R.to),tg=empTargets(e),hrs=0,seen={};
    rr.forEach(function(x){if(!seen[x.date]){seen[x.date]=1;hrs+=workHoursForDate(e,x.date)||0;}});
    var o=dshOpt(s,'ALL'),K=[
      {l:'CR MY',v:dshCr(s,'MY'),z:tg.crMegaYes&&tg.crMegaYes.val,u:'%'},
      {l:'CR SY/MY',v:dshCr(s,'SYMY'),z:tg.crSyMy&&tg.crSyMy.val,u:'%'},
      {l:'CR OEM',v:dshCr(s,'OEM'),z:tg.crOEM&&tg.crOEM.val,u:'%'},
      {l:'CR UPS',v:dshCr(s,'UPS'),z:Z.UPS!=null?Z.UPS:teamUps,u:'%',avg:Z.UPS==null},
      {l:'CR WKA',v:dshCr(s,'WKA'),z:Z.WKA!=null?Z.WKA:teamWka,u:'%',avg:Z.WKA==null},
      {l:'Opt./Std.',v:hrs>0?o/hrs:null,z:tg.optPerH&&tg.optPerH.val,u:''},
      {l:'Ø je Auftrag',v:dshMpo(s,'ALL'),z:REF.MPO,u:'€',avg:Z.MPO==null}];
    K=K.filter(function(k){return k.v!==null&&k.z!=null&&k.z>0;}).map(function(k){k.g=(k.v-k.z)/k.z;return k;}).sort(function(a,b){return a.g-b.g;}).slice(0,3);
    return {e:e,t:dshTeamOf(e),mg:s.margeGes,o:o,mpo:dshMpo(s,'ALL'),w:K};
  }).filter(Boolean);
  if(dshEmpTeam!=='all')rows=rows.filter(function(r){return r.t===dshEmpTeam;});
  rows.sort(function(a,b){return b.mg-a.mg;});
  var mgMax=Math.max.apply(null,rows.map(function(r){return r.mg;}).concat([1])),best=null;
  rows.forEach(function(r){if(r.mpo!==null&&r.o>=10&&(!best||r.mpo>best.mpo))best=r;});
  function fmtK(k,v){return k.u==='%'?Math.round(v)+' %':k.u==='€'?dshEur1(v):v.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});}
  var tseg='<div class="dsh-seg" role="group" aria-label="Team">'+[['all','Alle']].concat(DSH_TEAMS.map(function(t){return [t,t];})).map(function(x){return '<button type="button" class="'+(dshEmpTeam===x[0]?'on':'')+'" aria-pressed="'+(dshEmpTeam===x[0])+'" onclick="dshSetEmpTeam(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>';
  var et='<div class="std-wrap"><table class="std-table"><thead><tr><th style="width:19%">Mitarbeiter</th><th style="width:21%">Margenerhöhung</th><th class="r" style="text-align:right;width:11%">Ø je Auftrag</th><th class="r" style="text-align:right;width:7%">Opt.</th><th>Drei größte Schwächen</th></tr></thead><tbody>';
  if(!rows.length)et+='<tr><td colspan="5" style="color:var(--text3)">Keine Daten im gewählten Zeitraum.</td></tr>';
  rows.forEach(function(r){
    var chips=r.w.map(function(k){return k.g>=0?'<span class="dsh-wk ok">'+k.l+' '+fmtK(k,k.v)+' <em>im Ziel</em></span>':'<span class="dsh-wk">'+k.l+' '+fmtK(k,k.v)+' <em>'+(k.avg?'Ø ':'Ziel ')+fmtK(k,k.z)+'</em></span>';}).join('');
    var mpoTxt=r===best?'<span class="dsh-pill">'+dshEur1(r.mpo)+'</span>':'<span style="font-weight:600" class="'+(under('MPO',r.mpo)?'dsh-lo':'')+'">'+dshEur1(r.mpo)+'</span>';
    et+='<tr style="cursor:pointer" onclick="selectEmp(\''+r.e.id+'\')"><td class="f">'+esc(r.e.name)+' <span class="dsh-tm">'+r.t+'</span></td><td><div class="dsh-cell">'+dshBar(r.mg,mgMax,false)+'<b>'+dshEur(r.mg)+'</b></div></td><td class="r">'+mpoTxt+'</td><td class="r">'+dshNum(r.o)+'</td><td><div class="dsh-chips">'+chips+'</div></td></tr>';
  });
  et+='</tbody></table></div>';
  return (dshCard('Mitarbeiter',R.lbl+' · sortiert nach Margenerhöhung · Koralle = bester Ø je Auftrag','<div style="margin-bottom:12px">'+tseg+'</div>'+et,'je Mitarbeiter die drei Kennzahlen mit dem größten Abstand zum Ziel – das sind die Coaching-Themen. Ziele individuell aus Stammdaten und Provisionsvereinbarung.'));
}
