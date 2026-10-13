# DIAGNÓSTICO INICIAL - EcoScan AI

## ARQUITECTURA ENCONTRADA
- **Tipo**: Aplicación web monolítica en un solo archivo HTML
- **Tecnologías**: HTML5, CSS3, JavaScript ES6, TensorFlow.js, MobileNet v2
- **Dependencias externas**: TensorFlow.js (3.18.0) y MobileNet (2.1.0) desde CDN
- **Estructura**: Contenido, estilos y lógica en el mismo archivo (index.html)

## FUNCIONALIDADES PRINCIPALES
1. **Carga de modelo**: MobileNet se carga asíncronamente al iniciar
2. **Entrada de imagen**: 
   - Cámara web (API getUserMedia) con trasera como preferencia
   - Subida de archivos mediante input[type="file"]
3. **Procesamiento**: 
   - Clasificación con MobileNet cada 500ms (cámara) o al cargar imagen
   - Mapeo de predicciones a categorías mediante reglas de palabras clave
4. **Salida**: 
   - Tarjeta de resultado con categoría, certeza y instrucciones de reciclaje
   - Codificación por colores según tipo de residuo

## RIESGOS IDENTIFICADOS
1. **Dependencia total de CDN**: Fallo si los servidores de TensorFlow.js/MobileNet están indisponibles
2. **Precisión limitada**: MobileNet no está entrenado específicamente para residuos, depende de coincidencias de palabras clave genéricas
3. **Procesamiento continuo**: Análisis constante de frames de cámara consume batería y recursos
4. **Falta de manejo de errores**: Mensajes genéricos sin recuperación automática ante fallos
5. **Escalabilidad cero**: Difícil de mantener o extender debido a código monolítico

## ARCHIVOS CREADOS
- docs/DIAGNOSTICO.md (este archivo)