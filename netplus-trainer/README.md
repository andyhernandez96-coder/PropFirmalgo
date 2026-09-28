# Network+ Trainer

Una app para practicar preguntas del examen **CompTIA Network+ (N10-009)** en tu propio ordenador.

- Importas preguntas (las que te da Claude en el chat, o archivos `.json`).
- Practicas con respuesta inmediata, o haces un **examen simulado** con reloj, como el de verdad.
- Ves tu progreso por dominio, repasas tus errores y la app te recuerda qué repasar cada día.

Funciona **sin internet**, sin cuentas y sin enviar nada a ningún sitio. Todo se guarda en tu PC.

> Los textos de la app están en inglés, como el examen real.

---

## 1. Lo que necesitas instalar (solo la primera vez)

Necesitas dos programas gratuitos. Si ya los tienes, salta al paso 2.

### 1.1 Node.js (el motor que hace funcionar la app)

1. Entra en **https://nodejs.org**
2. Descarga la versión que pone **LTS** (es la recomendada). Sirve cualquier versión **20 o superior**.
3. Abre el archivo descargado (`.msi`) y pulsa **Next** en todo hasta **Finish**. No cambies nada.
4. Comprueba que se instaló:
   - Pulsa la tecla **Windows**, escribe `PowerShell` y ábrelo.
   - Escribe esto y pulsa **Enter**:
     ```powershell
     node -v
     ```
   - Tiene que salir algo como `v22.12.0` o `v24.5.0`. Si el primer número es 20 o más, perfecto.

### 1.2 Git (para descargar la app y actualizarla)

1. Entra en **https://git-scm.com/download/win**
2. Descarga el instalador para Windows y ábrelo.
3. Pulsa **Next** en todo hasta **Finish**. No cambies nada.
4. **Cierra PowerShell y vuelve a abrirlo** (para que reconozca Git).

---

## 2. Descargar la app (solo la primera vez)

En PowerShell, copia y pega estas líneas, una por una, pulsando **Enter** después de cada una:

```powershell
cd $HOME\Documents
git clone -b claude/network-plus-ccna-tutor-hcb4le https://github.com/andyhernandez96-coder/PropFirmalgo.git
cd PropFirmalgo\netplus-trainer
npm install
```

- La línea `git clone` descarga la app en tu carpeta **Documentos**. Si GitHub te pide iniciar sesión, entra con tu cuenta de GitHub en la ventana que aparece.
- La línea `npm install` descarga lo que la app necesita. Tarda uno o dos minutos. Es normal que salgan muchas líneas de texto.

---

## 3. Abrir la app (cada vez que quieras estudiar)

1. Abre **PowerShell**.
2. Escribe:
   ```powershell
   cd $HOME\Documents\PropFirmalgo\netplus-trainer
   npm run dev
   ```
3. El navegador se abre solo en **http://localhost:5173**. Si no se abre, abre tú el navegador y escribe esa dirección.
4. **No cierres la ventana de PowerShell mientras estudias.** Esa ventana es la app funcionando.

**Para cerrar la app:** ve a la ventana de PowerShell y pulsa **Ctrl + C**. Si pregunta algo, escribe `S` o `Y` y pulsa Enter.

La app ya trae un banco de **1015 preguntas** tipo examen: 15 de ejemplo + 1000 del archivo `seed/netplus-1000.json`, repartidas según el peso de cada dominio del N10-009 (Concepts 230, Implementation 200, Operations 190, Security 140, Troubleshooting 240).

- Las preguntas están en **inglés** (como el examen) y las explicaciones en **español**.
- Si ya usabas la app antes de esta actualización, las 1000 preguntas se añaden solas la próxima vez que la abras (después de `git pull`). No se duplica nada y tu progreso se mantiene.
- Cada archivo de `seed/` se carga **una sola vez**. Si borras preguntas del banco, no vuelven a aparecer.

---

## 4. Meter preguntas en la app

Ve a la pestaña **Import**. Hay cuatro maneras.

### Opción A — Pedirle preguntas nuevas a Claude (la recomendada)

