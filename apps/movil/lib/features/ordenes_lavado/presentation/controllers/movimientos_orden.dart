import '../../../../core/constants/dominio.dart';
import '../../../../core/constants/etiquetas.dart';

/// Un cambio de fase que la app ofrece para una orden.
class MovimientoOrden {
  const MovimientoOrden(this.destino, {required this.devuelve});

  final String destino;

  /// Vuelve a la fase anterior (ADR 0010) en vez de avanzar.
  final bool devuelve;

  String get etiqueta =>
      devuelve ? 'Devolver a ${etiquetaEstadoOrden(destino)}' : 'Pasar a ${etiquetaEstadoOrden(destino)}';
}

/// Fases a las que la app puede mover una orden, según el contrato. La
/// entrega no está: se registra al cobrar en caja (ADR 0007). La cancelación
/// tampoco: va aparte, con su motivo (ver [sePuedeCancelar]).
List<MovimientoOrden> movimientosDe(String estado) {
  final posicion = EstadosOrden.fasesDelPatio.indexOf(estado);
  return [
    for (final destino in transicionesOrden[estado] ?? const <String>[])
      if (EstadosOrden.fasesDelPatio.contains(destino))
        MovimientoOrden(destino, devuelve: EstadosOrden.fasesDelPatio.indexOf(destino) < posicion),
  ];
}

/// Una orden se cancela si el contrato lo permite desde su estado y el rol
/// puede anular órdenes.
bool sePuedeCancelar(String estado, String rol) =>
    (transicionesOrden[estado] ?? const <String>[]).contains(EstadosOrden.cancelada) && Roles.puedeCancelarOrdenes(rol);
