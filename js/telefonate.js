// Sales OS – Menü „Telefonate“ (3CX): Banner-Folie + vier Boxen. Nur Funktionen; Zustand TEL in js/start.js.
// Vorlage 1:1: Entwurf D „Telefonate-Dashboard.dc.html“ (Design-Arbeitsfläche „Telefonie im Board – Entwürfe“).
// Daten: sb.rpc('telefonate_daten', {p_art, p_von, p_bis, p_param}) – rechnet in Live (SQL 61/63), DEV über SQL 62.

// ── Einstellungen (Einstellungen › Telefonate, Schlüssel telefonateConfig) ──
function telCfg(){var d={grenze:10,fenster:3,minHeat:20,minWv:100,deutlich:8,unter:3,ueber:3,zielAnnahme:null,sollKlingel:30};
  var s=(typeof settings!=='undefined'&&settings.telefonateConfig)||{};Object.keys(s).forEach(function(k){if(s[k]!==''&&s[k]!=null)d[k]=s[k];});return d;}

// ── Zahlen und Zeiten ──
function telN(n){return (Math.round(+n||0)).toLocaleString('de-DE');}
function telP(a,b){return b?Math.round(100*a/b):0;}
function telHM(sek){sek=Math.round(+sek||0);var h=Math.floor(sek/3600),m=Math.floor((sek%3600)/60);return h+':'+(m<10?'0':'')+m;}
function telMS(sek){sek=Math.round(+sek||0);var m=Math.floor(sek/60),s=sek%60;return m+':'+(s<10?'0':'')+s;}
function telDs(d){var z=function(x){return (x<10?'0':'')+x;};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}
function telD(ds){return new Date(ds+'T00:00:00');}
function telDM(ds){var d=telD(ds);return (d.getDate()<10?'0':'')+d.getDate()+'.'+(d.getMonth()<9?'0':'')+(d.getMonth()+1)+'.';}
function telMonName(ds){return ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][telD(ds).getMonth()];}
function telWdName(ds){return ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][telD(ds).getDay()];}
function telNice(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;return (f<=1?1:f<=1.5?1.5:f<=2?2:f<=2.5?2.5:f<=3?3:f<=4?4:f<=5?5:f<=6?6:f<=8?8:10)*p;}
// Achse: Schritt s, Obergrenze = Schritt·k/n (Entwurf: 4 Linien bei 3/14…12/14 bzw. 2 Linien bei 3/7, 6/7)
function telAxis(max,k,n){var s=telNice(max*n/k);while(s*k/n<max)s=telNice(s*1.0001+1e-9);return {step:s,top:s*k/n};}

// ── Zeiträume ──
function telToday(){return today();}
function telMonthStart(ds){return ds.slice(0,8)+'01';}
function telRange(kind){var t=telToday(),d=telD(t);
  if(kind==='tag')return {von:t,bis:t};
  if(kind==='woche'){var w=(d.getDay()+6)%7;return {von:telDs(new Date(d.getFullYear(),d.getMonth(),d.getDate()-w)),bis:t};}
  if(kind==='quartal')return {von:telDs(new Date(d.getFullYear(),Math.floor(d.getMonth()/3)*3,1)),bis:t};
  if(kind==='jahr')return {von:d.getFullYear()+'-01-01',bis:t};
  if(kind==='bisgestern'){var g=telDs(new Date(d.getFullYear(),d.getMonth(),d.getDate()-1));return {von:telMonthStart(g),bis:g};}
  return {von:telMonthStart(t),bis:t};}
function telRangeLabel(r){var a=telD(r.von),b=telD(r.bis);if(r.von===r.bis)return telWdName(r.von)+', '+telDM(r.von);
  if(r.von.slice(0,7)===r.bis.slice(0,7))return telMonName(r.von)+' · '+a.getDate()+'. bis '+telDM(r.bis);return telDM(r.von)+' bis '+telDM(r.bis);}
function telDates(r){var out=[],d=telD(r.von),e=telD(r.bis);while(d<=e){out.push(telDs(d));d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);}return out;}

// ── Daten laden (Zwischenspeicher 5 Min.) ──
function telParam(extra){var c=telCfg(),p={grenze:+c.grenze,fenster:+c.fenster};Object.keys(extra||{}).forEach(function(k){p[k]=extra[k];});return p;}
function telGet(art,r,extra){var p=telParam(extra),key=art+'|'+r.von+'|'+r.bis+'|'+JSON.stringify(p),c=TEL.cache[key];
  if(c&&(Date.now()-c.t<300000||c.laeuft))return c.err?{fehler:c.err}:c.d;
  TEL.cache[key]={t:Date.now(),laeuft:true,d:c?c.d:null};
  sb.rpc('telefonate_daten',{p_art:art,p_von:r.von,p_bis:r.bis,p_param:p}).then(function(res){
    TEL.cache[key]={t:Date.now(),d:res.error?null:res.data,err:res.error?(res.error.message||'Fehler'):null};
    if(view==='telefonate')telRerender();
    else if(bannerViewMode==='telefonate'){var gb=document.getElementById('gBan');if(gb)gb.outerHTML=buildGlobalBannerHtml(gbVisible());}});
  return c?c.d:null;}
function telRerender(){if(view!=='telefonate')return;if(TEL._rt)return;TEL._rt=setTimeout(function(){TEL._rt=null;renderTelefonate();},30);}
function telLaedt(x,h){if(x&&x.fehler)return '<div style="padding:18px;font-size:12px;color:#B5513A">Daten konnten nicht geladen werden: '+esc(x.fehler)+'</div>';
  return '<div style="height:'+(h||120)+'px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#9a948a">Daten werden geladen …</div>';}

// ── Mitarbeiter ──
function telEmp(id){return employees.find(function(e){return String(e.id)===String(id);});}
function telVorname(e){return String((e&&e.name)||'').split(' ')[0];}
function telTeam(e){if(!e)return 'Andere';if(e.role==='VLC')return 'VLC';if(e.phase==='Onboarding')return 'OB';if(e.role==='SE'||e.role==='SDL')return 'SE';if(e.role==='SR')return 'SR';return 'Andere';}
function telCrm(e,r){var a=0,n=0,has=false,L=(performance&&performance[e.id])||[];
  L.forEach(function(p){if(p.date>=r.von&&p.date<=r.bis){has=true;a+=+(p.gesamtAktivitaeten!=null?p.gesamtAktivitaeten:p.oem_aktivitaeten)||0;n+=+(p.gesamtNichtErreicht!=null?p.gesamtNichtErreicht:p.notReached)||0;}});
  return has?{akt:a,ne:n}:null;}

// ── Bausteine (Maße aus dem Entwurf) ──
function telSeg(opts,cur,fn,pad){return '<span onclick="event.stopPropagation()" style="display:inline-flex;gap:2px;background:#EFECE5;border:1px solid #E4E0D6;border-radius:11px;padding:2px;height:34px;align-items:center;box-sizing:border-box">'
  +opts.map(function(o){var on=o[0]===cur;return '<button type="button" onclick="'+fn+'(\''+o[0]+'\')" style="height:28px;padding:0 '+(pad||13)+'px;border-radius:9px;border:0;font:inherit;font-size:13px;cursor:pointer;'+(on?'background:#fff;color:#1a1a18;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)':'background:transparent;color:#6b6b67;font-weight:500')+'">'+o[1]+'</button>';}).join('')+'</span>';}
function telBox(k,titel,sub,rechts,body){var op=!!TEL[k];
  return '<section style="background:#F7F5F0;border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;box-shadow:0 12px 30px rgba(40,32,15,0.08);margin-bottom:22px">'
    +'<div style="display:flex;align-items:center;gap:10px;min-height:34px"><button type="button" onclick="telToggle(\''+k+'\')" style="all:unset;display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;min-width:0">'
    +'<span aria-hidden="true" style="width:28px;height:28px;border-radius:8px;background:#F08566;color:#fff;display:grid;place-items:center;font-size:17px;font-weight:600;line-height:1;flex-shrink:0">'+(op?'−':'+')+'</span>'
    +'<b style="font-size:14px">'+titel+'</b>'+(sub?'<span style="font-size:12px;color:#9a9a96;margin-left:8px">'+sub+'</span>':'')+'</button>'
    +'<span style="margin-left:auto;display:inline-flex;gap:8px;align-items:center">'+(op?'<span style="display:flex;gap:8px;align-items:center">'+rechts+'</span>':'<span style="font-size:12px;color:#9a948a">zum Aufklappen klicken</span>')+'</span></div>'
    +(op?'<div style="margin-top:14px">'+body+'</div>':'')+'</section>';}
