/** @OnlyCurrentDoc  ← limita los permisos del script a ESTA planilla, no a todas tus hojas. */

/**
 * BabyBet · backend para Google Apps Script
 * ------------------------------------------------------------------
 * Esta planilla es el "comando central": aquí llegan todas las fichas
 * y los nombres apostados. Pasos de instalación en el README.
 *
 * Hojas que crea configurar():
 *   Fichas    → apuestas de fecha ($). Marca "Pagada" cuando te paguen.
 *   Nombres   → apuestas de nombre (gratis, una por jugador).
 *   Resultado → ranking automático de fichas pagadas cuando nazca.
 *   Config    → mesa abierta/cerrada, valor de la ficha, nacimiento, PIN de la caja.
 *
 * La app de caja (caja.html) hace todo lo anterior desde el celular con el PIN.
 *
 * Funciones que puedes ejecutar a mano desde el editor:
 *   configurar()          → crea o actualiza las hojas (repetirla no borra nada).
 *   reiniciarTodo()       → borra fichas, nombres y nacimiento, y vuelve el contador a 1.
 *   reiniciarContador()   → solo vuelve la numeración de fichas a 1.
 *
 * Regla para ganar la fecha (la aplica la hoja Resultado y la caja):
 *   1. Gana la ficha exacta (día + turno). AM = 00:00–11:59, PM = 12:00–23:59.
 *   2. Si nadie acierta, gana la ficha a menos turnos de distancia.
 *   3. A igual distancia, el otro turno del MISMO día gana sobre otro día.
 *   4. Si siguen empatadas (una antes y otra después), gana la más cercana
 *      a la hora exacta del nacimiento.
 *   5. Último recurso: gana quien apostó primero (N.º menor).
 *   Solo participan las fichas marcadas como pagadas.
 */

var HOJAS = { fichas: 'Fichas', nombres: 'Nombres', resultado: 'Resultado', config: 'Config' };
var ZONA = 'America/Santiago';

var ENCABEZADO_FICHAS = ['N.º', 'Registrada', 'Jugador', 'Celular (4)', 'Clave', 'Fecha', 'Turno', 'Pagada', 'Notas'];
var ENCABEZADO_NOMBRES = ['Registrado', 'Jugador', 'Celular (4)', 'Clave', 'Nombre apostado', 'Normalizado'];
var ANCHO_RESULTADO = 8;

// No cambies los textos de la columna A de Config: el código los busca por nombre.
var CONFIG_INICIAL = [
  ['Apuestas abiertas', true, 'Desmárcala para cerrar la mesa.'],
  ['Valor ficha', 3000, 'En pesos.'],
  ['Máx. fichas por jugador', 5, '0 = sin límite.'],
  ['Fecha desde', '2026-11-01', 'Formato AAAA-MM-DD. Los turnos que ya empezaron se cierran solos.'],
  ['Fecha hasta', '2027-01-31', 'Formato AAAA-MM-DD.'],
  ['% para el ganador', 40, 'Porcentaje del pozo que se lleva quien gane la fecha.'],
  ['Nacimiento: fecha', '', 'Cuando nazca. Ej.: 2026-12-26 o 26-12-2026.'],
  ['Nacimiento: hora', '', 'Hora exacta, formato 24 h. Ej.: 03:15 o 15:40.'],
  ['PIN administrador', '', 'PIN de la app de caja (caja.html). Puedes cambiarlo: 4 a 8 dígitos.']
];
var CONFIG_TEXTO = ['Fecha desde', 'Fecha hasta', 'Nacimiento: fecha', 'Nacimiento: hora', 'PIN administrador'];

// Valores de la versión anterior que configurar() actualiza solos, pero solo si nadie los cambió.
var CONFIG_ANTERIOR = {
  'Valor ficha': [5000, 3000],
  'Máx. fichas por jugador': [3, 5],
  'Fecha desde': ['2026-12-01', '2026-11-01'],
  'Fecha hasta': ['2027-01-15', '2027-01-31']
};

var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ================================================================
 * Instalación y mantenimiento
 * ================================================================ */

