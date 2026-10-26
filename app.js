import {PLCS,MODS,layout} from './js/hardware.js';
import {parse,run,acts,parseLadder,compile} from './js/compiler.js';
import {ISA,CATS,KINDS,LET1,LET2,ins} from './js/isa.js';
import {WID,zoomer} from './js/hmi.js';
import {newRT,rung,grafcet,power,tv} from './js/engine.js';
import {stParse,stCheck,stRun,ilParse,ilCheck,ilRun,toST,toIL} from './js/text.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));

let LADDERS = { 'Main [OB1]': '' };
let activeRoutine = 'Main [OB1]';

let model='S7-1200 CPU 1215C AC/DC/RLY',extra=[],HW=layout(model,extra),plc={st:'STOP',loaded:null},act=0,gT=0,level=30,M={},sel=null,selL=null,cres=null,edited=0,evs=[],G=[],P=[],LN=[],uid=1,rt=newRT(),VT=[],lsel=null,V={tag:1,addr:1,desc:0,type:0},dmode=0;
const get=a=>a=='T'?gT:(M[a]||0),set=(a,v)=>{M[a]=v},addrs=k=>HW.A[k],hwKey=()=>model+'|'+extra.join(),mode=()=>$('#mode').value;
const reset=()=>{M={};act=0;gT=0;level=30;rt=newRT()};
const log=(s,m)=>{evs.unshift({t:new Date().toLocaleTimeString('es-CO'),s,m});renderDiag()};

/* ---------- Curso ---------- */
const CARDS=[
 ['Clase 1 · Introducción','Del proceso industrial a la automatización: la pirámide de niveles 0 a 4.',['Dinámica, variables y perturbaciones','Objetivos: calidad, productividad'],'plc'],
 ['Clase 2 · Arquitectura de PLC','CPU, memoria, fuente y módulos de entradas y salidas, digitales o analógicas.',['Salidas a relé y a transistor','Gama por número de E/S'],'plc'],
 ['Clase 3 · Ladder (LD)','Lenguaje gráfico de contactos NA y NC, bobinas OUT, SET y RESET.',['Arranque directo de motor','Inversión de giro'],'ladder'],
 ['Clase 4 · GRAFCET','Modelo secuencial con etapas, transiciones, receptividades y acciones.',['Etapa inicial, normal','Acciones condicionales'],'grafcet'],
 ['Clase 5 · HMI y SCADA','La HMI supervisa el proceso en tiempo real; el SCADA adquiere y registra.',['Ejemplos en TIA Portal'],'proceso'],
 ['Clase 6 · Subrutinas','Bloques FC sin memoria propia y FB con DB de instancia.',['Llamados CALL en Ladder'],'ladder']];
$('#cards').innerHTML=CARDS.map(c=>`<article class="card"><h3>${c[0]}</h3><p>${c[1]}</p><ul>${c[2].map(x=>`<li>${x}</li>`).join('')}</ul><button data-go="${c[3]}">Abrir simulador</button></article>`).join('');

/* ---------- Navegación ---------- */
function go(t){$$('section').forEach(s=>s.classList.toggle('act',s.id==t));$$('#tree button').forEach(b=>b.classList.toggle('act',b.dataset.t==t));location.hash=t;refresh()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-t],[data-go]');if(b)go(b.dataset.t||b.dataset.go)});

/* ---------- PLC, hardware, compilación y estados ---------- */
$('#model').innerHTML=Object.keys(PLCS).map(k=>`<option ${k==model?'selected':''}>${k}</option>`).join('');
const v4=s=>/^(\d{1,3}\.){3}\d{1,3}$/.test(s)&&s.split('.').every(n=>+n<=255),n32=s=>s.split('.').reduce((a,b)=>a*256+ +b,0);
function chkIP(){const ip=$('#ip').value.trim(),mk=$('#mask').value.trim(),gw=$('#gw').value.trim(),m=$('#ipmsg');let e='';
 if(!v4(ip))e='La IP no es válida.';
 else if(!v4(mk)||((~n32(mk))>>>0&(((~n32(mk))>>>0)+1))!==0)e='La máscara debe ser contigua.';
 else if(!v4(gw))e='La puerta de enlace no es válida.';
 m.className=e?'err':'ok';m.textContent=e||'Parámetros de red válidos.';return !e}
