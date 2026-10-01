# Reglas de despliegue para EntrenoApp

## Railway — Despliegue permanente

**IMPORTANTE**: Para desplegar a Railway o actualizar la app, usa SIEMPRE el script `Desplegar en Railway.bat` o el comando enlazado con los IDs fijos:

- **URL de producción permanente**: `https://entrenoapp-production-f07b.up.railway.app`
- **Project ID**: `69866035-68d1-422f-b335-0dcfbe2431fa`
- **Service ID**: `d310f63f-8a44-4df6-ab57-3c59767283bc`
- **Environment**: `production`
- **Volumen persistente**: `entrenoapp-volume` montado en `/data` (aquí vive `entrenoapp.db` y nunca se borra en actualizaciones).

Cualquier actualización debe mantener estos IDs fijos para no alterar la URL ni perder los datos guardados.