function configurar() {
  var ss = planilla_();
  ss.setSpreadsheetTimeZone(ZONA);

  // Config: crea la hoja, agrega los parámetros que falten y actualiza valores antiguos sin tocar.
  var cfg = ss.getSheetByName(HOJAS.config) || ss.insertSheet(HOJAS.config);
  if (cfg.getLastRow() === 0) {
    cfg.getRange(1, 1, 1, 3).setValues([['Parámetro', 'Valor', 'Nota']]).setFontWeight('bold');
    cfg.setFrozenRows(1);
    cfg.setColumnWidth(1, 190);
    cfg.setColumnWidth(3, 420);
  }
  var filas = filasConfig_(cfg);
  CONFIG_INICIAL.forEach(function (fila) {
    var clave = fila[0];
    if (filas[clave]) {
      var ant = CONFIG_ANTERIOR[clave];
      if (ant) {
        var celda = cfg.getRange(filas[clave], 2);
        if (valorTexto_(celda.getValue()) === String(ant[0])) {
          celda.setValue(typeof ant[1] === 'string' ? "'" + ant[1] : ant[1]);
          cfg.getRange(filas[clave], 3).setValue(fila[2]);
        }
      }
      return;
    }
    var r = cfg.getLastRow() + 1;
    if (CONFIG_TEXTO.indexOf(clave) !== -1) cfg.getRange(r, 2).setNumberFormat('@');
    cfg.getRange(r, 1, 1, 3).setValues([fila]);
    if (clave === 'Apuestas abiertas') cfg.getRange(r, 2).insertCheckboxes().setValue(true);
    filas[clave] = r;
  });
  var celdaPin = cfg.getRange(filas['PIN administrador'], 2);
  var pin = valorTexto_(celdaPin.getValue());
  if (!pin) {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    celdaPin.setNumberFormat('@').setValue("'" + pin);
  }

  var fichas = ss.getSheetByName(HOJAS.fichas) || ss.insertSheet(HOJAS.fichas, 0);
  if (fichas.getLastRow() === 0) {
    fichas.getRange(1, 1, 1, ENCABEZADO_FICHAS.length).setValues([ENCABEZADO_FICHAS]).setFontWeight('bold');
    fichas.getRange('D:D').setNumberFormat('@');
    fichas.getRange('F:F').setNumberFormat('@');
    fichas.setFrozenRows(1);
    fichas.setColumnWidth(5, 60);
  }

  var nombres = ss.getSheetByName(HOJAS.nombres) || ss.insertSheet(HOJAS.nombres, 1);
  if (nombres.getLastRow() === 0) {
    nombres.getRange(1, 1, 1, ENCABEZADO_NOMBRES.length).setValues([ENCABEZADO_NOMBRES]).setFontWeight('bold');
    nombres.getRange('C:C').setNumberFormat('@');
    nombres.setFrozenRows(1);
  }

  var res = ss.getSheetByName(HOJAS.resultado) || ss.insertSheet(HOJAS.resultado, 2);
  res.getRange('A1').setFormula('=BABYBET_RESULTADO(Fichas!A2:H,Config!A2:B)');
  res.getRange('H:H').setNumberFormat('$#,##0');
  res.setColumnWidth(3, 200);
  res.setColumnWidth(7, 300);

  // Borra la hoja vacía que trae una planilla nueva.
  ss.getSheets().forEach(function (sh) {
    var nombre = sh.getName();
    var esNuestra = Object.keys(HOJAS).some(function (k) { return HOJAS[k] === nombre; });
    if (!esNuestra && sh.getLastRow() === 0 && ss.getSheets().length > 4) ss.deleteSheet(sh);
  });

  Logger.log('BabyBet listo. PIN de la caja: ' + pin + ' (está en la hoja Config).');
}

function reiniciarTodo() {
  reiniciar_();
  Logger.log('Listo: se borraron fichas, nombres y nacimiento. La próxima ficha será la N.º 1.');
}

function reiniciarContador() {
  PropertiesService.getScriptProperties().deleteProperty('contador');
  Logger.log('Contador reiniciado: la próxima ficha será la N.º 1.');
}

/* ================================================================
 * Entradas web
 * ================================================================ */

// GET → estado público del tablero (fichas tomadas, pozo, mesa abierta).
function doGet() {
  try {
    return json_(tablero_());
  } catch (err) {
    return json_({ ok: false, error: mensaje_(err) });
  }
}

// POST → { action: 'jugador' | 'apostar' | 'admin', ... } (cuerpo JSON como text/plain).
function doPost(e) {
  var datos;
  try {
    datos = JSON.parse(e && e.postData ? e.postData.contents : '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Solicitud inválida.' });
  }

  try {
    if (datos.action === 'jugador') return json_(jugador_(datos));
    if (datos.action === 'apostar') return json_(conCandado_(function () { return apostar_(datos); }));
    if (datos.action === 'admin') return json_(conCandado_(function () { return admin_(datos); }));
    return json_({ ok: false, error: 'Acción desconocida.' });
  } catch (err) {
    return json_({ ok: false, error: mensaje_(err) });
  }
}

// El candado evita que dos personas tomen la misma ficha o editen al mismo tiempo.
function conCandado_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'Hay mucha gente apostando. Intenta de nuevo en unos segundos.' };
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================
 * Apuestas (página pública)
 * ================================================================ */

