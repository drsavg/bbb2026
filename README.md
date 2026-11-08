# BabyBet

El casino oficial del baby shower. Hay dos juegos:

- **Fecha de nacimiento:** cada persona elige día y turno (AM o PM). La ficha vale $3.000, cada persona puede tener hasta 5 fichas y quien gana se lleva el 40% del pozo.
- **Nombre de la bebé:** es gratis, cada persona juega una vez y el premio es sorpresa. Se puede jugar desde la primera pantalla, sin comprar fichas.

Archivos:
- `index.html`: la página de los invitados. Tiene música suave y sonido de tragamonedas al apostar, y abriéndola con `?cartel` muestra el cartel con el QR.
- `caja.html`: la app de los anfitriones. Se usa con PIN para cobrar, liberar fichas, ver los nombres, calcular el ganador, cambiar los ajustes y reiniciar todo desde el celular.
- `Code.gs`: el script de la planilla de Google, que funciona como comando central.

---

## Actualizar a esta versión (si ya tenías BabyBet funcionando)

> ⚠️ No uses "Nueva implementación", porque eso crea **otra URL** y la página dejaría de funcionar. Usa siempre "Administrar implementaciones".

1. Abre la planilla, ve a **Extensiones › Apps Script**, reemplaza todo el código por el nuevo `Code.gs` y guarda.
2. Elige la función `configurar` y presiona **Ejecutar**. No borra nada. Hace tres cosas:
   - Cambia la ficha a $3.000, el máximo a 5 fichas y el tablero a 1 de noviembre–31 de enero. Solo cambia los valores que siguen como venían originalmente.
   - Crea un **PIN de 6 dígitos** para la caja. Aparece en el **Registro de ejecución** y en la fila **PIN administrador** de la hoja Config.
   - Deja todo listo para la caja.
3. Ve a **Implementar › Administrar implementaciones**, presiona el lápiz, en "Versión" elige **Nueva versión** y presiona **Implementar**.
4. Abre la caja (`…/caja.html`), entra con el PIN y, en **Ajustes › Reiniciar todo**, borra las apuestas de prueba.

---

## La caja (`caja.html`)

Ábrela en tu celular y en el iPad. El PIN queda guardado en ese aparato hasta que presiones "Salir".

| Pestaña | Qué hace |
|---|---|
| **Cobros** | Muestra una tarjeta por invitado con sus fichas y lo que debe. "Cobrar" marca todas sus fichas como pagadas, y cada ficha tiene su propio interruptor. El basurero **libera** una ficha tomada por error y deja el turno libre para otra persona. |
| **Nombres** | Muestra todas las apuestas de nombre. Puedes borrar una para que esa persona vuelva a apostar. |
| **Resultado** | Al ingresar la fecha y la hora del nacimiento, muestra el ganador, el premio y el ranking. Si escribes el nombre real, muestra quién acertó y los nombres parecidos. El nombre real no se guarda. |
| **Ajustes** | Abre o cierra la mesa, cambia el valor de la ficha, el máximo de fichas, el % y el rango del tablero, y tiene el botón **Reiniciar todo**. |

- **Reiniciar todo** borra fichas, nombres y nacimiento, y la numeración vuelve a la N.º 1. Los ajustes y el PIN se mantienen.
- Para reiniciar desde Apps Script, ejecuta `reiniciarTodo`.
- Si fallas el PIN 5 veces seguidas, la caja se bloquea 10 minutos.
- Puedes cambiar el PIN en la hoja Config, fila **PIN administrador**.

---

## Montaje desde cero

**A. Planilla y script**
1. Entra a sheets.new y ponle "BabyBet" de nombre. Tiene que ser una hoja de cálculo, no un documento.
2. En esa hoja, ve a **Extensiones › Apps Script**, pega `Code.gs` y guarda.
3. **Antes de ejecutar:** Google va a mostrar "Google no verificó esta app". Entra a **Configuración avanzada › Ir a BabyBet (no seguro) › Permitir**. Pide un solo permiso, para ver y editar **esta** planilla.
   Ejecuta `configurar`.
4. **Antes de implementar:** en "Quién tiene acceso" elige **Cualquier usuario**.
   Ve a **Implementar › Nueva implementación › Aplicación web**, con "Ejecutar como: Yo", y copia la URL que termina en `/exec`.

**B. Página**
5. **Antes de editar:** hazlo en el editor de GitHub, no en TextEdit, para que las comillas no cambien.
   En un repositorio público de GitHub, sube `index.html` y `caja.html`. Pega la URL de `/exec` en la línea `API_URL: '…',` de **los dos** archivos.
6. Ve a **Settings › Pages**, elige **Deploy from a branch** con `main` y `/ (root)`, y guarda.

**C. Antes del shower**
7. Haz una apuesta de prueba desde tu celular y revisa que aparezca en la caja.
8. En la caja, entra a **Ajustes › Reiniciar todo**.
9. Abre `…/?cartel` para imprimir el cartel con el QR. **Antes de imprimir:** elige márgenes "Ninguno" y activa "Gráficos de fondo".

---

## Reglas

**Fecha** (también aparecen en la página, en "¿Cómo se gana?"):
1. Gana la ficha **exacta**: día y turno. AM es de 00:00 a 11:59 y PM de 12:00 a 23:59.
2. Si nadie acierta, gana la ficha a **menos turnos** de distancia.
3. Si hay igual distancia, el otro turno del **mismo día** gana sobre otro día.
4. Si dos fichas siguen empatadas, una antes y otra después, gana la más cercana a la **hora exacta** del nacimiento.
5. Último recurso: gana quien apostó primero (el N.º menor).

Solo participan las fichas **pagadas**.

**Funcionamiento del tablero:**
- Cada día-turno se juega una sola vez. Si dos personas apuestan lo mismo al mismo tiempo, el script lo bloquea.
- Un turno se cierra cuando empieza: el AM a las 00:00 y el PM a las 12:00, hora de Chile. Los días que ya pasaron aparecen cerrados.
- Cada persona se identifica con su nombre y los últimos 4 dígitos del celular. Las tildes y mayúsculas no cuentan.

**Nombre:**
- Es gratis y cada persona juega una sola vez.
- Los nombres apostados nunca se envían a la página de los invitados.

## Sonido

- La música empieza cuando la persona toca la página por primera vez, porque los navegadores no permiten que suene antes. Se puede silenciar con el botón del parlante, y la página recuerda la elección.
- Al apostar suena una tragamonedas mientras se registra la ficha, y un premio cuando queda lista.
- En iPhone con el modo silencio activado no suena nada.
- Todo el sonido se genera en el navegador y no usa archivos de audio.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| La caja dice "script anterior" | Falta el paso 3 de "Actualizar": publicar una **Nueva versión** en Administrar implementaciones. |
| Sale "Modo demo" | La línea `API_URL` quedó vacía o con comillas curvas. |
| "No pudimos conectar con la mesa" | En la implementación, "Quién tiene acceso" no está en **Cualquier usuario**. |
| La hoja Resultado muestra un error | Recarga la planilla. Si sigue, escribe en A1: `=BABYBET_RESULTADO(Fichas!A2:H;Config!A2:B)` |
| El cartel sale sin fondo | Activa **Gráficos de fondo** al imprimir. |