function setModel(){const p=PLCS[model];HW=layout(model,extra);
 $('#spec').textContent=`${p.brand} · ${p.fam} · memoria ${p.mem} · ${HW.A.DI.length} DI · ${HW.A.DO.length} DO · ${HW.A.AI.length} AI · ${HW.A.AO.length} AO`;
 $('#addm').innerHTML=Object.keys(MODS).map(k=>`<option>${k}</option>`).join('');$('#addb').disabled=$('#delm').disabled=!p.slots;
 $('#mt').innerHTML='<tr><th>Slot</th><th>Módulo</th><th>Direcciones</th></tr>'+HW.rows.map(r=>`<tr><td>${r.slot}</td><td>${r.n}</td><td>${r.rng.join(' &nbsp; ')}</td></tr>`).join('');
 $('#adl').innerHTML=[...HW.all].map(a=>`<option value="${a}">`).join('');dev();buildIO();
 if(plc.loaded&&plc.loaded.key!=hwKey()){log('err','La configuración de hardware cambió. Compile de nuevo.');setSt('ERROR')}}
$('#model').onchange=e=>{model=e.target.value;extra=[];const p=PLCS[model];$('#ip').value=p.ip;$('#gw').value=p.ip.replace(/\d+$/,'254');chkIP();setModel();if(!edited)sample()};
$('#addb').onclick=()=>{if(extra.length<PLCS[model].slots){extra.push($('#addm').value);setModel()}};
$('#delm').onclick=()=>{extra.pop();setModel()};
['#ip','#mask','#gw'].forEach(i=>$(i).oninput=()=>{chkIP();dev()});
function dev(){const s=plc.st,led=(y,c,on,t)=>`<circle cx="20" cy="${y}" r="5" fill="${on?c:'#e0e0e0'}"/><text x="29" y="${y+3}">${t}</text>`,w=140+HW.rows.length*92;
 $('#dev').innerHTML=`<svg viewBox="0 0 ${w} 210" width="${w}"><rect class="gs" x="8" y="20" width="110" height="170"/><text x="16" y="40" style="font-size:11px">${model.split(' ').slice(0,3).join(' ')}</text><text x="16" y="56">${$('#ip').value}</text>`+
 led(80,'#39A900',s=='RUN','RUN')+led(100,'#FF6A00',s=='STOP','STOP')+led(120,'#E2001A',s=='ERROR','ERROR')+led(140,'#3498db',s=='MNT','MAINT')+
 HW.rows.map((r,i)=>`<g transform="translate(${128+i*92},20)"><rect class="gs" width="84" height="170"/><text x="6" y="16" style="font-size:11px">${r.slot}</text><text x="6" y="32" style="font-size:8px">${r.n.slice(0,16)}</text>${r.rng.map((t,j)=>`<text x="6" y="${56+j*26}" style="font-size:9px;fill:var(--cy)">${t.split(' ')[0]}</text><text x="6" y="${67+j*26}" style="font-size:7px">${t.split(' ')[1]}</text>`).join('')}</g>`).join('')+'</svg>'}
function buildIO(){const g=(t,l)=>`<h3>${t}</h3><div class="ios">${l||'<span class="mut">Sin canales</span>'}</div>`;
 $('#io').innerHTML=g('Entradas digitales',addrs('DI').map(a=>`<button class="di" data-a="${a}"></button>`).join(''))+g('Salidas digitales',addrs('DO').map(a=>`<span class="do" data-a="${a}"></span>`).join(''))+
 g('Entradas analógicas',addrs('AI').map(a=>`<label class="ai">${a}<input type="range" data-a="${a}" min="0" max="100"><output></output></label>`).join(''))+g('Salidas analógicas',addrs('AO').map(a=>`<span class="aq" data-a="${a}"><i></i>${a}</span>`).join(''));refreshIO()}