function jugador_(d) {
  var id = identidad_(d);
  if (id.error) return error_(id.error);
  return estado_(id.clave);
}

function apostar_(d) {
  var cfg = leerConfig_();
  if (!cfg.abierto) return error_('La mesa está cerrada. Ya no se reciben apuestas.', 'cerrada', { tablero: tablero_() });

  var id = identidad_(d);
  if (id.error) return error_(id.error);

  var fecha = d.fecha ? String(d.fecha).trim() : '';
  var turno = String(d.turno || '').trim().toUpperCase();
  var nombreBebe = limpiar_(d.nombreBebe, 40);
  if (!fecha && !nombreBebe) return error_('No hay nada que apostar todavía.');

  var fichas = leerFichas_();

  if (fecha) {
    if (!fechaValida_(fecha) || fecha < cfg.desde || fecha > cfg.hasta) return error_('Esa fecha está fuera del tablero.');
    if (turno !== 'AM' && turno !== 'PM') return error_('Elige AM o PM.');
    if (turnoEmpezo_(fecha, turno, ahora_())) {
      return error_('Ese turno ya empezó. Elige uno que todavía no llegue.', 'pasada', { tablero: tablero_(fichas) });
    }

    var mias = fichas.filter(function (f) { return f.clave === id.clave; }).length;
    if (cfg.maxFichas > 0 && mias >= cfg.maxFichas) {
      return error_('Ya tienes el máximo de ' + cfg.maxFichas + ' fichas.', 'max');
    }
    var tomada = fichas.some(function (f) { return f.fecha === fecha && f.turno === turno; });
    if (tomada) return error_('Alguien tomó esa ficha hace un momento. Elige otra.', 'tomada', { tablero: tablero_(fichas) });
  }

  var yaTieneNombre = leerNombres_().some(function (n) { return n.clave === id.clave; });
  if (!fecha && yaTieneNombre) return error_('Tu nombre ya estaba sellado. Se adivina una sola vez.', 'nombre');
  var guardarNombre = !!nombreBebe && !yaTieneNombre;

  var ficha = null;
  if (fecha) {
    var props = PropertiesService.getScriptProperties();
    var numero = Number(props.getProperty('contador') || 0) + 1;
    props.setProperty('contador', String(numero));

    var sh = hoja_(HOJAS.fichas);
    var fila = sh.getLastRow() + 1;
    sh.getRange(fila, 1, 1, 7).setValues([[numero, new Date(), texto_(id.jugador), "'" + id.cel, texto_(id.clave), "'" + fecha, turno]]);
    sh.getRange(fila, 8).insertCheckboxes();
    ficha = { numero: numero, fecha: fecha, turno: turno, pagada: false };
  }

  if (guardarNombre) {
    var shN = hoja_(HOJAS.nombres);
    var filaN = shN.getLastRow() + 1;
    shN.getRange(filaN, 1, 1, 6).setValues([[
      new Date(), texto_(id.jugador), "'" + id.cel, texto_(id.clave), texto_(nombreBebe), texto_(normalizar_(nombreBebe))
    ]]);
  }

  var estado = estado_(id.clave);
  estado.ficha = ficha;
  estado.nombreGuardado = guardarNombre;
  return estado;
}

function estado_(clave) {
  var fichas = leerFichas_();
  return {
    ok: true,
    fichas: fichas
      .filter(function (f) { return f.clave === clave; })
      .map(function (f) { return { numero: f.numero, fecha: f.fecha, turno: f.turno, pagada: f.pagada }; }),
    nombreSellado: leerNombres_().some(function (n) { return n.clave === clave; }),
    tablero: tablero_(fichas)
  };
}

function tablero_(fichas) {
  var cfg = leerConfig_();
  fichas = fichas || leerFichas_();
  var pagadas = fichas.filter(function (f) { return f.pagada; }).length;
  return {
    ok: true,
    abierto: cfg.abierto,
    valor: cfg.valor,
    maxFichas: cfg.maxFichas,
    desde: cfg.desde,
    hasta: cfg.hasta,
    porcentaje: cfg.porcentaje,
    tomadas: fichas.map(function (f) { return f.fecha + '|' + f.turno; }),
    fichas: fichas.length,
    pagadas: pagadas,
    pozo: pagadas * cfg.valor
  };
}

/* ================================================================
 * Caja (caja.html): todas las acciones requieren el PIN
 * ================================================================ */

