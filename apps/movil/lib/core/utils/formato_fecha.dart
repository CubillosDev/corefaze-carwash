/// Fechas y horas en la zona de Bogotá (UTC−5, sin horario de verano), sin
/// depender de la zona del teléfono.
const _desfaseBogota = Duration(hours: -5);

const _dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const _meses = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/// Un instante en la hora de Bogotá (los campos de la fecha devuelta son los
/// de Bogotá).
DateTime enBogota(DateTime instante) => instante.toUtc().add(_desfaseBogota);

/// "2026-11-19" de un instante, en Bogotá.
String fechaEnBogota(DateTime instante) {
  final fecha = enBogota(instante);
  return '${fecha.year.toString().padLeft(4, '0')}-${_dosCifras(fecha.month)}-${_dosCifras(fecha.day)}';
}

/// "Jueves, 19 de noviembre".
String fechaLarga(DateTime instante) {
  final fecha = enBogota(instante);
  final texto = '${_dias[fecha.weekday - 1]}, ${fecha.day} de ${_meses[fecha.month - 1]}';
  return texto[0].toUpperCase() + texto.substring(1);
}

/// "2:30 p. m." de una fecha y hora ISO de la API. Cadena vacía si no se
/// puede leer.
String formatoHora(String? iso) {
  final instante = iso == null ? null : DateTime.tryParse(iso);
  if (instante == null) {
    return '';
  }
  final fecha = enBogota(instante);
  final hora = fecha.hour % 12 == 0 ? 12 : fecha.hour % 12;
  return '$hora:${_dosCifras(fecha.minute)} ${fecha.hour < 12 ? 'a. m.' : 'p. m.'}';
}

/// "2026-08-03" -> "03/08/2026", sin pasar por DateTime.
String formatoFecha(String? fecha) {
  final partes = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(fecha ?? '');
  return partes == null ? '' : '${partes.group(3)}/${partes.group(2)}/${partes.group(1)}';
}

/// Saludo según la hora de Bogotá.
String saludoSegunHora(DateTime instante) {
  final hora = enBogota(instante).hour;
  return hora < 12 ? 'Buenos días' : (hora < 19 ? 'Buenas tardes' : 'Buenas noches');
}

String _dosCifras(int valor) => valor.toString().padLeft(2, '0');