function refreshIO(){$$('#io .di,#io .do').forEach(b=>{const v=get(b.dataset.a);b.classList.toggle('on',!!v);b.textContent=`${b.dataset.a}  ${v?'ON':'OFF'}`});
 $$('#io input').forEach(i=>{if(document.activeElement!==i)i.value=get(i.dataset.a);i.nextElementSibling.textContent=Math.round(get(i.dataset.a))});
 $$('#io .aq').forEach(b=>{$('i',b).style.width=get(b.dataset.a)+'%'})}
$('#io').addEventListener('click',e=>{const b=e.target.closest('.di');if(b){set(b.dataset.a,get(b.dataset.a)^1);refresh()}});
$('#io').addEventListener('input',e=>{if(e.target.dataset.a){set(e.target.dataset.a,+e.target.value);refresh()}});
const ST={RUN:['PLC: RUN','Programa ejecutándose'],STOP:['PLC: STOP','Programa detenido'],ERROR:['PLC: ERROR','Revise diagnóstico'],MNT:['PLC: MANTENIMIENTO','Salidas inhibidas']};
function setSt(s){plc.st=s;$('#badge').className='st '+s;$('#badge').innerHTML=`<b>${ST[s][0]}</b><small>${ST[s][1]}</small>`;
 if(s!='RUN')HW.A.DO.concat(HW.A.AO).forEach(a=>{M[a]=0});log(s=='ERROR'?'err':'info',ST[s][0]+' · '+ST[s][1]);refresh()}
$('#bRun').onclick=()=>{if(!plc.loaded){log('warn','Programa no cargado.');return dockTo('diag')}
 if(plc.loaded.key!=hwKey()){log('err','Hardware no coincide con el programa.');return setSt('ERROR')}act=0;gT=0;rt=newRT();setSt('RUN')};
$('#bStop').onclick=()=>setSt('STOP');$('#bMnt').onclick=()=>setSt('MNT');

const sig=()=>JSON.stringify([LADDERS,G,model,extra,mode(),P.map(o=>[o.tag,o.bind]),VT,$('#ttxt').value,$('#tlang').value]);
const snap=()=>{LADDERS[activeRoutine]=$('#ltxt').value;let allRungs={};Object.keys(LADDERS).forEach(k=>{allRungs[k]=parseLadder(LADDERS[k]).filter(r=>!r.e);});
 return {key:hwKey(),mode:mode(),rungs:allRungs,g:G.map(s=>({a:rs(s.a),c:rs(s.c),n:s.n}))};};

$('#compile').onclick=()=>{LADDERS[activeRoutine]=$('#ltxt').value;let allParsedLadder={};Object.keys(LADDERS).forEach(k=>{allParsedLadder[k]=parseLadder(rs(LADDERS[k]));});
 const r=compile({ladder:allParsedLadder,g:G.map(s=>({a:rs(s.a),c:rs(s.c),n:s.n})),HW,ip:chkIP()?'':$('#ipmsg').textContent,mode:mode(),pid:P.map(o=>({tag:o.tag,bind:o.bind,io:o.io})),vt:VT,hmi:H.flatMap(s=>s.items).map(o=>({tag:o.label,bind:o.bind})).concat(AL.map(a=>({tag:'Alarma: '+a.msg,bind:a.addr})))});
 txCompile(r);r.sig=sig();cres=r;renderCmp();dockTo('cmp');log(r.err?'err':'ok',r.err?`Error (${r.err})`:'Compilación correcta')};
