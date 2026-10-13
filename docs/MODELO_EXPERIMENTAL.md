# Integración experimental de modelo de terceros

Fuente aportada por el usuario: `saarmalhotra/waste-classifier-web`. El README declara MIT, pero no se suministra un archivo de licencia independiente ni la procedencia/condiciones de uso del conjunto de entrenamiento. Verificar antes de distribución comercial.

## Hallazgos
- El ZIP contiene pesos reales (`weights.bin`, ~2.15 MB), `model.json` y `metadata.json`.
- `metadata.json` declara únicamente **Oragnic** (error ortográfico original) y **Reusable**. No cuatro categorías.
- La app original del tercero simula resultados aleatorios si no puede cargar el modelo. No se copió esa conducta.
- El HTML original del tercero tiene una etiqueta `<canvas>` mal escrita. No se copió su interfaz.
- El modelo no determina limpieza, peligrosidad, material exacto ni color de contenedor.
- No se verificó la exactitud del modelo sobre imágenes de prueba etiquetadas.

## Uso
Ejecutar `python -m http.server 8765 --bind 127.0.0.1` en la carpeta que contiene `index.html`, abrir http://127.0.0.1:8765, subir imagen y pulsar «Analizar con modelo experimental».

## Pendientes
Conseguir un modelo entrenado para plástico, vidrio, metal, papel/cartón, orgánicos y no aprovechables, con etiquetas, procedencia y métricas verificables. El modelo experimental NO reemplaza el sistema actual.