function admin_(d) {
  var cfg = leerConfig_();
  var fallo = verificarPin_(d.pin, cfg.pin);
  if (fallo) return fallo;

  var op = d.op || 'estado';
  var msg = '';

  if (op === 'estado') {
    // solo lectura
  } else if (op === 'pagar') {
    var nums = (Array.isArray(d.numeros) ? d.numeros : [d.numero]).map(Number);
    var sh = hoja_(HOJAS.fichas);
    var n = sh.getLastRow() - 1;
    var cambiadas = 0;
    if (n > 0) {
      sh.getRange(2, 1, n, 1).getValues().forEach(function (r, i) {
        if (nums.indexOf(Number(r[0])) !== -1) { sh.getRange(i + 2, 8).setValue(!!d.pagada); cambiadas++; }
      });
    }
    if (!cambiadas) return error_('No encontré esas fichas. Actualiza la lista.', 'noexiste', estadoAdmin_());
    msg = d.pagada ? 'Pago registrado.' : 'Pago anulado.';
  } else if (op === 'liberar') {
    var shF = hoja_(HOJAS.fichas);
    var filaF = buscarFila_(shF, 1, Number(d.numero));
    if (!filaF) return error_('Esa ficha ya no existe.', 'noexiste', estadoAdmin_());
    eliminarFila_(shF, filaF);
    msg = 'Ficha N.º ' + d.numero + ' liberada.';
  } else if (op === 'borrarNombre') {
    var shN = hoja_(HOJAS.nombres);
    var filaN = buscarFila_(shN, 4, String(d.clave));
    if (!filaN) return error_('Ese nombre ya no existe.', 'noexiste', estadoAdmin_());
    eliminarFila_(shN, filaN);
    msg = 'Apuesta de nombre borrada.';
  } else if (op === 'mesa') {
    escribirConfig_('Apuestas abiertas', !!d.abierto);
    msg = d.abierto ? 'Mesa abierta.' : 'Mesa cerrada.';
  } else if (op === 'ajustes') {
    var a = validarAjustes_(d);
    if (a.error) return error_(a.error, 'ajustes');
    escribirConfig_('Valor ficha', a.valor);
    escribirConfig_('Máx. fichas por jugador', a.maxFichas);
    escribirConfig_('% para el ganador', a.porcentaje);
    escribirConfig_('Fecha desde', a.desde, true);
    escribirConfig_('Fecha hasta', a.hasta, true);
    msg = 'Ajustes guardados.';
  } else if (op === 'nacimiento') {
    var f = String(d.fecha == null ? '' : d.fecha).trim();
    var h = String(d.hora == null ? '' : d.hora).trim();
    if (!f && !h) {
      escribirConfig_('Nacimiento: fecha', '', true);
      escribirConfig_('Nacimiento: hora', '', true);
      msg = 'Nacimiento borrado.';
    } else {
      var nac = leerNacimiento_(f, h);
      if (nac.error) return error_(nac.error, 'nacimiento');
      escribirConfig_('Nacimiento: fecha', nac.fecha, true);
      escribirConfig_('Nacimiento: hora', nac.minuto === null ? nac.turno : horaTexto_(nac.minuto), true);
      msg = 'Nacimiento guardado.';
    }
  } else if (op === 'reiniciar') {
    if (d.confirmar !== 'REINICIAR') return error_('Para reiniciar, escribe REINICIAR.', 'confirmar');
    reiniciar_();
    msg = 'Todo reiniciado. La próxima ficha será la N.º 1.';
  } else {
    return error_('Operación desconocida.');
  }

  var r = estadoAdmin_();
  r.mensaje = msg;
  return r;
}

function estadoAdmin_() {
  var cfg = leerConfig_();
  var fichas = leerFichas_();
  var pagadas = fichas.filter(function (f) { return f.pagada; }).length;
  var pozo = pagadas * cfg.valor;
  return {
    ok: true,
    config: {
      abierto: cfg.abierto,
      valor: cfg.valor,
      maxFichas: cfg.maxFichas,
      desde: cfg.desde,
      hasta: cfg.hasta,
      porcentaje: cfg.porcentaje,
      nacFecha: cfg.nacFecha,
      nacHora: cfg.nacHora
    },
    resumen: {
      fichas: fichas.length,
      pagadas: pagadas,
      pozo: pozo,
      porCobrar: (fichas.length - pagadas) * cfg.valor,
      premio: Math.round(pozo * cfg.porcentaje / 100)
    },
    fichas: fichas.map(function (f) {
      return { numero: f.numero, jugador: f.jugador, cel: f.cel, clave: f.clave, fecha: f.fecha, turno: f.turno, pagada: f.pagada, registrada: f.registrada };
    }),
    nombres: leerNombres_(),
    resultado: cfg.nacFecha ? calcularResultado_(fichas, cfg.mapa) : null,
    planilla: planilla_().getUrl()
  };
}

