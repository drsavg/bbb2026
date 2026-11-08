# BabyBet

El casino oficial del baby shower. Hay dos juegos:

- **Fecha de nacimiento:** cada persona elige día y turno (AM/PM). La ficha vale $5.000 y quien gana se lleva el 40% del pozo.
- **Nombre de la bebé:** es gratis, cada persona juega una vez y el premio es sorpresa.

Archivos:
- `index.html`: la página que ven los invitados. Se publica en GitHub Pages.
- `Code.gs`: el script de la planilla de Google, que funciona como comando central y calcula el ganador.

Mientras la página no esté conectada a la planilla, funciona en **modo demo**: las apuestas quedan solo en ese celular. Sirve para probarla.

---

## Antes de empezar

- Necesitas una cuenta de Google y una de GitHub, y unos 20 minutos.
- Hazlo desde el computador. Desde el celular, Apps Script y GitHub son incómodos.
- Ten a mano `index.html` y `Code.gs`.

---

## Parte A · Planilla y script (comando central)

**A1. Crea la planilla.**
Entra a sheets.new y ponle "BabyBet" de nombre. Si alguien te va a ayudar, compártela con esa persona como **Editora**: así también la puede ver y editar desde su celular o iPad.

**A2. Pega el script.**
En la planilla, ve a **Extensiones › Apps Script**.
- Arriba a la izquierda, cambia "Proyecto sin título" por "BabyBet".
- Borra todo lo que trae `Código.gs`, pega el contenido completo de `Code.gs` y guarda (ícono de disquete o Ctrl/Cmd + S).

**A3. Crea las hojas.**
> ⚠️ Google te va a pedir permisos y va a mostrar "Google no verificó esta app". Es normal, porque el script es tuyo. Elige tu cuenta, entra a **Configuración avanzada › Ir a BabyBet (no seguro)** y presiona **Permitir**. El único permiso que pide es para ver y editar **esta** planilla, no las demás.

En la barra de arriba, elige la función `configurar` y presiona **Ejecutar**. Cuando vuelvas a la planilla verás cuatro hojas: **Fichas, Nombres, Resultado y Config**. La hoja Resultado va a decir "Cuando nazca, completa…". Eso es correcto.

**A4. Publícalo como aplicación web.**
> ⚠️ En "Quién tiene acceso" tienes que elegir **Cualquier usuario** (en inglés, *Anyone*). No elijas la opción "con cuenta de Google", porque los invitados que no tengan sesión iniciada no podrían apostar.

1. Ve a **Implementar › Nueva implementación**.
2. En el engranaje, elige **Aplicación web**.
3. Deja "Ejecutar como: **Yo**" y "Quién tiene acceso: **Cualquier usuario**".
4. Presiona **Implementar** y copia la **URL de la aplicación web**, la que termina en `/exec`. La vas a usar en B3.

---

## Parte B · Página en GitHub Pages

**B1. Crea el repositorio.**
En github.com, ve a **New repository**, ponle de nombre `babybet`, déjalo como **Public** y presiona **Create repository**.
(Para usar GitHub Pages gratis, el repositorio tiene que ser público. La página no tiene información privada: los nombres apostados viven solo en tu planilla.)

**B2. Sube los archivos.**
Presiona **uploading an existing file**, arrastra `index.html` (y este README si quieres) y presiona **Commit changes**.

**B3. Conecta la página con la planilla.**
> ⚠️ Hazlo en el editor de GitHub, no en TextEdit ni en Word, porque esos programas cambian las comillas rectas `'` por comillas curvas y la página deja de funcionar. La URL va entre comillas simples y sin espacios.

Abre `index.html` en GitHub y presiona el lápiz (**Edit**). Con Ctrl/Cmd + F, busca esta línea:
```js
  API_URL: '',
```
Cámbiala por tu URL de A4:
```js
  API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```
Presiona **Commit changes**.

