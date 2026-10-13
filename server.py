"""EcoScan: servidor local estático + inferencia YOLOv8. Ejecutar: python server.py"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import tempfile
import os
import io
import threading

BASE = Path(__file__).resolve().parent
os.chdir(BASE)
MODEL_PATH = BASE / 'models' / 'waste-yolo' / 'best.pt'
_model = None
_waste_model = None
_waste_lock = threading.Lock()
_yolo_lock = threading.Lock()
WASTE_PATH = BASE / 'models' / 'waste-mobilenetv2' / 'best_model.pth'
WASTE_CLASSES = ['glass','metal','non-recyclable','organic','paper','plastic']
WASTE_ES = ['Vidrio','Metal','No reciclable','Orgánico','Papel / cartón','Plástico']

def get_waste_model():
    global _waste_model
    if _waste_model is None:
        import torch
        from torchvision import models
        model = models.mobilenet_v2(weights=None)
        model.classifier = torch.nn.Sequential(torch.nn.Dropout(p=0.2), torch.nn.Linear(1280, 6))
        # weights_only=True evita deserialización arbitraria de objetos Python
        checkpoint = torch.load(WASTE_PATH, map_location='cpu', weights_only=True)
        # El checkpoint fue guardado dentro de un wrapper llamado 'backbone'.
        # Quitamos solo ese prefijo; mantenemos strict=True para verificar compatibilidad.
        state_dict = checkpoint['model_state_dict']
        if all(k.startswith('backbone.') for k in state_dict):
            state_dict = {k[len('backbone.'):]: v for k, v in state_dict.items()}
        model.load_state_dict(state_dict, strict=True)
        model.eval()
        _waste_model = model
    return _waste_model

def classify_waste(content):
    import torch
    from PIL import Image
    from torchvision import transforms
    image = Image.open(io.BytesIO(content)).convert('RGB')
    transform = transforms.Compose([
        transforms.Resize((224, 224)), transforms.ToTensor(),
        transforms.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
    ])
    with _waste_lock:
        with torch.inference_mode():
            logits = get_waste_model()(transform(image).unsqueeze(0))
            probabilities = torch.softmax(logits,dim=1)[0]
            i = int(probabilities.argmax().item())
    return {'label': WASTE_CLASSES[i], 'label_es': WASTE_ES[i],
            'confidence': round(float(probabilities[i].item()),4),
            'top3': [{'label':WASTE_ES[j], 'confidence':round(float(probabilities[j].item()),4)}
                     for j in torch.argsort(probabilities,descending=True)[:3].tolist()]}


def get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO(str(MODEL_PATH))
    return _model

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/health':
            return self.reply(200, {'status':'ok', 'models': {
                'yolo': MODEL_PATH.is_file(),
                'mobilenetv2_residuos': WASTE_PATH.is_file(),
                'experimental': (BASE/'models'/'waste-binary'/'model.json').is_file(),
                'mobilenet_imagenet': 'CDN en navegador'
            }})
        return super().do_GET()

    def do_POST(self):
        if self.path not in ('/api/detect', '/api/waste-classify'):
            return self.reply(404, {'error': 'Ruta desconocida'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 10 * 1024 * 1024:
                return self.reply(413, {'error': 'La imagen debe pesar menos de 10 MB'})
            ctype = self.headers.get('Content-Type', '')
            if not ctype.startswith('image/'):
                return self.reply(415, {'error': 'Solo se admiten imágenes'})
            content = self.rfile.read(size)
            if self.path == '/api/waste-classify':
                return self.reply(200, classify_waste(content))
            suffix = { 'image/jpeg':'.jpg', 'image/png':'.png', 'image/webp':'.webp', 'image/bmp':'.bmp' }.get(ctype.split(';')[0], '.jpg')
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
                temp.write(content)
                path = temp.name
            try:
                with _yolo_lock:
                    results = get_model().predict(source=path, conf=0.35, imgsz=640, verbose=False)
                result = results[0]
                detections = []
                for b in result.boxes:
                    cls = int(b.cls[0].item())
                    detections.append({'label': str(result.names[cls]),
                        'confidence': round(float(b.conf[0].item()), 4),
                        'box': [round(float(v), 1) for v in b.xyxy[0].tolist()]})
                self.reply(200, {'detections': detections})
            finally:
                os.unlink(path)
        except ImportError:
            self.reply(503, {'error': 'Falta una dependencia: python -m pip install ultralytics torchvision pillow'})
        except Exception as exc:
            print('Error de inferencia:', repr(exc), flush=True)
            self.reply(500, {'error': 'No se pudo procesar la imagen. Revisa la consola del servidor.'})

    def reply(self, status, obj):
        data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

if __name__ == '__main__':
    print('EcoScan YOLO disponible en http://127.0.0.1:8765', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