function verificarPin_(pin, correcto) {
  var props = PropertiesService.getScriptProperties();
  var hasta = Number(props.getProperty('adminBloqueo') || 0);
  if (Date.now() < hasta) {
    return error_('Demasiados intentos con PIN incorrecto. Espera ' + Math.ceil((hasta - Date.now()) / 60000) + ' min.', 'bloqueado');
  }
  if (!correcto) return error_('Falta el PIN en la hoja Config. Ejecuta configurar() en Apps Script.', 'sinpin');
  if (String(pin == null ? '' : pin).trim() !== correcto) {
    var fallos = Number(props.getProperty('adminFallos') || 0) + 1;
    if (fallos >= 5) {
      props.setProperty('adminBloqueo', String(Date.now() + 10 * 60000));
      props.setProperty('adminFallos', '0');
      return error_('PIN incorrecto. Por seguridad, la caja queda bloqueada 10 minutos.', 'bloqueado');
    }
    props.setProperty('adminFallos', String(fallos));
    return error_('PIN incorrecto.', 'pin');
  }
  if (Number(props.getProperty('adminFallos') || 0) > 0) props.setProperty('adminFallos', '0');
  return null;
}

function validarAjustes_(d) {
  var entero = function (v) { return /^\d+$/.test(String(v).trim()) ? Number(v) : NaN; };
  var valor = entero(d.valor);
  var maxFichas = entero(d.maxFichas);
  var porcentaje = entero(d.porcentaje);
  var desde = String(d.desde || '').trim();
  var hasta = String(d.hasta || '').trim();
  if (!(valor > 0 && valor <= 10000000)) return { error: 'El valor de la ficha tiene que ser un número mayor que 0.' };
  if (!(maxFichas >= 0 && maxFichas <= 100)) return { error: 'El máximo de fichas tiene que estar entre 0 y 100 (0 = sin límite).' };
  if (!(porcentaje >= 0 && porcentaje <= 100)) return { error: 'El porcentaje tiene que estar entre 0 y 100.' };
  if (!fechaValida_(desde) || !fechaValida_(hasta)) return { error: 'Revisa las fechas del tablero.' };
  if (desde > hasta) return { error: 'La fecha "desde" tiene que ser anterior a la fecha "hasta".' };
  return { valor: valor, maxFichas: maxFichas, porcentaje: porcentaje, desde: desde, hasta: hasta };
}

function reiniciar_() {
  [HOJAS.fichas, HOJAS.nombres].forEach(function (nombre) {
    var sh = hoja_(nombre);
    var n = sh.getMaxRows() - 1;
    if (n > 0) sh.getRange(2, 1, n, sh.getMaxColumns()).clearContent().clearDataValidations();
  });
  PropertiesService.getScriptProperties().deleteProperty('contador');
  escribirConfig_('Nacimiento: fecha', '', true);
  escribirConfig_('Nacimiento: hora', '', true);
}

/* ================================================================
 * Resultado (función personalizada de la hoja Resultado)
 * ================================================================ */

/**
 * Ranking de las fichas pagadas según el nacimiento real.
 * Uso: =BABYBET_RESULTADO(Fichas!A2:H, Config!A2:B)
 * @param {Array} fichas Rango Fichas!A2:H.
 * @param {Array} config Rango Config!A2:B.
 * @return Tabla con el ganador en el primer puesto.
 * @customfunction
 */
function BABYBET_RESULTADO(fichas, config) {
  var res = calcularResultado_(filasFichas_(fichas), mapaConfig_(config));
  if (res.error) return [fila_([res.error])];

  var nac = res.nacimiento;
  var cuando = 'Nació el ' + fechaLarga_(nac.fecha) + (nac.minuto === null ? '' : ' a las ' + horaTexto_(nac.minuto)) + ' (turno ' + nac.turno + ').';
  var resumen = cuando + ' Pozo: ' + pesos_(res.pozo) + ' (' + res.pagadas + ' fichas pagadas). Premio: ' + pesos_(res.premio) + '.';
  if (res.impagas > 0) resumen += ' ' + res.impagas + (res.impagas === 1 ? ' ficha impaga no participa.' : ' fichas impagas no participan.');
  if (nac.minuto === null) resumen += ' Sin hora exacta: los empates se resuelven por orden de apuesta.';

  var salida = [fila_([resumen]), fila_([])];
  if (!res.ranking.length) {
    salida.push(fila_(['Todavía no hay fichas marcadas como pagadas en la hoja Fichas.']));
    return salida;
  }
  salida.push(['Puesto', 'N.º', 'Jugador', 'Fecha', 'Turno', 'Distancia (turnos)', 'Detalle', 'Premio']);
  res.ranking.forEach(function (f, i) {
    salida.push([i + 1, f.numero, f.jugador, f.fecha, f.turno, f.distancia, f.detalle, i === 0 ? res.premio : '']);
  });
  return salida;
}

