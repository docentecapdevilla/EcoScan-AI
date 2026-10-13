# EcoScan AI — actualización del asistente

- Se corrigió un error real de ámbito: `matchedCategory` se declaraba dentro de los bloques `if/else` y se utilizaba fuera, produciendo `ReferenceError`.
- Se agregó selector de material con confirmación manual y reglas de contenedor para Colombia, con advertencia de limpieza y residuos especiales.
- La inferencia continúa con MobileNet preentrenado; NO se ha integrado un modelo especializado de residuos ni un sistema de aprendizaje automático colaborativo.
- Se sustituyó `innerHTML` con contenido del modelo por nodos DOM/textContent.
- Se manejan errores de clasificación en cámara e imagen.
- `data/labels.json` se mantiene como preparación para un futuro conjunto de entrenamiento.

## Ejecutar
Desde la carpeta `Proyect 7tmo`, ejecutar `python -m http.server 8080`, abrir `http://localhost:8080`.
Se requiere conexión a Internet para cargar las bibliotecas y pesos MobileNet por CDN.

## Próximo paso
Verificar y descargar pesos y etiquetas de un modelo de residuos realmente compatible con el navegador, con licencia revisada, y comparar sus resultados antes de sustituir MobileNet.

## Corrección de arranque
Se agregaron al HTML los tres elementos requeridos por app.js, que faltaban en la entrega anterior y provocaban TypeError. Se añadieron manejadores de errores para clasificación.
