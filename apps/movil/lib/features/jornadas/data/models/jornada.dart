import '../../../../core/constants/dominio.dart';
import '../../../../core/network/lectura_json.dart';

class Jornada {
  const Jornada({required this.id, required this.fecha, required this.estado, required this.abiertaEn});

  factory Jornada.desdeJson(Map<String, dynamic> json) => Jornada(
    id: leerEntero(json['id']),
    fecha: leerTexto(json['fecha']),
    estado: leerTexto(json['estado']),
    abiertaEn: leerTextoOpcional(json['abiertaEn']),
  );

  final int id;

  /// Fecha sin hora: "2026-11-19".
  final String fecha;
  final String estado;
  final String? abiertaEn;

  bool get abierta => estado == EstadosJornada.abierta;
}
