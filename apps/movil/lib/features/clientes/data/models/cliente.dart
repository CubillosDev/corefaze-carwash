import '../../../../core/network/lectura_json.dart';

class Cliente {
  const Cliente({
    required this.id,
    required this.nombre,
    required this.documento,
    required this.telefono,
    required this.tipo,
    required this.creditoHabilitado,
    required this.activo,
  });

  factory Cliente.desdeJson(Map<String, dynamic> json) => Cliente(
    id: leerEntero(json['id']),
    nombre: leerTexto(json['nombre']),
    documento: leerTexto(json['documento']),
    telefono: leerTexto(json['telefono']),
    tipo: leerTexto(json['tipo']),
    creditoHabilitado: leerBooleano(json['creditoHabilitado']),
    activo: leerTexto(json['estado']) != 'inactivo',
  );

  final int id;
  final String nombre;
  final String documento;
  final String telefono;
  final String tipo;
  final bool creditoHabilitado;
  final bool activo;

  /// R8: solo una empresa activa con crédito habilitado paga a crédito.
  bool get puedePagarACredito => tipo == 'empresa' && creditoHabilitado && activo;

  String get iniciales {
    final palabras = nombre.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    return palabras.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
