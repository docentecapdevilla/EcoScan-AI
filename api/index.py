"""Vercel WSGI entrypoint. Keeps existing local server.py unchanged.
WARNING: Torch/Ultralytics may exceed Vercel function build or memory limits.
"""
from flask import Flask, request, jsonify
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
app = Flask(__name__)

@app.get('/api/health')
def health():
    return jsonify(status='ok', models={
        'yolo': (ROOT/'models/waste-yolo/best.pt').is_file(),
        'mobilenetv2_residuos': (ROOT/'models/waste-mobilenetv2/best_model.pth').is_file(),
        'experimental': (ROOT/'models/waste-binary/model.json').is_file(),
        'mobilenet_imagenet': 'CDN en navegador'
    }, note='Health checks files, not inference readiness')

@app.post('/api/detect')
@app.post('/api/waste-classify')
def inference():
    if not request.content_type or not request.content_type.startswith('image/'):
        return jsonify(error='Solo se admiten imágenes'), 415
    if request.content_length and request.content_length > 10 * 1024 * 1024:
        return jsonify(error='La imagen debe pesar menos de 10 MB'), 413
    content = request.get_data(cache=False)
    if not content or len(content) > 10 * 1024 * 1024:
        return jsonify(error='Imagen vacía o demasiado grande'), 413
    try:
        from server import classify_waste, get_model, _yolo_lock
        if request.path.endswith('waste-classify'):
            return jsonify(classify_waste(content))
        from PIL import Image
        import io
        import numpy as np
        # YOLO accepts numpy RGB/BGR array; no temp file or write permission required.
        image = Image.open(io.BytesIO(content)).convert('RGB')
        with _yolo_lock:
            result = get_model().predict(source=np.asarray(image), conf=0.35, imgsz=640, verbose=False)[0]
        detections = []
        for b in result.boxes:
            cls = int(b.cls[0].item())
            detections.append({'label':str(result.names[cls]),
                'confidence':round(float(b.conf[0].item()),4),
                'box':[round(float(v),1) for v in b.xyxy[0].tolist()]})
        return jsonify(detections=detections)
    except Exception as exc:
        app.logger.exception('Inference failed: %s', type(exc).__name__)
        return jsonify(error='No se pudo ejecutar el modelo en este alojamiento.'), 503
