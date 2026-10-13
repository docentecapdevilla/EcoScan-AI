(() => {
  'use strict';

  const STORAGE_KEY = 'ecoscan_records';
  const SESSION_KEY = 'ecoscan_session';
  const MAX_RECORDS = 500;
  const DB_NAME = 'EcoScanDB';
  const DB_VERSION = 1;
  const IMAGES_STORE = 'images';

  let dbPromise = null;

  function initDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        }
      };
    });
    return dbPromise;
  }

  async function storeImage(recordId, blob) {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGES_STORE, 'readwrite');
        const store = tx.objectStore(IMAGES_STORE);
        const request = store.put({ id: recordId, blob, createdAt: Date.now() });
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('IndexedDB no disponible, imagen no persistirá:', e);
      return false;
    }
  }

  async function getImage(recordId) {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGES_STORE, 'readonly');
        const store = tx.objectStore(IMAGES_STORE);
        const request = store.get(recordId);
        request.onsuccess = () => resolve(request.result?.blob || null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Error leyendo imagen de IndexedDB:', e);
      return null;
    }
  }

  async function deleteImage(recordId) {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IMAGES_STORE, 'readwrite');
        const store = tx.objectStore(IMAGES_STORE);
        const request = store.delete(recordId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Error borrando imagen de IndexedDB:', e);
      return false;
    }
  }

  function generateId() {
    return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function getSessionId() {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function getStudentId() {
    let sid = localStorage.getItem('ecoscan_student_id');
    if (!sid) {
      sid = 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem('ecoscan_student_id', sid);
    }
    return sid;
  }

  async function hashImage(blob) {
    try {
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'hash_unavailable_' + Date.now();
    }
  }

  function normalizeMaterial(label) {
    if (!label) return null;
    const t = String(label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]/g, ' ');
    if (/\b(plastic|plastico|pet container|hdpe container|styrofoam|polystyrene|plastic wrapper|plastic bag|plastic cup)\b/.test(t)) return 'plastic';
    if (/\b(glass|vidrio)\b/.test(t)) return 'glass';
    if (/\b(aluminum|aluminium|metal|metalic|metalico|lata de aluminio|tin can)\b/.test(t)) return 'metal';
    if (/\b(paper|papel|cardboard|carton)\b/.test(t)) return 'paper';
    if (/\b(organic|organico|biodegradable|food waste|fruit peel)\b/.test(t)) return 'organic';
    if (/\b(non recyclable|no reciclable|no aprovechable|non recyclable waste)\b/.test(t)) return 'non';
    return null;
  }

  function extractYoloMaterials(detections) {
    if (!Array.isArray(detections)) return [];
    const materials = new Set();
    for (const d of detections) {
      const m = normalizeMaterial(d.label);
      if (m && Number(d.confidence) >= 0.25) materials.add(m);
    }
    return Array.from(materials);
  }

  async function buildRecord(analysis, imageBlob, studentMaterial, teacherMaterial, validationStatus, notes) {
    const sessionId = getSessionId();
    const studentId = getStudentId();
    const imageHash = imageBlob ? await hashImage(imageBlob) : 'no_image';

    const yoloDetections = analysis.last?.yolo?.value || [];
    const mobileResult = analysis.last?.mobile?.value;
    const binaryResult = analysis.last?.binary?.value;
    const wasteV2Result = analysis.last?.wasteV2?.value;
    const consensus = analysis.consensus || {};

    const record = {
      id: generateId(),
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString(),
      sessionId,
      studentId,
      source: analysis.source || (analysis.active ? 'camera' : 'file'),
      imageHash,
      predictions: {
        yolo: {
          status: analysis.last?.yolo?.error ? 'error' : 'ok',
          error: analysis.last?.yolo?.error || null,
          detections: yoloDetections.map(d => ({
            label: d.label,
            confidence: Number(d.confidence),
            box: d.box,
            normalizedMaterial: normalizeMaterial(d.label)
          }))
        },
        mobilenet: {
          status: analysis.last?.mobile?.error ? 'error' : 'ok',
          error: analysis.last?.mobile?.error || null,
          predictions: mobileResult ? mobileResult.slice(0, 5).map(p => ({
            className: p.className,
            probability: Number(p.probability),
            normalizedMaterial: normalizeMaterial(p.className)
          })) : []
        },
        binary: {
          status: analysis.last?.binary?.error ? 'error' : 'ok',
          error: analysis.last?.binary?.error || null,
          label: binaryResult?.label || null,
          confidence: binaryResult?.confidence ? Number(binaryResult.confidence) : null,
          normalizedMaterial: binaryResult && normalizeMaterial(binaryResult.label) === 'organic' ? 'organic' : null
        },
        mobilenetV2: {
          status: analysis.last?.wasteV2?.error ? 'error' : 'ok',
          error: analysis.last?.wasteV2?.error || null,
          label: wasteV2Result?.label || null,
          label_es: wasteV2Result?.label_es || null,
          confidence: wasteV2Result?.confidence ? Number(wasteV2Result.confidence) : null,
          top3: wasteV2Result?.top3?.map(t => ({
            label: t.label,
            confidence: Number(t.confidence),
            normalizedMaterial: normalizeMaterial(t.label)
          })) || [],
          normalizedMaterial: wasteV2Result ? normalizeMaterial(wasteV2Result.label_es || wasteV2Result.label) : null
        }
      },
      consensus: {
        material: consensus.material || null,
        votes: Number(consensus.votes) || 0,
        level: consensus.level || 'Sin evidencia suficiente',
        text: consensus.text || '',
        bin: consensus.bin || '',
        contradictoryMaterials: consensus.material ? null : (() => {
          const materials = [];
          if (consensus.material) return null;
        })()
      },
      validation: {
        studentMaterial: studentMaterial || null,
        teacherMaterial: teacherMaterial || null,
        status: validationStatus || 'pending',
        notes: notes || '',
        validatedAt: null,
        validatedBy: null
      },
      metrics: null
    };

    if (record.validation.status === 'validated' && record.validation.teacherMaterial) {
      record.metrics = computeMetrics(record);
      record.validation.validatedAt = Date.now();
      record.validation.validatedBy = 'teacher';
    }

    // La imagen se persiste solo después de confirmar que el registro no es duplicado.
    return record;
  }

  function computeMetrics(record) {
    const gt = record.validation.teacherMaterial;
    if (!gt) return null;

    const models = {
      yolo: record.predictions.yolo.detections.some(d => d.normalizedMaterial === gt),
      mobilenet: record.predictions.mobilenet.predictions.some(p => p.normalizedMaterial === gt),
      binary: record.predictions.binary.normalizedMaterial === gt,
      mobilenetV2: record.predictions.mobilenetV2.normalizedMaterial === gt,
      consensus: record.consensus.material === gt
    };

    return {
      groundTruth: gt,
      models,
      consensusVotes: record.consensus.votes,
      consensusLevel: record.consensus.level
    };
  }

  function getAllRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveRecords(records) {
    const toSave = records.slice(-MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return toSave;
  }

  async function addRecord(record, imageBlob) {
    const records = getAllRecords();
    const exists = records.some(r => r.imageHash === record.imageHash && r.sessionId === record.sessionId);
    if (exists) return { records, duplicated: true };
    records.push(record);
    const saved = saveRecords(records);
    if (imageBlob && imageBlob.size > 0) {
      const imageSaved = await storeImage(record.id, imageBlob);
      if (!imageSaved) console.warn('Evidencia guardada sin fotografía persistente', record.id);
    }
    return { records: saved, duplicated: false };
  }

  function updateRecord(recordId, updates) {
    const records = getAllRecords();
    const idx = records.findIndex(r => r.id === recordId);
    if (idx === -1) return { records, found: false };
    records[idx] = { ...records[idx], ...updates };
    if (updates.validation?.status === 'validated' && updates.validation?.teacherMaterial) {
      records[idx].metrics = computeMetrics(records[idx]);
    }
    return { records: saveRecords(records), found: true };
  }

  function exportJSON() {
    const records = getAllRecords();
    return JSON.stringify(records, null, 2);
  }

  function exportCSV() {
    const records = getAllRecords();
    if (!records.length) return null;

    const headers = [
      'id', 'timestamp', 'sessionId', 'studentId', 'source', 'imageHash',
      'yolo_status', 'yolo_detections', 'yolo_materials',
      'mobilenet_status', 'mobilenet_top1', 'mobilenet_top1_prob', 'mobilenet_materials',
      'binary_status', 'binary_label', 'binary_confidence', 'binary_material',
      'mobilenetV2_status', 'mobilenetV2_label_es', 'mobilenetV2_confidence', 'mobilenetV2_material',
      'consensus_material', 'consensus_votes', 'consensus_level',
      'validation_studentMaterial', 'validation_teacherMaterial', 'validation_status', 'validation_notes',
      'metrics_yolo_hit', 'metrics_mobilenet_hit', 'metrics_binary_hit', 'metrics_mobilenetV2_hit', 'metrics_consensus_hit'
    ];

    const escape = (v) => '"' + String(v ?? '').replaceAll('"', '""') + '"';

    const rows = records.map(r => {
      const yoloDet = r.predictions.yolo.detections.map(d => `${d.label} (${d.confidence})`).join(' | ');
      const yoloMat = [...new Set(r.predictions.yolo.detections.map(d => d.normalizedMaterial).filter(Boolean))].join(',');
      const mobTop1 = r.predictions.mobilenet.predictions[0] || {};
      const mobMats = [...new Set(r.predictions.mobilenet.predictions.map(p => p.normalizedMaterial).filter(Boolean))].join(',');
      const binMat = r.predictions.binary.normalizedMaterial || '';
      const v2Mat = r.predictions.mobilenetV2.normalizedMaterial || '';
      const metrics = r.metrics || {};

      return [
        r.id, r.isoTimestamp, r.sessionId, r.studentId, r.source, r.imageHash,
        r.predictions.yolo.status, yoloDet, yoloMat,
        r.predictions.mobilenet.status, mobTop1.className || '', mobTop1.probability || '', mobMats,
        r.predictions.binary.status, r.predictions.binary.label || '', r.predictions.binary.confidence || '', binMat,
        r.predictions.mobilenetV2.status, r.predictions.mobilenetV2.label_es || '', r.predictions.mobilenetV2.confidence || '', v2Mat,
        r.consensus.material || '', r.consensus.votes, r.consensus.level,
        r.validation.studentMaterial || '', r.validation.teacherMaterial || '', r.validation.status, r.validation.notes,
        metrics.models?.yolo ? 1 : 0, metrics.models?.mobilenet ? 1 : 0, metrics.models?.binary ? 1 : 0, metrics.models?.mobilenetV2 ? 1 : 0, metrics.models?.consensus ? 1 : 0
      ].map(escape).join(';');
    });

    return '\uFEFF' + [headers.map(escape).join(';'), ...rows].join('\r\n');
  }

  function importRecords(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return { success: false, error: 'Formato inválido: se esperaba array' };
      const existing = getAllRecords();
      const existingHashes = new Set(existing.map(r => r.imageHash + '|' + r.sessionId));
      const newRecords = imported.filter(r => r.id && !existingHashes.has(r.imageHash + '|' + r.sessionId));
      const merged = [...existing, ...newRecords].slice(-MAX_RECORDS);
      saveRecords(merged);
      return { success: true, added: newRecords.length, total: merged.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function clearRecords() {
    localStorage.removeItem(STORAGE_KEY);
    // Also clear IndexedDB images
    initDB().then(db => {
      const tx = db.transaction(IMAGES_STORE, 'readwrite');
      tx.objectStore(IMAGES_STORE).clear();
    }).catch(() => {});
    return [];
  }

  function getStats() {
    const records = getAllRecords();
    const validated = records.filter(r => r.validation.status === 'validated');
    return {
      total: records.length,
      validated: validated.length,
      pending: records.filter(r => r.validation.status === 'pending').length,
      byMaterial: Object.fromEntries(
        ['plastic', 'glass', 'metal', 'paper', 'organic', 'non'].map(m => [
          m, validated.filter(r => r.validation.teacherMaterial === m).length
        ])
      )
    };
  }

  // Get records for teacher review (pending validation)
  function getPendingRecords() {
    return getAllRecords().filter(r => r.validation.status === 'pending');
  }

  // Get a single record by ID (for teacher review)
  function getRecordById(recordId) {
    return getAllRecords().find(r => r.id === recordId);
  }

  window.EcoScanDataStore = {
    generateId,
    getSessionId,
    getStudentId,
    buildRecord,
    computeMetrics,
    getAllRecords,
    addRecord,
    updateRecord,
    exportJSON,
    exportCSV,
    importRecords,
    clearRecords,
    getStats,
    normalizeMaterial,
    extractYoloMaterials,
    hashImage,
    storeImage,
    getImage,
    deleteImage,
    getPendingRecords,
    getRecordById,
    initDB
  };
})();