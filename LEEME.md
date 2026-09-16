# EntrenoApp

Registro y seguimiento de entrenamiento, descanso y nutrición — Diseñada por Daniel Espinosa.

## Sobre "se cierra sola la pestaña" al generar el instalador

El archivo `.bat` en sí está limpio (lo he revisado byte a byte). Lo más probable es que Windows lo esté
bloqueando en silencio por venir de un zip descargado de internet. Antes de ejecutar `Generar instalador.bat`:
clic derecho sobre el archivo → Propiedades → si aparece la casilla "Desbloquear", márcala → Aceptar. Si no
aparece esa casilla, prueba "Ejecutar como administrador". Si sigue sin funcionar, dime si ves algo en
`build-desktop-log.txt` (se crea en la misma carpeta) o en el Historial de protección de Windows Defender.

## Instalador de Windows — YA generado

Esta vez sí: junto a este zip del código te he mandado también `EntrenoApp Setup 0.1.0.exe`, el instalador real de
Windows (no hace falta Node.js ni ningún `.bat` para usar este). Doble clic, sigue el asistente, y te deja acceso
directo en el escritorio y en el menú inicio. Como no está firmado digitalmente (no tengo un certificado de firma
de código), Windows mostrará el aviso de SmartScreen la primera vez — pulsa "Más información" → "Ejecutar de todas
formas". Es un aviso estándar para software sin firma, no indica ningún problema.

Se ha generado y comprobado que es un ejecutable de Windows válido, pero **no se ha podido probar abriéndolo en un
Windows real** desde aquí — avísame en cuanto lo prees, y si algo falla al abrirlo dime exactamente qué ves (se
puede depurar rápido, ya tenemos mucha experiencia con este tipo de fallos de otro proyecto similar).

Si prefieres una versión sin instalar nada (llevártela en un USB, por ejemplo), también hay un
`EntrenoApp 0.1.0.exe` portátil — pídemelo si lo quieres.

## Si no quieres usar ninguna clave de API

La clave de Anthropic (Configuración) es **totalmente opcional** — solo hace falta si quieres que la app lea sola
una foto o un PDF. Sin ella, tienes dos formas de meter tu plan sin gastar nada:

- **Escribirlo tú directamente en Plan semanal**: cada sesión (nueva o ya creada) tiene un icono de lápiz/nota para
  abrir un cuadro de texto donde pegar o escribir tus ejercicios, series, RPE, pesos o ritmos tal cual los tengas
  — se guarda igual que si lo hubiera leído la IA, y luego aparece completo en Hoy y en Registro.
- **Importar un Excel o CSV**: si tienes o puedes montar tu plan en una hoja de cálculo, el botón "Importar plan" lo
  lee sin necesitar ninguna clave.

## Novedades de esta versión (última pasada)

- **Objetivos y Configuración ya no se pisan**: la fecha del maratón y el ritmo objetivo se editan ahora solo en
  **Objetivos** (tarjeta "Objetivo principal: tu maratón" arriba del todo), no en Configuración — Configuración se
  queda solo con lo que usa el motor de recomendaciones (frecuencia cardíaca, alergias, fase del plan) y la copia de
  seguridad.
- **Nueva pestaña "Hoy"**: un panel con el entrenamiento de hoy (con todo el detalle: ejercicios, series, RPE, pesos,
  o el calentamiento/cuerpo/vuelta a la calma de una sesión de carrera/natación) y el menú de hoy según la fase
  actual, uno al lado del otro. Si el motor de recomendaciones tiene algo que avisar esta semana, aparece arriba.
- **Importar el plan desde una foto ahora conserva todo el detalle**: antes, al importar una imagen con tu plan
  semanal (como las capturas de tu tabla de entrenos con series/reps/RPE/pesos), esa información se perdía. Ahora
  la lectura por IA copia el contenido completo y literal de cada sesión (ejercicios, series, RPE, pesos de
  referencia; o calentamiento/cuerpo/vuelta a la calma en carrera/natación), y la vista previa de importación tiene
  un cuadro de texto para revisarlo y corregirlo antes de guardar — nunca se guarda nada sin que lo veas primero.
  Si una tirada larga remite a otra hoja para la distancia exacta, se copia esa referencia tal cual, sin inventar
  ningún kilometraje.
- **Ese detalle ya no se pierde al registrar el resultado o importar un .fit**: si registras cómo fue la sesión o
  aplicas un archivo `.fit`, la nota original del plan (con todo el detalle de ejercicios) se conserva y lo nuevo se
  añade debajo, en vez de sustituirla.
- **Interfaz más grande y agrupada**: se ha ampliado la escala de tipografía y espaciado en toda la app (textos,
  botones y campos más grandes y con más aire), la página aprovecha más ancho de pantalla, y el Resumen agrupa
  ahora sus tarjetas bajo títulos de sección ("Esta semana", "Accesos rápidos") en vez de una lista plana.

## Novedades de la versión anterior