$('#load').onclick=()=>{if(!cres)return dockTo('diag');if(cres.err)return dockTo('diag');
 if(cres.sig!=sig())return dockTo('diag');if(plc.st=='RUN')setSt('STOP');const s=snap();s.gp=s.g.map(x=>{try{return parse(x.c)}catch(_){return null}});
 const lg=$('#tlang').value,src=rs($('#ttxt').value);s.txt=lg=='off'?null:{lg,p:lg=='ST'?stParse(src):ilParse(src).prog};plc.loaded=s;act=0;gT=0;rt=newRT();setSt('STOP');log('ok','Programa cargado.');dockTo('diag')};
function renderCmp(){const r=cres,el=$('#cmp');if(!r){el.innerHTML='<p class="mut">Aún no se ha compilado.</p>';return}
 $('#ncmp').textContent=r.err?`(${r.err})`:'';
 el.innerHTML=(r.err?`<p class="err"><b>✕ Error de compilación</b><br>${r.err} errores · ${r.warn} advertencias</p>`:`<p class="okc"><b>✓ Compilación correcta</b><br>${r.err} errores<br>${r.warn} advertencias</p>`)+
 r.list.map(x=>`<div class="m ${x.sev}"${x.line!=null||['P&ID','HMI','Variables','ST','IL'].includes(x.where)?` data-g="${x.where.startsWith('Network')?'ladder':({'P&ID':'proceso',HMI:'hmi',Variables:'vars',ST:'texto',IL:'texto'})[x.where]||'grafcet'}" data-line="${x.line??''}"`:x.where.startsWith('Etapa')?' data-g="grafcet"':''}><b>${{err:'Error',warn:'Advertencia',info:'Información'}[x.sev]}</b> ${x.where} · Elemento: ${x.el} · Descripción: ${x.msg}</div>`).join('')}
$('#cmp').onclick=e=>{const m=e.target.closest('.m[data-g]');if(!m)return;go(m.dataset.g);
 if(m.dataset.line!==''&&(m.dataset.g=='ladder'||m.dataset.g=='texto')){const ta=m.dataset.g=='texto'?$('#ttxt'):$('#ltxt'),ls=ta.value.split('\n'),i=+m.dataset.line,s=ls.slice(0,i).join('\n').length+(i?1:0);ta.focus();ta.setSelectionRange(s,s+(ls[i]||'').length)}};
function dockTo(d){$$('#dock .dp').forEach(x=>x.classList.toggle('act',x.id==d));$$('#dock [data-d]').forEach(b=>b.classList.toggle('act',b.dataset.d==d))}
$('#dock').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b)dockTo(b.dataset.d)});
function renderDiag(){$('#diag').innerHTML=evs.length?evs.map(x=>`<div class="m ${x.s}"><b>${x.t}</b> ${x.m}</div>`).join(''):'<p class="mut">Sin eventos.</p>'}

