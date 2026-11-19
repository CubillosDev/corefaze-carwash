import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/api_excepcion.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/orden_lavado.dart';

/// Lo que la persona elige para una orden. No lleva valor ni estado: el
/// servidor calcula el valor (R4) y toda orden nace registrada.
class NuevaOrden {
  const NuevaOrden({
    required this.vehiculoId,
    required this.servicioId,
    required this.colaboradorId,
    required this.medioPago,
    this.clienteId,
    this.autorizaMotor = false,
    this.observaciones,
  });

  final int vehiculoId;
  final int servicioId;
  final int colaboradorId;
  final String medioPago;

  /// Solo en un pago a crédito: la empresa (R8).
  final int? clienteId;
  final bool autorizaMotor;
  final String? observaciones;
}

/// Veces que se pide el siguiente turno si otro equipo lo tomó a la vez.
const _intentosDeTurno = 3;

class OrdenesLavadoRepository {
  OrdenesLavadoRepository(this._api);

  final ApiCliente _api;

  /// GET /api/ordenes-lavado?jornadaId=.
  Future<List<OrdenLavado>> listarDeJornada(int jornadaId) async {
    final cuerpo = await _api.obtener('ordenes-lavado', consulta: {'jornadaId': jornadaId});
    return leerLista(cuerpo, 'ordenes').map(OrdenLavado.desdeJson).toList();
  }

  /// Todas las órdenes (para el historial de un vehículo).
  Future<List<OrdenLavado>> listarTodas() async =>
      leerLista(await _api.obtener('ordenes-lavado'), 'ordenes').map(OrdenLavado.desdeJson).toList();

  /// PATCH /api/ordenes-lavado/:id/estado. La API valida la transición (R9) y
  /// exige [motivo] para cancelar.
  Future<OrdenLavado> cambiarEstado(int id, String estado, {String? motivo}) async {
    final cuerpo = await _api.actualizar('ordenes-lavado/$id/estado', {
      'estado': estado,
      if (motivo != null && motivo.isNotEmpty) 'motivo': motivo,
    });
    return OrdenLavado.desdeJson(leerObjeto(cuerpo, 'orden'));
  }

  /// POST /api/ordenes-lavado con el siguiente turno libre de la jornada. El
  /// turno es único por fecha (R5): si otro equipo lo tomó al mismo tiempo,
  /// la API responde 409 y se intenta con el siguiente.
  Future<OrdenLavado> registrar(int jornadaId, NuevaOrden orden) async {
    for (var intento = 1; ; intento += 1) {
      final ordenes = await listarDeJornada(jornadaId);
      final turno = ordenes.fold<int>(0, (mayor, o) => o.turno > mayor ? o.turno : mayor) + 1;
      try {
        final cuerpo = await _api.crear('ordenes-lavado', {
          'turno': turno,
          'vehiculoId': orden.vehiculoId,
          'servicioId': orden.servicioId,
          'colaboradorId': orden.colaboradorId,
          'medioPago': orden.medioPago,
          if (orden.clienteId != null) 'clienteId': orden.clienteId,
          if (orden.autorizaMotor) 'autorizaMotor': true,
          if (orden.observaciones != null && orden.observaciones!.isNotEmpty) 'observaciones': orden.observaciones,
        });
        return OrdenLavado.desdeJson(leerObjeto(cuerpo, 'orden'));
      } on ApiExcepcion catch (error) {
        final turnoOcupado = error.estado == 409 && error.mensajeDelServidor.toLowerCase().contains('turno');
        if (!turnoOcupado || intento >= _intentosDeTurno) {
          rethrow;
        }
      }
    }
  }
}
