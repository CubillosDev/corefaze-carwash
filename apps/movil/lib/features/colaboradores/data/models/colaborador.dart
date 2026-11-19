import '../../../../core/network/lectura_json.dart';

class Colaborador {
  const Colaborador({required this.id, required this.codigo, required this.nombre, required this.activo});

  factory Colaborador.desdeJson(Map<String, dynamic> json) => Colaborador(
    id: leerEntero(json['id']),
    codigo: leerEntero(json['codigo']),
    nombre: leerTexto(json['nombre']),
    activo: leerTexto(json['estado']) == 'activo',
  );

  final int id;
  final int codigo;
  final String nombre;

  /// R2: un colaborador inactivo no recibe órdenes.
  final bool activo;
}