/* ---------- P&ID ---------- */
let tool='sel',from=null,vw={x:0,y:0,z:1},drag=null;
const cv=$('#cv'),SV=o=>o.type=='inst'?ins(o):o.type=='img'?`<image href="${o.href}" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>`:ISA[o.type].s,isV=o=>ISA[o.type]&&ISA[o.type].c=='Válvulas'&&o.type!='check',man=o=>o.bind&&o.io=='DI'&&(o.type=='pb'||/^HS/.test(o.tag));
const add=(type,x,y,tag,bind='',o={})=>{const d=ISA[type]||{},it={id:uid++,type,x,y,tag,bind,r:0,sz:1.6,io:d.io||'',loc:'F',...o};P.push(it);return it};
const ctr=o=>[o.x+30*o.sz,o.y+30*o.sz],cen=ep=>ep.id?ctr(P.find(q=>q.id==ep.id)):[ep.x,ep.y];
const anc=(ep,to)=>{if(!ep.id)return[ep.x,ep.y];const o=P.find(q=>q.id==ep.id),s=30*o.sz,c=ctr(o);return[[c[0],o.y],[c[0],o.y+2*s],[o.x,c[1]],[o.x+2*s,c[1]]].sort((a,b)=>Math.hypot(a[0]-to[0],a[1]-to[1])-Math.hypot(b[0]-to[0],b[1]-to[1]))[0]};
const pts=l=>{const a=anc(l.a,cen(l.b)),b=anc(l.b,cen(l.a));return Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?[a,[b[0],a[1]],b]:[a,[a[0],b[1]],b]};
const libHTML=()=>CATS.map(c=>`<details open><summary>${c}</summary><div class="lg">${Object.entries(ISA).filter(([k,d])=>d.c==c).map(([k,d])=>`<button draggable="true" data-add="${k}" title="${d.n}"><svg viewBox="0 0 60 60">${d.inst?ins({tag:d.inst,loc:'F'}):d.s}</svg><span>${d.n}</span></button>`).join('')}</div></details>`).join('');
$('#lk').innerHTML=Object.entries(KINDS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
function drawCV(){cv.setAttribute('viewBox',`${vw.x} ${vw.y} ${900/vw.z} ${420/vw.z}`);$('#zp').textContent=Math.round(vw.z*100)+'%';
 cv.innerHTML=LN.map(l=>{const k=KINDS[l.k],p=pts(l).map(q=>q.join(',')).join(' ');return `<polyline class="ln${l===selL?' sel':''}" points="${p}" stroke="${k[1]}" stroke-width="${k[2]}" stroke-dasharray="${k[3]}" fill="none"/><polyline data-l="${l.id}" points="${p}" stroke="transparent" stroke-width="14" fill="none" style="cursor:pointer"/>`}).join('')+
 P.map(o=>{const s=o.sz,c=30*s;return `<g class="it${o===sel?' sel':''}${o.bind&&get(o.bind)&&(o.io=='DO'||o.type=='img')?' on':''}" data-id="${o.id}"><g class="s" transform="translate(${o.x},${o.y}) rotate(${o.r} ${c} ${c}) scale(${s})">${o.type=='tank'?`<rect class="liq" x="16" y="${46-level*.36}" width="28" height="${level*.36}"/>`:''}${SV(o)}</g>${lab(o).map((l,k)=>`<text class="tag" x="${o.x+c}" y="${o.y+2*c+10+k*10}" text-anchor="middle">${l}</text>`).join('')}</g>`}).join('')}
const pt=e=>{const p=cv.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(cv.getScreenCTM().inverse())};
function setTool(t){tool=t;from=null;$('#tsel').classList.toggle('on',t=='sel');$('#tlin').classList.toggle('on',t=='line');cv.style.cursor=t=='line'?'crosshair':'default'}
$('#tsel').onclick=()=>setTool('sel');$('#tlin').onclick=()=>setTool('line');
addEventListener('keydown',e=>{if(e.key=='Escape'){from=null;setTool('sel')}});
cv.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size>1){drag=null;pin=pd();return}const q=pt(e),g=e.target.closest('.it'),ln=e.target.dataset.l;
 if(tool=='line'){const ep=g?{id:+g.dataset.id}:{x:Math.round(q.x/10)*10,y:Math.round(q.y/10)*10};if(!from)from=ep;else if(!(ep.id&&ep.id==from.id)){LN.push({id:uid++,a:from,b:ep,k:$('#lk').value});edited=1;from=ep}return drawCV()}
 if(ln){selL=LN.find(l=>l.id==ln);sel=null;insp();return drawCV()}
 if(g){sel=P.find(o=>o.id==g.dataset.id);selL=null;drag={m:1,dx:q.x-sel.x,dy:q.y-sel.y};if(man(sel))set(sel.bind,1)}
 else{sel=selL=null;drag={cx:e.clientX,cy:e.clientY,vx:vw.x,vy:vw.y}}insp();refresh()});
