import '../../../../core/constants/dominio.dart';
import '../../../../core/network/lectura_json.dart';

/// Servicio del catálogo con su tarifa por tipo de vehículo.
class Servicio {
  const Servicio({
    required this.id,
    required this.numero,
    required this.nombre,
    required this.descripcion,
    required this.categoria,
    required this.activo,
    required this.tarifas,
  });

  factory Servicio.desdeJson(Map<String, dynamic> json) => Servicio(
    id: leerEntero(json['id']),
    numero: leerEntero(json['numero']),
    nombre: leerTexto(json['nombre']),
    descripcion: leerTextoOpcional(json['descripcion']),
    categoria: leerTexto(json['categoria']),
    activo: leerBooleano(json['activo']),
    tarifas: {
      for (final tarifa in (json['tarifas'] as List? ?? const []))
        if (tarifa is Map) leerTexto(tarifa['tipoVehiculo']): leerEntero(tarifa['valor']),
    },
  );

  final int id;
  final int numero;
  final String nombre;
  final String? descripcion;
  final String categoria;
  final bool activo;

  /// tipo de vehículo -> valor vigente.
  final Map<String, int> tarifas;

  /// R3: solo se ofrece un servicio activo con tarifa para el tipo de vehículo.
  bool disponiblePara(String tipoVehiculo) => activo && tarifas.containsKey(tipoVehiculo);

  /// R7: los servicios de lavado de motor exigen la autorización del cliente.
  bool get exigeAutorizacionMotor => serviciosConLavadoMotor.contains(numero);
}