// fichas: objetos { numero, jugador, fecha, turno, pagada }; m: mapa de Config.
function calcularResultado_(fichas, m) {
  var nac = leerNacimiento_(m['Nacimiento: fecha'], m['Nacimiento: hora'] !== undefined && m['Nacimiento: hora'] !== '' ? m['Nacimiento: hora'] : m['Nacimiento: turno']);
  if (nac.error) return { error: nac.error };
  var pagadas = fichas.filter(function (f) { return f.pagada; });
  var valor = Number(m['Valor ficha']) || 0;
  var pct = Number(m['% para el ganador']) || 40;
  var pozo = pagadas.length * valor;
  return {
    nacimiento: nac,
    pozo: pozo,
    premio: Math.round(pozo * pct / 100),
    pagadas: pagadas.length,
    impagas: fichas.length - pagadas.length,
    ranking: ranking_(pagadas, nac)
  };
}

// Ordena las fichas según la regla del juego. Devuelve copias con distancia y detalle.
function ranking_(fichas, nac) {
  var bDia = diaNum_(nac.fecha);
  var bSlot = bDia * 2 + (nac.turno === 'PM' ? 1 : 0);
  var bMin = nac.minuto === null ? null : bDia * 1440 + nac.minuto;

  var lista = fichas.map(function (f) {
    var dia = diaNum_(f.fecha);
    var slot = dia * 2 + (f.turno === 'PM' ? 1 : 0);
    var inicio = dia * 1440 + (f.turno === 'PM' ? 720 : 0);
    var brecha = bMin === null ? 0 : Math.max(0, inicio - bMin, bMin - (inicio + 720));
    return {
      numero: Number(f.numero) || 0,
      jugador: f.jugador,
      fecha: f.fecha,
      turno: f.turno,
      distancia: Math.abs(slot - bSlot),
      lado: slot < bSlot ? 'antes' : 'después',
      mismoDia: dia === bDia,
      brecha: brecha
    };
  });

  lista.sort(function (a, b) {
    return (a.distancia - b.distancia) ||
      ((a.mismoDia ? 0 : 1) - (b.mismoDia ? 0 : 1)) ||
      (a.brecha - b.brecha) ||
      (a.numero - b.numero);
  });

  lista.forEach(function (f) {
    if (f.distancia === 0) f.detalle = 'Exacta';
    else if (f.mismoDia) f.detalle = 'Mismo día, otro turno';
    else f.detalle = f.distancia + (f.distancia === 1 ? ' turno ' : ' turnos ') + f.lado;

    var rivales = lista.filter(function (o) { return o !== f && o.distancia === f.distancia && o.mismoDia === f.mismoDia; });
    if (f.distancia > 0 && rivales.length) {
      var porHora = rivales.every(function (o) { return o.brecha !== f.brecha; });
      f.detalle += ' · empate resuelto por ' + (porHora ? 'la hora del nacimiento' : 'orden de apuesta');
    }
  });
  return lista;
}

function filasFichas_(valores) {
  if (!Array.isArray(valores)) return [];
  return valores
    .map(function (r) {
      return {
        numero: r[0],
        jugador: String(r[2] == null ? '' : r[2]),
        fecha: fechaTexto_(r[5]),
        turno: String(r[6] == null ? '' : r[6]).trim().toUpperCase(),
        pagada: r[7] === true || /^(true|verdadero)$/i.test(String(r[7]).trim())
      };
    })
    .filter(function (f) { return f.numero !== '' && f.numero != null && fechaValida_(f.fecha) && (f.turno === 'AM' || f.turno === 'PM'); });
}

function mapaConfig_(valores) {
  var m = {};
  (Array.isArray(valores) ? valores : []).forEach(function (r) {
    var k = String(r[0] == null ? '' : r[0]).trim();
    if (k) m[k] = r[1];
  });
  return m;
}

