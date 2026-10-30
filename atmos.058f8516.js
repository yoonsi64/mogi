(function(){
'use strict';
var SRC=typeof document!=='undefined'&&document.currentScript&&document.currentScript.src?document.currentScript.src:null;
var TAU=Math.PI*2;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function clamp(v,a,b){if(a===undefined){a=0;b=1;}return v<a?a:v>b?b:v;}
function lerp(a,b,t){return a+(b-a)*t;}
function sstep(a,b,v){var t=clamp((v-a)/(b-a));return t*t*(3-2*t);}
function mixc(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function scl(c,k){return[c[0]*k,c[1]*k,c[2]*k];}
function mulc(a,b){return[a[0]*b[0],a[1]*b[1],a[2]*b[2]];}
function rgb(c,a){if(a===undefined)a=1;return'rgba('+(clamp(c[0],0,255)|0)+','+(clamp(c[1],0,255)|0)+','+(clamp(c[2],0,255)|0)+','+a+')';}
function ramp(p,t){t=clamp(t)*(p.length-1);var i=Math.min(p.length-2,Math.floor(t));return mixc(p[i],p[i+1],t-i);}
function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function mul(a,s){return[a[0]*s,a[1]*s,a[2]*s];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function norm(a){var l=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];}
function basis(d){var t=Math.abs(d[1])<0.9?[0,1,0]:[1,0,0];var u=norm(cross(d,t));return[u,cross(d,u)];}
function makeNoise(seed){
var r=mulberry32(seed),perm=[],i;
for(i=0;i<256;i++)perm.push(i);
for(i=255;i>0;i--){var j=Math.floor(r()*(i+1));var tt=perm[i];perm[i]=perm[j];perm[j]=tt;}
var Pm=new Uint16Array(512);for(i=0;i<512;i++)Pm[i]=perm[i&255];
var V=new Float32Array(256);for(i=0;i<256;i++)V[i]=r();
var T2=new Float32Array(257*257);for(i=0;i<257;i++)for(var j2=0;j2<257;j2++)T2[i*257+j2]=V[Pm[Pm[i]+j2]];
function n2(x,y){
var X=Math.floor(x),Y=Math.floor(y),fx=x-X,fy=y-Y;
var u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),q=(X&255)*257+(Y&255);
var a=T2[q],b=T2[q+257],c=T2[q+1],d=T2[q+258];
return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function h3(x,y,z){return V[Pm[Pm[Pm[x&255]+(y&255)]+(z&255)]];}
function n3(x,y,z){
var X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),fx=x-X,fy=y-Y,fz=z-Z;
var u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
var x00=lerp(h3(X,Y,Z),h3(X+1,Y,Z),u),x10=lerp(h3(X,Y+1,Z),h3(X+1,Y+1,Z),u);
var x01=lerp(h3(X,Y,Z+1),h3(X+1,Y,Z+1),u),x11=lerp(h3(X,Y+1,Z+1),h3(X+1,Y+1,Z+1),u);
return lerp(lerp(x00,x10,v),lerp(x01,x11,v),w);
}
function fbm(x,y,o){if(o===undefined)o=4;var s=0,a=0.5,f=1,n=0;for(var i=0;i<o;i++){s+=a*n2(x*f+i*17.3,y*f-i*9.1);n+=a;a*=0.5;f*=2.03;}return s/n;}
return{n2:n2,n3:n3,fbm:fbm};
}
var NZ=makeNoise(7);
function hash2(x,y){var h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function mkCanvas(w,h){var c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;}
var WIND_SEASON={spring:0.6,summer:0.35,autumn:0.6,winter:0.75};
function fnv1a(str){var h=0x811c9dc5;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
function windDayKey(d){var m=d.getMonth()+1,dd=d.getDate();return''+d.getFullYear()+(m<10?'0':'')+m+(dd<10?'0':'')+dd;}
function windNoise(seed,x){
var i=Math.floor(x),f=x-i,u=f*f*(3-2*f);
function h(n){return mulberry32((seed^Math.imul(n+1,0x9E3779B1))>>>0)()*2-1;}
var a=h(i);return a+(h(i+1)-a)*u;
}
function windAt(date){
var d=date instanceof Date&&!isNaN(date.getTime())?date:new Date();
var seed=fnv1a('mogi-wind'+windDayKey(d)),r=mulberry32(seed);
var base=(r()<0.5?0:180)+(r()*2-1)*25;
var hours=d.getHours()+d.getMinutes()/60+d.getSeconds()/3600+d.getMilliseconds()/3600000,minutes=hours*60;
var dir=base+20*windNoise(seed,hours/3);
var strength=WIND_SEASON[seasonFor(d)]*(0.6+0.4*(windNoise((seed^0x5bd1e995)>>>0,minutes/7)*0.5+0.5));
var wx=weatherAt(d);
if(wx==='typhoon'||wx==='blizzard')strength=0.9+0.1*(windNoise((seed^0x27d4eb2f)>>>0,minutes/2)*0.5+0.5);
return{dir:((dir%360)+360)%360,strength:strength};
}
function rareDay(d){
var r0=mulberry32(fnv1a('mogi-weather-rare'+windDayKey(d)))(),m=d.getMonth();
if((m===7&&r0<0.02)||(m===8&&r0<0.04)||(m===9&&r0<0.02))return'typhoon';
if((m===0&&r0<0.03)||(m===1&&r0<0.03)||(m===11&&r0<0.01))return'blizzard';
return null;
}
function rareBlock(kind,block){
if(kind==='typhoon')return block<=1?'cloudy':block<=6?'typhoon':'rain';
if(kind==='blizzard')return block<=3?'snow':'blizzard';
return null;
}
var WX_TABLE={
jan:[0.65,0.20,0.05,0,0.10],feb:[0.55,0.20,0.10,0,0.15],mar:[0.45,0.25,0.30,0,0],apr:[0.45,0.25,0.30,0,0],may:[0.55,0.25,0.20,0,0],
jun:[0.45,0.25,0.30,0,0],tsuyu:[0.20,0.35,0.45,0,0],midsummer:[0.60,0.15,0.10,0.15,0],sep:[0.40,0.25,0.30,0.05,0],oct:[0.55,0.25,0.20,0,0],
nov:[0.65,0.20,0.15,0,0],dec:[0.65,0.20,0.05,0,0.10]
};
var WX_KINDS=['clear','cloudy','rain','storm','snow'];
function wxRow(d){
var m=d.getMonth(),day=d.getDate();
if(m===5)return day<=6?WX_TABLE.jun:WX_TABLE.tsuyu;
if(m===6)return day<=19?WX_TABLE.tsuyu:WX_TABLE.midsummer;
return[WX_TABLE.jan,WX_TABLE.feb,WX_TABLE.mar,WX_TABLE.apr,WX_TABLE.may,null,null,WX_TABLE.midsummer,WX_TABLE.sep,WX_TABLE.oct,WX_TABLE.nov,WX_TABLE.dec][m];
}
function wxFinal(w,d,hour){
if(w==='storm'&&!(hour>=13&&hour<20))w='rain';
if(w==='snow'&&seasonFor(d)!=='winter')w='rain';
return w;
}
function wxBlock(d,block,hour,depth){
var rd=rareDay(d);if(rd)return rareBlock(rd,block);
var seed=fnv1a('mogi-weather'+windDayKey(d)+'-'+block),rng=mulberry32(seed),r=rng(),p=rng();
if(p<0.5&&depth<64){
var pd=d,pb=block-1;if(pb<0){pd=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,12);pb=7;}
var prev=wxBlock(pd,pb,pb*3+1.5,depth+1);
if(prev==='rain'||prev==='storm')return wxFinal(prev,d,hour);
}
var row=wxRow(d),acc=0,k;
for(k=0;k<5;k++){acc+=row[k];if(r<acc)break;}
return wxFinal(WX_KINDS[Math.min(4,k)],d,hour);
}
function weatherAt(date){
var d=date instanceof Date&&!isNaN(date.getTime())?date:new Date(),hour=d.getHours()+d.getMinutes()/60;
return wxBlock(d,Math.floor(d.getHours()/3),hour,0);
}
function afterRainAt(date){
var d=date instanceof Date&&!isNaN(date.getTime())?date:new Date(),w=weatherAt(d);
if(w!=='clear'&&w!=='cloudy')return false;
var pd=new Date(d.getTime()-3*3600000),pw=weatherAt(pd);
return pw==='rain'||pw==='storm';
}
function wxWet(w){return w==='rain'||w==='storm'||w==='typhoon';}
function wxSnowy(w){return w==='snow'||w==='blizzard';}
function fireworksAt(date){
var d=date instanceof Date&&!isNaN(date.getTime())?date:new Date(),m=d.getMonth(),day=d.getDate();
if(!((m===6&&day>=20)||m===7))return false;
if(!(d.getDay()===6||(m===7&&day>=13&&day<=16)))return false;
var mins=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
if(mins<19*60+30||mins>20*60+45)return false;
var w=weatherAt(d);return w==='clear'||w==='cloudy';
}
function toDate(d){if(d instanceof Date)return d;if(d===undefined||d===null)return new Date();return new Date(d);}
function seasonFor(date){var m=toDate(date).getMonth();return m>=2&&m<=4?'spring':m>=5&&m<=7?'summer':m>=8&&m<=10?'autumn':'winter';}
function lightFor(date){var d=toDate(date),h=d.getHours()+d.getMinutes()/60;return h>=5&&h<9?'morning':h>=9&&h<16.5?'day':h>=16.5&&h<19?'dusk':'night';}
var SPR={};
function sprite(name){
if(SPR[name])return SPR[name];
var N=64,c=mkCanvas(N,N),x=c.getContext('2d'),g=x.createRadialGradient(N/2,N/2,0,N/2,N/2,N/2);
if(name==='warm'){g.addColorStop(0,'rgba(255,214,140,1)');g.addColorStop(0.25,'rgba(255,170,80,0.45)');g.addColorStop(1,'rgba(255,120,40,0)');}
else if(name==='spark'){g.addColorStop(0,'rgba(255,255,240,1)');g.addColorStop(0.2,'rgba(255,236,170,0.75)');g.addColorStop(0.5,'rgba(255,210,120,0.18)');g.addColorStop(1,'rgba(255,200,100,0)');}
else{g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.5,'rgba(255,255,255,0.5)');g.addColorStop(1,'rgba(255,255,255,0)');}
x.fillStyle=g;x.fillRect(0,0,N,N);SPR[name]=c;return c;
}
function tintedSprite(col){
var k='m'+col.join(',');if(SPR[k])return SPR[k];
var N=64,c=mkCanvas(N,N),x=c.getContext('2d'),g=x.createRadialGradient(N/2,N/2,0,N/2,N/2,N/2);
g.addColorStop(0,rgb(col,0.9));g.addColorStop(0.55,rgb(col,0.4));g.addColorStop(1,rgb(col,0));x.fillStyle=g;x.fillRect(0,0,N,N);SPR[k]=c;return c;
}
function stamp(ctx,spr,x,y,rx,ry,a){if(a<=0.003)return;ctx.globalAlpha=Math.min(1,a);ctx.drawImage(spr,x-rx,y-(ry||rx),2*rx,2*(ry||rx));}
function lightName(L){return L.id||L.name;}
function seasonProgress(season,date){
if(date===undefined||date===null||(season!=='spring'&&season!=='autumn'))return 0.5;
var d=toDate(date);if(isNaN(d.getTime()))return 0.5;
var m=d.getMonth(),y=d.getFullYear();
if(season==='spring'){if(m<2||m>4)return 0.5;return clamp((d-new Date(y,2,1))/(new Date(y,4,31,23,59)-new Date(y,2,1)));}
if(m<8||m>10)return 0.5;return clamp((d-new Date(y,8,1))/(new Date(y,10,30,23,59)-new Date(y,8,1)));
}
function calSteps(season){return season==='spring'?6:season==='autumn'?4:0;}
function calQuant(season,p){var n=calSteps(season);return n?Math.round(p*n)/n:0.5;}
function calTag(season,p){var n=calSteps(season);return n?season.charAt(0)+Math.round(p*n):'-';}
function knots(K,d){if(d<=K[0][0])return K[0][1];for(var i=1;i<K.length;i++)if(d<=K[i][0]){var a=K[i-1],b=K[i],u=(d-a[0])/(b[0]-a[0]);return lerp(a[1],b[1],u*u*(3-2*u));}return K[K.length-1][1];}
var SK={
bud:[[0,0.35],[8,0.8],[14,1],[20,0.5],[27,0]],
bloom:[[0,0],[11,0.03],[17,0.3],[25,0.55],[31,0.95],[37,1],[45,0.88],[53,0.55],[60,0.24],[67,0.08],[75,0]],
leaf:[[0,0],[41,0],[48,0.16],[55,0.42],[62,0.72],[70,0.92],[80,1]],
fall:[[0,0],[17,0.03],[28,0.1],[33,0.28],[40,0.6],[46,1],[55,1],[61,0.55],[67,0.18],[73,0.04],[79,0]],
ground:[[0,0],[22,0.02],[33,0.14],[40,0.45],[47,0.9],[55,1],[61,0.75],[67,0.35],[73,0.1],[80,0]],
leafOut:[[0,0.05],[20,0.15],[40,0.55],[55,0.85],[70,1]]
};
function sakuraCal(p,early){
var d=p*91+(early||0);
return{bud:knots(SK.bud,d),bloom:knots(SK.bloom,d),leaf:knots(SK.leaf,d),fall:knots(SK.fall,d),ground:knots(SK.ground,d),leafOut:knots(SK.leafOut,d)};
}
function leafAmt(q){return 0.06+0.94*Math.pow(clamp(q),1.7);}
var LIGHT_BASE={
morning:{
sun:norm([-0.74,0.46,-0.3]),sunc:[0.98,0.92,0.84],amb:[0.6,0.66,0.78],ls:[-0.74,-0.62],
skyTop:[176,196,218],skyHor:[232,230,224],haze:[214,220,226],sunX:0.08,sunY:-0.04,sunGlow:'rgba(255,244,222,0.85)',
shadow:[70,86,124],shadowA:0.42,hazeK:1.35,lit:false,wash:['rgba(230,240,255,0.30)','rgba(220,232,250,0.08)'],
grade:[[236,242,252],[226,232,240],[200,204,214]],bloom:0.24,vig:[200,202,206]
},
day:{
sun:norm([0.80,0.56,-0.22]),sunc:[1.0,0.86,0.66],amb:[0.52,0.57,0.70],ls:[0.76,-0.65],
skyTop:[200,210,220],skyHor:[238,228,208],haze:[222,216,204],sunX:0.94,sunY:-0.04,sunGlow:'rgba(255,240,205,0.8)',
shadow:[64,74,112],shadowA:0.5,hazeK:1,lit:false,wash:['rgba(255,214,150,0.38)','rgba(255,200,140,0.10)'],
grade:null,bloom:0.22,vig:[196,182,170]
},
dusk:{ls:[0.9,-0.4],sunX:0.86,sunY:0.24,lit:true,gradeMid:0.42},
night:{
sun:norm([-0.46,0.62,0.5]),amb:[0.23,0.26,0.34],ls:[-0.6,-0.8],
skyTop:[12,16,30],skyHor:[50,58,78],haze:[42,48,64],sunX:0.17,sunY:0.1,sunGlow:'rgba(190,200,230,0.3)',
shadow:[16,18,30],shadowA:0.48,hazeK:0.9,lit:true,wash:['rgba(160,172,205,0.14)','rgba(110,120,150,0.05)'],bloom:0.3,moon:true
}
};
var LIGHT_TUNE={
garden:{
morning:{mist:0.55,folShade:[0.9,0.96,1.06],folLit:[1.05,1.0,0.86]},
day:{mist:0.3},
dusk:{
sun:norm([0.86,0.26,0.3]),sunc:[1.0,0.62,0.36],amb:[0.44,0.45,0.59],
skyTop:[96,92,140],skyHor:[252,168,98],haze:[204,146,150],sunGlow:'rgba(255,170,90,0.9)',
shadow:[64,50,100],shadowA:0.44,hazeK:1.0,wash:['rgba(255,150,70,0.40)','rgba(255,120,70,0.10)'],
grade:[[255,226,198],[190,172,208],[208,192,204]],bloom:0.34,vig:[130,104,130],mist:0.35,
folShade:[0.74,0.8,0.98],folLit:[1.0,0.78,0.6],groundK:[1.07,1.2,1.08]
},
night:{sunc:[0.54,0.58,0.7],foliageTint:[0.74,0.86,1.0],grade:[[162,168,188],[140,146,166],[104,108,128]],vig:[50,52,66],mist:0.25,
folShade:[0.9,0.92,1.0],folLit:[0.94,0.97,1.04],folDesat:0.38}
},
town:{
morning:{mist:0.6,win:0},
day:{mist:0.22,win:0},
dusk:{
sun:norm([0.9,0.3,0.1]),sunc:[1.75,1.02,0.5],amb:[0.26,0.29,0.47],foliageTint:[0.9,0.8,0.82],
skyTop:[84,92,150],skyHor:[255,176,100],haze:[218,168,152],sunGlow:'rgba(255,176,96,0.95)',
shadow:[38,42,122],shadowA:0.52,hazeK:0.9,wash:['rgba(255,170,90,0.30)','rgba(255,140,80,0.05)'],washK:0.1,
grade:[[255,240,224],[238,230,238],[212,208,230]],bloom:0.3,vig:[150,126,146],mist:0.24,win:0.55,glowK:0.62
},
night:{sunc:[0.56,0.6,0.72],foliageTint:[0.4,0.5,0.64],grade:[[166,172,190],[146,152,170],[128,134,158]],vig:[92,94,112],mist:0.18,win:1,moonSnow:true}
}
};
function lightsFor(world){
var out={};
['morning','day','dusk','night'].forEach(function(k){var o={id:k,name:k},B=LIGHT_BASE[k],T=LIGHT_TUNE[world][k],q;for(q in B)o[q]=B[q];for(q in T)o[q]=T[q];out[k]=o;});
return out;
}
function paintFullMoon(ctx,x,y,r,o){
o=o||{};
var warm=o.warmth||0,haze=o.haze===undefined?0.3:o.haze,alt=o.alt===undefined?1:o.alt,tilt=o.tilt||0;
function cl(v){return v<0?0:v>1?1:v;}
function ss(a,b,v){v=cl((v-a)/(b-a));return v*v*(3-2*v);}
function hs(i,j){var n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n);}
function vn(px,py){var i=Math.floor(px),j=Math.floor(py),fx=px-i,fy=py-j;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);var a=hs(i,j),b=hs(i+1,j),c=hs(i,j+1),d=hs(i+1,j+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
function fb(px,py){return vn(px,py)*0.5+vn(px*2.03+17.3,py*2.03+5.1)*0.3+vn(px*4.1+3.7,py*4.1+29.2)*0.2;}
function rgbS(c,a){return'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+a+')';}
var tint=[246+9*warm,243-60*warm,232-124*warm],bright=o.bright===undefined?1-0.2*warm:o.bright;
var hz=o.hazeCol||[tint[0]*0.8,tint[1]*0.68,tint[2]*0.66],flat=1-0.045*(1-alt);
var M=ctx.getTransform?ctx.getTransform():null,sc=M?Math.hypot(M.a,M.b)||1:1;
if(o.glow!==false){
var ht=[tint[0]+(196-tint[0])*0.5*(1-warm),tint[1]+(210-tint[1])*0.5*(1-warm),tint[2]+(240-tint[2])*0.5*(1-warm)];
var gA=0.16+0.3*haze,gR=r*(2+2.6*haze),g1=ctx.createRadialGradient(x,y,r*0.92,x,y,gR);
g1.addColorStop(0,rgbS(ht,gA));g1.addColorStop(0.3,rgbS(ht,gA*0.38));g1.addColorStop(1,rgbS(ht,0));
ctx.fillStyle=g1;ctx.fillRect(x-gR,y-gR,gR*2,gR*2);
var wR=r*(6+5*haze),g2=ctx.createRadialGradient(x,y,r,x,y,wR);g2.addColorStop(0,rgbS(ht,0.06+0.12*haze));g2.addColorStop(0.4,rgbS(ht,0.02+0.04*haze));g2.addColorStop(1,rgbS(ht,0));
ctx.fillStyle=g2;ctx.fillRect(x-wR,y-wR,wR*2,wR*2);
}
var DEG=180/Math.PI,rp=Math.max(4,r*sc),N=Math.ceil(rp*2+4),h=N/2;
var cv=document.createElement('canvas');cv.width=cv.height=N;
var cx2=cv.getContext('2d'),im=cx2.createImageData(N,N),D=im.data;
var MARE=[[-17,34,18.5,15,1],[-31,45,8,5,0.8],[18,27,11,10.5,0.95],[31,8,14,11,1],[20,4,8,6,0.9],[39,14,6,5,0.85],[4,13,6,4,0.8],[1,2,3.5,3,0.6],
[59,17,9,8,1],[51,-5,10,13,0.9],[34,-15,7,7,0.82],[-17,-21,13,9,0.78],[-23,-10,7,5,0.72],[-39,-24,7,6,0.85],
[-30,8,10,6,0.75],[-8,12,6,4,0.65],[-56,35,13,12,0.95],[-60,15,13,13,1],[-52,0,12,10,0.92],[-62,-10,9,8,0.8],[-41,20,9,10,0.85],[-50,-16,6,5,0.6],
[0,57,40,5.5,0.4],[-32,55,16,5,0.42],[86,13,5,6,0.55],[86,-2,4,5,0.5],[80,57,6,3,0.45],
[24,18,5,4,0.8],[42,-2,5,6,0.75],[28,-7,4,4,0.7]];
var SPOT=[[-11.4,-43.3,1.2,0.22],[-20,9.6,1.4,0.16],[-38,8.1,1,0.13],[-47.5,23.7,0.9,0.3],[46.8,16.1,0.8,0.13],[16,16.3,0.6,0.1],[61,-8.9,1.1,0.08],[-5,-30,0.7,0.06]];
var TONE=[0.8,0.72,1,1.05,1,0.95,0.85,0.7,1.05,0.86,0.8,0.68,0.62,0.92,0.56,0.78,0.72,0.76,0.7,0.62,0.8,0.6,0.62,0.62,0.8,0.78,0.74,1,0.95,0.85];
var nsk=0.4+0.6*cl((rp-20)/90);
function vec(lo,la){lo/=DEG;la/=DEG;return[Math.cos(la)*Math.sin(lo),Math.sin(la),Math.cos(la)*Math.cos(lo)];}
var TY=vec(-11.4,-43.3),tl=-11.4/DEG,tb=-43.3/DEG,tE=[Math.cos(tl),0,-Math.sin(tl)],tN=[-Math.sin(tb)*Math.sin(tl),Math.cos(tb),-Math.sin(tb)*Math.cos(tl)];
var RAYB=[],RW=[],i,k;
var RL=[];
for(k=0;k<11;k++){RAYB.push(k/11*Math.PI*2+(hs(k,3)-0.5)*0.5);RW.push(0.03+hs(k,7)*0.06);RL.push(0.25+Math.pow(hs(k,11),2)*0.9);}
var con=(0.38-0.1*haze)*(1-0.45*warm),ct=Math.cos(tilt),st=Math.sin(tilt);
for(var j=0;j<N;j++)for(i=0;i<N;i++){
var u=(i+0.5-h)/rp,v=(j+0.5-h)/rp,sy=-v,rho=Math.hypot(u,v);
if(rho>1+1.5/rp)continue;
var a=u*ct+sy*st,b=-u*st+sy*ct,rr=Math.hypot(a,b);if(rr>1){a/=rr;b/=rr;}
var z=Math.sqrt(Math.max(0,1-a*a-b*b)),la=Math.asin(b)*DEG,lo=Math.atan2(a,z)*DEG,m=0;
var wlo=lo+(fb(lo*0.05+11,la*0.05)-0.5)*11,wla=la+(fb(lo*0.05,la*0.05+23)-0.5)*8,fm=0,tS=0,tW=0;
for(k=0;k<MARE.length;k++){
var R=MARE[k],dx=(wlo-R[0])*Math.cos(R[1]/DEG),dy=wla-R[1];if(Math.abs(dx)>R[2]*2.6||Math.abs(dy)>R[3]*2.6)continue;
var d2=(dx*dx)/(R[2]*R[2])+(dy*dy)/(R[3]*R[3]),g0=Math.exp(-d2*1.05);fm=1-(1-fm)*(1-g0*R[4]);tS+=g0*TONE[k];tW+=g0;
}
fm*=1-0.85*Math.exp(-Math.pow((lo-3)/4.5,2)-Math.pow((la-34)/10,2));
var tn=tW>0?tS/tW:0.8,cp=0;
for(k=0;k<2;k++){var Cq=k?[-38,8.1,5]:[-20,9.6,8],ex=(lo-Cq[0])*Math.cos(Cq[1]/DEG),ey=la-Cq[1],dd=Math.hypot(ex,ey);if(dd<Cq[2]*4)cp+=Math.exp(-dd/Cq[2])*(0.3+0.7*ss(0.45,0.8,vn(Math.atan2(ey,ex)*4+k*9,dd*0.12+k)));}
m=ss(0.22,0.7,fm+((fb(lo*0.16+7,la*0.16)-0.5)*0.26+(fb(lo*0.7+3,la*0.7+9)-0.5)*0.16)*nsk)*(0.4+0.6*tn)*(0.8+0.32*fb(lo*0.2+50,la*0.2))*(1-0.45*Math.min(1,cp));
var hm=(fb(lo*0.3+40,la*0.3)-0.5)*0.13+(vn(lo*1.4,la*1.4)-0.5)*0.06+(vn(lo*4,la*4)-0.5)*0.03;
var p=[a,b,z],cd=p[0]*TY[0]+p[1]*TY[1]+p[2]*TY[2],dt=Math.acos(Math.max(-1,Math.min(1,cd))),ray=0;
if(dt<1.3){
var q=[p[0]-TY[0]*cd,p[1]-TY[1]*cd,p[2]-TY[2]*cd],be=Math.atan2(q[0]*tN[0]+q[1]*tN[1]+q[2]*tN[2],q[0]*tE[0]+q[1]*tE[1]+q[2]*tE[2]);
for(k=0;k<RAYB.length;k++){var db=Math.abs(be-RAYB[k]-(vn(dt*4,k*3.7)-0.5)*0.06);db=Math.min(db,Math.PI*2-db);ray+=Math.exp(-Math.pow(db/(RW[k]*(1+dt)),2))*ss(0.25,0.65,vn(dt*11+k*7.1,k*2.3))*Math.exp(-dt/RL[k]);}
ray=ray*ss(0.03,0.09,dt)+Math.exp(-Math.pow(dt/0.07,2))*0.25;
}
var sp=0;
for(k=0;k<SPOT.length;k++){var S=SPOT[k],sx2=(lo-S[0])*Math.cos(S[1]/DEG),sy2=la-S[1];sp+=Math.exp(-(sx2*sx2+sy2*sy2)/(S[2]*S[2]))*S[3]+Math.exp(-(sx2*sx2+sy2*sy2)/(S[2]*S[2]*16))*S[3]*0.12;}
var L=(1-con*m+hm*(1-0.5*m)*(1-0.4*haze)+ray*0.075+sp)*(0.86+0.14*Math.pow(z,0.4))*bright;
var mb=m*(1-warm*0.7),col=[tint[0]*L*(1-0.05*mb),tint[1]*L*(1-0.025*mb),tint[2]*L*(1+0.035*mb*(tn-0.6)*2.5)];
var lowF=ss(0.05,1.05,v)*haze*(1-alt),al=cl((1-rho)*rp+0.5)*(1-lowF*0.16);
col=[(col[0]+(hz[0]-col[0])*lowF*0.4)*(1-0.08*lowF),(col[1]+(hz[1]-col[1])*lowF*0.4)*(1-0.16*lowF),(col[2]+(hz[2]-col[2])*lowF*0.4)*(1-0.24*lowF)];
var o4=(j*N+i)*4;D[o4]=Math.min(255,col[0]);D[o4+1]=Math.min(255,col[1]);D[o4+2]=Math.min(255,col[2]);D[o4+3]=al*255;
}
cx2.putImageData(im,0,0);
var smo=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=true;
ctx.drawImage(cv,x-h/sc,y-h/sc*flat,N/sc,N/sc*flat);
ctx.imageSmoothingEnabled=smo;
}
function moonCrisp(gc,obj,M,KS,repaint){
var x0=Math.max(0,Math.floor((M.x-M.r)*KS)-3),y0=Math.max(0,Math.floor((M.y-M.r)*KS)-3);
var x1=Math.min(gc.width,Math.ceil((M.x+M.r)*KS)+3),y1=Math.min(gc.height,Math.ceil((M.y+M.r)*KS)+3),w=x1-x0,h=y1-y0,i;
if(w<3||h<3)return null;
var kc=mkCanvas(w,h),kx=kc.getContext('2d');
kx.setTransform(KS,0,0,KS,-x0,-y0);repaint(kx);
kx.setTransform(1,0,0,1,0,0);
var id=kx.getImageData(0,0,w,h),d=id.data;
for(i=0;i<d.length;i+=4){var e=Math.abs(d[i]-255)+d[i+1]+Math.abs(d[i+2]-255);d[i]=d[i+1]=d[i+2]=255;d[i+3]=255*Math.max(0,1-e/260);}
kx.putImageData(id,0,0);
var mc2=mkCanvas(w,h),mx2=mc2.getContext('2d');mx2.setTransform(KS,0,0,KS,-x0,-y0);
paintFullMoon(mx2,M.x,M.y,M.r,Object.assign({},M.o,{glow:false}));
mx2.setTransform(1,0,0,1,0,0);mx2.globalCompositeOperation='destination-in';mx2.drawImage(kc,0,0);
mx2.globalCompositeOperation='destination-out';mx2.drawImage(gc,x0,y0,w,h,0,0,w,h);mx2.drawImage(obj,x0,y0,w,h,0,0,w,h);
kc.width=kc.height=0;
return{c:mc2,x:x0,y:y0,M:M};
}
function paintSkyGradient(ctx,top,hor,W,yH,fillH){
var g=ctx.createLinearGradient(0,0,0,yH);g.addColorStop(0,rgb(top));g.addColorStop(0.6,rgb(mixc(top,hor,0.7)));g.addColorStop(1,rgb(hor));ctx.fillStyle=g;ctx.fillRect(0,0,W,fillH);
}
function paintSunGlow(ctx,L,sx,sy,R,W,fillH){
var sg=ctx.createRadialGradient(sx,sy,0,sx,sy,R);sg.addColorStop(0,L.sunGlow);sg.addColorStop(1,'rgba(255,230,200,0)');ctx.fillStyle=sg;ctx.fillRect(0,0,W,fillH);
}
function paintStars(ctx,W,yH){
var sr=mulberry32(5);
for(var i=0;i<190;i++){var x=sr()*W,y=sr()*(yH-30),a=0.25+sr()*0.6,r=0.22+sr()*0.45;if(sr()<0.06){a=0.95;r=0.7;}ctx.fillStyle='rgba(230,236,255,'+a*clamp(1.15-y/yH)+')';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
}
function paintDuskSun(ctx,sx,sy,r){ctx.fillStyle='rgba(255,214,150,0.9)';ctx.beginPath();ctx.arc(sx,sy,r,0,TAU);ctx.fill();}
function rainSlant(Wd,w){
var x=Wd.x!==undefined?Wd.x:Wd.h/Math.max(0.05,Wd.s);
return x*(0.14+0.32*Math.min(1.2,Wd.s))*(w==='storm'?1.5:w==='typhoon'?2.6:1);
}
function newDrop(g,rng,anywhere,w){
var d=Math.pow(rng(),1.3),heavy=w==='storm'||w==='typhoon'?1.35:1;
return{x:rng()*(g.W+80)-40,y:anywhere?rng()*g.H:-10-rng()*30,d:d,sp:(230+300*d)*heavy,len:(4+8*d+(d>0.93?9:0))*heavy,floor:g.horizonY-10+(g.H-g.horizonY+14)*(0.15+0.85*d)*(0.8+rng()*0.25)};
}
function makeRain(g,rng,w){var out=[],n=w==='rain'?520:720;for(var i=0;i<n;i++)out.push(newDrop(g,rng,true,w));return out;}
function stepRain(drops,g,dt,rng,w,slant){
for(var i=0;i<drops.length;i++){
var p=drops[i];p.y+=p.sp*dt;p.x+=p.sp*slant*dt;
if(p.y>p.floor){var q=newDrop(g,rng,false,w);q.x-=slant*(q.floor+20);drops[i]=q;}
}
}
function drawRain(ctx,drops,g,slant,night,part){
var rc=night?[150,166,204]:mixc(g.LIT.skyHor,[240,244,250],0.7),sl=slant,B=[new Path2D(),new Path2D(),new Path2D(),new Path2D()],i;
if(Math.abs(sl)<0.1)sl=sl<0?-0.1:0.1;
for(i=0;i<drops.length;i++){if(part<1&&((i*0.6180339)%1)>part)continue;var p2=drops[i],bi=p2.d<0.35?0:p2.d<0.7?1:p2.d<0.93?2:3;B[bi].moveTo(p2.x,p2.y);B[bi].lineTo(p2.x-sl*p2.len,p2.y-p2.len);}
ctx.lineCap='round';
[[0.3,0.12],[0.4,0.18],[0.55,0.26],[0.8,0.48]].forEach(function(s,k){ctx.strokeStyle=rgb(rc,s[1]*(night?0.7:1));ctx.lineWidth=s[0]/Math.max(0.5,g.ovq||1);ctx.stroke(B[k]);});
ctx.lineCap='butt';
}
function makeBolt(g,rng){
var x=g.W*(0.12+rng()*0.76),y=2+rng()*8,yEnd=(g.ridgeY!==undefined?g.ridgeY:g.horizonY-18)+4+rng()*10,pts=[[x,y]],branches=[];
while(y<yEnd){y+=2.5+rng()*4;x+=(rng()-0.5)*7;pts.push([x,Math.min(y,yEnd)]);if(rng()<0.22){var bx=x,by=y,br=[[bx,by]];for(var k=0;k<4;k++){bx+=(rng()-0.3)*6*(rng()<0.5?-1:1);by+=2+rng()*3;br.push([bx,by]);}branches.push(br);}}
return{pts:pts,branches:branches};
}
function lightningLevel(L,t){var a=t-L.t0;if(a<0||a>0.9)return-1;return a<0.08?1:a<0.16?0.25:a<0.24?0.85:Math.max(0,0.5-(a-0.24)*0.8);}
function drawLightningFlash(ctx,g,L,t){var fl=lightningLevel(L,t);if(fl<0)return false;ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(200,210,255,'+(0.28*fl)+')';ctx.fillRect(0,0,g.W,g.H);ctx.globalCompositeOperation='source-over';return true;}
function drawLightning(ctx,g,L,t){
var fl=lightningLevel(L,t);if(fl<0)return false;
ctx.globalCompositeOperation='lighter';
function line(pts,w,al){ctx.strokeStyle='rgba(235,240,255,'+al+')';ctx.lineWidth=w;ctx.beginPath();pts.forEach(function(p,i){if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.stroke();}
if(fl>0.2){ctx.lineJoin='round';line(L.bolt.pts,2.4,0.25*fl);line(L.bolt.pts,0.8,0.95*fl);L.bolt.branches.forEach(function(b){line(b,0.5,0.6*fl);});ctx.lineJoin='miter';}
ctx.globalCompositeOperation='source-over';
return true;
}
function paintRainbow(ctx,W,L,cy,R,a){
var cx=W*(L.sunX>0.5?0.3:0.7),cols=[[255,70,60],[255,160,50],[255,236,90],[90,210,100],[80,140,255],[130,90,220]];
ctx.save();ctx.lineWidth=2.2;
for(var i=0;i<cols.length;i++){var g=ctx.createLinearGradient(0,cy-R,0,cy);g.addColorStop(0,rgb(cols[i],a));g.addColorStop(1,rgb(cols[i],a/6));ctx.strokeStyle=g;ctx.beginPath();ctx.arc(cx,cy,R-i*2,Math.PI*1.06,Math.PI*1.94);ctx.stroke();}
ctx.restore();
}
function ditherSky(ctx,bw,yr){
if(yr<2)return;
try{var id=ctx.getImageData(0,0,bw,yr),d=id.data,sd=22695477,n=d.length,i,r;for(i=0;i<n;i+=4){sd=(Math.imul(sd,1103515245)+12345)|0;r=((sd>>>16)&255)+((sd>>>8)&255)-255;r=r>96?1:r<-96?-1:0;if(r){d[i]+=r;d[i+1]+=r;d[i+2]+=r;}}ctx.putImageData(id,0,0);}catch(e){}
}
var CLOUD_NZ=null;
function cloudNoise(){
if(CLOUD_NZ)return CLOUD_NZ;
var r=mulberry32(4242),V=new Float32Array(256*256);
for(var i=0;i<V.length;i++)V[i]=r();
function n(u,v,P){
var X=Math.floor(u),Y=Math.floor(v),fx=u-X,fy=v-Y,x0=((X%P)+P)%P,x1=(x0+1)%P,y0=Y&255,y1=(Y+1)&255;
var a=V[(y0<<8)|(x0&255)],b=V[(y0<<8)|(x1&255)],c=V[(y1<<8)|(x0&255)],d=V[(y1<<8)|(x1&255)];
fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;
}
function f(u,v,P,oct){var s=0,a=0.5,nrm=0;for(var o=0;o<oct;o++){s+=a*n(u,v+o*37.1,P);nrm+=a;a*=0.5;u*=2;v*=2;P*=2;}return s/nrm;}
CLOUD_NZ={n:n,f:f};return CLOUD_NZ;
}
function cloudLayers(yo,winter,S){
var wx=S.wx||'clear',se=S.season,dusk=S.L.name==='dusk',L=[];
function cu(yb,hm,cov,P,a,sm){L.push({t:'cu',yb:yo+yb,hm:hm,cov:cov,P:P,a:a,sm:sm||0});}
function sc(y0,y1,cov,cell,a,dark,virga){L.push({t:'sc',y0:yo+y0,y1:yo+y1,cov:cov,P:Math.round(S.W*2/cell),vs:cell*0.36,a:a,dark:dark||0,virga:virga||0});}
function hi(t,y0,y1,P,a,s){L.push({t:t,y0:yo+y0,y1:yo+y1,P:P,a:a,s:s||1});}
if(wx==='rain'||wx==='storm'||wx==='typhoon'||wx==='snow'||wx==='blizzard'){
var dk=wx==='storm'||wx==='typhoon'?0.8:wx==='snow'||wx==='blizzard'?0.2:0.55;
if(yo>60)sc(-yo-10,-22,0.96,110,0.82,dk*0.35,0);
sc(-30,22,0.97,70,0.8,dk*0.5,0);
sc(8,36,0.62,34,0.9,dk,wx==='snow'||wx==='blizzard'?0.5:1);
return L;
}
if(wx==='cloudy'){if(yo>60)sc(-yo-10,-24,0.72,96,0.6,0.04,0);sc(-30,16,0.8,56,0.7,0.1,0);cu(20,10,0.6,7,0.95,0.5);cu(31,7,0.65,10,0.9,0.6);return L;}
if(dusk)hi('sk',14,30,4,0.9);
if(se==='summer'){hi('ci',-10,6,5,0.4);cu(8,12,0.5,6,1,0.5);cu(27,18,0.62,5,1,0.8);cu(33,6,0.4,12,0.85,0.7);}
else if(se==='autumn'){hi('cc',-10,20,5,0.65);cu(27,9,0.48,7,0.95,0.7);}
else if(se==='spring'){sc(-10,10,0.4,60,0.4,0);cu(25,12,0.6,6,0.9,0.7);cu(32,6,0.45,11,0.8,0.6);hi('ci',-10,2,5,0.3);}
else{hi('ci',-10,14,5,0.5);sc(12,26,0.42,48,0.55,0);cu(28,7,0.45,9,0.85,0.5);}
var up=yo-36,tp=-yo;
if(up>24){
if(se==='summer'){hi('ci',tp+4,tp+up*0.4,4,0.42);if(!dusk)cu(-38,Math.min(48,up*0.55),0.42,3,1,0.6);}
else if(se==='autumn'){hi('ci',tp+2,tp+up*0.3,4,0.45);hi('cc',tp+up*0.2,-34,4,1,4);}
else if(se==='spring'){sc(tp+8,tp+up*0.55,0.3,120,0.28,0);hi('ci',tp+up*0.4,-30,4,0.3);cu(-40,Math.min(22,up*0.3),0.4,4,0.85,0.7);}
else{hi('ci',tp+4,tp+up*0.6,4,0.72);cu(-44,Math.min(16,up*0.25),0.36,5,0.85,0.5);}
}
return L;
}
function paintCloudsS(ctx,yo,night,dusk,spanW,S){
spanW=spanW||S.W;
var T=ctx.getTransform?ctx.getTransform():{a:2},sc0=Math.abs(T.a)||2,r=Math.min(0.95,sc0),L=S.L,morning=L.name==='morning',winter=!!S.snow,wx=S.wx||'clear',ov=wx!=='clear';
var yH=100+yo,HH=Math.min(S.H*0.62,yH+6),pw=Math.max(2,Math.round(spanW*r)),ph=Math.max(2,Math.round(HH*r)),NZc=cloudNoise(),nf=NZc.f,nn=NZc.n;
var layers=cloudLayers(yo,winter,S);
var lit=night?[124,132,156]:dusk?[255,190,124]:morning?[255,244,232]:[255,253,247];
var mid=night?[64,70,92]:dusk?[232,158,136]:morning?[226,222,232]:[232,234,240];
var shd=night?[36,42,60]:dusk?[118,104,150]:morning?[162,164,188]:winter?[162,170,186]:[168,178,200];
var bas=night?[28,32,48]:dusk?[96,86,132]:morning?[138,140,166]:[140,150,174];
if(ov){var gk=night?0.3:0.75;lit=mixc(lit,[226,230,236],gk*0.75);mid=mixc(mid,[184,188,196],gk);shd=mixc(shd,[118,124,138],gk);bas=mixc(bas,[92,98,112],gk);}
var hz=mixc(L.skyHor,L.haze,0.5),aK=night?0.7:1;
var sunX=night?0.43:L.sunX,lx=(sunX<0.5?-1:1)*(dusk?0.92:0.5),ly=dusk?0.38:night?-0.6:morning?-0.5:-0.86,ll=Math.hypot(lx,ly);lx/=ll;ly/=ll;
function tone(br,base){
var c=br<0.5?mixc(shd,mid,br*2):mixc(mid,lit,(br-0.5)*2);
return base>0?mixc(c,bas,base):c;
}
var img=new ImageData(pw,ph),D=img.data,i,j;
function put(k4,c0,d){var ea=D[k4+3]/255,na=d+ea*(1-d);if(na<=0)return;D[k4]=(c0[0]*d+D[k4]*ea*(1-d))/na;D[k4+1]=(c0[1]*d+D[k4+1]*ea*(1-d))/na;D[k4+2]=(c0[2]*d+D[k4+2]*ea*(1-d))/na;D[k4+3]=na*255;}
for(var li=0;li<layers.length;li++){
var Ly=layers[li],yA,yB;
if(Ly.t==='cu'){yA=Ly.yb-Ly.hm*1.9;yB=Ly.yb+Ly.hm*0.35;}else{yA=Ly.y0-8;yB=Ly.y1+(Ly.virga?30:8);}
var j0=Math.max(0,Math.floor(yA*r)),j1=Math.min(ph,Math.ceil(yB*r));
if(j1<=j0)continue;
if(Ly.t==='cu'){
var Ac=new Float32Array(pw),Tc=new Float32Array(pw);
for(i=0;i<pw;i++){var u0=(i+0.5)/r/spanW,m=nf(u0*Ly.P,3.3+Ly.yb*0.13,Ly.P,3),fr=Ly.sm?nf(u0*Ly.P*4,9.1+Ly.yb,Ly.P*4,2):0;
var A=sstep(0.66-Ly.cov*0.3,0.8-Ly.cov*0.3,m),Af=Ly.sm*sstep(0.7,0.8,fr)*0.45*(1-A);Ac[i]=Math.max(A,Af);
var hd=nf(u0*Ly.P*5,7.7+Ly.yb,Ly.P*5,3);Tc[i]=Math.pow(Ac[i],0.5)*(0.35+1.4*sstep(0.2,0.8,hd)*(0.55+0.45*A));}
var hm=Ly.hm,P8=Ly.P*10;
var CF=function(ii,x,y){
var t=(Ly.yb-y)/hm;ii=((ii%pw)+pw)%pw;
if(Ac[ii]<0.02||t<-0.4||t>1.8)return-1;
var bl=nf(x/spanW*P8,y/(hm*0.3),P8,3)-0.5,b2=nf(x/spanW*P8*3,y/(hm*0.1),P8*3,2)-0.5;
return Math.min(Tc[ii]-t+bl*0.6+b2*0.18,(t+0.1+bl*0.22+b2*0.1)*2.6);
};
for(j=j0;j<j1;j++){
var y=(j+0.5)/r,haze=sstep(yo+8,yo+42,y)*0.5,row=j*pw,sx=Math.round(lx*hm*0.22*r),sy=ly*hm*0.22,sx2=Math.round(lx*hm*0.6*r),sy2=ly*hm*0.6;
for(i=0;i<pw;i++){
if(Ac[i]<0.02&&Ac[(i+pw-3)%pw]<0.02&&Ac[(i+3)%pw]<0.02)continue;
var x=(i+0.5)/r,f=CF(i,x,y);if(f<=-0.02)continue;
var tt=clamp((Ly.yb-y)/hm),w=lerp(0.4,0.16,sstep(0.25,1,tt)),d=sstep(-0.04,w,f);if(d<0.01)continue;
var o1=Math.max(0,CF(i+sx,x+lx*hm*0.22,y+sy)),o2=Math.max(0,CF(i+sx2,x+lx*hm*0.6,y+sy2));
var br=Math.exp(-(o1*2.2+o2*1.4))*0.78+tt*0.28;
if(dusk)br=Math.max(br*0.72,(1-sstep(0,0.45,tt))*0.82*Math.exp(-o2*1.2));
if(night)br=br*0.7+(1-d)*0.35;
var base=(1-sstep(0,0.28,tt))*(dusk?0.15:0.5)*(1-br*0.6);
put((row+i)*4,haze>0?mixc(tone(clamp(br),base),hz,haze):tone(clamp(br),base),Math.pow(d,0.9)*Ly.a*aK*(1-haze*0.4));
}
}
continue;
}
for(j=j0;j<j1;j++){
var y2=(j+0.5)/r,haze2=sstep(yo+8,yo+42,y2)*0.5,row2=j*pw;
for(i=0;i<pw;i++){
var x2=(i+0.5)/r,u=x2/spanW,d2=0,c0;
if(Ly.t==='sc'){
var bot=Ly.y1+(nf(u*Math.max(1,Math.round(Ly.P*0.6)),5.5+Ly.y1,Math.max(1,Math.round(Ly.P*0.6)),3)-0.5)*18;
var env=sstep(Ly.y0-8,Ly.y0+10,y2)*(1-sstep(bot-9,bot+1,y2));
var vg=0;
if(Ly.virga&&y2>bot-6){var vm=sstep(0.45,0.7,nf(u*Math.max(1,Math.round(Ly.P*0.35)),1.7,Math.max(1,Math.round(Ly.P*0.35)),2));vg=vm*Ly.virga*(1-sstep(bot-2,bot+26,y2))*(0.55+0.45*nn(u*Ly.P*6,y2/40,Ly.P*6))*0.5;}
if(env<0.01&&vg<0.01)continue;
var wu=u*Ly.P+(nf(u*Math.max(1,Math.round(Ly.P*0.5)),y2/(Ly.vs*3),Math.max(1,Math.round(Ly.P*0.5)),2)-0.5)*1.6;
var lump=function(yy){return nf(wu,yy/Ly.vs,Ly.P,4);};
var n0=lump(y2),thr=0.62-Ly.cov*0.42;
var dd=sstep(thr,thr+0.22,n0)*env;
if(dd>0.01){
var a1=sstep(thr,thr+0.22,lump(y2-Ly.vs*0.35)),a2=sstep(thr,thr+0.22,lump(y2-Ly.vs*0.9));
var br2=Math.exp(-(a1*0.9+a2*0.6))*0.95+0.12-Ly.dark*0.3,bs=sstep(bot-16,bot,y2)*(0.35+Ly.dark*0.5);
if(dusk)br2=Math.max(br2,sstep(bot-10,bot,y2)*0.7);
c0=tone(clamp(br2),clamp(bs+Ly.dark*0.25));d2=dd*Ly.a;
}else c0=null;
if(vg>0.01){var cv=mixc(tone(0.35,0.5),hz,0.35);if(c0){c0=mixc(cv,c0,d2/(d2+vg));d2=Math.max(d2,vg);}else{c0=cv;d2=vg;}}
if(!c0||d2<0.01)continue;
}else if(Ly.t==='cc'){
var band=sstep(0.5,0.7,nf(u*Ly.P,y2/22,Ly.P,3))*(1-sstep(Ly.y1-14,Ly.y1,y2));if(band<0.01)continue;
var ps=(1+(y2-Ly.y0)/60)/Ly.s,sk=x2+y2*0.9,fl=nn(sk/spanW*Math.round(300*ps),y2/1.9*ps,Math.round(300*ps))*0.7+nn(sk/spanW*600/Ly.s,(y2+9)/Ly.s,Math.round(600/Ly.s))*0.3;
d2=sstep(0.5,0.82,fl)*band*(0.6+0.4*sstep(0.4,0.8,nf(u*Ly.P*3,y2/8,Ly.P*3,2)));if(d2<0.01)continue;
c0=tone(0.55+fl*0.45,0);d2*=Ly.a*0.8;
}else if(Ly.t==='sk'){
var mk=sstep(0.5,0.75,nf(u*Ly.P,4.4,Ly.P,2))*sstep(Ly.y0-4,Ly.y0+3,y2)*(1-sstep(Ly.y1-5,Ly.y1,y2));if(mk<0.01)continue;
var stv=nf(u*Ly.P*12,y2/1.6,Ly.P*12,3);d2=sstep(0.55,0.78,stv)*mk;if(d2<0.01)continue;
var nearSun=Math.exp(-Math.pow((u*2%1)-sunX,2)*8);c0=mixc(mixc(mid,lit,0.6),[255,226,170],nearSun*0.6);d2*=Ly.a;
}else{
var bnd=sstep(0.52,0.72,nf(u*Ly.P,y2/18,Ly.P,2))*(1-sstep(Ly.y1-14,Ly.y1,y2))*sstep(Ly.y0,Ly.y0+6,y2+10);if(bnd<0.01)continue;
var sx3=x2-y2*2.2;d2=sstep(0.55,0.82,nf(sx3/spanW*Ly.P*4,y2/1.8,Ly.P*4,3))*bnd;if(d2<0.01)continue;
c0=tone(0.85,0);d2*=Ly.a;
}
if(haze2>0){c0=mixc(c0,hz,haze2);d2*=1-haze2*0.4;}
put((row2+i)*4,c0,d2*aK);
}
}
}
var cc=mkCanvas(pw,ph);cc.getContext('2d').putImageData(img,0,0);
ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(cc,0,0,spanW,HH);ctx.restore();
cc.width=cc.height=0;
}
var FW_COLS={red:[255,86,70],gold:[255,196,90],green:[110,236,120],silver:[236,240,255],purple:[190,110,255],blue:[96,150,255],orange:[255,140,50]};
var FW_KEYS=['red','gold','green','silver','purple','blue','orange'];
function makeFireworks(g,rng){return{shells:[],bursts:[],smoke:[],next:1.5+rng()*2,inShow:0,lull:0,flash:0,flashCol:[255,220,180],t:0};}
function fwFloor(g,x){return g.fwFloorAt?g.fwFloorAt(x):g.horizonY;}
function fwLaunch(S,g,rng,kind){
var hy=g.fwSky||g.horizonY,room=clamp((hy-30)/70,0.85,1.5),R=(kind==='small'?13+rng()*6:kind==='senrin'?22:26+rng()*16)*room*(g.fwScale||1),M=g.fwMoon,AV=g.fwAvoid||[],LP=g.fwLaunch;
var best=null,bs=-1e9,lo=6+R*0.75,kHi=kind==='yanagi'?1.1:0.7;
for(var k=0;k<28;k++){
var x=LP&&LP.length?clamp(LP[(rng()*LP.length)|0].x+(rng()-0.5)*g.W*0.3,g.W*0.08,g.W*0.92):g.W*(0.08+rng()*0.84);
var hi=Math.max(lo+4,fwFloor(g,x)-18-R*kHi),y=lo+rng()*(hi-lo),s=0,drop=R*(kind==='yanagi'?1.25:0.9);
if(g.skyOpen)for(var a=0;a<8;a++)s+=g.skyOpen(x+Math.cos(a*0.785)*R*0.8,y+Math.sin(a*0.785)*R*0.7)+g.skyOpen(x,y)*0.5;else s=4;
s*=3;if(M){var dm=Math.hypot(x-M.x,y-M.y),need=R*0.85+M.r*1.8+6;if(dm<need)s-=60*(1-dm/need)+20;s+=Math.min(1,Math.abs(x-M.x)/(g.W*0.35))*4;}
for(var j=0;j<AV.length;j++)if(x+R>AV[j].x0&&x-R<AV[j].x1&&y+drop>AV[j].top)s-=40;
if(s>bs){bs=s;best=[x,y];}
}
var base=fwFloor(g,best[0])-6,x0=best[0],y0=base,c1=FW_KEYS[(rng()*FW_KEYS.length)|0],c2=FW_KEYS[(rng()*FW_KEYS.length)|0];if(c2===c1)c2=FW_KEYS[(FW_KEYS.indexOf(c1)+2)%FW_KEYS.length];
if(LP&&LP.length){var nb=LP[0];LP.forEach(function(q){if(Math.abs(q.x-best[0])<Math.abs(nb.x-best[0]))nb=q;});x0=nb.x;y0=nb.y;}
S.shells.push({x:x0,y:y0,x0:x0,y0:y0,x1:best[0],y1:best[1],t0:S.t,dur:1.0+rng()*0.6,kind:kind,R:R,col:c1,col2:c2,drift:(rng()-0.5)*6});
}
function fwBurst(S,sh,rng,cue,g){
var k=sh.kind,n=k==='kiku'?90:k==='botan'?80:k==='yanagi'?60:k==='senrin'?0:36,R=k==='senrin'?0:sh.R||24,stars=[];
for(var i=0;i<n;i++){var a=rng()*TAU,ph=Math.acos(2*rng()-1),r=Math.sin(ph);stars.push({vx:Math.cos(a)*r,vy:Math.sin(a)*r});}
var b={x:sh.x,y:sh.y,t0:S.t,kind:k,col:k==='yanagi'?'gold':sh.col,col2:sh.col2,R:R,stars:stars,life:k==='yanagi'?3.6:k==='kiku'?2.4:k==='botan'?1.7:1.4};
if(k==='senrin'){b.subs=[];for(var j=0;j<11;j++)b.subs.push({dx:(rng()-0.5)*(sh.R||22)*1.6,dy:(rng()-0.5)*(sh.R||22)*1.1,t:0.35+rng()*0.6,col:FW_KEYS[(rng()*5)|0]});b.life=2.0;}
S.bursts.push(b);
var size=k==='small'?0.35:k==='senrin'?0.6:Math.min(1,R/36);
b.size=size;S.flash=Math.max(S.flash,0.4+size*0.4);S.flashCol=FW_COLS[b.col];
S.smoke.push({x:b.x,y:b.y,r:Math.max(8,R*0.7),t0:S.t,L:10+rng()*6});
var dl=g&&g.fwNear?0.8+(1-size)*0.6+rng()*0.6:2+rng()*2;
cue('firework',{delay:Math.round(dl*100)/100,size:Math.round(size*100)/100,kind:k});
}
function stepFireworks(S,g,dt,rng,cue,finale){
S.t+=dt;S.flash=Math.max(0,S.flash-dt*4);
if(S.t>S.next){
if(finale){
var kinds=['kiku','botan','small','botan','kiku','yanagi'];
fwLaunch(S,g,rng,kinds[(rng()*kinds.length)|0]);S.next=S.t+0.12+rng()*0.3;
}else{
var r=rng(),kind=r<0.34?'kiku':r<0.58?'botan':r<0.78?'yanagi':r<0.87?'senrin':'small';
fwLaunch(S,g,rng,kind);if(rng()<0.3)fwLaunch(S,g,rng,rng()<0.5?'small':'kiku');
S.inShow++;
if(S.inShow>9+rng()*6){S.inShow=0;S.next=S.t+4+rng()*4;}
else S.next=S.t+0.6+rng()*1.5;
}
}
var Wd=g.wind||{x:1,y:0,s:0.4},wx=Wd.x!==undefined?Wd.x:Wd.h/Math.max(0.05,Wd.s||0.4),wy=Wd.y!==undefined?Wd.y:0;
for(var i=S.shells.length-1;i>=0;i--){var sh=S.shells[i],u=(S.t-sh.t0)/sh.dur;if(u>=1){sh.x=sh.x1+sh.drift*(S.t-sh.t0);sh.y=sh.y1;fwBurst(S,sh,rng,cue,g);S.shells.splice(i,1);continue;}var e=1-Math.pow(1-u,2);sh.y=lerp(sh.y0,sh.y1,e);sh.x=lerp(sh.x0,sh.x1,e)+sh.drift*(S.t-sh.t0);}
S.bursts=S.bursts.filter(function(b){return S.t-b.t0<b.life+0.4;});
S.smoke.forEach(function(s){s.x+=wx*(3+9*Wd.s)*dt;s.y+=wy*2*dt-0.4*dt;s.r+=1.6*dt;});
S.smoke=S.smoke.filter(function(s){return S.t-s.t0<s.L;});
}
function fwStarPos(b,s,t,R,grav){var ex=1-Math.exp(-t*3.2);return[b.x+s.vx*R*ex,b.y+s.vy*R*ex*0.95+grav*t*t];}
function drawFireworks(sky,S,g){
var i,ln=lightName(g.LIT),night=ln==='night',dayK=night?1:ln==='dusk'?(g.fwDusk||0.8):0.45;
var sm=tintedSprite(night?[70,66,72]:[200,196,196]);
S.smoke.forEach(function(s){var a=(S.t-s.t0)/s.L;stamp(sky,sm,s.x,s.y,s.r,s.r*0.6,(0.22+0.25*S.flash)*Math.sin(Math.min(1,a*4)*Math.PI/2)*(1-a));});
sky.globalAlpha=1;
if(S.flash>0.01){sky.fillStyle=rgb(mixc(S.flashCol,[255,236,200],0.6),0.035*S.flash*dayK);sky.fillRect(0,0,g.W,g.H);}
sky.globalCompositeOperation='lighter';sky.lineCap='round';
var spr=sprite('spark');
for(i=0;i<S.shells.length;i++){
var sh=S.shells[i],dx=sh.x1-sh.x0,dl=Math.max(1,Math.hypot(dx,sh.y0-sh.y1));stamp(sky,spr,sh.x,sh.y,2.2,0,0.9*dayK);
sky.strokeStyle='rgba(255,214,150,'+(0.45*dayK)+')';sky.lineWidth=0.6;sky.beginPath();sky.moveTo(sh.x,sh.y);sky.lineTo(sh.x-(sh.drift*0.1+dx*9/dl),sh.y+9*(sh.y0-sh.y1)/dl);sky.stroke();
}
var NL=4,trails={},heads={},halos={},cores=new Path2D();
FW_KEYS.forEach(function(k){trails[k]=[];heads[k]=[];for(var l=0;l<NL;l++){trails[k].push(new Path2D());heads[k].push(new Path2D());}halos[k]=new Path2D();});
var ks=g.KS||3,px1=1/ks,SZ=g.fwStar||1;
for(i=0;i<S.bursts.length;i++){
var b=S.bursts[i],t=S.t-b.t0,life=b.life;
if(t<0.15)stamp(sky,spr,b.x,b.y,Math.min(5,(b.R||16)*0.15),0,(1-t/0.15)*0.7*dayK);
if(b.subs){b.subs.forEach(function(s2){var tt=t-s2.t;if(tt<0||tt>0.9)return;var al2=1-tt/0.9,lv2=Math.min(NL-1,Math.floor(al2*NL));for(var q=0;q<12;q++){var a=q/12*TAU,ex=(1-Math.exp(-tt*5))*7,hx=b.x+s2.dx+Math.cos(a)*ex,hy=b.y+s2.dy+Math.sin(a)*ex+tt*tt*6;var tx0=Math.max(0,tt-0.25),ex0=(1-Math.exp(-tx0*5))*7,txx=b.x+s2.dx+Math.cos(a)*ex0,tyy=b.y+s2.dy+Math.sin(a)*ex0+tx0*tx0*6;trails[s2.col][Math.max(0,lv2-1)].moveTo(hx,hy);trails[s2.col][Math.max(0,lv2-1)].lineTo(txx,tyy);heads[s2.col][lv2].moveTo(hx+0.35*SZ,hy);heads[s2.col][lv2].arc(hx,hy,0.35*SZ,0,TAU);if(al2>0.5){cores.moveTo(hx+0.2,hy);cores.arc(hx,hy,Math.max(px1,0.2),0,TAU);}}});continue;}
var fade=clamp(1-t/life),grav=b.kind==='yanagi'?9:5,col=b.kind==='kiku'&&t>life*0.55?b.col2:b.col;
if(fade<=0)continue;
var yan=b.kind==='yanagi',tl=yan?Math.min(1.6,t):b.kind==='botan'||b.kind==='small'?Math.min(0.5,t)*(0.45+0.55*fade):Math.min(0.45,t)*(0.6+0.4*fade),M=yan?7:4,hr=(yan?0.26:0.34)*SZ;
for(var s=0;s<b.stars.length;s++){
var st=b.stars[s],p1=fwStarPos(b,st,t,b.R,grav);
if(b.kind==='small'&&((s+Math.floor(t*20))%3===0))continue;
var prev=p1;
for(var m=1;m<=M;m++){var q=fwStarPos(b,st,Math.max(0,t-tl*m/M),b.R,grav),lvm=Math.max(0,Math.min(NL-1,Math.floor(fade*NL*(1-(m-0.5)/M)*(yan?1:1.1))));trails[yan&&m>2?'gold':col][lvm].moveTo(prev[0],prev[1]);trails[yan&&m>2?'gold':col][lvm].lineTo(q[0],q[1]);prev=q;}
if(yan&&(s+Math.floor(t*14))%3)continue;
var lv=Math.min(NL-1,Math.floor(fade*NL));heads[col][lv].moveTo(p1[0]+hr*1.7,p1[1]);heads[col][lv].arc(p1[0],p1[1],hr*1.7,0,TAU);
if(fade>0.35){halos[col].moveTo(p1[0]+hr*4.5,p1[1]);halos[col].arc(p1[0],p1[1],hr*4.5,0,TAU);cores.moveTo(p1[0]+hr,p1[1]);cores.arc(p1[0],p1[1],Math.max(px1*0.8,hr),0,TAU);}
}
}
FW_KEYS.forEach(function(k){
var c=FW_COLS[k],hot=mixc(c,[255,250,236],0.45);
sky.fillStyle=rgb(c,0.1*dayK);sky.fill(halos[k]);
for(var l=0;l<NL;l++){var a=(l+1)/NL;sky.strokeStyle=rgb(l===NL-1?hot:c,a*a*0.85*dayK);sky.lineWidth=Math.max(px1,0.32*SZ);sky.stroke(trails[k][l]);sky.fillStyle=rgb(hot,a*0.8*dayK);sky.fill(heads[k][l]);}
});
sky.fillStyle='rgba(255,253,246,'+(0.95*dayK)+')';sky.fill(cores);
sky.globalCompositeOperation='source-over';sky.globalAlpha=1;sky.lineCap='butt';
}
function drawFireworkPond(ctx,S,g){
if(!S||S.flash<0.02)return;
ctx.globalCompositeOperation='lighter';ctx.fillStyle=rgb(S.flashCol,0.16*S.flash);ctx.fillRect(0,0,g.W,g.H);ctx.globalCompositeOperation='source-over';
}
function drawFireworkReflections(ctx,S,g,t){
ctx.globalCompositeOperation='lighter';
for(var i=0;i<S.bursts.length;i++){
var b=S.bursts[i],a=S.t-b.t0;if(a<0||a>2.2||!b.R)continue;
var f=clamp(1-a/2.2)*(b.size||0.6),spc=tintedSprite(FW_COLS[b.col]);
for(var k=0;k<16;k++){var yy=lerp(g.horizonY+12,g.H,k/15)+Math.sin(t*2+k)*2,w=(6+k*1.2+Math.sin(t*3+k*1.7)*2)*(0.6+b.R/60);stamp(ctx,spc,b.x+Math.sin(t*1.3+k)*2,yy,w,1.6,0.5*f);}
}
ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
function paintFireworkHaze(ctx,yo,W){
ctx.save();var g=ctx.createLinearGradient(0,yo+4,0,yo+60);g.addColorStop(0,'rgba(120,110,120,0)');g.addColorStop(0.6,'rgba(120,110,120,0.12)');g.addColorStop(1,'rgba(120,110,120,0)');ctx.fillStyle=g;ctx.fillRect(0,yo,W,60);ctx.restore();
}
var WORLD={};
WORLD.garden=function(host){
var BENDS,DQ,EVT,F,FW,GLOWS,H,KS,LAY,LIT,LX,LZ,MODE,P,SEA,SKYM,SPR,W,WL,drawPagoda,drawRidgeTemple,hYo,lightTint,pagodaPos,seasonName,sprite,stamp,tintedSprite,tmpCanvas;
function pull(){var s=host();BENDS=s.BENDS;DQ=s.DQ;EVT=s.EVT;F=s.F;FW=s.FW;GLOWS=s.GLOWS;H=s.H;KS=s.KS;LAY=s.LAY;LIT=s.LIT;LX=s.LX;LZ=s.LZ;MODE=s.MODE;P=s.P;SEA=s.SEA;SKYM=s.SKYM;SPR=s.SPR;W=s.W;WL=s.WL;drawPagoda=s.drawPagoda;drawRidgeTemple=s.drawRidgeTemple;hYo=s.hYo;lightTint=s.lightTint;pagodaPos=s.pagodaPos;seasonName=s.seasonName;sprite=s.sprite;stamp=s.stamp;tintedSprite=s.tintedSprite;tmpCanvas=s.tmpCanvas;}
function paintBackdrop(ctx){
var rng=mulberry32(301),L=LIT,yo=hYo(),night=L.id==='night',dayMoonP=null;
MOONCUT=null;
var top=mixc(L.skyTop,SEA.sky,night?0:0.25),hor=L.skyHor;
var yH=130+yo;
paintSkyGradient(ctx,top,hor,W,yH,yH+20);
var sx=W*L.sunX,sy=yo+140*L.sunY;
paintSunGlow(ctx,L,sx,sy,260,W,yH+20);
if(night&&!(L.overcast>0.5)){
paintStars(ctx,W,yH);
var ms=EVT==='tsukimi'?null:moonSpot(yo,9,6,false),mx=ms?ms.x:0,my=ms?ms.y:0,mr=ms?ms.r:0;
var mg=ctx.createRadialGradient(mx,my,mr*0.5,mx,my,mr*6);mg.addColorStop(0,'rgba(220,230,255,0.35)');mg.addColorStop(1,'rgba(200,215,255,0)');ctx.fillStyle=mg;ctx.fillRect(mx-mr*6,my-mr*6,mr*12,mr*12);
var dmo={warmth:0.05,haze:0.2,alt:0.9,tilt:0.1,glow:false,sglow:0.55};
if(mr&&MOONKEY){ctx.fillStyle='rgb(255,0,255)';ctx.beginPath();ctx.arc(mx,my,mr+0.3,0,TAU);ctx.fill();}
else if(mr){
paintFullMoon(ctx,mx,my,mr,dmo);
if(MODE==='n')dayMoonP={x:mx,y:my,r:mr,o:dmo};
}
}else if(L.id==='dusk'&&!L.overcast){
paintDuskSun(ctx,sx,sy,8);
}
paintClouds(ctx,yo,yH);if(FW&&(night||L.id==='dusk'))paintFireworkHaze(ctx,yo,W);
if(!drawEventMoon(ctx,yo)&&dayMoonP&&!MOONKEY)MOONP=dayMoonP;
var haze=L.haze;
var layers=[{y:25,amp:16,col:[150,160,170],hz:0.6,f:0.012,tree:0.3,cr:0.55},{y:45,amp:14,col:[108,120,108],hz:0.46,f:0.02,tree:0.6,cr:0.85},{y:65,amp:12,col:[92,100,72],hz:0.3,f:0.03,tree:0.85,cr:1.15},{y:87,amp:10,col:[80,84,56],hz:0.16,f:0.045,tree:1,cr:1.45}];
var R0=SEA.ridge,crowns=SEA.id==='spring'?R0.concat([R0[0],R0[1],R0[5],R0[0],R0[1]]):R0,lt=lightTint(1),sgn=Math.sign(L.ls[0])||1;
layers.forEach(function(Ly,li){
var pts=[],step=2;
for(var x2=-10;x2<=W+10;x2+=step)pts.push([x2,yo+Ly.y-Ly.amp*NZ.fbm(x2*Ly.f+li*7,li*3.1,4)*1.6+Ly.amp*0.4]);
var mcut=MOONCUT&&MOONCUT[li];
if(mcut)pts.forEach(function(p){var gq=mcut.g(p[0]);p[1]+=Math.max(0,mcut.T-p[1])*gq+Math.abs(NZ.fbm(p[0]*0.09+li*5,9.3,3)-0.5)*3.2*gq*Math.min(1,Math.max(0,mcut.T-p[1])/4);});
function ridgeY(x){var f=(x+10)/step,i0=Math.max(0,Math.min(pts.length-2,Math.floor(f)));return lerp(pts[i0][1],pts[i0+1][1],clamp(f-i0));}
var lcol=mixc(mulc(Ly.col,lt),haze,Ly.hz);
if(SEA.snow&&li<2)lcol=mixc(lcol,mulc([236,240,248],lt),0.55-li*0.15);
var forest=mixc(mulc(scl(ramp(crowns,0.35),0.82),lt),haze,Ly.hz+0.08);
if(SEA.snow)forest=mixc(forest,lcol,0.45);
var rr=mulberry32(410+li),sil2=new Path2D();
sil2.moveTo(-10,yo+170);pts.forEach(function(p){sil2.lineTo(p[0],p[1]);});sil2.lineTo(W+10,yo+170);sil2.closePath();
var bumps=new Path2D(),cone=new Path2D(),cs=Ly.cr;
for(var bx=-8;bx<W+8;bx+=cs*(1.3+rr()*1.1)){
var by=ridgeY(bx),r=cs*(0.8+rr()*0.7);
if(rr()<0.22){cone.moveTo(bx-r*0.7,by+r*0.6);cone.lineTo(bx,by-r*2.1);cone.lineTo(bx+r*0.7,by+r*0.6);cone.closePath();}
else{bumps.moveTo(bx+r,by+r*0.2);bumps.ellipse(bx,by+r*0.2,r,r*0.8,0,0,TAU);}
}
ctx.fillStyle=rgb(mixc(lcol,forest,Ly.tree*0.5));ctx.fill(sil2);ctx.fill(bumps);ctx.fill(cone);
if(SKYM&&li>=1){SKYM.globalCompositeOperation='destination-out';SKYM.fill(sil2);SKYM.fill(bumps);SKYM.fill(cone);SKYM.globalCompositeOperation='source-over';}
ctx.save();ctx.clip(sil2);
var k,nC=pts.length-1,yT=1e9,yB=-1e9,sla=[];
for(k=0;k<pts.length;k++){yT=Math.min(yT,pts[k][1]);yB=Math.max(yB,pts[k][1]);}
for(k=0;k<nC;k++)sla.push((pts[k+1][1]-pts[k][1])/step*sgn);
yT-=4;yB+=Ly.amp*2.2;
var nR=Math.max(2,Math.ceil(yB-yT)),smc=mkCanvas(nC,nR),smx=smc.getContext('2d'),sid=smx.createImageData(nC,nR),sdd=sid.data,cD=scl(lcol,0.66),cL=mixc(lcol,[255,250,240],0.3);
function smooth(R){var o=[];for(var k2=0;k2<nC;k2++){var sm=0,sw=0;for(var t5=-R;t5<=R;t5++){var w5=R+1-Math.abs(t5);sm+=sla[Math.max(0,Math.min(nC-1,k2+t5))]*w5;sw+=w5;}o.push(sm/sw);}return o;}
var slA=smooth(3),slB=smooth(16);
for(k=0;k<nC;k++){
var rY=Math.min(pts[k][1],pts[k+1][1])-4;
for(var j=0;j<nR;j++){
var fq=Math.max(0,(yT+j+0.5-rY)/(Ly.amp*2.2)),sl=lerp(slA[k],slB[k],clamp(fq*1.8)),as=Math.abs(sl),aa=Math.min(1,clamp(as*1.1)+0.1)*sstep(0.03,0.07,as)*(sl>0?0.55:0.42),cc=sl>0?cD:cL,q4=(j*nC+k)*4;
sdd[q4]=cc[0];sdd[q4+1]=cc[1];sdd[q4+2]=cc[2];sdd[q4+3]=255*aa*(1-sstep(0.3,1,fq));
}
}
smx.putImageData(sid,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(smc,pts[0][0],yT,nC*step,nR);smc.width=smc.height=0;
ctx.restore();
if(SEA.snow&&li<3){
ctx.save();ctx.clip(sil2);ctx.fillStyle=rgb(mulc([244,246,250],lt),0.55);ctx.beginPath();pts.forEach(function(p,k){if(k)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});for(var k2=pts.length-1;k2>=0;k2--){var sx5=pts[k2][0],gul=Math.pow(Math.abs(NZ.n2(sx5*0.21+li*4,3.3)*2-1),0.6),sd5=(2+12*NZ.fbm(sx5*0.03+li*2.7,li+8,3))*(0.35+0.65*gul)*(1+0.6*clamp((pts[k2][1]-(yo+Ly.y-Ly.amp))/(Ly.amp*1.6)));ctx.lineTo(sx5,pts[k2][1]+sd5);}
ctx.closePath();ctx.fill();ctx.restore();
}
if(Ly.tree>0){
var cnt=Math.floor((1150*Ly.tree+260)*Math.min(1.6,DQ)),NB=3,sets=[],i2,b;
var bodyC=mixc(lcol,forest,Ly.tree*0.5),ovK=(L.overcast||0)*clamp(0.85-li*0.2);
var hzD=Ly.hz*(0.78+0.3*clamp(1-li/2))+0.04,shK=li?1:0.45;
crowns.forEach(function(cc){for(b=0;b<NB;b++){var c=mixc(mulc(scl(cc,0.8+(b+0.5)/NB*0.24),lt),haze,hzD);if(SEA.snow)c=mixc(c,lcol,0.35);if(ovK)c=mixc(c,bodyC,ovK);sets.push({c:c,sh:new Path2D(),bd:new Path2D(),lt:new Path2D(),lo:new Path2D()});}});
for(i2=0;i2<cnt;i2++){
var x3=rng()*(W+16)-8,yr=ridgeY(x3),dep=Math.pow(rng(),1.5),y3=yr+dep*(Ly.amp*2.6+8)+0.6;
var r3=(0.75+rng()*0.9)*Ly.cr*(1-dep*0.35)/Math.sqrt(Math.min(1.6,DQ)),S2=sets[(rng()*sets.length)|0],body=dep>0.55?S2.lo:S2.bd;
S2.sh.moveTo(x3+r3-sgn*r3*0.25,y3+r3*0.35);S2.sh.ellipse(x3-sgn*r3*0.25,y3+r3*0.35,r3,r3*0.7,0,0,TAU);
body.moveTo(x3+r3,y3);body.ellipse(x3,y3,r3,r3*0.78,0,0,TAU);
if(dep<0.7){S2.lt.moveTo(x3+sgn*r3*0.3+r3*0.5,y3-r3*0.32);S2.lt.ellipse(x3+sgn*r3*0.3,y3-r3*0.32,r3*0.5,r3*0.36,0,0,TAU);}
}
var aK=0.55+0.4*Ly.tree;
sets.forEach(function(S3){ctx.fillStyle=rgb(scl(S3.c,0.72+0.12*(1-shK)),0.5*aK*shK);ctx.fill(S3.sh);ctx.fillStyle=rgb(S3.c,0.85*aK);ctx.fill(S3.bd);ctx.fillStyle=rgb(S3.c,0.45*aK);ctx.fill(S3.lo);ctx.fillStyle=rgb(mixc(scl(S3.c,1.18),[255,250,236],0.12),0.6*aK);ctx.fill(S3.lt);});
}
if(li===1){paintRainVeil(ctx,yo);paintRainbowG(ctx,yo);}
if(li===1)drawRidgeTemple(ctx,P(LX(-1.0),0,LZ(12)).x,ridgeY,Ly,haze,lt);
var mg2=ctx.createLinearGradient(0,yo+Ly.y+Ly.amp*0.4,0,yo+Ly.y+Ly.amp*1.8);mg2.addColorStop(0,rgb(haze,0));mg2.addColorStop(0.55,rgb(haze,0.3*L.hazeK));mg2.addColorStop(1,rgb(haze,0));ctx.fillStyle=mg2;ctx.fillRect(0,yo+Ly.y,W,Ly.amp*2.2);
if(li===2&&F.pagoda){var pp=pagodaPos();drawPagoda(ctx,pp.x,pp.y,0.78,mixc(mulc([78,52,42],lt),haze,0.3),L.lit);if(SKYM){SKYM.globalCompositeOperation='destination-out';drawPagoda(SKYM,pp.x,pp.y,0.78,[0,0,0],false);SKYM.globalCompositeOperation='source-over';}}
});
}
function cloudPuff(ctx,x,y,w,h,rng,C,sgn,o){
o=o||{};
var tf=ctx.getTransform?ctx.getTransform():null,sc=tf?Math.max(0.5,Math.min(4,Math.hypot(tf.a,tf.b))):2;
var pad=h*1.2,cw=w*1.25+pad*2,ch=h*(o.tall||2.2)+pad*2,cv=mkCanvas(Math.ceil(cw*sc),Math.ceil(ch*sc)),c=cv.getContext('2d');
c.setTransform(sc,0,0,sc,0,0);
var bx=cw/2,by=ch-pad*0.55,i,j,lobes=[];
function dab(cx,cy,r,a,col){var g=c.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,rgb(col||[255,255,255],a));g.addColorStop(0.55,rgb(col||[255,255,255],a*0.8));g.addColorStop(1,rgb(col||[255,255,255],0));c.fillStyle=g;c.fillRect(cx-r,cy-r,r*2,r*2);}
var n=5+Math.round(w/Math.max(3,h*0.8)),tall=o.tall||2.2;
for(i=0;i<n;i++){
var u=(i+0.5)/n,env=Math.pow(Math.sin(u*Math.PI),0.8),r=h*(0.32+0.62*env)*(0.75+rng()*0.45);
lobes.push([bx+(u-0.5)*w+(rng()-0.5)*w*0.05,by-r*0.55-env*h*(tall-1.2)*0.55*(0.7+rng()*0.6),r]);
}
for(i=0;i<n*0.6;i++){var q=lobes[(rng()*n)|0];lobes.push([q[0]+(rng()-0.5)*q[2],q[1]-q[2]*(0.3+rng()*0.4),q[2]*(0.4+rng()*0.3)]);}
lobes.forEach(function(q){dab(q[0],q[1],q[2]*1.15,1);for(j=0;j<5;j++){var an=Math.PI+rng()*Math.PI,rr=q[2]*(0.25+rng()*0.3);dab(q[0]+Math.cos(an)*q[2]*0.85,q[1]+Math.sin(an)*q[2]*0.8,rr*1.3,0.75);}});
for(i=0;i<10;i++){var e=lobes[(rng()*lobes.length)|0],an2=rng()*TAU;dab(e[0]+Math.cos(an2)*e[2]*1.15,e[1]+Math.sin(an2)*e[2]*0.7,e[2]*(0.25+rng()*0.3),0.3);}
c.globalCompositeOperation='destination-out';
var gb=c.createLinearGradient(0,by-h*0.22,0,by+h*0.12);gb.addColorStop(0,'rgba(0,0,0,0)');gb.addColorStop(1,'rgba(0,0,0,1)');c.fillStyle=gb;c.fillRect(0,by-h*0.22,cw,ch);
c.globalCompositeOperation='source-atop';
var gv=c.createLinearGradient(0,by-h*tall*0.95,0,by);gv.addColorStop(0,rgb(C.lit));gv.addColorStop(0.5,rgb(mixc(C.lit,C.mid,0.55)));gv.addColorStop(0.85,rgb(C.mid));gv.addColorStop(1,rgb(C.shd));c.fillStyle=gv;c.fillRect(0,0,cw,ch);
var gs=c.createLinearGradient(bx+sgn*w*0.55,0,bx-sgn*w*0.55,0);gs.addColorStop(0,rgb(C.lit,0.5));gs.addColorStop(0.5,rgb(C.mid,0));gs.addColorStop(1,rgb(C.shd,0.45));c.fillStyle=gs;c.fillRect(0,0,cw,ch);
lobes.forEach(function(q){dab(q[0]-sgn*q[2]*0.35,q[1]+q[2]*0.4,q[2]*0.9,0.38,C.shd);dab(q[0]+sgn*q[2]*0.3,q[1]-q[2]*0.35,q[2]*0.6,0.55,C.lit);});
if(C.glow){var gw=c.createLinearGradient(0,by-h*0.5,0,by);gw.addColorStop(0,rgb(C.glow,0));gw.addColorStop(1,rgb(C.glow,0.55));c.fillStyle=gw;c.fillRect(0,0,cw,ch);}
c.globalCompositeOperation='source-over';
ctx.save();ctx.globalAlpha=C.A;ctx.imageSmoothingEnabled=true;ctx.drawImage(cv,x-bx,y-by,cw,ch);ctx.restore();
cv.width=cv.height=0;
}
function cloudlet(ctx,x,y,w,h,C,a,sgn){
function soft(cx,cy,rx,ry,col,al){ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);var g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,rgb(col,al));g.addColorStop(0.5,rgb(col,al*0.7));g.addColorStop(1,rgb(col,0));ctx.fillStyle=g;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();}
soft(x-sgn*w*0.1,y+h*0.35,w*1.05,h*1.0,C.shd,a*0.55);
soft(x,y,w,h*1.1,C.mid,a*0.8);
soft(x+sgn*w*0.15,y-h*0.3,w*0.62,h*0.6,C.lit,a);
}
function paintClouds(ctx,yo,yH){
var L=LIT,night=L.id==='night',dusk=L.id==='dusk',morning=L.id==='morning',sname=seasonName(),rng=mulberry32(17+sname.length),i;
var sgn=L.sunX<0.5?-1:1,sky=mixc(L.skyTop,L.skyHor,0.5);
var lit=night?[120,132,168]:dusk?[255,206,160]:morning?[255,248,238]:[255,254,250];
var mid=night?[62,72,106]:dusk?[214,156,158]:mixc(sky,[246,246,248],0.66);
var shd=night?[30,38,66]:dusk?[112,92,132]:mixc(sky,[124,134,158],0.62);
var A=night?0.6:sname==='spring'?0.7:0.9;
if(sname==='winter'){lit=mixc(lit,sky,0.25);mid=mixc(mid,[200,204,212],0.4);}
if(sname==='spring'&&!night){mid=mixc(mid,L.haze,0.25);shd=mixc(shd,L.haze,0.3);}
var C={lit:lit,mid:mid,shd:shd,A:A,glow:dusk?[255,150,96]:null};
if(L.overcast){
var dk=clamp(L.dark||0.3),oshd=night?[18,22,34]:mixc([150,154,162],[64,68,78],dk),omid=night?[34,40,56]:mixc([196,200,206],[104,110,120],dk),olit=night?[58,64,84]:mixc([232,234,238],[150,156,164],dk);
if(L.weather==='typhoon'){oshd=mulc(oshd,[0.82,0.92,0.88]);omid=mulc(omid,[0.85,0.95,0.9]);}
paintOvercast(ctx,yo,{mid:rgb(omid),lit:rgb(olit),arr:[rgb(oshd,0.85),rgb(omid,0.9),rgb(olit,0.8)]},A,rng,sgn);return;
}
var nci=sname==='autumn'?3:sname==='winter'?2:4;
for(i=0;i<nci;i++){
var cx=rng()*W,cy=3+rng()*14,cw=40+rng()*70,ang=-0.06+(rng()-0.5)*0.08;
ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);ctx.lineCap='round';
for(var k=0;k<16;k++){
var u0=(rng()-0.5)*cw,len=cw*(0.15+rng()*0.3),yy=(rng()-0.5)*3.2,al=(night?0.08:0.18)*(1-Math.abs(u0)/cw*1.4);
if(al<=0.01)continue;
ctx.strokeStyle=rgb(lit,al);ctx.lineWidth=0.35+rng()*0.6;ctx.beginPath();ctx.moveTo(u0,yy);ctx.quadraticCurveTo(u0+len*0.6,yy-0.3,u0+len,yy-0.9-rng()*1.2);ctx.stroke();
}
var gg=ctx.createRadialGradient(0,0,0,0,0,cw/2);gg.addColorStop(0,rgb(lit,night?0.06:0.14));gg.addColorStop(1,rgb(lit,0));ctx.scale(1,0.06);ctx.fillStyle=gg;ctx.fillRect(-cw/2,-cw/2,cw,cw);
ctx.restore();
}
if(sname==='summer'){
[[0.1,30,48,9.5,2.6],[0.5,32,70,12,2.9],[0.84,29,42,8.5,2.4]].forEach(function(c){cloudPuff(ctx,W*c[0]+(rng()-0.5)*30,yo+c[1],c[2],c[3],rng,C,sgn,{tall:c[4]});});
}else if(sname==='autumn'){
var ux=W*(0.35+rng()*0.3);
var nk=Math.ceil((W+30)/10);
for(var row=0;row<10;row++)for(var k2=0;k2<nk;k2++){
var x0=k2*10+row*4.5+(rng()-0.5)*8-14,y0=2+row*2.1+(rng()-0.5)*1.4+x0*0.012+Math.sin(x0*0.05+row*0.8)*1.1,fx=1-Math.abs(x0-ux)/(W*0.62),fr=1-Math.abs(row-3.5)/6;
var pm=NZ.fbm(x0*0.014+3.1,row*0.22+7.7,3),keep=clamp((pm-0.36)*3.2)*fx*fr*1.5;
if(rng()>keep)continue;
var cw0=(1.5+rng()*2.6)*(0.7+pm*0.8);
cloudlet(ctx,x0,y0,cw0,cw0*(0.28+rng()*0.16),C,clamp(keep*1.1)*(night?0.42:0.9)*(0.65+0.35*rng()),sgn);
}
for(i=0;i<3;i++)cloudPuff(ctx,W*(0.15+i*0.33)+rng()*30,yo+30+rng()*4,34+rng()*20,5.5+rng()*2.5,rng,C,sgn,{tall:1.7});
}else if(sname==='winter'){
for(i=0;i<7;i++){
var by=4+i*5.5+rng()*3,bw=120+rng()*140,bx=rng()*W,bh=2.2+rng()*2.2;
[[shd,0.5,1.0,0.6],[mid,0.45,0.85,-0.2],[lit,0.35,0.55,-0.8]].forEach(function(Ly){var cy2=by+Ly[3]*bh;ctx.save();ctx.translate(bx+(Ly[0]===lit?sgn*8:0),cy2);ctx.scale(1,bh*Ly[2]/(bw/2));var gr=ctx.createRadialGradient(0,0,0,0,0,bw/2);gr.addColorStop(0,rgb(Ly[0],A*Ly[1]));gr.addColorStop(0.6,rgb(Ly[0],A*Ly[1]*0.6));gr.addColorStop(1,rgb(Ly[0],0));ctx.fillStyle=gr;ctx.fillRect(-bw/2,-bw/2,bw,bw);ctx.restore();});
}
for(i=0;i<3;i++)cloudPuff(ctx,rng()*W,yo+28+rng()*4,50+rng()*30,5+rng()*2.5,rng,C,sgn,{tall:1.5});
}else{
for(i=0;i<6;i++)cloudPuff(ctx,(i+0.3+rng()*0.5)*W/6,yo+22+rng()*10,30+rng()*26,5+rng()*3,rng,C,sgn,{tall:1.9});
}
}
var MOONP=null,MOONKEY=false;
var MOONCUT=null,RIDGEL=[[25,16,0.012,0.55],[45,14,0.02,0.85],[65,12,0.03,1.15],[87,10,0.045,1.45]];
function moonSpot(yo,rT,rMin,dusk){
var x=pagodaPos().x+Math.max(16,rT*1.2+4),li,k,q,cut=[];
function ry(l,xx){var Ly=RIDGEL[l];return yo+Ly[0]-Ly[1]*NZ.fbm(xx*Ly[2]+l*7,l*3.1,4)*1.6+Ly[1]*0.4;}
function top(l,hw){var t=1e9,c=cut[l];for(q=-8;q<=8;q++){var xx=x+q*hw/8,y=ry(l,xx);if(c)y+=Math.max(0,c.T-y)*c.g(xx);t=Math.min(t,y-RIDGEL[l][3]*2.4);}return t;}
var hw0=rT*1.1+2,S=-1e9,rr=0;
for(k=0;k<3;k++){S=1e9;for(li=k;li<4;li++)S=Math.min(S,top(li,hw0));rr=(S-2.5)/2.15;if(rr>=rMin)break;}
if(rr<rMin)return null;
var r=Math.min(rT,rr);
for(li=0;li<k;li++)(function(l){var w=r*1.6+12+6*l,xc=x+r*(l?-0.3:0.35),sd=l?-1:1;cut[l]={T:S+RIDGEL[l][3]*2.4+2,li:l,g:function(xx){var dx=xx-xc,ww=dx*sd>0?w*1.7:w*0.85,e=Math.exp(-Math.pow(Math.abs(dx)/ww,1.8)),n=NZ.fbm(xx*0.045+l*3.3,4.7,3)*0.7+NZ.n2(xx*0.16+l,2.2)*0.3;return e*(1-0.85*(1-e)*n);}};})(li);
var tt=1e9;for(li=0;li<4;li++)tt=Math.min(tt,top(li,r*1.02));
r=Math.max(rMin*0.9,Math.min(r,dusk?(tt-1.2)/2.05:(tt-2.5)/2.15));
var y=dusk?tt-r*1.05:Math.min(20+yo*0.5,tt-r*1.15-0.6);
y=Math.max(r+(dusk?1.2:1.5),y);
MOONCUT=k?cut:null;
return{x:x,y:y,r:r};
}
function drawEventMoon(ctx,yo){
if(!MOONKEY)MOONP=null;
if(EVT!=='tsukimi'||!(LIT.id==='night'||LIT.id==='dusk')||LIT.overcast>0.5||LIT.fog)return false;
var night=LIT.id==='night',ms=moonSpot(yo,night?14:17,6.5,!night);
if(!ms)return false;
var mx=ms.x,my=ms.y,mr=ms.r;
var mo=night?{warmth:0.1,haze:0.3,alt:0.85,tilt:0.12}:{warmth:0.72,haze:0.8,alt:0.05,tilt:0.5,hazeCol:LIT.haze,bright:1.08};
if(MOONKEY){ctx.fillStyle='rgb(255,0,255)';ctx.beginPath();ctx.ellipse(mx,my,mr+0.3,(mr+0.3)*(1-0.045*(1-mo.alt)),0,0,TAU);ctx.fill();return true;}
paintFullMoon(ctx,mx,my,mr,mo);
if(MODE==='n')MOONP={x:mx,y:my,r:mr,o:mo};
return true;
}
function windVec(w,gust){
var a=w.dir*Math.PI/180,s=w.strength*(1+(gust||0)),x=Math.cos(a),y=Math.sin(a);
return{dir:a,s:s,base:w.strength,x:x,y:y*0.35,side:x>=0?1:-1};
}
var WEATHERS=['clear','cloudy','rain','storm','snow','typhoon','blizzard'];
function weatherInfo(date){var d=toDate(date);if(isNaN(d.getTime()))return{w:'clear',after:false};return{w:weatherAt(d),after:afterRainAt(d)};}
var WLIGHT={};
function weatherLight(L,w,after){
if((!w||w==='clear')&&!after)return L;
var key=L.id+'|'+w+'|'+(after?1:0);if(WLIGHT[key])return WLIGHT[key];
var o={},k;for(k in L)o[k]=L[k];
var night=L.id==='night',over=w==='cloudy'||w==='rain'||w==='storm'||w==='snow'||w==='typhoon'||w==='blizzard';
o.weather=w;o.after=!!after;o.wet=w==='storm'||w==='typhoon'?1:w==='rain'?0.85:after?0.4:0;
if(over){
var dark=w==='storm'?1:w==='rain'?0.68:w==='snow'?0.12:0.32;
var grey=night?mixc([30,34,48],[12,14,22],dark):w==='snow'?[218,222,230]:mixc([200,204,210],[92,98,110],dark);
o.skyTop=mixc(L.skyTop,grey,night?0.55:0.62+0.25*dark);o.skyHor=mixc(L.skyHor,mixc(grey,night?[50,56,76]:[232,232,230],0.35),night?0.45:0.68);
o.haze=mixc(L.haze,mixc(grey,night?[44,50,70]:[222,224,226],0.45),0.55);
o.sunc=scl(L.sunc,w==='cloudy'?0.5:w==='snow'?0.45:0.32-0.08*dark);
o.amb=scl(L.amb,w==='cloudy'?1.16:w==='snow'?1.14:1.1-0.14*dark);
o.shadowA=L.shadowA*(w==='cloudy'?0.45:w==='snow'?0.4:0.2);
o.sunGlow='rgba(255,250,240,'+(w==='cloudy'?0.22:0.06)+')';
o.wash=['rgba(232,236,242,0.16)','rgba(220,224,232,0.04)'];
o.bloom=L.bloom*(w==='cloudy'?0.75:0.55);o.mist=L.mist+(w==='cloudy'?0.1:0.32);o.hazeK=L.hazeK*(1+0.45*dark);
if(w==='rain'||w==='storm')o.grade=(L.grade||[[255,255,255],[255,255,255],[255,255,255]]).map(function(c){return mulc(c,w==='storm'?[0.74,0.77,0.84]:[0.86,0.89,0.93]);});
o.foliageTint=w==='rain'||w==='storm'?mulc(L.foliageTint||[1,1,1],[0.84,0.9,0.92]):L.foliageTint||null;
o.overcast=w==='cloudy'?0.62:w==='snow'?0.85:1;o.dark=dark;
}
if(w==='typhoon'){
var tg=night?[20,26,26]:[112,124,116];
o.skyTop=mixc(L.skyTop,scl(tg,0.72),0.85);o.skyHor=mixc(L.skyHor,tg,0.8);o.haze=mixc(L.haze,scl(tg,1.15),0.75);
o.sunc=scl(L.sunc,0.18);o.amb=mulc(L.amb,[0.92,1.0,0.96]);o.shadowA=L.shadowA*0.12;o.mist=L.mist+0.45;o.hazeK=L.hazeK*1.9;
o.grade=(L.grade||[[255,255,255],[255,255,255],[255,255,255]]).map(function(c){return mulc(c,[0.7,0.78,0.74]);});
o.foliageTint=[0.8,0.9,0.84];o.lit=false;o.dark=1.1;o.bend=1;o.puddles=1.7;
}
if(w==='blizzard'){
var wg=night?[70,78,100]:[232,234,240];
o.skyTop=mixc(L.skyTop,wg,0.85);o.skyHor=mixc(L.skyHor,wg,0.9);o.haze=mixc(L.haze,wg,0.85);o.hazeK=L.hazeK*2.2;
o.sunc=scl(L.sunc,0.3);o.amb=scl(L.amb,1.12);o.shadowA=L.shadowA*0.15;o.mist=L.mist+0.5;o.bloom=L.bloom*0.6;
o.fog=night?[64,72,96]:L.id==='dusk'?[214,204,214]:[236,238,244];o.glowK=0.45;o.bend=0.35;o.dark=0.2;
}
if(after)o.bloom=(o.bloom||L.bloom)+0.05;
WLIGHT[key]=o;return o;
}
function paintOvercast(ctx,yo,cols,A,rng,sgn){
var oc=LIT.overcast;
var g=ctx.createLinearGradient(0,0,0,yo+60);g.addColorStop(0,cols.mid);g.addColorStop(1,cols.lit);ctx.globalAlpha=0.6*oc;ctx.fillStyle=g;ctx.fillRect(0,0,W,yo+60);ctx.globalAlpha=1;
var top=Math.min(0,yo-40),span=yo+36-top,i,k;
var g2=ctx.createLinearGradient(0,top,0,yo+40);g2.addColorStop(0,cols.arr[0]);g2.addColorStop(0.6,cols.arr[1]);g2.addColorStop(1,'rgba(0,0,0,0)');
ctx.globalAlpha=0.26*oc;ctx.fillStyle=g2;ctx.fillRect(0,top,W,yo+40-top);
var n=Math.round((10+10*oc)*Math.sqrt(Math.max(1,span/80)));
for(i=0;i<n;i++){
var hy=rng(),cx=rng()*W*1.2-0.1*W,cy=yo+24-hy*span,gro=1+hy*span/90,w=(50+rng()*220)*gro,h=(5+rng()*10)*gro,tl=(rng()-0.5)*0.18,dark=rng()<0.55,np=3+((rng()*4)|0);
for(k=0;k<np;k++){
var px=cx+(rng()-0.5)*w*0.9,py=cy+(rng()-0.5)*h*1.3+(px-cx)*tl,pw=w*(0.16+rng()*0.3),ph=h*(0.45+rng()*0.8);
var gr=ctx.createRadialGradient(px,py,0,px,py,pw);gr.addColorStop(0,dark?cols.arr[0]:cols.arr[2]);gr.addColorStop(1,'rgba(0,0,0,0)');
ctx.save();ctx.translate(px,py);ctx.rotate(tl+(rng()-0.5)*0.1);ctx.scale(1,ph/pw);ctx.translate(-px,-py);ctx.globalAlpha=(dark?0.11:0.13)*oc*(1-0.3*hy);ctx.fillStyle=gr;ctx.fillRect(px-pw,py-pw,pw*2,pw*2);ctx.restore();
}
}
for(i=0;i<6+6*oc;i++){
var sx=rng()*W,sy=yo+16+rng()*20,sw=14+rng()*34,sh=1.6+rng()*2.6;
for(k=0;k<3;k++){var qx=sx+(rng()-0.5)*sw,qy=sy+(rng()-0.5)*sh*1.5,qw=sw*(0.25+rng()*0.3),gq=ctx.createRadialGradient(qx,qy,0,qx,qy,qw);gq.addColorStop(0,cols.arr[0]);gq.addColorStop(1,'rgba(0,0,0,0)');ctx.save();ctx.translate(qx,qy);ctx.scale(1,sh/qw);ctx.translate(-qx,-qy);ctx.globalAlpha=0.15*oc;ctx.fillStyle=gq;ctx.fillRect(qx-qw,qy-qw,qw*2,qw*2);ctx.restore();}
}
var hz2=ctx.createLinearGradient(0,yo,0,yo+60);hz2.addColorStop(0,'rgba(0,0,0,0)');hz2.addColorStop(0.55,cols.lit);hz2.addColorStop(1,cols.lit);
ctx.globalAlpha=0.3*oc;ctx.fillStyle=hz2;ctx.fillRect(0,yo,W,60);
ctx.globalAlpha=1;
}
function paintRainVeil(ctx,yo){
if(!(LIT.wet>0.6)||LIT.after)return;
if(LIT.weather==='typhoon'){
var tr=mulberry32(78),tc2=mixc(LIT.haze,[255,255,255],0.25);
for(var j=0;j<9;j++){
var tx=tr()*W,tw=30+tr()*60,ts=40*BENDS,gq=ctx.createRadialGradient(0,0,0,0,0,1);gq.addColorStop(0,rgb(tc2,0.2));gq.addColorStop(0.55,rgb(tc2,0.13));gq.addColorStop(1,rgb(tc2,0));
ctx.save();ctx.translate(tx+tw/2-ts/2,yo+45);ctx.transform(1,0,-ts/90,1,0,0);ctx.scale(tw*0.62,52);ctx.fillStyle=gq;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
}
var rng=mulberry32(77),c=mixc(LIT.haze,[255,255,255],0.2);
for(var i=0;i<7;i++){
var x=rng()*W,w=20+rng()*50,sl=8+rng()*10,g=ctx.createLinearGradient(0,yo+4,0,yo+80);
g.addColorStop(0,rgb(c,0));g.addColorStop(0.35,rgb(c,0.16+0.1*LIT.dark));g.addColorStop(1,rgb(c,0.05));
if(true){
var gs=ctx.createRadialGradient(0,0,0,0,0,1);gs.addColorStop(0,rgb(c,0.15+0.08*LIT.dark));gs.addColorStop(0.6,rgb(c,0.08));gs.addColorStop(1,rgb(c,0));
ctx.save();ctx.translate(x+w/2-sl*0.4,yo+34);ctx.transform(1,0,-sl/76,1,0,0);ctx.scale(w*0.65,46);ctx.fillStyle=gs;ctx.fillRect(-1,-1,2,2);ctx.restore();continue;
}
ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,yo+4);ctx.lineTo(x+w,yo+4);ctx.lineTo(x+w-sl,yo+80);ctx.lineTo(x-sl,yo+80);ctx.closePath();ctx.fill();
}
}
function makeWeatherFx(g,rng){
var L=g.LIT,w=L.weather||'clear',S={w:w,after:!!L.after,t:0},i;
if(w==='rain'||w==='storm'||w==='typhoon'){
var n=w==='rain'?520:720;S.drops=[];
for(i=0;i<n;i++)S.drops.push(newDrop(g,rng,true,w));
S.rip=[];S.spl=[];S.ripAcc=0;S.splAcc=0;
S.drips=g.wp.drips.map(function(p){return{p:p,per:0.6+rng()*1.2,ph:rng()};});
if(w==='storm')S.nextBolt=5+rng()*12;
}
if(S.after)S.sparks=g.wp.sparks.map(function(p){return{p:p,ph:rng()*TAU,w:0.6+rng()*1.6};});
return S;
}
function stepWeatherFx(S,g,dt,t,rng,cue){
var Wd=g.wind||windVec({dir:0,strength:0.5}),i;
S.t+=dt;
if(S.drops){
var slant=rainSlant(Wd,S.w);
S.slant=slant;stepRain(S.drops,g,dt,rng,S.w,slant);
S.ripAcc+=dt*(S.w==='storm'?120:72);
while(S.ripAcc>1){S.ripAcc--;var RP=g.rainPts&&g.rainPts.length?g.rainPts:g.ripplePts;if(RP&&RP.length){var rp=RP[(rng()*RP.length)|0];S.rip.push({x:rp[0]+(rng()-0.5)*0.12,z:rp[1]+(rng()-0.5)*0.12,t0:S.t,L:0.55+rng()*0.35});}}
S.splAcc+=dt*(S.w==='storm'?26:15);
while(S.splAcc>1){S.splAcc--;if(g.wp.stones.length){var s=g.wp.stones[(rng()*g.wp.stones.length)|0];S.spl.push({x:s[0]+(rng()-0.5)*s[3]*1.4,y:s[1],z:s[2]+(rng()-0.5)*s[3]*0.8,t0:S.t});}}
S.rip=S.rip.filter(function(r){return S.t-r.t0<r.L;});if(S.rip.length>170)S.rip.splice(0,S.rip.length-170);
S.spl=S.spl.filter(function(r){return S.t-r.t0<0.22;});
}
if(S.w==='storm'){
if(!S.bolt&&S.t>S.nextBolt){
S.bolt={t0:S.t,bolt:makeBolt(g,rng)};
cue('thunder',{delay:Math.round((1+rng()*3)*100)/100});
S.nextBolt=S.t+20+rng()*40;
}
if(S.bolt&&lightningLevel(S.bolt,S.t)<0)S.bolt=null;
}
}
function drawWeatherFx(ctx,S,g){
var tint=g.tint,night=g.LIT.id==='night',i;
if(S.sparks){
var spr=sprite('spark');ctx.globalCompositeOperation='lighter';
for(i=0;i<S.sparks.length;i++){var q=S.sparks[i],s=Math.sin(S.t*q.w+q.ph),a=s>0.6?(s-0.6)/0.4:0;if(a<=0)continue;var p=P(q.p[0],q.p[1],q.p[2]);stamp(ctx,spr,p.x,p.y,1.1+p.k*0.02,0,a*(night?0.4:0.7));}
ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
}
if(!S.drops)return;
var rc=night?[150,166,204]:mixc(g.LIT.skyHor,[240,244,250],0.7),sl=S.slant||0;
ctx.strokeStyle=rgb(mulc(rc,[1,1,1]),0.6);ctx.lineWidth=0.45;ctx.lineCap='round';
for(i=0;i<S.drips.length;i++){
var dr=S.drips[i],u=((S.t/dr.per+dr.ph)%1)*dr.per,y0=dr.p[1],fall=Math.sqrt(2*y0/9.8);
if(u<fall){var yy=y0-4.9*u*u,a1=P(dr.p[0],yy+0.05,dr.p[2]),b1=P(dr.p[0],yy,dr.p[2]);ctx.beginPath();ctx.moveTo(a1.x,a1.y);ctx.lineTo(b1.x,b1.y+0.4);ctx.stroke();}
else if(u<fall+0.2){var e=(u-fall)/0.2,c=P(dr.p[0],0,dr.p[2]);ctx.globalAlpha=1-e;ctx.beginPath();ctx.ellipse(c.x,c.y,(0.02+e*0.06)*c.k,(0.02+e*0.06)*c.k*0.35,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
}
ctx.lineWidth=0.4;
for(i=0;i<S.spl.length;i++){
var sp=S.spl[i],e2=(S.t-sp.t0)/0.22,c2=P(sp.x,sp.y,sp.z),h=0.05*c2.k*Math.sin(e2*Math.PI),w2=0.04*c2.k*e2;
ctx.strokeStyle=rgb(rc,0.55*(1-e2));ctx.beginPath();ctx.moveTo(c2.x-w2,c2.y-h);ctx.lineTo(c2.x-w2*0.3,c2.y);ctx.moveTo(c2.x+w2,c2.y-h);ctx.lineTo(c2.x+w2*0.3,c2.y);ctx.moveTo(c2.x,c2.y-h*1.2);ctx.lineTo(c2.x,c2.y);ctx.stroke();
}
drawRain(ctx,S.drops,g,sl,night,1);
}
function drawRainRipples(ctx,S,g){
if(!S||!S.rip||!S.rip.length)return;
var night=g.LIT.id==='night',rc=night?[170,186,230]:[236,242,248];
ctx.lineWidth=0.45;
for(var i=0;i<S.rip.length;i++){
var r=S.rip[i],e=(S.t-r.t0)/r.L,c=P(r.x,WL,r.z),rw=0.012+Math.sqrt(e)*0.16,rr=rw*c.k;
var sq=clamp(Math.abs(P(r.x,WL,r.z+rw).y-P(r.x,WL,r.z-rw).y)/(2*rr||1)*0.78,0.1,0.6),fa=(1-e)*(0.4+1.2*sq);
ctx.lineWidth=0.45*(0.6+0.6*sq);
if(e<0.14){ctx.fillStyle=rgb(rc,0.7*(1-e/0.14)*(0.5+0.5*sq));ctx.beginPath();ctx.arc(c.x,c.y-0.006*c.k*(1-e/0.14),Math.max(0.35,0.006*c.k),0,TAU);ctx.fill();}
ctx.strokeStyle=rgb(rc,Math.min(0.8,0.7*fa));ctx.beginPath();ctx.ellipse(c.x,c.y,rr,rr*sq,0,0,TAU);ctx.stroke();
if(e>0.25){var r2=rr*0.55;ctx.strokeStyle=rgb(rc,Math.min(0.4,0.3*fa));ctx.beginPath();ctx.ellipse(c.x,c.y,r2,r2*sq,0,0,TAU);ctx.stroke();}
}
}
function paintFog(ctx,bw,bh){
if(!LIT.fog)return;
var yo=hYo(),fb=P(0,0,LAY.fenceZ).y,g=ctx.createLinearGradient(0,0,0,bh);
function st(ly){return clamp((ly)/H);}
g.addColorStop(0,rgb(LIT.fog,0.75));g.addColorStop(st(fb),rgb(LIT.fog,0.62));g.addColorStop(st(fb+70),rgb(LIT.fog,0.3));g.addColorStop(1,rgb(LIT.fog,0.1));
ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=g;ctx.fillRect(0,0,bw,bh);ctx.restore();
}
function makeGaleFx(S,g,rng){
var i;
S.gale=true;S.nextGust=2+rng()*4;S.gustK=0;
if(S.w==='typhoon'){
S.scud=[];for(i=0;i<9;i++)S.scud.push({x:rng()*(g.W+200)-100,y:4+rng()*(g.horizonY-20),w:50+rng()*80,h:6+rng()*9,sp:0.6+rng()*0.8,a:0.25+rng()*0.3});
S.sheets=[];for(i=0;i<4;i++)S.sheets.push({x:rng()*g.W,w:40+rng()*70,sp:0.8+rng()*0.5,a:0.06+rng()*0.06});
S.spray=[];for(i=0;i<5;i++)S.spray.push({x:rng()*g.W,y:g.horizonY+20+rng()*(g.H-g.horizonY-40),w:70+rng()*80,sp:0.9+rng()*0.6,a:0.1+rng()*0.1});
S.debris=[];for(i=0;i<26;i++)S.debris.push(newDebris(g,rng,true));
S.caps=g.ripplePts?g.ripplePts.slice(0,40):[];
S.nextBolt=20+rng()*40;
}else{
makePowder(S,g,rng);
}
}
function newDebris(g,rng,anywhere){
var sd=(g.wind||{side:1}).side,sum=g.season==='summer',aut=g.season==='autumn';
var cols=aut?[[176,52,28],[214,120,40],[200,170,60],[80,110,50]]:sum?[[60,100,40],[90,130,50],[120,150,60]]:[[110,120,70],[140,120,80]];
return{x:anywhere?rng()*g.W:(sd>0?-20-rng()*60:g.W+20+rng()*60),y:g.horizonY-30+rng()*(g.H-g.horizonY+10),sp:0.8+rng()*0.7,rot:rng()*TAU,rs:(rng()-0.5)*14,ph:rng()*TAU,twig:rng()<0.25,sz:0.9+rng()*1.2,col:cols[(rng()*cols.length)|0]};
}
function stepGaleFx(S,g,dt,rng,cue){
var Wd=g.wind||windVec({dir:0,strength:1}),sd=Wd.side,i,v=(S.w==='typhoon'?120:80)*(0.7+0.5*Wd.s);
if(!S.flakes){
if(S.t>S.nextGust){S.gustT=S.t;cue('gust');S.nextGust=S.t+4+rng()*6;}
S.gustK=S.gustT!==undefined?Math.max(0,1-Math.abs(S.t-S.gustT-1.2)/1.6):0;
}else S.gustK=galeBurstAt(S,S.t);
var vv=v*(1+0.8*S.gustK);
if(S.scud){
S.scud.forEach(function(c){c.x+=sd*vv*0.5*c.sp*dt;if(sd>0&&c.x-c.w>g.W)c.x=-c.w;if(sd<0&&c.x+c.w<0)c.x=g.W+c.w;});
S.sheets.forEach(function(c){c.x+=sd*vv*1.6*c.sp*dt;if(sd>0&&c.x>g.W+c.w+60)c.x=-c.w-60;if(sd<0&&c.x<-c.w-60)c.x=g.W+c.w+60;});
S.spray.forEach(function(c){c.x+=sd*vv*1.2*c.sp*dt;if(sd>0&&c.x-c.w>g.W)c.x=-c.w;if(sd<0&&c.x+c.w<0)c.x=g.W+c.w;});
for(i=0;i<S.debris.length;i++){var d=S.debris[i];d.x+=sd*vv*1.4*d.sp*dt;d.y+=Math.sin(S.t*3+d.ph)*14*dt+6*dt;d.rot+=d.rs*dt;if(d.x<-40||d.x>g.W+40||d.y>g.H+10)S.debris[i]=newDebris(g,rng,false);}
if(S.t>S.nextBolt){S.bolt={t0:S.t,bolt:makeBolt(g,rng)};cue('thunder',{delay:Math.round((1.5+rng()*2.5)*100)/100});S.nextBolt=S.t+40+rng()*50;}
if(S.bolt&&lightningLevel(S.bolt,S.t)<0)S.bolt=null;
}
if(S.flakes)stepPowder(S,g,dt,rng,cue,vv/(1+0.8*S.gustK));
}
function drawGaleSky(sky,S,g){
if(!S.scud)return;
var spr=tintedSprite(g.LIT.id==='night'?[14,18,20]:[70,78,76]);
S.scud.forEach(function(c){stamp(sky,spr,c.x,c.y,c.w,c.h,c.a*1.6);});sky.globalAlpha=1;
}
function drawGaleFx(ctx,S,g){
var night=g.LIT.id==='night',sd=(g.wind||{side:1}).side,i;
if(S.sheets){
var rc=night?[120,134,150]:[214,222,226];
S.sheets.forEach(function(c){
var gr=ctx.createLinearGradient(c.x-c.w,0,c.x+c.w,0),a2=c.a*(1+S.gustK);gr.addColorStop(0,rgb(rc,0));gr.addColorStop(0.3,rgb(rc,a2*0.6));gr.addColorStop(0.5,rgb(rc,a2));gr.addColorStop(0.7,rgb(rc,a2*0.6));gr.addColorStop(1,rgb(rc,0));
ctx.save();ctx.transform(1,0,sd*40/g.H,1,0,0);ctx.fillStyle=gr;ctx.fillRect(c.x-c.w,0,c.w*2,g.H);ctx.restore();});
var ms=tintedSprite(night?[90,100,116]:[230,234,236]);
S.spray.forEach(function(c){stamp(ctx,ms,c.x,c.y,c.w,10,c.a*(1+S.gustK));});ctx.globalAlpha=1;
for(i=0;i<S.debris.length;i++){var d=S.debris[i];ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);ctx.scale(1,0.3+0.7*Math.abs(Math.sin(d.rot*0.7)));if(d.twig){ctx.strokeStyle=rgb(mulc([90,70,52],g.tint));ctx.lineWidth=0.45;ctx.beginPath();ctx.moveTo(-d.sz*1.4,0);ctx.lineTo(d.sz*1.4,0);ctx.moveTo(0,0);ctx.lineTo(d.sz*0.6,-d.sz*0.6);ctx.stroke();}else{ctx.fillStyle=rgb(mulc(d.col,g.tint));ctx.beginPath();ctx.ellipse(0,0,d.sz,d.sz*0.5,0,0,TAU);ctx.fill();}ctx.restore();}
}
if(S.flakes)drawPowder(ctx,S,g);
}
function drawWhitecaps(ctx,S,g){
if(!S||!S.caps||!S.caps.length)return;
var sd=(g.wind||{side:1}).side;
ctx.strokeStyle='rgba(236,242,240,0.5)';ctx.lineWidth=0.45;ctx.lineCap='round';
S.caps.forEach(function(q,i){var c=P(q[0],WL,q[1]),ph=(S.t*1.7+i*0.37)%1,l=0.18*c.k;ctx.globalAlpha=Math.sin(ph*Math.PI)*(0.5+0.5*S.gustK);ctx.beginPath();ctx.moveTo(c.x+sd*(ph*0.3-0.15)*c.k,c.y);ctx.lineTo(c.x+sd*(ph*0.3-0.15)*c.k-sd*l,c.y+0.2);ctx.stroke();});
ctx.globalAlpha=1;ctx.lineCap='butt';
}
function galeBurstAt(S,t){
if(!S||S.burstT===undefined)return 0;
var u=t-S.burstT;if(u<0||u>S.burstDur)return 0;
if(u<1)return sstep(0,1,u);
var e0=S.burstDur-S.burstEase;return u<e0?1:1-sstep(0,1,(u-e0)/S.burstEase);
}
function powderDot(col){
var k='pd'+col.join(',');if(SPR[k])return SPR[k];
var N=24,c=mkCanvas(N,N),x=c.getContext('2d'),gr=x.createRadialGradient(N/2,N/2,0,N/2,N/2,N/2);
gr.addColorStop(0,rgb(col,1));gr.addColorStop(0.35,rgb(col,0.75));gr.addColorStop(0.7,rgb(col,0.22));gr.addColorStop(1,rgb(col,0));
x.fillStyle=gr;x.fillRect(0,0,N,N);SPR[k]=c;return c;
}
function powderTex(i,col){
var k='pv'+i+col.join(',');if(SPR[k])return SPR[k];
var w=192,h=72,c=mkCanvas(w,h),x=c.getContext('2d'),im=x.createImageData(w,h),d=im.data;
for(var y=0;y<h;y++)for(var q=0;q<w;q++){
var dx=(q-w/2)/(w/2),dy=(y-h/2)/(h/2),e=sstep(0,0.75,1-(dx*dx+dy*dy));
var n=NZ.fbm(q*0.028+i*17.3,y*0.085+i*5.1,4),a=e*sstep(0.32,0.78,n),o=(y*w+q)*4;
d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=Math.round(255*a);
}
x.putImageData(im,0,0);SPR[k]=c;return c;
}
function powderTile(layer,col,sc){
var T=Math.max(64,Math.round(150*sc)),k='pt'+layer+col.join(',')+T;if(SPR[k])return SPR[k];
var c=mkCanvas(T,T),x=c.getContext('2d'),r=mulberry32(4100+layer*77),dot=powderDot(col);
for(var i=0;i<610;i++){
var mid=i>=460,px=r()*T,py=r()*T,rad=(mid?0.45+r()*0.5:0.24+r()*0.3)*sc,a=mid?0.45+r()*0.45:0.3+r()*0.45;
x.globalAlpha=a;
for(var ox=-1;ox<=1;ox++)for(var oy=-1;oy<=1;oy++){var qx=px+ox*T,qy=py+oy*T;if(qx>-rad&&qx<T+rad&&qy>-rad&&qy<T+rad)x.drawImage(dot,qx-rad,qy-rad,rad*2,rad*2);}
}
SPR[k]={c:c,T:T};return SPR[k];
}
function newGrain(g,rng,x,y){
var d=Math.pow(rng(),1.3);
return{x:x,y:y,d:d,sp:0.75+rng()*0.5,ph:rng()*TAU,r:(0.32+d*1.15)*(0.7+rng()*0.6),a:(0.3+0.6*rng())*(0.45+0.55*d)};
}
function makePowder(S,g,rng){
var n=Math.round(g.W*g.H/1000*3.4),extra=Math.round(n*1.1),i;
S.flakes=[];for(i=0;i<n+extra;i++)S.flakes.push(newGrain(g,rng,rng()*(g.W+40)-20,rng()*(g.H+20)-10));
S.nBase=n;
S.lay=[{x:0,y:0,k:0.55,f:9}];
S.veils=[];for(i=0;i<6;i++)S.veils.push({x:rng()*(g.W+300)-150,y:g.H*(0.08+0.88*Math.pow(rng(),0.7)),w:130+rng()*160,h:30+rng()*60,sp:0.9+rng()*0.6,a:0.12+rng()*0.14,tex:i%3,ph:rng()*TAU});
S.drifts=[];S.driftAcc=0;S.nextBurst=6+rng()*8;S.burstT=-99;S.burstDur=0;S.burstEase=2.6;
}
function stepPowder(S,g,dt,rng,cue,v){
var Wd=g.wind||{side:1,s:1},sd=Wd.side,t=S.t,i,W2=g.W,H2=g.H;
if(t>S.nextBurst){S.burstT=t;S.burstEase=2.2+rng()*1.2;S.burstDur=1+1.2+rng()*1.8+S.burstEase;S.nextBurst=t+8+rng()*17;cue('gust');}
var bk=galeBurstAt(S,t),V=v*(1+1.5*bk);
for(i=0;i<S.flakes.length;i++){
var f=S.flakes[i],base=V*(0.35+1.25*f.d)*f.sp;
var sw=Math.sin(f.y*0.045+t*1.3+Math.sin(f.x*0.021-sd*t*0.8+f.ph*0.3));
var lift=Math.sin(f.x*0.032-sd*t*2.1+f.ph)*Math.cos(f.y*0.038+t*0.7);
f.x+=sd*base*(1+0.45*sw)*dt;
f.y+=((9+16*f.d)+(12+22*f.d)*(1+bk)*lift)*dt;
if(f.x>W2+22||f.x<-22)S.flakes[i]=newGrain(g,rng,sd>0?-20:W2+20,rng()*(H2+20)-10);
else if(f.y>H2+10)S.flakes[i]=newGrain(g,rng,rng()*(W2+40)-20,-8);
else if(f.y<-14)S.flakes[i]=newGrain(g,rng,rng()*(W2+40)-20,H2+6);
}
S.lay.forEach(function(L2,j){L2.x+=sd*V*L2.k*dt;L2.y+=(L2.f+10*(1+bk)*Math.sin(t*(0.7+0.3*j)+j*2))*dt;});
S.veils.forEach(function(c){c.x+=sd*V*0.85*c.sp*dt;c.y+=Math.sin(t*0.4+c.ph)*4*dt;if(sd>0&&c.x-c.w/2>W2)c.x=-c.w/2;if(sd<0&&c.x+c.w/2<0)c.x=W2+c.w/2;});
S.driftAcc+=dt*(1.4+4.5*bk);
while(S.driftAcc>=1&&S.drifts.length<26){
S.driftAcc-=1;var r=rng(),x,y,tops=g.swayTops;
if(r<0.45){x=rng()*W2;y=g.horizonY+8+rng()*(H2-g.horizonY-8);}
else if(r<0.72||!tops||!tops.length){x=rng()*W2;y=g.horizonY-3-rng()*14;}
else{var tp=tops[(rng()*tops.length)|0];x=tp.x+(rng()-0.5)*tp.w;y=tp.y+4+rng()*10;}
S.drifts.push({x:x,y:y,t0:t,life:1.6+rng()*2,w0:6+rng()*8,w1:36+rng()*50,vx:sd*V*(0.45+0.4*rng()),vy:-(9+rng()*18),a:0.14+rng()*0.16,tex:(rng()*3)|0});
}
if(S.driftAcc>1)S.driftAcc=1;
for(i=S.drifts.length-1;i>=0;i--){var p=S.drifts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy*=0.985;if(t-p.t0>p.life)S.drifts.splice(i,1);}
}
function drawPowder(ctx,S,g){
var L=g.LIT,night=L.id==='night',dusk=L.id==='dusk',col=night?[178,190,222]:dusk?[240,232,236]:[248,250,255],t=S.t,i;
var bk=galeBurstAt(S,t),nk=night?0.75:1,sd=(g.wind||{side:1}).side;
S.veils.forEach(function(c){ctx.globalAlpha=Math.min(1,c.a*(1+1.3*bk)*nk);ctx.drawImage(powderTex(c.tex,col),c.x-c.w/2,c.y-c.h/2,c.w,c.h);});
S.drifts.forEach(function(p){
var u=(t-p.t0)/p.life;if(u<0||u>1)return;var w=lerp(p.w0,p.w1,Math.pow(u,0.7)),h=w*0.4;
ctx.globalAlpha=p.a*Math.sin(Math.PI*Math.pow(u,0.6))*nk;ctx.drawImage(powderTex(p.tex,col),p.x-w*(0.5+0.2*sd),p.y-h*0.6,w,h);
});
var dsc=ctx.canvas.width/g.W;
ctx.save();ctx.setTransform(1,0,0,1,0,0);
S.lay.forEach(function(L2,j){
var tl=powderTile(j,col,dsc),T=tl.c.width,stx=1+0.45*bk,ox=Math.round(((L2.x*dsc/stx)%T+T)%T),oy=Math.round(((L2.y*dsc)%T+T)%T);
if(!tl.pat)tl.pat=ctx.createPattern(tl.c,'repeat');
ctx.globalAlpha=Math.min(1,0.8*(1+0.5*bk)*nk);
if(stx<1.01)stx=1;ctx.setTransform(stx,0,0,1,ox*stx,oy);ctx.fillStyle=tl.pat;ctx.fillRect(-ox,-oy,ctx.canvas.width/stx+T,ctx.canvas.height+T);
});
ctx.restore();
var spr=powderDot(col),n=Math.min(S.flakes.length,S.nBase+Math.round((S.flakes.length-S.nBase)*bk)),sm=0.6+1.6*bk;
for(i=0;i<n;i++){
var f=S.flakes[i],dw=f.r*2*(1+f.d*sm),dh=f.r*2;
ctx.globalAlpha=f.a*nk;ctx.drawImage(spr,f.x-dw*0.5,f.y-dh*0.5,dw,dh);
}
if(bk>0.01){
var fog=night?[120,130,160]:dusk?[226,220,226]:[240,242,246],u2=clamp((t-S.burstT)/S.burstDur),cx=sd>0?lerp(-0.7,1.7,u2)*g.W:lerp(1.7,-0.7,u2)*g.W;
ctx.globalAlpha=0.2*bk;ctx.fillStyle=rgb(fog);ctx.fillRect(0,0,g.W,g.H);
var tx=powderTex(0,col);
ctx.globalAlpha=0.7*bk*nk;ctx.drawImage(tx,cx-g.W*0.8,-g.H*0.25,g.W*1.6,g.H*1.5);
}
ctx.globalAlpha=1;
}
var LIGHTS=lightsFor('garden');
function moonLayer(gc,obj){
var M=MOONP,g0=GLOWS.length,sk=SKYM;
return moonCrisp(gc,obj,M,KS,function(kx){SKYM=null;MOONKEY=true;try{paintBackdrop(kx);}finally{MOONKEY=false;SKYM=sk;GLOWS.length=g0;MOONP=M;}});
}
function drawBoltSky(sky,S){if(S&&S.bolt)drawLightning(sky,null,S.bolt,S.t);}
function drawFlash(ctx,S,g){if(S&&S.bolt)drawLightningFlash(ctx,g,S.bolt,S.t);}
function paintRainbowG(ctx,yo){if(LIT.after&&SEA.id==='summer'&&LIT.id==='day')paintRainbow(ctx,W,LIT,yo+150,132,0.24);}
return{pull:pull,fn:{drawBoltSky:drawBoltSky,drawFlash:drawFlash,drawGaleFx:drawGaleFx,drawGaleSky:drawGaleSky,drawRainRipples:drawRainRipples,drawWeatherFx:drawWeatherFx,drawWhitecaps:drawWhitecaps,galeBurstAt:galeBurstAt,makeGaleFx:makeGaleFx,makeWeatherFx:makeWeatherFx,moonLayer:moonLayer,moonSpot:moonSpot,paintBackdrop:paintBackdrop,paintFog:paintFog,stepGaleFx:stepGaleFx,stepWeatherFx:stepWeatherFx,weatherInfo:weatherInfo,weatherLight:weatherLight,windVec:windVec},pure:{drawBoltSky:1,drawFlash:1,galeBurstAt:1,makeGaleFx:1,makeWeatherFx:1,stepGaleFx:1,stepWeatherFx:1,weatherInfo:1,weatherLight:1,windVec:1},val:{LIGHTS:LIGHTS,WEATHERS:WEATHERS},mut:{MOONCUT:function(v){if(arguments.length)MOONCUT=v;return MOONCUT;},MOONP:function(v){if(arguments.length)MOONP=v;return MOONP;}}};
};
WORLD.town=function(host){
var AQ,BF,CAM,DQ,F,GLOWS,GROUND_FAR,H,KS,LIT,MODE,P,SEA,SEASONS,W,WIND_LEAN,boxWalls,fwAvoid,fwLaunchPts,fwSkyFloor,gWind,groundAt,hillClear,hillH,lightTint,skyBand,softBlur,sprite,stamp,tintedSprite,tmpCanvas,townPlan,waterAt;
function pull(){var s=host();AQ=s.AQ;BF=s.BF;CAM=s.CAM;DQ=s.DQ;F=s.F;GLOWS=s.GLOWS;GROUND_FAR=s.GROUND_FAR;H=s.H;KS=s.KS;LIT=s.LIT;MODE=s.MODE;P=s.P;SEA=s.SEA;SEASONS=s.SEASONS;W=s.W;WIND_LEAN=s.WIND_LEAN;boxWalls=s.boxWalls;fwAvoid=s.fwAvoid;fwLaunchPts=s.fwLaunchPts;fwSkyFloor=s.fwSkyFloor;gWind=s.gWind;groundAt=s.groundAt;hillClear=s.hillClear;hillH=s.hillH;lightTint=s.lightTint;skyBand=s.skyBand;softBlur=s.softBlur;sprite=s.sprite;stamp=s.stamp;tintedSprite=s.tintedSprite;tmpCanvas=s.tmpCanvas;townPlan=s.townPlan;waterAt=s.waterAt;}
var RANGE_PATH=null;
function paintBackdrop(ctx,noClouds){
var L=LIT,yo=skyBand(),night=L.name==='night',dusk=L.name==='dusk',i;
var top=mixc(L.skyTop,SEA.sky,night?0:0.25),hor=L.skyHor,yH=100+yo;
paintSkyGradient(ctx,top,hor,W,yH,yH+60);
var sx=W*L.sunX,sy=yo+100*L.sunY;
if(night){var mq=moonSpot(F.event==='tsukimi',true);sx=mq.x;sy=mq.y;}
paintSunGlow(ctx,L,sx,sy,240,W,yH+60);
if(dusk){
var eg=ctx.createLinearGradient(0,0,sx,0);eg.addColorStop(0,'rgba(128,126,178,0.42)');eg.addColorStop(0.45,'rgba(150,134,180,0.26)');eg.addColorStop(1,'rgba(170,140,170,0)');
ctx.fillStyle=eg;ctx.fillRect(0,0,W,yH+60);
}
var bigMoon=F.event==='tsukimi'&&(night||dusk);
var overcast=F.wx&&F.wx!=='clear';
var bkH=Math.max(18,yo*0.62),bkC=night?[6,8,20]:dusk?[34,40,92]:L.name==='morning'?[84,116,170]:[52,84,146],bkA=(night?0.55:0.78)*(overcast?(F.wx==='cloudy'?0.45:0.25):1);
if(overcast)bkC=mixc(bkC,[96,104,120],0.5);
var bkg=ctx.createLinearGradient(0,0,0,bkH);bkg.addColorStop(0,rgb(bkC,bkA));bkg.addColorStop(0.3,rgb(bkC,bkA*0.78));bkg.addColorStop(0.7,rgb(bkC,bkA*0.22));bkg.addColorStop(1,rgb(bkC,0));ctx.fillStyle=bkg;ctx.fillRect(0,0,W,bkH);
if(overcast)paintOvercast(ctx,yo,F.wx);
if(F.after&&SEA.name==='summer'&&L.name==='day')paintRainbow(ctx,W,L,yo+122,112,0.3);
if(night&&(!overcast||F.wx==='cloudy'))paintStars(ctx,W,yH);
if(dusk&&!overcast)paintDuskSun(ctx,sx,sy,7);
var smallMoon=night&&!bigMoon&&(!overcast||F.wx==='cloudy');
if(!noClouds){
var cl=tmpCanvas(Math.max(2,Math.round(ctx.canvas.width/2)),Math.max(2,Math.round(ctx.canvas.height/2))),clx=cl.getContext('2d'),ks=cl.width/W;
clx.setTransform(ks,0,0,ks,0,0);paintClouds(clx,yo,night,dusk);
ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingQuality='high';ctx.drawImage(softBlur(cl,Math.max(1,ks*0.6)),0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();
}
paintRanges(ctx,yo,bigMoon,night,smallMoon);
}
function moonLook(bigMoon,night){
if(!bigMoon)return{warmth:0.05,haze:0.2,alt:0.9,tilt:0.1,glow:false};
return night?{warmth:0.1,haze:0.3,alt:0.85,tilt:0.12}:{warmth:0.95,haze:0.8,alt:0.05,tilt:0.5,hazeCol:LIT.haze,bright:1.02};
}
var MOONP=null,MOONKEY=false;
function drawMoonAt(ctx,bigMoon,night){
var ms0=moonSpot(bigMoon,night),mx=ms0.x,my=ms0.y,mr=ms0.r,mo=moonLook(bigMoon,night);
if(MOONKEY){ctx.fillStyle='rgb(255,0,255)';ctx.beginPath();ctx.ellipse(mx,my,mr+0.3,(mr+0.3)*(1-0.045*(1-mo.alt)),0,0,TAU);ctx.fill();return;}
if(!bigMoon){var mg=ctx.createRadialGradient(mx,my,mr*0.5,mx,my,mr*6);mg.addColorStop(0,'rgba(220,230,255,0.38)');mg.addColorStop(1,'rgba(200,215,255,0)');ctx.fillStyle=mg;ctx.fillRect(mx-mr*6,my-mr*6,mr*12,mr*12);}
paintFullMoon(ctx,mx,my,mr,mo);
if(MODE==='n')MOONP={x:mx,y:my,r:mr,o:mo};
}
function moonPos(){var big=F.event==='tsukimi'&&(LIT.name==='night'||LIT.name==='dusk'),m=moonSpot(big,LIT.name==='night');return{x:m.x,y:m.y};}
var MOON_SPOT=null;
function skyTopAt(sx,yo){
var n=NZ.fbm(sx*0.02+10,3.1,4),rdg=1-Math.abs(NZ.n2(sx*0.034+11,1.5)*2-1),y=yo+44-12*(n*1.5+rdg*0.18)+6.6;
for(var z=84;z<=126;z+=1.5){
var X=CAM.x,yy=0,d=1;
for(var it=0;it<3;it++){d=-(yy-CAM.y)*CAM.s+(z-CAM.z)*CAM.c;X=CAM.x+(sx-CAM.cx)*d/CAM.F;yy=hillH(X,z)+(hillClear(X,z)?0.3:3.4);}
var u=(yy-CAM.y)*CAM.c+(z-CAM.z)*CAM.s;y=Math.min(y,CAM.cy-CAM.F*u/d);
}
return y;
}
function moonSpot(big,night){
var key=[W,H,CAM.cy,CAM.F,CAM.x,big,night].join();
if(MOON_SPOT&&MOON_SPOT.key===key)return MOON_SPOT;
var W16=Math.min(W,H*16/9),o16=(W-W16)/2;
var yo=skyBand(),top=3,tx=o16+W16*(big?(night?0.4:0.33):0.42),best=null;
for(var sx=o16+W16*0.24;sx<=o16+W16*0.58;sx+=2){
var sk=Math.min(skyTopAt(sx-6,yo),skyTopAt(sx,yo),skyTopAt(sx+6,yo)),sc=sk-Math.abs(sx-tx)*0.12;
if(!best||sc>best.sc)best={sc:sc,x:sx,sk:sk};
}
var room=best.sk-top,r,y;
if(big&&!night){r=clamp(room/2.35,3.2,16.5);y=best.sk-1.1*r;}
else{
var want=big?12:6.2,lift=big?1.5:2.4;
r=clamp((room-2)/(2+lift),3,want);y=Math.max(top+r+1,best.sk-Math.max((1+lift)*r,room*(big?0.3:0.45)));
if(y+r>best.sk-1){r=clamp((room-1)/2,2.6,r);y=top+r+0.5;}
}
MOON_SPOT={key:key,x:best.x,y:y,r:r,sk:best.sk};
return MOON_SPOT;
}
function farRangeModel(ctx,pts,lcol,haze,Ly,yo,sunL,lt){
var r=mulberry32(611),n=pts.length,i,j,sp,x0=pts[0][0],x1=pts[n-1][0];
function ridgeY(x){var f=clamp((x-x0)/(x1-x0))*(n-1),a=Math.floor(f),b=Math.min(n-1,a+1);return lerp(pts[a][1],pts[b][1],f-a);}
var T0=ctx.getTransform(),cw=ctx.canvas.width,chh=ctx.canvas.height,SC=mkCanvas(cw,chh),sx=SC.getContext('2d'),MK=mkCanvas(cw,1),mkx=MK.getContext('2d'),real=ctx;
for(sp=0;sp<4;sp++){
sx.setTransform(1,0,0,1,0,0);sx.globalCompositeOperation='source-over';sx.clearRect(0,0,cw,chh);sx.setTransform(T0);ctx=sx;
var dy=5+sp*3.2+r()*2,amp=3+r()*3,fr=0.018+r()*0.02,ph=r()*10,path=new Path2D(),crest=[];
for(var x=x0;x<=x1;x+=3){var y=ridgeY(x)+dy+(NZ.n2(x*fr+ph,sp*3.7)-0.5)*amp*2-Math.abs(Math.sin(x*fr*2.3+ph))*amp*0.6;y=Math.max(y,ridgeY(x)+1.5);crest.push([x,y]);}
path.moveTo(x0,crest[0][1]+40);crest.forEach(function(q){path.lineTo(q[0],q[1]);});path.lineTo(x1,crest[crest.length-1][1]+40);path.closePath();
var top=Math.min.apply(null,crest.map(function(q){return q[1];})),lit=mixc(lcol,mulc([250,244,228],lt),0.42),shd=mixc(scl(lcol,0.78),[60,80,124],0.25);
var band=new Path2D();crest.forEach(function(q,qi){if(qi)band.lineTo(q[0],q[1]-0.2);else band.moveTo(q[0],q[1]-0.2);});for(j=crest.length-1;j>=0;j--)band.lineTo(crest[j][0],crest[j][1]-6);band.closePath();
var gs=ctx.createLinearGradient(0,top-6,0,top+1);gs.addColorStop(0,rgb(shd,0));gs.addColorStop(1,rgb(shd,0.3));ctx.fillStyle=gs;ctx.fill(band);
var g=ctx.createLinearGradient(0,top,0,top+12);g.addColorStop(0,rgb(lit,0.45));g.addColorStop(0.3,rgb(mixc(lit,lcol,0.5),0.24));g.addColorStop(1,rgb(lcol,0));ctx.fillStyle=g;ctx.fill(path);
for(j=1;j<crest.length-1;j++){var sl=(crest[j+1][1]-crest[j-1][1])*sunL,a=clamp(Math.abs(sl)/4)*0.12;if(a<0.01)continue;var gx=ctx.createLinearGradient(0,crest[j][1],0,crest[j][1]+7);gx.addColorStop(0,rgb(sl>0?shd:lit,a));gx.addColorStop(1,rgb(sl>0?shd:lit,0));ctx.fillStyle=gx;ctx.fillRect(crest[j][0]-1.6,crest[j][1],3.2,7);}
var mg=ctx.createLinearGradient(0,top+5,0,top+14);mg.addColorStop(0,rgb(haze,0));mg.addColorStop(1,rgb(haze,0.18*(LIT.hazeK||1)));ctx.fillStyle=mg;ctx.fill(path);
var im=mkx.createImageData(cw,1),dd=im.data;for(var px=0;px<cw;px++){var lx=(px-T0.e)/T0.a,v=sstep(0.42,0.62,NZ.fbm(lx*0.006+sp*5.3+2,sp*1.7,3));dd[px*4+3]=255*v;}mkx.putImageData(im,0,0);
sx.setTransform(1,0,0,1,0,0);sx.globalCompositeOperation='destination-in';sx.imageSmoothingEnabled=true;sx.drawImage(MK,0,0,cw,1,0,0,cw,chh);sx.globalCompositeOperation='source-over';
ctx=real;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(SC,0,0);ctx.restore();
}
SC.width=SC.height=0;MK.width=MK.height=0;
if(SEA.name==='spring'||SEA.name==='summer'){
var fc=mixc(mulc(SEA.name==='spring'?[96,126,96]:[70,104,88],lt),haze,0.55),cnt=Math.round(900*Math.min(2,DQ));
ctx.fillStyle=rgb(fc,0.1);ctx.beginPath();
for(i=0;i<cnt;i++){var xx=x0+r()*(x1-x0),ry=ridgeY(xx),yy=ry+3+Math.pow(r(),0.7)*26,rr=0.6+r()*0.8;ctx.moveTo(xx+rr,yy);ctx.ellipse(xx,yy,rr,rr*0.7,0,0,TAU);}
ctx.fill();
}
}
function rangeShade(ctx,pts,sunL,col,aMax){
var n=pts.length,i,j,k,S=new Float32Array(n),A=new Float32Array(n),y0=1e9,y1=-1e9,DEPTH=11,RS=0.5;
for(i=0;i<n;i++){S[i]=(pts[Math.min(n-1,i+1)][1]-pts[Math.max(0,i-1)][1])*sunL;y0=Math.min(y0,pts[i][1]);y1=Math.max(y1,pts[i][1]);}
var Wt=[1,2,3,4,3,2,1];
for(i=0;i<n;i++){var s=0,ws=0;for(k=-3;k<=3;k++){var ii=i+k;if(ii<0||ii>=n)continue;s+=S[ii]*Wt[k+3];ws+=Wt[k+3];}A[i]=sstep(0.04,0.5,s/ws);}
y0-=1;y1+=DEPTH+2;
var cw=n,ch=Math.max(2,Math.ceil((y1-y0)/RS)),c=mkCanvas(cw,ch),cx=c.getContext('2d'),im=cx.createImageData(cw,ch),D=im.data;
var rgbv=/(\d+)\D+(\d+)\D+(\d+)/.exec(col),cr=+rgbv[1],cg=+rgbv[2],cb=+rgbv[3];
for(i=0;i<cw;i++)for(j=0;j<ch;j++){
var y=y0+(j+0.5)*RS,t0=y-pts[i][1],sh=sunL*Math.max(0,t0)/6,fi=clamp(i+sh,0,n-1),i0=Math.floor(fi),f=fi-i0,i1=Math.min(n-1,i0+1);
var ridge=pts[i0][1]*(1-f)+pts[i1][1]*f,t=y-ridge,a=(A[i0]*(1-f)+A[i1]*f)*(1-sstep(2.5,DEPTH,Math.max(0,t)));
var o=(j*cw+i)*4;D[o]=cr;D[o+1]=cg;D[o+2]=cb;D[o+3]=Math.round(255*aMax*a);
}
cx.putImageData(im,0,0);
ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(c,pts[0][0]-1,y0,cw*2,ch*RS);ctx.restore();
c.width=c.height=0;
}
function paintRanges(ctx,yo,bigMoon,night,smallMoon){
var L=LIT,haze=L.haze,lt=lightTint(1),rng=mulberry32(301),sunL=L.sunX<0.5?-1:1;
var layers=[{y:30,amp:17,col:[122,136,160],hz:0.62,f:0.011,ridge:1},{y:44,amp:12,col:[86,104,100],hz:0.48,f:0.02,ridge:0.4}];
layers.forEach(function(Ly,li){
var pts=[],x2;
for(x2=-10;x2<=W+10;x2+=2){
var n=NZ.fbm(x2*Ly.f+li*7+3,li*3.1,4),rdg=1-Math.abs(NZ.n2(x2*Ly.f*1.7+11,li+0.5)*2-1);
pts.push([x2,yo+Ly.y-Ly.amp*(n*1.5+rdg*0.45*Ly.ridge)+Ly.amp*0.55]);
}
var path=new Path2D();path.moveTo(-10,yo+170);path.lineTo(pts[0][0],pts[0][1]);
for(x2=1;x2<pts.length-1;x2++)path.quadraticCurveTo(pts[x2][0],pts[x2][1],(pts[x2][0]+pts[x2+1][0])/2,(pts[x2][1]+pts[x2+1][1])/2);
path.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);path.lineTo(W+10,yo+170);path.closePath();
if(li===1)RANGE_PATH=path;
var lcol=mixc(mulc(Ly.col,lt),haze,Ly.hz);if(li===0&&!SEA.snow)lcol=mixc(lcol,mulc([108,128,168],lt),0.18);
if(SEA.snow)lcol=mixc(lcol,mulc([232,236,246],lt),0.5-li*0.15);
ctx.fillStyle=rgb(lcol);ctx.fill(path);
ctx.save();ctx.clip(path);
var lp=new Path2D(),i,k;
for(i=1;i<pts.length-1;i++){
if(rng()<0.1){var gx=pts[i][0],gy=pts[i][1]+1.5,len=4+rng()*9,qx=gx+(rng()-0.5)*3,ex=gx+(rng()-0.5)*5;lp.moveTo(gx-0.3,gy);lp.quadraticCurveTo(qx-0.18,gy+len*0.5,ex,gy+len);lp.quadraticCurveTo(qx+0.18,gy+len*0.5,gx+0.3,gy);lp.closePath();}
}
rangeShade(ctx,pts,sunL,rgb(mixc(scl(lcol,0.86),haze,0.1)),0.35);
if(li===0)farRangeModel(ctx,pts,lcol,haze,Ly,yo,sunL,lt);
ctx.fillStyle=rgb(scl(lcol,0.9),0.2);ctx.fill(lp);
if(li===0&&SEA!==SEASONS.summer){
var sl=yo+Ly.y-Ly.amp*(SEA.snow?0.15:0.62),sp=new Path2D(),sA=SEA.snow?0.85:0.7,sc0=mulc([246,248,252],lt);
sp.moveTo(-10,sl);for(k=0;k<=120;k++){var xx=-10+k*(W+20)/120;sp.lineTo(xx,sl+0.5+(NZ.n2(xx*0.12,4)-0.5)*5+Math.sin(xx*0.9)*0.8);}
sp.lineTo(W+10,-50);sp.lineTo(-10,-50);sp.closePath();
var sg2=ctx.createLinearGradient(0,sl-7,0,sl+3);sg2.addColorStop(0,rgb(sc0,sA));sg2.addColorStop(0.4,rgb(sc0,sA*0.85));sg2.addColorStop(0.75,rgb(sc0,sA*0.35));sg2.addColorStop(1,rgb(sc0,0));
ctx.save();ctx.clip(sp);ctx.fillStyle=sg2;ctx.fill(path);
ctx.fillStyle=rgb(mulc([200,206,220],lt),0.32);ctx.fill(lp);ctx.restore();
}
if(li===1)paintFarWoods(ctx,pts,lcol,haze,lt,yo,rng);
var mg=ctx.createLinearGradient(0,yo+Ly.y-2,0,yo+Ly.y+Ly.amp*1.3);mg.addColorStop(0,rgb(haze,0));mg.addColorStop(1,rgb(haze,0.55*L.hazeK));ctx.fillStyle=mg;ctx.fillRect(-10,yo+Ly.y-2,W+20,172-Ly.y);
ctx.restore();
if(li===0&&(bigMoon||smallMoon))drawMoonAt(ctx,bigMoon,night);
});
}
function paintFarWoods(ctx,pts,lcol,haze,lt,yo,rng){
var pal=SEA.forest,NB=4,paths=[],i;
for(i=0;i<pal.length*NB;i++)paths.push(new Path2D());
var dq=Math.min(2,DQ),cnt=Math.round(3400*dq);
for(i=0;i<cnt;i++){
var x=rng()*(W+20)-10,ix=Math.max(0,Math.min(pts.length-1,Math.round((x+10)/2))),yr=pts[ix][1],y=yr+0.6+Math.pow(rng(),1.7)*64;
var r=(0.45+rng()*0.5)/Math.sqrt(dq)*(1+(y-yr)*0.012),ci=rng()<0.62?(rng()<0.5?4:5):(rng()*4)|0;
if(SEA.name==='spring'&&ci===3&&rng()<0.4)ci=2;
var b=Math.min(NB-1,(rng()*NB)|0),p=paths[ci*NB+b];p.moveTo(x+r,y);p.ellipse(x,y,r,r*0.85,0,0,TAU);
}
for(i=0;i<paths.length;i++){var c=mulc(scl(pal[(i/NB)|0],0.7+(i%NB)*0.16),lt);ctx.fillStyle=rgb(mixc(c,haze,0.5),0.75);ctx.fill(paths[i]);}
var fc=SEA.paddy==='flood'?[138,156,150]:SEA.paddy==='green'?[110,150,70]:SEA.paddy==='gold'?[214,184,90]:SEA.snow?[236,240,246]:[150,136,110];
[[0.18,14,7],[0.71,18,6]].forEach(function(t){
var cx=t[0]*W,ix=Math.round((cx+10)/2),y0=pts[ix][1]+5;
for(var s=0;s<t[2];s++){
var yy=y0+s*1.55+(rng()-0.5)*0.4,w=t[1]*(0.45+0.45*Math.sin((s+1)/(t[2]+1)*Math.PI))*(0.75+0.5*rng()),sx0=cx+(s-t[2]/2)*1.1+(rng()-0.5)*2.4,gap=rng()<0.4?0.3+rng()*0.4:-1;
var segs=gap>0?[[sx0-w/2,sx0-w/2+w*gap-0.8],[sx0-w/2+w*gap+0.8,sx0+w/2]]:[[sx0-w/2,sx0+w/2]];
segs.forEach(function(sg){if(sg[1]-sg[0]<1.2)return;var mx=(sg[0]+sg[1])/2;
ctx.strokeStyle=rgb(mixc(mulc(fc,lt),haze,0.56),SEA.paddy==='flood'?0.42:0.72);ctx.lineWidth=SEA.paddy==='flood'?0.65:0.8;ctx.beginPath();ctx.moveTo(sg[0],yy+0.5);ctx.quadraticCurveTo(mx,yy-0.6,sg[1],yy+0.3);ctx.stroke();
ctx.strokeStyle=rgb(mixc(mulc(scl(pal[4],0.9),lt),haze,0.5),0.5);ctx.lineWidth=0.4;ctx.beginPath();ctx.moveTo(sg[0],yy+1.0);ctx.quadraticCurveTo(mx,yy-0.1,sg[1],yy+0.8);ctx.stroke();});
}
});
var hx=W*0.56,hi=Math.round((hx+10)/2),hy=pts[hi][1]+9,rc=mixc(mulc([70,72,80],lt),haze,0.45),tc2=mixc(mulc([150,130,96],lt),haze,0.45),wl=mixc(mulc([226,222,210],lt),haze,0.45);
for(i=0;i<7;i++){
var rx=hx+(i-3)*3.2+(rng()-0.5)*1.5,ry=hy+(i%3)*1.4,rw=1.6+rng();
ctx.fillStyle=rgb(wl);ctx.fillRect(rx-rw*0.4,ry,rw*0.8,0.9);
ctx.fillStyle=rgb(i%3?rc:tc2);ctx.beginPath();ctx.moveTo(rx-rw*0.6,ry+0.2);ctx.lineTo(rx-rw*0.25,ry-0.9);ctx.lineTo(rx+rw*0.25,ry-0.9);ctx.lineTo(rx+rw*0.6,ry+0.2);ctx.closePath();ctx.fill();
}
var px=hx+13,py=hy-1;ctx.fillStyle=rgb(rc);
for(i=0;i<4;i++){var ww=2.0-i*0.3,y2=py-i*1.5;ctx.beginPath();ctx.moveTo(px-ww,y2);ctx.lineTo(px+ww,y2);ctx.lineTo(px+ww*0.45,y2-0.7);ctx.lineTo(px-ww*0.45,y2-0.7);ctx.closePath();ctx.fill();}
ctx.fillRect(px-0.12,py-8.6,0.24,2.6);
if(LIT.lit){ctx.fillStyle='rgba(255,200,130,0.8)';for(i=0;i<4;i++)ctx.fillRect(hx+(i-1.5)*3.6,hy+0.3+(i%2)*1.2,0.5,0.4);}
}
function windVec(w,k){var a=w.dir*Math.PI/180,kk=k||1;return{h:Math.cos(a)*w.strength*kk,z:Math.sin(a)*w.strength*kk,s:w.strength*kk,sign:Math.cos(a)>=0?1:-1,dir:w.dir,k:kk};}
function weatherLight(L,w){
if(!w||w==='clear'||w==='after')return L;
var o={},k;for(k in L)o[k]=L[k];
var night=L.name==='night',dusk=L.name==='dusk',dark=w==='storm'?1:w==='typhoon'?0.95:w==='blizzard'?0.5:w==='rain'?0.6:w==='snow'?0.35:0.2;
var grey=night?[26,32,46]:dusk?[118,104,112]:w==='typhoon'?[132,146,128]:w==='blizzard'?[196,204,218]:[150,156,166];
var greyD=night?[14,18,30]:dusk?[70,62,74]:w==='typhoon'?[84,98,84]:w==='blizzard'?[156,166,184]:[96,102,116];
var g=mixc(grey,greyD,clamp((dark-0.3)/0.7));
var lift=w==='cloudy'?0.55:w==='snow'?0.75:0.85;
o.skyTop=mixc(L.skyTop,g,lift);o.skyHor=mixc(L.skyHor,mixc(g,[255,255,255],night?0:0.2),lift);
o.haze=mixc(L.haze,mixc(g,[255,255,255],night?0.05:0.25),lift*0.9);o.hazeK=L.hazeK*(1+dark*0.8);
o.sunc=scl(L.sunc,w==='cloudy'?0.55:w==='snow'?0.4:0.25-dark*0.08);
o.amb=scl(mixc(L.amb,[0.6,0.62,0.66],0.5),(night?1:1.12)*(1-dark*0.22));
o.shadowA=L.shadowA*(w==='cloudy'?0.35:0.12);o.bloom=L.bloom*0.6;
o.sunGlow='rgba(255,255,255,0)';o.wash=['rgba(200,210,220,0.12)','rgba(200,210,220,0.04)'];
if(L.grade)o.grade=L.grade.map(function(c){return mixc(c,[200,204,214],0.3);});
o.vig=scl(L.vig,1-dark*0.15);o.mist=Math.max(L.mist,wxWet(w)?0.45:L.mist);
if(w==='blizzard'){
o.haze=night?[56,64,88]:dusk?[168,166,180]:mixc([204,212,226],o.haze,0.15);o.hazeK=L.hazeK*3.4;o.win=Math.max(L.win,0.45);o.lit=true;
o.sunc=scl(L.sunc,0.1);o.amb=mulc(o.amb,night?[0.92,0.96,1.08]:[0.9,0.95,1.04]);o.shadowA=L.shadowA*0.05;o.bloom=L.bloom*0.4;
o.grade=night?(L.grade||[[255,255,255],[255,255,255],[255,255,255]]).map(function(c){return mulc(c,[0.9,0.94,1.04]);}):[[222,228,242],[232,237,247],[224,230,242]];
o.vig=scl(L.vig,0.92);o.blizzard=true;
}
if(w==='typhoon'){o.hazeK=L.hazeK*2.2;o.win=Math.max(L.win,0.25);}
if(w==='rain'||w==='storm')o.win=Math.max(L.win,0.15);
function tint(Q){var d=Math.max(0,Q.sun[1])*0.95;return[Q.amb[0]+Q.sunc[0]*d,Q.amb[1]+Q.sunc[1]*d,Q.amb[2]+Q.sunc[2]*d];}
var tb=tint(L),tw=tint(o),ft=L.foliageTint||[1,1,1];o.foliageTint=[clamp(ft[0]*tw[0]/tb[0],0.3,1.1),clamp(ft[1]*tw[1]/tb[1],0.3,1.1),clamp(ft[2]*tw[2]/tb[2],0.3,1.1)];
o.fog=w==='blizzard'?0.86:w==='typhoon'?0.45:w==='storm'?0.32:w==='rain'?0.24:w==='snow'?0.3:0.08;
if(L.moonSnow)o.moonSnow=w==='cloudy'?0.7:w==='snow'?0.55:w==='blizzard'?0.45:0.4;
o.wx=w;o.base=L;
return o;
}
function paintOvercast(ctx,yo,w){
var L=LIT,rng=mulberry32(77),dark=w==='storm'||w==='typhoon'?1:w==='rain'?0.6:w==='snow'||w==='blizzard'?0.4:0.2,yH=100+yo;
var lid=mixc(L.skyTop,[40,44,56],dark*0.35),g=ctx.createLinearGradient(0,0,0,yH);
g.addColorStop(0,rgb(lid,0.95));g.addColorStop(0.7,rgb(mixc(lid,L.skyHor,0.6),0.6));g.addColorStop(1,rgb(L.skyHor,0));ctx.fillStyle=g;ctx.fillRect(0,0,W,yH);
for(var i=0;i<26;i++){
var x=rng()*(W+80)-40,y=yo-10+rng()*52,rx=30+rng()*60,ry=5+rng()*9,c=mixc(lid,[20,24,34],0.1+rng()*0.25*dark);
var gg=ctx.createRadialGradient(x,y,0,x,y,rx);gg.addColorStop(0,rgb(c,0.45));gg.addColorStop(1,rgb(c,0));
ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);ctx.translate(-x,-y);ctx.fillStyle=gg;ctx.fillRect(x-rx,y-rx,rx*2,rx*2);ctx.restore();
}
}
function whiteoutAlpha(fogMax){
return function(z){return fogMax*(0.05+0.95*Math.pow(clamp((z-2)/98),1.55));};
}
function paintWhiteout(ctx,bw,bh){
var night=LIT.name==='night',col=LIT.haze,lite=night?mixc(col,[148,154,172],0.35):mixc(col,[246,248,252],0.55),fa=whiteoutAlpha(LIT.fog),sign=WIND_LEAN>=0?1:-1,i;
ctx.save();ctx.setTransform(1,0,0,1,0,0);
var g=ctx.createLinearGradient(0,0,0,bh),yo=P(0,0,GROUND_FAR).y;
for(i=0;i<=24;i++){var y=i/24*H,gp=y>yo?groundAt(W/2,y):null,zz=gp?gp.z:GROUND_FAR+20;g.addColorStop(i/24,rgb(col,clamp(fa(zz),0,0.95)));}
ctx.fillStyle=g;ctx.fillRect(0,0,bw,bh);
var r=mulberry32(5150),slope=0.05*sign,n=Math.round(110*Math.sqrt(DQ)),tints=[0,1,2].map(function(k){var tx0=veilTex(k),c=mkCanvas(tx0.width,tx0.height),cx=c.getContext('2d');cx.drawImage(tx0,0,0);cx.globalCompositeOperation='source-in';cx.fillStyle=rgb(lite);cx.fillRect(0,0,c.width,c.height);return c;}),tint=tints[0];
ctx.globalCompositeOperation='source-over';
for(i=0;i<n;i++){
var zf=lerp(8,GROUND_FAR+10,Math.pow(r(),0.55)),y2=P(0,0,zf).y-r()*6,gp2=groundAt(W/2,y2),z2=gp2?gp2.z:GROUND_FAR;
var k2=CAM.F/P(0,0,zf).d,L=(10+r()*22)*k2*(0.6+r()*0.8),hh=L*(0.16+r()*0.14),x2=r()*(W+L)-L/2;tint=tints[i%3];
var a=0.3*Math.pow(clamp(fa(z2)/LIT.fog),0.8)*(0.4+r()*0.7)*(night?0.7:1);
ctx.globalAlpha=clamp(a);ctx.setTransform(KS,KS*slope*0.6,0,KS,0,0);
ctx.drawImage(tint,x2-L/2,y2-x2*slope*0.6-hh/2,L,hh);
}
for(i=0;i<5;i++){var cy=lerp(yo-20,H*0.55,r()),cw=W*(0.5+r()*0.6),ch=34+r()*36,cx=r()*W;tint=tints[(i+1)%3];ctx.globalAlpha=0.14+r()*0.12;ctx.setTransform(KS,KS*slope,0,KS,0,0);ctx.drawImage(tint,cx-cw/2,cy-cx*slope-ch/2,cw,ch);}
ctx.restore();
}
function initWeatherFx(g,rng){
var wx=g.wx,X={wx:wx,drops:[],splash:[],ripples:[],drips:[],flash:null};
if(!wxWet(wx)){if(wx==='blizzard')X.bz=makeBlizzard(g,rng);return wxSnowy(wx)?X:null;}
var heavy=wx==='storm'?1.6:wx==='typhoon'?2.2:1;X.drops=makeRain(g,rng,wx);
for(var i=0;i<40*heavy;i++)X.splash.push({x:rng()*g.W,y:g.horizonY+Math.pow(rng(),0.7)*(g.H-g.horizonY),t:rng(),r:rng()});
if(wx!=='typhoon')townPlan(g.F).forEach(function(b){
if(b.type==='kura'||b.type==='nagaya')return;
var B=BF(b.x,b.z,b.u,0),d=b.d||8,w=b.w||6,Wl=boxWalls(B,w,d,0,3);if(!Wl.f.vis)return;
var yE=b.type==='inn'?3.65:b.low?2.6:(b.yE||5)-0.6,out=b.type==='inn'?1.05:0.95;
for(var a=0.3;a<w;a+=0.9+rng()*0.6){var top=P.apply(null,Wl.f.at(a,b.low?2.6:3.2,out)),bot=P.apply(null,Wl.f.at(a,0,out));X.drips.push({x:top.x,y0:top.y,y1:bot.y,ph:rng(),sp:0.7+rng()*0.6});}
});
return X;
}
function drawWeatherFx(ctx,g,X,t,dt){
if(!X||!wxWet(X.wx))return;
var Wd=gWind(g),slant=clamp(rainSlant(Wd,X.wx),-1.4,1.4),night=g.LIT.name==='night',base=night?[148,156,176]:[214,222,232];
stepRain(X.drops,g,dt,Math.random,X.wx,slant);drawRain(ctx,X.drops,g,slant,night,AQ.part);
var i;
ctx.strokeStyle=rgb(base,0.42);ctx.lineWidth=0.35;ctx.beginPath();
for(i=0;i<X.splash.length;i++){var s=X.splash[i];s.t+=dt*2.6;if(s.t>1){s.t-=1;s.x=Math.random()*g.W;s.y=g.horizonY+Math.pow(Math.random(),0.7)*(g.H-g.horizonY);}var r=0.4+s.t*1.6*(0.5+(s.y-g.horizonY)/g.H);ctx.moveTo(s.x-r,s.y);ctx.quadraticCurveTo(s.x,s.y-r*0.9,s.x+r,s.y);}
ctx.stroke();
ctx.fillStyle=rgb(base,0.6);
for(i=0;i<X.drips.length;i++){var q=X.drips[i],u=(t*q.sp+q.ph)%1,y=lerp(q.y0,q.y1,u*u);ctx.fillRect(q.x-0.15,y,0.3,1.2);}
if(X.wx==='typhoon'){
for(i=0;i<4;i++){var sx=((t*60*Wd.sign+i*137)%(g.W+200)+g.W+200)%(g.W+200)-100,gr=ctx.createLinearGradient(sx-50,0,sx+50,0);gr.addColorStop(0,'rgba(220,226,230,0)');gr.addColorStop(0.5,'rgba(220,226,230,0.13)');gr.addColorStop(1,'rgba(220,226,230,0)');ctx.fillStyle=gr;ctx.save();ctx.transform(1,0,-slant*0.6,1,0,0);ctx.fillRect(sx-50,0,100,g.H);ctx.restore();}
}
}
function drawWaterRain(ctx,g,X,t){
if(!X||!wxWet(X.wx)||!g.water)return;
var n=X.wx==='rain'?220:320,base=g.LIT.name==='night'?[178,186,206]:[236,242,248],i;
ctx.lineWidth=0.8;
for(var pass=0;pass<3;pass++){
ctx.strokeStyle=rgb(base,[0.75,0.5,0.26][pass]);ctx.beginPath();
for(i=0;i<n;i++){
var rate=1.1+hash2(i,77)*0.7,ph=(t*rate+i*0.6180339)%1,cyc=Math.floor(t*rate+i*0.6180339),hx=hash2(i,cyc),hy=hash2(i+999,cyc),x=hx*g.W,y=g.horizonY+hy*(g.H-g.horizonY);
if((pass===0&&ph>0.4)||(pass===1&&(ph<=0.4||ph>0.75))||(pass===2&&ph<=0.75))continue;
if(!waterAt(g,x,y))continue;
var dk=0.7+(y-g.horizonY)/g.H*1.5,r=(0.3+ph*3.0)*dk;ctx.moveTo(x+r,y);ctx.ellipse(x,y,r,r*0.38,0,0,TAU);
if(hash2(i,cyc+5)>0.6&&ph>0.25){var r2=r*0.55;ctx.moveTo(x+r2,y);ctx.ellipse(x,y,r2,r2*0.38,0,0,TAU);}
}
ctx.stroke();
}
ctx.fillStyle=rgb(base,0.6);
for(i=0;i<n;i++){var rt=1.1+hash2(i,77)*0.7,p0=(t*rt+i*0.6180339)%1;if(p0>0.08)continue;var cy0=Math.floor(t*rt+i*0.6180339),x0=hash2(i,cy0)*g.W,y0=g.horizonY+hash2(i+999,cy0)*(g.H-g.horizonY);if(!waterAt(g,x0,y0))continue;ctx.fillRect(x0-0.3,y0-0.6,0.6,0.6);}
if(X.wx==='typhoon'){
var Wd=gWind(g);ctx.strokeStyle='rgba(236,232,220,0.55)';ctx.lineWidth=0.6;ctx.beginPath();
for(i=0;i<60;i++){var x2=((hash2(i,3)*g.W+t*9*Wd.sign*(0.6+hash2(i,4)))%g.W+g.W)%g.W,y2=g.horizonY+hash2(i,5)*(g.H-g.horizonY),lf=(t*0.7+hash2(i,6))%1;if(!waterAt(g,x2,y2)||lf>0.6)continue;ctx.moveTo(x2-1.4,y2);ctx.quadraticCurveTo(x2,y2-0.7,x2+1.4,y2+0.1);}
ctx.stroke();
}
}
var VEIL_TEX=[];
function veilTex(k){
if(VEIL_TEX[k])return VEIL_TEX[k];
var w=192,h=96,c=mkCanvas(w,h),x=c.getContext('2d'),img=x.createImageData(w,h),d=img.data,nz=makeNoise(300+k*17);
for(var j=0;j<h;j++)for(var i=0;i<w;i++){
var u=(i/w-0.5)*2,v=(j/h-0.5)*2,edge=nz.fbm(i*0.03,j*0.05,3)*0.55;
var r=Math.sqrt(u*u*0.9+v*v*1.3)+edge*0.5-0.25,env=(1-sstep(0.25,1.0,r))*sstep(0,0.3,1-Math.abs(u))*sstep(0,0.3,1-Math.abs(v));
var den=sstep(0.28,0.75,nz.fbm(i*0.022+7,j*0.05-3,4)+(k===2?0.08:0)),q=(j*w+i)*4;
d[q]=d[q+1]=d[q+2]=255;d[q+3]=clamp(env*(0.25+0.75*den))*255;
}
x.putImageData(img,0,0);VEIL_TEX[k]=c;return c;
}
var POWDER=null;
function powderSprite(){
if(POWDER)return POWDER;
var N=16,c=mkCanvas(N,N),x=c.getContext('2d'),g=x.createRadialGradient(N/2,N/2,0,N/2,N/2,N/2);
g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.35,'rgba(255,255,255,0.7)');g.addColorStop(1,'rgba(255,255,255,0)');
x.fillStyle=g;x.fillRect(0,0,N,N);POWDER=c;return c;
}
function makeBlizzard(g,rng){
var B={f:[],veils:[],drift:[],big:null,t:0,lastB:0},i,n=[950,340,64];
for(var l=0;l<3;l++)for(i=0;i<n[l];i++){
var d=l===0?rng()*0.45:l===1?0.45+rng()*0.4:0.85+rng()*0.15;
B.f.push({l:l,d:d,x:rng()*(g.W+60)-30,y:rng()*g.H,r:l===0?0.26+rng()*0.26:l===1?0.45+rng()*0.4:0.9+rng()*1.3,a:0.35+rng()*0.55,ph:rng()*TAU,sp:0.75+rng()*0.5,extra:rng()<0.5});
}
for(i=0;i<6;i++)B.veils.push({x:rng()*(g.W+300)-150,y:g.H*(0.05+0.9*rng()),w:140+rng()*220,h:30+rng()*50,sp:0.6+rng()*0.6,a:0.12+rng()*0.14,k:i%3,ph:rng()*TAU});
for(i=0;i<9;i++)B.drift.push(newDriftWisp(g,rng,true));
return B;
}
function newDriftWisp(g,rng,anywhere){
return{x:rng()*g.W,y:g.horizonY-20+rng()*(g.H-g.horizonY+10),w:40+rng()*70,h:8+rng()*10,life:0,dur:2.5+rng()*2.5,t0:anywhere?rng()*2:0,sp:0.8+rng()*0.5,a:0.2+rng()*0.2,k:(rng()*3)|0,rise:4+rng()*8};
}
function drawBlizzard(ctx,g,B,t,dt){
var Wd=gWind(g),sg=Wd.sign,burst=clamp(((Wd.k||1)-1)/1.5),night=g.LIT.name==='night',i,f,W0=g.W,H0=g.H;
var col=night?[168,178,208]:[250,252,255],na=night?0.55:1,rng=Math.random;
B.t+=dt;var T=B.t,spd=1+1.5*burst;
var cvs=ctx.canvas,vw=Math.ceil(cvs.width/4),vh=Math.ceil(cvs.height/4);
B.vc=B.vc||mkCanvas(vw,vh);if(B.vc.width!==vw||B.vc.height!==vh){B.vc.width=vw;B.vc.height=vh;}
var main=ctx;ctx=B.vc.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,vw,vh);ctx.setTransform(vw/W0,0,0,vh/H0,0,0);
ctx.save();
B.veils.forEach(function(v){
v.x+=sg*dt*70*v.sp*spd;var yy=v.y+Math.sin(T*0.4+v.ph)*6-burst*8;
if(sg>0&&v.x-v.w>W0+20){v.x=-v.w-20;v.y=H0*(0.05+0.9*rng());}else if(sg<0&&v.x+v.w<-20){v.x=W0+v.w+20;v.y=H0*(0.05+0.9*rng());}
ctx.globalAlpha=clamp(v.a*(0.9+1.6*burst)*na);ctx.drawImage(veilTex(v.k),v.x-v.w/2,yy-v.h/2,v.w,v.h);
});
if(burst>0.02&&(!B.big||B.big.done)){if(!B.big||B.lastB<0.02)B.big={x:sg>0?-W0*0.8:W0*1.8,done:false};}
if(B.big&&!B.big.done){
var bg=B.big;bg.x+=sg*dt*W0*0.55*(0.6+burst);
ctx.globalAlpha=clamp(0.72*burst*na+0.1*burst);ctx.drawImage(veilTex(2),bg.x-W0*0.8,-H0*0.15,W0*1.6,H0*1.3);
if((sg>0&&bg.x-W0*0.8>W0)||(sg<0&&bg.x+W0*0.8<0))bg.done=true;
}
if(burst>0.02){ctx.globalAlpha=1;ctx.fillStyle=rgb(night?[70,78,104]:[230,234,242],0.26*burst);ctx.fillRect(0,0,W0,H0);}
B.drift.forEach(function(q,k){
q.life+=dt;var u=(q.life-q.t0)/q.dur;if(u>1){B.drift[k]=newDriftWisp(g,rng,false);return;}if(u<0)return;
q.x+=sg*dt*90*q.sp*spd;q.y-=dt*q.rise*(1+burst);
ctx.globalAlpha=clamp(q.a*Math.sin(Math.PI*u)*(0.8+0.8*burst)*na);ctx.drawImage(veilTex(q.k),q.x-q.w/2*(0.6+0.6*u),q.y-q.h/2*(1+u),q.w*(0.6+0.6*u),q.h*(1+u));
});
B.lastB=burst;
ctx.restore();ctx=main;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.imageSmoothingQuality='low';ctx.drawImage(B.vc,0,0,cvs.width,cvs.height);ctx.restore();ctx.save();
var P0=new Path2D(),P0b=new Path2D(),P1=new Path2D(),P1b=new Path2D(),E0=new Path2D(),E1=new Path2D(),spr=powderSprite(),span=W0+60;
ctx.globalAlpha=1;
for(i=0;i<B.f.length;i++){
f=B.f[i];
var U=(35+150*f.d)*f.sp*spd,V=6+20*f.d;
var vx=sg*U+22*(0.4+f.d)*Math.sin(0.05*f.y+T*1.3+f.ph)*(1+burst),vy=V+16*(0.4+f.d)*Math.sin(0.04*f.x-T*1.7+f.ph*1.3)-14*burst*Math.sin(T*0.9+f.ph);
f.x+=vx*dt;f.y+=vy*dt;
if(f.y>H0+4){f.y-=H0+8;f.x=rng()*span-30;}else if(f.y<-6)f.y+=H0+8;
if(f.x>W0+30){f.x-=span;f.y=rng()*H0;}else if(f.x<-30){f.x+=span;f.y=rng()*H0;}
var vis=f.extra?burst:1;if(vis<0.03)continue;
if(f.l===0){var pp=f.extra?E0:f.a>0.62?P0:P0b;pp.rect(f.x-f.r,f.y-f.r,f.r*2,f.r*2);}
else if(f.l===1){var pq=f.extra?E1:f.a>0.62?P1:P1b;if(f.r<0.62)pq.rect(f.x-f.r*0.9,f.y-f.r*0.9,f.r*1.8,f.r*1.8);else{pq.moveTo(f.x+f.r,f.y);pq.arc(f.x,f.y,f.r,0,TAU);}}
else{var sm=1+Math.min(0.9,Math.abs(vx)/260);ctx.globalAlpha=clamp(f.a*0.75*vis*na);ctx.drawImage(spr,f.x-f.r*sm,f.y-f.r,f.r*2*sm,f.r*2);}
}
var fb=(night?0.55:0.8)*(1+0.25*burst);
ctx.globalAlpha=1;ctx.fillStyle=rgb(col,clamp(0.95*fb));ctx.fill(P0);ctx.fillStyle=rgb(col,clamp(0.6*fb));ctx.fill(P0b);
ctx.fillStyle=rgb(col,clamp(0.8*fb));ctx.fill(P1);ctx.fillStyle=rgb(col,clamp(0.5*fb));ctx.fill(P1b);
if(burst>0.03){ctx.fillStyle=rgb(col,clamp(0.7*fb*burst));ctx.fill(E0);ctx.fillStyle=rgb(col,clamp(0.75*fb*burst));ctx.fill(E1);}
ctx.restore();ctx.globalAlpha=1;
}
function seasonProgressT(d,season){return seasonProgress(season,d instanceof Date&&!isNaN(d.getTime())?d:null);}
function seasonStepT(d,season){var n=calSteps(season);return n?Math.round(seasonProgressT(d,season)*n)/n:null;}
function sakuraState(prog){var s=sakuraCal(clamp(prog===undefined||prog===null?0.5:prog));s.prog=prog;return s;}
function springProgress(d){return seasonProgressT(d,'spring');}
var LIGHTS=lightsFor('town');
function moonLayer(gc,obj){
var M=MOONP,g0=GLOWS.length,rp0=RANGE_PATH;
return moonCrisp(gc,obj,M,KS,function(kx){MOONKEY=true;try{paintBackdrop(kx,true);}finally{MOONKEY=false;GLOWS.length=g0;RANGE_PATH=rp0;MOONP=M;}});
}
function paintClouds(ctx,yo,night,dusk,spanW){return paintCloudsS(ctx,yo,night,dusk,spanW,{W:W,H:H,L:LIT,season:SEA.name,snow:SEA.snow,wx:F.wx});}
return{pull:pull,fn:{drawBlizzard:drawBlizzard,drawWaterRain:drawWaterRain,drawWeatherFx:drawWeatherFx,initWeatherFx:initWeatherFx,moonLayer:moonLayer,moonPos:moonPos,moonSpot:moonSpot,paintBackdrop:paintBackdrop,paintClouds:paintClouds,paintWhiteout:paintWhiteout,sakuraState:sakuraState,weatherLight:weatherLight,windVec:windVec,seasonProgressT:seasonProgressT,seasonStepT:seasonStepT,springProgress:springProgress},pure:{sakuraState:1,weatherLight:1,windVec:1,springProgress:1},val:{LIGHTS:LIGHTS},mut:{MOONP:function(v){if(arguments.length)MOONP=v;return MOONP;},RANGE_PATH:function(v){if(arguments.length)RANGE_PATH=v;return RANGE_PATH;}}};
};
var COMMON={CLOUD_NZ:CLOUD_NZ,FW_COLS:FW_COLS,FW_KEYS:FW_KEYS,LIGHT_BASE:LIGHT_BASE,LIGHT_TUNE:LIGHT_TUNE,SK:SK,SPR:SPR,WIND_SEASON:WIND_SEASON,WX_KINDS:WX_KINDS,WX_TABLE:WX_TABLE,afterRainAt:afterRainAt,calQuant:calQuant,calSteps:calSteps,calTag:calTag,cloudLayers:cloudLayers,cloudNoise:cloudNoise,ditherSky:ditherSky,drawFireworkPond:drawFireworkPond,drawFireworkReflections:drawFireworkReflections,drawFireworks:drawFireworks,drawLightning:drawLightning,drawLightningFlash:drawLightningFlash,drawRain:drawRain,fireworksAt:fireworksAt,fnv1a:fnv1a,fwBurst:fwBurst,fwFloor:fwFloor,fwLaunch:fwLaunch,fwStarPos:fwStarPos,knots:knots,leafAmt:leafAmt,lightFor:lightFor,lightName:lightName,lightningLevel:lightningLevel,lightsFor:lightsFor,makeBolt:makeBolt,makeFireworks:makeFireworks,makeRain:makeRain,moonCrisp:moonCrisp,newDrop:newDrop,paintCloudsS:paintCloudsS,paintDuskSun:paintDuskSun,paintFireworkHaze:paintFireworkHaze,paintFullMoon:paintFullMoon,paintRainbow:paintRainbow,paintSkyGradient:paintSkyGradient,paintStars:paintStars,paintSunGlow:paintSunGlow,rainSlant:rainSlant,rareBlock:rareBlock,rareDay:rareDay,sakuraCal:sakuraCal,seasonFor:seasonFor,seasonProgress:seasonProgress,sprite:sprite,stamp:stamp,stepFireworks:stepFireworks,stepRain:stepRain,tintedSprite:tintedSprite,toDate:toDate,weatherAt:weatherAt,windAt:windAt,windDayKey:windDayKey,windNoise:windNoise,wxBlock:wxBlock,wxFinal:wxFinal,wxRow:wxRow,wxSnowy:wxSnowy,wxWet:wxWet};
function create(world,host){
var V=WORLD[world](host),depth=0,api={world:world};
function wrap(f){return function(){if(depth++===0){try{V.pull();}catch(e){depth--;throw e;}}try{return f.apply(this,arguments);}finally{depth--;}};}
Object.keys(V.fn).forEach(function(k){api[k]=V.pure[k]?V.fn[k]:wrap(V.fn[k]);});
Object.keys(V.val).forEach(function(k){api[k]=V.val[k];});
Object.keys(V.mut).forEach(function(k){Object.defineProperty(api,k,{get:function(){return V.mut[k]();},set:function(v){V.mut[k](v);},enumerable:true});});
Object.keys(COMMON).forEach(function(k){if(!(k in api))api[k]=COMMON[k];});
return api;
}
var API={create:create,src:SRC};
['weatherAt','afterRainAt','fireworksAt','windAt','seasonFor','lightFor','seasonProgress','sakuraCal','wxWet','wxSnowy'].forEach(function(k){if(COMMON[k])API[k]=COMMON[k];});
(typeof window!=='undefined'?window:self).MogiAtmos=API;
})();
