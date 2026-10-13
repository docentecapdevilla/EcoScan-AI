(function(){
'use strict';
const names={plastic:'plástico',glass:'vidrio',metal:'metal',paper:'papel o cartón',organic:'orgánico',non:'no aprovechable'};
const bin={plastic:'caneca blanca, si está limpio y seco',glass:'caneca blanca, si es envase aprovechable y está limpio y seco',metal:'caneca blanca, si está limpio y seco',paper:'caneca blanca, si está limpio y seco',organic:'caneca verde, si es residuo orgánico aprovechable',non:'caneca negra, si es residuo no aprovechable'};
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_-]/g,' ')}
function material(s,source){const t=norm(s);
 // No deducir plástico a partir de «water bottle», ni material de «reusable».
 if(/\b(plastic|plastico|pet container|hdpe container|styrofoam|polystyrene)\b/.test(t))return 'plastic';
 if(/\b(glass|vidrio)\b/.test(t))return 'glass';
 if(/\b(aluminum|aluminium|metal|metalic|metalico|lata de aluminio|tin can)\b/.test(t))return 'metal';
 if(/\b(paper|papel|cardboard|carton)\b/.test(t))return 'paper';
 if(/\b(organic|organico|biodegradable|food waste|fruit peel)\b/.test(t))return 'organic';
 if(/\b(non recyclable|no reciclable|no aprovechable|non recyclable waste)\b/.test(t))return 'non';
 return null;
}
function resolve(last){
 const evidence=[];
 const ys=last.yolo?.value;
 if(Array.isArray(ys)){
  const grouped=new Map();
  for(const d of ys){const m=material(d.label,'yolo');if(m && Number(d.confidence)>=0.25){const prev=grouped.get(m)||0;grouped.set(m,Math.max(prev,Number(d.confidence)))}}
  // Un voto máximo por material y por modelo; duplicados no aumentan votos.
  for(const [m,confidence] of grouped)evidence.push({source:'yolo',material:m,confidence});
 }
 const w=last.wasteV2?.value;
 if(w){const m=material(w.label_es||w.label||w.class_name,'wasteV2');if(m)evidence.push({source:'wasteV2',material:m,confidence:Number(w.confidence)||0})}
 const mo=last.mobile?.value;
 if(Array.isArray(mo)){
  const top=mo[0];if(top){const m=material(top.className,'mobile');if(m)evidence.push({source:'mobile',material:m,confidence:Number(top.probability)||0})}
 }
 const bi=last.binary?.value;
 // «Reusable» no es material. «Organic» es evidencia débil de orgánico.
 if(bi&&norm(bi.label)==='organic')evidence.push({source:'binary',material:'organic',confidence:Number(bi.confidence)||0});
 const counts={};for(const e of evidence){counts[e.material]??=new Set();counts[e.material].add(e.source)}
 const ranking=Object.entries(counts).map(([key,sources])=>({key,n:sources.size})).sort((a,b)=>b.n-a.n);
 const first=ranking[0];
 if(!first)return {material:'',votes:0,level:'Sin evidencia suficiente',text:'No hay suficientes indicios sobre el material. Acerca el objeto, mejora la iluminación y vuelve a analizar.',bin:'Caneca pendiente de verificación.'};
 const tie=ranking[1]?.n===first.n;
 if(tie)return {material:'',votes:first.n,level:'Resultado no concluyente',text:`Se encontraron indicios de ${names[first.key]} y ${names[ranking[1].key]} con el mismo número de coincidencias independientes. Revisa la imagen y confirma el material.`,bin:'Caneca pendiente de verificación.'};
 const n=first.n,other=ranking.filter(x=>x.key!==first.key);
 const level=n>=3?'Coincidencia muy alta':n===2?'Alta coincidencia':'Coincidencia inicial';
 const intro=n>=3?`Los análisis coinciden ampliamente en que el residuo podría ser ${names[first.key]}.`:n===2?`Hay una alta coincidencia que indica que el residuo probablemente es ${names[first.key]}.`:`La imagen posiblemente muestra un residuo de ${names[first.key]}, pero solo hay una identificación independiente.`;
 const caution=other.length?` También aparecieron indicios de ${other.map(x=>names[x.key]).join(' y ')}; podrían corresponder a otro objeto o a una detección equivocada.`:'';
 const end=n>=2?` Si se confirma el material, su destino orientativo es la ${bin[first.key]}.`:' Antes de elegir la caneca, confirma el material físicamente.';
 return {material:first.key,votes:n,level,text:intro+caution+end+' La clasificación depende también de la limpieza y de las normas locales.',bin:n>=2?'Destino orientativo: '+bin[first.key]+'.':'Caneca pendiente de verificación.'};
}
window.EcoScanCoincidencias={resolve};
})();