1. En la app, ve a **Settings**.
2. En "Get new questions from Claude", elige cuántas preguntas quieres y, si quieres, un dominio u objetivo.
3. Pulsa **Copy generator prompt**.
4. Pega ese texto en un chat con Claude y envíalo.
5. Claude te devuelve un bloque de código. Cópialo entero.
6. En la app: **Import → Paste JSON**, pégalo, pulsa **Preview** y luego **Import X valid**.

Las preguntas llegan en inglés (como el examen) y las explicaciones en español.

### Opción B — Pegar texto del chat

Si Claude te da preguntas escritas normalmente (sin código), usa **Import → Paste text**. Entiende formatos como este:

```
1. Which protocol uses port 3389?
A) SSH  B) RDP  C) Telnet  D) SMB
Answer: B
Explanation: RDP usa el puerto TCP 3389.
```

También entiende:
- Opciones escritas `A)`, `A.`, `(A)` o `a)`, en la misma línea o una por línea.
- `Answer: B, D` o `Answers: B and D` para preguntas de varias respuestas.
- `(Choose TWO)` en la pregunta.
- El formato de las sesiones del tutor en español, con la sección **Answer Key** al final (`1. Respuesta correcta: b)`).

Si una pregunta no dice a qué dominio pertenece, la vista previa te deja elegirlo (una por una o todas a la vez).

### Opción C — Subir un archivo

**Import → Upload file** y eliges un archivo `.json`.

### Opción D — La carpeta "inbox" (automática)

Cualquier archivo `.json` que dejes en la carpeta `data\inbox` se importa solo en unos 10 segundos (con la app abierta).

- Si se importó bien, el archivo se mueve a `data\inbox\processed`.
- Si no se pudo leer, se mueve a `data\inbox\failed`.
- Si algunas preguntas tenían errores, aparece un archivo `.errors.txt` al lado explicando cuáles.

La ruta exacta de la carpeta aparece en **Import → Inbox folder**.

**Preguntas repetidas:** si importas una pregunta con el mismo texto que otra que ya tienes, la app la detecta y no la duplica.

---

## 5. Cómo estudiar

En la pestaña **Study**:

| Modo | Qué hace |
|---|---|
| **Exam Simulation** | 90 preguntas en 90 minutos (puedes cambiarlo), repartidas según el peso real de cada dominio. No ves si aciertas hasta el final. Puedes marcar preguntas y saltar entre ellas. |
| **Spaced Repetition** | Te pregunta solo lo que toca repasar hoy. Si aciertas, la pregunta vuelve más tarde (1, 2, 4, 8 y luego 16 días). Si fallas, vuelve mañana. |
| **Practice** | Preguntas al azar. Después de cada respuesta ves si acertaste y por qué. |
| **Weak Spots** | Solo las preguntas que has fallado alguna vez, empezando por las que peor llevas. |
| **Domain Drill** | Solo un dominio, o solo un objetivo. |

Después de cada respuesta (y en la revisión del examen) hay un botón **Ask Claude**: copia la pregunta, tu respuesta y la correcta, listas para pegar en el chat y pedir una explicación.

### Atajos de teclado

| Tecla | Qué hace |
|---|---|
| `1`–`4` o `A`–`D` | Elegir una opción |
| `Enter` | Enviar respuesta / siguiente pregunta |
| `F` | Marcar la pregunta para revisarla |
| `E` | Mostrar u ocultar la explicación |
| `Esc` | Pausar (y el reloj se para) |

### Sobre la nota del examen simulado

La app te da una nota **estimada** de 100 a 900. **No es la escala oficial**: CompTIA no publica cómo convierte los aciertos en nota. La app usa una regla simple (100 + 800 × % de aciertos), así que 720 equivale más o menos a un 77,5 % de aciertos. Úsala para ver tu tendencia, no como garantía.

---

## 6. Dónde se guardan tus datos

Todo está en la carpeta **`data`**, dentro de `netplus-trainer`:

