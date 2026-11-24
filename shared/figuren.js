// Sales OS – Figuren der Live-Ansicht (KID_*, kidShade, kidSvg, kidDefault)
// Wird von index.html UND live.html geladen. Nur Funktionen und feste Konstanten.

// Kinder-Figur (eigene Zeichnung) – o={g,skin,hair,shirt,hc,eye,freck,bart,unten,hose,schuh,muster,brille,hut,headset,ohrringe,letter}
var KID_N=0;
var KID_SKIN={hell:['#F8D6BE','#E8B494'],mittel:['#C99068','#A26A44'],dunkel:['#9A6440','#6E4026']};
var KID_HC={schwarz:['#1d1410','#3A2A20'],dunkelbraun:['#3A2418','#5A3A26'],braun:['#5A3A26','#7A5236'],blond:['#C98F2E','#EBC260'],rot:['#9A3A22','#C2603A'],grau:['#7E786E','#B4AC9C']};
var KID_EYE={braun:'#6B4226',blau:'#3E7CB1',gruen:'#4E8C5A'};
function kidShade(hex,f){var n=parseInt(String(hex||'#888888').slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;r=Math.round(r*f);g=Math.round(g*f);b=Math.round(b*f);return '#'+((1<<24)+(Math.min(255,r)<<16)+(Math.min(255,g)<<8)+Math.min(255,b)).toString(16).slice(1);}
function kidSvg(o){o=o||{};var girl=o.g==='w',sk=KID_SKIN[o.skin]||KID_SKIN.hell,sh=o.shirt||'#F2884F',hs=o.hair||(girl?'zopf':'kurz'),g='kd'+(++KID_N);
  var hcK=o.hc||((o.skin==='dunkel'||o.skin==='mittel')?'schwarz':'braun'),hc=KID_HC[hcK]||KID_HC.braun,h1=hc[0],h2=hc[1];
  var unten=o.unten||(girl?'rock':'hose'),hose=o.hose||(unten==='rock'?sh:'#3E5C8A'),schuh=o.schuh||(girl?'#C84B4B':'#7A4A2A'),eyeC=KID_EYE[o.eye]||KID_EYE.braun,hut=o.hut||'keine';
  var d='<defs><radialGradient id="'+g+'s" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="'+sk[0]+'"/><stop offset="1" stop-color="'+sk[1]+'"/></radialGradient>'
    +'<linearGradient id="'+g+'t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+kidShade(sh,1.08)+'"/><stop offset="1" stop-color="'+kidShade(sh,.82)+'"/></linearGradient>'
    +'<linearGradient id="'+g+'p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+kidShade(hose,1.05)+'"/><stop offset="1" stop-color="'+kidShade(hose,.8)+'"/></linearGradient>'
    +'<linearGradient id="'+g+'h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+h2+'"/><stop offset="1" stop-color="'+h1+'"/></linearGradient>'
    +'<clipPath id="'+g+'c"><rect x="42" y="96" width="36" height="56" rx="14"/></clipPath></defs>';
  var S='url(#'+g+'s)',T='url(#'+g+'t)',P='url(#'+g+'p)',H='url(#'+g+'h)',rock=unten==='rock';
  function arm(c,x){return '<g class="'+c+'" style="transform-origin:'+x+'px 104px"><rect x="'+(x-6)+'" y="100" width="12" height="26" rx="6" fill="'+T+'"/><rect x="'+(x-4.5)+'" y="122" width="9" height="26" rx="4.5" fill="'+S+'"/><circle cx="'+x+'" cy="150" r="6.5" fill="'+S+'"/></g>';}
  function leg(c,x){return '<g class="'+c+'" style="transform-origin:'+x+'px 160px"><rect x="'+(x-7)+'" y="156" width="14" height="60" rx="7" fill="'+(rock?S:P)+'"/><path d="M'+(x-9)+' 212 h16 a7 7 0 0 1 7 7 v3 h-25 v-4 a6 6 0 0 1 2-6z" fill="'+schuh+'"/></g>';}
  // Haare hinten (lang, Pferdeschwanz, Bob)
  var back='';
  if(hut!=='kopftuch'){
    if(hs==='zopf'||hs==='lang')back+='<path d="M30 48 Q28 '+(hs==='lang'?124:110)+' 40 '+(hs==='lang'?136:128)+' Q60 144 80 '+(hs==='lang'?136:128)+' Q92 '+(hs==='lang'?124:110)+' 90 48 Z" fill="'+H+'"/>';
    if(hs==='zopf')back+='<path d="M86 40 Q112 52 104 92 Q100 108 92 112 Q98 88 90 62Z" fill="'+H+'"/>';
    if(hs==='bob')back+='<path d="M28 50 Q26 92 40 92 L80 92 Q94 92 92 50 Z" fill="'+H+'"/>';
  }
  var body=leg('lg2',68)+arm('ar2',78);
  body+='<rect x="42" y="96" width="36" height="56" rx="14" fill="'+T+'"/>';
  var mu=o.muster||'keins';
  if(mu==='streifen')body+='<g clip-path="url(#'+g+'c)" fill="#fff" opacity=".32"><rect x="40" y="104" width="40" height="5"/><rect x="40" y="116" width="40" height="5"/><rect x="40" y="128" width="40" height="5"/><rect x="40" y="140" width="40" height="5"/></g>';
  else if(mu==='punkte')body+='<g clip-path="url(#'+g+'c)" fill="#fff" opacity=".4">'+[[50,106],[66,110],[56,120],[72,124],[48,132],[62,136],[70,144],[52,146]].map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6"/>';}).join('')+'</g>';
  else if(mu==='buchstabe'&&o.letter)body+='<text x="60" y="132" text-anchor="middle" font-family="Urbanist,Arial,sans-serif" font-size="22" font-weight="800" fill="#fff" opacity=".9">'+String(o.letter).charAt(0).toUpperCase()+'</text>';
  body+=rock?'<path d="M40 144 L80 144 L88 170 Q60 177 32 170 Z" fill="'+P+'"/>':'<rect x="42" y="146" width="36" height="18" rx="6" fill="'+P+'"/>';
  body+=leg('lg1',52);
  // Kopf
  var he='<circle cx="34" cy="58" r="7" fill="'+S+'"/><circle cx="86" cy="58" r="7" fill="'+S+'"/>';
  if(o.ohrringe)he+='<circle cx="34" cy="67" r="2.6" fill="#E9C46A"/><circle cx="86" cy="67" r="2.6" fill="#E9C46A"/>';
  he+='<circle cx="60" cy="56" r="30" fill="'+S+'"/><rect x="54" y="82" width="12" height="16" rx="5" fill="'+S+'"/>';
  function eye(x){return '<ellipse cx="'+x+'" cy="60" rx="7" ry="8.5" fill="#fff"/><circle cx="'+(x+.6)+'" cy="61.5" r="5.2" fill="'+eyeC+'"/><circle cx="'+(x+.6)+'" cy="61.5" r="2.8" fill="#1d1c1a"/><circle cx="'+(x+2.4)+'" cy="59" r="1.8" fill="#fff"/><circle cx="'+(x-1.2)+'" cy="64" r=".9" fill="#fff"/>';}
  he+='<g class="eyes" style="transform-origin:60px 60px">'+eye(49)+eye(71)+'</g>';
  if(girl)he+='<path d="M41 53 l-3 -2 M42 51 l-2 -3 M79 53 l3 -2 M78 51 l2 -3" stroke="#1d1c1a" stroke-width="1.4" stroke-linecap="round"/>';
  he+='<g class="bn"><path d="M43 48 Q49 44 55 47" stroke="'+h1+'" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M65 47 Q71 44 77 48" stroke="'+h1+'" stroke-width="2.6" fill="none" stroke-linecap="round"/></g><g class="ba"><path d="M42 45 L56 51" stroke="'+h1+'" stroke-width="3.4" stroke-linecap="round"/><path d="M78 45 L64 51" stroke="'+h1+'" stroke-width="3.4" stroke-linecap="round"/></g>';
  he+='<ellipse cx="42" cy="72" rx="5.5" ry="3.4" fill="#F28C8C" opacity=".45"/><ellipse cx="78" cy="72" rx="5.5" ry="3.4" fill="#F28C8C" opacity=".45"/>';
  if(o.freck)he+='<g fill="'+kidShade(sk[1],.72)+'" opacity=".7">'+[[38,69],[42,71],[45,68],[40,74],[82,69],[78,71],[75,68],[80,74]].map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.1"/>';}).join('')+'</g>';
  he+='<path d="M58 69 q2 2 4 0" stroke="'+kidShade(sk[1],.85)+'" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  he+='<path class="ms" d="M52 75 Q60 82 68 75" stroke="#8A2E2E" stroke-width="2.4" fill="none" stroke-linecap="round"/><g class="mh"><path d="M51 74 Q60 86 69 74 Z" fill="#8A2E2E"/><path d="M54 76 Q60 79 66 76 L66 74 L54 74Z" fill="#fff"/></g><path class="mw" d="M53 79 Q60 75 67 79" stroke="#8A2E2E" stroke-width="2.2" fill="none" stroke-linecap="round"/><path class="mg" d="M51 81 Q60 72 69 81" stroke="#8A2E2E" stroke-width="2.8" fill="none" stroke-linecap="round"/>';
  if(o.bart)he+='<path d="M50 80 Q60 92 70 80 Q66 86 60 86 Q54 86 50 80Z" fill="'+h1+'" opacity=".85"/>';
  // Haare vorn
  if(hut!=='kopftuch'){
    if(hs==='puffs')he+='<circle cx="34" cy="28" r="14" fill="'+H+'"/><circle cx="86" cy="28" r="14" fill="'+H+'"/><path d="M30 52 Q28 24 60 23 Q92 24 90 52 Q84 38 72 36 Q60 42 48 36 Q36 40 30 52Z" fill="'+H+'"/><circle cx="46" cy="30" r="3.5" fill="#F2C14E"/><circle cx="74" cy="30" r="3.5" fill="#F2C14E"/>';
    else if(hs==='locken')he+=[[36,40,9],[44,30,10],[54,24,10],[66,24,10],[76,30,10],[84,40,9],[40,48,6],[80,48,6],[60,30,9]].map(function(c){return '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[2]+'" fill="'+H+'"/>';}).join('');
    else if(hs==='zopf')he+='<path d="M30 54 Q28 24 60 22 Q92 24 90 54 Q86 40 74 36 Q66 46 50 42 Q40 44 34 56Z" fill="'+H+'"/><circle cx="92" cy="40" r="6" fill="#F2884F"/>';
    else if(hs==='lang'||hs==='bob')he+='<path d="M30 56 Q28 22 60 21 Q92 22 90 56 Q86 38 76 34 Q62 44 44 38 Q36 42 30 56Z" fill="'+H+'"/>';
    else if(hs==='zoepfe')he+='<path d="M30 54 Q28 24 60 22 Q92 24 90 54 Q84 40 70 36 Q60 40 50 36 Q36 40 30 54Z" fill="'+H+'"/>'+[0,1].map(function(i){var x=i?92:28;return [64,76,88,100].map(function(y){return '<ellipse cx="'+x+'" cy="'+y+'" rx="6" ry="7" fill="'+H+'"/>';}).join('')+'<circle cx="'+x+'" cy="108" r="4" fill="#F2884F"/>';}).join('');
    else if(hs==='dutt')he+='<circle cx="60" cy="20" r="12" fill="'+H+'"/><path d="M30 54 Q28 26 60 25 Q92 26 90 54 Q84 40 60 38 Q36 40 30 54Z" fill="'+H+'"/>';
    else if(hs==='scheitel')he+='<path d="M30 54 Q26 24 58 22 Q92 22 90 52 Q86 40 76 36 Q60 34 50 42 Q40 46 30 54Z" fill="'+H+'"/><path d="M50 26 Q56 34 50 42" stroke="'+h1+'" stroke-width="1.6" fill="none" opacity=".6"/>';
    else if(hs==='igel')he+='<path d="M31 50 L34 30 L40 40 L44 20 L50 34 L56 16 L62 32 L68 16 L72 34 L78 22 L80 40 L86 30 L89 50 Q80 38 60 38 Q40 38 31 50Z" fill="'+H+'"/>';
    else if(hs==='glatze')he+='<ellipse cx="50" cy="36" rx="9" ry="4" fill="#fff" opacity=".35"/>';
    else he+='<path d="M31 52 Q26 22 56 20 Q66 12 74 22 Q92 24 90 52 Q86 40 80 38 Q76 46 66 40 Q58 48 48 40 Q40 46 36 44 Q32 48 31 52Z" fill="'+H+'"/><path d="M50 22 q4 -10 10 -4 q2 -8 9 -2" stroke="'+H+'" stroke-width="5" fill="none" stroke-linecap="round"/>';
  }
  // Kopfbedeckung
  var hk=kidShade(sh,.85);
  if(hut==='cap')he+='<path d="M30 44 Q30 18 60 18 Q90 18 90 44 Z" fill="'+hk+'"/><path d="M24 44 Q60 36 96 44 Q96 50 90 50 Q60 44 30 50 Q24 50 24 44Z" fill="'+kidShade(sh,.7)+'"/><circle cx="60" cy="19" r="3" fill="'+kidShade(sh,.7)+'"/>';
  else if(hut==='muetze')he+='<path d="M29 46 Q29 14 60 14 Q91 14 91 46 Z" fill="'+hk+'"/><rect x="27" y="40" width="66" height="10" rx="5" fill="'+kidShade(sh,.7)+'"/><circle cx="60" cy="12" r="7" fill="#fff"/>';
  else if(hut==='kopftuch')he+='<path d="M24 60 Q22 18 60 16 Q98 18 96 60 Q98 92 82 100 L80 86 Q90 66 88 52 Q84 34 60 32 Q36 34 32 52 Q30 66 40 86 L38 100 Q22 92 24 60Z" fill="'+hk+'"/>';
  else if(hut==='stirnband')he+='<path d="M30 42 Q60 30 90 42 L90 49 Q60 37 30 49Z" fill="'+hk+'"/>';
  // Brille
  if(o.brille==='rund')he+='<g stroke="#1d1c1a" stroke-width="2.2" fill="none"><circle cx="49" cy="60" r="10"/><circle cx="71" cy="60" r="10"/><path d="M59 59 Q60 57 61 59"/></g>';
  else if(o.brille==='eckig')he+='<g stroke="#1d1c1a" stroke-width="2.2" fill="none"><rect x="38" y="52" width="21" height="16" rx="4"/><rect x="61" y="52" width="21" height="16" rx="4"/><path d="M59 59 L61 59"/></g>';
  // Headset
  if(o.headset)he+='<path d="M30 58 Q30 22 60 22 Q90 22 90 58" stroke="#2a2a2a" stroke-width="4" fill="none"/><rect x="25" y="51" width="11" height="16" rx="4" fill="#2a2a2a"/><rect x="84" y="51" width="11" height="16" rx="4" fill="#2a2a2a"/><path d="M31 66 Q34 82 50 82" stroke="#2a2a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="51" cy="82" r="3.4" fill="#2a2a2a"/>';
  return '<svg viewBox="0 0 120 240">'+d+back+body+he+arm('ar1',42)+'</svg>';}
// Vorbelegung: Mädchen-Namen, Hautfarbe/Haare, Shirtfarbe je Person
var KID_SHIRTS=['#F2884F','#6BA8A0','#F2C14E','#8C7BD6','#E2603C','#5B9BD5','#C23B66','#7FB069','#D98E5B','#4E8C84'];
var KID_W=/^(bianca|alina|katharina|kathrin|danae|laura|melanie|dogoro|dori|duygu|christina|anna|lena|julia|sarah|sara|lisa|maria|sophie|sophia|nina|eva|emma|mia|lea|jana|nadine|sandra|sabrina|vanessa|jessica|stefanie|tanja|petra|claudia|andrea|monika|elena|carmen|lucia|paula|isabel|ines|olga|irina|natalia|svetlana|ana|ayse|fatma|elif|zeynep|merve|ece|selin|derya|esra)$/i;
function kidDefault(e,idx){var f=String(e.name||'').split(' ')[0],w=KID_W.test(f),o={g:w?'w':'m',skin:'hell',hair:w?'zopf':'kurz',shirt:KID_SHIRTS[(idx||0)%KID_SHIRTS.length]};
  if(/^(dogoro|dori)$/i.test(f)){o.g='w';o.skin='dunkel';o.hair='puffs';o.shirt='#6BA8A0';}
  if(/^roque$/i.test(f)){o.g='m';o.skin='mittel';o.hair='locken';o.shirt='#F2C14E';}
  o.letter=f.charAt(0);return o;}
