(() => {
  'use strict';
  const css=document.createElement('style');css.textContent='#viewer video[hidden],#viewer img[hidden],#viewer #placeholder[hidden]{display:none !important}';document.head.append(css);
  const $=id=>document.getElementById(id), video=$('camera'), photo=$('photo'), overlay=$('overlay'), status=$('status');
  let stream=null, active=false, busy=false, timer=null, mobilenetModel=null, binaryModel=null, current=null, last={}, history=[], generation=0, liveEpoch=0, lastAnalyzedImageHash=null;
  const PLASTIC=new Set(['PET_CONTAINER','HDPE_CONTAINER','PLASTIC_WRAPPER','PLASTIC_BAG','PLASTIC_CUP','STYROFOAM','PLASTIC']);
  const pretty=s=>String(s||'').replaceAll('_',' ').toLowerCase();
  const pct=x=>Number.isFinite(x)?(x*100).toFixed(1)+' %':'—';
  const row=(a)=>{const tr=document.createElement('tr');a.forEach(x=>{const td=document.createElement('td');td.textContent=String(x);tr.append(td)});return tr};
  function show(id){video.hidden=id!=='camera';photo.hidden=id!=='photo';$('placeholder').hidden=!!id}
  function clearView(){generation++;current=null;last={};photo.removeAttribute('src');photo.hidden=true;video.hidden=true;overlay.width=0;overlay.height=0;show(null);$('results').replaceChildren(row(['Sin resultados todavía.','','','','']));$('summary').textContent='Pendiente de análisis';$('decision').textContent='El destino del residuo requiere confirmar material, limpieza y contexto.';$('analyzeBtn').disabled=true;validationUI.hide()}
  function stop(){active=false;liveEpoch++;clearTimeout(timer);timer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.srcObject=null;$('captureBtn').disabled=true;$('stopBtn').disabled=true;$('cameraBtn').textContent='📷 Activar cámara'}
  async function loadModels(){try{if(!window.tf||!window.mobilenet)throw Error('No cargó TensorFlow.js (revisa Internet)');mobilenetModel=await mobilenet.load();status.textContent='MobileNet listo; YOLO se ejecuta desde Python.'}catch(e){status.textContent='MobileNet no disponible: '+e.message}try{if(window.tf)binaryModel=await tf.loadLayersModel('models/waste-binary/model.json')}catch(e){console.warn('Modelo experimental no disponible',e)}}
  function capture(){const el=active?video:photo;if(!el || (active&&!video.videoWidth)||(!active&&!photo.naturalWidth))return null;const w=active?video.videoWidth:photo.naturalWidth,h=active?video.videoHeight:photo.naturalHeight;const s=Math.min(1,640/w),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*s));c.height=Math.max(1,Math.round(h*s));c.getContext('2d').drawImage(el,0,0,c.width,c.height);return c}
  function blobOf(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('No se pudo capturar imagen')),'image/jpeg',.8))}
  async function yolo(c){const res=await fetch('/api/detect',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:await blobOf(c)});const j=await res.json();if(!res.ok)throw Error(j.error||'Error YOLO');return j.detections||[]}
  async function wasteV2(c){const res=await fetch('/api/waste-classify',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:await blobOf(c)});const j=await res.json();if(!res.ok)throw Error(j.error||'Error MobileNetV2');return j}
  async function mobile(c){if(!mobilenetModel)throw Error('No disponible');return await mobilenetModel.classify(c)}
  async function binary(c){if(!binaryModel)throw Error('No disponible');const input=tf.tidy(()=>tf.browser.fromPixels(c).resizeBilinear([224,224]).toFloat().div(127.5).sub(1).expandDims(0));let pred;try{pred=binaryModel.predict(input);const values=Array.from(await pred.data());if(values.length!==2)throw Error('Salida inesperada');const idx=values[0]>=values[1]?0:1;return {label:['Organic','Reusable'][idx],confidence:values[idx]}}finally{input.dispose();if(pred&&typeof pred.dispose==='function')pred.dispose()}}
  function paint(c,detections){overlay.width=c.width;overlay.height=c.height;const ctx=overlay.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.lineWidth=3;ctx.font='bold 13px system-ui';for(const d of detections){const [x1,y1,x2,y2]=d.box,pl=PLASTIC.has(String(d.label).toUpperCase());ctx.strokeStyle=pl?'#00e2a0':'#ffb04b';ctx.strokeRect(x1,y1,x2-x1,y2-y1);const label=pretty(d.label)+' '+pct(d.confidence),tw=ctx.measureText(label).width+10;ctx.fillStyle='#15271ee6';ctx.fillRect(x1,Math.max(0,y1-22),tw,21);ctx.fillStyle='#fff';ctx.fillText(label,x1+5,Math.max(14,y1-7))}}
  function drawTable(){const body=$('results');body.replaceChildren();const ys=last.yolo;if(ys.error)body.append(row(['YOLOv8','Residuos y ubicación','Error','—',ys.error]));else if(ys.value){const ds=ys.value;const pl=ds.filter(d=>PLASTIC.has(String(d.label).toUpperCase()));const top=[...ds].sort((a,b)=>b.confidence-a.confidence)[0];body.append(row(['YOLOv8','Detecta clases de residuos',ds.length?ds.map(d=>pretty(d.label)).join('; '):'Sin detecciones',top?pct(top.confidence):'—',pl.length?`Indicios de plástico (${pl.length} detección/es). Confirmar material.`:'No detectó clase plástica; no prueba ausencia de plástico.']))}const m=last.mobile;if(m.error)body.append(row(['MobileNet','Reconocimiento general','Error','—',m.error]));else if(m.value){const t=m.value[0];body.append(row(['MobileNet','Identifica objetos',t?.className||'Sin resultado',t?pct(t.probability):'—','Reconoce objetos, no certifica material ni reciclabilidad.']))}const b=last.binary;if(b.error)body.append(row(['Experimental','Orgánico / reutilizable','No disponible','—',b.error]));else if(b.value)body.append(row(['Experimental','Clasificación binaria',b.value.label,pct(b.value.confidence),'Solo dos clases; no identifica plástico específicamente.']));const v=last.wasteV2||{};if(v.error)body.append(row(['MobileNetV2 Residuos','Clasifica material','No disponible','—',v.error]));else if(v.value)body.append(row(['MobileNetV2 Residuos','Seis tipos de residuos',v.value.label_es,pct(v.value.confidence),'Clasifica la imagen completa; no localiza objetos ni confirma la caneca.']));const pl=(ys.value||[]).filter(d=>PLASTIC.has(String(d.label).toUpperCase()));$('summary').textContent=pl.length?'Posible plástico detectado por YOLO; requiere verificación':ys.value?.length?'Residuos detectados; material por verificar':'No se puede confirmar el material'}

  // Paneles separados: registro del estudiante y revisión diferida del docente.
  const validationPanel = window.EcoScanValidation.createPanel();
  const teacherPanel = window.EcoScanValidation.createTeacherReviewPanel();
  const imagePanel = window.EcoScanValidation.createImageViewerPanel();
  const validationUI = window.EcoScanValidation.initStudentValidation(validationPanel, {
    onSave: (record) => {
      refreshHistory();
      status.textContent = `💾 Evidencia pendiente guardada. Total: ${window.EcoScanDataStore.getAllRecords().length}.`;
    }
  });
  const teacherUI = window.EcoScanValidation.initTeacherReview(teacherPanel, {
    onValidate: () => { refreshHistory(); status.textContent='✅ Validación docente guardada.'; }
  });
  const imageUI = window.EcoScanValidation.initImageViewer(imagePanel, {});
  const viewerContainer = $('viewer');
  viewerContainer.parentNode.insertBefore(validationPanel, viewerContainer.nextSibling);
  validationPanel.insertAdjacentElement('afterend', teacherPanel);
  teacherPanel.insertAdjacentElement('afterend', imagePanel);
  function refreshHistory(){
    history = window.EcoScanDataStore.getAllRecords().slice().reverse().map(record => ({
      time: record.isoTimestamp || new Date(record.timestamp).toLocaleString('es-CO'),
      source: record.source || '—',
      yolo: (record.predictions?.yolo?.detections || []).map(d=>`${pretty(d.label)} ${pct(d.confidence)}`).join(' | ') || 'Sin detecciones',
      mobile: record.predictions?.mobilenet?.predictions?.[0]?.className || 'No disponible',
      binary: record.predictions?.binary?.label || 'No disponible',
      wasteV2: record.predictions?.mobilenetV2?.label_es || 'No disponible',
      material: record.validation?.teacherMaterial || record.validation?.studentMaterial || 'Sin confirmar',
      bin: binFor(record.validation?.teacherMaterial || record.validation?.studentMaterial),
      validationStatus: record.validation?.status || 'pending',
      recordId: record.id
    }));
    historyDraw();
  }
  async function reviewRecord(id){
    const record=window.EcoScanDataStore.getRecordById(id);
    if(!record)return;
    const blob=await window.EcoScanDataStore.getImage(id);
    if(record.validation?.status==='pending'){imageUI.hide();teacherUI.show(record,blob)}
    else {teacherUI.hide();imageUI.show(blob)}
    status.textContent=blob?'Fotografía recuperada para revisión.':'La evidencia no tiene fotografía almacenada en este navegador.';
  }
  async function analyze(){if(busy)return;const epoch=generation;const c=capture();if(!c){status.textContent='Espera a que la cámara muestre imagen.';return}busy=true;$('analyzeBtn').disabled=true;status.textContent='Analizando una captura con cuatro modelos…';last={yolo:{},mobile:{},binary:{},wasteV2:{}};const results=await Promise.allSettled([yolo(c),mobile(c),binary(c),wasteV2(c)]);if(epoch!==generation){busy=false;$('analyzeBtn').disabled=!(active||photo.naturalWidth);return}for(const [i,key] of ['yolo','mobile','binary','wasteV2'].entries()){const r=results[i];last[key]=r.status==='fulfilled'?{value:r.value}:{error:r.reason?.message||'Error desconocido'}}if(last.yolo.value)paint(c,last.yolo.value);else{overlay.width=c.width;overlay.height=c.height}drawTable();const imageBlob=await blobOf(c);const imageHash=window.EcoScanDataStore.hashImage ? await window.EcoScanDataStore.hashImage(imageBlob) : 'hash_'+Date.now();if(imageHash===lastAnalyzedImageHash && active){status.textContent='Análisis en vivo: misma imagen, no se duplica.';busy=false;$('analyzeBtn').disabled=false;return}lastAnalyzedImageHash=imageHash;const verdict=window.EcoScanCoincidencias?.resolve(last);current={source:active?'Cámara':'Fotografía',time:new Date().toLocaleString('es-CO'),active,last,yolo:(last.yolo.value||[]).map(d=>`${pretty(d.label)} ${pct(d.confidence)}`).join(' | ')||'Sin detecciones',mobile:last.mobile.value?.[0]?`${last.mobile.value[0].className} ${pct(last.mobile.value[0].probability)}`:'No disponible',wasteV2:last.wasteV2.value?`${last.wasteV2.value.label_es} ${pct(last.wasteV2.value.confidence)}`:'No disponible',binary:last.binary.value?`${last.binary.value.label} ${pct(last.binary.value.confidence)}`:'No disponible',consensus:verdict,imageBlob,imageHash};if(verdict){$('summary').textContent=verdict.level+(verdict.material?' · '+({plastic:'Plástico',glass:'Vidrio',metal:'Metal',paper:'Papel / cartón',organic:'Orgánico',non:'No aprovechable'})[verdict.material]:'')+(verdict.text?' — '+verdict.text:'')}$('analyzeBtn').disabled=false;busy=false;status.textContent='Análisis completado. Seleccione el material y guarde la evidencia pendiente; el docente la validará después.';validationUI.show({...current,last,consensus:verdict},imageBlob)}

  function cycle(){if(!active||!$('liveMode').checked)return;const run=liveEpoch;analyze().finally(()=>{if(active&&run===liveEpoch&&$('liveMode').checked)timer=setTimeout(cycle,1700)})}
  $('cameraBtn').addEventListener('click',async()=>{if(active){stop();clearView();status.textContent='Cámara detenida.';return}try{stop();clearView();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});video.srcObject=stream;await video.play();active=true;show('camera');$('captureBtn').disabled=false;$('stopBtn').disabled=false;$('cameraBtn').textContent='📷 Cámara activa';$('analyzeBtn').disabled=false;if($('liveMode').checked)cycle()}catch(e){status.textContent='No se pudo abrir la cámara: '+e.message;stop()}});
  $('stopBtn').addEventListener('click',()=>{stop();clearView();status.textContent='Cámara detenida.'});
  $('file').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;stop();clearView();const epoch=generation;const url=URL.createObjectURL(f);photo.onload=()=>{if(epoch!==generation){URL.revokeObjectURL(url);return}URL.revokeObjectURL(url);show('photo');overlay.width=photo.naturalWidth;overlay.height=photo.naturalHeight;$('analyzeBtn').disabled=false;analyze()};photo.src=url;status.textContent='Cargando fotografía…'});
  $('liveMode').addEventListener('change',()=>{liveEpoch++;clearTimeout(timer);timer=null;if(active&&$('liveMode').checked)cycle();else if(active)status.textContent='Cámara lista. Puedes tomar foto o pulsar Analizar ahora.'});
  $('captureBtn').addEventListener('click',async()=>{
    if(!active)return;
    const c=capture();
    if(!c){status.textContent='Espera a que la cámara enfoque y vuelva a intentarlo.';return}
    stop();
    clearView();
    const epoch=generation;
    photo.onload=()=>{
      if(epoch!==generation)return;
      show('photo');
      $('analyzeBtn').disabled=false;
      status.textContent='Fotografía capturada. Analizando los cuatro modelos…';
      analyze();
    };
    photo.src=c.toDataURL('image/jpeg',0.88);
    status.textContent='Fotografía capturada. Preparando análisis…';
  });
  $('analyzeBtn').addEventListener('click',analyze);
  function binFor(v){return ({plastic:'Blanco si limpio y seco',glass:'Blanco si limpio y seco',metal:'Blanco si limpio y seco',paper:'Blanco si limpio y seco',organic:'Verde si es orgánico aprovechable',non:'Negro si es no aprovechable',unknown:'Pendiente de verificación'})[v]||'Pendiente de confirmación'}
  function historyDraw(){
    const body=$('historyBody');body.replaceChildren();
    if(!history.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=10;td.textContent='Sin registros.';tr.append(td);body.append(tr);return}
    history.forEach(h=>{
      const tr=row([h.time,h.source,h.yolo,h.mobile,h.binary,h.wasteV2,h.material,h.bin]);
      const statusCell=document.createElement('td');statusCell.textContent=h.validationStatus==='validated'?'✅ Validado':'⏳ Pendiente';tr.append(statusCell);
      const actions=document.createElement('td');
      const btn=document.createElement('button');btn.type='button';btn.textContent=h.validationStatus==='pending'?'📷 Revisar / validar':'📷 Ver imagen';
      btn.addEventListener('click',()=>reviewRecord(h.recordId));actions.append(btn);tr.append(actions);body.append(tr);
    });
  }
  $('saveBtn').addEventListener('click',()=>{if(!current){status.textContent='Analiza primero una imagen.';return}validationUI.show(current,current.imageBlob)});
  $('clearBtn').addEventListener('click',()=>{if(confirm('¿Eliminar el historial de esta sesión y todos los registros almacenados?')){history=[];window.EcoScanDataStore.clearRecords();historyDraw();status.textContent='Historial y registros eliminados.'}});
  $('exportBtn').addEventListener('click',()=>{const records=window.EcoScanDataStore.getAllRecords();if(!records.length){status.textContent='Primero registra al menos una evidencia.';return}const csv=window.EcoScanDataStore.exportCSV();if(!csv){status.textContent='No hay datos para exportar.';return}const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='EcoScan_registros_completos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='CSV completo exportado.'});
  window.addEventListener('beforeunload',stop);refreshHistory();loadModels();
})();