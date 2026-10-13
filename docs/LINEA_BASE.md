# LÍNEA BASE - EcoScan AI

## Funcionalidades Actuales
- Carga del modelo MobileNet v2 desde CDN (TensorFlow.js 3.18.0)
- Entrada por cámara web (API `getUserMedia`, preferencia trasera)
- Entrada por subida de archivos (`<input type="file" accept="image/*">`)
- Clasificación automática cada 500 ms mientras la cámara está activa
- Mapeo de predicciones a categorías mediante coincidencia de palabras clave en inglés
- Categorías: Orgánico, Plástico/Metal, Papel y Cartón, Vidrio, o General
- Interfaz con tarjeta de resultado, porcentaje de certeza e instrucciones de reciclaje
- Codificación de colores por tipo de residuo

## Dependencias Externas
- `@tensorflow/tfjs@3.18.0` (CDN: jsdelivr)
- `@tensorflow-models/mobilenet@2.1.0` (CDN: jsdelivr)

## Pasos para Probar

### Cámara
1. Abre `index.html` en un navegador compatible (Chrome/Edge recomendados)
2. Haz clic en **Usar Cámara**
3. Concede permiso a la cámara cuando el navegador lo solicite
4. Verifica que el video aparezca en el contenedor
5. Observa que la tarjeta de resultado se actualice periódicamente

### Carga de Imágenes
1. Haz clic en **Subir Imagen**
2. Selecciona un archivo de imagen desde el explorador
3. Espera a que la vista previa y la predicción aparezcan
4. Verifica que la tarjeta de resultado muestre la categoría correspondiente

## Cinco Pruebas Manuales para Futuras Modificaciones

1. **Carga del modelo**: Verificar que al recargar la página el modelo se cargue correctamente sin errores en consola.
2. **Cámara**: Activar y desactivar la cámara; confirmar que los recursos (stream) se liberen al detener.
3. **Subida de imagen**: Cargar una imagen válida y una inválida (o vacía); confirmar comportamiento esperado.
4. **Clasificación**: Analizar una imagen con un objeto conocido (ej. botella de agua) y verificar que la categoría sea Plástico/Metal.
5. **Interfaz**: Modificar un CSS variable y confirmar que los estilos se actualizan correctamente en la UI.

## Comprobación de Sintaxis JavaScript
- **Resultado**: VÁLIDA
- **Método**: Extracción del bloque `<script>` y validación con `new Function()` mediante Node.js v20.19.5
- **Fecha**: 2026-10-12