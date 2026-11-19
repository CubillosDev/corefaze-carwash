import '../../../../core/network/lectura_json.dart';

class OrdenLavado {
  const OrdenLavado({
    required this.id,
    required this.jornadaId,
    required this.turno,
    required this.vehiculoId,
    required this.servicioId,
    required this.colaboradorId,
    required this.valor,
    required this.medioPago,
    required this.estado,
    required this.creadaEn,
    required this.fecha,
  });

  factory OrdenLavado.desdeJson(Map<String, dynamic> json) => OrdenLavado(
    id: leerEntero(json['id']),
    jornadaId: leerEntero(json['jornadaId']),
    turno: leerEntero(json['turno']),
    vehiculoId: leerEntero(json['vehiculoId']),
    servicioId: leerEntero(json['servicioId']),
    colaboradorId: leerEntero(json['colaboradorId']),
    valor: leerEntero(json['valor']),
    medioPago: leerTexto(json['medioPago']),
    estado: leerTexto(json['estado']),
    creadaEn: leerTextoOpcional(json['creadaEn']),
    fecha: leerTexto(json['fecha']),
  );

  final int id;
  final int jornadaId;
  final int turno;
  final int vehiculoId;
  final int servicioId;
  final int colaboradorId;

  /// Lo calcula el servidor (R4): la app nunca lo envía.
  final int valor;
  final String medioPago;
  final String estado;
  final String? creadaEn;
  final String fecha;
}