// Acepta fecha AAAA-MM-DD, DD-MM-AAAA, DD/MM/AAAA o una fecha de la planilla;
// hora HH:MM (24 h), H:MM am/pm, una hora de la planilla, o solo "AM"/"PM".
function leerNacimiento_(fechaV, horaV) {
  var vacio = 'Cuando nazca, completa "Nacimiento: fecha" y "Nacimiento: hora" en la hoja Config.';
  if (fechaV === '' || fechaV == null) return { error: vacio };

  var fecha = '';
  if (fechaV instanceof Date) fecha = fechaTexto_(fechaV);
  else {
    var s = String(fechaV).trim();
    var a = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(s);
    var b = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(s);
    if (a) fecha = a[1] + '-' + dos_(a[2]) + '-' + dos_(a[3]);
    else if (b) fecha = b[3] + '-' + dos_(b[2]) + '-' + dos_(b[1]);
  }
  if (!fechaValida_(fecha)) return { error: 'No entiendo la fecha de nacimiento "' + fechaV + '". Escríbela como 2026-12-26.' };

  if (horaV === '' || horaV == null) return { error: 'Falta "Nacimiento: hora" en la hoja Config (ej.: 03:15 o 15:40).' };
  var minuto = null;
  var turno = '';
  if (horaV instanceof Date) {
    var hm = Utilities.formatDate(horaV, planilla_().getSpreadsheetTimeZone(), 'HH:mm').split(':');
    minuto = Number(hm[0]) * 60 + Number(hm[1]);
  } else if (typeof horaV === 'number' && horaV >= 0 && horaV < 1) {
    minuto = Math.round(horaV * 1440) % 1440;
  } else {
    var h = String(horaV).trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
    var t = /^(am|pm)$/.exec(h);
    var c = /^(\d{1,2})(?::|h)?(\d{2})?(?::\d{2})?(am|pm)?$/.exec(h);
    if (t) turno = t[1].toUpperCase();
    else if (c) {
      var hh = Number(c[1]);
      var mm = Number(c[2] || 0);
      if (c[3]) {
        if (hh < 1 || hh > 12) return { error: 'No entiendo la hora "' + horaV + '". Escríbela en 24 h, como 15:40.' };
        hh = hh % 12 + (c[3] === 'pm' ? 12 : 0);
      }
      if (hh > 23 || mm > 59) return { error: 'No entiendo la hora "' + horaV + '". Escríbela en 24 h, como 15:40.' };
      minuto = hh * 60 + mm;
    } else {
      return { error: 'No entiendo la hora "' + horaV + '". Escríbela en 24 h, como 15:40.' };
    }
  }
  if (minuto !== null) turno = minuto < 720 ? 'AM' : 'PM';
  return { fecha: fecha, minuto: minuto, turno: turno };
}

/* ================================================================
 * Lectura y escritura de hojas
 * ================================================================ */

function leerFichas_() {
  var sh = hoja_(HOJAS.fichas);
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 8).getValues()
    .map(function (r) {
      return {
        numero: r[0],
        registrada: r[1] instanceof Date ? r[1].toISOString() : '',
        jugador: String(r[2] == null ? '' : r[2]),
        cel: String(r[3] == null ? '' : r[3]),
        clave: String(r[4]),
        fecha: fechaTexto_(r[5]),
        turno: String(r[6]).trim().toUpperCase(),
        pagada: r[7] === true
      };
    })
    .filter(function (f) { return f.fecha && (f.turno === 'AM' || f.turno === 'PM'); });
}

function leerNombres_() {
  var sh = hoja_(HOJAS.nombres);
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 6).getValues()
    .map(function (r) {
      return {
        registrado: r[0] instanceof Date ? r[0].toISOString() : '',
        jugador: String(r[1] == null ? '' : r[1]),
        cel: String(r[2] == null ? '' : r[2]),
        clave: String(r[3] == null ? '' : r[3]),
        nombre: String(r[4] == null ? '' : r[4]),
        normalizado: String(r[5] == null ? '' : r[5])
      };
    })
    .filter(function (x) { return x.clave; });
}

function leerConfig_() {
  var sh = hoja_(HOJAS.config);
  var n = sh.getLastRow() - 1;
  var m = mapaConfig_(n > 0 ? sh.getRange(2, 1, n, 2).getValues() : []);
  var abierto = m['Apuestas abiertas'];
  var hora = m['Nacimiento: hora'];
  return {
    mapa: m,
    abierto: abierto === true || /^(true|verdadero|s[ií]|1)$/i.test(String(abierto).trim()),
    valor: Number(m['Valor ficha']) || 0,
    maxFichas: Number(m['Máx. fichas por jugador']) || 0,
    desde: fechaTexto_(m['Fecha desde']) || '2026-11-01',
    hasta: fechaTexto_(m['Fecha hasta']) || '2027-01-31',
    porcentaje: Number(m['% para el ganador']) || 40,
    nacFecha: fechaTexto_(m['Nacimiento: fecha']),
    nacHora: hora instanceof Date ? Utilities.formatDate(hora, planilla_().getSpreadsheetTimeZone(), 'HH:mm') : valorTexto_(hora),
    pin: valorTexto_(m['PIN administrador'])
  };
}