| Archivo o carpeta | Qué guarda |
|---|---|
| `data\questions.json` | Todas tus preguntas |
| `data\progress.json` | Cada respuesta que has dado y en qué caja de repaso está cada pregunta |
| `data\sessions.json` | El historial de sesiones y exámenes |
| `data\inbox\` | Carpeta de importación automática |
| `data\backups\` | Copias automáticas que hace la app antes de restaurar un backup |

Puedes ver la ruta completa en **Settings → Where your data lives**.

---

## 7. Hacer una copia de seguridad

**Guardar:** **Settings → Export backup**. Se descarga un archivo `netplus-backup-FECHA.json` con todo: preguntas, respuestas y sesiones. Guárdalo en un sitio seguro (Google Drive, un USB…).

**Recuperar:** **Settings → Import backup…** y eliges ese archivo. **Esto reemplaza todos tus datos actuales** por los del backup. Antes de hacerlo, la app guarda una copia de lo que tenías en `data\backups\`, por si te equivocas.

Otra forma: copiar la carpeta `data` entera a otro sitio.

---

## 8. Actualizar la app

Cuando haya una versión nueva, con la app **cerrada**:

```powershell
cd $HOME\Documents\PropFirmalgo\netplus-trainer
git pull
npm install
```

Tus datos **no se tocan**: la carpeta `data` no forma parte de lo que se descarga.

> Si descargaste la app como ZIP en vez de con `git clone`, para actualizar tendrás que descargar el ZIP nuevo y copiar tu carpeta `data` antigua dentro de la nueva.

---

## 9. Si algo falla

**PowerShell dice que "la ejecución de scripts está deshabilitada" al escribir `npm`.**
Usa `npm.cmd` en lugar de `npm`:
```powershell
npm.cmd install
npm.cmd run dev
```
O, para arreglarlo de una vez, ejecuta esto una sola vez y responde `S` o `Y`:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Sale "Port 5173 is already in use" o algo parecido con 3001.**
La app ya está abierta en otra ventana de PowerShell. Ciérrala con **Ctrl + C** en esa ventana, o simplemente usa la que ya está abierta.

**La app muestra en rojo "Cannot reach the local server".**
La ventana de PowerShell se cerró o se paró. Vuelve al paso 3.

**Sale un error parecido a `Cannot find module @rollup/rollup-win32-x64-msvc`.**
Borra la carpeta `node_modules` y el archivo `package-lock.json` (si existe) dentro de `netplus-trainer`, y vuelve a ejecutar `npm install`.

**Cualquier otro error:** copia el texto rojo de PowerShell y pégalo en el chat con Claude.

---

## 10. Limitaciones conocidas

- **No hay PBQs** (preguntas de arrastrar y soltar o simulaciones de configuración). La app solo hace preguntas de opción múltiple, de una o varias respuestas. Los PBQs sí salen en el examen real, así que practícalos por otro lado.
- La nota de 100 a 900 es una **estimación**, no la escala oficial.
- Dos preguntas con **exactamente el mismo texto** se consideran la misma, aunque tengan opciones distintas.
- El Dashboard solo muestra "objetivos más débiles" si tus preguntas incluyen el campo `objective` (las que genera el prompt de la app lo incluyen cuando Claude está seguro del número).
- Las 1000 preguntas del banco son originales (no son preguntas reales del examen). Cada una lleva el número de objetivo del N10-009 (por ejemplo `2.3`); esa numeración la puso Claude de memoria, así que compárala con tu PDF de objetivos oficiales si algo no te cuadra.
- El banco trae 36 preguntas de subnetting de opción múltiple, pero no sustituye los drills a mano: esos siguen en SubnetSolver.

---

## Para desarrolladores

```powershell
npm run dev     # API (Express, puerto 3001) + web (Vite, puerto 5173)
npm run test    # tests con vitest
npm run build   # comprobación de tipos + build de producción
npm run questions:build   # regenera seed/netplus-1000.json desde content/
```

- `shared/`: schemas zod, parser de texto, barajado, reparto por dominios, Leitner, estadísticas y prompts. Lo usan el frontend y el backend.
- `server/`: Express; guarda JSON en `data/` con escritura atómica (archivo temporal + renombrar).
- `client/`: React + Tailwind.
- `tests/`: tests de vitest.
- `NETPLUS_DATA_DIR` cambia la carpeta de datos; `NO_OPEN=1` evita que se abra el navegador.
- No se sube `package-lock.json` a propósito: uno generado en Linux puede romper en Windows la instalación de los binarios específicos de cada sistema. Las versiones están fijadas en `package.json`.
