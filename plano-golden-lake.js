// ============================================================
//  Costo SV — Plano interactivo de la lotificación de Golden Lake
//  Se carga solo en golden-lake.html (seccion .gl-plano). Adaptado de un
//  prototipo armado con Walter: mismo plano/poligonos/lotes, pero con la
//  paleta e interacciones ya conectadas a como se ven el resto de la
//  pagina. Ids de esta seccion prefijados "gl-plano-" para no chocar con
//  el resto de golden-lake.html.
// ============================================================
(function () {
'use strict';

const WA = "50370381941";
const WA_TXT = "+503 7038-1941";

const POLY = {
  1:{m2:6701.54,lotes:19}, 2:{m2:3645.33,lotes:8}, 3:{m2:5104.52,lotes:14}, 4:{m2:5146.21,lotes:14},
  5:{m2:4750.26,lotes:12}, 6:{m2:7248.22,lotes:14}, 7:{m2:3573.42,lotes:7}, 8:{m2:4161.61,lotes:10},
  9:{m2:3845.34,lotes:6}, 10:{m2:5811.00,lotes:7,nota:"Lotes amplios frente a las lagunas: de 785 a 839 m² cada uno."},
  11:{m2:4585.36,lotes:4,nota:"Incluye el lote más grande del proyecto: 2,172 m²."}
};

/* Para ubicar una propiedad: pon su polígono y lote y las coordenadas del pin (x,y) en el plano. */
const PROPS = [
  {
    id:"clovis", n:1, name:"Casa nueva en Golden Lake", sub:"Polígono 7 · Lote 5 · Porción 1 disponible",
    tag:"Disponible · $350K", price:"$350,000", priceRegular:"$400,000", priceNote:"Promoción en planos · amueblada · entrega diciembre 2026", poly:7, lote:"5", xy:[544,735],
    kv:[["Terreno","308.33 m² (441 v²), con título propio"],["Medidas","≈ 10 m de frente × 31 m de fondo"],["Frente a","Calle Barcelona"],["Acceso","A pocos metros de la entrada principal"]],
    units:[
      {t:"Porción 1 · 308.33 m²", s:"Disponible", ok:true},
      {t:"Porción 2 · 314.57 m²", s:"Reservada", res:true}
    ]
  },
  {
    id:"mansion", n:2, name:"Mansión", sub:"Ubicación dentro del proyecto por confirmar",
    price:"$2,700,000", priceNote:"", poly:null, lote:null, xy:null,
    kv:[["Tipo","Residencia de lujo"]]
  },
  {
    id:"terreno", n:3, name:"Terreno", sub:"Ubicación dentro del proyecto por confirmar",
    price:"$129,900", priceNote:"negociable", poly:null, lote:null, xy:null,
    kv:[["Tipo","Lote para construir"],["Terreno","659 v² (460.63 m²)"]]
  }
];

const $ = s => document.querySelector(s);
const fmt = n => n.toLocaleString("es-SV",{maximumFractionDigits:0});
const fmt2 = n => n.toLocaleString("es-SV",{minimumFractionDigits:2,maximumFractionDigits:2});
const v2 = m2 => fmt(m2*1.43115);
const waLink = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;

function renderPins(){
  const g = $("#gl-plano-pins"); g.innerHTML = "";
  PROPS.filter(p=>p.xy).forEach(p=>{
    const ns="http://www.w3.org/2000/svg";
    const pin=document.createElementNS(ns,"g");
    pin.setAttribute("class","pin"); pin.dataset.id=p.id;
    pin.setAttribute("transform",`translate(${p.xy[0]} ${p.xy[1]})`);
    pin.setAttribute("tabindex","0"); pin.setAttribute("role","button");
    pin.setAttribute("aria-label",`${p.name}, ${p.price}`);
    const tag=p.tag||p.price; const w=tag.length*11+22;
    pin.innerHTML=`<circle class="halo" r="26"/><g class="tag" transform="translate(24 -46)"><rect width="${w}" height="32" rx="16"/><text x="${w/2}" y="22" text-anchor="middle">${tag}</text></g><circle class="dot" r="18"/><text y="7">${p.n}</text>`;
    pin.addEventListener("click",e=>{e.stopPropagation();showProp(p.id)});
    pin.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showProp(p.id)}});
    g.appendChild(pin);
  });
}