**B4. Activa GitHub Pages.**
Ve a **Settings › Pages** y, en "Build and deployment", elige:
- Source: **Deploy from a branch**
- Branch: **main** y carpeta **/ (root)**

Presiona **Save**. En uno o dos minutos la página queda en:
`https://TU-USUARIO.github.io/babybet/`

---

## Parte C · Prueba general (10 minutos)

**C1. Apuesta de prueba.**
Abre la página en tu celular. El aviso de "Modo demo" **no** debería aparecer. Apuesta una o dos fichas con un nombre de prueba y revisa que lleguen a la hoja **Fichas** y a **Nombres**.

**C2. Pago y pozo.**
En la hoja Fichas, marca **Pagada** en una ficha. Después, en la página, ve a "Mis fichas" y toca **Actualizar**: la ficha debería decir "Pagada" y el pozo, $5.000.

**C3. Simula el nacimiento.**
En Config, escribe una fecha y una hora de prueba en **Nacimiento: fecha** (ej. `2026-12-26`) y **Nacimiento: hora** (ej. `03:15`). La hoja **Resultado** debería mostrar el ranking, con el ganador en el puesto 1 y su premio.

**C4. Deja todo limpio.**
> ⚠️ Borra las filas completas (clic derecho en el número de fila › Eliminar fila), no solo el contenido. Si borras solo el contenido, las fichas de prueba siguen ocupando sus turnos.

1. Borra las filas de prueba en **Fichas** y en **Nombres**.
2. Borra la fecha y la hora de prueba en Config.
3. En Apps Script, elige la función `reiniciarContador` y presiona **Ejecutar**. Así la primera ficha real será la N.º 1.

---

## Parte D · Cartel con el QR

**D1.** Abre tu página agregando `?cartel` al final:
`https://TU-USUARIO.github.io/babybet/?cartel`
Aparece un cartel con el logo, el QR, el precio de la ficha y los dos juegos. El QR apunta a tu página.

**D2. Imprímelo o guárdalo como PDF.**
> ⚠️ En el cuadro de impresión, elige **Márgenes: Ninguno** y activa **Gráficos de fondo** (en inglés, *Background graphics*). Si no lo haces, el fondo sale blanco.

Presiona **Imprimir cartel**. Cabe en una hoja carta o A4. Si lo vas a imprimir en una imprenta, guárdalo como PDF. También puedes dejarlo abierto en un iPad o en la tele durante el shower.

---

## Durante el shower

| Quieres… | Haz esto en la planilla (también funciona desde la app del celular o el iPad) |
|---|---|
| Registrar un pago | Marca **Pagada** en la hoja Fichas. El pozo solo cuenta las fichas pagadas. |
| Anular una ficha que no se pagó | Elimina la fila completa. El turno queda libre de nuevo. |
| Cerrar las apuestas | En Config, desmarca **Apuestas abiertas**. |
| Cambiar el valor, el rango de fechas o el máximo de fichas | Edita la columna B de Config. No cambies los textos de la columna A. |

Los invitados pueden tocar **Actualizar** en "Mis fichas" para ver si su pago ya está registrado.

## Cuando nazca

**Fecha:** en Config, completa **Nacimiento: fecha** y **Nacimiento: hora** (la hora exacta en formato 24 h; por ejemplo, `03:15` o `15:40`). La hoja **Resultado** se actualiza sola:
- En la primera línea muestra la fecha y hora del nacimiento, el pozo y el premio.
- Después viene el ranking de las fichas pagadas: puesto, jugador, fecha, turno y distancia en turnos.
- La columna Detalle dice por qué quedó en ese lugar, por ejemplo "Exacta", "Mismo día, otro turno", "1 turno antes" o "empate resuelto por la hora del nacimiento".
- El **puesto 1 gana** y su fila muestra el premio.

**Nombre:** en la hoja **Nombres**, filtra la columna **Normalizado**, que no tiene tildes ni mayúsculas ("Sofía" y "sofia" quedan iguales).

