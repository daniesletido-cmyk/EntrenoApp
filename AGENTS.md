<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# REGLAS INMUTABLES DEL PROYECTO ENTRENOAPP (DANIEL ESPINOSA)

Estas reglas tienen prioridad absoluta en cualquier tarea, modificación o generación de código en este repositorio.

---

## 1. REGLA DE ORO DE LOS ENTRENAMIENTOS DE CARRERA (RUNNING)

1. **La distancia indicada en el título o código del entrenamiento (ej. 12 km, 14 km, 8 km) es SIEMPRE la PARTE PRINCIPAL (Trabajo Clave)**:
   - **PROHIBIDO** restar el calentamiento ni la vuelta a la calma de esa distancia. Si la sesión es de "12 km", la **Parte Principal son 12.0 km íntegros**.
   - El **volumen total de la sesión** en la base de datos (`distance_km`) y en la interfaz es siempre:
     $$\text{Total Sesión} = \text{Calentamiento (1.0-1.5 km)} + \text{Parte Principal (ej. 12.0 km)} + \text{Vuelta a la Calma (1.0 km)} = 14.5 \text{ km}$$
2. **Estructura tripartita obligatoria**:
   Toda sesión de running debe presentar de manera clara e individual los 3 bloques en notas y en la UI:
   - 🟢 **Calentamiento**: 1.0 - 1.5 km (~6-9 min) a ritmo **5:45 - 5:30 min/km (Zona R0 suave)** + activación dinámica/movilidad.
   - ⚡ **Parte Principal**: Kilometraje clave íntegro con el ritmo objetivo exacto de la sesión.
   - 🔵 **Vuelta a la Calma**: 1.0 km (~6 min) a ritmo **> 6:00 min/km (Trote muy suave / Caminata)** + estiramientos completos.
3. **Zonas de Ritmo Fisiológicas (VAM de Dani: 3:59 min/km · 15.06 km/h)**:
   - **R0 (Regenerativo / Calentamiento)**: `> 5:25 - 5:45 min/km` (FC < 140 lpm)
   - **R1 (Base Aeróbica / Rodaje Continuo)**: `5:25 - 4:59 min/km` (RPE 4-5)
   - **R5 (Tirada Larga Zuera)**: `5:25 - 5:10 min/km` con los últimos 3-4 km a Ritmo Maratón (`5:05 - 5:10 min/km`)
   - **R2 (Tempo / Moderado Progresivo)**: `4:59 - 4:35 min/km`
   - **R3 / R4 (Intervalos y Series de Umbral)**: `4:18 - 4:20 min/km` (Recuperación activa al trote a `~6:00 min/km`)
   - **Cuestas / Rectas de Potencia**: Aceleración explosiva y elástica en subida (RPE 8-9) con bajada caminando (cero impacto articular).

---

## 2. REGLA DE SINCRONIZACIÓN DUAL DE BASES DE DATOS

- Todo cambio, actualización de sesiones o ajuste en la base de datos debe ejecutarse **SIMULTÁNEAMENTE** en:
  1. `data/entrenoapp.db` (base de datos activa local)
  2. `seed/entrenoapp.db` (base de datos para producción y Vercel)
- Vercel y los entornos serverless inicializan su base de datos a partir de `seed/entrenoapp.db`. Si `seed/entrenoapp.db` no contiene los cambios, cualquier despliegue revertirá las sesiones del usuario a versiones obsoletas.

---

## 3. PROTECCIÓN CONTRA PÉRDIDA DE DATOS

- Las rutas de sincronización (como `/api/sync-annual-plan`) **NUNCA deben hacer `DELETE FROM sessions`** indiscriminados ni pisar sesiones modificadas por el usuario o personalizadas (por ejemplo, adaptaciones de festivos, días de montaña o entrenamientos completados).
- Los datos registrados por el usuario (`user_notes`, `fit_data`, `fit_backup`, `status = 'completado'`) son sagrados y no se pueden sobrescribir bajo ningún concepto.

---

## 4. VALIDACIÓN PRE-DEPLOYMENT

- Antes de dar por finalizada una tarea en los entrenamientos o desplegar a producción:
  - Ejecutar `npm run validate-plan` para comprobar que ninguna sesión de carrera tenga partes principales reducidas por resta.
  - Verificar que TypeScript compila sin errores (`npx tsc --noEmit`).