function renderList(){
  const list=$("#gl-plano-list");
  // Solo se listan las que tienen ubicación real en el plano (xy) -- Mansión
  // y Terreno todavía no tienen lote asignado, así que no aparecen acá hasta
  // que Walter confirme dónde van (siguen en PROPS, listas para reactivarse).
  PROPS.filter(p=>p.xy).forEach(p=>{
    const b=document.createElement("button");
    b.type="button"; b.className="prop"; b.dataset.id=p.id;
    b.innerHTML=`<span class="n ${p.xy?"":"off"}">${p.n}</span><span class="t"><b>${p.name}</b><span>${p.sub}</span></span><span class="p">${p.price}</span>`;
    b.addEventListener("click",()=>showProp(p.id));
    list.appendChild(b);
  });
}

function clearSel(){
  document.querySelectorAll(".sel").forEach(el=>el.classList.remove("sel"));
}

function showProp(id){
  const p=PROPS.find(x=>x.id===id); if(!p) return;
  clearSel();
  document.querySelectorAll(`[data-id="${id}"]`).forEach(el=>el.classList.add("sel"));
  if(p.poly) document.querySelector(`.block[data-p="${p.poly}"]`)?.classList.add("sel");
  if(p.poly==7) document.querySelector(`.lot7[data-lot="${p.lote}"]`)?.classList.add("sel");
  const units=(p.units||[]).map(u=>`<div class="unit"><strong>${u.t}</strong><span class="status ${u.ok?"ok":""} ${u.res?"res":""}">${u.s}</span></div>`).join("");
  const kv=p.kv.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("");
  const where=p.poly?`Polígono ${p.poly}, Lote ${p.lote}`:"Por confirmar";
  const msg=`Hola Walter, me interesa la propiedad en Golden Lake: ${p.name} (${p.price}). ¿Podemos agendar una visita?`;
  $("#gl-plano-panel").innerHTML=`
    <div class="eyebrow">Propiedad ${p.n} · Golden Lake</div>
    <h2>${p.name}</h2>
    ${p.priceRegular?`<div style="font-size:15px;color:var(--muted);text-decoration:line-through;margin-bottom:2px">${p.priceRegular}</div>`:""}
    <div class="price">${p.price}</div>
    ${p.priceNote?`<div class="note" style="margin:0">${p.priceNote}</div>`:""}
    <dl class="kv"><dt>Ubicación</dt><dd>${where}</dd>${kv}</dl>
    ${units?`<div class="units">${units}</div>`:""}
    <a class="cta" href="${waLink(msg)}" target="_blank" rel="noopener">Agendar visita por WhatsApp</a>
    <div class="phone">${WA_TXT} · Walter Guerrero, RE/MAX Elite</div>`;
  if(p.xy) scrollToPoint(p.xy);
}

function showPoly(n){
  const d=POLY[n]; clearSel();
  document.querySelector(`.block[data-p="${n}"]`)?.classList.add("sel");
  const here=PROPS.filter(p=>p.poly==n);
  const items=here.length
    ? here.map(p=>`<div class="unit" style="cursor:pointer" data-go="${p.id}"><strong>${p.n} · ${p.name}</strong><span>${p.price} · Lote ${p.lote}</span></div>`).join("")
    : `<p class="note">En este momento no tengo propiedades publicadas en este polígono. Escríbeme y te aviso cuando haya una disponible.</p>`;
  $("#gl-plano-panel").innerHTML=`
    <div class="eyebrow">Polígono ${n}</div>
    <h2>${d.lotes} lotes · ${fmt(d.m2)} m²</h2>
    <dl class="kv"><dt>Área</dt><dd>${fmt(d.m2)} m² (${v2(d.m2)} v²)</dd><dt>Lotes</dt><dd>${d.lotes}</dd><dt>Promedio</dt><dd>${fmt(d.m2/d.lotes)} m² por lote</dd></dl>
    ${d.nota?`<p class="note">${d.nota}</p>`:""}
    <div class="units">${items}</div>
    <a class="cta" href="${waLink(`Hola Walter, me interesa un lote o casa en el Polígono ${n} de Golden Lake.`)}" target="_blank" rel="noopener">Preguntar por el Polígono ${n}</a>
    <div class="phone">${WA_TXT}</div>`;
  $("#gl-plano-panel").querySelectorAll("[data-go]").forEach(el=>el.addEventListener("click",()=>showProp(el.dataset.go)));
}