- **Interfaz más pulida**: tipografía de marca propia (Inter, no la del sistema), botones y navegación con
  degradado de marca en vez de color plano, tarjetas con una sombra más realista al interactuar, cifras
  alineadas en las estadísticas. Sin reference visual tuya que seguir, he aplicado un criterio "premium/deportivo"
  general — dime si quieres que ajuste colores o algo concreto en cuanto la veas.
- **Feedback y gráficos al importar un .fit**: además de rellenar duración/distancia, ahora Registro te dice si
  fuiste más rápido o más lento que tu media reciente, si hiciste split positivo o negativo, y te muestra un
  gráfico de ritmo y frecuencia cardíaca por vuelta — todo calculado a partir de tus propios datos ya guardados,
  nunca inventado. Tras aplicar la sesión, si esto hace que convenga ajustar la semana, te avisa y te manda a
  Recomendaciones.
- **Ajuste automático del entrenamiento**: en Recomendaciones, cuando el motor detecta que conviene bajar carga
  (molestia, sueño, sobrecarga), aparece una tarjeta "Ajuste automático disponible" con los cambios concretos que
  propone para la semana que viene (quitar el carácter de tirada larga a una sesión, o convertir en descanso la
  sesión menos prioritaria si hay sobrecarga clara) — nunca toca carrera ni natación, nunca inventa un número de
  RPE/duración que no tenías puesto, y nunca actúa si hay una alerta médica activa (ahí solo te dice que pares y
  consultes). Un botón "Aplicar ajuste automático" lo ejecuta de verdad sobre tus sesiones pendientes, dejando una
  nota en cada una explicando qué cambió y por qué — puedes deshacerlo a mano en Plan semanal si no estás de acuerdo.
- **Calendario con detalle completo y copiar al portapapeles**: pulsa cualquier día del Calendario para ver todos
  los detalles de ese día (entrenamiento planificado/realizado con RPE, duración, distancia y notas; el menú de
  ese día según la fase correspondiente; objetivos con esa fecha) y un botón "Copiar todo" que lo deja listo para
  pegar directamente en tus notas del iPhone.
- **Arranque con pantalla de carga animada**: al ejecutar `Abrir EntrenoApp.bat` ahora se abre sola una pantalla
  con el logo y una animación (`Cargando EntrenoApp.html`) que espera a que el servidor esté listo y te lleva
  automáticamente a la app — ya no hace falta copiar ninguna dirección a mano. Sigue habiendo una única ventana
  de consola (la del `.bat`), nada de ventanas adicionales que puedan bloquearse.
- **Importar entrenos desde archivo .fit**: en Registro, botón "Importar .fit" (arriba a la derecha). Sirve
  para los archivos que exportan los relojes deportivos (Garmin, Coros, Suunto...) y apps como Strava. Lee
  fecha, deporte, duración, distancia, ritmo medio y calorías, y te deja elegir a qué sesión planificada
  aplicarlo (o crear una nueva) — el RPE lo sigues poniendo tú, porque eso ningún reloj lo mide. La frecuencia
  cardíaca del archivo se muestra solo como dato informativo, nunca se usa para nada del motor de
  recomendaciones (sigues entrenando por ritmo/RPE).
- **Importar el plan de entrenamiento o el menú desde un archivo**: en Plan semanal ("Importar plan") y en
  Menú ("Importar menú") ahora hay un botón para subir un Excel, CSV, PDF o foto/captura con tu plan o tu
  menú. Con Excel/CSV funciona directamente. Para PDF o imágenes, hace falta añadir una clave de API de
  Anthropic en Configuración (gratis para probar, con coste según uso — se guarda solo en tu ordenador). En
  todos los casos, antes de guardar nada se te muestra una vista previa editable fila por fila — nunca se
  añade nada sin que lo confirmes, y nunca se inventa un dato que no esté en el archivo.

## Rediseño completo de la interfaz (última pasada)

Se ha revisado y rediseñado toda la interfaz. Resumen de lo que se ha encontrado y corregido:

- **Antes**: navegación en una fila de botones de texto que se rompía en varias líneas, sin distinguir bien la sección activa; tarjetas y espaciados inconsistentes entre pantallas; emojis (🏁 🎯) usados como iconografía en el calendario; formularios sin etiquetas (solo placeholder, mal para accesibilidad); ningún aviso al guardar/borrar (silencio total); estados vacíos con una sola frase sin guía; sin jerarquía clara en el resumen (todas las tarjetas con el mismo peso).
- **Ahora**: barra lateral fija en escritorio (con iconos, sección activa resaltada) que se convierte en un menú desplegable accesible en móvil; sistema de diseño centralizado en `src/app/globals.css` (variables de color, tipografía, espaciado, radios — cambiar el tema completo es tocar un solo archivo); iconografía única y consistente (`lucide-react`) sin ningún emoji; componentes reutilizables en `src/components/ui/` (botón, campo con etiqueta, badge, tarjeta de estadística, estado vacío, notificación de confirmación); el Resumen ahora es un panel de control real (aviso destacado si hay que ajustar algo, cuenta atrás del maratón, accesos directos); confirmación antes de borrar algo, y aviso visual (toast) al guardar/eliminar; contraste de texto revisado para cumplir el mínimo de accesibilidad AA (4.5:1) en todos los tonos "atenuados"; probado en escritorio y en móvil (390px) para cada pantalla sin solapamientos ni scroll horizontal no deseado (el calendario, al ser una tabla densa, permite scroll horizontal contenido solo dentro de su propio recuadro, no en toda la página).
- **Se ha mantenido intacta toda la lógica**: los mismos endpoints, los mismos datos, el mismo motor de recomendaciones — este cambio es solo de interfaz.