function telLeg(items,gross){var w=gross?9:8;return '<span style="margin-left:auto;display:flex;gap:14px;align-items:center;font-size:'+(gross?'11.5':'11')+'px;color:#5f594e">'
  +items.map(function(i){return '<span style="display:inline-flex;align-items:center;gap:5px"><i style="display:inline-block;width:'+(i.w||w)+'px;height:'+(i.h!=null?i.h:w)+'px;border-radius:'+(i.r!=null?i.r:2)+'px;background:'+(i.bg||'transparent')+';'+(i.css||'')+'"></i>'+i.t+'</span>';}).join('')+'</span>';}
function telHead(links,leg){return '<div style="display:flex;align-items:center;gap:16px;font-size:12px;color:#5f594e;height:30px;margin-bottom:12px;white-space:nowrap;overflow:hidden"><span>'+links+'</span>'+leg+'</div>';}
// Kachel: hero = Koralle-Verlauf; rows = [{l, bar(0–100|null), n, p}]
function telTile(o){var h=!!o.hero,fg=h?'#fff':'#1d1c1a',mu=h?'#FFE1D6':'#5f594e',cols=o.cols||'92px 1fr 44px 40px';
  var s='<div style="'+(h?'background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);color:#fff;box-shadow:0 12px 28px rgba(40,32,15,0.18);':'background:#EFECE5;color:#1d1c1a;')+'border-radius:14px;padding:16px 16px 12px;display:flex;flex-direction:column;min-width:0">'
    +'<div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;color:'+mu+';display:flex;align-items:center">'+(o.icon?'<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+o.icon+';margin-right:6px"></i>':'')+o.kopf+'</div>'
    +'<div style="font-size:30px;font-weight:300;line-height:1.2;margin-top:6px">'+o.gross+' <span style="font-size:18px">'+(o.einheit||'')+'</span></div>'
    +'<div style="font-size:12px;color:'+(h?'#FFE1D6':'#8a8478')+';margin-top:2px;min-height:36px">'+(o.unter||'')+'</div>'
    +'<div style="border-top:1px solid '+(h?'rgba(255,255,255,0.3)':'#DDD6CA')+';margin:10px 0 8px"></div>'
    +'<div style="display:grid;grid-template-columns:'+cols+';gap:8px;font-size:10px;font-weight:700;letter-spacing:.06em;color:'+mu+';margin-bottom:2px">'+o.th.map(function(t,i){return '<span'+(i>1?' style="text-align:right"':'')+'>'+t+'</span>';}).join('')+'</div>';
  (o.rows||[]).forEach(function(r){s+='<div style="display:grid;grid-template-columns:'+cols+';gap:8px;align-items:center;height:26px;font-size:12px"><b style="white-space:nowrap;color:'+fg+'">'+r.l+'</b>'
    +(r.bar==null?'<span></span>':'<span style="height:6px;border-radius:3px;background:'+(h?'rgba(255,255,255,0.25)':'#E4E0D6')+';overflow:hidden"><i style="display:block;height:100%;width:'+Math.max(0,Math.min(100,r.bar))+'%;background:'+(h?'#fff':'#A89C8E')+';border-radius:3px"></i></span>')
    +'<b style="text-align:right;color:'+fg+'">'+r.n+'</b><span style="text-align:right;color:'+fg+'">'+r.p+'</span></div>';});
  return s+'</div>';}
function telTiles(arr){return '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;align-items:stretch;margin-top:14px">'+arr.join('')+'</div>';}
// Kästchen-Stufen (Box 1) und Heatmap-Farben (Box 4)
function telChip(txt,st){var S={dark:'background:#5F574D;color:#fff;border-color:#3E3833',mid:'background:#A89C8E;color:#fff;border-color:#8E8274',light:'background:#DDD6CA;color:#3a3833;border-color:#C2B9AB',pale:'background:#F7F5F0;color:#8a8478;border-color:#DDD6CA',none:'background:transparent;color:#B4AC9C;border-color:transparent'};
  return '<span style="flex:1;min-width:0;box-sizing:border-box;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border-radius:4px;border:1px solid;white-space:nowrap;overflow:hidden;'+S[st||'none']+'">'+txt+'</span>';}
// Abstand zum Ø → Stufe (gut = hoch; bei „umgekehrt“ ist hoch schlecht)
function telStufe(v,avg,umgekehrt){var c=telCfg(),d=umgekehrt?avg-v:v-avg;if(d< -c.deutlich)return 'dark';if(d< -c.unter)return 'mid';if(d<=c.ueber)return 'light';return 'pale';}

// ── Banner-Folie „Telefonate“ (Trichter, laufender Monat) ──
function telBannerHtml(){var r=telRange('monat'),t=telGet('trichter',r),c=telCfg();
  var kpi=function(lab,val,unit,pct,note,gross){return '<div style="padding:4px 14px;width:100%"><div style="font-size:9.5px;font-weight:600;color:#FFE1D6;letter-spacing:.04em;margin-bottom:6px">'+lab+'</div>'
    +'<div style="font-size:'+(gross?30:18)+'px;font-weight:700;line-height:1;margin-bottom:5px">'+val+' <span style="font-size:'+(gross?15:11)+'px;font-weight:500;color:#FFEDE6">'+unit+'</span></div>'
    +'<div style="height:9px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.15);border-radius:5px"><div style="height:100%;border-radius:5px;width:'+pct+'%;background:#fff"></div></div>'
    +'<div style="font-size:9.5px;color:#E9B2A6;margin-top:5px">'+note+'</div></div>';};
  var mon=telMonName(r.von),h='<div style="background:linear-gradient(135deg,#E9773F 0%,#DE5A5E 50%,#C23B66 100%);box-shadow:0 12px 28px rgba(40,32,15,0.22);border-radius:16px;padding:22px 26px 10px;color:#fff;margin-bottom:22px;margin-top:16px;min-height:var(--ban-h);width:100%;box-sizing:border-box;position:relative;overflow:hidden">';
  if(!t||t.fehler)return h+'<div style="display:flex;height:222px;align-items:center;justify-content:center;font-size:13px;color:#FFE1D6">'+(t&&t.fehler?'Telefonate: Daten nicht verfügbar':'Telefonate werden geladen …')+'</div>'+bannerDotsBar('telefonate')+'</div>';
  var E=+t.erstanruf||0,v=[E,+t.nicht_err||0,+t.rueck||0,+t.angen||0],x=[106.25,318.75,531.25,743.75];
  var hh=v.map(function(n){return E?140*Math.sqrt(n/E):0;}),f=function(n){return n.toFixed(1);};
  var top=hh.map(function(q){return 78-q/2;}),bot=hh.map(function(q){return 78+q/2;});
  var p='M 0.0 '+f(top[0])+' C 53.1 '+f(top[0])+', 53.1 '+f(top[0])+', 106.2 '+f(top[0]);
  for(var i=1;i<4;i++){var mx=(x[i-1]+x[i])/2;p+=' C '+f(mx)+' '+f(top[i-1])+', '+f(mx)+' '+f(top[i])+', '+f(x[i])+' '+f(top[i]);}
  p+=' C 796.9 '+f(top[3])+', 796.9 '+f(top[3])+', 850.0 '+f(top[3])+' L 850.0 '+f(bot[3])+' C 796.9 '+f(bot[3])+', 796.9 '+f(bot[3])+', 743.8 '+f(bot[3]);
  for(var j=3;j>0;j--){var mj=(x[j-1]+x[j])/2;p+=' C '+f(mj)+' '+f(bot[j])+', '+f(mj)+' '+f(bot[j-1])+', '+f(x[j-1])+' '+f(bot[j-1]);}
  p+=' C 53.1 '+f(bot[0])+', 53.1 '+f(bot[0])+', 0.0 '+f(bot[0])+' Z';
  var tx=function(xx,y,s,w,col,txt,extra){return '<text x="'+xx+'" y="'+y+'" text-anchor="middle" font-family="Urbanist" font-size="'+s+'"'+(w?' font-weight="'+w+'"':'')+' fill="'+col+'"'+(extra||'')+'>'+txt+'</text>';};
  var namen=['Erstanruf','Nicht erreicht','Ruft zurück','Angenommen'],anteil=[100,telP(v[1],v[0]),telP(v[2],v[1]),telP(v[3],v[2])];
  var notiz=['',telN(v[1]-v[2])+' rufen nicht zurück','Median '+telN(t.median_min)+' Min. bis zum Rückruf',telN(t.gleich_1)+' gleich beim 1. Rückruf'];
  var svg='<svg viewBox="0 0 1000 222" width="100%" height="222" style="display:block;overflow:visible" role="img" aria-label="Trichter vom Anrufversuch zum Gespräch, '+mon+'"><defs><linearGradient id="tfg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.22"></stop><stop offset="1" stop-color="#fff" stop-opacity="0.55"></stop></linearGradient></defs>'
    +'<path d="'+p+'" fill="url(#tfg)"></path>'+[212.5,425,637.5].map(function(lx){return '<line x1="'+lx+'" x2="'+lx+'" y1="4.0" y2="152.0" stroke="rgba(255,255,255,0.35)" stroke-width="1"></line>';}).join('');
  for(var k=0;k<4;k++){svg+=tx(x[k].toFixed(1),'84.0',17,700,'#fff',telN(v[k]))+tx(x[k].toFixed(1),'170.0',11.5,600,'#fff',namen[k])+tx(x[k].toFixed(1),'185.0',10.5,700,'#FFE1D6',telN(v[k])+' / '+anteil[k]+' %')+(notiz[k]?tx(x[k].toFixed(1),'199.0',9.5,0,'#E9B2A6',notiz[k]):'');}
  var verl=+t.verloren||0;
  svg+='<rect x="868" y="38.0" width="132" height="80" rx="10" fill="#fff"></rect>'+tx('934.0','79.0',28,700,'#C23B66',telN(verl))+tx('934.0','100.0',11,600,'#C23B66','nie durchgekommen')
    +tx('934.0','170.0',11.5,600,'#fff','Verloren')+tx('934.0','185.0',10.5,700,'#FFE1D6',telN(verl)+' / '+telP(verl,v[2])+' %')+tx('934.0','199.0',9.5,0,'#E9B2A6','der Rückrufer')
    +'<text x="1000" y="-6" text-anchor="end" font-family="Urbanist" font-size="9.5" letter-spacing=".04em" fill="#FFE1D6">'+(mon+' · 1. bis '+telDM(r.bis)+' · Kunden · Rückrufe der letzten '+c.fenster+' Tage noch offen').toUpperCase()+'</text></svg>';
  h+='<div style="display:flex;height:222px"><div style="width:16.6667%;flex-shrink:0;display:flex;flex-direction:column">'
    +'<div style="min-height:118px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.14);display:flex;align-items:center">'+kpi('ERREICHT BEIM 1. VERSUCH (MONAT)',telP(t.err1,E),'%',telP(t.err1,E),telN(t.err1)+' von '+telN(E)+' Kunden im '+mon,true)+'</div>'
    +'<div style="min-height:60px;display:flex;align-items:center">'+kpi('RÜCKRUFER NICHT DURCHGEKOMMEN',telN(verl),'Kunden',telP(verl,v[2]),telP(verl,v[2])+' % der '+telN(v[2])+' Rückrufer auf 800 / 831',false)+'</div></div>'
    +'<div style="flex:1;padding:0 4px 0 18px;height:222px">'+svg+'</div></div>'+bannerDotsBar('telefonate')+'</div>';
  return h;}

// ── Box 1: Telefonate je Mitarbeiter ──
function telBoxAgenten(){var c=telCfg(),r=telRange(TEL.per),d=telGet('agenten',r);
  var rechts='<span style="font-size:11.5px;color:#9a948a;margin-right:4px">'+telRangeLabel(r)+' · alle aktiven Agents · '+(TEL.per==='tag'?'ganzer Tag':TEL.per==='woche'?'ganze Woche':'ganzer Monat')+'</span>'
    +telSeg([['top','Top'],['worst','Worst']],TEL.hl,'telSetHl')+telSeg([['','Alle'],['MUC','Olching'],['VLC','Valencia']],TEL.ort,'telSetOrt')+telSeg([['tag','Tag'],['woche','Woche'],['monat','Monat']],TEL.per,'telSetPer');
  if(!TEL.a)return telBox('a','Telefonate je Mitarbeiter','',rechts,'');
  if(!d||d.fehler)return telBox('a','Telefonate je Mitarbeiter','',rechts,'<div style="background:#EFECE5;border-radius:14px;padding:12px 16px 14px">'+telLaedt(d,300)+'</div>');
  var dates=telDates(r),A=d.map(function(x){var e=telEmp(x.employee_id);return e&&e.active!==false?{e:e,x:x,tot:(+x.wv||0)+(+x.ein_ang||0)}:null;})
    .filter(function(a){return a&&a.tot>0&&(!TEL.ort||personOrt(a.e)===TEL.ort);});
  A.sort(function(p,q){return TEL.hl==='worst'?p.tot-q.tot:q.tot-p.tot;});
  if(!A.length)return telBox('a','Telefonate je Mitarbeiter','',rechts,'<div style="background:#EFECE5;border-radius:14px;padding:30px;text-align:center;font-size:12px;color:#9a948a">Keine Telefonate in diesem Zeitraum.</div>');
  var basis=A.filter(function(a){return a.x.wv>=c.minWv;}),sE=0,sW=0,sM=0;basis.forEach(function(a){sE+=a.x.err;sW+=a.x.wv;sM+=a.x.mb;});
  var avgE=telP(sE,sW),avgM=telP(sM,sW),unterAvg=basis.filter(function(a){return telP(a.x.err,a.x.wv)<avgE;}).length;
  var sum=0;A.forEach(function(a){sum+=a.tot;});var oT=Math.round(sum/A.length),max=0;A.forEach(function(a){max=Math.max(max,a.tot);});
  var stp=telNice(max/7),ax=Math.ceil(max/stp)*stp||stp,H=300;
  var leg=telLeg([{bg:'#5F574D',t:'Angenommen 800 / 831'},{bg:'#A89C8E',t:'Erreicht'},{bg:'#CBC2B5',t:'Mailbox'},{bg:'#E8E2D8',t:'Nicht erreicht'},{w:16,h:0,r:0,css:'border-top:2px dashed #D9541E',t:'Ø Telefonate Team'}]);
  var s='<div style="background:#EFECE5;border-radius:14px;padding:12px 16px 14px"><div style="display:flex;align-items:center;font-size:11.5px;color:#5f594e"><span><b style="color:#B5513A">'+unterAvg+' von '+basis.length+' Agents</b> unter der Ø Erreichtquote von '+avgE+' %</span>'+leg+'</div>';
  s+='<div style="display:grid;grid-template-columns:118px minmax(0,1fr);height:'+H+'px;margin-top:22px"><div style="position:relative"><span style="position:absolute;left:4px;top:50%;transform:rotate(-90deg) translateX(-50%);transform-origin:left top;font-size:9.5px;font-weight:700;letter-spacing:.08em;color:#9a948a;white-space:nowrap">TELEFONATE</span>';
  var ticks=[];for(var v=0;v<=ax+1e-9;v+=stp)ticks.push(v);
  ticks.forEach(function(v){s+='<span style="position:absolute;right:10px;bottom:'+(100*v/ax).toFixed(2)+'%;transform:translateY(50%);font-size:11px;color:#9a948a">'+telN(v)+'</span>';});
  s+='</div><div style="position:relative;border-bottom:1px solid #C9C2B4">';
  ticks.forEach(function(v){s+='<div style="position:absolute;left:0;right:0;bottom:'+(100*v/ax).toFixed(2)+'%;border-top:1px solid #E1DCD2"></div>';});
  s+='<div style="position:absolute;left:0;right:0;bottom:'+(100*oT/ax).toFixed(2)+'%;border-top:2px dashed #D9541E;z-index:2"><span style="position:absolute;right:0;top:-11px;background:#D9541E;color:#fff;font-size:10.5px;font-weight:700;border-radius:5px;padding:1px 7px;white-space:nowrap">Ø Telefonate Team · '+telN(oT)+'</span></div>';
  s+='<div style="position:absolute;inset:0;display:flex;gap:6px;align-items:flex-end;padding:0 4px">';
  A.forEach(function(a){var x=a.x,t=a.tot,hb=100*t/ax,seg=[[x.ein_ang,'#5F574D','#fff'],[x.err,'#A89C8E','#fff'],[x.mb,'#CBC2B5','#3a3833'],[x.ne,'#E8E2D8','#5f594e']];
    s+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0"><b style="font-size:12.5px;font-weight:700;margin-bottom:3px">'+telN(t)+'</b>'
      +'<span title="'+esc(a.e.name)+'" style="width:74%;height:'+hb.toFixed(2)+'%;display:flex;flex-direction:column-reverse;border-radius:3px 3px 0 0;overflow:hidden">';
    seg.forEach(function(g,i){if(!(+g[0]>0))return;var pc=100*g[0]/t,px=H*hb/100*pc/100;
      s+='<i style="display:flex;align-items:center;justify-content:center;flex-shrink:0;height:'+pc.toFixed(2)+'%;background:'+g[1]+';color:'+g[2]+';font-size:10px;font-style:normal;font-weight:700;overflow:hidden">'
        +(i===3&&x.klingel_ne!=null&&px>=14?'<span style="box-sizing:border-box;height:20px;min-width:34px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid #C2B9AB;background:#DDD6CA;color:#3a3833;font-size:11px;font-weight:700">'+Math.round(x.klingel_ne)+' s</span>':'')+'</i>';});
    s+='</span></div>';});
  s+='</div></div></div>';
  var row=function(lab,hgt,cells){return '<div style="display:grid;grid-template-columns:118px minmax(0,1fr);align-items:center;height:'+hgt+'px"><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9a948a;white-space:nowrap">'+lab+'</span><div style="display:flex;gap:6px;padding:0 4px;min-width:0">'+cells+'</div></div>';};
  var txt=function(t,css){return '<span style="flex:1;min-width:0;text-align:center;font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;'+(css||'color:#1d1c1a')+'">'+t+'</span>';};
  s+='<div style="margin-top:8px;display:flex;flex-direction:column;gap:2px">';
  s+=row('Gespr.-Zeit',22,A.map(function(a){return txt(telHM((+a.x.gz_aus||0)+(+a.x.gz_ein||0)));}).join(''));
  s+=row('Wahlv. / Std.',22,A.map(function(a){var hrs=perfHoursForDates(a.e,dates);return txt(hrs>0?telN(a.x.wv/hrs):'–','color:#9a948a;font-weight:600');}).join(''));
  s+='<div style="border-top:1px solid #DDD6CA;margin:8px 0 4px"></div>';
  s+=row('Agents',24,A.map(function(a){return '<span title="'+esc(a.e.name)+'" style="flex:1;min-width:0;text-align:center;font-weight:700;white-space:nowrap;overflow:hidden;font-size:12px;color:#1d1c1a">'+esc(telVorname(a.e))+'</span>';}).join(''));
  var cap=function(st,a){return (st==='dark'&&a.x.wv<c.minWv)?'mid':st;};
  s+=row('Erreicht',24,A.map(function(a){var q=telP(a.x.err,a.x.wv);return a.x.wv?telChip(q+' %',cap(telStufe(q,avgE,false),a)):telChip('–','none');}).join(''));
  s+=row('Mailbox',24,A.map(function(a){var q=telP(a.x.mb,a.x.wv);return a.x.wv?telChip(q+' %',cap(telStufe(q,avgM,true),a)):telChip('–','none');}).join(''));
  var crm=A.map(function(a){return telCrm(a.e,r);});
  s+=row('Wahlv. / CRM',24,A.map(function(a,i){var k=crm[i];if(!k||!k.akt)return telChip('–','none');var q=a.x.wv/k.akt;return telChip(q.toFixed(2).replace('.',','),q>=1?'mid':q>=0.95?'light':'pale');}).join(''));
  s+=row('N. err. Abw.',24,A.map(function(a,i){var k=crm[i];if(!k)return telChip('–','none');var dd=k.ne-((+a.x.ne||0)+(+a.x.mb||0));
    return telChip(dd===0?'±0':(dd>0?'+':'−')+Math.abs(dd),dd>=20?'pale':dd>=5?'light':'mid');}).join(''));
  s+='</div></div><div style="font-size:11px;color:#9a948a;margin-top:10px">Mailbox = angenommen unter '+c.grenze+' s · Zahl im Balken = Ø Klingelzeit bis zum Auflegen bei nicht erreicht · Std. laut Wochenarbeitszeit · N. err. Abw. = „nicht erreicht“ im CRM minus nicht erreicht + Mailbox in 3CX</div>';
  return telBox('a','Telefonate je Mitarbeiter','',rechts,s);}

// ── Box 2: Ausgehende Telefonate (Lead-Anrufe nach Versuch) ──
function telBoxAusgehend(){var c=telCfg(),r=telRange(TEL.vper),d=telGet('versuche',r);
  var titel=TEL.vper==='monat'?telMonName(r.von):TEL.vper==='quartal'?'Quartal':'Jahr';
  var rechts='<span style="font-size:12px;color:#9a948a">'+telRangeLabel(r)+'</span>'+telSeg([['monat','Monat'],['quartal','Quartal'],['jahr','Jahr']],TEL.vper,'telSetVper');
  var sub='nur Lead-Anrufe, ohne Rückrufe nach 800 / 831 · Kunden über die Telefonnummer · '+titel;
  if(!TEL.e||!d||d.fehler)return telBox('e','Ausgehende Telefonate',sub,rechts,TEL.e?'<div style="background:#EFECE5;border-radius:12px;padding:12px 16px 10px">'+telLaedt(d,230)+'</div>':'');
  var V={},G=d.gesamt||{},A4=d.ab4||{anrufe:0,err:0,mb:0,wg:0,na:0};(d.versuche||[]).forEach(function(v){V[v.n]=v;});
  var jeder=A4.err?Math.floor(A4.anrufe/A4.err):0;
  var kopf=(A4.err?'<b style="color:#B5513A">Ab dem 4. Versuch</b> erreicht ihr nur noch jeden '+jeder+'. Kunden · ':'')+'<b>'+telN(G.nur_einmal)+' Kunden</b> nach dem 1. Versuch nie wieder angerufen';
  var leg=telLeg([{css:'border:1px dashed #9a948a',t:'noch nicht erreichte Kunden'},{bg:'#A89C8E',t:'davon erreicht (ab '+c.grenze+' s)'},{w:14,h:0,r:0,css:'border-top:2.5px solid #E9773F',t:'ruft auf 800 / 831 zurück'}],true);
  var maxK=0,maxP=0,pts=[];for(var n=1;n<=6;n++){var v=V[n]||{kunden:0,err:0,rueck:0};maxK=Math.max(maxK,v.kunden);var pr=(v.kunden-v.err)?100*v.rueck/(v.kunden-v.err):0;pts.push(pr);maxP=Math.max(maxP,pr);}
  var aK=telAxis(maxK,14,3),aP=telAxis(maxP||1,14,3);
  var s='<div style="background:#EFECE5;border-radius:12px;padding:12px 16px 10px">'+telHead(kopf,leg)
    +'<div style="position:relative;height:230px;display:flex;align-items:flex-end;border-bottom:1px solid #D8D2C6;margin-left:46px;margin-right:36px">'
    +'<span style="position:absolute;left:-46px;top:-16px;font-size:10px;font-weight:700;letter-spacing:.06em;color:#7d776c">KUNDEN</span><span style="position:absolute;right:-36px;top:-16px;font-size:10px;font-weight:700;letter-spacing:.06em;color:#D9733F">RÜCKRUF</span>';
  for(var g=1;g<=4;g++){var b=(100*g*3/14).toFixed(2);s+='<div style="position:absolute;left:-46px;right:-36px;bottom:'+b+'%;border-top:1px solid #E1DCD2"><span style="position:absolute;left:0;top:-8px;font-size:11px;font-weight:600;color:#7d776c">'+telN(aK.step*g)+'</span><span style="position:absolute;right:0;top:-8px;font-size:11px;font-weight:600;color:#D9733F">'+telN(aP.step*g)+' %</span></div>';}
  var poly=pts.map(function(pr,i){return ((i+0.5)/6*100).toFixed(2)+','+(100-100*pr/aP.top).toFixed(2);}).join(' ');
  s+='<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;z-index:3;overflow:visible;pointer-events:none" aria-hidden="true"><polyline points="'+poly+'" fill="none" stroke="#E9773F" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"></polyline></svg>';
  pts.forEach(function(pr,i){var v=V[i+1]||{rueck:0},lx=((i+0.5)/6*100).toFixed(2),by=(100*pr/aP.top).toFixed(2);
    s+='<div style="position:absolute;left:'+lx+'%;bottom:'+by+'%;transform:translate(-50%,50%);width:9px;height:9px;border-radius:50%;background:#E9773F;border:2px solid #EFECE5;z-index:4"></div>'
      +'<div style="position:absolute;left:'+lx+'%;bottom:calc('+by+'% + 9px);transform:translateX(-50%);z-index:4;white-space:nowrap;font-size:10.5px;font-weight:700;color:#C2553A;background:#fff;border:1px solid #F3C6B5;border-radius:4px;padding:0 5px">'+telN(v.rueck)+' · '+Math.round(pr)+' %</div>';});
  s+='<div style="display:flex;gap:14px;width:100%;height:100%;position:relative;z-index:1">';
  for(var m=1;m<=6;m++){var w=V[m]||{kunden:0,err:0},ho=100*w.kunden/aK.top,hi=Math.max(w.err?1:0,100*w.err/aK.top),q=telP(w.err,w.kunden);
    s+='<div style="flex:1;height:100%;position:relative;min-width:0"><div style="position:absolute;left:15%;right:15%;bottom:0;height:'+ho.toFixed(2)+'%;border:1.5px dashed #BDB4A6;border-bottom:0;border-radius:4px 4px 0 0;box-sizing:border-box;background:rgba(255,255,255,.35)"></div>'
      +'<div style="position:absolute;left:28%;right:28%;bottom:0;height:'+hi.toFixed(2)+'%;background:#A89C8E;border-radius:4px 4px 0 0"></div>'
      +(w.kunden?'<div style="position:absolute;left:0;right:0;bottom:calc('+ho.toFixed(2)+'% + 4px);text-align:center;font-size:11.5px;font-weight:700;color:'+(m>=4?'#B5513A':'#1d1c1a')+'">'+q+' %</div>':'')+'</div>';}
  s+='</div></div><div style="display:flex;gap:14px;margin:6px 36px 0 46px;font-size:11px;color:#9a948a">';
  for(var l=1;l<=6;l++)s+='<span style="flex:1;text-align:center"><b style="color:#5f594e">'+l+'. Versuch</b> · '+telN((V[l]||{}).kunden||0)+'</span>';
  s+='</div></div>';
  var K=+G.kunden||0,e34=(+G.err3||0)+(+G.err4||0);
  var hero=telTile({hero:true,kopf:'GESAMT · '+titel.toUpperCase(),gross:telP(G.err,K),einheit:'% erreicht',unter:telN(G.err)+' von '+telN(K)+' Kunden · '+telN(G.nur_einmal)+' nur einmal angerufen',th:['KUNDEN','ANTEIL','KUNDEN','ANTEIL'],
    rows:[{l:'im 1. Versuch',bar:telP(G.err1,K),n:telN(G.err1),p:telP(G.err1,K)+' %'},{l:'im 2. Versuch',bar:telP(G.err2,K),n:telN(G.err2),p:telP(G.err2,K)+' %'},{l:'ab dem 3.',bar:telP(e34,K),n:telN(e34),p:telP(e34,K)+' %'},{l:'N.E.',bar:null,n:telN(G.nie),p:telP(G.nie,K)+' %'}]});
  var ergeb=function(v,anz){return [{l:'Erreicht',bar:telP(v.err,anz),n:telN(v.err),p:telP(v.err,anz)+' %'},{l:'Mailbox',bar:telP(v.mb,anz),n:telN(v.mb),p:telP(v.mb,anz)+' %'},{l:'Weggedrückt',bar:telP(v.wg,anz),n:telN(v.wg),p:telP(v.wg,anz)+' %'},{l:'N.E.',bar:null,n:telN(v.na),p:telP(v.na,anz)+' %'}];};
  var med=function(v){return v.median_std!=null?(Math.round(10*v.median_std)/10).toString().replace('.',',')+' Std.':'–';};
  var vt=function(n,icon){var v=V[n]||{kunden:0,err:0,mb:0,wg:0,na:0};var u=telN(v.err)+' von '+telN(v.kunden)+' Kunden · '+(n>1?'Median '+med(v)+' nach dem '+(n-1)+'. · Ø Gespräch '+telMS(v.gespraech_avg):'Ø Gespräch '+telMS(v.gespraech_avg)+' Min.');
    return telTile({icon:icon,kopf:n+'. VERSUCH',gross:telP(v.err,v.kunden),einheit:'% erreicht',unter:u,th:['ERGEBNIS','ANTEIL','ANRUFE','ANTEIL'],rows:ergeb(v,v.kunden)});};
  var t4=telTile({icon:'#DDD6CA',kopf:'4. VERSUCH UND SPÄTER',gross:telP(A4.err,A4.anrufe),einheit:'% erreicht',unter:telN(A4.err)+' von '+telN(A4.anrufe)+' Anrufen · '+telP(A4.wg,A4.anrufe)+' % drücken den Anruf weg',th:['ERGEBNIS','ANTEIL','ANRUFE','ANTEIL'],rows:ergeb(A4,A4.anrufe)});
  s+=telTiles([hero,vt(1,'#5F574D'),vt(2,'#A89C8E'),vt(3,'#C9C2B4'),t4]);
  return telBox('e','Ausgehende Telefonate',sub,rechts,s);}

// ── Box 3: Eingehende Anrufe (800 / 831) ──
function telBoxEingehend(){var c=telCfg(),rm=telRange('monat'),gp=TEL.eper==='wochen'?'woche':TEL.eper==='monate'?'monat':'tag';
  var rc=gp==='tag'?rm:gp==='woche'?{von:telDs(new Date(telD(telToday()).getFullYear(),telD(telToday()).getMonth(),telD(telToday()).getDate()-7*11-((telD(telToday()).getDay()+6)%7))),bis:telToday()}:telRange('jahr');
  var ch=telGet('eingang',rc,{gruppierung:gp}),k=telGet('eingang_kacheln',rm),mon=telMonName(rm.von);
  var rechts='<span style="font-size:12px;color:#9a948a">Kacheln: '+mon+'</span>'+telSeg([['tage','Tage'],['wochen','Wochen'],['monate','Monate']],TEL.eper,'telSetEper');
  var sub='Sales Rückruf 800 · Warteschleife 831 · eingegangen, angenommen und was danach passiert';
  if(!TEL.c)return telBox('c','Eingehende Anrufe',sub,rechts,'');
  if(!ch||ch.fehler||!k||k.fehler)return telBox('c','Eingehende Anrufe',sub,rechts,'<div style="background:#EFECE5;border-radius:12px;padding:12px 16px 10px">'+telLaedt((ch&&ch.fehler)?ch:k,230)+'</div>');
  var hz=k.heute||{n:0,ueber2:0};
  var kopf='<b style="color:#B5513A">Heute '+telN(hz.n)+' Kunden angerufen und nicht durchgekommen</b>'+(hz.n?', '+telN(hz.ueber2)+' davon seit über 2 Std.':'');
  var leg=telLeg([{bg:'#5F574D',t:'800 angenommen'},{bg:'#A89C8E',t:'831 angenommen'},{css:'border:1px dashed #9a948a',t:'Eingegangen'}],true);
  // Spalten: Tage = alle Werktage des Monats (Zukunft leer), Wochen = 12 Wochen, Monate = Jahr
  var M={};ch.forEach(function(x){M[x.k]=x;});var cols=[],t=telToday();
  if(gp==='tag'){var d=telD(rm.von),ende=new Date(d.getFullYear(),d.getMonth()+1,0);while(d<=ende){if(d.getDay()>0&&d.getDay()<6)cols.push(telDs(d));d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);}}
  else if(gp==='woche'){var w=telD(rc.von);for(var i=0;i<12;i++){cols.push(telDs(w));w=new Date(w.getFullYear(),w.getMonth(),w.getDate()+7);}}
  else{for(var mm=0;mm<12;mm++)cols.push(telD(t).getFullYear()+'-'+(mm<9?'0':'')+(mm+1)+'-01');}
  var aktuell=function(ds){return gp==='tag'?ds===t:gp==='woche'?(ds<=t&&telDs(new Date(telD(ds).getFullYear(),telD(ds).getMonth(),telD(ds).getDate()+7))>t):ds.slice(0,7)===t.slice(0,7);};
  var max=0;ch.forEach(function(x){max=Math.max(max,x.n);});var ax=telAxis(max||1,7,3);
  var s='<div style="background:#EFECE5;border-radius:12px;padding:12px 16px 10px">'+telHead(kopf,leg)+'<div style="position:relative;height:230px;display:flex;align-items:flex-end;border-bottom:1px solid #D8D2C6;margin-left:46px">';
  for(var g=1;g<=2;g++)s+='<div style="position:absolute;left:-46px;right:0;bottom:'+(100*g*3/7).toFixed(1)+'%;border-top:1px solid #E4E0D6"><span style="position:absolute;left:0;top:-8px;font-size:11px;color:#9a9a96">'+telN(ax.step*g)+'</span></div>';
  s+='<div style="display:flex;gap:8px;width:100%;height:100%;position:relative;z-index:1">';
  cols.forEach(function(ds){var x=M[ds],zuk=ds>t&&!aktuell(ds);
    if(zuk||!x){s+='<div style="flex:1;height:100%;position:relative;min-width:0">'+(zuk?'<div style="position:absolute;left:0;right:0;bottom:0;height:60%;border:1.5px dashed #DDD6CA;border-bottom:0;border-radius:4px 4px 0 0;box-sizing:border-box"></div>':'')+'</div>';return;}
    var ang=(+x.a800||0)+(+x.a831||0),ho=100*x.n/ax.top,hi=100*ang/ax.top,jetzt=aktuell(ds);
    s+='<div style="flex:1;height:100%;position:relative;min-width:0"><div title="'+telDM(ds)+' · '+telN(x.n)+' eingegangen, '+telN(ang)+' angenommen" style="position:absolute;left:0;right:0;bottom:0;height:'+ho.toFixed(2)+'%;border:1.5px dashed #BDB4A6;border-bottom:0;border-radius:4px 4px 0 0;box-sizing:border-box;background:rgba(255,255,255,.35)"></div>'
      +'<div style="position:absolute;left:18%;right:18%;bottom:0;height:'+hi.toFixed(2)+'%;display:flex;flex-direction:column-reverse;border-radius:4px 4px 0 0;overflow:hidden'+(jetzt?';box-shadow:0 0 0 2px #F08566':'')+'"><i style="display:block;height:'+(ang?100*x.a800/ang:0).toFixed(2)+'%;background:#5F574D"></i><i style="display:block;height:'+(ang?100*x.a831/ang:0).toFixed(2)+'%;background:#A89C8E"></i></div>'
      +'<div style="position:absolute;left:0;right:0;bottom:calc('+ho.toFixed(2)+'% + 4px);text-align:center;font-size:11px;font-weight:700;color:'+(jetzt?'#9a948a':'#B5513A')+'">'+(jetzt?'läuft':telP(ang,x.n)+' %')+'</div></div>';});
  s+='</div></div><div style="display:flex;gap:8px;margin:6px 0 0 46px;font-size:11px">';
  cols.forEach(function(ds,i){var jetzt=aktuell(ds),lab=gp==='tag'?telDM(ds):gp==='woche'?'KW '+kalKw(ds):['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][telD(ds).getMonth()];
    s+='<span style="flex:1;min-width:0;text-align:center;'+(jetzt?'font-weight:700;color:#B5513A':'color:#9a948a')+'">'+((i%2===0||jetzt||gp==='monat')?lab:'')+'</span>';});
  s+='</div></div>';
  var Gr={};(k.gruppen||[]).forEach(function(x){Gr[x.g]=x;});var g8=Gr['800']||{n:0,ang:0},g3=Gr['831']||{n:0,ang:0},kz=k.kern||{n:0,ang:0};
  var hero=telTile({hero:true,kopf:'ANGENOMMEN · '+mon.toUpperCase(),gross:telP(k.ang,k.n),einheit:'%',unter:telN(k.ang)+' von '+telN(k.n)+' Anrufen auf 800 / 831',th:['GRUPPE','QUOTE','ANRUFE','QUOTE'],
    rows:[{l:'800 Rückruf',bar:telP(g8.ang,g8.n),n:telN(g8.n),p:telP(g8.ang,g8.n)+' %'},{l:'831 Warteschl.',bar:telP(g3.ang,g3.n),n:telN(g3.n),p:telP(g3.ang,g3.n)+' %'},{l:'Kernzeit',bar:telP(kz.ang,kz.n),n:telN(kz.n),p:telP(kz.ang,kz.n)+' %'}]});
  var T={SE:0,SR:0,OB:0,VLC:0,Andere:0},tsum=0;(k.von||[]).forEach(function(v){var tm=telTeam(telEmp(v.employee_id));T[tm]+=+v.n||0;tsum+=+v.n||0;});
  var trows=['SE','SR','OB','VLC'].map(function(tm){return {l:tm,bar:telP(T[tm],tsum),n:T[tm]?telN(T[tm]):'–',p:telP(T[tm],tsum)+' %'};});if(T.Andere)trows.push({l:'Andere',bar:telP(T.Andere,tsum),n:telN(T.Andere),p:telP(T.Andere,tsum)+' %'});
  var von=telTile({icon:'#5F574D',kopf:'ANGENOMMEN VON',gross:telN(k.ang),einheit:'Anrufe',unter:'Ø Gespräch '+telMS(k.gespraech_avg)+' Min. · Ø Wartezeit '+telN(k.warte_ang_avg)+' s',th:['TEAM','ANTEIL','ANRUFE','ANTEIL'],cols:'34px 1fr 44px 40px',rows:trows});
  var gw=k.gewartet||{},gs=(+gw.u15||0)+(+gw.m15_59||0)+(+gw.ab60||0);
  var warten=telTile({icon:'#A89C8E',kopf:'WARTEN UND AUFLEGEN',gross:telN(k.warte_auflegen_avg),einheit:'s',unter:'legt ein Kunde im Ø auf, wenn niemand abnimmt · angenommen wird nach '+telN(k.warte_ang_avg)+' s',th:['GEWARTET','ANTEIL','ANRUFE','ANTEIL'],
    rows:[{l:'unter 15 s',bar:telP(gw.u15,gs),n:telN(gw.u15),p:telP(gw.u15,gs)+' %'},{l:'15–59 s',bar:telP(gw.m15_59,gs),n:telN(gw.m15_59),p:telP(gw.m15_59,gs)+' %'},{l:'60 s und mehr',bar:telP(gw.ab60,gs),n:telN(gw.ab60),p:telP(gw.ab60,gs)+' %'}]});
  var vp=k.verpasst||{n:0},vn=+vp.n||0,vrows=[{l:'Angerufen',bar:telP(vp.angerufen,vn),n:telN(vp.angerufen),p:telP(vp.angerufen,vn)+' %'},{l:'Durchgekommen',bar:telP(vp.durch,vn),n:telN(vp.durch),p:telP(vp.durch,vn)+' %'},{l:'Kein Kontakt',bar:telP(vp.kein,vn),n:telN(vp.kein),p:telP(vp.kein,vn)+' %'}];
  if(+vp.unbekannt)vrows.push({l:'ohne Nummer',bar:telP(vp.unbekannt,vn),n:telN(vp.unbekannt),p:telP(vp.unbekannt,vn)+' %'});
  var verp=telTile({icon:'#E9773F',kopf:'VERPASST · '+mon.toUpperCase(),gross:telN(vn),einheit:'Anrufe',unter:'Was passiert in den '+c.fenster+' Tagen danach.',th:['DANACH','ANTEIL','ANRUFE','ANTEIL'],rows:vrows});
  var au=k.ausser||{n:0},an=+au.n||0;
  var auss=telTile({icon:'#DDD6CA',kopf:'AUSSERHALB DER KERNZEIT',gross:telN(an),einheit:'Anrufe',unter:telP(an,k.n)+' % aller Anrufe · nur '+telN(au.ang)+' davon angenommen',th:['ZEIT','ANTEIL','ANRUFE','ANTEIL'],
    rows:[{l:'ab 17 Uhr',bar:telP(au.ab17,an),n:telN(au.ab17),p:telP(au.ab17,an)+' %'},{l:'Fr ab 14 Uhr',bar:telP(au.fr14,an),n:telN(au.fr14),p:telP(au.fr14,an)+' %'},{l:'Wochenende',bar:telP(au.we,an),n:telN(au.we),p:telP(au.we,an)+' %'},{l:'vor 8 Uhr',bar:telP(au.vor8,an),n:telN(au.vor8),p:telP(au.vor8,an)+' %'}]});
  s+=telTiles([hero,von,warten,verp,auss]);
  return telBox('c','Eingehende Anrufe',sub,rechts,s);}

// ── Box 4: Erreichbarkeit (Heatmap) ──
function telAgentenListe(){return employees.filter(function(e){return e.active!==false&&isAgentEmp(e);}).sort(function(a,b){return telVorname(a).localeCompare(telVorname(b),'de');});}
function telFilterIds(){if(TEL.emp)return [TEL.emp];if(TEL.team)return telAgentenListe().filter(function(e){return telTeam(e)===TEL.team;}).map(function(e){return String(e.id);});return null;}
function telBoxErreichbarkeit(){var c=telCfg(),r=telRange('bisgestern'),aus=TEL.dir!=='ein',ids=telFilterIds();
  var extra={richtung:TEL.dir,versuch:aus?TEL.att:'alle'};if(ids)extra.employee_ids=ids;
  var d=telGet('heatmap',r,extra),mon=telMonName(r.von);
  var btn=function(lab,val,fn){return '<button type="button" onclick="event.stopPropagation();'+fn+'()" style="height:34px;padding:0 12px;border-radius:11px;border:1px solid #E4E0D6;background:#EFECE5;font:inherit;font-size:13px;font-weight:600;color:#1a1a18;cursor:pointer;display:inline-flex;align-items:center;gap:8px"><span style="color:#6b6b67;font-weight:500">'+lab+'</span>'+val+'</button>';};
  var teamTxt=TEL.emp?esc(telVorname(telEmp(TEL.emp))):TEL.team||'Alle Teams',vTxt=TEL.att==='alle'?'Alle':TEL.att==='4'?'4.+ Versuch':TEL.att+'. Versuch';
  var rechts='<span style="font-size:12px;color:#9a948a">'+telRangeLabel(r)+'</span>'+btn('Agents',teamTxt,'telToggleTf')+(aus?btn('Versuch',vTxt,'telToggleTv'):'')+telSeg([['aus','Ausgehend'],['ein','Eingehend']],TEL.dir,'telSetDir',12);
  var sub='Erreichbarkeit je Stunde · ausgehend nach Versuch oder eingehend';
  if(!TEL.d)return telBox('d','Erreichbarkeit',sub,rechts,'');
  var pop='';var pb=function(lab,on,fn,arg,links){return '<button type="button" onclick="'+fn+'(\''+arg+'\')" style="height:28px;padding:0 '+(links?10:12)+'px;border-radius:8px;font:inherit;font-size:12.5px;cursor:pointer;'+(on?'background:#1d1c1a;color:#fff;border:1px solid #1d1c1a;font-weight:600':'background:#F7F5F0;color:#3a3833;border:1px solid #E4E0D6')+(links?';text-align:left':'')+'">'+lab+'</button>';};
  var box=function(inh){return '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><div style="background:#EFECE5;border:1px solid #E4E0D6;border-radius:12px;padding:12px;width:460px;box-shadow:0 12px 30px rgba(40,32,15,0.12)">'+inh+'</div></div>';};
  var tt='font-size:10px;font-weight:700;letter-spacing:.06em;color:#5f594e;margin-bottom:6px';
  if(TEL.tv&&aus)pop+=box('<div style="'+tt+'">VERSUCH</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+[['alle','Alle Versuche'],['1','1. Versuch'],['2','2. Versuch'],['3','3. Versuch'],['4','4.+ Versuch']].map(function(o){return pb(o[1],TEL.att===o[0],'telSetAtt',o[0]);}).join('')+'</div>');
  if(TEL.tf)pop+=box('<div style="'+tt+'">TEAM</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+[['','Alle Teams'],['SE','SE'],['SR','SR'],['OB','OB'],['VLC','VLC']].map(function(o){return pb(o[1],!TEL.emp&&TEL.team===o[0],'telSetTeam',o[0]);}).join('')+'</div>'
    +'<div style="'+tt+'">EINZELNER AGENT</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">'+telAgentenListe().map(function(e){return pb(esc(telVorname(e)),String(TEL.emp)===String(e.id),'telSetEmp',e.id,true);}).join('')+'</div>');
  if(!d||d.fehler)return telBox('d','Erreichbarkeit',sub,rechts,pop+'<div style="background:#EFECE5;border-radius:12px;padding:12px 16px 10px">'+telLaedt(d,230)+'</div>');
  var Z={},tn=0,tok=0,wdS={},bk=[[8,10,'8–10 Uhr'],[10,12,'10–12 Uhr'],[12,14,'12–14 Uhr'],[14,16,'14–16 Uhr'],[16,18,'ab 16 Uhr']],bS=bk.map(function(){return {n:0,ok:0};}),we=0,weOk=0;
  d.forEach(function(x){Z[x.wd+'-'+x.std]=x;if(x.std<8||x.std>17)return;if(x.wd>=6){we+=x.n;weOk+=x.ok;return;}tn+=x.n;tok+=x.ok;wdS[x.wd]=wdS[x.wd]||{n:0,ok:0};wdS[x.wd].n+=x.n;wdS[x.wd].ok+=x.ok;
    bk.forEach(function(b,i){if(x.std>=b[0]&&x.std<b[1]){bS[i].n+=x.n;bS[i].ok+=x.ok;}});});
  var avg=telP(tok,tn),W=['','Mo','Di','Mi','Do','Fr','Sa','So'];
  var kopf='<b>Ø '+avg+' % '+(aus?'erreicht':'angenommen')+'</b> · Mo–Fr 8–18 Uhr · Anrufe · Quote · „–“ unter '+c.minHeat+' Anrufe · Wochenende: '+(we?(aus?telN(we)+' Anrufe':'kaum Anrufe, '+(weOk?telN(weOk)+' angenommen':'keine angenommen')):'keine Anrufe');
  var leg=telLeg([{bg:'#5F574D',t:'deutlich unter Ø'},{bg:'#A89C8E',t:'unter Ø'},{bg:'#DDD6CA',t:'um Ø'},{bg:'#F7F5F0',css:'border:1px solid #DDD6CA',t:'über Ø'}],true);
  var FS={dark:'background:#5F574D;color:#fff',mid:'background:#A89C8E;color:#fff',light:'background:#DDD6CA;color:#3a3833',pale:'background:#F7F5F0;color:#5f594e;border:1px solid #DDD6CA',klein:'background:transparent;color:#B4AC9C;border:1px dashed #DDD6CA'};
  var s=pop+'<div style="background:#EFECE5;border-radius:12px;padding:12px 16px 10px">'+telHead(kopf,leg)+'<div style="height:230px;display:flex;flex-direction:column;justify-content:space-between">';
  var zellen=[];
  for(var wd=1;wd<=7;wd++){s+='<div style="display:grid;grid-template-columns:34px repeat(10,minmax(0,1fr));gap:5px;height:22px"><b style="font-size:11.5px;display:flex;align-items:center">'+W[wd]+'</b>';
    for(var h=8;h<=17;h++){var x=Z[wd+'-'+h]||{n:0,ok:0},q=telP(x.ok,x.n),st=x.n<c.minHeat?'klein':telStufe(q,avg,false);
      if(x.n>=c.minHeat&&wd<=5)zellen.push({wd:wd,h:h,n:x.n,ok:x.ok,q:q});
      s+='<span title="'+W[wd]+' '+h+':00 · '+telN(x.n)+' Anrufe" style="box-sizing:border-box;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;'+FS[st]+'">'
        +(x.n>=c.minHeat?'<span style="font-weight:500;opacity:.75">'+telN(x.n)+'</span>&nbsp;·&nbsp;'+q+' %':(x.n?'<span style="font-weight:500;opacity:.75">'+telN(x.n)+'</span>':''))+'</span>';}
    s+='</div>';}
  s+='</div><div style="display:grid;grid-template-columns:34px repeat(10,minmax(0,1fr));gap:5px;margin-top:6px;font-size:11px;color:#9a948a"><span></span>';
  for(var hh=8;hh<=17;hh++)s+='<span style="text-align:center">'+hh+':00</span>';
  s+='</div></div>';
  var minB=aus?80:40,kand=zellen.filter(function(z){return z.n>=minB;});
  var best=kand.slice().sort(function(a,b){return b.q-a.q||b.n-a.n;}).slice(0,4),schw=kand.slice().sort(function(a,b){return a.q-b.q||b.n-a.n;}).slice(0,4);
  var zr=function(z){return {l:W[z.wd]+' '+z.h+':00',bar:z.q*1.6,n:telN(z.n),p:z.q+' %'};};
  var hero=telTile({hero:true,kopf:(aus?'ERREICHT':'ANGENOMMEN')+' · '+mon.toUpperCase(),gross:avg,einheit:'%',unter:telN(tok)+' von '+telN(tn)+' Anrufen · '+telRangeLabel(r).replace(mon+' · ','')+' · Mo–Fr 8–18 Uhr',th:['WOCHENTAG','QUOTE','ANRUFE','QUOTE'],
    rows:[1,2,3,4,5].map(function(w){var x=wdS[w]||{n:0,ok:0};return {l:W[w],bar:telP(x.ok,x.n)*1.6,n:telN(x.n),p:telP(x.ok,x.n)+' %'};})});
  var bt=best[0],sw=schw[0];
  var tBest=telTile({icon:'#F7F5F0',kopf:'BESTE STUNDEN',gross:bt?bt.q:'–',einheit:bt?'%':'',unter:bt?W[bt.wd]+' '+bt.h+':00 Uhr · '+(aus?'hier lohnt sich das Telefonieren am meisten':'hier lohnt sich die Besetzung am meisten'):'zu wenige Anrufe',th:['ZEIT','QUOTE','ANRUFE','QUOTE'],rows:best.map(zr)});
  var tSchw=telTile({icon:'#5F574D',kopf:'SCHWÄCHSTE STUNDEN',gross:sw?sw.q:'–',einheit:sw?'%':'',unter:sw?W[sw.wd]+' '+sw.h+':00 Uhr · '+(aus?'hier erreicht ihr am wenigsten':'hier gehen die meisten Anrufe verloren'):'zu wenige Anrufe',th:['ZEIT','QUOTE','ANRUFE','QUOTE'],rows:schw.map(zr)});
  var bi=0;bS.forEach(function(b,i){if(telP(b.ok,b.n)>telP(bS[bi].ok,bS[bi].n))bi=i;});
  var tZeit=telTile({icon:'#A89C8E',kopf:'JE TAGESZEIT',gross:telP(bS[bi].ok,bS[bi].n),einheit:'%',unter:'beste Tageszeit: '+bk[bi][2],th:['ZEIT','QUOTE','ANRUFE','QUOTE'],rows:bS.map(function(b,i){return {l:bk[i][2],bar:telP(b.ok,b.n)*1.6,n:telN(b.n),p:telP(b.ok,b.n)+' %'};})});
  var tAnz;if(aus)tAnz=telTile({icon:'#DDD6CA',kopf:'ANRUFE JE TAGESZEIT',gross:telN(tn),einheit:'Anrufe',unter:'wann ihr telefoniert · zum Vergleich mit der Quote',th:['ZEIT','ANTEIL','ANRUFE','ANTEIL'],rows:bS.map(function(b,i){return {l:bk[i][2],bar:telP(b.n,tn)*2,n:telN(b.n),p:telP(b.n,tn)+' %'};})});
  else{var vs=tn-tok;tAnz=telTile({icon:'#DDD6CA',kopf:'VERPASST JE TAGESZEIT',gross:telN(vs),einheit:'Anrufe',unter:'nicht angenommen · '+telRangeLabel(r).replace(mon+' · ',''),th:['ZEIT','ANTEIL','ANRUFE','ANTEIL'],rows:bS.map(function(b,i){var m=b.n-b.ok;return {l:bk[i][2],bar:telP(m,vs)*2,n:telN(m),p:telP(m,vs)+' %'};})});}
  s+=telTiles([hero,tBest,tSchw,tZeit,tAnz]);
  return telBox('d','Erreichbarkeit',sub,rechts,s);}

// ── Seite ──
function renderTelefonate(){var ma=document.getElementById('mainArea');if(!ma)return;
  var h='<div class="content">'+buildGlobalBannerHtml(gbVisible())+telBoxAgenten()+telBoxAusgehend()+telBoxEingehend()+telBoxErreichbarkeit()+'</div>';
  var oc=ma.querySelector('.content'),st=oc?oc.scrollTop:0;ma.innerHTML=h;var nc=ma.querySelector('.content');if(nc&&st)nc.scrollTop=st;}
function selectTelefonate(){view='telefonate';bannerViewMode='telefonate';resetBannerRotation();renderSidebar();renderMain();}
function telToggle(k){TEL[k]=!TEL[k];renderTelefonate();}
function telSetHl(v){TEL.hl=v;renderTelefonate();}
function telSetOrt(v){TEL.ort=v;renderTelefonate();}
function telSetPer(v){TEL.per=v;renderTelefonate();}
function telSetVper(v){TEL.vper=v;renderTelefonate();}
function telSetEper(v){TEL.eper=v;renderTelefonate();}
function telSetDir(v){TEL.dir=v;TEL.tv=false;renderTelefonate();}
function telToggleTv(){TEL.tv=!TEL.tv;TEL.tf=false;renderTelefonate();}
function telToggleTf(){TEL.tf=!TEL.tf;TEL.tv=false;renderTelefonate();}
function telSetAtt(v){TEL.att=v;TEL.tv=false;renderTelefonate();}
function telSetTeam(v){TEL.team=v;TEL.emp='';TEL.tf=false;renderTelefonate();}
function telSetEmp(v){TEL.emp=String(v);TEL.team='';TEL.tf=false;renderTelefonate();}

// ── Einstellungen › Telefonate ──
function buildTelefonateSettingsHtml(){var c=telCfg(),f=function(k,lab,hint,unit){return '<div><label for="tel-'+k+'">'+lab+'</label><div style="display:flex;align-items:center;gap:8px"><input id="tel-'+k+'" type="number" value="'+(c[k]==null?'':c[k])+'" style="max-width:120px" onchange="telSaveCfg(\''+k+'\',this.value)"><span class="kal-note">'+(unit||'')+'</span></div>'+(hint?'<div class="kal-note" style="margin-top:4px">'+hint+'</div>':'')+'</div>';};
  return sCard('ti-phone','Telefonate','Regeln für das Menü „Telefonate“ (3CX)','',
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">'
    +f('grenze','Mailbox-Grenze','Angenommen, aber kürzer als diese Grenze, zählt als Mailbox.','Sekunden')
    +f('fenster','Rückruf-Fenster','So lange nach einem Anruf zählt ein Anruf auf 800 / 831 als Rückruf.','Tage')
    +f('minHeat','Mindestanrufe Heatmap','Darunter zeigt eine Zelle nur die Anzahl.','Anrufe')
    +f('minWv','Mindest-Wahlversuche','Für „unter Ø“ und die dunkle Markierung in Box 1.','Wahlversuche')
    +f('deutlich','Farbschwelle „deutlich unter Ø“','','Prozentpunkte')
    +f('unter','Farbschwelle „unter Ø“','','Prozentpunkte')
    +f('ueber','Farbschwelle „über Ø“','','Prozentpunkte')
    +f('zielAnnahme','Ziel Annahmequote eingehend','Noch offen. Solange leer, wird nichts danach eingefärbt.','%')
    +f('sollKlingel','Soll-Klingeldauer','Empfehlung 25 s.','Sekunden')
    +'<div><label>Kernzeit</label><div class="kal-note">Mo–Fr 8–17 Uhr, Freitag bis 14 Uhr (fest in der Auswertung)</div></div></div>');}
function telSaveCfg(k,v){var c=(settings.telefonateConfig=settings.telefonateConfig||{});c[k]=v===''?null:+v;TEL.cache={};saveSettingJson('telefonateConfig',c,'Telefonate-Einstellung geändert: '+k);}