document.querySelectorAll(".block").forEach(b=>{
  b.setAttribute("tabindex","0"); b.setAttribute("role","button");
  b.setAttribute("aria-label",`Polígono ${b.dataset.p}`);
  b.addEventListener("click",()=>showPoly(b.dataset.p));
  b.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showPoly(b.dataset.p)}});
});

/* Zoom */
let z=1;
const map=$("#gl-plano-map"), sc=$("#gl-plano-mapscroll");
function setZoom(nz){
  const cx=(sc.scrollLeft+sc.clientWidth/2)/sc.scrollWidth, cy=(sc.scrollTop+sc.clientHeight/2)/sc.scrollHeight;
  z=Math.min(3,Math.max(1,nz)); map.style.width=(z*100)+"%";
  requestAnimationFrame(()=>{sc.scrollLeft=cx*sc.scrollWidth-sc.clientWidth/2; sc.scrollTop=cy*sc.scrollHeight-sc.clientHeight/2;});
}
$("#gl-plano-zin").onclick=()=>setZoom(z+.5);
$("#gl-plano-zout").onclick=()=>setZoom(z-.5);
function scrollToPoint([x,y]){
  if(z===1) return;
  const vb=map.viewBox.baseVal;
  sc.scrollLeft=((x-vb.x)/vb.width)*sc.scrollWidth-sc.clientWidth/2;
  sc.scrollTop=((y-vb.y)/vb.height)*sc.scrollHeight-sc.clientHeight/2;
}


/* Áreas por lote leídas del cuadro de áreas del plano */
const LOT_AREA={1:{1:399.45,2:349.5,3:349.5,4:349.5,5:349.5,6:349.5,7:349.5,8:349.5,9:349.5,10:349.5,11:349.5,12:349.5,13:349.5,14:349.5,15:349.5,16:349.5,17:349.5,18:349.5,19:360.59},4:{1:460.63,2:349.5,3:349.5,4:349.5,5:349.5,6:349.5,7:419.95,8:310,9:349.5,10:349.5,11:349.5,12:349.5,13:349.5,14:460.63},5:{1:375.1,2:362.43,3:454.68,4:335,5:691.45,6:409,7:349.5,8:349.5,9:349.5,10:349.5,11:349.5,12:375.1},6:{1:697.32,2:697.32,3:409.17,4:408.47,5:592.34,6:647.81,7:432.18,8:501.83,9:368.15,10:344.13,11:349.5,12:600,13:600,14:600},7:{1:305.72,2:300.33,3:471.64,4:649.13,5:622.9,6:611.94,7:611.74},9:{1:845.34,2:600,3:600,4:600,5:600,6:600},10:{1:784.66,2:838.69,3:838.69,4:838.69,5:838.69,6:838.69,7:832.89},11:{1:832.93,2:838.69,3:742.0,4:2171.74}};
const POLY_WHERE={1:"Franja este, sobre Calle Málaga",2:"Junto a la entrada, sobre la calle interna sur",3:"Entre Calle Valencia y Calle Málaga, al sur de Calle Granada",4:"Entre Calle Valencia y Calle Málaga, al norte de Calle Granada",5:"Al este de las lagunas, sobre Calle Andalucía",6:"Centro del proyecto, entre Calle Andalucía y Calle Valencia",7:"Franja frente al Bulevar Costa del Sol, sobre Calle Barcelona",8:"Entre Calle Andalucía y Calle Barcelona",9:"Franja oeste, sobre Calle Cádiz",10:"Frente a las lagunas y el área verde recreativa",11:"Franja norte, junto a la Calzada Jaltepeque"};
function showLot(p,n){
  if(p==7) return (LOT7_HOUSE[n]?showProp(LOT7_HOUSE[n]):showLot7(n));
  clearSel();
  document.querySelector(`.cell[data-p="${p}"][data-lot="${n}"]`)?.classList.add("sel");
  const d=POLY[p], a=LOT_AREA[p]?.[n];
  const size=a?`${fmt2(a)} m² (${v2(a)} v²)`:`Alrededor de ${fmt(d.m2/d.lotes)} m² (promedio del polígono)`;
  $("#gl-plano-panel").innerHTML=`
    <div class="eyebrow">Polígono ${p} · Lote ${n}</div>
    <h2>Lote ${n}</h2>
    <dl class="kv"><dt>Ubicación</dt><dd>${POLY_WHERE[p]}</dd><dt>Tamaño</dt><dd>${size}</dd><dt>Polígono</dt><dd>${d.lotes} lotes · ${fmt(d.m2)} m² en total</dd></dl>
    ${d.nota?`<p class="note">${d.nota}</p>`:""}
    <p class="note">Consulta si este lote está disponible o si hay una casa en venta en este polígono.</p>
    <a class="cta" href="${waLink(`Hola Walter, me interesa el Lote ${n} del Polígono ${p} en Golden Lake.`)}" target="_blank" rel="noopener">Preguntar por el Lote ${n}</a>
    <div class="phone">${WA_TXT}</div>`;
}
/* Lotes del Polígono 7 */
const LOT7_HOUSE = {5:"clovis"};
document.querySelectorAll(".lot7").forEach(el=>{
  const n=+el.dataset.lot;
  if(LOT7_HOUSE[n]) el.classList.add("house");
  el.setAttribute("tabindex","0"); el.setAttribute("role","button");
  el.setAttribute("aria-label",`Polígono 7, Lote ${n}`);
  const go=()=>{ if(LOT7_HOUSE[n]) return showProp(LOT7_HOUSE[n]); showLot7(n); };
  el.addEventListener("click",e=>{e.stopPropagation();go()});
  el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}});
});
function showLot7(n){
  clearSel();
  document.querySelector(`.lot7[data-lot="${n}"]`)?.classList.add("sel");
  $("#gl-plano-panel").innerHTML=`
    <div class="eyebrow">Polígono 7 · Lote ${n}</div>
    <h2>Lote ${n}</h2>
    <dl class="kv"><dt>Polígono</dt><dd>7 · franja frente al Bulevar Costa del Sol</dd><dt>Frente a</dt><dd>Calle Barcelona</dd><dt>Tamaño</dt><dd>${fmt2(LOT_AREA[7][n])} m² (${v2(LOT_AREA[7][n])} v²)</dd></dl>
    <p class="note">Pregúntame por la disponibilidad de este lote y por las casas que se están construyendo en el Polígono 7.</p>
    <a class="cta" href="${waLink(`Hola Walter, me interesa el Lote ${n} del Polígono 7 en Golden Lake.`)}" target="_blank" rel="noopener">Preguntar por el Lote ${n}</a>
    <div class="phone">${WA_TXT}</div>`;
}

