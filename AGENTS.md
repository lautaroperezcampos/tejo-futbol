# AGENTS.md — Tejo Fútbol

Guía para agentes de IA (OpenCode, Claude Code, etc.) que trabajen en este proyecto.

## Proyecto
Juego de fútbol 1 vs 1 en cancha vertical (mezcla de Pong, Haxball y tejo) hecho con
**Phaser 4** y **Vite**, en JavaScript (ES modules). Se publica en **Vercel**.

- Diseño del juego: `docs/GDD.md` (leerlo antes de cambiar reglas).
- Plan de implementación y estado de cada paso: `docs/plan.md`.

## Comandos
- `npm install` — instala dependencias.
- `npm run dev` — servidor de desarrollo (http://localhost:5173).
- `npm run build` — genera la versión final en `dist/` (es lo que publica Vercel).
- `npm run preview` — sirve `dist/` para probar la build.

## Estructura
- `index.html` — página que carga el juego.
- `src/main.js` — configuración de Phaser y lista de escenas.
- `src/config.js` — todas las constantes del juego (tamaños, velocidades, goles para ganar).
- `src/i18n.js` — idiomas: español (por defecto), inglés y portugués de Brasil. Todo texto
  que ve el jugador sale de `t('clave', { datos })`. El inglés y el portugués vienen de la
  API **Traducila** (`TRADUCILA` en `src/config.js`, `loadTranslations()` al arrancar), cuyas
  keys son los textos en español. `src/lang/es.js` tiene el español; `en.js` y `pt.js`, la
  copia de respaldo si la API no responde o le falta un texto (mismas claves; si falta una
  se usa la de español). Los nombres de las selecciones en otros idiomas están en `NATIONS`
  de esos archivos. El idioma se guarda en localStorage (`tejo-futbol-idioma`) y se cambia
  en Opciones. **Al agregar o cambiar un texto**, actualizar los tres archivos y cargarlo
  también en el panel de Traducila (key en español + phrases en y pt): la key tiene que ser
  idéntica al texto de `es.js`, incluidos los `{datos}`.
- `src/sound.js` — efectos de sonido generados con Web Audio (no hay archivos de audio).
  Pasan por un refuerzo y un limitador; los volúmenes base de todo el audio están en
  `AUDIO` de `src/config.js`. También guarda los tres volúmenes que elige el jugador
  (`CHANNELS`: música, hinchada, efectos; `getChannel`/`setChannel`) y el "silenciar
  todo" (`toggleMute`, tecla M), en localStorage (`tejo-futbol-audio`). Los sonidos de
  menú son `sfx.select` (moverse), `sfx.confirm` (aceptar) y `sfx.back` (volver/salir).
- `src/music.js` — audio grabado (en `public/audio/`, copiado de `musica futbol tejo/`):
  música del menú (loop), canción de campeón (loop en la liga o copa ganada, con
  `playMenuMusic(scene, { champion: true })`), música de fondo del partido (rotación de
  4 temas que cambia en cada gol; un gol con un power-up activo pone el quinto), cantos de hinchada (bajan la música mientras suenan), grito de gol y "uuuh". Los cantos se disparan desde
  `GameScene.updateChant()`; la música del menú, con `playMenuMusic()` de `src/ui.js`.
- `src/art.js` — todos los gráficos (cancha, tribuna, jugadores, pelota, explosión),
  dibujados con Canvas 2D al iniciar. La única imagen es el logo del estudio
  (`public/logo-lagartija.png`), que carga `OptionsScene` para los créditos.
- `src/ui.js` — textos con contorno, la cinta violeta de los carteles y el botón de
  opciones (`optionsButton`, engranaje arriba a la derecha en cada pantalla; también con
  la tecla O, y la M silencia todo). `openOptions(scene)` abre las opciones,
  `openSoundPanel(scene)` el sonido y `controlsPanel` el panel de controles. También
  `iconButton` (botón ancho con ícono) y los íconos `draw*Icon` que usa la pausa
  (`GameScene.makePauseMenu`).
- `src/scenes/OptionsScene.js` — "OPCIONES": botones CONTROLES (abre `controlsPanel`),
  SONIDO (abre `SoundScene`), IDIOMA (← → cambia el idioma y redibuja la pantalla de atrás,
  salvo un partido en curso) y CRÉDITOS (abre `creditsPanel`, nombres en `CREATORS` de
  `src/config.js`). Se abre encima de cualquier pantalla (también desde la
  pausa) y la deja en pausa hasta cerrarse.
- `src/scenes/SoundScene.js` — menú de sonido (un deslizador por canal + silenciar todo),
  abierto desde las opciones. `music.js` aplica a cada audio grabado el volumen de su
  canal (`CHANNEL`).
- `src/scenes/MenuScene.js` — menú con dos botones grandes, cada uno abre su página con
  dos tarjetas: Partido normal (vs IA, vs amigo) y Torneo (liga, copa). La dificultad y
  los power-ups se eligen en la pantalla "antes de jugar" (`src/setupPanel.js`, clase
  `SetupPanel`, usada por `TeamSelectScene` y `NationSelectScene`).
- `src/scenes/GameScene.js` — partido: movimiento, física de la pelota, goles, fin.
  En modo liga además: reloj de 90 s, pausa y guardado del resultado. Cada jugador tiene
  `side` ('top' / 'bottom'); en 1 vs 1 el jugador 1 puede jugar arriba (`data.p1Side`),
  así que para saber quién está en un lado usar `playerOn(side)`, no dar por hecho que
  p1 está abajo. El marcador es un recuadro en la esquina (`makeHud`, medidas en
  `SCORE_BOX`) con el dash como aro alrededor de cada bolita (`drawDashBars`).
- `src/scenes/TeamSelectScene.js` — selector de club estilo FIFA (mismo look que el de
  la copa) para una liga nueva o un amistoso. La tarjeta (`sportsCard`) y el círculo de
  nivel (`levelBadge`, `levelOf`, `starsOf`) que comparten los dos están en `src/ui.js`.
- `src/scenes/NationSelectScene.js` — selector de selección estilo FIFA para una copa nueva.
  Q / E (L1 / R1 en el joystick, que `padMenu` manda como KeyQ / KeyE) cambian de continente
  (dibujados con `keycap` y `padButton` de `src/ui.js`); ↑ ↓ cambian de fila de banderas.
- `src/scenes/CupDrawScene.js` — "ARMÁ LOS GRUPOS": si en el sorteo se elige "lo armo yo",
  el jugador cambia selecciones de lugar en los grupos (o en los cruces de la primera ronda)
  antes de guardar la copa (`drawSlots`, `setSlots`, `randomSlots` de `src/cup/cup.js`).
- `src/scenes/LeagueScene.js` — tablas de las dos zonas, resultados, playoffs, próximo partido y campeón.
- `src/scenes/CupScene.js` — copa: grupos, llaves, resultados, próximo partido y campeón.
- `src/cup/nations.js` — las 48 selecciones (colores, fuerza, confederación, Mundiales).
- `src/cup/flags.js` — banderas de las 48 dibujadas con Canvas 2D (`flagTexture`).
- `src/cup/cup.js` — copa: sorteo de grupos, mejores terceros, llaves, simulación
  (penales), guardado en localStorage.
- Partidos de torneo: `GameScene` recibe `data.match` con `record(userGoals, rivalGoals)`
  y `back` (a dónde vuelve), así sirve igual para la liga y la copa; `knockout: true`
  activa el gol de oro.
- `src/league/teams.js` — los 30 equipos: colores (titular y suplente), fuerza, choque de
  camisetas y `CLASSICS` (los clásicos, que van en zonas opuestas).
- `src/league/league.js` — dos zonas de 15 + 2 interzonales (16 fechas) y playoffs desde
  octavos: sorteo, fixture, simulación, tablas, guardado en localStorage y bots por fuerza.
  El link `?trailer=<id del equipo>[&dificultad=<nivel>]` (`src/main.js`, `trailerLeague`)
  reemplaza la liga guardada por una con las 16 fechas jugadas y ese equipo clasificado,
  para grabar los playoffs sin jugar las zonas.
- `src/game/Bot.js` — inteligencia del bot (muy fácil, fácil, medio, difícil; valores en `BOT_LEVELS`).
- `src/game/juice.js` — efectos: ojitos, red que se mueve, tribuna que salta, textos
  flotantes y detección de tiros al arco. La tribuna son imágenes de la hoja `fans` (`art.js`) en una
  capa que solo se muestra en el festejo: no dibujarla con `Graphics`, cuesta 20 ms por cuadro.
- `src/game/Particles.js` — partículas livianas (polvo, pasto, fuego) dibujadas en un Graphics.
- `src/game/Replay.js` — graba los últimos segundos para la repetición del gol.
- `src/game/Hazards.js` — power-ups opcionales (hielo, jabón, arco gigante, hongo y poción):
  aparición, choque con la pelota (se los lleva `ball.lastTouch`, el último que la tocó),
  tiro al rival (el hongo vuelve al dueño) y efectos. El tamaño de cada jugador vive en
  `p.size` / `p.r` (radio actual): usar `p.r` y no `PLAYER_R` en choques del jugador.
- `src/gamepads.js` — joystick (Gamepad API); `padMenu()` lo conecta a los menús.
- `src/mobile.js` — versión celular: `MOBILE` (pantalla táctil, o `?celular` / `?pc` en el
  link), lado de los controles (`touchInverted`), `vibrate()` y ajustes de la página.
  En celular, `GameScene.layoutMobile()` cambia el tamaño del juego a la forma de la
  pantalla mientras dura el partido (y lo devuelve a 820 x 1120 al salir): barra del
  marcador arriba (`makeMobileHud`), solo la cancha en la cámara principal y la franja de
  `src/game/TouchControls.js` (joystick y los botones DASH y PATEAR en diagonal) abajo. La cámara de UI
  queda corrida para que lo armado para 820 x 1120 caiga sobre la cancha: en pantalla,
  y = y de UI - `uiCam.scrollY`. Medidas en `MOBILE_LAYOUT` de `src/config.js`.
  `GameScene` ya tiene un método `touch()` (la pelota tocó algo): los controles táctiles
  son `this.touchPad`.
- `GameScene` usa dos cámaras: la principal (zoom/seguimiento) y una de UI fija. Todo
  objeto nuevo va al mundo salvo que se cree dentro de `this.asUI(() => ...)`.
- Cambios de pantalla: usar `goTo(scene, key, data)` de `src/ui.js` y llamar
  `wipeIn(this)` al principio de cada `create()`.

## Convenciones
- Código y nombres en inglés; documentación en español. Los textos que ve el jugador van
  en `src/lang/` (los tres idiomas) y en Traducila, y se usan con `t()`, nunca sueltos en
  el código.
- Los números del juego van en `src/config.js`, no sueltos en el código.
- La física de la pelota es propia (no usa Arcade Physics) y se calcula en sub-pasos
  para que la pelota nunca atraviese paredes ni jugadores. Mantener eso al cambiarla.
- Después de cada cambio: correr `npm run build` y probar el juego con `npm run dev`.
- Al terminar un paso del plan, marcarlo como hecho en `docs/plan.md`.
