/// Lectura tolerante de los campos que entrega la API: un número puede llegar
/// como int, double o texto; un campo ausente toma un valor neutro.
int leerEntero(Object? valor) => switch (valor) {
  final int numero => numero,
  final num numero => numero.round(),
  final String texto => int.tryParse(texto) ?? num.tryParse(texto)?.round() ?? 0,
  _ => 0,
};

int? leerEnteroOpcional(Object? valor) => valor == null ? null : leerEntero(valor);

String leerTexto(Object? valor) => valor?.toString() ?? '';

String? leerTextoOpcional(Object? valor) => valor?.toString();

bool leerBooleano(Object? valor) => valor == true || valor == 'true';

/// Lista de objetos de un cuerpo envuelto: cuerpo['ordenes'] -> [...].
List<Map<String, dynamic>> leerLista(Map<String, dynamic> cuerpo, String clave) => [
  for (final elemento in (cuerpo[clave] as List? ?? const []))
    if (elemento is Map<String, dynamic>) elemento,
];

Map<String, dynamic> leerObjeto(Map<String, dynamic> cuerpo, String clave) {
  final valor = cuerpo[clave];
  return valor is Map<String, dynamic> ? valor : const {};
}