/* Decoración: rayado de lotes, árboles, palmeras, reflejos */
(function deco(){
  const ns="http://www.w3.org/2000/svg", mk=(t,a)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e};
  const hatch=$("#gl-plano-hatch");
  document.querySelectorAll("#gl-plano-blocks .block").forEach(b=>{ if(b.dataset.p!=="7"){const c=b.cloneNode();c.removeAttribute("filter");c.setAttribute("class","lothatch");c.removeAttribute("data-p");hatch.appendChild(c);} });
  const green=$("#gl-plano-greenpath"), lags=["#gl-plano-lag1","#gl-plano-lag2","#gl-plano-lag3"].map(q=>$(q)), svg=$("#gl-plano-map");
  const pt=svg.createSVGPoint(); let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  const trees=$("#gl-plano-trees"); let n=0,tries=0;
  while(n<70&&tries<3000){tries++;
    pt.x=440+rnd()*460; pt.y=120+rnd()*420;
    if(!green.isPointInFill(pt)) continue;
    if(lags.some(l=>{const p=svg.createSVGPoint();p.x=pt.x;p.y=pt.y;const m=l.getCTM&&null;return l.isPointInFill(p)||l.isPointInStroke(p)})) continue;
    let near=false; for(const l of lags){const bb=l.getBBox(); if(pt.x>bb.x-10&&pt.x<bb.x+bb.width+10&&pt.y>bb.y-10&&pt.y<bb.y+bb.height+10){near=true;break}}
    if(near) continue;
    const r=5+rnd()*7; trees.appendChild(mk("circle",{cx:pt.x.toFixed(1),cy:pt.y.toFixed(1),r:r.toFixed(1),class:"tree"+(rnd()>.6?" hi":"")})); n++;
  }
  const palms=$("#gl-plano-palms");
  for(let x=230;x<1340;x+=62){const y=792+(x-200)*0.1897;
    const g=mk("g",{transform:`translate(${x} ${(y+34).toFixed(1)})`,class:"palm"});
    ["M0 0 q-10 -6 -16 2","M0 0 q10 -6 16 2","M0 0 q-4 -12 -12 -14","M0 0 q4 -12 12 -14"].forEach(d=>g.appendChild(mk("path",{d})));
    palms.appendChild(g);}
  const rip=$("#gl-plano-ripples");
  [[682,208,70,30],[676,322,54,28],[466,258,26,80]].forEach(([cx,cy,rx,ry],i)=>{
    rip.appendChild(mk("ellipse",{cx,cy:cy+10,rx,ry,class:"ripple",style:`animation-delay:${i*1.3}s`}));
    rip.appendChild(mk("ellipse",{cx,cy:cy+10,rx:rx*.6,ry:ry*.6,class:"ripple",style:`animation-delay:${i*1.3+2}s`}));
  });
  /* escalonar la entrada de los bloques */
  document.querySelectorAll("#gl-plano-blocks .block,#gl-plano-p7 .lot7").forEach((b,i)=>b.style.animationDelay=(i*40)+"ms");
})();

