# Bitacora Tecnica Offline

Web app estatica para checklist de mantenimiento preventivo y correctivo en maquinas:

- Contadora
- Bascula
- Estandar

Incluye registro de cliente, tecnico, maquina, checklist por tipo de mantenimiento, fotos de evidencia antes/durante/pruebas, notas, firma del cliente, historial local, exportacion e importacion de respaldo.

## Archivos

- `index.html`: estructura principal.
- `styles.css`: estilos responsive.
- `app.js`: logica de checklist, evidencias, firma, historial y respaldos.
- `sw.js`: cache offline para GitHub Pages.
- `manifest.webmanifest`: instalacion como app.
- `icon.svg`: icono de la app.

## Publicar en GitHub Pages

1. Sube todos estos archivos a un repositorio de GitHub.
2. En GitHub entra a `Settings > Pages`.
3. En `Build and deployment`, selecciona `Deploy from a branch`.
4. Elige la rama `main` y carpeta `/root`.
5. Abre la URL que GitHub Pages te entregue.

## Uso offline

Abre la app publicada una vez con internet. Despues el navegador guarda los archivos principales para que la app pueda volver a abrir sin conexion. Los datos se guardan localmente en el navegador del dispositivo.

Usa `Exportar` para crear respaldos JSON y `Importar` para restaurarlos en otro navegador o equipo.
