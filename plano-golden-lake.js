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
    /* El lote 4 es el contiguo al 5, que se vendio en noviembre de 2026. Se
       repite la misma oferta (casa en planos) sobre una porcion de este lote.
       Todavia NO esta segregado: el area de cada porcion sale recien cuando el
       topografo la recorta, asi que aca va la medida del lote entero y la de
       la porcion se declara aproximada, nunca inventada al centimetro. */
    id:"casa4", n:1, name:"Casa nueva en Golden Lake", sub:"Polígono 7 · Lote 4 · porción disponible",
    price:"$350,000", priceRegular:"$400,000", priceNote:"Promoción en planos · amueblada · la construcción inicia al reservar", poly:7, lote:"4", xy:[349,772],
    kv:[["Terreno","649.13 m² (929 v²) el lote completo; la casa se levanta sobre una porción de ≈ 325 m²"],["Medidas del lote","20.00 m de frente, con lados de 33.14 y 31.77 m"],["Frente a","Calle Barcelona"],["Acceso","A pocos metros de la entrada principal"]],
    units:[
      {t:"Porción disponible · ≈ 325 m²", s:"Disponible", ok:true},
      {t:"Se segrega al reservar", s:"Por recortar"}
    ]
  },
  {
    id:"clovis", n:2, sinPin:true, name:"Casa nueva en Golden Lake", sub:"Polígono 7 · Lote 5 · vendido",
    price:"$350,000", tag:"Vendida", vendida:true, priceNote:"Vendida en noviembre de 2026. El lote contiguo es el próximo a segregar.", poly:7, lote:"5", xy:[544,735],
    kv:[["Terreno","308.33 m² (441 v²), con título propio"],["Medidas","≈ 10 m de frente × 31 m de fondo"],["Frente a","Calle Barcelona"],["Acceso","A pocos metros de la entrada principal"]],
    units:[
      {t:"Porción 1 · 308.33 m²", s:"Vendida", res:true},
      {t:"Porción 2 · 314.57 m²", s:"Vendida", res:true}
    ]
  },
  {
    id:"mansion", n:3, name:"Mansión", sub:"Ubicación dentro del proyecto por confirmar",
    price:"$2,700,000", priceNote:"", poly:null, lote:null, xy:null,
    kv:[["Tipo","Residencia de lujo"]]
  },
  {
    id:"terreno", n:4, name:"Terreno", sub:"Ubicación dentro del proyecto por confirmar",
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
  PROPS.filter(p=>p.xy&&!p.sinPin).forEach(p=>{
    const ns="http://www.w3.org/2000/svg";
    const pin=document.createElementNS(ns,"g");
    pin.setAttribute("class","pin"); pin.dataset.id=p.id;
    pin.setAttribute("transform",`translate(${p.xy[0]} ${p.xy[1]})`);
    pin.setAttribute("tabindex","0"); pin.setAttribute("role","button");
    pin.setAttribute("aria-label",`${p.name}, ${p.price}`);
    const tag=p.tag||p.price; const w=tag.length*11+22;
    // El globo va a la izquierda cuando a la derecha hay etiquetas del plano.
    const tx=p.tagLeft?-24-w:24;
    pin.innerHTML=`<circle class="halo" r="26"/><g class="tag" transform="translate(${tx} -46)"><rect width="${w}" height="32" rx="16"/><text x="${w/2}" y="22" text-anchor="middle">${tag}</text></g><circle class="dot" r="18"/><text y="7">${p.n}</text>`;
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
  /* Si el lote esta dibujado aparte, se ilumina solo el; si no, la manzana. */
  const lote=p.poly?document.querySelector(`.lot7[data-lot="${p.lote}"]`):null;
  if(lote) lote.classList.add("sel");
  else if(p.poly) document.querySelector(`.block[data-p="${p.poly}"]`)?.classList.add("sel");
  const units=(p.units||[]).map(u=>`<div class="unit"><strong>${u.t}</strong><span class="status ${u.ok?"ok":""} ${u.res?"res":""}">${u.s}</span></div>`).join("");
  const kv=p.kv.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("");
  const where=p.poly?`Polígono ${p.poly}, Lote ${p.lote}`:"Por confirmar";
  const msg=p.vendida
    ? `Hola Walter, vi que ${p.name} (${p.poly?`Polígono ${p.poly}, Lote ${p.lote}`:"Golden Lake"}) ya se vendió. ¿Qué queda disponible en Golden Lake?`
    : `Hola Walter, me interesa la propiedad en Golden Lake: ${p.name} (${p.price}). ¿Podemos agendar una visita?`;
  const cta=p.vendida?"Preguntar qué queda disponible":"Agendar visita por WhatsApp";
  $("#gl-plano-panel").innerHTML=`
    <div class="eyebrow">Propiedad ${p.n} · Golden Lake</div>
    <h2>${p.name}</h2>
    ${p.priceRegular?`<div style="font-size:15px;color:var(--muted);text-decoration:line-through;margin-bottom:2px">${p.priceRegular}</div>`:""}
    <div class="price"${p.vendida?' style="text-decoration:line-through;opacity:.55"':""}>${p.price}</div>
    ${p.priceNote?`<div class="note" style="margin:0">${p.priceNote}</div>`:""}
    <dl class="kv"><dt>Ubicación</dt><dd>${where}</dd>${kv}</dl>
    ${units?`<div class="units">${units}</div>`:""}
    <a class="cta" href="${waLink(msg)}" target="_blank" rel="noopener">${cta}</a>
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
const LOT_AREA={1:{1:399.45,2:349.5,3:349.5,4:349.5,5:349.5,6:349.5,7:349.5,8:349.5,9:349.5,10:349.5,11:349.5,12:349.5,13:349.5,14:349.5,15:349.5,16:349.5,17:349.5,18:349.5,19:360.59},2:{1:380.57,2:380.51,3:454.17,4:471.94,5:638.98,6:468.63,7:474,8:376.53},3:{1:460.63,2:349.5,3:349.5,4:349.5,5:349.5,6:349.5,7:344.13,8:344.13,9:349.5,10:349.5,11:349.5,12:349.5,13:349.5,14:460.63},4:{1:460.63,2:349.5,3:349.5,4:349.5,5:349.5,6:349.5,7:419.95,8:310,9:349.5,10:349.5,11:349.5,12:349.5,13:349.5,14:460.63},5:{1:375.1,2:362.43,3:454.68,4:335,5:691.45,6:409,7:349.5,8:349.5,9:349.5,10:349.5,11:349.5,12:375.1},6:{1:697.32,2:697.32,3:409.17,4:408.47,5:592.34,6:647.81,7:432.18,8:501.83,9:368.15,10:344.13,11:349.5,12:600,13:600,14:600},7:{1:305.72,2:300.35,3:471.64,4:649.13,5:622.9,6:611.94,7:611.74},8:{1:556.85,2:300,3:300,4:300,5:294.63,6:381.63,7:364.75,8:404.52,9:512.61,10:746.62},9:{1:845.34,2:600,3:600,4:600,5:600,6:600},10:{1:784.66,2:838.69,3:838.69,4:838.69,5:838.69,6:838.69,7:832.89},11:{1:832.93,2:838.69,3:742,4:2171.74}};
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
const LOT7_HOUSE = {4:"casa4", 5:"clovis"};
/* Lotes de la 7 partidos en porciones (venta de media parcela). Áreas reales
   cuando Walter las dio (lote 5); los lotes 3 y 4 se partieron en dos mitades
   iguales a falta de medidas topográficas exactas de cada porción.
   Disponibilidad al 18/11/2026: el lote 5 se vendió completo (las dos
   porciones). El próximo a trabajar es el lote contiguo. */
/* Los lotes se venden partidos en dos porciones, pero se recorta una por vez:
   la siguiente se segrega recién cuando se vende la anterior. Por eso el plano
   solo dibuja porciones de los lotes YA segregados; el resto son lotes
   enteros. Al 18/11/2026 el único lote segregado es el 5, ya vendido por
   completo; el próximo a segregar es el 6. */
const LOT7_PORC = {
  5: {1:{area:308.33,estado:"Vendida",medidas:"≈ 10 m de frente × 31 m de fondo"},
      2:{area:314.57,estado:"Vendida"}}
};
/* Lotes enteros: el 6 es el próximo a segregar; del 4 se conocen las medidas
   del plano aunque todavía no se haya partido. */
const LOT7_LOTE = {
  6: {estado:"Por segregar"}
};
document.querySelectorAll(".lot7").forEach(el=>{
  const n=+el.dataset.lot, por=el.dataset.por;
  if(LOT7_HOUSE[n]) el.classList.add("house");
  el.setAttribute("tabindex","0"); el.setAttribute("role","button");
  el.setAttribute("aria-label",`Polígono 7, Lote ${n}${por?` · Porción ${por}`:""}`);
  const go=()=>{ if(LOT7_HOUSE[n]) return showProp(LOT7_HOUSE[n]); showLot7(n,por,el); };
  el.addEventListener("click",e=>{e.stopPropagation();go()});
  el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}});
});
function showLot7(n,por,el){
  clearSel();
  (el||document.querySelector(`.lot7[data-lot="${n}"]`))?.classList.add("sel");
  const porc=por&&LOT7_PORC[n]?.[por];
  const area=porc?porc.area:LOT_AREA[7][n];
  const titulo=`Lote ${n}${por?` · Porción ${por}`:""}`;
  const estado=porc?porc.estado:LOT7_LOTE[n]?.estado;
  const medidas=porc?porc.medidas:LOT7_LOTE[n]?.medidas;
  // Una porción "Por segregar" todavía no existe como parcela: se recorta
  // cuando se vende la anterior. Conviene decirlo para que nadie pregunte
  // por algo que todavía no se puede escriturar.
  const aviso=estado==="Por segregar"
    ? `${por?"Esta porción":"Este lote"} todavía no está segregad${por?"a":"o"}: se recorta una vez vendida la porción anterior. Pregúntame por la disponibilidad.`
    : "Pregúntame por la disponibilidad de este lote y por las casas que se están construyendo en el Polígono 7.";
  $("#gl-plano-panel").innerHTML=`
    <div class="eyebrow">Polígono 7 · ${titulo}</div>
    <h2>${titulo}</h2>
    <dl class="kv"><dt>Polígono</dt><dd>7 · franja frente al Bulevar Costa del Sol</dd><dt>Frente a</dt><dd>Calle Barcelona</dd><dt>Tamaño</dt><dd>${fmt2(area)} m² (${v2(area)} v²)</dd>${medidas?`<dt>Medidas</dt><dd>${medidas}</dd>`:""}${estado?`<dt>Estado</dt><dd>${estado}</dd>`:""}</dl>
    <p class="note">${aviso}</p>
    <a class="cta" href="${waLink(`Hola Walter, me interesa el ${titulo} del Polígono 7 en Golden Lake.`)}" target="_blank" rel="noopener">Preguntar por el ${titulo}</a>
    <div class="phone">${WA_TXT}</div>`;
}

/* El mapa es la foto del plano aprobado, que ya trae su propio dibujo: ya no
   se generan arboles, palmeras ni rayado de lotes. Solo se escalona la
   entrada de las zonas para que no aparezcan todas de golpe. */
document.querySelectorAll("#gl-plano-blocks .block").forEach((b,i)=>b.style.animationDelay=(i*40)+"ms");

/* El mapa es ahora el plano aprobado: no hay lotes dibujados encima, asi que
   la interaccion es por poligono. El lote individual se consulta con el
   buscador de arriba, que sigue dando area, ubicacion y medidas exactas. */

/* Tooltip */
function tipOn(e,html){const tip=$("#gl-plano-tip");tip.innerHTML=html;tip.hidden=false;tip.style.left=(e.clientX+14)+"px";tip.style.top=(e.clientY+14)+"px"}
function tipOff(){$("#gl-plano-tip").hidden=true}
document.querySelectorAll("#gl-plano-blocks .block").forEach(b=>{const d=POLY[b.dataset.p];
  b.addEventListener("mousemove",e=>tipOn(e,`<b>Polígono ${b.dataset.p}</b> · ${d.lotes} lotes · ${fmt(d.m2)} m²`));
  b.addEventListener("mouseleave",tipOff);});
document.querySelectorAll(".lot7").forEach(l=>{
  l.addEventListener("mousemove",e=>{
    const n=l.dataset.lot, por=l.dataset.por, porc=por&&LOT7_PORC[n]?.[por];
    tipOn(e, porc?`<b>Lote ${n} · Porción ${por}</b> · ${fmt2(porc.area)} m² · ${porc.estado}`:`<b>Polígono 7 · Lote ${n}</b> · ${fmt(LOT_AREA[7][n])} m²`);
  });
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
    const el=document.querySelector(`.block[data-p="${p}"]`);
    if(el&&z>1){const bb=el.getBBox(); scrollToPoint([bb.x+bb.width/2,bb.y+bb.height/2]);}
  };
  $("#gl-plano-f-go").addEventListener("click",go);
  $("#gl-plano-f-lot").addEventListener("keydown",e=>{if(e.key==="Enter")go()});
  $("#gl-plano-tilt").addEventListener("click",e=>{const on=$("#gl-plano-map").classList.toggle("tilt");e.currentTarget.setAttribute("aria-pressed",on);e.currentTarget.textContent=on?"Vista plana":"Vista 3D"});
})();

renderPins(); renderList(); showProp("casa4");

})();