/* Lotes de cada polígono (divisiones aproximadas según el plano) */
(function lots(){
  const ns="http://www.w3.org/2000/svg", mk=(t,a)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e};
  const g=$("#gl-plano-lotlines"), cells=$("#gl-plano-cells"), hidden=mk("g",{visibility:"hidden"}); $("#gl-plano-map").appendChild(hidden);
  const B=[
    {p:9,rails:["M360 382 L288 674","M405 382 L386 674"],cols:6},
    {p:4,rails:["M1074 174 L1048 454","M1128 186 L1108 458","M1180 198 L1167 460"],cols:7},
    {p:3,rails:["M1026 498 L1022 808","M1093 500 L1081 814","M1160 502 L1141 818"],cols:7},
    {p:5,rails:["M907 148 C924 262 920 390 890 442","M973 156 L956 442","M1040 166 L1021 442"],cols:6},
    {p:1,rails:["M1213 210 L1168 942","M1288 224 L1235 956"],cols:19},
    {p:2,rails:["M814 820 L1134 860","M822 868 L1132 934"],cols:8},
    {p:6,rails:["M760 606 L816 786","M880 492 L905 788","M988 488 L990 782"],cols:7},
    {p:8,rails:["M414 600 C520 613 620 610 704 598","M414 646 L742 682","M414 690 L782 766"],cols:5},
    {p:10,rails:["M444 472 C560 527 720 522 820 442 C850 402 865 362 868 320","M434 558 C560 583 760 570 856 460 C878 430 898 390 903 320"],cols:7},
    {p:11,rails:["M592 104 L870 118","M592 143 L800 148"],cols:4}
  ];
  const pathOf=d=>{const p=mk("path",{d});hidden.appendChild(p);return p};
  B.forEach(b=>{
    const rows=b.rails.length-1, P=b.p, rails=b.rails.map(pathOf);
    for(let r=1;r<rows;r++) g.appendChild(mk("path",{d:b.rails[r],class:"lotline2"}));
    for(let r=0;r<rows;r++){
      const nums=Array.from({length:b.cols},(_,k)=>r*b.cols+k+1); if(r%2) nums.reverse();
      const areas=nums.map(n=>LOT_AREA[P]?.[n]??1), tot=areas.reduce((x,y)=>x+y,0);
      let acc=0; const fr=[0,...areas.map(v=>(acc+=v)/tot)];
      const at=(p,t)=>p.getPointAtLength(p.getTotalLength()*t);
      const A=fr.map(t=>at(rails[r],t)), Bp=fr.map(t=>at(rails[r+1],t));
      for(let k=1;k<b.cols;k++) g.appendChild(mk("line",{x1:A[k].x,y1:A[k].y,x2:Bp[k].x,y2:Bp[k].y,class:"lotline2"}));
      nums.forEach((N,k)=>{
        const c=[A[k],A[k+1],Bp[k],Bp[k+1]];
        const cell=mk("path",{d:`M${c[0].x} ${c[0].y} L${c[1].x} ${c[1].y} L${c[3].x} ${c[3].y} L${c[2].x} ${c[2].y} Z`,class:"cell",tabindex:"0",role:"button","aria-label":`Polígono ${P}, Lote ${N}`});
        cell.dataset.p=P; cell.dataset.lot=N;
        cell.addEventListener("click",e=>{e.stopPropagation();showLot(P,N)});
        cell.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showLot(P,N)}});
        cell.addEventListener("mousemove",e=>tipOn(e,`<b>Polígono ${P} · Lote ${N}</b>${LOT_AREA[P]?.[N]?` · ${fmt(LOT_AREA[P][N])} m²`:""}`));
        cell.addEventListener("mouseleave",tipOff);
        cells.appendChild(cell);
        const t=mk("text",{x:(c.reduce((a,p)=>a+p.x,0)/4).toFixed(1),y:(c.reduce((a,p)=>a+p.y,0)/4+3.5).toFixed(1),class:"lotn"});
        t.textContent=N; g.appendChild(t);
      });
    }
  });
  /* Alumbrado a lo largo de las calles */
  const lamps=$("#gl-plano-lamps");
  ["M402 582 C560 610 760 598 872 472 C935 395 935 230 882 110","M718 590 L800 800","M395 690 L800 776","M420 385 L395 690","M880 460 L1180 480","M1058 168 L1004 800","M1196 205 L1150 950","M800 800 L1150 842"].forEach(d=>{
    const p=mk("path",{d});hidden.appendChild(p);const L=p.getTotalLength();
    for(let l=30;l<L-20;l+=70){const q=p.getPointAtLength(l);lamps.appendChild(mk("circle",{cx:q.x,cy:q.y,r:9,class:"lampglow"}));lamps.appendChild(mk("circle",{cx:q.x,cy:q.y,r:2.2,class:"lamp"}));}
  });
  hidden.remove();
})();

