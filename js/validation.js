(() => {
  'use strict';

  const MATERIAL_OPTIONS = [
    { value: '', label: 'Sin confirmar' },
    { value: 'plastic', label: 'Plástico' },
    { value: 'glass', label: 'Vidrio' },
    { value: 'metal', label: 'Metal' },
    { value: 'paper', label: 'Papel / cartón' },
    { value: 'organic', label: 'Orgánico aprovechable' },
    { value: 'non', label: 'No aprovechable' },
    { value: 'unknown', label: 'Desconocido / No se puede determinar' }
  ];

  function createValidationPanel() {
    const panel = document.createElement('div');
    panel.className = 'material-confirmation';
    panel.hidden = true;
    panel.innerHTML = `
      <h3 id="validationTitle">Validación de la prueba</h3>
      <div class="validation-row" id="studentRow">
        <label for="studentMaterial">Material identificado por el estudiante:</label>
        <select id="studentMaterial">${MATERIAL_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select>
      </div>
      <div class="validation-row">
        <label for="validationNotes">Observaciones (opcional):</label>
        <textarea id="validationNotes" rows="2" placeholder="Ej: residuo sucio, etiqueta ilegible, objeto parcialmente visible..."></textarea>
      </div>
      <div class="validation-actions">
        <button id="savePendingBtn" class="btn-primary">💾 Guardar como pendiente</button>
        <button id="cancelValidationBtn" class="btn-ghost">Cancelar</button>
      </div>
      <p id="validationStatus" class="validation-status"></p>
    `;
    return panel;
  }

  function createTeacherReviewPanel() {
    const panel = document.createElement('div');
    panel.className = 'material-confirmation teacher-review';
    panel.hidden = true;
    panel.innerHTML = `
      <h3>Revisión docente posterior</h3>
      <p class="validation-status">Revisa la fotografía y la respuesta del estudiante antes de confirmar. Esta interfaz local no autentica al docente.</p>
      <div class="validation-row"><label>Fotografía de la evidencia:</label><img id="teacherRecordImage" alt="Fotografía del residuo" style="display:none;max-width:100%;max-height:320px;border-radius:8px"><p id="teacherImageMessage" class="validation-status"></p></div>
      <div class="validation-row"><label>Predicciones originales:</label><div id="teacherPredictionsDisplay" style="white-space:pre-line;padding:10px;background:#f1f5f9;border-radius:8px;color:#334155;"></div></div>
      <div class="validation-row"><label>Consenso:</label><div id="teacherConsensusDisplay"></div></div>
      <div class="validation-row"><label>Fecha de registro:</label><div id="teacherDateDisplay"></div></div>
      <div class="validation-row">
        <label>Respuesta del estudiante:</label>
        <div id="studentAnswerDisplay" style="padding:10px;background:#f1f5f9;border-radius:8px;font-weight:600;color:#334155;">—</div>
      </div>
      <div class="validation-row">
        <label for="teacherMaterial">Material confirmado por el docente:</label>
        <select id="teacherMaterial">${MATERIAL_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select>
      </div>
      <div class="validation-row">
        <label for="validationNotes">Observaciones del docente (opcional):</label>
        <textarea id="validationNotes" rows="2" placeholder="Ej: residuo sucio, etiqueta ilegible, objeto parcialmente visible..."></textarea>
      </div>
      <div class="validation-actions">
        <button id="saveTeacherValidationBtn" class="btn-primary">Guardar validación</button>
        <button id="cancelTeacherValidationBtn" class="btn-ghost">Cancelar</button>
      </div>
      <p id="validationStatus" class="validation-status"></p>
    `;
    return panel;
  }

  function createImageViewerPanel() {
    const panel = document.createElement('div');
    panel.className = 'material-confirmation image-viewer';
    panel.hidden = true;
    panel.innerHTML = `
      <h3>Evidencia fotográfica</h3>
      <div style="text-align:center;margin:12px 0;">
        <img id="recordImage" style="max-width:100%;max-height:300px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);" alt="Fotografía del residuo">
      </div>
      <div class="validation-actions">
        <button id="closeImageViewerBtn" class="btn-ghost">Cerrar</button>
      </div>
    `;
    return panel;
  }

  function createValidationStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .material-confirmation {
        margin: 18px 0;
        padding: 18px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: #f8fafc;
      }
      .material-confirmation[hidden] { display: none !important; }
      .material-confirmation h3 {
        margin: 0 0 16px;
        font-size: 1.1rem;
        color: #1e293b;
      }
      .validation-row {
        margin-bottom: 14px;
      }
      .validation-row label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
        color: #334155;
        font-size: 0.9rem;
      }
      .validation-row select,
      .validation-row textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #94a3b8;
        border-radius: 8px;
        font: inherit;
        background: white;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .validation-row select:focus,
      .validation-row textarea:focus {
        outline: none;
        border-color: #168c58;
        box-shadow: 0 0 0 3px rgba(22, 140, 88, 0.15);
      }
      .validation-row > div[style*="padding"] {
        min-height: 2.5em;
      }
      .validation-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .validation-actions button {
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      .validation-actions button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .validation-actions button:active:not(:disabled) {
        transform: scale(0.98);
      }
      .btn-primary {
        background: #168c58;
        color: white;
      }
      .btn-primary:hover:not(:disabled) {
        background: #137a4d;
      }
      .btn-secondary {
        background: #2479b6;
        color: white;
      }
      .btn-secondary:hover:not(:disabled) {
        background: #1e6aa0;
      }
      .btn-ghost {
        background: transparent;
        color: #475569;
        border: 1px solid #cbd5e1;
      }
      .btn-ghost:hover:not(:disabled) {
        background: #f1f5f9;
      }
      .validation-status {
        margin: 10px 0 0;
        font-size: 0.85rem;
        color: #475569;
        min-height: 1.2em;
      }
      .validation-status.pending { color: #b45309; font-weight: 600; }
      .validation-status.validated { color: #166534; font-weight: 600; }
      .validation-status.error { color: #b91c1c; }
      @media (max-width: 600px) {
        .validation-actions { flex-direction: column; }
        .validation-actions button { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function initStudentValidation(panel, callbacks) {
    const studentSelect = panel.querySelector('#studentMaterial');
    const notesTextarea = panel.querySelector('#validationNotes');
    const pendingBtn = panel.querySelector('#savePendingBtn');
    const cancelBtn = panel.querySelector('#cancelValidationBtn');
    const statusEl = panel.querySelector('#validationStatus');

    let currentAnalysis = null;
    let currentImageBlob = null;

    function show(analysis, imageBlob) {
      currentAnalysis = analysis;
      currentImageBlob = imageBlob;
      studentSelect.value = '';
      notesTextarea.value = '';
      pendingBtn.disabled = true;
      statusEl.textContent = 'Seleccione el material identificado por el estudiante para activar el guardado.';
      statusEl.className = 'validation-status';
      panel.hidden = false;
      studentSelect.focus();
    }

    function hide() {
      panel.hidden = true;
      currentAnalysis = null;
      currentImageBlob = null;
    }

    function setStatus(text, type) {
      statusEl.textContent = text;
      statusEl.className = 'validation-status ' + (type || '');
    }

    function validateStudentSelection() {
      const hasStudent = !!studentSelect.value;
      pendingBtn.disabled = !hasStudent;
      if (hasStudent) {
        setStatus('Listo para guardar. Pulse "Guardar como pendiente" para continuar sin docente.', 'pending');
      }
    }

    async function save() {
      if (!currentAnalysis || !studentSelect.value) return false;

      pendingBtn.disabled = true;
      cancelBtn.disabled = true;

      try {
        const record = await window.EcoScanDataStore.buildRecord(
          currentAnalysis,
          currentImageBlob,
          studentSelect.value,
          null,
          'pending',
          notesTextarea.value.trim()
        );

        const result = await window.EcoScanDataStore.addRecord(record, currentImageBlob);
        if (result.duplicated) {
          setStatus('Esta imagen ya fue registrada en esta sesión.', 'error');
        } else {
          setStatus('💾 Evidencia guardada como pendiente. El docente podrá revisarla desde el historial.', 'pending');
          callbacks.onSave?.(record, false);
          currentAnalysis = null;
          pendingBtn.disabled = true;
        }
        return true;
      } catch (e) {
        console.error('Error guardando validación:', e);
        setStatus('Error al guardar: ' + e.message, 'error');
        return false;
      } finally {
        pendingBtn.disabled = !currentAnalysis || !studentSelect.value;
        cancelBtn.disabled = false;
      }
    }

    studentSelect.addEventListener('change', validateStudentSelection);
    pendingBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', hide);

    return { show, hide };
  }

  function initTeacherReview(panel, callbacks) {
    const teacherSelect = panel.querySelector('#teacherMaterial');
    const notesTextarea = panel.querySelector('#validationNotes');
    const saveBtn = panel.querySelector('#saveTeacherValidationBtn');
    const cancelBtn = panel.querySelector('#cancelTeacherValidationBtn');
    const statusEl = panel.querySelector('#validationStatus');
    const studentAnswerDisplay = panel.querySelector('#studentAnswerDisplay');
    const recordImage = panel.querySelector('#teacherRecordImage');
    const imageMessage = panel.querySelector('#teacherImageMessage');
    const predictionsDisplay = panel.querySelector('#teacherPredictionsDisplay');
    const consensusDisplay = panel.querySelector('#teacherConsensusDisplay');
    const dateDisplay = panel.querySelector('#teacherDateDisplay');
    let imageUrl = null;
    function releaseImage() { if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = null; recordImage.removeAttribute('src'); }

    let currentRecord = null;

    function show(record, blob) {
      releaseImage();
      recordImage.style.display = blob ? 'block' : 'none';
      imageMessage.textContent = blob ? '' : 'No se encontró una fotografía guardada para esta evidencia.';
      if (blob) { imageUrl = URL.createObjectURL(blob); recordImage.src = imageUrl; }
      const p = record.predictions || {};
      const yolo = (p.yolo?.detections || []).map(d => d.label).join(', ') || 'Sin detecciones';
      const mobile = p.mobilenet?.predictions?.[0]?.className || 'No disponible';
      const binary = p.binary?.label || 'No disponible';
      const waste = p.mobilenetV2?.label_es || 'No disponible';
      predictionsDisplay.textContent = `YOLOv8: ${yolo}\nMobileNet: ${mobile}\nExperimental: ${binary}\nMobileNetV2: ${waste}`;
      consensusDisplay.textContent = `${record.consensus?.level || 'Sin consenso'} · ${record.consensus?.material || 'No determinado'}`;
      dateDisplay.textContent = record.isoTimestamp ? new Date(record.isoTimestamp).toLocaleString('es-CO') : 'Sin fecha';
      currentRecord = record;
      studentAnswerDisplay.textContent = record.validation.studentMaterial 
        ? MATERIAL_OPTIONS.find(o => o.value === record.validation.studentMaterial)?.label || record.validation.studentMaterial
        : 'Sin respuesta';
      teacherSelect.value = record.validation.teacherMaterial || '';
      notesTextarea.value = record.validation.notes || '';
      saveBtn.disabled = !teacherSelect.value;
      statusEl.textContent = 'Seleccione el material confirmado para validar.';
      statusEl.className = 'validation-status';
      panel.hidden = false;
      teacherSelect.focus();
    }

    function hide() {
      panel.hidden = true;
      currentRecord = null;
      releaseImage();
    }

    function setStatus(text, type) {
      statusEl.textContent = text;
      statusEl.className = 'validation-status ' + (type || '');
    }

    function validateTeacherSelection() {
      const hasTeacher = !!teacherSelect.value;
      saveBtn.disabled = !hasTeacher;
      if (hasTeacher) {
        setStatus('Listo para guardar validación.', 'pending');
      }
    }

    async function save() {
      if (!currentRecord || !teacherSelect.value) return false;

      saveBtn.disabled = true;
      cancelBtn.disabled = true;

      try {
        const result = window.EcoScanDataStore.updateRecord(currentRecord.id, {
          validation: {
            ...currentRecord.validation,
            teacherMaterial: teacherSelect.value,
            status: 'validated',
            notes: notesTextarea.value.trim(),
            validatedAt: Date.now(),
            validatedBy: 'teacher'
          }
        });

        if (result.found) {
          setStatus('✅ Validación guardada correctamente.', 'validated');
          callbacks.onValidate?.(result.records.find(r => r.id === currentRecord.id));
          hide();
        } else {
          setStatus('Error: registro no encontrado.', 'error');
        }
        return true;
      } catch (e) {
        console.error('Error guardando validación docente:', e);
        setStatus('Error al guardar: ' + e.message, 'error');
        return false;
      } finally {
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    }

    teacherSelect.addEventListener('change', validateTeacherSelection);
    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', hide);

    return { show, hide };
  }

  function initImageViewer(panel, callbacks) {
    const imageEl = panel.querySelector('#recordImage');
    const closeBtn = panel.querySelector('#closeImageViewerBtn');

    function show(blob) {
      if (blob) {
        const url = URL.createObjectURL(blob);
        imageEl.src = url;
        imageEl.onload = () => URL.revokeObjectURL(url);
      } else {
        imageEl.src = '';
        imageEl.alt = 'No hay imagen disponible';
      }
      panel.hidden = false;
    }

    function hide() {
      panel.hidden = true;
      imageEl.src = '';
    }

    closeBtn.addEventListener('click', hide);

    return { show, hide };
  }

  createValidationStyles();

  window.EcoScanValidation = {
    createPanel: createValidationPanel,
    createTeacherReviewPanel,
    createImageViewerPanel,
    initStudentValidation,
    initTeacherReview,
    initImageViewer,
    MATERIAL_OPTIONS
  };
})();