## Si las versiones anteriores no te arrancaban

Tras confirmar contigo que el `.bat` llegaba hasta el final sin abrir ni una segunda ventana ni el navegador,
se ha simplificado del todo: ahora **todo pasa en una única ventana** (la que ya abres al hacer doble clic).
Ya no se intenta abrir ninguna ventana adicional ni lanzar el navegador automáticamente — esos dos pasos
usaban el comando `start` de Windows para lanzar procesos por su cuenta, y algo en tu equipo (probablemente
una protección de seguridad de Windows) los bloqueaba en silencio sin avisar ni a la app ni a ti.

Ahora, al ejecutar `Abrir EntrenoApp.bat`: la misma ventana instala dependencias si hace falta y arranca el
servidor ahí mismo. Cuando en esa ventana aparezca una línea como `- Local: http://localhost:3210`, abre tú
mismo esa dirección en tu navegador (Chrome, Edge...). Deja la ventana abierta mientras uses la app.

Si aun así no arranca, antes de nada prueba esto:
1. Comprueba que tienes [Node.js](https://nodejs.org) instalado, versión 22 o superior (`node -v` en una
   ventana de comandos).
2. Si Windows bloquea el `.bat` sin más explicación (típico al venir de un archivo descargado de internet):
   clic derecho sobre el archivo → Propiedades → marca "Desbloquear" (si aparece la opción) → Aceptar.
3. Si se abre la ventana "EntrenoApp servidor" y muestra texto en rojo o "Error", copia ese texto — con eso
   se puede diagnosticar exactamente qué falla.

## Qué hay en esta versión

- **Hoy** (nuevo): el entrenamiento y el menú de hoy, juntos, de un vistazo.
- **Plan semanal**: qué toca cada día (carrera R1-R6, gimnasio Día A/B, natación N1/N2...).
- **Registro**: lo que realmente hiciste (estado, RPE, duración, distancia, notas/molestias) y el sueño de cada noche.
- **Resumen**: cumplimiento, RPE medio, medias de sueño de la semana.
- **Recomendaciones**: motor de reglas (carga aguda:crónica, sueño, molestias, síntomas cardiovasculares) que dice si conviene mantener, ajustar, o parar y consultar médicamente.
- **Progreso** (nuevo): gráficos de cumplimiento semanal, RPE/ACWR, sueño y peso corporal a lo largo del tiempo.
- **Objetivos** (nuevo): fija metas (tiempo de carrera, peso, fuerza...) con fecha objetivo y valor actual, con cuenta atrás de días.
- **Calendario** (nuevo): vista mensual con tus objetivos, el día del maratón y tus tiradas largas marcadas.
- **Menú**: objetivos de macros por fase; el detalle día a día se rellenará al importar `Menu_Semanal.docx`.
- **Configuración**: perfil editable y copia de seguridad (exportar/restaurar, tú eliges dónde guardarla).
- **Logo e icono propios**: un pictograma de corredor (provisional — dímelo si quieres que lo cambie por otra idea o por un logo tuyo), ya aplicado como favicon, en la cabecera de la app y como icono para el futuro instalador.
- **Animación de arranque** mejorada, ya con el logo nuevo.

Todo se guarda en una base de datos local (`data/entrenoapp.db`) — nada sale de tu ordenador.

## Cómo probarla ahora mismo (modo navegador, aún sin instalador)

Necesitas [Node.js](https://nodejs.org) (versión 22 o superior). Luego:

1. Descomprime esta carpeta donde quieras.
2. Doble clic en `Abrir EntrenoApp.bat`.
3. Se abre una ventana de servidor (no la cierres) y el navegador con la app.

## Instalador de Windows (siguiente paso, con Claude conectado a tu ordenador)

`Generar instalador.bat` ya está preparado (Electron, mismo patrón que FinanzasApp, ya con el icono y la
animación de arranque nuevos) pero conviene generarlo y probarlo en tu propio ordenador, donde cualquier
fallo se puede depurar de verdad.

## Pendiente

- Importar el menú semanal real (`Menu_Semanal.docx` / `Guia_Semanal.docx`).
- Generar y probar el instalador de escritorio en un Windows real.
- Confirmar si el logo actual (pictograma de corredor) te convence o prefieres otra idea.
- Revisar el motor de recomendaciones con datos reales de varias semanas.