cv.addEventListener('pointermove',e=>{if(ptr.has(e.pointerId))ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size==2){const d=pd(),m=mid();zoom(d/pin,pt({clientX:m[0],clientY:m[1]}));pin=d;return}if(!drag)return;
 if(drag.m){const q=pt(e);sel.x=q.x-drag.dx;sel.y=q.y-drag.dy;edited=1}else{const k=(900/vw.z)/cv.getBoundingClientRect().width;vw.x=drag.vx-(e.clientX-drag.cx)*k;vw.y=drag.vy-(e.clientY-drag.cy)*k}drawCV()});
['pointerup','pointercancel'].forEach(t=>addEventListener(t,e=>{ptr.delete(e.pointerId);if(!drag)return;if(drag.m&&sel&&man(sel))set(sel.bind,0);drag=null;refresh()}));
function zoom(f,q){const n=cl(vw.z*f,.3,4),w0=900/vw.z,w1=900/n;q=q||{x:vw.x+w0/2,y:vw.y+210/vw.z};vw.x=q.x-(q.x-vw.x)*(w1/w0);vw.y=q.y-(q.y-vw.y)*(w1/w0);vw.z=n;drawCV()}
cv.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15,pt(e))},{passive:false});
$('#zin').onclick=()=>zoom(1.25);$('#zout').onclick=()=>zoom(.8);$('#zfit').onclick=()=>{vw={x:0,y:0,z:1};drawCV()};
function place(k,x,y){const d=ISA[k];sel=d.inst?add('inst',x,y,d.inst+'-'+(100+uid),'',{io:d.io}):add(k,x,y,d.p+'-'+(100+uid));selL=null;edited=1;insp();drawCV()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;place(b.dataset.add,80+(uid%8)*40,60+(uid%5)*30);if($('section.act').id!='proceso')go('proceso')});
document.addEventListener('dragstart',e=>{const b=e.target.closest&&e.target.closest('[data-add]');if(b)e.dataTransfer.setData('text',b.dataset.add)});
cv.addEventListener('dragover',e=>e.preventDefault());
cv.addEventListener('drop',e=>{e.preventDefault();const k=e.dataTransfer.getData('text');if(ISA[k]){const q=pt(e);place(k,q.x-48,q.y-48)}});
$('#q').oninput=e=>{const v=e.target.value.toLowerCase();$$('#libp [data-add]').forEach(b=>{b.hidden=!b.title.toLowerCase().includes(v)})};
function insp(){const o=sel,l=selL,el=$('#insp');tagTable();
 if(l){el.innerHTML=`<h3>Línea</h3><label>Tipo<select id="lk2">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${k==l.k?'selected':''}>${v[0]}</option>`).join('')}</select></label><button id="idel">Eliminar</button>`;
  $('#lk2').onchange=e=>{l.k=e.target.value;drawCV()};$('#idel').onclick=()=>{LN=LN.filter(x=>x!==l);selL=null;insp();drawCV()};return}
 if(!o){el.innerHTML='<p class="mut">Seleccione un símbolo o línea.</p>';return}
 const opts=o.io?['<option value="">Sin asignar</option>'].concat(addrs(o.io).map(a=>`<option ${a==o.bind?'selected':''}>${a}</option>`)):[];
 el.innerHTML=`<h3>${o.type=='inst'?'Instrumento ISA 5.1':ISA[o.type].n}</h3><label>TAG<input id="itag" value="${o.tag}"></label><label>Descripción<input id="idesc" value="${qe(o.desc||'')}"></label><p class="mut">Tipo: ${IOT[o.io]||'Sin E/S'}. Estado: ${o.bind?(o.io=='AI'||o.io=='AO'?Math.round(get(o.bind))+' %':get(o.bind)?'ON':'OFF'):'—'}</p>`+
 (o.type=='inst'?`<label>Ubicación<select id="iloc">${[['F','Campo'],['P','Panel local'],['D','DCS / SCADA'],['C','PLC']].map(([k,v])=>`<option value="${k}" ${k==o.loc?'selected':''}>${v}</option>`).join('')}</select></label>`:'')+
 (o.type=='img'?`<label>Tipo de variable<select id="iio">${['','DI','DO','AI','AO'].map(k=>`<option value="${k}" ${k==o.io?'selected':''}>${k||'Sin variable'}</option>`).join('')}</select></label>`:'')+(o.io?`<label>Dirección en el PLC (${o.io})<select id="ibind">${opts.join('')}</select></label>`:'<p class="mut">Sin E/S asociada.</p>')+
 `<label><input type="checkbox" id="ivt" ${(o.vt??V.tag)?'checked':''}> Mostrar TAG</label><label><input type="checkbox" id="iva" ${(o.va??V.addr)?'checked':''}> Mostrar dirección</label><label>Rotación<select id="irot">${[0,90,180,270].map(r=>`<option ${r==o.r?'selected':''}>${r}</option>`).join('')}</select></label><label>Tamaño<input id="isz" type="range" min="0.8" max="3" step="0.2" value="${o.sz}"></label><button id="idup">Duplicar</button> <button id="idel">Eliminar</button>`;
 $('#itag').oninput=e=>{o.tag=e.target.value;drawCV();tagTable()};if(o.type=='inst')$('#iloc').onchange=e=>{o.loc=e.target.value;drawCV()};
 if(o.io)$('#ibind').onchange=e=>{o.bind=e.target.value;drawCV();tagTable()};if(o.type=='img')$('#iio').onchange=e=>{o.io=e.target.value;o.bind='';insp();drawCV()};
 $('#irot').onchange=e=>{o.r=+e.target.value;drawCV()};$('#idesc').oninput=e=>{o.desc=e.target.value;drawCV()};$('#ivt').onchange=e=>{o.vt=e.target.checked;drawCV()};$('#iva').onchange=e=>{o.va=e.target.checked;drawCV()};$('#isz').oninput=e=>{o.sz=+e.target.value;drawCV()};
 $('#idup').onclick=()=>{sel=add(o.type,o.x+30,o.y+30,o.tag,'',{io:o.io,loc:o.loc,r:o.r,sz:o.sz});edited=1;insp();drawCV()};
 $('#idel').onclick=()=>{P=P.filter(x=>x!==o);LN=LN.filter(l=>l.a.id!=o.id&&l.b.id!=o.id);sel=null;edited=1;insp();drawCV()}}

ISA.img={n:'Gráfico importado',c:'Importado',p:'IMG',s:'',io:''};
const ptr=new Map();let pin=1;
const pd=()=>{const[a,b]=[...ptr.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])||1},mid=()=>{const[a,b]=[...ptr.values()];return[(a[0]+b[0])/2,(a[1]+b[1])/2]};
$('#impb').onclick=()=>$('#imp').click();
$('#imp').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(!/^image\/(svg\+xml|png|jpeg|webp)$/.test(f.type)||f.size>2e6){log('warn','Gráfico no válido. Use SVG, PNG, JPG o WebP de máximo 2 MB.');return dockTo('diag')}
 const r=new FileReader();r.onload=()=>{sel=add('img',120+(uid%6)*30,80+(uid%5)*30,'IMG-'+(100+uid),'',{href:r.result,io:''});selL=null;edited=1;insp();drawCV();log('ok','Gráfico importado: '+f.name)};r.readAsDataURL(f)};
function tagTable(){const cnt={};P.forEach(o=>{if(o.bind)cnt[o.bind]=(cnt[o.bind]||0)+1});
 $('#tagt').innerHTML='<tr><th>TAG</th><th>Elemento</th><th>E/S</th><th>Dirección</th></tr>'+P.map(o=>`<tr><td>${o.tag}</td><td>${o.type=='inst'?'Instrumento ISA 5.1':ISA[o.type].n}</td><td>${o.io||'—'}</td><td>${o.io?`<select data-id="${o.id}" class="${cnt[o.bind]
