import '../../../../core/network/lectura_json.dart';

class Vehiculo {
  const Vehiculo({
    required this.id,
    required this.placa,
    required this.tipoVehiculo,
    required this.marca,
    required this.color,
    required this.clienteId,
  });

  factory Vehiculo.desdeJson(Map<String, dynamic> json) => Vehiculo(
    id: leerEntero(json['id']),
    placa: leerTexto(json['placa']),
    tipoVehiculo: leerTexto(json['tipoVehiculo']),
    marca: leerTextoOpcional(json['marca']),
    color: leerTextoOpcional(json['color']),
    clienteId: leerEnteroOpcional(json['clienteId']),
  );

  final int id;
  final String placa;
  final String tipoVehiculo;
  final String? marca;
  final String? color;
  final int? clienteId;

  /// "Mazda · Gris" o lo que haya.
  String get descripcion => [marca, color].whereType<String>().where((t) => t.trim().isNotEmpty).join(' · ');
}