function filasConfig_(sh) {
  var filas = {};
  var n = sh.getLastRow() - 1;
  if (n > 0) {
    sh.getRange(2, 1, n, 1).getValues().forEach(function (r, i) {
      var k = String(r[0]).trim();
      if (k && !filas[k]) filas[k] = i + 2;
    });
  }
  return filas;
}

function escribirConfig_(clave, valor, comoTexto) {
  var sh = hoja_(HOJAS.config);
  var filas = filasConfig_(sh);
  var r = filas[clave];
  if (!r) {
    r = sh.getLastRow() + 1;
    sh.getRange(r, 1).setValue(clave);
  }
  var celda = sh.getRange(r, 2);
  if (comoTexto) celda.setNumberFormat('@');
  celda.setValue(comoTexto && valor !== '' ? "'" + valor : valor);
}

function buscarFila_(sh, col, valor) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var vals = sh.getRange(2, col, n, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i][0];
    if (typeof valor === 'number' ? Number(v) === valor && v !== '' : String(v) === valor) return i + 2;
  }
  return 0;
}

// Borra una fila; si es la única fila libre de la hoja, la vacía (Sheets no deja borrarla).
function eliminarFila_(sh, fila) {
  if (sh.getMaxRows() > 2) sh.deleteRow(fila);
  else sh.getRange(fila, 1, 1, sh.getMaxColumns()).clearContent().clearDataValidations();
}

// El script tiene que estar dentro de la planilla (Extensiones › Apps Script), no suelto en script.google.com.
function planilla_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Este script no está conectado a ninguna planilla. Ábrelo desde la planilla con Extensiones › Apps Script y pega el código ahí.');
  return ss;
}

function hoja_(nombre) {
  var sh = planilla_().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la hoja "' + nombre + '". Ejecuta configurar() en el editor de Apps Script.');
  return sh;
}

/* ================================================================
 * Utilidades
 * ================================================================ */

function identidad_(d) {
  var jugador = limpiar_(d.nombre, 60);
  var cel = String(d.cel == null ? '' : d.cel).replace(/\D/g, '');
  if (jugador.length < 2) return { error: 'Escribe tu nombre.' };
  if (cel.length !== 4) return { error: 'Escribe los últimos 4 dígitos de tu celular.' };
  return { jugador: jugador, cel: cel, clave: normalizar_(jugador) + '#' + cel };
}

// Fecha y minuto actuales en Santiago.
function ahora_() {
  var p = Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm').split(' ');
  var hm = p[1].split(':');
  return { fecha: p[0], minuto: Number(hm[0]) * 60 + Number(hm[1]) };
}

// Un turno se cierra cuando empieza: AM a las 00:00, PM a las 12:00.
function turnoEmpezo_(fecha, turno, ahora) {
  if (fecha < ahora.fecha) return true;
  if (fecha > ahora.fecha) return false;
  return turno === 'AM' || ahora.minuto >= 720;
}

function fechaValida_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  var y = +m[1], mo = +m[2] - 1, d = +m[3];
  var dt = new Date(Date.UTC(y, mo, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo && dt.getUTCDate() === d;
}

function fechaTexto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, planilla_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).trim().slice(0, 10);
}

function valorTexto_(v) {
  if (v instanceof Date) return fechaTexto_(v);
  return String(v == null ? '' : v).trim();
}

// Días desde 1970-01-01 para una fecha AAAA-MM-DD (sin husos horarios).
function diaNum_(iso) {
  var p = iso.split('-');
  return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
}

function fechaLarga_(iso) {
  var p = iso.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()] + ' de ' + d.getUTCFullYear();
}

function horaTexto_(min) {
  return dos_(Math.floor(min / 60)) + ':' + dos_(min % 60);
}

function pesos_(n) {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function dos_(n) {
  return ('0' + n).slice(-2);
}

function fila_(celdas) {
  var r = celdas.slice(0, ANCHO_RESULTADO);
  while (r.length < ANCHO_RESULTADO) r.push('');
  return r;
}

// Minúsculas, sin tildes y sin espacios repetidos: "José  Pérez" → "jose perez".
function normalizar_(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function limpiar_(s, max) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Evita que un texto que empieza con = + - @ se convierta en fórmula.
function texto_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function error_(mensaje, code, extra) {
  var r = { ok: false, error: mensaje, code: code || null };
  if (extra) Object.keys(extra).forEach(function (k) { if (k !== 'ok') r[k] = extra[k]; });
  return r;
}

function mensaje_(err) {
  return String((err && err.message) || err);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