### Regla de la fecha (la misma que aparece en la página, en "¿Cómo se gana?")
1. Gana la ficha **exacta**: día y turno. AM es de 00:00 a 11:59 y PM de 12:00 a 23:59.
2. Si nadie acierta, gana la ficha a **menos turnos** de distancia.
3. Si hay igual distancia, el otro turno del **mismo día** gana sobre otro día. Por ejemplo, si nace un sábado en la mañana y nadie puso sábado AM:
   - sábado PM gana sobre viernes PM, aunque ambos estén a 1 turno;
   - viernes PM (1 turno) gana sobre domingo AM (2 turnos).
4. Si dos fichas siguen empatadas (una antes y otra después, a la misma distancia), gana la que esté **más cerca de la hora exacta** del nacimiento. En la práctica: si nació en la primera mitad del turno (antes de las 06:00 o de las 18:00), gana la ficha anterior, y si nació después, la posterior.
5. Último recurso: gana quien apostó primero (el N.º menor).

Solo participan las **fichas pagadas**.

---

## Reglas que ya vienen configuradas

- Cada día-turno se juega **una sola vez**. Si dos personas apuestan lo mismo al mismo tiempo, el script lo bloquea y la segunda recibe "Alguien tomó esa ficha".
- Cada persona puede tener **3 fichas** de fecha como máximo. Se cambia en Config (0 = sin límite).
- El nombre se adivina **una vez** por persona, es gratis y no requiere comprar ficha.
- Cada persona se identifica con su **nombre + los últimos 4 dígitos del celular**. Las tildes y mayúsculas no cuentan.
- Los nombres apostados **nunca** se envían a la página. Solo están en la planilla.

---

## Si ya habías montado la versión anterior

> ⚠️ No uses "Nueva implementación", porque eso crea **otra URL** y tendrías que cambiar la página y el QR. Usa "Administrar implementaciones".

1. En Apps Script, reemplaza todo `Code.gs` por el nuevo y guarda.
2. Ejecuta `configurar` otra vez. No borra nada: agrega la hoja **Resultado** y la fila **Nacimiento: hora** en Config. La columna "Distancia (turnos)" de Fichas y la fila "Nacimiento: turno" de Config ya no se usan; puedes borrarlas.
3. Ve a **Implementar › Administrar implementaciones**, presiona el lápiz, en "Versión" elige **Nueva versión** y presiona **Implementar**.
4. En GitHub, sube el `index.html` nuevo (reemplaza el anterior) y vuelve a pegar tu URL en la línea `API_URL` (paso B3).

## Si cambias `Code.gs` más adelante

> ⚠️ Los cambios del script **no** se publican solos.

Para publicarlos: **Implementar › Administrar implementaciones**, presiona el lápiz, en "Versión" elige **Nueva versión** y presiona **Implementar**. La URL no cambia.

---

## Problemas comunes

| Síntoma | Solución |
|---|---|
| Sigue apareciendo "Modo demo" | La línea `API_URL` quedó vacía o con comillas curvas. Revisa el paso B3. GitHub Pages puede tardar 1–2 minutos en actualizarse. |
| "No pudimos conectar con la mesa" | En la implementación, "Quién tiene acceso" no está en **Cualquier usuario**. Corrígelo en Administrar implementaciones. |
| La hoja Resultado muestra un error en A1 | Guarda el script, recarga la planilla y escribe a mano en A1: `=BABYBET_RESULTADO(Fichas!A2:H;Config!A2:B)` |
| Resultado dice "No entiendo la fecha/hora" | Escribe la fecha como `2026-12-26` y la hora como `15:40`. |
| La página de GitHub da error 404 | Revisa que el repositorio sea público y que en Pages esté elegido `main` y `/ (root)`. Espera un par de minutos. |
| El cartel sale sin fondo | Activa **Gráficos de fondo** en el cuadro de impresión. |