/* Tooltip */
function tipOn(e,html){const tip=$("#gl-plano-tip");tip.innerHTML=html;tip.hidden=false;tip.style.left=(e.clientX+14)+"px";tip.style.top=(e.clientY+14)+"px"}
function tipOff(){$("#gl-plano-tip").hidden=true}
document.querySelectorAll("#gl-plano-blocks .block").forEach(b=>{const d=POLY[b.dataset.p];
  b.addEventListener("mousemove",e=>tipOn(e,`<b>Polígono ${b.dataset.p}</b> · ${d.lotes} lotes · ${fmt(d.m2)} m²`));
  b.addEventListener("mouseleave",tipOff);});
document.querySelectorAll(".lot7").forEach(l=>{
  l.addEventListener("mousemove",e=>tipOn(e,l.dataset.lot==="5"?(l.dataset.por==="2"?`<b>Lote 5 · Porción 2</b> · 314.57 m² · Reservada`:`<b>Lote 5 · Porción 1</b> · 308.33 m² · Disponible · $350,000`):`<b>Polígono 7 · Lote ${l.dataset.lot}</b> · ${fmt(LOT_AREA[7][l.dataset.lot])} m²`));
  l.addEventListener("mouseleave",tipOff);});

[["gl-plano-l-nums","no-nums"],["gl-plano-l-lamps","no-lamps"],["gl-plano-l-trees","no-trees"]].forEach(([id,cls])=>{
  $("#"+id).addEventListener("change",e=>$("#gl-plano-map").classList.toggle(cls,!e.target.checked));
});
document.querySelectorAll("#gl-plano-blocks .block").forEach(b=>b.setAttribute("filter","url(#gl-plano-sh)"));
/* Buscador de lotes y vista 3D */
(function(){
  const sel=$("#gl-plano-f-pol");
  Object.keys(POLY).forEach(p=>{const o=document.createElement("option");o.value=p;o.textContent="Polígono "+p;sel.appendChild(o)});
  sel.value="7";
  const go=()=>{const p=+sel.value, n=+$("#gl-plano-f-lot").value, max=(p==7?7:POLY[p].lotes);
    if(!n||n<1||n>max){$("#gl-plano-f-msg").textContent=`El Polígono ${p} tiene lotes del 1 al ${max}.`;return}
    $("#gl-plano-f-msg").textContent="";
    showLot(p,n);
    const el=document.querySelector(p==7?`.lot7[data-lot="${n}"]`:`.cell[data-p="${p}"][data-lot="${n}"]`);
    if(el&&z>1){const bb=el.getBBox(); scrollToPoint([bb.x+bb.width/2,bb.y+bb.height/2]);}
  };
  $("#gl-plano-f-go").addEventListener("click",go);
  $("#gl-plano-f-lot").addEventListener("keydown",e=>{if(e.key==="Enter")go()});
  $("#gl-plano-tilt").addEventListener("click",e=>{const on=$("#gl-plano-map").classList.toggle("tilt");e.currentTarget.setAttribute("aria-pressed",on);e.currentTarget.textContent=on?"Vista plana":"Vista 3D"});
})();

renderPins(); renderList(); showProp("clovis");

})();