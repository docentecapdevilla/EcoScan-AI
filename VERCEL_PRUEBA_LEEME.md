# EcoScan AI — Experimento de despliegue integral en Vercel

Esta es una **copia de prueba**, no una migración validada. `server.py` permanece intacto para ejecución local.

## Pasos
1. Crear repositorio GitHub **privado** y subir el contenido de la carpeta `EcoScan_AI` como raíz del repositorio. No subir `.env`, claves ni datos de estudiantes.
2. En Vercel: Add New → Project → Import Git Repository. Seleccionar repositorio; Framework Preset: **Other**; Root Directory: raíz (`./`); sin comando de build personalizado; Deploy.
3. Si el build falla por Torch, Ultralytics, límites de tamaño o memoria, conservar el log y **no** cambiar los pesos ni eliminar modelos.
4. Abrir `https://TU-PROYECTO.vercel.app/api/health`. `status:ok` solo indica que se encontraron los archivos; **no** comprueba inferencia.
5. En la página probar imagen de banano y botella. Verificar los **cuatro** resultados y la consola. Si uno de los endpoints devuelve 503, el despliegue de los cuatro modelos NO está listo.
6. Comprobar guardado pendiente, recarga y validación posterior. Esos datos todavía están en almacenamiento **local de cada navegador**, no compartidos entre estudiantes.

## Límites y advertencias
- Vercel es serverless: arranques fríos, tiempo de ejecución, memoria y tamaño de despliegue pueden impedir que PyTorch + Ultralytics funcionen. No se garantiza gratuidad ni funcionamiento con 25 usuarios.
- Los dos modelos de navegador necesitan descargar TensorFlow.js/MobileNet desde CDN; se requiere acceso a internet.
- La aplicación actual **no tiene autenticación** ni repositorio central de evidencias. **No usar con menores en un sitio público** antes de añadir control de acceso y privacidad. Para una prueba técnica, usar solo fotografías de objetos, sin personas ni datos personales.
- Si Vercel falla, ejecutar el ZIP estable anterior en Windows con `python server.py`.
